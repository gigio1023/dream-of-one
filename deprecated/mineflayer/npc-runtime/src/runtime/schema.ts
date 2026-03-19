import {
  ACTION_TYPES,
  MINEFLAYER_COMMAND_TYPES,
  type ActionType,
  type MineflayerCommandType,
  type NpcIntent,
  type PerceptionPacket,
} from "../contracts/types.js";

export class SchemaValidationError extends Error {}
export class IntentParseError extends Error {}

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SchemaValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SchemaValidationError(`${label} must be a non-empty string`);
  }
  return value;
}

function ensureStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new SchemaValidationError(`${label} must be a string[]`);
  }
  return value;
}

function asActionType(value: string): ActionType {
  if (ACTION_TYPES.includes(value as ActionType)) {
    return value as ActionType;
  }
  throw new IntentParseError(`unknown actionType: ${value}`);
}

function asMineflayerCommandType(value: string): MineflayerCommandType {
  if (MINEFLAYER_COMMAND_TYPES.includes(value as MineflayerCommandType)) {
    return value as MineflayerCommandType;
  }
  throw new IntentParseError(`unknown command: ${value}`);
}

function ensureConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new IntentParseError("confidence must be a number in range [0,1]");
  }
  return value;
}

function extractFirstJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  if (start < 0) {
    throw new IntentParseError("response does not contain JSON object");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  throw new IntentParseError("response JSON object is not closed");
}

export function parsePerceptionPacket(input: unknown): PerceptionPacket {
  const obj = ensureObject(input, "PerceptionPacket");

  const packet: PerceptionPacket = {
    sessionId: ensureString(obj.sessionId, "sessionId"),
    npcId: ensureString(obj.npcId, "npcId"),
    landmarkId: ensureString(obj.landmarkId, "landmarkId"),
    nearbyActors: ensureStringArray(obj.nearbyActors, "nearbyActors"),
    recentEvents: ensureStringArray(obj.recentEvents, "recentEvents"),
    organizationContext: ensureObject(obj.organizationContext, "organizationContext"),
    playerSignals: ensureObject(obj.playerSignals, "playerSignals"),
  };

  if (obj.cognitionPath !== undefined) {
    packet.cognitionPath = ensureString(obj.cognitionPath, "cognitionPath");
  }

  return packet;
}

export function parseNpcIntent(rawContent: string, expectedNpcId: string): NpcIntent {
  if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
    throw new IntentParseError("codex response content must be non-empty string");
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(extractFirstJsonObject(rawContent));
  } catch (error) {
    if (error instanceof IntentParseError) {
      throw error;
    }
    throw new IntentParseError(`invalid JSON response: ${(error as Error).message}`);
  }

  const obj = ensureObject(parsedRaw, "NpcIntent");
  const npcId = ensureString(obj.npcId, "npcId");
  if (npcId !== expectedNpcId) {
    throw new IntentParseError(`npcId mismatch: expected ${expectedNpcId}, got ${npcId}`);
  }

  const reasonCodes = ensureStringArray(obj.reasonCodes, "reasonCodes");
  if (reasonCodes.length === 0) {
    throw new IntentParseError("reasonCodes must include at least one value");
  }

  const intent: NpcIntent = {
    npcId,
    actionType: asActionType(ensureString(obj.actionType, "actionType")),
    reasonCodes,
    confidence: ensureConfidence(obj.confidence),
  };

  if (obj.targetId !== undefined) {
    intent.targetId = ensureString(obj.targetId, "targetId");
  }

  if (obj.locationId !== undefined) {
    intent.locationId = ensureString(obj.locationId, "locationId");
  }

  if (obj.utterance !== undefined) {
    intent.utterance = ensureString(obj.utterance, "utterance");
  }

  if (obj.command !== undefined) {
    intent.command = asMineflayerCommandType(ensureString(obj.command, "command"));
  }

  if (obj.commandArgs !== undefined) {
    intent.commandArgs = ensureObject(obj.commandArgs, "commandArgs");
  }

  return intent;
}
