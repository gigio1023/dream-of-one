import type { ObservePacket } from "../agentloop/context.js";
import type { ToolCall } from "../agentloop/tools.js";
import type { ConversationChoiceIntent, ConversationSuspicionSignal } from "../contracts/types.js";

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
  /** One in-world Korean sentence the player sees as the reason. */
  whyLine: string;
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
  iteration: number;
  goal: string;
  observePacket: ObservePacket;
  previousResult?: AgentToolResult;
  blockedSignatures: string[];
}

/** The only AI dependency visible to conversation and agent-loop domain code. */
export interface NpcProposalPort {
  readonly profileId: string;
  preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }>;
  proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>>;
  judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>>;
  proposeNextStep(request: AgentStepRequest): Promise<ResolvedProposal<AgentStepProposal>>;
}

export interface TextGenRequest {
  purpose: "conversation" | "agent_step" | "repair";
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
