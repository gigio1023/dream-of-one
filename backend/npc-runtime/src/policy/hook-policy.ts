import type { PerceptionPacket, NpcIntent } from "../contracts/types.js";
import type { CodexToolGateway, CodexToolResponse } from "../broker/codex-tool-gateway.js";
import { CodexToolError, CodexToolTimeoutError } from "../broker/codex-tool-gateway.js";
import { IntentParseError, parseNpcIntent } from "../runtime/schema.js";

export const HOOK_REASONS = {
  nonCodexPath: "policy_reject_non_codex_path",
  requiredFieldMissing: "policy_required_field_missing",
  parseFailure: "parse_failure",
  toolTimeout: "codex_timeout",
  toolFailure: "tool_failure",
} as const;

export type HookReason = (typeof HOOK_REASONS)[keyof typeof HOOK_REASONS];

export interface PreHookResult {
  ok: boolean;
  reason?: HookReason;
}

export interface ToolHookSuccess {
  intent: NpcIntent;
  threadId: string;
  transport: "codex" | "codex-reply";
}

export interface ToolHookFailure {
  reason: HookReason;
}

export interface ToolHookOptions {
  gateway: CodexToolGateway;
  currentThreadId?: string;
  prompt: string;
  expectedNpcId: string;
  maxAttempts: number;
}

export function runPreHook(packet: PerceptionPacket): PreHookResult {
  if (!hasRequiredFields(packet)) {
    return { ok: false, reason: HOOK_REASONS.requiredFieldMissing };
  }

  if (packet.cognitionPath && packet.cognitionPath !== "codex" && packet.cognitionPath !== "codex-reply") {
    return { ok: false, reason: HOOK_REASONS.nonCodexPath };
  }

  return { ok: true };
}

export async function runToolHook(options: ToolHookOptions): Promise<ToolHookSuccess | ToolHookFailure> {
  const transport: "codex" | "codex-reply" = options.currentThreadId ? "codex-reply" : "codex";
  const attempts = Math.max(options.maxAttempts, 1);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = transport === "codex-reply"
        ? await options.gateway.codexReply(options.currentThreadId!, options.prompt)
        : await options.gateway.codex(options.prompt);
      const intent = runPostHook(response, options.expectedNpcId);
      return {
        intent,
        threadId: response.threadId,
        transport,
      };
    } catch (error) {
      const reason = classifyToolError(error);
      if (attempt >= attempts) {
        return { reason };
      }
    }
  }

  return { reason: HOOK_REASONS.toolFailure };
}

function runPostHook(response: CodexToolResponse, expectedNpcId: string): NpcIntent {
  const parsed = parseNpcIntent(response.content, expectedNpcId);

  const reasonCodes = dedupeReasonCodes(parsed.reasonCodes);
  if (reasonCodes.length === 0) {
    throw new IntentParseError("reasonCodes must include at least one value");
  }

  const normalized: NpcIntent = {
    ...parsed,
    reasonCodes,
    confidence: Number(parsed.confidence.toFixed(4)),
  };

  if (normalized.targetId !== undefined) {
    normalized.targetId = normalized.targetId.trim();
    if (normalized.targetId.length === 0) {
      delete normalized.targetId;
    }
  }

  if (normalized.locationId !== undefined) {
    normalized.locationId = normalized.locationId.trim();
    if (normalized.locationId.length === 0) {
      delete normalized.locationId;
    }
  }

  if (normalized.utterance !== undefined) {
    normalized.utterance = normalized.utterance.trim();
    if (normalized.utterance.length === 0) {
      delete normalized.utterance;
    }
  }

  return normalized;
}

function hasRequiredFields(packet: PerceptionPacket): boolean {
  const hasString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  return hasString(packet.sessionId)
    && hasString(packet.npcId)
    && hasString(packet.landmarkId)
    && Array.isArray(packet.nearbyActors)
    && Array.isArray(packet.recentEvents)
    && !!packet.organizationContext
    && typeof packet.organizationContext === "object"
    && !!packet.playerSignals
    && typeof packet.playerSignals === "object";
}

function dedupeReasonCodes(reasonCodes: string[]): string[] {
  const normalized = reasonCodes
    .map(code => code.trim())
    .filter(code => code.length > 0);
  return [...new Set(normalized)];
}

function classifyToolError(error: unknown): HookReason {
  if (error instanceof CodexToolTimeoutError) {
    return HOOK_REASONS.toolTimeout;
  }

  if (error instanceof IntentParseError) {
    return HOOK_REASONS.parseFailure;
  }

  if (error instanceof CodexToolError) {
    return HOOK_REASONS.toolFailure;
  }

  return HOOK_REASONS.toolFailure;
}
