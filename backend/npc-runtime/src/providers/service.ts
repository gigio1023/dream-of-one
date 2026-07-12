import type { z } from "zod";
import {
  ambientReplyJudgmentJsonSchema,
  ambientReplyJudgmentSchemaForLocale,
  agentStepProposalJsonSchema,
  agentStepProposalSchemaForLocale,
  conversationJudgmentJsonSchema,
  conversationJudgmentSchemaForLocale,
  conversationProposalJsonSchema,
  conversationProposalSchemaForLocale,
  hearingJudgmentJsonSchema,
  hearingJudgmentSchemaForLocale,
  mergedConversationTurnJsonSchema,
  mergedConversationTurnSchemaForLocale,
} from "./envelope.js";
import {
  providerLanguageName,
  requireSupportedGameplayLocale,
  supportedLocaleEntry,
} from "../localization/supported-locales.js";
import type {
  AmbientReplyJudgment,
  AmbientReplyRequest,
  AgentStepProposal,
  AgentStepRequest,
  ConversationJudgment,
  ConversationJudgmentRequest,
  ConversationProposal,
  ConversationTurnRequest,
  HearingJudgment,
  HearingJudgmentRequest,
  MergedConversationTurn,
  MergedConversationTurnRequest,
  NpcProposalPort,
  ProposalMeta,
  ProviderAuditSnapshot,
  ProviderCallAudit,
  ProviderFailureReason,
  ProviderResolutionAudit,
  ProviderResolutionPurpose,
  ProviderUsage,
  ResolvedProposal,
  TextGenPort,
  TextGenRequest,
  TextGenResult,
} from "./ports.js";

const TOOL_GUIDE = `
Tool argument guide:
- move_to: {targetId}; when playerContact.available is true, targetId="player" means choosing one NPC-initiated approach
- look: {targetId}
- talk_to: {actorId}, with optional utterance at envelope level
- wait: {reason}
- use_object: {objectId,toState,ledgerKind,whyLine,economyDelta?}
- write_record: {objectId?,toState?,ledgerKind,record,citedLedgerEventId?,whyLine,economyDelta?}
- read_record: {recordId}
- M3R write_record when administrativeAuthority is present:
  {recordKind,sourceMemoryId,stateBody,whyLine,institutionalPressureDelta,textSurfaceId,recordId?,openQuestion}
- M3R read_record: {recordId,whyLine,institutionalPressureDelta,openQuestion}; source memory is runtime-derived
- M3R openQuestion is required and either null or {status,text,whyLine}. Author it only when the administrative action creates a concrete player-log question; never fill it mechanically.
- request: {targetActorId,action,whyLine?}
Only use actors, objects, records, and tool names present in the observe packet.`;

function localeOutputInstructions(locale: string, fields: string): string[] {
  const supportedLocale = requireSupportedGameplayLocale(locale);
  const instructions = [
    `The immutable run locale is ${supportedLocale}. Write ${fields} in ${providerLanguageName(supportedLocale)}.`,
    "Keep stable ids, intent labels, tool names, and tool argument keys unchanged.",
  ];
  if (supportedLocaleEntry(supportedLocale).presentationId === "ko") {
    instructions.push(
      "In player-visible text, do not mix Latin letters, Chinese characters, or other scripts into the Korean wording.",
    );
  }
  return instructions;
}

interface SessionBudget {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  reservedTokens: number;
}

interface ProviderAuditState {
  nextCallSeq: number;
  nextResolutionSeq: number;
  inFlight: Map<number, number>;
  calls: ProviderCallAudit[];
  resolutions: ProviderResolutionAudit[];
  droppedCount: number;
}

const MAX_AUDIT_RESOLUTIONS = 256;

export interface ProviderServiceOptions {
  profileId: string;
  textGen: TextGenPort;
  fallback: NpcProposalPort;
  timeoutMs?: number;
  maxCallsPerSession?: number;
  maxTokensPerSession?: number;
  maxOutputTokensPerCall?: number;
}

