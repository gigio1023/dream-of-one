import type { DecisionEnvelope, PerceptionPacket } from "../contracts/types.js";
import { createFallbackIntent } from "../runtime/fallback.js";
import type { CodexToolGateway } from "./codex-tool-gateway.js";
import type { ThreadStore } from "./thread-store.js";
import { runPreHook, runToolHook } from "../policy/hook-policy.js";
import { composeDecisionPrompt } from "../policy/prompt-policy.js";
import type { ReliabilityTelemetry } from "../runtime/reliability-telemetry.js";

export interface CodexBroker {
  decide(packet: PerceptionPacket): Promise<DecisionEnvelope>;
}

export interface CodexBrokerOptions {
  promptCharBudget?: number;
  maxToolRuntimeMs?: number;
  telemetry?: ReliabilityTelemetry;
}

export class DefaultCodexBroker implements CodexBroker {
  private readonly maxAttempts = 2;
  private readonly promptCharBudget: number | undefined;
  private readonly maxToolRuntimeMs: number | undefined;
  private readonly telemetry: ReliabilityTelemetry | undefined;

  constructor(
    private readonly gateway: CodexToolGateway,
    private readonly threadStore: ThreadStore,
    options: CodexBrokerOptions = {},
  ) {
    this.promptCharBudget = options.promptCharBudget;
    this.maxToolRuntimeMs = options.maxToolRuntimeMs;
    this.telemetry = options.telemetry;
  }

  async decide(packet: PerceptionPacket): Promise<DecisionEnvelope> {
    const preHookResult = runPreHook(packet);
    if (!preHookResult.ok) {
      return this.asFallback(packet, preHookResult.reason ?? "tool_failure");
    }

    const currentThreadId = this.threadStore.get(packet.sessionId, packet.npcId);
    const promptResult = composeDecisionPrompt(packet, {
      promptCharBudget: this.promptCharBudget,
    });
    const toolResult = await runToolHook({
      gateway: this.gateway,
      currentThreadId,
      prompt: promptResult.prompt,
      expectedNpcId: packet.npcId,
      maxAttempts: this.maxAttempts,
      maxTotalMs: this.maxToolRuntimeMs,
      telemetry: this.telemetry,
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
