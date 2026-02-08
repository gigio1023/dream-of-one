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
    threadId?: string;
    transport: "codex" | "codex-reply" | "fallback";
  };
}
