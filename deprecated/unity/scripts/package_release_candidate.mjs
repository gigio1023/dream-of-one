#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    runId: `rc-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    outDir: "logs/rc",
    evidence: "logs/runtime-evidence-summary.json",
    metrics: "logs/regression-metrics.json",
    editorLog: "logs/editor-diagnostics.log",
    playmodeSmokeLog: "logs/playmode-smoke.log",
    playmodeTestsLog: "logs/playmode-tests.log",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--run-id") {
      args.runId = argv[++i];
      continue;
    }
    if (token === "--out-dir") {
      args.outDir = argv[++i];
      continue;
    }
    if (token === "--evidence") {
      args.evidence = argv[++i];
      continue;
    }
    if (token === "--metrics") {
      args.metrics = argv[++i];
      continue;
    }
    if (token === "--editor-log") {
      args.editorLog = argv[++i];
      continue;
    }
    if (token === "--playmode-smoke-log") {
      args.playmodeSmokeLog = argv[++i];
      continue;
    }
    if (token === "--playmode-tests-log") {
      args.playmodeTestsLog = argv[++i];
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function safeReadJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function copyIfExists(sourcePath, targetDir) {
  if (!existsSync(sourcePath)) {
    return null;
  }
  const fileName = basename(sourcePath);
  const targetPath = join(targetDir, fileName);
  copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = resolve(args.outDir, args.runId);
  mkdirSync(targetDir, { recursive: true });

  const copied = {
    evidence: copyIfExists(resolve(args.evidence), targetDir),
    metrics: copyIfExists(resolve(args.metrics), targetDir),
    editorLog: copyIfExists(resolve(args.editorLog), targetDir),
    playmodeSmokeLog: copyIfExists(resolve(args.playmodeSmokeLog), targetDir),
    playmodeTestsLog: copyIfExists(resolve(args.playmodeTestsLog), targetDir),
  };

  const evidence = safeReadJson(resolve(args.evidence));
  const metrics = safeReadJson(resolve(args.metrics));
  const checklist = {
    diagnosticsExecuted: copied.editorLog !== null,
    playmodeSmokeExecuted: copied.playmodeSmokeLog !== null,
    playmodeTestsExecuted: copied.playmodeTestsLog !== null,
    evidenceSummaryPresent: copied.evidence !== null,
    regressionMetricsPresent: copied.metrics !== null,
    evidenceViolationsZero: Array.isArray(evidence?.violations) ? evidence.violations.length === 0 : false,
    regressionPassAll: metrics?.pass?.all === true,
  };

  checklist.ready = checklist.diagnosticsExecuted
    && checklist.playmodeSmokeExecuted
    && checklist.evidenceSummaryPresent
    && checklist.regressionMetricsPresent
    && checklist.evidenceViolationsZero
    && checklist.regressionPassAll;

  const manifest = {
    runId: args.runId,
    generatedAt: new Date().toISOString(),
    outputDir: targetDir,
    copied,
    checklist,
  };

  const manifestPath = join(targetDir, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[rc-package] output=${targetDir} ready=${checklist.ready}`);
}

try {
  main();
} catch (error) {
  console.error(`[rc-package] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
