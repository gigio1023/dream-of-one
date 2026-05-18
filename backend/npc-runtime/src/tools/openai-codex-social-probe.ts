import { DefaultCodexBroker } from "../broker/codex-broker.js";
import { OpenAiProposalGateway } from "../broker/codex-tool-gateway.js";
import { InMemoryThreadStore } from "../broker/thread-store.js";
import { loadConfig } from "../config.js";
import type { DecisionEnvelope, PerceptionPacket } from "../contracts/types.js";

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildPackets(): PerceptionPacket[] {
  return [
    {
      sessionId: "openai-codex-social-probe",
      npcId: "store-clerk-social-probe",
      landmarkId: "Store",
      nearbyActors: ["player", "waiting-customer"],
      recentEvents: [
        "player_repeated_wrong_receipt_request",
        "store_clerk_marked_receipt_record",
        "waiting_customer_observed_queue_delay",
      ],
      organizationContext: {
        organization: "Store",
        role: "Clerk",
        duty: "keep receipt records consistent while serving the queue",
        availableAffordances: ["mark_receipt", "warn_queue", "answer_locally"],
      },
      playerSignals: {
        suspicion: 0.42,
        exposure: 0.2,
        lastSpeechAct: "SA_INQUIRE",
        deterministicOutcome: "local_record_created",
      },
    },
    {
      sessionId: "openai-codex-social-probe",
      npcId: "waiting-customer-social-probe",
      landmarkId: "Store",
      nearbyActors: ["player", "store-clerk"],
      recentEvents: [
        "store_clerk_marked_receipt_record",
        "queue_delay_visible",
        "player_statement_did_not_match_usual_order",
      ],
      organizationContext: {
        organization: "Store queue",
        role: "Waiting Customer",
        duty: "react only to visible queue and public record facts",
        availableAffordances: ["accept_routine", "note_wary", "share_local_tip"],
      },
      playerSignals: {
        suspicion: 0.55,
        exposure: 0.28,
        lastSpeechAct: "SA_FRAME",
        deterministicOutcome: "wary_queue_note_available",
      },
    },
  ];
}

function summarizeDecision(decision: DecisionEnvelope): Record<string, unknown> {
  return {
    npcId: decision.intent.npcId,
    actionType: decision.intent.actionType,
    utterance: decision.intent.utterance,
    reasonCodes: decision.intent.reasonCodes,
    usedFallback: decision.meta.usedFallback,
    transport: decision.meta.transport,
    threadId: decision.meta.threadId,
    providerUsage: decision.meta.providerUsage,
  };
}

async function main(): Promise<void> {
  const liveTestEnabled = parseBoolean(process.env.OPENAI_PROPOSAL_LIVE_TEST);
  const totalEstimatedCapUsd = parseNumber(
    process.env.OPENAI_CODEX_SOCIAL_PROBE_TOTAL_ESTIMATED_COST_USD,
    0.01,
  );
  const packets = buildPackets();
  const config = loadConfig({
    ...process.env,
    NPC_RUNTIME_PROPOSAL_PROVIDER: process.env.NPC_RUNTIME_PROPOSAL_PROVIDER ?? "openai-codex",
  });
  const perRequestCapUsd = config.openAiProposal.budget.maxEstimatedCostUsd;
  const maxPlannedEstimatedUsd = perRequestCapUsd * packets.length;

  const summary = {
    provider: config.proposalProvider,
    baseUrl: config.openAiProposal.baseUrl,
    preferredModel: config.openAiProposal.preferredModel,
    fallbackModels: config.openAiProposal.fallbackModels,
    reasoningEffort: config.openAiProposal.reasoningEffort,
    requestCount: packets.length,
    perRequestEstimatedCapUsd: perRequestCapUsd,
    totalEstimatedCapUsd,
    maxPlannedEstimatedUsd,
    chatGptProQuotaRemaining: "not_exposed_by_codex_response",
    hasCredential: config.openAiProposal.apiKey.trim().length > 0,
    liveTestEnabled,
  };

  console.log(JSON.stringify({ status: "configured", summary }, null, 2));

  if (maxPlannedEstimatedUsd > totalEstimatedCapUsd) {
    console.log(
      `SKIP: planned cap $${maxPlannedEstimatedUsd.toFixed(6)} exceeds total cap `
      + `$${totalEstimatedCapUsd.toFixed(6)}. Lower OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD `
      + "or raise OPENAI_CODEX_SOCIAL_PROBE_TOTAL_ESTIMATED_COST_USD intentionally.",
    );
    return;
  }

  if (!liveTestEnabled) {
    console.log("SKIP: set OPENAI_PROPOSAL_LIVE_TEST=1 to spend the configured live-test budget.");
    return;
  }

  if (!config.openAiProposal.apiKey.trim()) {
    console.log("SKIP: configure OPENAI_CODEX_ACCESS_TOKEN, OPENAI_CODEX_API_KEY, or OPENAI_CODEX_AUTH_STORE_PATH.");
    return;
  }

  const gateway = new OpenAiProposalGateway(config.openAiProposal);
  const health = await gateway.checkHealth();
  console.log(JSON.stringify({ status: "health", health }, null, 2));
  if (!health.ok) {
    throw new Error(`OpenAI Codex social probe provider is not ready: ${health.reason ?? "unknown"}`);
  }

  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());
  const decisions: DecisionEnvelope[] = [];
  for (const packet of packets) {
    const decision = await broker.decide(packet, {
      deadlineMs: Math.min(config.decisionDeadlineMs, config.openAiProposal.requestTimeoutMs),
    });
    decisions.push(decision);
    if (decision.meta.usedFallback) {
      throw new Error(`OpenAI Codex social probe fell back for ${packet.npcId}: ${decision.meta.reason ?? "unknown"}`);
    }
  }

  const usage = decisions.map(decision => decision.meta.providerUsage).filter(Boolean);
  const estimatedCostUsd = usage.reduce((sum, item) => sum + (item?.estimatedCostUsd ?? 0), 0);
  const actualInputTokens = usage.reduce((sum, item) => sum + (item?.actualInputTokens ?? 0), 0);
  const actualOutputTokens = usage.reduce((sum, item) => sum + (item?.actualOutputTokens ?? 0), 0);
  const actualTotalTokens = usage.reduce((sum, item) => sum + (item?.actualTotalTokens ?? 0), 0);

  console.log(JSON.stringify({
    status: "decisions",
    budget: {
      estimatedCostUsd,
      totalEstimatedCapUsd,
      actualInputTokens,
      actualOutputTokens,
      actualTotalTokens,
      chatGptProQuotaRemaining: "not_exposed_by_codex_response",
    },
    decisions: decisions.map(summarizeDecision),
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
