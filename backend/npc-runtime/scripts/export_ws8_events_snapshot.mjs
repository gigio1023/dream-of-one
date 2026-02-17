#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_LOG_DIR = resolve(REPO_ROOT, "logs");
const ALLOWED_EVENTS = new Set(["npc_decision_response", "npc_decision_response_dropped"]);

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

function parseArgs(argv) {
  const args = {
    backendLog: resolve(DEFAULT_LOG_DIR, "npc-runtime.log"),
    out: resolve(REPO_ROOT, "data", "evidence", "ws8", "gate-h", "events.json"),
    limit: 200,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--backend-log") {
      args.backendLog = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--limit") {
      args.limit = parseNumber(requireValue(argv, index, token), token, args.limit);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.backendLog)) {
    throw new Error(`Backend log file was not found: ${args.backendLog}`);
  }

  const lines = readFileSync(args.backendLog, "utf8").split(/\r?\n/);
  const parsedEvents = [];
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

    if (!ALLOWED_EVENTS.has(parsed?.event)) {
      continue;
    }
    parsedEvents.push(parsed);
  }

  const events = parsedEvents.slice(-args.limit);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      backendLog: args.backendLog,
    },
    scope: "mineflayer-backend-only",
    limit: args.limit,
    totalMatched: parsedEvents.length,
    returned: events.length,
    events,
  };

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[ws8-events-snapshot] returned=${events.length} output=${args.out}`);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-events-snapshot] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