export class ProviderService implements NpcProposalPort {
  readonly profileId: string;
  private readonly timeoutMs: number;
  private readonly maxCalls: number;
  private readonly maxTokens: number;
  private readonly maxOutputTokensPerCall: number;
  private readonly budgets = new Map<string, SessionBudget>();
  private readonly audits = new Map<string, ProviderAuditState>();

  constructor(private readonly options: ProviderServiceOptions) {
    this.profileId = options.profileId;
    this.timeoutMs = options.timeoutMs ?? 2500;
    this.maxCalls = options.maxCallsPerSession ?? 50;
    this.maxTokens = options.maxTokensPerSession ?? 50_000;
    this.maxOutputTokensPerCall = options.maxOutputTokensPerCall ?? 1_000;
  }

  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    return this.options.textGen.preflight();
  }

  accountingSnapshot(scopeId: string): { callsUsed: number; tokensUsed: number } {
    const budget = this.budgetFor(scopeId);
    return {
      callsUsed: budget.calls,
      tokensUsed: budget.inputTokens + budget.outputTokens + budget.reservedTokens,
    };
  }

  auditSnapshot(scopeId: string): ProviderAuditSnapshot {
    const budget = this.budgetFor(scopeId);
    const audit = this.auditFor(scopeId);
    const inFlightTokens = [...audit.inFlight.values()].reduce(
      (total, reservedTokens) => total + reservedTokens,
      0,
    );
    const inFlightCalls = audit.inFlight.size;
    const resolvedCallSeqs = new Set(
      audit.resolutions.flatMap(resolution => resolution.callSeqs),
    );
    return {
      callsUsed: budget.calls,
      tokensUsed: budget.inputTokens + budget.outputTokens + budget.reservedTokens,
      inFlightCalls,
      inFlightTokens,
      complete:
        audit.droppedCount === 0 &&
        inFlightCalls === 0 &&
        audit.calls.every(call => resolvedCallSeqs.has(call.seq)),
      truncated: audit.droppedCount > 0,
      droppedCount: audit.droppedCount,
      calls: structuredClone(audit.calls).sort((first, second) => first.seq - second.seq),
      resolutions: structuredClone(audit.resolutions).sort(
        (first, second) => first.seq - second.seq,
      ),
    };
  }

  async proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>> {
    const instructions = [
      "You are an NPC inside Dream of One, a social-suspicion game.",
      "Stay in role and use only visible context.",
      ...localeOutputInstructions(
        request.locale,
        "the NPC utterance and all three player reply suggestions",
      ),
      "Return one NPC utterance and exactly three short player reply suggestions.",
      "The reply intent labels shape variety only; they never decide suspicion or game truth.",
      "Do not claim a verdict, hidden fact, or world mutation.",
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const input = JSON.stringify({
      objective: request.objective,
      sceneFacts: request.sceneFacts,
      actor: request.observePacket,
      conversationHistory: request.conversationHistory.slice(-6),
      beatId: request.beatId,
      locale: request.locale,
    });
    return this.resolveValidated<ConversationProposal>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_turn",
        jsonSchema: conversationProposalJsonSchema,
      },
      schema: conversationProposalSchemaForLocale(request.locale),
      fallback: () => this.options.fallback.proposeConversationTurn(request),
    });
  }

  async judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>> {
    const instructions = [
      "You are the judging mind of one NPC inside Dream of One, a social-suspicion game.",
      "Read the player's newest line and decide how it moves this NPC's suspicion and report pressure.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world sentence the player will read as the reason suspicion moved.",
      ...localeOutputInstructions(request.locale, "whyLine"),
      "Do not decide any verdict or session outcome.",
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const input = JSON.stringify({
      playerLine: request.playerLine,
      conversationHistory: request.conversationHistory.slice(-10),
      actor: request.observePacket,
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
      beatId: request.beatId,
      locale: request.locale,
    });
    return this.resolveValidated<ConversationJudgment>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_judgment",
        jsonSchema: conversationJudgmentJsonSchema,
      },
      schema: conversationJudgmentSchemaForLocale(request.locale),
      fallback: () => this.options.fallback.judgeConversationTurn(request),
    });
  }

  async judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>> {
    const instructions = [
      "You are one NPC inside Dream of One, a social-suspicion game.",
      "In one response, judge the player's newest line AND write your next spoken reply with exactly three short player reply suggestions.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world sentence the player will read as the reason suspicion moved.",
      "Return stance as this NPC's coarse opinion after the exchange: oppose, uncertain, or vouch.",
      "meaningfulFirsthand is true only when this direct exchange gave the NPC substantive firsthand grounds; vouch requires it.",
      "openQuestion is either null or one concise player-log question authored from this exchange, with its own open/resolved status, text, and whyLine.",
      "utterance is your next in-character line after hearing the player.",
      "The reply intent labels shape variety only; they never decide suspicion or game truth.",
      ...localeOutputInstructions(
        request.locale,
        "whyLine, openQuestion text/whyLine, utterance, and all three suggestion texts",
      ),
      "Do not decide any verdict or session outcome, and do not claim a hidden fact or world mutation.",
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const input = JSON.stringify({
      playerLine: request.playerLine,
      conversationHistory: request.conversationHistory.slice(-10),
      objective: request.objective,
      sceneFacts: request.sceneFacts,
      actor: request.observePacket,
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
      stanceBefore: request.stanceBefore,
      hasMeaningfulFirsthandConversation: request.hasMeaningfulFirsthandConversation,
      beatId: request.beatId,
      locale: request.locale,
    });
    return this.resolveValidated<MergedConversationTurn>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation_turn",
        instructions,
        input,
        schemaName: "npc_merged_conversation_turn",
        jsonSchema: mergedConversationTurnJsonSchema,
      },
      schema: mergedConversationTurnSchemaForLocale(request.locale),
      fallback: () => this.options.fallback.judgeAndProposeConversationTurn(request),
    });
  }

  async proposeNextStep(
    request: AgentStepRequest,
  ): Promise<ResolvedProposal<AgentStepProposal>> {
    const instructions = [
      "You choose one next action for a bounded NPC agent loop.",
      "Read the previous tool result before acting. A failed or blocked call must change the next attempt.",
      ...localeOutputInstructions(
        request.locale,
        "every natural-language output field, including utterance, rationale, whyLine, and record prose",
      ),
      "After a successful action completes the goal, return done=true on the next iteration. Never repeat an identical successful tool call.",
      "blockedSignatures contains calls already blocked or successfully completed during this beat; choose a different call or stop.",
      "The runtime validates and applies tools; never invent direct state changes or authority outcomes.",
      "playerContact is offered to only one runtime-selected resident at a time. Choose move_to(player) only when your role goal or remembered facts warrant initiating a face-to-face question; otherwise choose another valid action or stop.",
      ...(request.requiredToolCall
        ? [
            `This wake permits only talk_to targeting the exact actor id ${request.requiredToolCall.actorId}.`,
            request.requireUtterance
              ? "Return one nonempty in-fiction utterance in the run locale with that talk_to call."
              : "Use that exact talk_to call if you act.",
          ]
        : []),
      "Return done=true with toolCall=null when the goal is complete or no useful action remains.",
      TOOL_GUIDE,
      "Return only JSON matching the supplied schema.",
    ].join("\n");
    const input = JSON.stringify({
      goal: request.goal,
      iteration: request.iteration,
      observe: request.observePacket,
      previousResult: request.previousResult ?? null,
      blockedSignatures: request.blockedSignatures,
      requiredToolCall: request.requiredToolCall ?? null,
      requireUtterance: request.requireUtterance ?? false,
      locale: request.locale,
    });
    return this.resolveValidated<AgentStepProposal>({
      sessionId: request.sessionId,
      request: {
        purpose: "agent_step",
        instructions,
        input,
        schemaName: "npc_agent_step",
        jsonSchema: agentStepProposalJsonSchema,
      },
      schema: agentStepProposalSchemaForLocale(request.locale),
      budgetCeiling: request.budgetCeiling,
      fallback: () => this.options.fallback.proposeNextStep(request),
    });
  }

  async judgeAndProposeAmbientReply(
    request: AmbientReplyRequest,
  ): Promise<ResolvedProposal<AmbientReplyJudgment>> {
    const instructions = [
      "You are one resident listening to another resident inside Dream of One, a social-suspicion game.",
      "Reply once to the exact source utterance AND judge whether that remembered speech changes your personal opinion of the player.",
      "This is NPC hearsay, not a new player answer. Do not use player-answer signal labels, report pressure, records, institutional authority, or verdict semantics.",
      "Judge only from the exact source utterance and the listener-owned visible, heard, and remembered context supplied here; never invent unseen facts or imply that you directly witnessed something you only heard.",
      "Suspicion uses a 0..125 game scale. Return an integer delta calibrated to that scale; the runtime clamps movement and the final score.",
      "If the exact speech gives no grounded reason to change an opinion of the player, return suspicionDelta=0, preserve stanceBefore as proposedStance, and explain the no-change judgment in whyLine.",
      "A positive vouch requires the listener's existing meaningful firsthand conversation with the player. This ambient exchange can never create firsthand provenance.",
      `toolCall must be exactly talk_to with actorId ${request.targetActorId}; utterance is the listener's one in-character reply and done must be true.`,
      "openQuestion is null unless this exact exchange creates or resolves one concise question the player may later learn when meeting this listener.",
      ...localeOutputInstructions(
        request.locale,
        "utterance, rationale, whyLine, and openQuestion text/whyLine",
      ),
      "Do not decide a verdict or mutate the world. Return only JSON matching the supplied schema.",
    ].join(" ");
    const input = JSON.stringify({
      runId: request.sessionId,
      wakeId: request.wakeId,
      conversationId: request.conversationId,
      sourceSpeakerActorId: request.sourceSpeakerActorId,
      sourceUtterance: request.sourceUtterance,
      listenerActorId: request.listenerActorId,
      targetActorId: request.targetActorId,
      stanceBefore: request.stanceBefore,
      suspicionBefore: request.suspicionBefore,
      hasMeaningfulFirsthandConversation: request.hasMeaningfulFirsthandConversation,
      listener: request.observePacket,
      locale: request.locale,
    });
    return this.resolveValidated<AmbientReplyJudgment>({
      sessionId: request.sessionId,
      request: {
        purpose: "ambient_reply",
        instructions,
        input,
        schemaName: "npc_ambient_reply_judgment",
        jsonSchema: ambientReplyJudgmentJsonSchema,
      },
      schema: ambientReplyJudgmentSchemaForLocale(request.locale),
      budgetCeiling: request.budgetCeiling,
      fallback: () => this.options.fallback.judgeAndProposeAmbientReply(request),
    });
  }

  async judgeHearing(
    request: HearingJudgmentRequest,
  ): Promise<ResolvedProposal<HearingJudgment>> {
    const instructions = [
      "You are the Station officer conducting the final hearing in Dream of One.",
      "Judge the visitor only from the supplied final defense, six resident evidence packets, records, ledger events, and institutional pressure.",
      "Never invent unseen context, testimony, facts, or ids. Cite only memory, record, and ledger-event ids present in the supplied packet.",
      "Return exactly one residentAssessment for each of the six residents, with six unique actorId values.",
      "Each resident testimony must rely only on that resident's own supplied memories. citedMemoryIds must contain only ids from that same resident and must name every memory used by testimonyLine.",
      "proposedStance is your memory-grounded reassessment after the final defense. The runtime validates provenance and may clamp an unsupported vouch.",
      "An ordinary proposal is procedurally possible only when the runtime confirms at least four evidence-backed vouches. The runtime, not you, enforces that quorum.",
      "Even when four or more residents vouch, you may still propose abnormal when the supplied evidence or final defense warrants it.",
      "The model owns the judgment and wording. The runtime owns citation validity, quorum, clamps, and terminal state.",
      "verdictWhyLine is one concise player-readable reason, and officerLine is the Station officer's final spoken ruling.",
      ...localeOutputInstructions(
        request.locale,
        "all six testimonyLine values, verdictWhyLine, and officerLine",
      ),
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const input = JSON.stringify({
      runId: request.runId,
      hearingId: request.hearingId,
      locale: request.locale,
      finalDefense: request.finalDefense,
      institutionalPressure: request.institutionalPressure,
      residents: request.residents,
      records: request.records,
      ledgerEvents: request.ledgerEvents,
    });
    return this.resolveValidated<HearingJudgment>({
      sessionId: request.runId,
      request: {
        purpose: "hearing_verdict",
        instructions,
        input,
        schemaName: "station_hearing_judgment",
        jsonSchema: hearingJudgmentJsonSchema,
      },
      schema: hearingJudgmentSchemaForLocale(request.locale),
      fallback: () => this.options.fallback.judgeHearing(request),
    });
  }

  private async resolveValidated<T>(input: {
    sessionId: string;
    request: TextGenRequest & { purpose: ProviderResolutionPurpose };
    schema: z.ZodType<T>;
    budgetCeiling?: { maxCalls: number; maxTokens: number };
    fallback: () => Promise<ResolvedProposal<T>>;
  }): Promise<ResolvedProposal<T>> {
    const generated = await this.generateValidated(input);
    const resolved = generated.ok
      ? { proposal: generated.value, meta: generated.meta }
      : this.withFallbackReason(await input.fallback(), generated.reason);
    this.recordResolution(
      input.sessionId,
      input.request.purpose,
      resolved.meta,
      generated.callSeqs,
    );
    return resolved;
  }

  private async generateValidated<T>(input: {
    sessionId: string;
    request: TextGenRequest & { purpose: ProviderResolutionPurpose };
    schema: z.ZodType<T>;
    budgetCeiling?: { maxCalls: number; maxTokens: number };
  }): Promise<
    | { ok: true; value: T; meta: ProposalMeta; callSeqs: number[] }
    | { ok: false; reason: ProviderFailureReason; callSeqs: number[] }
  > {
    const callSeqs: number[] = [];
    if (this.isBudgetExhausted(input.sessionId, input.budgetCeiling)) {
      return { ok: false, reason: "budget_exhausted", callSeqs };
    }
    let preflight: Awaited<ReturnType<TextGenPort["preflight"]>>;
    try {
      preflight = await this.options.textGen.preflight();
    } catch (error) {
      return { ok: false, reason: this.normalizeFailure(error), callSeqs };
    }
    if (!preflight.available) {
      return { ok: false, reason: preflight.reason ?? "unavailable", callSeqs };
    }
    try {
      const first = await this.generateOne(
        input.sessionId,
        input.request,
        callSeqs,
        input.budgetCeiling,
      );
      const parsed = this.parseJson(input.schema, first.text);
      if (parsed.success) {
        return {
          ok: true,
          value: parsed.data,
          meta: this.liveMeta(first.usage),
          callSeqs,
        };
      }

      if (this.isBudgetExhausted(input.sessionId, input.budgetCeiling)) {
        return { ok: false, reason: "budget_exhausted", callSeqs };
      }
      const repair = await this.generateOne(
        input.sessionId,
        {
          ...input.request,
          purpose: "repair",
          instructions: `${input.request.instructions}\nRepair the invalid JSON. Do not add commentary.`,
          input: JSON.stringify({
            invalidOutput: first.text,
            validationIssues: parsed.error.issues.map(issue => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          }),
        },
        callSeqs,
        input.budgetCeiling,
      );
      const repaired = this.parseJson(input.schema, repair.text);
      return repaired.success
        ? {
            ok: true,
            value: repaired.data,
            meta: this.liveMeta(this.combineUsage(first.usage, repair.usage)),
            callSeqs,
          }
        : { ok: false, reason: "invalid_envelope", callSeqs };
    } catch (error) {
      return { ok: false, reason: this.normalizeFailure(error), callSeqs };
    }
  }

  private async generateOne(
    sessionId: string,
    request: TextGenRequest,
    callSeqs: number[],
    ceiling?: { maxCalls: number; maxTokens: number },
  ): Promise<TextGenResult> {
    const reservedTokens = this.tokenReservation(request);
    const budget = this.budgetFor(sessionId);
    const maxCalls = Math.min(this.maxCalls, ceiling?.maxCalls ?? this.maxCalls);
    const maxTokens = Math.min(this.maxTokens, ceiling?.maxTokens ?? this.maxTokens);
    if (
      budget.calls + 1 > maxCalls ||
      budget.inputTokens + budget.outputTokens + budget.reservedTokens + reservedTokens >
        maxTokens
    ) {
      throw new Error("provider budget ceiling");
    }
    this.reserveCall(sessionId, reservedTokens);
    const callSeq = this.beginCallAudit(sessionId, reservedTokens);
    callSeqs.push(callSeq);
    try {
      const result = await this.withTimeout(this.options.textGen.generate(request));
      const chargedTokens = this.completeCall(sessionId, reservedTokens, result.usage);
      this.finishCallAudit(sessionId, {
        seq: callSeq,
        purpose: request.purpose,
        profileId: this.profileId,
        transport: "live",
        usedFallback: false,
        outcome: "success",
        failureReason: null,
        chargedTokens,
      });
      return result;
    } catch (error) {
      const chargedTokens = this.completeCall(sessionId, reservedTokens);
      this.finishCallAudit(sessionId, {
        seq: callSeq,
        purpose: request.purpose,
        profileId: this.profileId,
        transport: "live",
        usedFallback: false,
        outcome: "error",
        failureReason: this.normalizeFailure(error),
        chargedTokens,
      });
      throw error;
    }
  }

  private tokenReservation(request: TextGenRequest): number {
    // A tokenizer cannot emit more tokens than the UTF-8 byte count of its
    // input. Include the schema, configured output cap, and adapter framing
    // headroom so concurrent calls cannot enter a protected token reserve.
    const inputBytes = Buffer.byteLength(
      `${request.instructions}\n${request.input}\n${JSON.stringify(request.jsonSchema)}`,
      "utf-8",
    );
    return inputBytes + this.maxOutputTokensPerCall + 2_048;
  }

  private parseJson<T>(schema: z.ZodType<T>, text: string) {
    try {
      return schema.safeParse(JSON.parse(text));
    } catch {
      return schema.safeParse(undefined);
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error("provider timeout")), this.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private budgetFor(sessionId: string): SessionBudget {
    const current = this.budgets.get(sessionId) ?? {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      reservedTokens: 0,
    };
    this.budgets.set(sessionId, current);
    return current;
  }

  private auditFor(sessionId: string): ProviderAuditState {
    const current = this.audits.get(sessionId) ?? {
      nextCallSeq: 0,
      nextResolutionSeq: 0,
      inFlight: new Map<number, number>(),
      calls: [],
      resolutions: [],
      droppedCount: 0,
    };
    this.audits.set(sessionId, current);
    return current;
  }

  private isBudgetExhausted(
    sessionId: string,
    ceiling?: { maxCalls: number; maxTokens: number },
  ): boolean {
    const budget = this.budgetFor(sessionId);
    const maxCalls = Math.min(this.maxCalls, ceiling?.maxCalls ?? this.maxCalls);
    const maxTokens = Math.min(this.maxTokens, ceiling?.maxTokens ?? this.maxTokens);
    return (
      budget.calls >= maxCalls ||
      budget.inputTokens + budget.outputTokens + budget.reservedTokens >= maxTokens
    );
  }

  private reserveCall(sessionId: string, reservedTokens: number): void {
    const budget = this.budgetFor(sessionId);
    budget.calls += 1;
    budget.reservedTokens += reservedTokens;
  }

  private completeCall(
    sessionId: string,
    reservedTokens: number,
    usage?: ProviderUsage,
  ): number {
    const budget = this.budgetFor(sessionId);
    budget.reservedTokens = Math.max(0, budget.reservedTokens - reservedTokens);
    if (usage) {
      budget.inputTokens += usage.inputTokens;
      budget.outputTokens += usage.outputTokens;
      return usage.inputTokens + usage.outputTokens;
    } else {
      // Missing usage must not make a potentially spent call look free.
      budget.inputTokens += reservedTokens;
      return reservedTokens;
    }
  }

  private beginCallAudit(sessionId: string, reservedTokens: number): number {
    const audit = this.auditFor(sessionId);
    const seq = ++audit.nextCallSeq;
    audit.inFlight.set(seq, reservedTokens);
    return seq;
  }

  private finishCallAudit(sessionId: string, call: ProviderCallAudit): void {
    const audit = this.auditFor(sessionId);
    audit.inFlight.delete(call.seq);
    audit.calls.push(call);
  }

  private recordResolution(
    sessionId: string,
    purpose: ProviderResolutionPurpose,
    meta: ProposalMeta,
    callSeqs: readonly number[],
  ): void {
    const audit = this.auditFor(sessionId);
    const seq = ++audit.nextResolutionSeq;
    if (audit.resolutions.length >= MAX_AUDIT_RESOLUTIONS) {
      audit.droppedCount += 1;
      return;
    }
    audit.resolutions.push({
      seq,
      purpose,
      profileId: meta.profileId,
      transport: meta.transport,
      usedFallback: meta.usedFallback,
      fallbackReason: meta.fallbackReason ?? null,
      callSeqs: [...callSeqs],
    });
  }

  private normalizeFailure(error: unknown): ProviderFailureReason {
    const message = error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
    if (message.includes("provider budget ceiling")) return "budget_exhausted";
    if (message.includes("timeout") || message.includes("aborted")) return "timeout";
    if (message.includes("429") || message.includes("rate limit")) return "rate_limited";
    if (message.includes("credential") || message.includes("api key")) {
      return "missing_credentials";
    }
    if (message.includes("unavailable")) return "unavailable";
    return "transport_error";
  }

  private combineUsage(...usages: Array<ProviderUsage | undefined>): ProviderUsage | undefined {
    const present = usages.filter((usage): usage is ProviderUsage => usage !== undefined);
    if (present.length === 0) return undefined;
    return present.reduce<ProviderUsage>(
      (total, usage) => ({
        inputTokens: total.inputTokens + usage.inputTokens,
        outputTokens: total.outputTokens + usage.outputTokens,
        totalTokens: total.totalTokens + usage.totalTokens,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    );
  }

  private liveMeta(usage?: ProviderUsage): ProposalMeta {
    return {
      profileId: this.profileId,
      transport: "live",
      usedFallback: false,
      usage,
    };
  }

  private withFallbackReason<T>(
    fallback: ResolvedProposal<T>,
    reason: ProviderFailureReason,
  ): ResolvedProposal<T> {
    return {
      proposal: fallback.proposal,
      meta: {
        ...fallback.meta,
        profileId: this.profileId,
        transport: "fallback",
        usedFallback: true,
        fallbackReason: reason,
      },
    };
  }
}
