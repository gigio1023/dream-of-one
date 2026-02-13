#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    unityLogs: [],
    backendLogs: [],
    out: "logs/runtime-evidence-summary.json",
    strict: false,
    requireUnityEntries: false,
    requireBackendEntries: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--unity-log") {
      args.unityLogs.push(argv[++i]);
      continue;
    }
    if (token === "--backend-log") {
      args.backendLogs.push(argv[++i]);
      continue;
    }
    if (token === "--out") {
      args.out = argv[++i];
      continue;
    }
    if (token === "--strict") {
      const value = `${argv[++i] ?? ""}`.toLowerCase();
      args.strict = value === "1" || value === "true" || value === "yes";
      continue;
    }
    if (token === "--require-unity-entries") {
      args.requireUnityEntries = true;
      continue;
    }
    if (token === "--require-backend-entries") {
      args.requireBackendEntries = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (args.unityLogs.length === 0) {
    args.unityLogs = ["logs/playmode-smoke.log", "logs/playmode-tests.log"];
  }
  if (args.backendLogs.length === 0) {
    args.backendLogs = ["logs/npc-runtime.log"];
  }
  return args;
}

function readLines(path) {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8").split(/\r?\n/);
}

function parseBool(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isTransport(value) {
  return value === "codex" || value === "codex-reply" || value === "fallback";
}

function pushCount(table, key) {
  table[key] = (table[key] ?? 0) + 1;
}

function parseUnityEvidence(unityLogs, warnings, violations) {
  const entries = [];
  const transportCounts = {};
  const warningTierCounts = {};
  const reasonCategoryCounts = {};
  const regex = /transport=([^;]*);\s*usedFallback=([^;]*);\s*reason=([^;]*);\s*reasonCategory=([^;]*);\s*warningTier=([^;]*);\s*threadId=([^;\n]*)/;

  for (const file of unityLogs) {
    for (const line of readLines(file)) {
      const match = line.match(regex);
      if (!match) {
        continue;
      }

      const transport = (match[1] ?? "").trim();
      const usedFallback = parseBool(match[2]);
      const reason = (match[3] ?? "").trim();
      const reasonCategory = (match[4] ?? "").trim();
      const warningTier = (match[5] ?? "").trim();
      const threadId = (match[6] ?? "").trim();

      entries.push({
        source: "unity",
        file,
        transport,
        usedFallback,
        reason,
        reasonCategory,
        warningTier,
        threadId,
      });

      if (!isTransport(transport)) {
        violations.push(`Unity evidence has unknown transport: ${transport || "<empty>"}`);
      }
      if ((transport === "codex" || transport === "codex-reply") && threadId.length === 0) {
        violations.push(`Unity evidence missing threadId for transport=${transport}`);
      }
      if (usedFallback && reason.length === 0) {
        violations.push("Unity evidence missing reason while usedFallback=true");
      }
      if (warningTier.length === 0) {
        warnings.push("Unity evidence missing warningTier in one or more entries");
      }
      if (reasonCategory.length === 0) {
        warnings.push("Unity evidence missing reasonCategory in one or more entries");
      }

      pushCount(transportCounts, transport || "unknown");
      pushCount(warningTierCounts, warningTier || "unknown");
      pushCount(reasonCategoryCounts, reasonCategory || "unknown");
    }
  }

  return {
    entries,
    transportCounts,
    warningTierCounts,
    reasonCategoryCounts,
  };
}

function parseBackendEvidence(backendLogs, warnings, violations) {
  const entries = [];
  const transportCounts = {};
  const warningTierCounts = {};
  const reasonCategoryCounts = {};
  const reasonCounts = {};

  for (const file of backendLogs) {
    for (const line of readLines(file)) {
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

      if (parsed?.event !== "npc_decision_response") {
        continue;
      }

      const transport = `${parsed.transport ?? ""}`.trim();
      const threadId = `${parsed.threadId ?? ""}`.trim();
      const reason = `${parsed.reason ?? ""}`.trim();
      const reasonCategory = `${parsed.reasonCategory ?? ""}`.trim();
      const warningTier = `${parsed.warningTier ?? ""}`.trim();
      const usedFallback = parseBool(parsed.usedFallback);

      entries.push({
        source: "backend",
        file,
        sessionId: `${parsed.sessionId ?? ""}`.trim(),
        npcId: `${parsed.npcId ?? ""}`.trim(),
        transport,
        threadId,
        reason,
        reasonCategory,
        warningTier,
        usedFallback,
      });

      if (!isTransport(transport)) {
        violations.push(`Backend evidence has unknown transport: ${transport || "<empty>"}`);
      }
      if ((transport === "codex" || transport === "codex-reply") && threadId.length === 0) {
        violations.push(`Backend evidence missing threadId for transport=${transport}`);
      }
      if (usedFallback && reason.length === 0) {
        violations.push("Backend evidence missing reason while usedFallback=true");
      }
      if (warningTier.length === 0) {
        warnings.push("Backend evidence missing warningTier in one or more entries");
      }
      if (reasonCategory.length === 0) {
        warnings.push("Backend evidence missing reasonCategory in one or more entries");
      }

      pushCount(transportCounts, transport || "unknown");
      pushCount(warningTierCounts, warningTier || "unknown");
      pushCount(reasonCategoryCounts, reasonCategory || "unknown");
      pushCount(reasonCounts, reason || "none");
    }
  }

  return {
    entries,
    transportCounts,
    warningTierCounts,
    reasonCategoryCounts,
    reasonCounts,
  };
}

function mergeCounts(...tables) {
  const merged = {};
  for (const table of tables) {
    for (const [key, value] of Object.entries(table)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const warnings = [];
  const violations = [];

  const unity = parseUnityEvidence(args.unityLogs.map(path => resolve(path)), warnings, violations);
  const backend = parseBackendEvidence(args.backendLogs.map(path => resolve(path)), warnings, violations);

  if (args.requireUnityEntries && unity.entries.length === 0) {
    violations.push("No Unity evidence entries were found.");
  }
  if (args.requireBackendEntries && backend.entries.length === 0) {
    violations.push("No backend evidence entries were found.");
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    strict: args.strict,
    input: {
      unityLogs: args.unityLogs.map(path => resolve(path)),
      backendLogs: args.backendLogs.map(path => resolve(path)),
    },
    counts: {
      unityEntries: unity.entries.length,
      backendEntries: backend.entries.length,
      totalEntries: unity.entries.length + backend.entries.length,
      transport: mergeCounts(unity.transportCounts, backend.transportCounts),
      warningTier: mergeCounts(unity.warningTierCounts, backend.warningTierCounts),
      reasonCategory: mergeCounts(unity.reasonCategoryCounts, backend.reasonCategoryCounts),
      reasons: backend.reasonCounts,
    },
    warnings: [...new Set(warnings)],
    violations: [...new Set(violations)],
    pass: violations.length === 0,
  };

  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const message = `[runtime-evidence] entries=${summary.counts.totalEntries} violations=${summary.violations.length} output=${outPath}`;
  if (args.strict && summary.violations.length > 0) {
    console.error(message);
    process.exit(1);
  }

  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[runtime-evidence] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
