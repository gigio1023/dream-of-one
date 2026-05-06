import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimeConfig {
  host: string;
  port: number;
  proposalProvider: ProposalProviderMode;
  codexCommand: string;
  codexArgs: string[];
  codexTimeoutMs: number;
  openAiProposal: OpenAiProposalConfig;
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
}

export type ProposalProviderMode = "codex-cli" | "openai-api";

export interface OpenAiProposalConfig {
  apiKey: string;
  baseUrl: string;
  preferredModel: string;
  fallbackModels: string[];
  modelCheckTimeoutMs: number;
  requestTimeoutMs: number;
  maxOutputTokens: number;
}

export const OPENAI_PROPOSAL_GATEWAY_COMMAND = "__openai_api_proposal_provider__";

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

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) return [...fallback];
  const parts = value
    .split(/[,\s]+/)
    .map(part => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? [...new Set(parts)] : [...fallback];
}

function parseProviderMode(value: string | undefined): ProposalProviderMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "codex" || normalized === "codex-cli" || normalized === "cli") {
    return "codex-cli";
  }
  if (normalized === "openai" || normalized === "openai-api" || normalized === "api") {
    return "openai-api";
  }
  return "openai-api";
}

function parseBaseUrl(value: string | undefined, fallback: string): string {
  const parsed = parsePath(value, fallback);
  return parsed.replace(/\/+$/, "");
}

export function encodeOpenAiProposalGatewayConfig(config: OpenAiProposalConfig): string {
  return Buffer.from(JSON.stringify(config), "utf8").toString("base64url");
}

export function decodeOpenAiProposalGatewayConfig(encoded: string | undefined): OpenAiProposalConfig {
  if (!encoded || !encoded.trim()) {
    throw new Error("missing OpenAI proposal gateway config");
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<OpenAiProposalConfig>;
  return {
    apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim().length > 0
      ? parsed.baseUrl.trim().replace(/\/+$/, "")
      : "https://api.openai.com/v1",
    preferredModel: typeof parsed.preferredModel === "string" && parsed.preferredModel.trim().length > 0
      ? parsed.preferredModel.trim()
      : "gpt-5.4-nano",
    fallbackModels: Array.isArray(parsed.fallbackModels)
      ? parsed.fallbackModels.filter((model): model is string => typeof model === "string" && model.trim().length > 0)
      : ["gpt-5-nano"],
    modelCheckTimeoutMs: typeof parsed.modelCheckTimeoutMs === "number" && parsed.modelCheckTimeoutMs > 0
      ? Math.floor(parsed.modelCheckTimeoutMs)
      : 3000,
    requestTimeoutMs: typeof parsed.requestTimeoutMs === "number" && parsed.requestTimeoutMs > 0
      ? Math.floor(parsed.requestTimeoutMs)
      : 8000,
    maxOutputTokens: typeof parsed.maxOutputTokens === "number" && parsed.maxOutputTokens > 0
      ? Math.floor(parsed.maxOutputTokens)
      : 700,
  };
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
  const proposalProvider = parseProviderMode(env.NPC_RUNTIME_PROPOSAL_PROVIDER);
  const openAiProposal: OpenAiProposalConfig = {
    apiKey: parsePath(env.OPENAI_API_KEY, ""),
    baseUrl: parseBaseUrl(env.OPENAI_BASE_URL, "https://api.openai.com/v1"),
    preferredModel: parsePath(env.OPENAI_PROPOSAL_PREFERRED_MODEL, "gpt-5.4-nano"),
    fallbackModels: parseList(env.OPENAI_PROPOSAL_MODEL_FALLBACKS, ["gpt-5-nano"]),
    modelCheckTimeoutMs: parseNumber(env.OPENAI_MODEL_CHECK_TIMEOUT_MS, 3000),
    requestTimeoutMs: parseNumber(env.OPENAI_PROPOSAL_TIMEOUT_MS, 8000),
    maxOutputTokens: parseNumber(env.OPENAI_PROPOSAL_MAX_OUTPUT_TOKENS, 700),
  };
  const hasCommandOverride = typeof env.CODEX_TOOL_COMMAND === "string" && env.CODEX_TOOL_COMMAND.trim().length > 0;
  const hasArgsOverride = typeof env.CODEX_TOOL_ARGS === "string" && env.CODEX_TOOL_ARGS.trim().length > 0;
  const codexCommand = proposalProvider === "openai-api"
    ? OPENAI_PROPOSAL_GATEWAY_COMMAND
    : (hasCommandOverride ? env.CODEX_TOOL_COMMAND!.trim() : defaultTool.command);
  const codexArgs = proposalProvider === "openai-api"
    ? [encodeOpenAiProposalGatewayConfig(openAiProposal)]
    : (hasArgsOverride
        ? parseArgs(env.CODEX_TOOL_ARGS)
        : (hasCommandOverride ? [] : defaultTool.args));

  return {
    host: env.NPC_RUNTIME_HOST ?? "0.0.0.0",
    port: parseNumber(env.NPC_RUNTIME_PORT, 8787),
    proposalProvider,
    codexCommand,
    codexArgs,
    codexTimeoutMs: parseNumber(env.CODEX_TOOL_TIMEOUT_MS, 20000),
    openAiProposal,
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
  };
}
