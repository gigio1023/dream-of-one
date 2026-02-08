import type { DecisionEnvelope, PerceptionPacket } from "../contracts/types.js";
import { createFallbackIntent } from "../runtime/fallback.js";
import type { CodexToolGateway } from "./codex-tool-gateway.js";
import type { ThreadStore } from "./thread-store.js";
import { runPreHook, runToolHook } from "../policy/hook-policy.js";

export interface CodexBroker {
  decide(packet: PerceptionPacket): Promise<DecisionEnvelope>;
}

function buildPrompt(packet: PerceptionPacket): string {
  return [
    "You are an NPC runtime agent. Return JSON only.",
    "Required fields: npcId, actionType, reasonCodes (non-empty), confidence (0..1).",
    "Optional fields: targetId, locationId, utterance.",
    "Allowed actionType values: Move, Talk, Ask, Observe, Work, Report, Escort, Idle.",
    "Input packet:",
    JSON.stringify(packet),
  ].join("\n");
}

export class DefaultCodexBroker implements CodexBroker {
  private readonly maxAttempts = 2;

  constructor(
    private readonly gateway: CodexToolGateway,
    private readonly threadStore: ThreadStore,
  ) {}

  async decide(packet: PerceptionPacket): Promise<DecisionEnvelope> {
    const preHookResult = runPreHook(packet);
    if (!preHookResult.ok) {
      return this.asFallback(packet, preHookResult.reason ?? "tool_failure");
    }

    const currentThreadId = this.threadStore.get(packet.sessionId, packet.npcId);
    const prompt = buildPrompt(packet);
    const toolResult = await runToolHook({
      gateway: this.gateway,
      currentThreadId,
      prompt,
      expectedNpcId: packet.npcId,
      maxAttempts: this.maxAttempts,
    });

    if ("reason" in toolResult) {
      return this.asFallback(packet, toolResult.reason);
    }

    this.threadStore.set(packet.sessionId, packet.npcId, toolResult.threadId);

    return {
      intent: toolResult.intent,
      meta: {
        usedFallback: false,
        threadId: toolResult.threadId,
        transport: toolResult.transport,
      },
    };
  }

  private asFallback(packet: PerceptionPacket, reason: string): DecisionEnvelope {
    return {
      intent: createFallbackIntent(packet, reason),
      meta: {
        usedFallback: true,
        reason,
        transport: "fallback",
      },
    };
  }
}
