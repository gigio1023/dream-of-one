export interface RuntimeConfig {
  host: string;
  port: number;
  codexCommand: string;
  codexArgs: string[];
  codexTimeoutMs: number;
  codexGlobalBudgetMs: number;
  promptCharBudget: number;
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
  };
}
