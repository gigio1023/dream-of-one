import {
  PLAYER_SPEECH_ACTS,
  type ActionType,
  type DecisionEnvelope,
  type MineflayerCommandType,
  type PerceptionPacket,
  type PlayerSpeechAct,
  type SocialLoopStage,
} from "../contracts/types.js";
import { annotateDecisionMeta } from "../policy/reason-taxonomy.js";
import { createFallbackIntent } from "./fallback.js";
import { mapIntentToMineflayerCommand } from "./decision-bridge.js";

const CHAT_MAX_LENGTH = 256;
const SIGN_TEXT_MAX_LENGTH = 800;
const SPEECH_ACT_SET = new Set<string>(PLAYER_SPEECH_ACTS);

const VERDICT_TOKENS = ["verdict", "detained", "cleared", "lucid_identified", "case_closed"] as const;
const INTAKE_TOKENS = ["intake", "inquest", "dossier", "report_desk", "interrogation"] as const;
const REPORT_TOKENS = ["report", "statement", "complaint", "ticket", "memo"] as const;

const ALLOWED_COMMANDS_BY_ACTION: Record<ActionType, readonly MineflayerCommandType[]> = {
  Move: ["noop"],
  Talk: ["chat", "updateSign", "noop"],
  Ask: ["chat", "noop"],
  Observe: ["chat", "activateBlock", "noop"],
  Work: ["dig", "placeBlock", "placeEntity", "activateBlock", "updateSign", "chat", "noop"],
  Report: ["chat", "updateSign", "noop"],
  Escort: ["chat", "noop"],
  Idle: ["noop", "chat"],
};

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
  commandType: MineflayerCommandType;
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

function resolveCommandPayloadText(decision: DecisionEnvelope, field: "message" | "text"): string | undefined {
  const command = mapIntentToMineflayerCommand(decision.intent);
  const direct = command.args[field];
  if (typeof direct === "string") {
    return direct;
  }
  if (typeof decision.intent.utterance === "string") {
    return decision.intent.utterance;
  }
  return undefined;
}

export function enforceBoundedBehavior(packet: PerceptionPacket, decision: DecisionEnvelope): BoundedBehaviorEvaluation {
  const socialLoop = toSocialLoopObservation(packet);
  const rawSpeechAct = resolvePlayerSpeechAct(packet);
  const command = mapIntentToMineflayerCommand(decision.intent);

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
      commandType: command.type,
      appliedFallback: true,
    };
  }

  const playerSpeechAct = rawSpeechAct as PlayerSpeechAct | undefined;
  const allowedCommands = ALLOWED_COMMANDS_BY_ACTION[decision.intent.actionType];
  if (!allowedCommands.includes(command.type)) {
    return {
      decision: toFallbackDecision(
        packet,
        decision,
        socialLoop,
        "policy_command_not_allowed",
        `${decision.intent.actionType} cannot execute ${command.type}`,
        playerSpeechAct,
      ),
      socialLoop,
      commandType: command.type,
      appliedFallback: true,
    };
  }

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
      commandType: command.type,
      appliedFallback: true,
    };
  }

  if (command.type === "chat") {
    const message = resolveCommandPayloadText(decision, "message");
    if (!message || message.trim().length === 0) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_chat_message_empty",
          "chat command requires non-empty message",
          playerSpeechAct,
        ),
        socialLoop,
        commandType: command.type,
        appliedFallback: true,
      };
    }

    if (message.length > CHAT_MAX_LENGTH) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_chat_message_too_long",
          `chat message length ${message.length} exceeds ${CHAT_MAX_LENGTH}`,
          playerSpeechAct,
        ),
        socialLoop,
        commandType: command.type,
        appliedFallback: true,
      };
    }
  }

  if (command.type === "updateSign") {
    const text = resolveCommandPayloadText(decision, "text");
    if (!text || text.trim().length === 0) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_sign_text_empty",
          "updateSign requires non-empty text",
          playerSpeechAct,
        ),
        socialLoop,
        commandType: command.type,
        appliedFallback: true,
      };
    }

    if (text.length > SIGN_TEXT_MAX_LENGTH) {
      return {
        decision: toFallbackDecision(
          packet,
          decision,
          socialLoop,
          "policy_sign_text_too_long",
          `sign text length ${text.length} exceeds ${SIGN_TEXT_MAX_LENGTH}`,
          playerSpeechAct,
        ),
        socialLoop,
        commandType: command.type,
        appliedFallback: true,
      };
    }
  }

  return {
    decision: attachBehaviorMeta(decision, socialLoop, playerSpeechAct),
    socialLoop,
    commandType: command.type,
    appliedFallback: false,
  };
}
