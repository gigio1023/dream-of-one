#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    evidence: "logs/runtime-evidence-summary.json",
    backendLog: "logs/npc-runtime.log",
    out: "logs/regression-metrics.json",
    codexRatioTarget: 0.7,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--evidence") {
      args.evidence = argv[++i];
      continue;
    }
    if (token === "--backend-log") {
      args.backendLog = argv[++i];
      continue;
    }
    if (token === "--out") {
      args.out = argv[++i];
      continue;
    }
    if (token === "--codex-ratio-target") {
      args.codexRatioTarget = Number(argv[++i]);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function safeReadJson(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function parseBackendDecisionLogs(path) {
  if (!existsSync(path)) {
    return [];
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.event === "npc_decision_response") {
        rows.push(parsed);
      }
    } catch {
      // ignore
    }
  }
  return rows;
}

function asCount(table, key) {
  if (!table || typeof table !== "object") {
    return 0;
  }
  const value = table[key];
  return typeof value === "number" ? value : 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidencePath = resolve(args.evidence);
  const backendLogPath = resolve(args.backendLog);
  const outPath = resolve(args.out);

  const evidence = safeReadJson(evidencePath, { counts: { transport: {}, warningTier: {}, reasonCategory: {} } });
  const warningTier = evidence?.counts?.warningTier ?? {};
  const reasonCategory = evidence?.counts?.reasonCategory ?? {};

  const backendRows = parseBackendDecisionLogs(backendLogPath);
  const codexCount = backendRows.filter(row => `${row.transport ?? ""}`.trim() === "codex").length;
  const codexReplyCount = backendRows.filter(row => `${row.transport ?? ""}`.trim() === "codex-reply").length;
  const fallbackCount = backendRows.filter(row => `${row.transport ?? ""}`.trim() === "fallback").length;
  const totalCount = codexCount + codexReplyCount + fallbackCount;
  const codexPathRatio = totalCount > 0 ? (codexCount + codexReplyCount) / totalCount : 0;
  const fallbackRatio = totalCount > 0 ? fallbackCount / totalCount : 0;

  let continuityLoss = 0;
  let fallbackWithoutReason = 0;
  for (const row of backendRows) {
    const transportName = `${row.transport ?? ""}`.trim();
    const threadId = `${row.threadId ?? ""}`.trim();
    const usedFallback = row.usedFallback === true;
    const reason = `${row.reason ?? ""}`.trim();

    if (transportName === "codex-reply" && threadId.length === 0) {
      continuityLoss += 1;
    }
    if (usedFallback && reason.length === 0) {
      fallbackWithoutReason += 1;
    }
  }

  const metrics = {
    generatedAt: new Date().toISOString(),
    source: {
      evidencePath,
      backendLogPath,
    },
    evidenceTotals: {
      totalEntries: typeof evidence?.counts?.totalEntries === "number" ? evidence.counts.totalEntries : 0,
      unityEntries: typeof evidence?.counts?.unityEntries === "number" ? evidence.counts.unityEntries : 0,
      backendEntries: typeof evidence?.counts?.backendEntries === "number" ? evidence.counts.backendEntries : 0,
    },
    totals: {
      totalDecisions: totalCount,
      codex: codexCount,
      codexReply: codexReplyCount,
      fallback: fallbackCount,
    },
    ratios: {
      codexPathRatio: Number(codexPathRatio.toFixed(4)),
      fallbackRatio: Number(fallbackRatio.toFixed(4)),
    },
    continuity: {
      codexReplyMissingThreadId: continuityLoss,
      fallbackWithoutReason,
    },
    warningTier,
    reasonCategory,
    thresholds: {
      codexPathRatioMin: args.codexRatioTarget,
      continuityLossMax: 0,
      fallbackWithoutReasonMax: 0,
    },
    pass: {
      codexPathRatio: codexPathRatio >= args.codexRatioTarget,
      continuityLoss: continuityLoss === 0,
      fallbackWithoutReason: fallbackWithoutReason === 0,
    },
  };

  metrics.pass.all = metrics.pass.codexPathRatio && metrics.pass.continuityLoss && metrics.pass.fallbackWithoutReason;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.log(`[regression-metrics] output=${outPath} pass=${metrics.pass.all}`);
}

try {
  main();
} catch (error) {
  console.error(`[regression-metrics] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
