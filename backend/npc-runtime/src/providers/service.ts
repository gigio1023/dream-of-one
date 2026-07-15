import type { z } from "zod";
import {
  ambientReplyJudgmentJsonSchemaForTarget,
  ambientReplyJudgmentSchemaForRequest,
  agentStepProposalJsonSchemaForTools,
  agentStepProposalSchemaForRequest,
  conversationJudgmentJsonSchemaForLocale,
  conversationJudgmentSchemaForLocale,
  conversationProposalJsonSchemaForLocale,
  conversationProposalSchemaForLocale,
  hearingJudgmentJsonSchemaForRequest,
  hearingJudgmentSchemaForRequest,
  mergedConversationTurnJsonSchemaForLocale,
  mergedConversationTurnSchemaForLocale,
  TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  type AgentStepRecordContracts,
} from "./envelope.js";
import {
  providerLanguageName,
  requireSupportedGameplayLocale,
  supportedLocaleEntry,
} from "../localization/supported-locales.js";
import type { ToolName } from "../agentloop/tools.js";
import type { ObservePacket } from "../agentloop/context.js";
import { ProviderBudgetReservedError } from "./ports.js";
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

const TOOL_ARGUMENT_GUIDES: Record<Exclude<ToolName, "write_record" | "read_record">, readonly string[]> = {
  move_to: [
    '- move_to: {targetId}; when playerContact.available is true, targetId="player" means choosing one NPC-initiated approach',
  ],
  look: ["- look: {targetId}"],
  talk_to: ["- talk_to: {actorId}, with optional utterance at envelope level"],
  wait: ["- wait: {reason}"],
  use_object: ["- use_object: {objectId,toState,ledgerKind,whyLine}"],
  request: ["- request: {targetActorId,action,whyLine}"],
};

const RECORD_TOOL_ARGUMENT_GUIDES = {
  write_record: {
    legacy: [
      "- write_record (legacy world path): {objectId|null,toState|null,ledgerKind,record,citedLedgerEventId|null,whyLine}",
    ],
    m3r: [
      "- write_record (M3R administrativeAuthority): {recordKind,sourceMemoryId,stateBody,whyLine,institutionalPressureDelta,textSurfaceId,recordId?,openQuestion}",
      "- M3R write_record openQuestion is required and either null or {status,text,whyLine}. Author it only when the action creates a concrete player-log question; never fill it mechanically.",
    ],
  },
  read_record: {
    legacy: ["- read_record (legacy world path): {recordId}"],
    m3r: [
      "- read_record (M3R administrativeAuthority): {recordId,whyLine,institutionalPressureDelta,openQuestion}; source memory is runtime-derived",
      "- M3R read_record openQuestion is required and either null or {status,text,whyLine}. Author it only when the action creates or resolves a concrete player-log question; never fill it mechanically.",
    ],
  },
} as const;

const M3R_INSTITUTIONAL_PRESSURE_GUIDE =
  "- M3R institutionalPressureDelta must be an integer from -25 through 25: negative lowers institutional pressure, zero leaves it unchanged, and positive raises it. Judge both direction and magnitude from the supplied evidence; no direction is preferred. One independent non-record source may create positive pressure only once across its read/write lineage, so relaying the same evidence does not mint new positive pressure.";

const REACHABLE_SUSPICION_DELTA_GUIDE =
  "suspicionBefore is the current bounded 0..125 score. Never return a suspicionDelta that would move it below 0 or above 125; at a boundary use zero or move inward, and make whyLine describe only the reachable movement.";

function requireReachableSuspicionDelta(
  value: { suspicionDelta: number },
  context: z.RefinementCtx,
  suspicionBefore: number,
): void {
  const suspicionAfter = suspicionBefore + value.suspicionDelta;
  if (suspicionAfter >= 0 && suspicionAfter <= 125) return;
  context.addIssue({
    code: "custom",
    path: ["suspicionDelta"],
    message:
      `suspicionDelta must keep suspicion within 0..125 from current score ${suspicionBefore}`,
  });
}

function recordContractsForRequest(
  request: AgentStepRequest,
  tools: readonly ToolName[],
): AgentStepRecordContracts {
  const packet = request.observePacket;
  const contracts: AgentStepRecordContracts = {};
  if (tools.includes("write_record")) {
    const hasRunWriteAuthority =
      packet.administrativeSources.length > 0 &&
      packet.administrativeAuthority.allowedRecordKinds.length > 0 &&
      packet.administrativeAuthority.writableTextSurfaceIds.length > 0;
    contracts.write_record = hasRunWriteAuthority ? "m3r" : "legacy";
  }
  if (tools.includes("read_record")) {
    const hasRunRecordRevision = packet.visibleRecords.some(record =>
      Number.isInteger(record.recordRevision) &&
      typeof record.authorActorId === "string" &&
      record.authorActorId.length > 0 &&
      typeof record.textSurfaceId === "string" &&
      record.textSurfaceId.length > 0
    );
    contracts.read_record =
      packet.administrativeAuthority.allowedRecordKinds.length > 0 && hasRunRecordRevision
        ? "m3r"
        : "legacy";
  }
  return contracts;
}

function toolGuideForTools(
  tools: readonly ToolName[],
  recordContracts: AgentStepRecordContracts,
): string {
  const offered = [...new Set(tools)];
  const usesM3rPressure = offered.some(tool =>
    (tool === "write_record" || tool === "read_record") && recordContracts[tool] === "m3r"
  );
  return [
    "Tool argument guide for the currently offered branches:",
    ...offered.flatMap(tool => {
      if (tool === "write_record" || tool === "read_record") {
        const contract = recordContracts[tool];
        if (!contract) throw new Error(`agent-step guide requires a ${tool} contract`);
        return RECORD_TOOL_ARGUMENT_GUIDES[tool][contract];
      }
      return TOOL_ARGUMENT_GUIDES[tool];
    }),
    ...(usesM3rPressure ? [M3R_INSTITUTIONAL_PRESSURE_GUIDE] : []),
    "Only use actors, objects, records, and tool names present in the observe packet.",
  ].join("\n");
}

