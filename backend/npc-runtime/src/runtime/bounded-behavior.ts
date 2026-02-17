import {
  PLAYER_SPEECH_ACTS,
  SOCIAL_LOOP_STAGES,
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
const SOCIAL_LOOP_STAGE_SET = new Set<string>(SOCIAL_LOOP_STAGES);

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
  trigger: "context" | "default";
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

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeSocialLoopStage(value: string): SocialLoopStage | undefined {
  const normalized = value.trim().toLowerCase();
  if (!SOCIAL_LOOP_STAGE_SET.has(normalized)) {
    return undefined;
  }
  return normalized as SocialLoopStage;
}

function resolveSocialLoopStageFromRecord(record: Record<string, unknown>): SocialLoopStage | undefined {
  const keys = ["socialLoopStage", "social_loop_stage", "stage", "phase"] as const;
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }
    const stage = normalizeSocialLoopStage(value);
    if (stage) {
      return stage;
    }
  }
  return undefined;
}

function toSocialLoopObservation(packet: PerceptionPacket): SocialLoopObservation {
  const stageHint =
    resolveSocialLoopStageFromRecord(asRecord(packet.playerSignals))
    ?? resolveSocialLoopStageFromRecord(asRecord(packet.organizationContext));

  return {
    stage: stageHint ?? "ambient",
    trigger: stageHint ? "context" : "default",
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
