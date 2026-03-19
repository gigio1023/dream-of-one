import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { DecisionEnvelope, MineflayerCommandType, NpcIntent } from "../contracts/types.js";
import type { ActionResult } from "./action-runner.js";
import { MineflayerActionRunner } from "./action-runner.js";

export interface MineflayerCommand {
  type: MineflayerCommandType;
  args: Record<string, unknown>;
}

export interface DecisionDispatchResult {
  actionId: string;
  command: MineflayerCommand;
  result: ActionResult;
}

function isVec3Like(value: unknown): value is { x: number; y: number; z: number } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.x === "number" && typeof obj.y === "number" && typeof obj.z === "number";
}

function toVec3(value: unknown): Vec3 | undefined {
  if (!isVec3Like(value)) {
    return undefined;
  }
  return new Vec3(value.x, value.y, value.z);
}

function resolveBlockFromArgs(bot: Bot, args: Record<string, unknown>, key: "block" | "referenceBlock") {
  const direct = args[key];
  if (typeof direct === "object" && direct !== null) {
    return direct as Parameters<Bot["canDigBlock"]>[0];
  }

  const position = toVec3(args[`${key}Position`]);
  if (!position) {
    return undefined;
  }
  return bot.blockAt(position) ?? undefined;
}

export function mapIntentToMineflayerCommand(intent: NpcIntent): MineflayerCommand {
  if (intent.command) {
    return {
      type: intent.command,
      args: intent.commandArgs ?? {},
    };
  }

  if (intent.actionType === "Talk" || intent.actionType === "Ask" || intent.actionType === "Report") {
    return {
      type: "chat",
      args: {
        message: intent.utterance ?? "Acknowledged.",
      },
    };
  }

  return {
    type: "noop",
    args: {},
  };
}

export async function dispatchDecisionToMineflayer(
  bot: Bot,
  actionRunner: MineflayerActionRunner,
  envelope: DecisionEnvelope,
  actionId: string,
): Promise<DecisionDispatchResult> {
  const command = mapIntentToMineflayerCommand(envelope.intent);
  const args = command.args;

  if (command.type === "noop") {
    return {
      actionId,
      command,
      result: {
        ok: true,
        actionId,
        evidence: {
          command: "noop",
          actionType: envelope.intent.actionType,
        },
      },
    };
  }

  if (command.type === "chat") {
    const message = typeof args.message === "string"
      ? args.message
      : envelope.intent.utterance;
    if (!message || message.trim().length === 0) {
      return {
        actionId,
        command,
        result: {
          ok: false,
          actionId,
          reasonCode: "CHAT_MESSAGE_EMPTY",
          reasonCategory: "precondition",
        },
      };
    }
    bot.chat(message);
    return {
      actionId,
      command,
      result: {
        ok: true,
        actionId,
        evidence: {
          message,
        },
      },
    };
  }

  if (command.type === "dig") {
    const block = resolveBlockFromArgs(bot, args, "block");
    return {
      actionId,
      command,
      result: await actionRunner.dig(block, {
        actionId,
        forceLook: args.forceLook as boolean | "ignore" | undefined,
        digFace: (args.digFace as "auto" | "raycast" | Vec3 | undefined) ?? "auto",
        timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined,
      }),
    };
  }

  if (command.type === "placeBlock") {
    const referenceBlock = resolveBlockFromArgs(bot, args, "referenceBlock");
    const faceVector = toVec3(args.faceVector);
    return {
      actionId,
      command,
      result: await actionRunner.placeBlock(referenceBlock, faceVector, {
        actionId,
        timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined,
      }),
    };
  }

  if (command.type === "placeEntity") {
    const referenceBlock = resolveBlockFromArgs(bot, args, "referenceBlock");
    const faceVector = toVec3(args.faceVector);
    return {
      actionId,
      command,
      result: await actionRunner.placeEntity(referenceBlock, faceVector, {
        actionId,
        timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined,
      }),
    };
  }

  if (command.type === "activateBlock") {
    const block = resolveBlockFromArgs(bot, args, "block");
    return {
      actionId,
      command,
      result: await actionRunner.activateBlock(block, {
        actionId,
        direction: toVec3(args.direction),
        cursorPos: toVec3(args.cursorPos),
        timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined,
      }),
    };
  }

  const block = resolveBlockFromArgs(bot, args, "block");
  const text = typeof args.text === "string"
    ? args.text
    : (envelope.intent.utterance ?? "");
  return {
    actionId,
    command,
    result: await actionRunner.updateSign(block, text, {
      actionId,
      back: args.back === true,
      timeoutMs: typeof args.timeoutMs === "number" ? args.timeoutMs : undefined,
    }),
  };
}