interface SanitizedValidationIssue {
  path: string;
  code: string;
  message: string;
}

interface ProviderRepairValidationIssue {
  path: string;
  message: string;
  offendingLatinTokens?: string[];
}

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function outputStringFragments(text: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const fragments = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      const fragment = sanitizeDiagnosticText(value);
      if (fragment.length > 0) fragments.add(fragment);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        const fragment = sanitizeDiagnosticText(key);
        if (fragment.length > 0) fragments.add(fragment);
        visit(entry);
      });
    }
  };
  visit(parsed);
  return [...fragments].sort((left, right) => right.length - left.length);
}

function sanitizedValidationIssues(
  error: z.ZodError,
  sensitiveFragments: readonly string[],
): SanitizedValidationIssue[] {
  return error.issues.map(issue => {
    let message = sanitizeDiagnosticText(issue.message);
    for (const fragment of sensitiveFragments) {
      message = message.split(fragment).join("[redacted]");
    }
    return {
      path: issue.path.join("."),
      code: issue.code,
      message: [...message].slice(0, 240).join(""),
    };
  });
}

function providerRepairValidationIssue(issue: z.ZodIssue): ProviderRepairValidationIssue {
  const base = {
    path: issue.path.join("."),
    message: issue.message,
  };
  if (issue.code !== "custom") return base;
  const tokens = issue.params?.offendingLatinTokens;
  if (
    !Array.isArray(tokens) ||
    !tokens.every(token => typeof token === "string" && token.length > 0)
  ) {
    return base;
  }
  return { ...base, offendingLatinTokens: [...tokens] };
}

const PRIVATE_ACTOR_CONTEXT_GUIDE =
  "actorContext and selfContext describe only this resident's authored identity, voice, private motivation, and holder-local relationship knowledge. They may shape tone, priorities, and questions, but they are not observations or evidence about the player. Treat only supplied memories, heard speech, visible records, and visible facts as evidence, and never reveal a private pressure unless this resident deliberately chooses to speak about it in-fiction.";
const CONVERSATION_PARTICIPANT_GUIDE =
  "conversationFrame is authoritative about participation and location. The residentSpeaker is the only NPC speaking now, and the playerInterlocutor is always the person being addressed; every other actor named in residentContext, attributedHeardSpeech, or memoryEvidence is a third party, never the player. residentSpeaker.locationId belongs only to the resident. The player's location is known only when playerInterlocutor.locationId is non-null; never copy or infer the resident's location as the player's location. For an opening, write one fresh line addressed to the player. Prior resident speech and attributed NPC-to-NPC speech are evidence only: never replay either as if it were the resident's new opening line.";
const CONVERSATION_VISIBLE_FACT_GUIDE =
  "The groundingContract is a hard validity boundary for NPC speech, judgment reasons, questions, and every concrete claim about the player or world; it is not a style suggestion. Missing context means unknown, never absent. The resident's public role may ground generic job topics and ordinary capabilities when phrased without a concrete claim: a receptionist may conditionally ask whether the visit concerns a schedule or paperwork and may offer general reception guidance. It does not establish that this visitor has an appointment, that a particular document or record exists, or that anything was checked, missing, required, approved, owned, received, or completed. objective, goals, policy, and private motivation explain priorities but are not evidence of those concrete facts. A question can still make an invalid presupposition: 'Who arranged this appointment?' and localized equivalents assert that the interlocutor has an appointment, so they are invalid until the player or visible evidence establishes one. Ask the purpose first; only after the player establishes a concrete schedule, booking, document, or procedure may the resident narrow its source or details. The NPC may ask a neutral or conditional question about an unknown, but must not claim a specific record or item exists, was checked, is missing, is required, or belongs to anyone. Suggested player replies are different: they are uncommitted possible utterances, not observations, world facts, or statements the player has already made. safe/local is the least exposing plausible answer and may use a modest cover claim; uncertain/repair may hedge, qualify, or expose uncertainty; risky/weird may offer a bolder unsupported cover claim or lie so the player can choose that social risk. Never use any candidate suggestion as evidence in the NPC utterance, whyLine, openQuestion, or another suggestion, and never imply that it was selected. Each suggestion must be a self-contained in-character utterance that can be spoken verbatim: never narrate what the player says or label the speaker, and explicitly preserve the person, object, source, or claim being answered whenever omission could make a role, name, or noun phrase sound like the player's own identity or possession. Never emit a bare name, role, object, yes/no fragment, or copular noun phrase whose referent exists only in the NPC question.";
const CONVERSATION_REPLY_BINDING_GUIDE =
  "Interpret playerLine as a direct answer to answerBinding.answeredNpcLine, not as an isolated sentence. Preserve the semantic slot and referent established by that NPC question. Ellipsis in a displayed or typed answer fills the requested slot; it does not become a claim about the player's identity, job, possession, or biography unless the player explicitly says so. Judge the contextual proposition that the two lines express together.";
const CONVERSATION_GROUNDING_SELF_CHECK =
  "Before final JSON, silently perform this grounding check: (1) in NPC speech, why-lines, open questions, and every concrete world claim, identify each person-specific appointment, booking, required step, document, record, reference number, possession, past action, and claimed access to a specific institutional resource; (2) locate the exact supplied scene fact, player statement, visible fact, record, heard line, or memory that supports it; (3) if no support exists, make the NPC wording generic or conditional without claiming the fact applies to this visitor; (4) inspect suggestions separately as uncommitted literal candidate speech, make their relative social risk legible, and ensure no other field treats any suggestion as selected or true. A statement that the visitor wants to confirm steps before a hearing establishes that purpose and the hearing, but not a concrete appointment, reference number, notice, dossier, paperwork, visitor record, or a completed check.";

