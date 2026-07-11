import type { z } from "zod";
import {
  agentStepProposalJsonSchema,
  agentStepProposalSchema,
  conversationJudgmentJsonSchema,
  conversationJudgmentSchema,
  conversationProposalJsonSchema,
  conversationProposalSchema,
  mergedConversationTurnJsonSchema,
  mergedConversationTurnSchema,
} from "./envelope.js";
import type {
  AgentStepProposal,
  AgentStepRequest,
  ConversationJudgment,
  ConversationJudgmentRequest,
  ConversationProposal,
  ConversationTurnRequest,
  MergedConversationTurn,
  MergedConversationTurnRequest,
  NpcProposalPort,
  ProposalMeta,
  ProviderFailureReason,
  ProviderUsage,
  ResolvedProposal,
  TextGenPort,
  TextGenRequest,
} from "./ports.js";

const TOOL_GUIDE = `
Tool argument guide:
- move_to: {targetId}
- look: {targetId}
- talk_to: {actorId}, with optional utterance at envelope level
- wait: {reason}
- use_object: {objectId,toState,ledgerKind,whyLine,economyDelta?}
- write_record: {objectId?,toState?,ledgerKind,record,citedLedgerEventId?,whyLine,economyDelta?}
- read_record: {recordId}
- request: {targetActorId,action,whyLine?}
Only use actors, objects, records, and tool names present in the observe packet.`;

interface SessionBudget {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderServiceOptions {
  profileId: string;
  textGen: TextGenPort;
  fallback: NpcProposalPort;
  timeoutMs?: number;
  maxCallsPerSession?: number;
  maxTokensPerSession?: number;
}

export class ProviderService implements NpcProposalPort {
  readonly profileId: string;
  private readonly timeoutMs: number;
  private readonly maxCalls: number;
  private readonly maxTokens: number;
  private readonly budgets = new Map<string, SessionBudget>();

  constructor(private readonly options: ProviderServiceOptions) {
    this.profileId = options.profileId;
    this.timeoutMs = options.timeoutMs ?? 2500;
    this.maxCalls = options.maxCallsPerSession ?? 50;
    this.maxTokens = options.maxTokensPerSession ?? 50_000;
  }

  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    return this.options.textGen.preflight();
  }

  async proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>> {
    const instructions = [
      "You are an NPC inside Dream of One, a Korean social-suspicion game.",
      "Write in Korean. Stay in role and use only visible context.",
      "Use natural modern Korean only in player-visible text; do not mix English, Chinese characters, or other scripts.",
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
    const resolved = await this.generateValidated({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_turn",
        jsonSchema: conversationProposalJsonSchema,
      },
      schema: conversationProposalSchema,
    });
    if (resolved.ok) {
      return { proposal: resolved.value, meta: resolved.meta };
    }
    return this.withFallbackReason(
      await this.options.fallback.proposeConversationTurn(request),
      resolved.reason,
    );
  }

  async judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>> {
    const instructions = [
      "You are the judging mind of one NPC inside Dream of One, a Korean social-suspicion game.",
      "Read the player's newest line and decide how it moves this NPC's suspicion and report pressure.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world Korean sentence the player will read as the reason suspicion moved.",
      "Use natural modern Korean only in whyLine; do not mix English, Chinese characters, or other scripts.",
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
    const resolved = await this.generateValidated({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_judgment",
        jsonSchema: conversationJudgmentJsonSchema,
      },
      schema: conversationJudgmentSchema,
    });
    if (resolved.ok) {
      return { proposal: resolved.value, meta: resolved.meta };
    }
    return this.withFallbackReason(
      await this.options.fallback.judgeConversationTurn(request),
      resolved.reason,
    );
  }

