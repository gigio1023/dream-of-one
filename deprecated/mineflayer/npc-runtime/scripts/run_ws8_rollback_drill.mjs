#!/usr/bin/env node

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");

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

function isExecutable(path) {
  try {
    const stats = statSync(path);
    return stats.isFile() && (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function timestampToken() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getUTCDate()}`.padStart(2, "0");
  const hh = `${now.getUTCHours()}`.padStart(2, "0");
  const mi = `${now.getUTCMinutes()}`.padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function parseArgs(argv) {
  const defaultStamp = timestampToken();
  const args = {
    operator: process.env.USER ?? "unknown-operator",
    outDir: resolve(REPO_ROOT, "logs", "ws8", "rollback-drill", defaultStamp),
    executeUnityChecks: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--operator") {
      args.operator = requireValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === "--out-dir") {
      args.outDir = resolve(requireValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === "--execute-unity-checks") {
      const consumed = consumeOptionalBoolean(argv, index, token);
      args.executeUnityChecks = consumed.value;
      index = consumed.nextIndex;
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

function runCommand(commandPath) {
  const result = spawnSync(commandPath, [], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return {
    command: commandPath,
    status: typeof result.status === "number" ? result.status : -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? result.error.message : null,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const deprecatedRoot = resolve(REPO_ROOT, "deprecated", "unity", "draem-of-one");
  const unityScriptsRoot = resolve(REPO_ROOT, "deprecated", "unity", "scripts");
  const projectScenePath = resolve(deprecatedRoot, "Assets", "Scenes", "Prototype.unity");
  const diagnosticsScript = resolve(unityScriptsRoot, "run_editor_diagnostics.sh");
  const playmodeSmokeScript = resolve(unityScriptsRoot, "run_playmode_smoke.sh");

  mkdirSync(args.outDir, { recursive: true });

  const pathChecks = [
    { key: "deprecatedUnityRoot", path: deprecatedRoot },
    { key: "unityScriptsRoot", path: unityScriptsRoot },
    { key: "projectScenePath", path: projectScenePath },
    { key: "diagnosticsScript", path: diagnosticsScript },
    { key: "playmodeSmokeScript", path: playmodeSmokeScript },
  ].map(item => ({
    ...item,
    exists: existsSync(item.path),
    executable: item.key.endsWith("Script") ? isExecutable(item.path) : null,
  }));

  const missingChecks = pathChecks
    .filter(item => !item.exists || (item.executable === false))
    .map(item => item.key);

  const commandResults = [];
  if (args.executeUnityChecks && missingChecks.length === 0) {
    commandResults.push(runCommand(diagnosticsScript));
    commandResults.push(runCommand(playmodeSmokeScript));
  }

  for (const [index, commandResult] of commandResults.entries()) {
    const filePath = resolve(args.outDir, `command-${index + 1}.log`);
    const payload = [
      `command=${commandResult.command}`,
      `status=${commandResult.status}`,
      "",
      "[stdout]",
      commandResult.stdout,
      "",
      "[stderr]",
      commandResult.stderr,
      "",
      commandResult.error ? `[error] ${commandResult.error}` : "",
    ].join("\n");
    writeFileSync(filePath, payload, "utf8");
  }

  const failedCommands = commandResults.filter(item => item.status !== 0 || item.error);
  const result = missingChecks.length === 0 && failedCommands.length === 0 ? "pass" : "fail";
  const reasonCodeSummary = [];
  if (missingChecks.length > 0) {
    reasonCodeSummary.push("rollback_path_missing_or_not_executable");
  }
  if (failedCommands.length > 0) {
    reasonCodeSummary.push("rollback_command_execution_failed");
  }
  if (reasonCodeSummary.length === 0) {
    reasonCodeSummary.push("none");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    operator: args.operator,
    mode: args.executeUnityChecks ? "execute" : "check-only",
    result,
    paths: pathChecks,
    commands: {
      requested: [diagnosticsScript, playmodeSmokeScript],
      executed: commandResults.map(item => ({
        command: item.command,
        status: item.status,
        error: item.error,
      })),
    },
    reasonCodeSummary,
  };

  const reportPath = resolve(args.outDir, "rollback-drill-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const summaryPath = resolve(args.outDir, "rollback-drill-summary.md");
  const summaryMarkdown = [
    `# WS8 Rollback Drill`,
    ``,
    `- timestamp: ${report.generatedAt}`,
    `- operator: ${report.operator}`,
    `- mode: ${report.mode}`,
    `- result: ${report.result}`,
    `- reason_code_summary: ${reasonCodeSummary.join(", ")}`,
    `- report_json: ${reportPath}`,
  ].join("\n");
  writeFileSync(summaryPath, `${summaryMarkdown}\n`, "utf8");

  const message = `[ws8-rollback-drill] mode=${report.mode} result=${result} output=${args.outDir}`;
  if (args.strict && result !== "pass") {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

try {
  main();
} catch (error) {
  console.error(`[ws8-rollback-drill] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
