#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_LOG_DIR = resolve(REPO_ROOT, "logs");
const DISALLOWED_INPUT_PATTERN = /(unity|playmode|editor-diagnostics)/i;

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

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function sha256ForFile(filePath) {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function uniqueCopyTarget(targetDir, fileName) {
  const extension = extname(fileName);
  const baseName = extension.length > 0 ? fileName.slice(0, -extension.length) : fileName;
  let candidate = join(targetDir, fileName);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = join(targetDir, `${baseName}-${suffix}${extension}`);
    suffix += 1;
  }
  return candidate;
}

function copyArtifact(sourcePath, targetDir, type, warnings) {
  if (!existsSync(sourcePath)) {
    warnings.push(`Missing artifact for ${type}: ${sourcePath}`);
    return null;
  }

  const targetPath = uniqueCopyTarget(targetDir, basename(sourcePath));
  copyFileSync(sourcePath, targetPath);
  const copiedStat = statSync(targetPath);

  return {
    type,
    sourcePath,
    copiedPath: targetPath,
    bytes: copiedStat.size,
    sha256: sha256ForFile(targetPath),
  };
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = {
    runId: `rc-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    outDir: resolve(DEFAULT_LOG_DIR, "rc"),
    evidence: resolve(DEFAULT_LOG_DIR, "runtime-evidence-summary-backend.json"),
    metrics: resolve(DEFAULT_LOG_DIR, "regression-metrics-backend.json"),
    backendLogs: [resolve(DEFAULT_LOG_DIR, "npc-runtime.log")],
    telemetryPacks: [],
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
    if (token === "--evidence") {
      args.evidence = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--metrics") {
      args.metrics = resolve(requireValue(argv, index, token));
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
  const targetDir = resolve(args.outDir, args.runId);
  mkdirSync(targetDir, { recursive: true });

  const warnings = [];
  const evidenceMeta = copyArtifact(args.evidence, targetDir, "runtime-evidence-summary", warnings);
  const metricsMeta = copyArtifact(args.metrics, targetDir, "regression-metrics", warnings);
  const backendLogMeta = args.backendLogs
    .map(logPath => copyArtifact(logPath, targetDir, "backend-log", warnings))
    .filter(Boolean);
  const telemetryPackMeta = args.telemetryPacks
    .map(packPath => copyArtifact(packPath, targetDir, "telemetry-evidence-pack", warnings))
    .filter(Boolean);

  const evidence = readJsonIfExists(args.evidence);
  const metrics = readJsonIfExists(args.metrics);
  const pass = asRecord(metrics?.pass);
  const ratios = asRecord(metrics?.ratios);

  const inputPaths = [args.evidence, args.metrics, ...args.backendLogs, ...args.telemetryPacks];
  const unityInputDetected = inputPaths.some(path => DISALLOWED_INPUT_PATTERN.test(path));

  const checklist = {
    evidenceSummaryPresent: evidenceMeta !== null,
    regressionMetricsPresent: metricsMeta !== null,
    backendLogsPresent: backendLogMeta.length > 0,
    evidenceScopeMineflayerBackendOnly: evidence?.scope === "mineflayer-backend-only",
    metricsScopeMineflayerBackendOnly: metrics?.scope === "mineflayer-backend-only",
    unityInputDetected,
    evidencePass: evidence?.pass === true,
    regressionPassAll: pass.all === true,
    fallbackPathReasonCode: pass.fallbackPathReasonCode === true,
    globalCapObserved: pass.globalCapObserved === true,
  };

  checklist.ready = checklist.evidenceSummaryPresent
    && checklist.regressionMetricsPresent
    && checklist.backendLogsPresent
    && checklist.evidenceScopeMineflayerBackendOnly
    && checklist.metricsScopeMineflayerBackendOnly
    && !checklist.unityInputDetected
    && checklist.evidencePass
    && checklist.regressionPassAll
    && checklist.fallbackPathReasonCode
    && checklist.globalCapObserved;

  const manifest = {
    runId: args.runId,
    generatedAt: new Date().toISOString(),
    outputDir: targetDir,
    scope: "mineflayer-backend-only",
    terminology: {
      fallbackPath: "Fallback Path",
      reasonCode: "Reason Code",
      globalCap: "Global Cap",
    },
    releaseGate: "WS8",
    provenance: {
      mode: "mineflayer-backend-only",
      disallowedInputPattern: DISALLOWED_INPUT_PATTERN.source,
      unityInputDetected,
      sourceArtifacts: uniqueStrings(inputPaths),
      copiedArtifacts: [...backendLogMeta, ...telemetryPackMeta, evidenceMeta, metricsMeta].filter(Boolean),
      includesOnlyBackendAndMineflayerInputs: !unityInputDetected,
    },
    copied: {
      evidence: evidenceMeta,
      metrics: metricsMeta,
      backendLogs: backendLogMeta,
      telemetryPacks: telemetryPackMeta,
    },
    summary: {
      codexPathRatio: typeof ratios.codexPathRatio === "number" ? ratios.codexPathRatio : null,
      fallbackPathRatio: typeof ratios.fallbackPathRatio === "number" ? ratios.fallbackPathRatio : null,
      droppedResponseRate: typeof ratios.droppedResponseRate === "number" ? ratios.droppedResponseRate : null,
    },
    checklist,
    warnings: uniqueStrings(warnings),
  };

  const manifestPath = join(targetDir, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const message = `[ws8-rc-package] output=${targetDir} ready=${checklist.ready}`;
  if (args.strict && !checklist.ready) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-rc-package] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