  async judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>> {
    const instructions = [
      "You are one NPC inside Dream of One, a Korean social-suspicion game.",
      "In one response, judge the player's newest line AND write your next spoken reply with exactly three short player reply suggestions.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world Korean sentence the player will read as the reason suspicion moved.",
      "utterance is your next in-character Korean line after hearing the player.",
      "The reply intent labels shape variety only; they never decide suspicion or game truth.",
      "Use natural modern Korean only in whyLine, utterance, and suggestion text; do not mix English, Chinese characters, or other scripts.",
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
      beatId: request.beatId,
      locale: request.locale,
    });
    const resolved = await this.generateValidated({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation_turn",
        instructions,
        input,
        schemaName: "npc_merged_conversation_turn",
        jsonSchema: mergedConversationTurnJsonSchema,
      },
      schema: mergedConversationTurnSchema,
    });
    if (resolved.ok) {
      return { proposal: resolved.value, meta: resolved.meta };
    }
    return this.withFallbackReason(
      await this.options.fallback.judgeAndProposeConversationTurn(request),
      resolved.reason,
    );
  }

  async proposeNextStep(
    request: AgentStepRequest,
  ): Promise<ResolvedProposal<AgentStepProposal>> {
    const instructions = [
      "You choose one next action for a bounded NPC agent loop.",
      "Read the previous tool result before acting. A failed or blocked call must change the next attempt.",
      "Write every player-visible utterance, rationale, and whyLine in natural modern Korean only; do not mix English, Chinese characters, or other scripts. Keep tool names and ids unchanged.",
      "After a successful action completes the goal, return done=true on the next iteration. Never repeat an identical successful tool call.",
      "blockedSignatures contains calls already blocked or successfully completed during this beat; choose a different call or stop.",
      "The runtime validates and applies tools; never invent direct state changes or authority outcomes.",
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
    });
    const resolved = await this.generateValidated({
      sessionId: request.sessionId,
      request: {
        purpose: "agent_step",
        instructions,
        input,
        schemaName: "npc_agent_step",
        jsonSchema: agentStepProposalJsonSchema,
      },
      schema: agentStepProposalSchema,
    });
    if (resolved.ok) {
      return { proposal: resolved.value, meta: resolved.meta };
    }
    return this.withFallbackReason(
      await this.options.fallback.proposeNextStep(request),
      resolved.reason,
    );
  }

  private async generateValidated<T>(input: {
    sessionId: string;
    request: TextGenRequest;
    schema: z.ZodType<T>;
  }): Promise<
    | { ok: true; value: T; meta: ProposalMeta }
    | { ok: false; reason: ProviderFailureReason }
  > {
    if (this.isBudgetExhausted(input.sessionId)) {
      return { ok: false, reason: "budget_exhausted" };
    }
    const preflight = await this.options.textGen.preflight();
    if (!preflight.available) {
      return { ok: false, reason: preflight.reason ?? "unavailable" };
    }
    try {
      const first = await this.withTimeout(this.options.textGen.generate(input.request));
      this.recordUsage(input.sessionId, first.usage);
      const parsed = this.parseJson(input.schema, first.text);
      if (parsed.success) {
        return {
          ok: true,
          value: parsed.data,
          meta: this.liveMeta(first.usage),
        };
      }

      if (this.isBudgetExhausted(input.sessionId)) {
        return { ok: false, reason: "budget_exhausted" };
      }
      const repair = await this.withTimeout(
        this.options.textGen.generate({
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
        }),
      );
      this.recordUsage(input.sessionId, repair.usage);
      const repaired = this.parseJson(input.schema, repair.text);
      return repaired.success
        ? { ok: true, value: repaired.data, meta: this.liveMeta(repair.usage) }
        : { ok: false, reason: "invalid_envelope" };
    } catch (error) {
      const message = (error as Error).message.toLowerCase();
      if (message.includes("timeout") || message.includes("aborted")) {
        return { ok: false, reason: "timeout" };
      }
      if (message.includes("429") || message.includes("rate limit")) {
        return { ok: false, reason: "rate_limited" };
      }
      return { ok: false, reason: "transport_error" };
    }
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
    const current = this.budgets.get(sessionId) ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    this.budgets.set(sessionId, current);
    return current;
  }

  private isBudgetExhausted(sessionId: string): boolean {
    const budget = this.budgetFor(sessionId);
    return budget.calls >= this.maxCalls || budget.inputTokens + budget.outputTokens >= this.maxTokens;
  }

  private recordUsage(sessionId: string, usage?: ProviderUsage): void {
    const budget = this.budgetFor(sessionId);
    budget.calls += 1;
    budget.inputTokens += usage?.inputTokens ?? 0;
    budget.outputTokens += usage?.outputTokens ?? 0;
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
