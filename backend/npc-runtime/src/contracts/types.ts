export const ACTION_TYPES = [
  "Move",
  "Talk",
  "Ask",
  "Observe",
  "Work",
  "Report",
  "Escort",
  "Idle",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const SOCIAL_LOOP_STAGES = [
  "ambient",
  "report",
  "intake",
  "normal",
  "uneasy",
  "probing",
  "shared",
  "reported",
  "inquest",
  "verdict",
] as const;

export type SocialLoopStage = (typeof SOCIAL_LOOP_STAGES)[number];

export const PLAYER_SPEECH_ACTS = [
  "SA_COMPLY",
  "SA_INQUIRE",
  "SA_FRAME",
  "SA_BREAK",
] as const;

export type PlayerSpeechAct = (typeof PLAYER_SPEECH_ACTS)[number];

export const CONVERSATION_SUSPICION_SIGNALS = [
  "local_routine_mismatch",
  "dream_language_leak",
  "memory_gap_admission",
  "role_script_break",
  "prior_statement_contradiction",
  "authority_evasion",
  "over_explanation",
  "response_hesitation",
] as const;

export type ConversationSuspicionSignal = (typeof CONVERSATION_SUSPICION_SIGNALS)[number];

export const CONVERSATION_CHOICE_INTENTS = [
  "safe/local",
  "uncertain/repair",
  "risky/weird",
] as const;

export type ConversationChoiceIntent = (typeof CONVERSATION_CHOICE_INTENTS)[number];

/** Player-facing presentation of one resident's opinion during an M3R run. */
export const COARSE_STANCES = ["oppose", "uncertain", "vouch"] as const;

export type CoarseStance = (typeof COARSE_STANCES)[number];

export interface ConversationTurnSignal {
  conversationId: string;
  turnId: string;
  promptId: string;
  choiceSetId: string;
  speakerId: string;
  selectedChoiceId?: string;
  freeInputHash?: string;
  displayedPlayerLine: string;
  priorTurnIds?: string[];
  suspicionSignals?: ConversationSuspicionSignal[];
  suspicionBefore?: number;
  suspicionAfter?: number;
  reportWeightBefore?: number;
  reportWeightAfter?: number;
  whyLine?: string;
}

export interface PerceptionPacket {
  sessionId: string;
  npcId: string;
  // Optional external hint; runtime policy rejects any non-codex value.
  cognitionPath?: string;
  landmarkId: string;
  nearbyActors: string[];
  recentEvents: string[];
  organizationContext: Record<string, unknown>;
  playerSignals: Record<string, unknown>;
  conversation?: ConversationTurnSignal;
}

export interface NpcIntent {
  npcId: string;
  actionType: ActionType;
  targetId?: string;
  locationId?: string;
  utterance?: string;
  reasonCodes: string[];
  confidence: number;
}

export interface DecisionEnvelope {
  intent: NpcIntent;
  meta: {
    usedFallback: boolean;
    reason?: string;
    reasonDetail?: string;
    reasonCategory?: "none" | "policy" | "schema" | "timeout" | "cancelled" | "parse" | "tool" | "runtime" | "unknown";
    warningTier?: "blocking" | "attention" | "reference";
    threadId?: string;
    transport: "codex" | "codex-reply" | "fallback";
    socialLoopStage?: SocialLoopStage;
    playerSpeechAct?: PlayerSpeechAct;
    providerUsage?: {
      model: string;
      estimatedInputTokens: number;
      maxOutputTokens: number;
      estimatedTotalTokens: number;
      estimatedCostUsd: number;
      actualInputTokens?: number;
      actualOutputTokens?: number;
      actualTotalTokens?: number;
    };
  };
}
