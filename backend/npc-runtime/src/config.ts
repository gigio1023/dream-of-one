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
  schedulerMaxPendingPerBot: number;
  schedulerMaxPendingGlobal: number;
  schedulerSnapshotIntervalMs: number;
  decisionDeadlineMs: number;
  workspaceRootPath: string;
  threadStorePath: string;
  telemetryEnabled: boolean;
  telemetryMaxRecords: number;
  evidenceOutputDir: string;
  mineflayerEnabled: boolean;
  mineflayerHost: string;
  mineflayerPort: number;
  mineflayerUsername: string;
  mineflayerPassword?: string;
  mineflayerAuth: MineflayerAuthMode;
  mineflayerVersion?: string;
  mineflayerLifecycleTimeoutMs: number;
}

export type MineflayerAuthMode = "offline" | "microsoft" | "mojang";

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

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePath(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;
  return value.trim();
}

function parseString(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;
  return value.trim();
}

function parseOptionalString(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  return value.trim();
}

function parseMineflayerAuth(value: string | undefined, fallback: MineflayerAuthMode): MineflayerAuthMode {
  if (!value || !value.trim()) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "offline" || normalized === "microsoft" || normalized === "mojang") {
    return normalized;
  }
  return fallback;
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
    schedulerMaxPendingPerBot: parseNumber(env.NPC_RUNTIME_SCHEDULER_MAX_PENDING_PER_BOT, 8),
    schedulerMaxPendingGlobal: parseNumber(env.NPC_RUNTIME_SCHEDULER_MAX_PENDING_GLOBAL, 128),
    schedulerSnapshotIntervalMs: parseNumber(env.NPC_RUNTIME_SCHEDULER_SNAPSHOT_INTERVAL_MS, 2000),
    decisionDeadlineMs: parseNumber(env.NPC_RUNTIME_DECISION_DEADLINE_MS, 8000),
    workspaceRootPath: parsePath(env.NPC_RUNTIME_WORKSPACE_ROOT, "data/workspaces"),
    threadStorePath: parsePath(env.NPC_RUNTIME_THREAD_STORE_PATH, "data/thread-store.json"),
    telemetryEnabled: parseBoolean(env.NPC_RUNTIME_TELEMETRY_ENABLED, true),
    telemetryMaxRecords: parseNumber(env.NPC_RUNTIME_TELEMETRY_MAX_RECORDS, 4000),
    evidenceOutputDir: parsePath(env.NPC_RUNTIME_EVIDENCE_OUTPUT_DIR, "data/evidence"),
    mineflayerEnabled: parseBoolean(env.NPC_RUNTIME_MINEFLAYER_ENABLED, false),
    mineflayerHost: parseString(env.NPC_RUNTIME_MINEFLAYER_HOST, "127.0.0.1"),
    mineflayerPort: parseNumber(env.NPC_RUNTIME_MINEFLAYER_PORT, 25565),
    mineflayerUsername: parseString(env.NPC_RUNTIME_MINEFLAYER_USERNAME, "npc-runtime-bot"),
    mineflayerPassword: parseOptionalString(env.NPC_RUNTIME_MINEFLAYER_PASSWORD),
    mineflayerAuth: parseMineflayerAuth(env.NPC_RUNTIME_MINEFLAYER_AUTH, "offline"),
    mineflayerVersion: parseOptionalString(env.NPC_RUNTIME_MINEFLAYER_VERSION),
    mineflayerLifecycleTimeoutMs: parseNumber(env.NPC_RUNTIME_MINEFLAYER_LIFECYCLE_TIMEOUT_MS, 15000),
  };
}
