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
  };
}
