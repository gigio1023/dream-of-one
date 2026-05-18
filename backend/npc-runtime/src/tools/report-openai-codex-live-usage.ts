import { existsSync, readFileSync } from "node:fs";

type ArtifactInput = {
  name: string;
  path: string;
  url: URL;
};

type ArtifactSummary = {
  name: string;
  path: string;
  ok: boolean;
  runId: string;
  sourceType: "artifact" | "ledger";
  requestCount: number;
  models: string[];
  usedFallback: boolean;
  totalEstimatedCostUsd: number;
  totalActualInputTokens: number;
  totalActualOutputTokens: number;
  totalActualTokens: number;
};

type UsageTotals = {
  totalEstimatedCostUsd: number;
  totalActualInputTokens: number;
  totalActualOutputTokens: number;
  totalActualTokens: number;
};

const artifacts: ArtifactInput[] = [
  {
    name: "Godot live PlayableSession route dispatch",
    path: "data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json",
    url: new URL(
      "../../../../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json",
      import.meta.url,
    ),
  },
  {
    name: "Godot live same-NPC continuity",
    path: "data/evidence/godot/live-provider-dispatch/dre_171_live_provider_thread_continuity_smoke.json",
    url: new URL(
      "../../../../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_thread_continuity_smoke.json",
      import.meta.url,
    ),
  },
];

const providerLedger = {
  path: ".game-harness/provider/openai-codex-live-social-probe-2026-05-18.md",
  url: new URL(
    "../../../../.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md",
    import.meta.url,
  ),
};

