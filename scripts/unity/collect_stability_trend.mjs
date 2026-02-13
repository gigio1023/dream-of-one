#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    out: "logs/stability-trend.json",
    minRuns: 3,
    codexRatioMin: 0.7,
    cancelledRateMax: 0.35,
    deadlineExceededRateMax: 0.25,
    runs: [],
  };

  let currentRun = null;
  const ensureRun = () => {
    if (!currentRun) {
      throw new Error("run scope is missing. Start with --run <label> before per-run options.");
    }
  };
  const flushRun = () => {
    if (!currentRun) return;
    args.runs.push(currentRun);
    currentRun = null;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--run") {
      flushRun();
      currentRun = {
        label: argv[++i],
      };
      continue;
    }
    if (token === "--metrics") {
      ensureRun();
      currentRun.metricsPath = argv[++i];
      continue;
    }
    if (token === "--evidence") {
      ensureRun();
      currentRun.evidencePath = argv[++i];
      continue;
    }
    if (token === "--backend-log") {
      ensureRun();
      currentRun.backendLogPath = argv[++i];
      continue;
    }
    if (token === "--out") {
      args.out = argv[++i];
      continue;
    }
    if (token === "--min-runs") {
      args.minRuns = Number(argv[++i]);
      continue;
    }
    if (token === "--codex-ratio-min") {
      args.codexRatioMin = Number(argv[++i]);
      continue;
    }
    if (token === "--cancelled-rate-max") {
      args.cancelledRateMax = Number(argv[++i]);
      continue;
    }
    if (token === "--deadline-exceeded-rate-max") {
      args.deadlineExceededRateMax = Number(argv[++i]);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  flushRun();

  if (!Number.isFinite(args.minRuns) || args.minRuns < 1) {
    throw new Error("--min-runs must be >= 1");
  }
  if (args.runs.length === 0) {
    throw new Error("At least one run is required. Use --run <label> ...");
  }

  return args;
}

function safeReadJson(path, fallback = null) {
  if (!path || !existsSync(path)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function pushCount(table, key) {
  table[key] = (table[key] ?? 0) + 1;
}

function parseBackendLog(path) {
  const rows = [];
  const droppedRows = [];
  if (!path || !existsSync(path)) {
    return { rows, droppedRows };
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.event === "npc_decision_response") {
        rows.push(parsed);
      } else if (parsed?.event === "npc_decision_response_dropped") {
        droppedRows.push(parsed);
      }
    } catch {
      // ignore malformed rows
    }
  }
  return { rows, droppedRows };
}

function asRatio(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return value / total;
}

function fixed(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
}

function loadRun(run, thresholds) {
  const metrics = safeReadJson(run.metricsPath, {});
  const evidence = safeReadJson(run.evidencePath, {});
  const { rows, droppedRows } = parseBackendLog(run.backendLogPath);

  const transport = { codex: 0, codexReply: 0, fallback: 0 };
  const fallbackReasons = {};
  const reasonCategory = {};
  const warningTier = {};
  const mailboxMax = {
    skippedBeforeBroker: 0,
    cancelled: 0,
    deadlineExceeded: 0,
    globalQueued: 0,
  };

  for (const row of rows) {
    const transportName = `${row.transport ?? ""}`.trim();
    if (transportName === "codex") transport.codex += 1;
    if (transportName === "codex-reply") transport.codexReply += 1;
    if (transportName === "fallback") transport.fallback += 1;

    const usedFallback = row.usedFallback === true;
    const reason = `${row.reason ?? ""}`.trim() || "none";
    const reasonCat = `${row.reasonCategory ?? ""}`.trim() || "unknown";
    const warning = `${row.warningTier ?? ""}`.trim() || "unknown";

    pushCount(reasonCategory, reasonCat);
    pushCount(warningTier, warning);
    if (usedFallback || transportName === "fallback") {
      pushCount(fallbackReasons, reason);
    }

    const mailbox = row.mailbox;
    if (mailbox && typeof mailbox === "object") {
      mailboxMax.skippedBeforeBroker = Math.max(mailboxMax.skippedBeforeBroker, Number(mailbox.skippedBeforeBroker ?? 0));
      mailboxMax.cancelled = Math.max(mailboxMax.cancelled, Number(mailbox.cancelled ?? 0));
      mailboxMax.deadlineExceeded = Math.max(mailboxMax.deadlineExceeded, Number(mailbox.deadlineExceeded ?? 0));
      mailboxMax.globalQueued = Math.max(mailboxMax.globalQueued, Number(mailbox.globalQueued ?? 0));
    }
  }

  const totalDecisions = transport.codex + transport.codexReply + transport.fallback;
  const codexPathRatio = asRatio(transport.codex + transport.codexReply, totalDecisions);
  const fallbackRatio = asRatio(transport.fallback, totalDecisions);
  const cancelledRate = asRatio(mailboxMax.cancelled, totalDecisions);
  const deadlineExceededRate = asRatio(mailboxMax.deadlineExceeded, totalDecisions);

  const checks = {
    hasDecisions: totalDecisions > 0,
    codexPathRatio: codexPathRatio >= thresholds.codexRatioMin,
    cancelledRate: cancelledRate <= thresholds.cancelledRateMax,
    deadlineExceededRate: deadlineExceededRate <= thresholds.deadlineExceededRateMax,
  };
  checks.all = checks.hasDecisions && checks.codexPathRatio && checks.cancelledRate && checks.deadlineExceededRate;

  return {
    label: run.label,
    sources: {
      metricsPath: run.metricsPath ? resolve(run.metricsPath) : null,
      evidencePath: run.evidencePath ? resolve(run.evidencePath) : null,
      backendLogPath: run.backendLogPath ? resolve(run.backendLogPath) : null,
    },
    totals: {
      totalDecisions,
      transport,
      droppedResponses: droppedRows.length,
    },
    ratios: {
      codexPathRatio: fixed(codexPathRatio),
      fallbackRatio: fixed(fallbackRatio),
      cancelledRate: fixed(cancelledRate),
      deadlineExceededRate: fixed(deadlineExceededRate),
    },
    fallbackReasons,
    reasonCategory,
    warningTier,
    mailboxMax,
    evidenceSnapshot: {
      totalEntries: Number(evidence?.counts?.totalEntries ?? 0),
      unityEntries: Number(evidence?.counts?.unityEntries ?? 0),
      backendEntries: Number(evidence?.counts?.backendEntries ?? 0),
      violations: Array.isArray(evidence?.violations) ? evidence.violations.length : 0,
    },
    regressionSnapshot: {
      passAll: metrics?.pass?.all === true,
      codexPathRatio: Number(metrics?.ratios?.codexPathRatio ?? 0),
      fallbackRatio: Number(metrics?.ratios?.fallbackRatio ?? 0),
    },
    checks,
  };
}

