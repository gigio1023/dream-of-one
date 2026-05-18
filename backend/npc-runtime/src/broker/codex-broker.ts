import { ACTION_TYPES, type DecisionEnvelope, type PerceptionPacket } from "../contracts/types.js";
import { createFallbackIntent } from "../runtime/fallback.js";
import type { ActorWorkspaceArtifacts, ActorWorkspaceStore } from "../memory/actor-workspace-store.js";
import { InMemoryActorWorkspaceStore } from "../memory/actor-workspace-store.js";
import type { CodexToolGateway } from "./codex-tool-gateway.js";
import type { ThreadStore } from "./thread-store.js";
import { runPreHook, runToolHook } from "../policy/hook-policy.js";
import { annotateDecisionMeta, FALLBACK_REASON_CODES, normalizeReasonCode } from "../policy/reason-taxonomy.js";

export interface CodexDecisionOptions {
  signal?: AbortSignal;
  deadlineMs?: number;
}

export interface CodexBroker {
  decide(packet: PerceptionPacket, options?: CodexDecisionOptions): Promise<DecisionEnvelope>;
}

function buildPrompt(packet: PerceptionPacket, workspace: ActorWorkspaceArtifacts): string {
  return [
    "You are an NPC runtime agent. Return JSON only.",
    "Required fields: npcId, actionType, reasonCodes (non-empty), confidence (0..1).",
    "Optional fields: targetId, locationId, utterance.",
    "Allowed actionType values: Move, Talk, Ask, Observe, Work, Report, Escort, Idle.",
    "Workspace artifacts:",
    JSON.stringify(workspace),
    "Input packet:",
    JSON.stringify(packet),
  ].join("\n");
}

export class DefaultCodexBroker implements CodexBroker {
  private readonly maxAttempts = 2;

  constructor(
    private readonly gateway: CodexToolGateway,
    private readonly threadStore: ThreadStore,
    private readonly workspaceStore: ActorWorkspaceStore = new InMemoryActorWorkspaceStore(),
  ) {}

  async decide(packet: PerceptionPacket, options?: CodexDecisionOptions): Promise<DecisionEnvelope> {
    const workspace = this.workspaceStore.load(packet.sessionId, packet.npcId);
    this.initializeWorkspace(workspace, packet);

    const preHookResult = runPreHook(packet);
    if (!preHookResult.ok) {
      const decision = this.asFallback(packet, preHookResult.reason ?? FALLBACK_REASON_CODES.toolFailure);
      this.recordWorkspace(packet, workspace, decision);
      return decision;
    }

    const currentThreadId = this.threadStore.get(packet.sessionId, packet.npcId)
      ?? (workspace.thread.threadId.trim() || undefined);
    const prompt = buildPrompt(packet, workspace);
    const toolResult = await runToolHook({
      gateway: this.gateway,
      currentThreadId,
      prompt,
      expectedNpcId: packet.npcId,
      maxAttempts: this.maxAttempts,
      signal: options?.signal,
      deadlineMs: options?.deadlineMs,
    });

    if ("reason" in toolResult) {
      const decision = this.asFallback(packet, toolResult.reason);
      this.recordWorkspace(packet, workspace, decision);
      return decision;
    }

    this.threadStore.set(packet.sessionId, packet.npcId, toolResult.threadId);

    const decision = annotateDecisionMeta({
      intent: toolResult.intent,
      meta: {
        usedFallback: false,
        threadId: toolResult.threadId,
        transport: toolResult.transport,
        ...(toolResult.providerUsage ? { providerUsage: toolResult.providerUsage } : {}),
      },
    });
    this.recordWorkspace(packet, workspace, decision);
    return decision;
  }

  private asFallback(packet: PerceptionPacket, reason: string): DecisionEnvelope {
    const normalizedReason = normalizeReasonCode(reason) ?? FALLBACK_REASON_CODES.toolFailure;
    return annotateDecisionMeta({
      intent: createFallbackIntent(packet, normalizedReason),
      meta: {
        usedFallback: true,
        reason: normalizedReason,
        transport: "fallback",
      },
    });
  }

  private initializeWorkspace(workspace: ActorWorkspaceArtifacts, packet: PerceptionPacket): void {
    if (Object.keys(workspace.persona).length === 0) {
      workspace.persona = {
        npcId: packet.npcId,
        organizationContext: packet.organizationContext,
      };
    }

    if (Object.keys(workspace.policy).length === 0) {
      workspace.policy = {
        allowedActionTypes: [...ACTION_TYPES],
        continuityPolicy: "codex_thread_resume",
        fallbackPolicy: "deterministic",
      };
    }
  }

  private recordWorkspace(packet: PerceptionPacket, workspace: ActorWorkspaceArtifacts, decision: DecisionEnvelope): void {
    const now = new Date().toISOString();

    workspace.memory.entries.push({
      timestamp: now,
      recentEvents: [...packet.recentEvents],
      actionType: decision.intent.actionType,
      reasonCodes: [...decision.intent.reasonCodes],
      usedFallback: decision.meta.usedFallback,
      transport: decision.meta.transport,
    });
    workspace.memory.entries = workspace.memory.entries.slice(-50);
    workspace.memory.recentEvents = packet.recentEvents.slice(-20);
    workspace.memory.lastReasonCodes = decision.intent.reasonCodes.slice(-10);

    if (decision.meta.threadId) {
      workspace.thread.threadId = decision.meta.threadId;
    }
    workspace.thread.transportHistory.push(decision.meta.transport);
    workspace.thread.transportHistory = workspace.thread.transportHistory.slice(-20);
    workspace.thread.updatedAt = now;

    workspace.summary.text = this.buildSummary(packet, decision);
    workspace.summary.updatedAt = now;

    this.workspaceStore.save(packet.sessionId, packet.npcId, workspace);
  }

  private buildSummary(packet: PerceptionPacket, decision: DecisionEnvelope): string {
    return [
      `npc:${packet.npcId}`,
      `landmark:${packet.landmarkId}`,
      `action:${decision.intent.actionType}`,
      `fallback:${decision.meta.usedFallback ? "yes" : "no"}`,
      `reasons:${decision.intent.reasonCodes.join(",")}`,
      `transport:${decision.meta.transport}`,
    ].join(" | ");
  }
}