const ledgerEntries = [
  {
    name: "Backend one-call provider smoke",
    runId: "openai-proposal-smoke",
    requiredText: "One-call smoke:",
    requestCount: 1,
    totalEstimatedCostUsd: 0.00360825,
    totalActualInputTokens: 513,
    totalActualOutputTokens: 230,
    totalActualTokens: 743,
  },
  {
    name: "Backend two-NPC social probe",
    runId: "openai-codex-social-probe",
    requiredText: "Two-NPC social probe:",
    requestCount: 2,
    totalEstimatedCostUsd: 0.00732675,
    totalActualInputTokens: 1126,
    totalActualOutputTokens: 425,
    totalActualTokens: 1551,
  },
  {
    name: "Godot dispatch prior first-call timeout attempt",
    runId: "dre-live-provider-dispatch-smoke-prior-timeout-first-call",
    requiredText: "One prior attempt used the default 8-second decision deadline",
    requestCount: 1,
    totalEstimatedCostUsd: 0.00433725,
    totalActualInputTokens: 1290,
    totalActualOutputTokens: 230,
    totalActualTokens: 1520,
  },
  {
    name: "Godot continuity prior stored-response probe first call",
    runId: "dre-live-provider-thread-continuity-prior-stored-response-first-call",
    requiredText: "one successful first call spent estimated `$0.00433575`",
    requestCount: 1,
    totalEstimatedCostUsd: 0.00433575,
    totalActualInputTokens: 1289,
    totalActualOutputTokens: 263,
    totalActualTokens: 1552,
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function summarizeArtifact(input: ArtifactInput): ArtifactSummary {
  if (!existsSync(input.url)) {
    throw new Error(`Missing live provider usage artifact: ${input.path}`);
  }

  const artifact = JSON.parse(readFileSync(input.url, "utf8")) as unknown;
  if (!isRecord(artifact)) {
    throw new Error(`Live provider usage artifact is not an object: ${input.path}`);
  }

  const checks = isRecord(artifact.checks) ? artifact.checks : {};
  const proofs = isRecord(artifact.proofs) ? artifact.proofs : {};
  const liveDecisions = records(checks.liveDecisions);
  const decisionUsages = liveDecisions
    .map(decision => decision.providerUsage)
    .filter(isRecord);

  const usageTotals = decisionUsages.reduce<UsageTotals>((totals, usage) => {
    totals.totalEstimatedCostUsd += readNumber(usage.estimatedCostUsd);
    totals.totalActualInputTokens += readNumber(usage.actualInputTokens);
    totals.totalActualOutputTokens += readNumber(usage.actualOutputTokens);
    totals.totalActualTokens += readNumber(usage.actualTotalTokens);
    return totals;
  }, {
    totalEstimatedCostUsd: 0,
    totalActualInputTokens: 0,
    totalActualOutputTokens: 0,
    totalActualTokens: 0,
  });

  const modelValues = decisionUsages
    .map(usage => readString(usage.model))
    .filter(model => model.length > 0);
  const proofModel = readString(proofs.selectedModel);
  const models = Array.from(new Set([...modelValues, ...(proofModel ? [proofModel] : [])])).sort();

  return {
    name: input.name,
    path: input.path,
    ok: artifact.ok === true,
    runId: readString(artifact.runId),
    sourceType: "artifact",
    requestCount: liveDecisions.length || readNumber(proofs.decisionCount) || decisionUsages.length,
    models,
    usedFallback: liveDecisions.some(decision => decision.usedFallback === true) || proofs.usedFallback === true,
    totalEstimatedCostUsd: readNumber(proofs.totalEstimatedCostUsd) || usageTotals.totalEstimatedCostUsd,
    totalActualInputTokens: readNumber(proofs.totalActualInputTokens) || usageTotals.totalActualInputTokens,
    totalActualOutputTokens: readNumber(proofs.totalActualOutputTokens) || usageTotals.totalActualOutputTokens,
    totalActualTokens: readNumber(proofs.totalActualTokens) || usageTotals.totalActualTokens,
  };
}

function summarizeLedgerEntries(): ArtifactSummary[] {
  if (!existsSync(providerLedger.url)) {
    throw new Error(`Missing live provider usage ledger: ${providerLedger.path}`);
  }

  const ledger = readFileSync(providerLedger.url, "utf8");
  return ledgerEntries.map(entry => {
    if (!ledger.includes(entry.requiredText)) {
      throw new Error(`Live provider usage ledger is missing expected entry marker: ${entry.requiredText}`);
    }
    return {
      name: entry.name,
      path: providerLedger.path,
      ok: true,
      runId: entry.runId,
      sourceType: "ledger",
      requestCount: entry.requestCount,
      models: ["gpt-5.4-mini"],
      usedFallback: false,
      totalEstimatedCostUsd: entry.totalEstimatedCostUsd,
      totalActualInputTokens: entry.totalActualInputTokens,
      totalActualOutputTokens: entry.totalActualOutputTokens,
      totalActualTokens: entry.totalActualTokens,
    };
  });
}

function main(): void {
  const summaries = [
    ...summarizeLedgerEntries(),
    ...artifacts.map(summarizeArtifact),
  ];
  const totals = summaries.reduce<UsageTotals & { requestCount: number }>((sum, artifact) => {
    sum.requestCount += artifact.requestCount;
    sum.totalEstimatedCostUsd += artifact.totalEstimatedCostUsd;
    sum.totalActualInputTokens += artifact.totalActualInputTokens;
    sum.totalActualOutputTokens += artifact.totalActualOutputTokens;
    sum.totalActualTokens += artifact.totalActualTokens;
    return sum;
  }, {
    requestCount: 0,
    totalEstimatedCostUsd: 0,
    totalActualInputTokens: 0,
    totalActualOutputTokens: 0,
    totalActualTokens: 0,
  });

  const models = Array.from(new Set(summaries.flatMap(summary => summary.models))).sort();
  const summary = {
    status: summaries.every(artifact => artifact.ok) ? "pass" : "fail",
    source: "checked-in provider ledger plus Godot live provider artifacts",
    spendsLiveBudget: false,
    provider: "openai-codex",
    models,
    reasoningEffort: "low",
    chatGptProQuotaRemaining: "not_exposed_by_codex_response",
    totals,
    artifacts: summaries,
    notes: [
      "This report does not call the provider.",
      "Ledger entries include successful live calls that returned usage during prior failed/timeout probes.",
      "Product HUD/Evidence truth remains fallback_only_m1 unless a separate player-visible live-provider mode is implemented and proven.",
    ],
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "pass") {
    process.exitCode = 1;
  }
}

main();