function latestNpcLine(
  history: readonly { speakerId: string; line: string }[],
): string | null {
  return [...history].reverse().find(entry => entry.speakerId !== "player")?.line ?? null;
}

function conversationGroundingContract(
  request:
    | ConversationTurnRequest
    | ConversationJudgmentRequest
    | MergedConversationTurnRequest,
  newestPlayerLine?: string,
) {
  const playerStatements = request.conversationHistory
    .filter(line => line.speakerId === "player")
    .map(line => line.line);
  if (newestPlayerLine !== undefined) playerStatements.push(newestPlayerLine);
  const heardSpeech = [...request.observePacket.heardSpeech];
  if (newestPlayerLine !== undefined) {
    const duplicateIndex = heardSpeech.lastIndexOf(newestPlayerLine);
    if (duplicateIndex >= 0) heardSpeech.splice(duplicateIndex, 1);
  }
  return {
    knowledgeMode: "closed_world",
    suppliedSceneContext: "sceneFacts" in request ? request.sceneFacts : [],
    suppliedPlayerStatements: playerStatements,
    visibleObjectFacts: request.observePacket.visibleObjects.map(object => ({
      label: object.label,
      state: object.state,
    })),
    visibleRecordFacts: request.observePacket.visibleRecords.map(record => ({
      kind: record.kind,
      stateBody: record.stateBody,
    })),
    attributedHeardSpeech: heardSpeech.map(line => {
      const attributedNpcSpeech = /^(NPC_[A-Za-z0-9_]+):\s+([\s\S]+)$/.exec(line);
      if (attributedNpcSpeech) {
        return {
          sourceType: "third_party_npc" as const,
          speakerActorId: attributedNpcSpeech[1],
          line: attributedNpcSpeech[2],
        };
      }
      return {
        sourceType: "player" as const,
        speakerActorId: "player" as const,
        line,
      };
    }),
    validityRules: [
      "Treat every unlisted person, identity, role, item, document, record, approval, appointment, possession, and past event as unknown.",
      "Do not convert unknown into absent, missing, checked, expected, owned, received, or completed.",
      "A public role may support generic job topics and ordinary capabilities, but objectives, goals, and private context do not establish that a concrete procedure, register entry, required document, appointment, approval, or next step exists for this visitor.",
      "A question must not presuppose an unknown fact: asking who arranged 'this appointment' is invalid until the player or visible evidence establishes that an appointment exists and concerns the player.",
      "Generic role guidance may be offered conditionally, but do not state that the resident checked or can access a specific unsupplied record, document, system, or institutional resource.",
      "Suggested replies are uncommitted candidate speech, not evidence: safe/local is least exposing, uncertain/repair may hedge, and risky/weird may offer a bolder cover claim or lie. Only the one the player selects or types becomes a supplied player statement.",
      "Attributed heard speech is prior evidence, not a line in the current player conversation; preserve its named speaker and never present it as the resident's new utterance.",
    ],
  };
}

function residentProviderContext(packet: ObservePacket) {
  return {
    actorId: packet.actorId,
    role: packet.role,
    landmarkId: packet.landmarkId,
    goals: packet.goals,
    actorPolicy: packet.actorPolicy,
    actorContext: packet.actorContext,
    selfContext: packet.selfContext,
    memoryNotes: packet.actorMemory.ownActionNotes,
  };
}

function conversationMemoryEvidence(packet: ObservePacket) {
  return packet.actorMemory.ownActionNotes.map(note => {
    const heard = /^\[heard_from=([^\]]+)\]\s*([\s\S]*)$/.exec(note);
    if (heard) {
      return {
        evidenceType: "heard_third_party_npc" as const,
        speakerActorId: heard[1],
        note: heard[2],
      };
    }
    const selfUtterance = /^\[self_utterance\]\s*([\s\S]*)$/.exec(note);
    if (selfUtterance) {
      return {
        evidenceType: "resident_prior_utterance" as const,
        speakerActorId: packet.actorId,
        note: selfUtterance[1],
      };
    }
    if (note.startsWith("[player_utterance]")) {
      const exchange = /^\[player_utterance\]\s*([\s\S]*?)\s*\/\s*\[self_reply\]\s*([\s\S]*?)\s*\/\s*\[judgment_reason\]\s*([\s\S]*)$/.exec(note);
      if (exchange) {
        return {
          evidenceType: "player_conversation_exchange" as const,
          playerSpeakerActorId: "player" as const,
          residentSpeakerActorId: packet.actorId,
          playerLine: exchange[1],
          residentReply: exchange[2],
          judgmentReason: exchange[3],
        };
      }
      return {
        evidenceType: "player_conversation_exchange" as const,
        playerSpeakerActorId: "player" as const,
        residentSpeakerActorId: packet.actorId,
        note,
      };
    }
    return {
      evidenceType: "resident_memory" as const,
      holderActorId: packet.actorId,
      note,
    };
  });
}

function conversationResidentContext(packet: ObservePacket) {
  const { landmarkId: _landmarkId, memoryNotes: _memoryNotes, ...resident } =
    residentProviderContext(packet);
  return {
    ...resident,
    memoryEvidence: conversationMemoryEvidence(packet),
    presentActorIds: packet.visibleActors,
    audibleActorIds: packet.audibleActorIds,
  };
}

