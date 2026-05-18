import { DefaultCodexBroker } from "../broker/codex-broker.js";
import { OpenAiProposalGateway } from "../broker/codex-tool-gateway.js";
import { InMemoryThreadStore } from "../broker/thread-store.js";
import { loadConfig } from "../config.js";
import type { PerceptionPacket } from "../contracts/types.js";

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function buildSmokePacket(): PerceptionPacket {
  return {
    sessionId: "openai-live-smoke",
    npcId: "store-clerk-live-smoke",
    landmarkId: "Store",
    nearbyActors: ["player", "station-officer"],
    recentEvents: [
      "player_requested_wrong_receipt_copy",
      "store_ledger_entry_visible",
      "station_officer_waiting_near_counter",
    ],
    organizationContext: {
      organization: "Store",
      role: "Clerk",
      duty: "keep the receipt ledger consistent before Station intake",
    },
    playerSignals: {
      suspicion: 0.32,
      exposure: 0.18,
      lastSpeechAct: "SA_INQUIRE",
    },
  };
}

async function main(): Promise<void> {
  const config = loadConfig({
    ...process.env,
    NPC_RUNTIME_PROPOSAL_PROVIDER: process.env.NPC_RUNTIME_PROPOSAL_PROVIDER ?? "openai-codex",
  });
  const liveTestEnabled = parseBoolean(process.env.OPENAI_PROPOSAL_LIVE_TEST);

  const summary = {
    provider: config.proposalProvider,
    baseUrl: config.openAiProposal.baseUrl,
    preferredModel: config.openAiProposal.preferredModel,
    fallbackModels: config.openAiProposal.fallbackModels,
    reasoningEffort: config.openAiProposal.reasoningEffort,
    maxOutputTokens: config.openAiProposal.maxOutputTokens,
    budget: config.openAiProposal.budget,
    hasCredential: config.openAiProposal.apiKey.trim().length > 0,
    liveTestEnabled,
  };

  console.log(JSON.stringify({ status: "configured", summary }, null, 2));

  if (!liveTestEnabled) {
    console.log("SKIP: set OPENAI_PROPOSAL_LIVE_TEST=1 to spend the configured live-test budget.");
    return;
  }

  if (!config.openAiProposal.apiKey.trim()) {
    const hint = config.proposalProvider === "openai-codex"
      ? "OPENAI_CODEX_ACCESS_TOKEN, OPENAI_CODEX_API_KEY, or OPENAI_CODEX_AUTH_STORE_PATH is not configured."
      : "OPENAI_API_KEY is not set.";
    console.log(`SKIP: ${hint} Codex ChatGPT login is not an API key.`);
    return;
  }

  const gateway = new OpenAiProposalGateway(config.openAiProposal);
  const health = await gateway.checkHealth();
  console.log(JSON.stringify({ status: "health", health }, null, 2));
  if (!health.ok) {
    throw new Error(`OpenAI proposal provider is not ready: ${health.reason ?? "unknown"}`);
  }

  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());
  const decision = await broker.decide(buildSmokePacket(), {
    deadlineMs: Math.min(config.decisionDeadlineMs, config.openAiProposal.requestTimeoutMs),
  });

  console.log(JSON.stringify({ status: "decision", decision }, null, 2));
  if (decision.meta.usedFallback) {
    throw new Error(`OpenAI proposal smoke fell back: ${decision.meta.reason ?? "unknown"}`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
