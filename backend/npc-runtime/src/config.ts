import {
  DEFAULT_RELIABILITY_THRESHOLDS,
  type ReliabilityThresholds,
} from "./runtime/reliability-threshold-gate.js";

export interface RuntimeConfig {
  host: string;
  port: number;
  codexCommand: string;
  codexArgs: string[];
  codexTimeoutMs: number;
  codexGlobalBudgetMs: number;
  promptCharBudget: number;
  threadStorePath: string;
  reliabilityThresholds: ReliabilityThresholds;
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

function parseRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    host: env.NPC_RUNTIME_HOST ?? "0.0.0.0",
    port: parseNumber(env.NPC_RUNTIME_PORT, 8787),
    codexCommand: env.CODEX_TOOL_COMMAND ?? "codex-tool-runner",
    codexArgs: parseArgs(env.CODEX_TOOL_ARGS),
    codexTimeoutMs: parseNumber(env.CODEX_TOOL_TIMEOUT_MS, 8000),
    codexGlobalBudgetMs: parseNumber(env.CODEX_GLOBAL_BUDGET_MS, 16000),
    promptCharBudget: parseNumber(env.NPC_RUNTIME_PROMPT_CHAR_BUDGET, 3600),
    threadStorePath: parsePath(env.NPC_RUNTIME_THREAD_STORE_PATH, "data/thread-store.json"),
    reliabilityThresholds: {
      minimumDecisions: parseInteger(
        env.NPC_RUNTIME_RELIABILITY_MIN_DECISIONS,
        DEFAULT_RELIABILITY_THRESHOLDS.minimumDecisions,
      ),
      fallbackRateMax: parseRate(
        env.NPC_RUNTIME_FALLBACK_RATE_MAX,
        DEFAULT_RELIABILITY_THRESHOLDS.fallbackRateMax,
      ),
      timeoutRateMax: parseRate(
        env.NPC_RUNTIME_TIMEOUT_RATE_MAX,
        DEFAULT_RELIABILITY_THRESHOLDS.timeoutRateMax,
      ),
      parseFailureRateMax: parseRate(
        env.NPC_RUNTIME_PARSE_FAILURE_RATE_MAX,
        DEFAULT_RELIABILITY_THRESHOLDS.parseFailureRateMax,
      ),
    },
  };
}