function conversationFrame(
  packet: ObservePacket,
  phase: "opening" | "player_reply",
) {
  const playerLocationId = packet.playerContact?.available
    ? packet.playerContact.playerLocationId
    : null;
  return {
    phase,
    residentSpeaker: {
      actorId: packet.actorId,
      role: packet.role,
      locationId: packet.landmarkId,
    },
    playerInterlocutor: {
      actorId: "player" as const,
      role: "player" as const,
      locationId: playerLocationId,
      locationBasis: playerLocationId !== null
        ? "engine_grounded_player_contact"
        : phase === "player_reply"
          ? "active_face_to_face_location_not_supplied"
          : "not_supplied_for_opening",
    },
    thirdPartyActorIds: [...new Set([
      ...packet.visibleActors,
      ...packet.audibleActorIds,
    ].filter(actorId => actorId !== packet.actorId && actorId !== "player"))],
  };
}

function agentObserveContext(packet: ObservePacket, tools: readonly ToolName[]) {
  const toolSet = new Set(tools);
  const needsActors =
    toolSet.has("move_to") ||
    toolSet.has("look") ||
    toolSet.has("talk_to") ||
    toolSet.has("request");
  const needsObjects = toolSet.has("look") || toolSet.has("use_object");
  const needsRecords =
    toolSet.has("look") || toolSet.has("read_record") || toolSet.has("write_record");
  const needsAdministration = toolSet.has("read_record") || toolSet.has("write_record");
  return {
    resident: residentProviderContext(packet),
    heardSpeech: packet.heardSpeech,
    ...(needsActors
      ? {
          visibleActorIds: packet.visibleActors,
          audibleActorIds: packet.audibleActorIds,
        }
      : {}),
    ...(toolSet.has("move_to")
      ? {
          reachableAnchorRefs: packet.reachableAnchorRefs,
          playerContact: packet.playerContact,
        }
      : {}),
    ...(needsObjects ? { visibleObjects: packet.visibleObjects } : {}),
    ...(needsRecords ? { visibleRecords: packet.visibleRecords } : {}),
    ...(toolSet.has("use_object") || needsAdministration
      ? { visibleLedgerEvents: packet.visibleLedgerEvents }
      : {}),
    ...(needsAdministration
      ? {
          administrativeSources: packet.administrativeSources,
          administrativeAuthority: packet.administrativeAuthority,
        }
      : {}),
  };
}

function ambientListenerContext(request: AmbientReplyRequest) {
  const heardSpeech = [...request.observePacket.heardSpeech];
  const exactSource = `${request.sourceSpeakerActorId}: ${request.sourceUtterance}`;
  const duplicateIndex = heardSpeech.lastIndexOf(exactSource);
  if (duplicateIndex >= 0) heardSpeech.splice(duplicateIndex, 1);
  return {
    ...residentProviderContext(request.observePacket),
    presentActorIds: request.observePacket.visibleActors,
    audibleActorIds: request.observePacket.audibleActorIds,
    otherHeardSpeech: heardSpeech,
  };
}

function localeOutputInstructions(locale: string, fields: string): string[] {
  const supportedLocale = requireSupportedGameplayLocale(locale);
  const instructions = [
    `The immutable run locale is ${supportedLocale}. Write ${fields} in ${providerLanguageName(supportedLocale)}.`,
    "Stay entirely inside the fiction. Never call anyone a player, user, or NPC, and never mention a game, AI, language model, prompt, system message, provider, or model response in player-visible prose.",
    "Keep stable ids, intent labels, tool names, and tool argument keys unchanged in machine-readable fields; never copy stable ids into player-visible text.",
  ];
  if (supportedLocaleEntry(supportedLocale).presentationId === "ko") {
    instructions.push(
      "Write natural Korean prose in every player-visible text field, and include at least one Hangul code point in each nonempty field.",
      "Latin-script names, established in-fiction acronyms such as QR or ID, numerals, and occasional Hanja are allowed when natural, but they cannot replace Korean prose. Never mix Japanese hiragana or katakana, Simplified Chinese forms, or Chinese function words and clauses into Korean player-visible text.",
      "Do not copy lowercase Latin place, role, or name tokens from machine-readable context into player-visible prose. Render public labels in Korean—for example Studio as 스튜디오, Office as 사무실, Station as 스테이션, and Park as 공원—and transliterate non-acronym names when needed.",
    );
  }
  return instructions;
}

