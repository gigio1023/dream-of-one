import type { ObservePacket } from "../agentloop/context.js";
import type { ToolCall } from "../agentloop/tools.js";
import type {
  CoarseStance,
  ConversationChoiceIntent,
  ConversationSuspicionSignal,
} from "../contracts/types.js";

export type ProviderFailureReason =
  | "missing_credentials"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "invalid_envelope"
  | "budget_exhausted"
  | "transport_error";

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

export interface AgentStepRequest {
  sessionId: string;
  /** Immutable locale of the owning run/session. */
  locale: string;
  iteration: number;
  goal: string;
  observePacket: ObservePacket;
  previousResult?: AgentToolResult;
  blockedSignatures: string[];
  /** Optional validity constraint for a wake whose only legal action is known. */
  requiredToolCall?: { tool: "talk_to"; actorId: string };
  requireUtterance?: boolean;
  /** Absolute scope ceiling used by background work that must preserve a reserve. */
  budgetCeiling?: { maxCalls: number; maxTokens: number };
}

/** The only AI dependency visible to conversation and agent-loop domain code. */
export interface NpcProposalPort {
  readonly profileId: string;
  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }>;
  /** Exact transport budget use for one run/session key, when this port owns a budget. */
  accountingSnapshot?(scopeId: string): { callsUsed: number; tokensUsed: number };
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
}

export interface TextGenRequest {
  purpose: "conversation" | "conversation_turn" | "agent_step" | "repair";
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
