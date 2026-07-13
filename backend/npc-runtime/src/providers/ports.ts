import type { ObservePacket } from "../agentloop/context.js";
import type { ToolCall } from "../agentloop/tools.js";
import type {
  HearingJudgment,
  HearingJudgmentRequest,
} from "../runtime/run-hearing.js";
import type {
  CoarseStance,
  ConversationChoiceIntent,
  ConversationSuspicionSignal,
} from "../contracts/types.js";

export type {
  HearingJudgment,
  HearingJudgmentRequest,
  HearingLedgerEventView,
  HearingMemoryView,
  HearingRecordView,
  HearingResidentAssessment,
  HearingResidentView,
} from "../runtime/run-hearing.js";

export type ProviderFailureReason =
  | "missing_credentials"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "invalid_envelope"
  | "budget_exhausted"
  | "transport_error";

/**
 * A caller-owned background ceiling rejected a proposal before its first
 * transport call could be reserved. This is run policy, not provider failure:
 * callers must stop the background beat without synthesizing fallback
 * metadata or an audit resolution.
 */
export class ProviderBudgetReservedError extends Error {
  readonly code = "provider_budget_reserved";

  constructor() {
    super("caller-supplied background provider budget is reserved");
    this.name = "ProviderBudgetReservedError";
  }
}

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ProposalMeta {
  profileId: string;
  transport: "live" | "fallback" | "scripted";
  usedFallback: boolean;
  fallbackReason?: ProviderFailureReason;
  usage?: ProviderUsage;
}

export type ProviderCallPurpose =
  | "conversation"
  | "conversation_turn"
  | "agent_step"
  | "ambient_reply"
  | "hearing_verdict"
  | "repair";

export type ProviderResolutionPurpose = Exclude<ProviderCallPurpose, "repair">;

/** Metadata-only record of one transport call. Never contains prompts or output. */
export interface ProviderCallAudit {
  seq: number;
  purpose: ProviderCallPurpose;
  profileId: string;
  transport: "live";
  usedFallback: false;
  outcome: "success" | "error";
  failureReason: ProviderFailureReason | null;
  chargedTokens: number;
}

/** One domain proposal resolution and the exact transport calls that fed it. */
export interface ProviderResolutionAudit {
  seq: number;
  purpose: ProviderResolutionPurpose;
  profileId: string;
  transport: ProposalMeta["transport"];
  usedFallback: boolean;
  fallbackReason: ProviderFailureReason | null;
  callSeqs: number[];
}

export interface ProviderAuditSnapshot {
  callsUsed: number;
  tokensUsed: number;
  inFlightCalls: number;
  inFlightTokens: number;
  complete: boolean;
  truncated: boolean;
  droppedCount: number;
  calls: ProviderCallAudit[];
  resolutions: ProviderResolutionAudit[];
}

export function emptyProviderAuditSnapshot(): ProviderAuditSnapshot {
  return {
    callsUsed: 0,
    tokensUsed: 0,
    inFlightCalls: 0,
    inFlightTokens: 0,
    complete: true,
    truncated: false,
    droppedCount: 0,
    calls: [],
    resolutions: [],
  };
}

export interface SuggestedReply {
  text: string;
  /** Prompt-shaping hint only. Runtime classification never trusts this value. */
  intent: ConversationChoiceIntent;
}

export interface ConversationProposal {
  utterance: string;
  suggestedReplies: [SuggestedReply, SuggestedReply, SuggestedReply];
  continueConversation: boolean;
}

export interface AgentStepProposal {
  toolCall?: ToolCall;
  utterance?: string;
  rationale: string;
  done: boolean;
}

/**
 * One NPC listener's grounded reply to an exact ambient utterance plus the
 * listener's model-owned personal judgment of the player. Administrative
 * pressure and player-speech signal semantics deliberately do not belong to
 * this envelope.
 */
export interface AmbientReplyJudgment {
  toolCall: { tool: "talk_to"; args: { actorId: string } };
  utterance: string;
  rationale: string;
  done: true;
  suspicionDelta: number;
  proposedStance: CoarseStance;
  whyLine: string;
  openQuestion: { status: "open" | "resolved"; text: string; whyLine: string } | null;
}

export interface ResolvedProposal<T> {
  proposal: T;
  meta: ProposalMeta;
}

export interface ConversationTurnRequest {
  sessionId: string;
  locale: string;
  beatId: string;
  actorId: string;
  objective: string;
  sceneFacts: string[];
  observePacket: ObservePacket;
  conversationHistory: Array<{ speakerId: string; line: string }>;
}

/**
 * The judging NPC's read of one player answer. The model owns the meaning;
 * the runtime clamps the movement and keeps the session ending guaranteed.
 */
