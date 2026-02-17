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
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
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

function fallbackSignature(parsed) {
  const counts = asRecord(parsed?.counts);
  const reasonCategory = asRecord(counts.reasonCategory);
  const transport = asRecord(counts.transport);
  const socialLoopStage = asRecord(parsed?.decisionSummary?.socialLoopStage);
  const stableString = JSON.stringify({
    reasonCategory: Object.entries(reasonCategory).sort(([a], [b]) => a.localeCompare(b)),
    transport: Object.entries(transport).sort(([a], [b]) => a.localeCompare(b)),
    socialLoopStage: Object.entries(socialLoopStage).sort(([a], [b]) => a.localeCompare(b)),
  });
  return stableString;
}

function parseArgs(argv) {
  const args = {
    evidencePaths: [],
    out: resolve(DEFAULT_LOG_DIR, "ws8", "trajectory-diversity.json"),
    minRuns: 3,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--evidence") {
      args.evidencePaths.push(resolve(requireValue(argv, index, token)));
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--min-runs") {
      args.minRuns = parseNumber(requireValue(argv, index, token), token, args.minRuns);
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

  if (args.evidencePaths.length === 0) {
    throw new Error("At least one --evidence path is required.");
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const warnings = [];
  const runs = [];

  for (const evidencePath of args.evidencePaths) {
    if (!existsSync(evidencePath)) {
      warnings.push(`Evidence file does not exist: ${evidencePath}`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(readFileSync(evidencePath, "utf8"));
    } catch {
      warnings.push(`Evidence file is not valid JSON: ${evidencePath}`);
      continue;
    }

    const trajectorySummary = asRecord(parsed?.trajectorySummary);
    const runSignatureRaw = trajectorySummary.runSignature;
    const runSignature = typeof runSignatureRaw === "string" && runSignatureRaw.trim().length > 0
      ? runSignatureRaw.trim()
      : fallbackSignature(parsed);

    runs.push({
      evidencePath,
      runSignature,
      decisionCycles: Number(trajectorySummary.decisionCycles ?? parsed?.decisionSummary?.total ?? 0),
    });
  }

  const uniqueSignatures = [...new Set(runs.map(run => run.runSignature))];
  const uniqueCount = uniqueSignatures.length;
  const runCount = runs.length;
  const pass = runCount >= args.minRuns && uniqueCount >= args.minRuns;

  const result = {
    generatedAt: new Date().toISOString(),
    scope: "mineflayer-backend-only",
    criterion: "project.md 7.1.3",
    minRuns: args.minRuns,
    totals: {
      runCount,
      uniqueTrajectorySignatures: uniqueCount,
    },
    pass,
    runs,
    warnings,
  };

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const message = `[ws8-trajectory-diversity] runs=${runCount} unique=${uniqueCount} minRuns=${args.minRuns} pass=${pass} output=${args.out}`;
  if (args.strict && !pass) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-trajectory-diversity] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