function playerVisibleOutputContract(locale: string) {
  const supportedLocale = requireSupportedGameplayLocale(locale);
  return {
    immutableRunLocale: supportedLocale,
    requiredLanguage: providerLanguageName(supportedLocale),
    sourceContextHandling:
      "Actor and scenario context may be authored in another language. Preserve its meaning and voice, but translate or naturally re-express it; never copy source-language prose into a player-visible field unless it already matches requiredLanguage.",
    finalCheck:
      "Before returning JSON, reread every player-visible field and rewrite any field that is not wholly natural in requiredLanguage.",
  };
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

type ProviderBudgetAdmission = "admitted" | "hard_exhausted" | "caller_reserved";

const MAX_AUDIT_RESOLUTIONS = 256;
const HEARING_PROVIDER_TIMEOUT_MS = 120_000;

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
    const proposalSchema = conversationProposalSchemaForLocale(request.locale);
    const proposalJsonSchema = conversationProposalJsonSchemaForLocale(request.locale);
    const instructions = [
      "You are an NPC inside Dream of One, a social-suspicion game.",
      "Stay in role and use only visible context.",
      CONVERSATION_PARTICIPANT_GUIDE,
      PRIVATE_ACTOR_CONTEXT_GUIDE,
      CONVERSATION_VISIBLE_FACT_GUIDE,
      ...localeOutputInstructions(
        request.locale,
        "the NPC utterance and all three player reply suggestions",
      ),
      "Return one NPC utterance and exactly three short player reply suggestions.",
      "Use the intent labels only as a relative social-risk gradient: safe/local is the least exposing plausible answer, uncertain/repair hedges or clarifies, and risky/weird may offer a bolder cover claim or lie. They are hidden candidate metadata and never decide suspicion or game truth.",
      "Do not claim a verdict, hidden fact, or world mutation.",
      CONVERSATION_GROUNDING_SELF_CHECK,
      "Before returning JSON, remove every unsupported concrete world claim from NPC-authored speech and questions. Do not erase a candidate cover claim; keep it clearly confined to that unselected suggestion.",
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const requestContext = {
      objective: request.objective,
      conversationFrame: conversationFrame(request.observePacket, "opening"),
      residentContext: conversationResidentContext(request.observePacket),
      conversationHistory: request.conversationHistory.slice(-6),
      groundingContract: conversationGroundingContract(request),
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<ConversationProposal>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_turn",
        jsonSchema: proposalJsonSchema,
      },
      schema: proposalSchema,
      repairContext: requestContext,
      fallback: () => this.options.fallback.proposeConversationTurn(request),
    });
  }

  async judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>> {
    const proposalSchema = conversationJudgmentSchemaForLocale(request.locale).superRefine(
      (value, context) => requireReachableSuspicionDelta(
        value,
        context,
        request.suspicionBefore,
      ),
    );
    const proposalJsonSchema = conversationJudgmentJsonSchemaForLocale(request.locale);
    const instructions = [
      "You are the judging mind of one NPC inside Dream of One, a social-suspicion game.",
      "Read the player's newest line and decide how it moves this NPC's suspicion and report pressure.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      CONVERSATION_PARTICIPANT_GUIDE,
      CONVERSATION_REPLY_BINDING_GUIDE,
      PRIVATE_ACTOR_CONTEXT_GUIDE,
      CONVERSATION_VISIBLE_FACT_GUIDE,
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      REACHABLE_SUSPICION_DELTA_GUIDE,
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world sentence the player will read as the reason suspicion moved.",
      ...localeOutputInstructions(request.locale, "whyLine"),
      "Do not decide any verdict or session outcome.",
      CONVERSATION_GROUNDING_SELF_CHECK,
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const requestContext = {
      playerLine: request.playerLine,
      conversationHistory: request.conversationHistory.slice(-10),
      answerBinding: {
        answeredNpcLine: latestNpcLine(request.conversationHistory),
      },
      conversationFrame: conversationFrame(request.observePacket, "player_reply"),
      residentContext: conversationResidentContext(request.observePacket),
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
      groundingContract: conversationGroundingContract(request, request.playerLine),
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<ConversationJudgment>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation",
        instructions,
        input,
        schemaName: "npc_conversation_judgment",
        jsonSchema: proposalJsonSchema,
      },
      schema: proposalSchema,
      repairContext: requestContext,
      fallback: () => this.options.fallback.judgeConversationTurn(request),
    });
  }

  async judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>> {
    const proposalSchema = mergedConversationTurnSchemaForLocale(request.locale).superRefine(
      (value, context) => requireReachableSuspicionDelta(
        value,
        context,
        request.suspicionBefore,
      ),
    );
    const proposalJsonSchema = mergedConversationTurnJsonSchemaForLocale(request.locale);
    const instructions = [
      "You are one NPC inside Dream of One, a social-suspicion game.",
      "In one response, judge the player's newest line AND write your next spoken reply with exactly three short player reply suggestions.",
      "Judge only from the provided visible context, memory, and conversation history; never invent unseen facts.",
      CONVERSATION_PARTICIPANT_GUIDE,
      CONVERSATION_REPLY_BINDING_GUIDE,
      PRIVATE_ACTOR_CONTEXT_GUIDE,
      CONVERSATION_VISIBLE_FACT_GUIDE,
      "Both scores use a 0..125 game scale. Return integer deltas calibrated to that scale, not tiny 1..5 ratings.",
      REACHABLE_SUSPICION_DELTA_GUIDE,
      "As calibration, a coherent routine answer is roughly -15..+5 suspicion and -10..+3 report; a notable mismatch is +10..30 suspicion and +5..20 report; an explicit contradiction, dream/outside claim, or local-memory gap is +30..60 suspicion and +20..50 report; several severe signals plus refusal or hostility may be +60..100 suspicion and +50..100 report.",
      "Those ranges are calibration, not a classifier: use the actual context and allow asymmetric or negative movement when warranted.",
      "List the signal labels that genuinely apply; an ordinary answer has none.",
      "whyLine is one in-world sentence the player will read as the reason suspicion moved.",
      "Return stance as this NPC's coarse personal opinion after the exchange: oppose, uncertain, or vouch.",
      "Vouch is bounded personal testimony, not proof of the player's identity, booking, institutional approval, biography, or final innocence: it means this NPC would tell the later hearing that the player's directly heard answers were coherent and ordinary for the role-supported question.",
      "When an initially uncertain NPC receives a substantive direct answer that addresses or honestly narrows its role-supported question, stays consistent with the exchange, and carries no grounded contradiction or suspicion signal, vouch is normally appropriate; do not require an external record, prior acquaintance, or a discoverable answer to hidden facts.",
      "Do not treat completion of actor stable goals or resolution of an external booking, source, handler, or other procedural fact as a prerequisite for vouch. A direct, consistent statement that the player does not know that fact may resolve the personal question of what the player knows and count as meaningful firsthand; an external procedural question may remain open while stance is vouch.",
      "Politeness, repetition, lack of hostility, or merely lowering suspicion without addressing a material question is not substantive; keep uncertain or oppose while a role-supported question remains materially open.",
      "Set meaningfulFirsthand=true when this direct exchange gives the NPC a relevant basis it can later cite, including firsthand evidence of the player's coherent handling of a role-supported question; it need not prove identity or an external fact. Vouch requires meaningfulFirsthand.",
      "openQuestion is either null or one concise player-log question authored from this exchange, with its own open/resolved status, text, and whyLine.",
      "currentOpenQuestion is the exact question tracked from the previous judged turn, if any. When the player's newest line directly answers it or honestly establishes the limit of what the player knows, return that question with status=resolved and a whyLine grounded in the answer; never leave an answered question stale by returning null or repeating it as open. Replace it with an open question only when the new question is materially different, role-supported, grounded, and useful for the player to answer.",
      "After stance becomes vouch, set continueConversation=false unless one materially different grounded question still warrants an immediate answer. If you continue, the utterance and all suggestions must advance that question: safe/local should directly answer it or state a concrete knowledge boundary, never merely promise a future record check.",
      "utterance is your next in-character line after hearing the player.",
      "Use the intent labels only as a relative social-risk gradient: safe/local is the least exposing plausible answer, uncertain/repair hedges or clarifies, and risky/weird may offer a bolder cover claim or lie. They are hidden candidate metadata and never decide suspicion or game truth.",
      ...localeOutputInstructions(
        request.locale,
        "whyLine, openQuestion text/whyLine, utterance, and all three suggestion texts",
      ),
      "Do not decide any verdict or session outcome, and do not claim a hidden fact or world mutation.",
      CONVERSATION_GROUNDING_SELF_CHECK,
      "Before returning JSON, remove every unsupported concrete world claim from NPC-authored speech, reasons, and questions. Do not erase a candidate cover claim; keep it clearly confined to that unselected suggestion.",
      "Return only JSON matching the supplied schema.",
    ].join(" ");
    const requestContext = {
      playerLine: request.playerLine,
      conversationHistory: request.conversationHistory.slice(-10),
      answerBinding: {
        answeredNpcLine: latestNpcLine(request.conversationHistory),
      },
      objective: request.objective,
      conversationFrame: conversationFrame(request.observePacket, "player_reply"),
      residentContext: conversationResidentContext(request.observePacket),
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
      stanceBefore: request.stanceBefore,
      hasMeaningfulFirsthandConversation: request.hasMeaningfulFirsthandConversation,
      currentOpenQuestion: request.currentOpenQuestion ?? null,
      groundingContract: conversationGroundingContract(request, request.playerLine),
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<MergedConversationTurn>({
      sessionId: request.sessionId,
      request: {
        purpose: "conversation_turn",
        instructions,
        input,
        schemaName: "npc_merged_conversation_turn",
        jsonSchema: proposalJsonSchema,
      },
      schema: proposalSchema,
      repairContext: requestContext,
      fallback: () => this.options.fallback.judgeAndProposeConversationTurn(request),
    });
  }

  async proposeNextStep(
    request: AgentStepRequest,
  ): Promise<ResolvedProposal<AgentStepProposal>> {
    const allowedTalkActorIds = request.allowedTalkActorIds === undefined
      ? undefined
      : [...new Set(request.allowedTalkActorIds.filter(actorId => actorId.length > 0))];
    const effectiveTools: ToolName[] = request.requiredToolCall
      ? [request.requiredToolCall.tool]
      : [...new Set(request.observePacket.toolCatalog)];
    const recordContracts = recordContractsForRequest(request, effectiveTools);
    const schemaConstraints = {
      effectiveTools,
      observePacket: request.observePacket,
      recordContracts,
      allowedTalkActorIds,
      requiredToolCall: request.requiredToolCall,
      requireUtterance: request.requireUtterance,
    };
    const jsonSchema = agentStepProposalJsonSchemaForTools(schemaConstraints, request.locale);
    const instructions = [
      "You choose one next action for a bounded NPC agent loop.",
      "Read the previous tool result before acting. A failed or blocked call must change the next attempt.",
      PRIVATE_ACTOR_CONTEXT_GUIDE,
      ...localeOutputInstructions(
        request.locale,
        "every natural-language output field, including utterance, rationale, whyLine, and record prose",
      ),
      "After a successful action completes the goal, return done=true on the next iteration. Never repeat an identical successful tool call.",
      "blockedSignatures contains calls already blocked or successfully completed during this beat; choose a different call or stop.",
      "The runtime validates and applies tools; never invent direct state changes or authority outcomes.",
      `Every non-null utterance appears as a transient world subtitle. Use one concise sentence no longer than ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points.`,
      request.requiredToolCall
        ? request.requiredToolCall.tool === "talk_to"
          ? "Return exactly four top-level keys: toolCall, utterance, rationale, and done. For this required reply, toolCall and utterance must both be non-null. Do not add top-level keys."
          : request.requireUtterance
            ? "Return exactly four top-level keys: toolCall, utterance, rationale, and done. For this required movement, toolCall and utterance must both be non-null. Do not add top-level keys."
            : "Return exactly four top-level keys: toolCall, utterance, rationale, and done. For this required movement, toolCall must be non-null; utterance may be null. Do not add top-level keys."
        : "Return exactly four top-level keys: toolCall, utterance, rationale, and done. Never omit toolCall or utterance; use null when either is absent. Do not add top-level keys.",
      "Stable ids may appear in identifier-valued toolCall.args fields and internal rationale. Never copy an actor, object, record, memory, text-surface, or landmark id into utterance or other player-visible prose.",
      ...(effectiveTools.includes("move_to")
        ? ["playerContact is offered to only one runtime-selected resident at a time. Choose move_to(player) only when your role goal or remembered facts warrant initiating a face-to-face question; otherwise choose another valid action or stop."]
        : []),
      ...(request.requiredToolCall?.tool === "talk_to"
        ? [
            `This wake permits only talk_to targeting the exact actor id ${request.requiredToolCall.actorId}.`,
            "Return one nonempty in-fiction utterance in the run locale with that talk_to call and finish this single reply with done=true.",
          ]
        : []),
      ...(request.requiredToolCall?.tool === "move_to"
          ? [
              `This wake permits only move_to targeting the exact id ${request.requiredToolCall.targetId}.`,
              request.requireUtterance
                ? "Return that move_to call with done=true and one nonempty in-fiction utterance."
                : "Return that move_to call with done=true. Do not invent speech; utterance may be null.",
            ]
        : []),
      ...(!request.requiredToolCall && allowedTalkActorIds !== undefined
        ? [allowedTalkActorIds.length > 0
            ? `If you use talk_to, actorId must be one of this request's exact allowed ids: ${allowedTalkActorIds.join(", ")}.`
            : "This request permits no talk_to target."]
        : []),
      ...(request.requiredToolCall
        ? []
        : ["Return done=true with toolCall=null when the goal is complete or no useful action remains."]),
      toolGuideForTools(effectiveTools, recordContracts),
      "Return only JSON matching the supplied schema.",
    ].join("\n");
    const requestContext = {
      goal: request.goal,
      iteration: request.iteration,
      observe: agentObserveContext(request.observePacket, effectiveTools),
      previousResult: request.previousResult ?? null,
      blockedSignatures: request.blockedSignatures,
      allowedTalkActorIds: allowedTalkActorIds ?? null,
      requiredToolCall: request.requiredToolCall ?? null,
      requireUtterance: request.requireUtterance ?? false,
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<AgentStepProposal>({
      sessionId: request.sessionId,
      request: {
        purpose: "agent_step",
        instructions,
        input,
        schemaName: "npc_agent_step",
        jsonSchema,
      },
      schema: agentStepProposalSchemaForRequest(request.locale, schemaConstraints),
      repairContext: requestContext,
      budgetCeiling: request.budgetCeiling,
      fallback: () => this.options.fallback.proposeNextStep(request),
    });
  }

  async judgeAndProposeAmbientReply(
    request: AmbientReplyRequest,
  ): Promise<ResolvedProposal<AmbientReplyJudgment>> {
    const jsonSchema = ambientReplyJudgmentJsonSchemaForTarget(
      request.targetActorId,
      request.locale,
    );
    const instructions = [
      "You are one resident listening to another resident inside Dream of One, a social-suspicion game.",
      "Reply once to the exact source utterance AND judge whether that remembered speech changes your personal opinion of the player.",
      "This is NPC hearsay, not a new player answer. Do not use player-answer signal labels, report pressure, records, institutional authority, or verdict semantics.",
      "Judge only from the exact source utterance and the listener-owned visible, heard, and remembered context supplied here; never invent unseen facts or imply that you directly witnessed something you only heard.",
      PRIVATE_ACTOR_CONTEXT_GUIDE,
      "Suspicion uses a 0..125 game scale. Return an integer delta calibrated to that scale; the runtime clamps movement and the final score.",
      "If the exact speech gives no grounded reason to change an opinion of the player, return suspicionDelta=0, preserve stanceBefore as proposedStance, and explain the no-change judgment in whyLine.",
      "A positive vouch requires the listener's existing meaningful firsthand conversation with the player. This ambient exchange can never create firsthand provenance.",
      `toolCall must be exactly talk_to with actorId ${request.targetActorId}; utterance is the listener's one in-character reply and done must be true.`,
      `Keep utterance to one concise sentence no longer than ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points because it appears as a transient world subtitle.`,
      "openQuestion is null unless this exact exchange creates or resolves one concise question the player may later learn when meeting this listener.",
      ...localeOutputInstructions(
        request.locale,
        "utterance, rationale, whyLine, and openQuestion text/whyLine",
      ),
      "Do not decide a verdict or mutate the world. Return only JSON matching the supplied schema.",
    ].join(" ");
    const requestContext = {
      sourceSpeakerActorId: request.sourceSpeakerActorId,
      sourceUtterance: request.sourceUtterance,
      listenerActorId: request.listenerActorId,
      targetActorId: request.targetActorId,
      stanceBefore: request.stanceBefore,
      suspicionBefore: request.suspicionBefore,
      hasMeaningfulFirsthandConversation: request.hasMeaningfulFirsthandConversation,
      listener: ambientListenerContext(request),
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<AmbientReplyJudgment>({
      sessionId: request.sessionId,
      request: {
        purpose: "ambient_reply",
        instructions,
        input,
        schemaName: "npc_ambient_reply_judgment",
        jsonSchema,
      },
      schema: ambientReplyJudgmentSchemaForRequest(request.locale, request.targetActorId),
      repairContext: requestContext,
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
      "A resident's publicIdentity and voice guide wording only. They are not evidence and disclose no private motivation or relationship context.",
      "For each resident, derive contactBasis exactly from that resident's supplied memories: meaningful_firsthand when any player_conversation has meaningfulFirsthand=true; limited_firsthand when player_conversation memory exists but none is meaningful; never_conversed when no player_conversation memory exists.",
      "When contactBasis is limited_firsthand, testimonyLine may acknowledge limited direct contact but must not claim substantive firsthand grounds. When it is never_conversed, testimonyLine must say there was no direct conversation. You still own the testimony wording and may cite that resident's attributed ambient memories.",
      "proposedStance is your memory-grounded reassessment after the final defense. The runtime validates provenance and may clamp an unsupported vouch.",
      "At the hearing, vouch has the same bounded meaning: evidence-backed personal testimony that the resident directly heard coherent, ordinary answers, not proof of identity or the final verdict.",
      "A resident with a supporting meaningful_firsthand player-conversation memory may preserve or move to vouch; cite every supporting player_conversation memory used, and do not require an external record.",
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
    const requestContext = {
      finalDefense: request.finalDefense,
      institutionalPressure: request.institutionalPressure,
      residents: request.residents,
      records: request.records,
      ledgerEvents: request.ledgerEvents,
      playerVisibleOutputContract: playerVisibleOutputContract(request.locale),
    };
    const input = JSON.stringify(requestContext);
    return this.resolveValidated<HearingJudgment>({
      sessionId: request.runId,
      request: {
        purpose: "hearing_verdict",
        instructions,
        input,
        schemaName: "station_hearing_judgment",
        jsonSchema: hearingJudgmentJsonSchemaForRequest(request),
        timeoutMs: Math.max(this.timeoutMs, HEARING_PROVIDER_TIMEOUT_MS),
      },
      schema: hearingJudgmentSchemaForRequest(request),
      repairContext: requestContext,
      fallback: () => this.options.fallback.judgeHearing(request),
    });
  }

  private async resolveValidated<T>(input: {
    sessionId: string;
    request: TextGenRequest & { purpose: ProviderResolutionPurpose };
    schema: z.ZodType<T>;
    repairContext?: unknown;
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
    repairContext?: unknown;
    budgetCeiling?: { maxCalls: number; maxTokens: number };
  }): Promise<
    | { ok: true; value: T; meta: ProposalMeta; callSeqs: number[] }
    | { ok: false; reason: ProviderFailureReason; callSeqs: number[] }
  > {
    const callSeqs: number[] = [];
    const initialAdmission = this.budgetAdmission(
      input.sessionId,
      input.request,
      input.budgetCeiling,
    );
    if (initialAdmission === "hard_exhausted") {
      return { ok: false, reason: "budget_exhausted", callSeqs };
    }
    if (initialAdmission === "caller_reserved") {
      throw new ProviderBudgetReservedError();
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
      let candidate: T;
      let combinedUsage = first.usage;
      if (parsed.success) {
        candidate = parsed.data;
      } else {
        const repairRequest: TextGenRequest = {
          ...input.request,
          purpose: "repair",
          instructions: `${input.request.instructions}\nReturn a complete replacement JSON value that satisfies every validation issue. Do not return a patch or add commentary. Read requestContext.playerVisibleOutputContract and use exactly its requiredLanguage for every player-visible field, even when actor or scenario source text is Korean or another language. Always rewrite the whole affected field when it is player-visible; translate or naturally re-express its meaning and never preserve a rejected foreign-language fragment. For Korean, use Hangul-dominant Korean and translate invalid Latin prose, Simplified Chinese forms, Chinese function words or clauses, hiragana, and katakana; retain only natural title-case names, short uppercase in-fiction acronyms, numerals, and occasional Hanja. When a Korean validation issue includes offendingLatinTokens, remove, translate, or transliterate every listed token in its affected field, rewrite that entire field from scratch, and recheck every Latin token rather than only lowercase words. Render machine-context place labels as Korean, for example Studio as 스튜디오, Office as 사무실, Station as 스테이션, and Park as 공원, and transliterate non-acronym names when necessary. When a player-visible field exposes an internal stable id, never repeat the identifier, an underscore token, or an internal id-shaped substitute.`,
          input: JSON.stringify({
            ...(input.repairContext === undefined
              ? {}
              : { requestContext: input.repairContext }),
            invalidOutput: first.text,
            validationIssues: parsed.error.issues.map(providerRepairValidationIssue),
          }),
        };
        const repairAdmission = this.budgetAdmission(
          input.sessionId,
          repairRequest,
          input.budgetCeiling,
        );
        if (repairAdmission !== "admitted") {
          // A live first call must remain linked to one resolution. If only the
          // repair no longer fits the caller reserve, retain the existing
          // deterministic fallback resolution rather than orphaning that call.
          return { ok: false, reason: "budget_exhausted", callSeqs };
        }
        const repair = await this.generateOne(
          input.sessionId,
          repairRequest,
          callSeqs,
          input.budgetCeiling,
        );
        const repaired = this.parseJson(input.schema, repair.text);
        if (!repaired.success) {
          const sensitiveFragments = [
            ...outputStringFragments(first.text),
            ...outputStringFragments(repair.text),
          ];
          console.warn({
            event: "provider_invalid_envelope_after_repair",
            purpose: input.request.purpose,
            firstIssues: sanitizedValidationIssues(parsed.error, sensitiveFragments),
            repairIssues: sanitizedValidationIssues(repaired.error, sensitiveFragments),
          });
          return { ok: false, reason: "invalid_envelope", callSeqs };
        }
        candidate = repaired.data;
        combinedUsage = this.combineUsage(first.usage, repair.usage);
      }

      return {
        ok: true,
        value: candidate,
        meta: this.liveMeta(combinedUsage),
        callSeqs,
      };
    } catch (error) {
      if (error instanceof ProviderBudgetReservedError) {
        if (callSeqs.length === 0) throw error;
        return { ok: false, reason: "budget_exhausted", callSeqs };
      }
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
    const admission = this.budgetAdmission(sessionId, request, ceiling, reservedTokens);
    if (admission === "hard_exhausted") {
      throw new Error("provider budget ceiling");
    }
    if (admission === "caller_reserved") throw new ProviderBudgetReservedError();
    this.reserveCall(sessionId, reservedTokens);
    const callSeq = this.beginCallAudit(sessionId, reservedTokens);
    callSeqs.push(callSeq);
    try {
      const result = await this.withTimeout(
        this.options.textGen.generate(request),
        request.timeoutMs ?? this.timeoutMs,
      );
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

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error("provider timeout")), timeoutMs);
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

  private budgetAdmission(
    sessionId: string,
    request: TextGenRequest,
    ceiling?: { maxCalls: number; maxTokens: number },
    reservedTokens = this.tokenReservation(request),
  ): ProviderBudgetAdmission {
    const budget = this.budgetFor(sessionId);
    const projectedCalls = budget.calls + 1;
    const projectedTokens =
      budget.inputTokens + budget.outputTokens + budget.reservedTokens + reservedTokens;
    if (projectedCalls > this.maxCalls || projectedTokens > this.maxTokens) {
      return "hard_exhausted";
    }
    if (
      ceiling &&
      (projectedCalls > ceiling.maxCalls || projectedTokens > ceiling.maxTokens)
    ) {
      return "caller_reserved";
    }
    return "admitted";
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
