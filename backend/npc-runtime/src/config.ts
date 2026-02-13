import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimeConfig {
  host: string;
  port: number;
  codexCommand: string;
  codexArgs: string[];
  codexTimeoutMs: number;
  maxBrokerInFlight: number;
  decisionDeadlineMs: number;
  workspaceRootPath: string;
  threadStorePath: string;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseArgs(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(" ")
    .map(part => part.trim())
    .filter(Boolean);
}

function parsePath(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;
  return value.trim();
}

function resolveDefaultCodexTool(): { command: string; args: string[] } {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const runnerPath = resolve(moduleDir, "..", "scripts", "codex-tool-runner.mjs");
  if (existsSync(runnerPath)) {
    return {
      command: process.execPath,
      args: [runnerPath],
    };
  }

  return {
    command: "codex-tool-runner",
    args: [],
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const defaultTool = resolveDefaultCodexTool();
  const hasCommandOverride = typeof env.CODEX_TOOL_COMMAND === "string" && env.CODEX_TOOL_COMMAND.trim().length > 0;
  const hasArgsOverride = typeof env.CODEX_TOOL_ARGS === "string" && env.CODEX_TOOL_ARGS.trim().length > 0;
  const codexCommand = hasCommandOverride ? env.CODEX_TOOL_COMMAND!.trim() : defaultTool.command;
  const codexArgs = hasArgsOverride
    ? parseArgs(env.CODEX_TOOL_ARGS)
    : (hasCommandOverride ? [] : defaultTool.args);

  return {
    host: env.NPC_RUNTIME_HOST ?? "0.0.0.0",
    port: parseNumber(env.NPC_RUNTIME_PORT, 8787),
    codexCommand,
    codexArgs,
    codexTimeoutMs: parseNumber(env.CODEX_TOOL_TIMEOUT_MS, 20000),
    maxBrokerInFlight: parseNumber(env.NPC_RUNTIME_MAX_BROKER_INFLIGHT, 4),
    decisionDeadlineMs: parseNumber(env.NPC_RUNTIME_DECISION_DEADLINE_MS, 8000),
    workspaceRootPath: parsePath(env.NPC_RUNTIME_WORKSPACE_ROOT, "data/workspaces"),
    threadStorePath: parsePath(env.NPC_RUNTIME_THREAD_STORE_PATH, "data/thread-store.json"),
  };
}