function mergeReasonDistribution(runs) {
  const merged = {};
  for (const run of runs) {
    const table = run.fallbackReasons ?? {};
    for (const [reason, count] of Object.entries(table)) {
      merged[reason] = (merged[reason] ?? 0) + Number(count);
    }
  }
  return merged;
}

function summarizeRatios(runs, field) {
  const values = runs.map(run => Number(run?.ratios?.[field] ?? 0));
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0 };
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    min: fixed(Math.min(...values)),
    max: fixed(Math.max(...values)),
    avg: fixed(sum / values.length),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const thresholds = {
    codexRatioMin: args.codexRatioMin,
    cancelledRateMax: args.cancelledRateMax,
    deadlineExceededRateMax: args.deadlineExceededRateMax,
  };

  const runs = args.runs.map(run => loadRun(run, thresholds));
  const mergedReasons = mergeReasonDistribution(runs);
  const runCount = runs.length;
  const runCountPass = runCount >= args.minRuns;
  const runChecksPass = runs.every(run => run.checks.all);

  const summary = {
    generatedAt: new Date().toISOString(),
    thresholds: {
      minRuns: args.minRuns,
      ...thresholds,
    },
    totals: {
      runCount,
      totalDecisions: runs.reduce((acc, run) => acc + run.totals.totalDecisions, 0),
      droppedResponses: runs.reduce((acc, run) => acc + run.totals.droppedResponses, 0),
    },
    ratios: {
      codexPathRatio: summarizeRatios(runs, "codexPathRatio"),
      fallbackRatio: summarizeRatios(runs, "fallbackRatio"),
      cancelledRate: summarizeRatios(runs, "cancelledRate"),
      deadlineExceededRate: summarizeRatios(runs, "deadlineExceededRate"),
    },
    mailboxMaxAcrossRuns: {
      skippedBeforeBroker: Math.max(...runs.map(run => run.mailboxMax.skippedBeforeBroker), 0),
      cancelled: Math.max(...runs.map(run => run.mailboxMax.cancelled), 0),
      deadlineExceeded: Math.max(...runs.map(run => run.mailboxMax.deadlineExceeded), 0),
      globalQueued: Math.max(...runs.map(run => run.mailboxMax.globalQueued), 0),
    },
    fallbackReasonDistribution: mergedReasons,
    pass: {
      runCount: runCountPass,
      runChecks: runChecksPass,
      all: runCountPass && runChecksPass,
    },
  };

  const output = {
    generatedAt: new Date().toISOString(),
    summary,
    runs,
  };

  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`[stability-trend] output=${outPath} runs=${runCount} pass=${summary.pass.all}`);
}

try {
  main();
} catch (error) {
  console.error(`[stability-trend] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
