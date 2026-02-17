#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_LOG_DIR = resolve(REPO_ROOT, "logs");

const ANALYZE_SCRIPT = resolve(SCRIPT_DIR, "analyze_ws8_backend_evidence.mjs");
const METRICS_SCRIPT = resolve(SCRIPT_DIR, "collect_ws8_regression_metrics.mjs");
const PACKAGE_SCRIPT = resolve(SCRIPT_DIR, "package_ws8_rc_artifacts.mjs");

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

function parseNumber(raw, flagName) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${flagName}: ${raw}`);
  }
  return parsed;
}

function runNodeStep(stepName, scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`${stepName} failed to execute: ${result.error.message}`);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`${stepName} exited with status ${result.status}`);
  }
}

function parseArgs(argv) {
  const args = {
    runId: `rc-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    outDir: resolve(DEFAULT_LOG_DIR, "rc"),
    evidenceOut: resolve(DEFAULT_LOG_DIR, "runtime-evidence-summary-backend.json"),
    metricsOut: resolve(DEFAULT_LOG_DIR, "regression-metrics-backend.json"),
    backendLogs: [resolve(DEFAULT_LOG_DIR, "npc-runtime.log")],
    telemetryPacks: [],
    codexPathRatioMin: 0.7,
    cancelledRateMax: 0.35,
    deadlineExceededRateMax: 0.25,
    backpressureRejectedRateMax: 0.15,
    droppedResponseRateMax: 0.15,
    strict: false,
  };

  let backendLogsOverridden = false;
  let telemetryPacksOverridden = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--run-id") {
      args.runId = requireValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === "--out-dir") {
      args.outDir = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--evidence-out") {
      args.evidenceOut = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--metrics-out") {
      args.metricsOut = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--backend-log") {
      const path = resolve(requireValue(argv, index, token));
      if (!backendLogsOverridden) {
        args.backendLogs = [];
        backendLogsOverridden = true;
      }
      args.backendLogs.push(path);
      index += 1;
      continue;
    }
    if (token === "--telemetry-pack") {
      const path = resolve(requireValue(argv, index, token));
      if (!telemetryPacksOverridden) {
        args.telemetryPacks = [];
        telemetryPacksOverridden = true;
      }
      args.telemetryPacks.push(path);
      index += 1;
      continue;
    }
    if (token === "--codex-path-ratio-min") {
      args.codexPathRatioMin = parseNumber(requireValue(argv, index, token), token);
      index += 1;
      continue;
    }
    if (token === "--cancelled-rate-max") {
      args.cancelledRateMax = parseNumber(requireValue(argv, index, token), token);
      index += 1;
      continue;
    }
    if (token === "--deadline-exceeded-rate-max") {
      args.deadlineExceededRateMax = parseNumber(requireValue(argv, index, token), token);
      index += 1;
      continue;
    }
    if (token === "--backpressure-rejected-rate-max") {
      args.backpressureRejectedRateMax = parseNumber(requireValue(argv, index, token), token);
      index += 1;
      continue;
    }
    if (token === "--dropped-response-rate-max") {
      args.droppedResponseRateMax = parseNumber(requireValue(argv, index, token), token);
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

function main() {
  const args = parseArgs(process.argv.slice(2));

  const analyzeArgs = [
    "--out", args.evidenceOut,
    "--require-backend-entries",
  ];
  for (const backendLog of args.backendLogs) {
    analyzeArgs.push("--backend-log", backendLog);
  }
  for (const telemetryPack of args.telemetryPacks) {
    analyzeArgs.push("--telemetry-pack", telemetryPack);
  }
  if (args.strict) {
    analyzeArgs.push("--strict");
  }

  const metricsArgs = [
    "--evidence", args.evidenceOut,
    "--out", args.metricsOut,
    "--codex-path-ratio-min", String(args.codexPathRatioMin),
    "--cancelled-rate-max", String(args.cancelledRateMax),
    "--deadline-exceeded-rate-max", String(args.deadlineExceededRateMax),
    "--backpressure-rejected-rate-max", String(args.backpressureRejectedRateMax),
    "--dropped-response-rate-max", String(args.droppedResponseRateMax),
  ];
  if (args.strict) {
    metricsArgs.push("--strict");
  }

  const packageArgs = [
    "--run-id", args.runId,
    "--out-dir", args.outDir,
    "--evidence", args.evidenceOut,
    "--metrics", args.metricsOut,
  ];
  for (const backendLog of args.backendLogs) {
    packageArgs.push("--backend-log", backendLog);
  }
  for (const telemetryPack of args.telemetryPacks) {
    packageArgs.push("--telemetry-pack", telemetryPack);
  }
  if (args.strict) {
    packageArgs.push("--strict");
  }

  runNodeStep("evidence analysis", ANALYZE_SCRIPT, analyzeArgs);
  runNodeStep("regression metrics", METRICS_SCRIPT, metricsArgs);
  runNodeStep("rc packaging", PACKAGE_SCRIPT, packageArgs);

  const manifestPath = resolve(args.outDir, args.runId, "manifest.json");
  let ready = null;
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      ready = manifest?.checklist?.ready === true;
    } catch {
      ready = null;
    }
  }

  console.log(`[ws8-release-gate] runId=${args.runId} manifest=${manifestPath} ready=${ready === null ? "unknown" : String(ready)}`);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-release-gate] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
