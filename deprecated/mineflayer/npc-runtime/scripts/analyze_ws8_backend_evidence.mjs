#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_LOG_DIR = resolve(REPO_ROOT, "logs");
const VALID_TRANSPORTS = new Set(["codex", "codex-reply", "fallback"]);
const VALID_WARNING_TIERS = new Set(["blocking", "attention", "reference"]);

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

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function increment(table, key) {
  const normalized = normalizeText(key) || "unknown";
  table[normalized] = (table[normalized] ?? 0) + 1;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function buildSignature(segments) {
  const hash = createHash("sha256");
  for (const segment of segments) {
    hash.update(segment);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function buildTrajectoryStep(parsed) {
  const socialLoopStage = normalizeText(parsed.socialLoopStage) || "ambient";
  const playerSpeechAct = normalizeText(parsed.playerSpeechAct) || "none";
  const actionType = normalizeText(parsed.actionType) || normalizeText(parsed.command) || "none";
  const actionOk = parsed.actionOk === true ? "ok" : parsed.actionOk === false ? "fail" : "none";
  const reasonCategory = normalizeText(parsed.reasonCategory) || "unknown";
  const fallbackMode = parsed.usedFallback === true ? "fallback" : "primary";
  const transport = normalizeText(parsed.transport) || "unknown";
  return `${socialLoopStage}|${playerSpeechAct}|${actionType}|${actionOk}|${reasonCategory}|${fallbackMode}|${transport}`;
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

function percentile(values, percentileRank) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((percentileRank / 100) * sorted.length) - 1));
  return sorted[index];
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readLogLines(filePath, warnings) {
  if (!existsSync(filePath)) {
    warnings.push(`Backend log file was not found: ${filePath}`);
    return [];
  }
  return readFileSync(filePath, "utf8").split(/\r?\n/);
}

function parseBackendLogs(logPaths, warnings, violations) {
  const transportCounts = {};
  const warningTierCounts = {};
  const reasonCategoryCounts = {};
  const reasonCodeCounts = {};
  const droppedReasonCounts = {};
  const latencies = [];
  const globalCapValues = [];
  let totalDecisions = 0;
  let droppedEntries = 0;
  let fallbackUsedCount = 0;
  let fallbackMissingReasonCode = 0;
  let fallbackMissingReasonCategory = 0;
  let codexMissingThreadId = 0;
  let codexReplyMissingThreadId = 0;
  let atCapSamples = 0;
  let maxGlobalInFlight = 0;
  let maxGlobalQueued = 0;
  let maxGlobalCap = 0;
  const trajectoryByActor = new Map();

  for (const logPath of logPaths) {
    const lines = readLogLines(logPath, warnings);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (parsed?.event === "npc_decision_response_dropped") {
        droppedEntries += 1;
        increment(droppedReasonCounts, normalizeText(parsed.droppedReason) || "unknown");
        continue;
      }

      if (parsed?.event !== "npc_decision_response") {
        continue;
      }

      totalDecisions += 1;

      const transport = normalizeText(parsed.transport);
      const threadId = normalizeText(parsed.threadId);
      const reasonCode = normalizeText(parsed.reason);
      const reasonCategory = normalizeText(parsed.reasonCategory);
      const warningTier = normalizeText(parsed.warningTier);
      const usedFallback = parsed.usedFallback === true;

      increment(transportCounts, transport || "unknown");
      increment(warningTierCounts, warningTier || "unknown");
      increment(reasonCategoryCounts, reasonCategory || "unknown");
      increment(reasonCodeCounts, reasonCode || "none");

      if (!VALID_TRANSPORTS.has(transport)) {
        violations.push(`Unknown transport in backend evidence: ${transport || "<empty>"}`);
      }

      if (transport === "codex" && threadId.length === 0) {
        codexMissingThreadId += 1;
        violations.push("Backend evidence is missing threadId for transport=codex.");
      }

      if (transport === "codex-reply" && threadId.length === 0) {
        codexReplyMissingThreadId += 1;
        violations.push("Backend evidence is missing threadId for transport=codex-reply.");
      }

      if (!VALID_WARNING_TIERS.has(warningTier)) {
        warnings.push(`Unknown warningTier in backend evidence: ${warningTier || "<empty>"}`);
      }

      if (usedFallback) {
        fallbackUsedCount += 1;
        if (reasonCode.length === 0) {
          fallbackMissingReasonCode += 1;
          violations.push("Fallback Path entry is missing Reason Code.");
        }
        if (reasonCategory.length === 0) {
          fallbackMissingReasonCategory += 1;
          violations.push("Fallback Path entry is missing Reason Category.");
        }
      }

      const sessionId = normalizeText(parsed.sessionId) || "unknown-session";
      const npcId = normalizeText(parsed.npcId) || "unknown-npc";
      const actorKey = `${sessionId}\u001f${npcId}`;
      const step = buildTrajectoryStep(parsed);
      const steps = trajectoryByActor.get(actorKey);
      if (steps) {
        steps.push(step);
      } else {
        trajectoryByActor.set(actorKey, [step]);
      }

      const latencyMs = asFiniteNumber(parsed.latencyMs);
      if (latencyMs !== null && latencyMs >= 0) {
        latencies.push(latencyMs);
      }

      const mailbox = asRecord(parsed.mailbox);
      const globalCap = asFiniteNumber(mailbox.globalCap);
      const globalInFlight = asFiniteNumber(mailbox.globalInFlight);
      const globalQueued = asFiniteNumber(mailbox.globalQueued);

      if (globalCap !== null && globalCap >= 0) {
        globalCapValues.push(globalCap);
        maxGlobalCap = Math.max(maxGlobalCap, globalCap);
      }
      if (globalInFlight !== null && globalInFlight >= 0) {
        maxGlobalInFlight = Math.max(maxGlobalInFlight, globalInFlight);
      }
      if (globalQueued !== null && globalQueued >= 0) {
        maxGlobalQueued = Math.max(maxGlobalQueued, globalQueued);
      }
      if (
        globalCap !== null
        && globalCap > 0
        && globalInFlight !== null
        && globalInFlight >= globalCap
      ) {
        atCapSamples += 1;
      }
    }
  }

  return {
    totalDecisions,
    droppedEntries,
    fallbackUsedCount,
    fallbackMissingReasonCode,
    fallbackMissingReasonCategory,
    codexMissingThreadId,
    codexReplyMissingThreadId,
    transportCounts,
    warningTierCounts,
    reasonCategoryCounts,
    reasonCodeCounts,
    droppedReasonCounts,
    latencies,
    globalCapValues,
    atCapSamples,
    maxGlobalInFlight,
    maxGlobalQueued,
    maxGlobalCap,
    trajectoryByActor,
  };
}

function parseTelemetryPacks(packPaths, warnings) {
  const reasonCategoryCounts = {};
  let packCount = 0;
  let recordsTotal = 0;
  let decisionTotal = 0;
  let fallbackCount = 0;
  let schedulerSnapshots = 0;
  let maxGlobalCap = 0;

  for (const packPath of packPaths) {
    if (!existsSync(packPath)) {
      warnings.push(`Telemetry Evidence Pack file was not found: ${packPath}`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(readFileSync(packPath, "utf8"));
    } catch {
      warnings.push(`Telemetry Evidence Pack is not valid JSON: ${packPath}`);
      continue;
    }

    packCount += 1;
    const totalRecords = asFiniteNumber(parsed?.totalRecords) ?? 0;
    recordsTotal += totalRecords;

    const decisionSummary = asRecord(parsed?.decisionSummary);
    const schedulerSummary = asRecord(parsed?.schedulerSummary);
    decisionTotal += asFiniteNumber(decisionSummary.total) ?? 0;
    fallbackCount += asFiniteNumber(decisionSummary.fallbackCount) ?? 0;
    schedulerSnapshots += asFiniteNumber(schedulerSummary.snapshots) ?? 0;
    maxGlobalCap = Math.max(maxGlobalCap, asFiniteNumber(schedulerSummary.maxGlobalCap) ?? 0);

    const reasonCategory = asRecord(decisionSummary.reasonCategory);
    for (const [key, value] of Object.entries(reasonCategory)) {
      const numeric = asFiniteNumber(value);
      if (numeric === null) {
        continue;
      }
      reasonCategoryCounts[key] = (reasonCategoryCounts[key] ?? 0) + numeric;
    }
  }

  return {
    packCount,
    recordsTotal,
    decisionTotal,
    fallbackCount,
    schedulerSnapshots,
    maxGlobalCap,
    reasonCategoryCounts,
  };
}

function parseArgs(argv) {
  const args = {
    backendLogs: [resolve(DEFAULT_LOG_DIR, "npc-runtime.log")],
    telemetryPacks: [],
    out: resolve(DEFAULT_LOG_DIR, "runtime-evidence-summary-backend.json"),
    strict: false,
    requireBackendEntries: false,
  };

  let backendLogsOverridden = false;
  let telemetryPacksOverridden = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--backend-log") {
      const rawPath = requireValue(argv, index, token);
      if (!backendLogsOverridden) {
        args.backendLogs = [];
        backendLogsOverridden = true;
      }
      args.backendLogs.push(resolve(rawPath));
      index += 1;
      continue;
    }
    if (token === "--telemetry-pack") {
      const rawPath = requireValue(argv, index, token);
      if (!telemetryPacksOverridden) {
        args.telemetryPacks = [];
        telemetryPacksOverridden = true;
      }
      args.telemetryPacks.push(resolve(rawPath));
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--strict") {
      const consumed = consumeOptionalBoolean(argv, index, token);
      args.strict = consumed.value;
      index = consumed.nextIndex;
      continue;
    }
    if (token === "--require-backend-entries") {
      args.requireBackendEntries = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const warnings = [];
  const violations = [];

  const backend = parseBackendLogs(args.backendLogs, warnings, violations);
  const telemetry = parseTelemetryPacks(args.telemetryPacks, warnings);

  if (args.requireBackendEntries && backend.totalDecisions === 0) {
    violations.push("No backend decision evidence entries were found.");
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scope: "mineflayer-backend-only",
    strict: args.strict,
    terminology: {
      fallbackPath: "Fallback Path",
      reasonCode: "Reason Code",
      globalCap: "Global Cap",
    },
    input: {
      backendLogs: args.backendLogs,
      telemetryPacks: args.telemetryPacks,
    },
    counts: {
      backendEntries: backend.totalDecisions,
      droppedEntries: backend.droppedEntries,
      totalDecisionResponses: backend.totalDecisions,
      transport: backend.transportCounts,
      warningTier: backend.warningTierCounts,
      reasonCategory: backend.reasonCategoryCounts,
      reasonCode: backend.reasonCodeCounts,
      droppedReason: backend.droppedReasonCounts,
    },
    fallbackPath: {
      usedCount: backend.fallbackUsedCount,
      ratio: round(safeRatio(backend.fallbackUsedCount, backend.totalDecisions)),
      missingReasonCode: backend.fallbackMissingReasonCode,
      missingReasonCategory: backend.fallbackMissingReasonCategory,
    },
    continuity: {
      codexMissingThreadId: backend.codexMissingThreadId,
      codexReplyMissingThreadId: backend.codexReplyMissingThreadId,
    },
    trajectorySummary: (() => {
      const actorSignatures = Array.from(backend.trajectoryByActor.entries())
        .map(([actorKey, steps]) => {
          const [sessionId, npcId] = actorKey.split("\u001f", 2);
          return {
            sessionId,
            npcId,
            decisions: steps.length,
            signature: buildSignature(steps),
          };
        })
        .sort((left, right) => {
          if (left.sessionId !== right.sessionId) {
            return left.sessionId.localeCompare(right.sessionId);
          }
          return left.npcId.localeCompare(right.npcId);
        });
      const runSignature = buildSignature(
        actorSignatures.map(item => `${item.sessionId}|${item.npcId}|${item.decisions}|${item.signature}`),
      );
      return {
        decisionCycles: backend.totalDecisions,
        runSignature,
        actorSignatures,
      };
    })(),
    latencyMs: {
      samples: backend.latencies.length,
      mean: round(mean(backend.latencies), 3),
      p95: round(percentile(backend.latencies, 95), 3),
      max: round(Math.max(...backend.latencies, 0), 3),
    },
    globalCap: {
      samples: backend.globalCapValues.length,
      min: round(backend.globalCapValues.length > 0 ? Math.min(...backend.globalCapValues) : 0, 3),
      max: round(backend.globalCapValues.length > 0 ? Math.max(...backend.globalCapValues) : 0, 3),
      avg: round(mean(backend.globalCapValues), 3),
      maxInFlight: round(backend.maxGlobalInFlight, 3),
      maxQueued: round(backend.maxGlobalQueued, 3),
      atCapSamples: backend.atCapSamples,
      atCapRate: round(safeRatio(backend.atCapSamples, backend.totalDecisions)),
      telemetryMaxGlobalCap: round(Math.max(backend.maxGlobalCap, telemetry.maxGlobalCap), 3),
    },
    telemetryEvidencePack: {
      packCount: telemetry.packCount,
      recordsTotal: telemetry.recordsTotal,
      decisionTotal: telemetry.decisionTotal,
      fallbackCount: telemetry.fallbackCount,
      schedulerSnapshots: telemetry.schedulerSnapshots,
      maxGlobalCap: telemetry.maxGlobalCap,
      reasonCategory: telemetry.reasonCategoryCounts,
    },
    warnings: uniqueStrings(warnings),
    violations: uniqueStrings(violations),
  };

  summary.pass = summary.violations.length === 0;

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const message = `[ws8-backend-evidence] decisions=${summary.counts.totalDecisionResponses} dropped=${summary.counts.droppedEntries} violations=${summary.violations.length} output=${args.out}`;
  if (args.strict && !summary.pass) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-backend-evidence] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
