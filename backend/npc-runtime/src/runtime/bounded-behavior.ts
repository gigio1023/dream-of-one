import {
  PLAYER_SPEECH_ACTS,
  type DecisionEnvelope,
  type PerceptionPacket,
  type PlayerSpeechAct,
  type SocialLoopStage,
} from "../contracts/types.js";
import { annotateDecisionMeta } from "../policy/reason-taxonomy.js";
import { createFallbackIntent } from "./fallback.js";

const UTTERANCE_MAX_LENGTH = 256;
const SPEECH_ACT_SET = new Set<string>(PLAYER_SPEECH_ACTS);

const VERDICT_TOKENS = ["verdict", "detained", "cleared", "lucid_identified", "case_closed"] as const;
const INTAKE_TOKENS = ["intake", "inquest", "dossier", "report_desk", "interrogation"] as const;
const REPORT_TOKENS = ["report", "statement", "complaint", "ticket", "memo"] as const;

export interface SocialLoopObservation {
  stage: SocialLoopStage;
  trigger: "event" | "landmark" | "default";
  landmarkId: string;
  nearbyNpcCount: number;
  matchedEvents: string[];
}

export interface BoundedBehaviorEvaluation {
  decision: DecisionEnvelope;
  socialLoop: SocialLoopObservation;
  appliedFallback: boolean;
}

function normalizeEventToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toSocialLoopObservation(packet: PerceptionPacket): SocialLoopObservation {
  const normalizedEvents = packet.recentEvents.map(normalizeEventToken);
  const hasToken = (tokens: readonly string[]) => {
    const matched = normalizedEvents.filter(eventName => tokens.some(token => eventName.includes(token)));
    return matched;
  };

  const verdictMatches = hasToken(VERDICT_TOKENS);
  if (verdictMatches.length > 0) {
    return {
      stage: "verdict",
      trigger: "event",
      landmarkId: packet.landmarkId,
      nearbyNpcCount: countNearbyNpcs(packet.nearbyActors),
      matchedEvents: verdictMatches,
    };
  }

  const intakeMatches = hasToken(INTAKE_TOKENS);
  if (packet.landmarkId === "Station" || intakeMatches.length > 0) {
    return {
      stage: "intake",
      trigger: intakeMatches.length > 0 ? "event" : "landmark",
      landmarkId: packet.landmarkId,
      nearbyNpcCount: countNearbyNpcs(packet.nearbyActors),
      matchedEvents: intakeMatches,
    };
  }

  const reportMatches = hasToken(REPORT_TOKENS);
  if (reportMatches.length > 0) {
    return {
      stage: "report",
      trigger: "event",
      landmarkId: packet.landmarkId,
      nearbyNpcCount: countNearbyNpcs(packet.nearbyActors),
      matchedEvents: reportMatches,
    };
  }

  return {
    stage: "ambient",
    trigger: "default",
    landmarkId: packet.landmarkId,
    nearbyNpcCount: countNearbyNpcs(packet.nearbyActors),
    matchedEvents: [],
  };
}

function countNearbyNpcs(nearbyActors: string[]): number {
  return nearbyActors.reduce((count, actorId) => {
    const normalized = actorId.trim().toLowerCase();
    if (!normalized || normalized === "player") {
      return count;
    }
    return count + 1;
  }, 0);
}

function resolvePlayerSpeechAct(packet: PerceptionPacket): string | undefined {
  const signals = asRecord(packet.playerSignals);
  const keys = ["speechAct", "playerSpeechAct", "speech_act", "sa"] as const;
  for (const key of keys) {
    const value = signals[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().toUpperCase();
    }
  }
  return undefined;
}

function toFallbackDecision(
  packet: PerceptionPacket,
  decision: DecisionEnvelope,
  socialLoop: SocialLoopObservation,
  reasonCode: string,
  reasonDetail: string,
  playerSpeechAct?: PlayerSpeechAct,
): DecisionEnvelope {
  return annotateDecisionMeta({
    intent: createFallbackIntent(packet, reasonCode),
    meta: {
      usedFallback: true,
      reason: reasonCode,
      reasonDetail,
      threadId: decision.meta.threadId,
      transport: "fallback",
      socialLoopStage: socialLoop.stage,
      playerSpeechAct,
    },
  });
}

function attachBehaviorMeta(
  decision: DecisionEnvelope,
  socialLoop: SocialLoopObservation,
  playerSpeechAct?: PlayerSpeechAct,
): DecisionEnvelope {
  return annotateDecisionMeta({
    ...decision,
    meta: {
      ...decision.meta,
      socialLoopStage: socialLoop.stage,
      playerSpeechAct,
    },
  });
}

export function enforceBoundedBehavior(packet: PerceptionPacket, decision: DecisionEnvelope): BoundedBehaviorEvaluation {
  const socialLoop = toSocialLoopObservation(packet);
  const rawSpeechAct = resolvePlayerSpeechAct(packet);

  if (rawSpeechAct && !SPEECH_ACT_SET.has(rawSpeechAct)) {
    return {
      decision: toFallbackDecision(
        packet,
        decision,
        socialLoop,
        "policy_invalid_player_speech_act",
        `unsupported player speech act: ${rawSpeechAct}`,
      ),
      socialLoop,
      appliedFallback: true,
    };
  }

  const playerSpeechAct = rawSpeechAct as PlayerSpeechAct | undefined;

  if (socialLoop.stage === "intake" && playerSpeechAct === "SA_BREAK") {
    return {
      decision: toFallbackDecision(
        packet,
        decision,
        socialLoop,
        "policy_station_intake_requires_procedural_speech",
        "SA_BREAK is rejected during intake stage",
        playerSpeechAct,
      ),
      socialLoop,
      appliedFallback: true,
    };
  }

  if (["Talk", "Ask", "Report", "Escort"].includes(decision.intent.actionType)) {
    const utterance = decision.intent.utterance;
    if (!utterance || utterance.trim().length === 0) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_utterance_empty",
          `${decision.intent.actionType} requires non-empty utterance`,
          playerSpeechAct,
        ),
        socialLoop,
        appliedFallback: true,
      };
    }

    if (utterance.length > UTTERANCE_MAX_LENGTH) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_utterance_too_long",
          `utterance length ${utterance.length} exceeds ${UTTERANCE_MAX_LENGTH}`,
          playerSpeechAct,
        ),
        socialLoop,
        appliedFallback: true,
      };
    }
  }

  return {
    decision: attachBehaviorMeta(decision, socialLoop, playerSpeechAct),
    socialLoop,
    appliedFallback: false,
  };
}