export interface ConversationJudgment {
  suspicionDelta: number;
  reportDelta: number;
  signals: ConversationSuspicionSignal[];
  /** One in-world sentence in the run locale that the player sees as the reason. */
  whyLine: string;
}

/**
 * One merged player-turn result: judgment of the player's line plus the NPC's
 * next utterance and three reply suggestions. This is the only provider work
 * the player ever waits on (M3).
 */
export interface MergedConversationTurn extends ConversationJudgment {
  /** Model-owned coarse opinion after considering this direct exchange. */
  stance: CoarseStance;
  /** Whether the exchange contained enough firsthand substance to support a vouch. */
  meaningfulFirsthand: boolean;
  /** Provider-authored player log entry; omitted when this exchange opens no question. */
  openQuestion?: { status: "open" | "resolved"; text: string; whyLine: string } | null;
  utterance: string;
  suggestedReplies: [SuggestedReply, SuggestedReply, SuggestedReply];
  continueConversation: boolean;
}

export interface ConversationJudgmentRequest {
  sessionId: string;
  locale: string;
  beatId: string;
  promptId: string;
  /** The NPC doing the judging. */
  actorId: string;
  playerLine: string;
  /** Both sides of the exchange so far, excluding the line being judged. */
  conversationHistory: Array<{ speakerId: string; line: string }>;
  observePacket: ObservePacket;
  suspicionBefore: number;
  reportPressureBefore: number;
}

/** Judgment request plus the scene context needed to write the next NPC line. */
export interface MergedConversationTurnRequest extends ConversationJudgmentRequest {
  objective: string;
  sceneFacts: string[];
  stanceBefore?: CoarseStance;
  hasMeaningfulFirsthandConversation?: boolean;
}

export interface AgentToolResult {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  reason?: string;
  detail?: string;
  note: string;
}

export type RequiredAgentToolCall =
  | { tool: "talk_to"; actorId: string }
  | { tool: "move_to"; targetId: "player" };

export interface AgentStepRequest {
  sessionId: string;
  /** Immutable locale of the owning run/session. */
  locale: string;
  iteration: number;
  goal: string;
  observePacket: ObservePacket;
  previousResult?: AgentToolResult;
  blockedSignatures: string[];
  /** Optional request-local ceiling for otherwise grounded talk_to targets. */
  allowedTalkActorIds?: string[];
  /** Optional validity constraint for a wake whose only legal action is known. */
  requiredToolCall?: RequiredAgentToolCall;
  requireUtterance?: boolean;
  /** Absolute scope ceiling used by background work that must preserve a reserve. */
  budgetCeiling?: { maxCalls: number; maxTokens: number };
}

/** One bounded NPC-to-NPC reply. `sessionId` is the owning run budget scope. */
export interface AmbientReplyRequest {
  sessionId: string;
  locale: string;
  wakeId: string;
  conversationId: string;
  sourceSpeakerActorId: string;
  sourceUtterance: string;
  listenerActorId: string;
  targetActorId: string;
  stanceBefore: CoarseStance;
  suspicionBefore: number;
  hasMeaningfulFirsthandConversation: boolean;
  observePacket: ObservePacket;
  budgetCeiling?: { maxCalls: number; maxTokens: number };
}

/** The only AI dependency visible to conversation and agent-loop domain code. */
export interface NpcProposalPort {
  readonly profileId: string;
  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }>;
  /** Exact transport budget use for one run/session key, when this port owns a budget. */
  accountingSnapshot?(scopeId: string): { callsUsed: number; tokensUsed: number };
  /** Run-wide metadata-only transport and resolution provenance for acceptance auditing. */
  auditSnapshot(scopeId: string): ProviderAuditSnapshot;
  proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>>;
  judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>>;
  /** Judgment + next NPC reply + suggestions in one call (player-blocking path). */
  judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>>;
  proposeNextStep(request: AgentStepRequest): Promise<ResolvedProposal<AgentStepProposal>>;
  /** Exact ambient reply plus the listener's private, speech-grounded stance judgment. */
  judgeAndProposeAmbientReply(
    request: AmbientReplyRequest,
  ): Promise<ResolvedProposal<AmbientReplyJudgment>>;
  judgeHearing(request: HearingJudgmentRequest): Promise<ResolvedProposal<HearingJudgment>>;
}

export interface TextGenRequest {
  purpose: ProviderCallPurpose;
  instructions: string;
  input: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
}

export interface TextGenResult {
  text: string;
  usage?: ProviderUsage;
}

/** API-shape port implemented only by vendor/transport adapters. */
export interface TextGenPort {
  readonly adapterId: string;
  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }>;
  generate(request: TextGenRequest): Promise<TextGenResult>;
}
