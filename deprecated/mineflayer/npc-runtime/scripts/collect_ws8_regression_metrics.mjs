#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_LOG_DIR = resolve(REPO_ROOT, "logs");

function parseBooleanLiteral(raw, flagName) {
  const normalized = `${raw ?? ""}`.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  throw new Error(`Invalid boolean for ${flagName}: ${raw}`);
}

function consumeOptionalBoolean(argv, index, flagName) {
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) {
    return { value: true, nextIndex: index };
  }
  return {
    value: parseBooleanLiteral(next, flagName),
    nextIndex: index + 1,
  };
}

function requireValue(argv, index, flagName) {
  const next = argv[index + 1];
  if (!next || next.startsWith("--")) {
    throw new Error(`Missing value for ${flagName}`);
  }
  return next;
}

function parseNumber(raw, flagName, fallback) {
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${flagName}: ${raw}`);
  }
  return parsed;
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function asCount(table, key) {
  const bucket = asRecord(table);
  const value = bucket[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(digits));
}

function parseArgs(argv) {
  const args = {
    evidence: resolve(DEFAULT_LOG_DIR, "runtime-evidence-summary-backend.json"),
    out: resolve(DEFAULT_LOG_DIR, "regression-metrics-backend.json"),
    codexPathRatioMin: 0.7,
    cancelledRateMax: 0.35,
    deadlineExceededRateMax: 0.25,
    backpressureRejectedRateMax: 0.15,
    droppedResponseRateMax: 0.15,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--evidence") {
      args.evidence = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--codex-path-ratio-min") {
      args.codexPathRatioMin = parseNumber(requireValue(argv, index, token), token, args.codexPathRatioMin);
      index += 1;
      continue;
    }
    if (token === "--cancelled-rate-max") {
      args.cancelledRateMax = parseNumber(requireValue(argv, index, token), token, args.cancelledRateMax);
      index += 1;
      continue;
    }
    if (token === "--deadline-exceeded-rate-max") {
      args.deadlineExceededRateMax = parseNumber(requireValue(argv, index, token), token, args.deadlineExceededRateMax);
      index += 1;
      continue;
    }
    if (token === "--backpressure-rejected-rate-max") {
      args.backpressureRejectedRateMax = parseNumber(requireValue(argv, index, token), token, args.backpressureRejectedRateMax);
      index += 1;
      continue;
    }
    if (token === "--dropped-response-rate-max") {
      args.droppedResponseRateMax = parseNumber(requireValue(argv, index, token), token, args.droppedResponseRateMax);
      index += 1;
      continue;
    }
    if (token === "--strict") {
      const consumed = consumeOptionalBoolean(argv, index, token);
      args.strict = consumed.value;
      index = consumed.nextIndex;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function readEvidence(path) {
  if (!existsSync(path)) {
    throw new Error(`Evidence summary file was not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function topReasonCodes(reasonCodeCounts, limit = 5) {
  return Object.entries(asRecord(reasonCodeCounts))
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([reasonCode, count]) => ({ reasonCode, count }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidence = readEvidence(args.evidence);

  const counts = asRecord(evidence.counts);
  const transport = asRecord(counts.transport);
  const reasonCode = asRecord(counts.reasonCode);
  const continuity = asRecord(evidence.continuity);
  const fallbackPath = asRecord(evidence.fallbackPath);
  const globalCap = asRecord(evidence.globalCap);

  const totalDecisions = asCount(counts, "totalDecisionResponses") || asCount(counts, "backendEntries");
  const droppedResponses = asCount(counts, "droppedEntries");
  const totalObservedResponses = totalDecisions + droppedResponses;

  const codex = asCount(transport, "codex");
  const codexReply = asCount(transport, "codex-reply");
  const fallback = asCount(transport, "fallback");
  const codexPathCount = codex + codexReply;

  const cancelledCount = asCount(reasonCode, "request_cancelled");
  const deadlineExceededCount = asCount(reasonCode, "decision_deadline_exceeded") + asCount(reasonCode, "codex_timeout");
  const backpressureRejectedCount = asCount(reasonCode, "runtime_actor_queue_saturated") + asCount(reasonCode, "runtime_global_queue_saturated");

  const codexPathRatio = safeRatio(codexPathCount, totalDecisions);
  const fallbackPathRatio = safeRatio(fallback, totalDecisions);
  const cancelledRate = safeRatio(cancelledCount, totalDecisions);
  const deadlineExceededRate = safeRatio(deadlineExceededCount, totalDecisions);
  const backpressureRejectedRate = safeRatio(backpressureRejectedCount, totalDecisions);
  const droppedResponseRate = safeRatio(droppedResponses, totalObservedResponses);

  const pass = {
    evidencePass: evidence.pass === true,
    codexPathRatio: codexPathRatio >= args.codexPathRatioMin,
    threadContinuity: asCount(continuity, "codexMissingThreadId") === 0 && asCount(continuity, "codexReplyMissingThreadId") === 0,
    fallbackPathReasonCode: asCount(fallbackPath, "missingReasonCode") === 0,
    fallbackPathReasonCategory: asCount(fallbackPath, "missingReasonCategory") === 0,
    cancelledRate: cancelledRate <= args.cancelledRateMax,
    deadlineExceededRate: deadlineExceededRate <= args.deadlineExceededRateMax,
    backpressureRejectedRate: backpressureRejectedRate <= args.backpressureRejectedRateMax,
    droppedResponseRate: droppedResponseRate <= args.droppedResponseRateMax,
    globalCapObserved: asCount(globalCap, "samples") > 0 || asCount(globalCap, "max") > 0,
  };

  pass.all = Object.values(pass).every(Boolean);

  const metrics = {
    generatedAt: new Date().toISOString(),
    scope: "mineflayer-backend-only",
    terminology: {
      fallbackPath: "Fallback Path",
      reasonCode: "Reason Code",
      globalCap: "Global Cap",
    },
    source: {
      evidencePath: args.evidence,
    },
    totals: {
      totalDecisions,
      droppedResponses,
      totalObservedResponses,
      codex,
      codexReply,
      fallbackPath: fallback,
    },
    ratios: {
      codexPathRatio: round(codexPathRatio),
      fallbackPathRatio: round(fallbackPathRatio),
      cancelledRate: round(cancelledRate),
      deadlineExceededRate: round(deadlineExceededRate),
      backpressureRejectedRate: round(backpressureRejectedRate),
      droppedResponseRate: round(droppedResponseRate),
    },
    continuity: {
      codexMissingThreadId: asCount(continuity, "codexMissingThreadId"),
      codexReplyMissingThreadId: asCount(continuity, "codexReplyMissingThreadId"),
    },
    fallbackPath: {
      usedCount: asCount(fallbackPath, "usedCount"),
      missingReasonCode: asCount(fallbackPath, "missingReasonCode"),
      missingReasonCategory: asCount(fallbackPath, "missingReasonCategory"),
    },
    reasonCode: {
      counts: reasonCode,
      cancelledCount,
      deadlineExceededCount,
      backpressureRejectedCount,
      top: topReasonCodes(reasonCode),
    },
    globalCap: {
      observed: pass.globalCapObserved,
      samples: asCount(globalCap, "samples"),
      min: asCount(globalCap, "min"),
      max: asCount(globalCap, "max"),
      avg: asCount(globalCap, "avg"),
      maxInFlight: asCount(globalCap, "maxInFlight"),
      maxQueued: asCount(globalCap, "maxQueued"),
      atCapSamples: asCount(globalCap, "atCapSamples"),
      atCapRate: round(asCount(globalCap, "atCapRate")),
    },
    thresholds: {
      codexPathRatioMin: args.codexPathRatioMin,
      cancelledRateMax: args.cancelledRateMax,
      deadlineExceededRateMax: args.deadlineExceededRateMax,
      backpressureRejectedRateMax: args.backpressureRejectedRateMax,
      droppedResponseRateMax: args.droppedResponseRateMax,
      threadContinuityMax: 0,
      fallbackPathReasonCodeMax: 0,
      fallbackPathReasonCategoryMax: 0,
    },
    pass,
  };

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

  const message = `[ws8-regression-metrics] decisions=${metrics.totals.totalDecisions} pass=${metrics.pass.all} output=${args.out}`;
  if (args.strict && !metrics.pass.all) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-regression-metrics] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
