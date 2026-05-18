import { existsSync, readFileSync } from "node:fs";
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

// AI_PROVIDER_SEARCH_INDEX: docs/agent-search-index.md.
// Game AI providers are proposal workers, not game-state authorities.
// `openai-codex` means the backend's Codex-compatible OAuth provider profile;
// it must not be confused with Codex CLI login or a `codex exec` subprocess.
export type OpenAiProposalProviderMode = "openai-api" | "openai-codex";
export type ProposalProviderMode = "codex-cli" | OpenAiProposalProviderMode;

export interface OpenAiProposalConfig {
  provider: OpenAiProposalProviderMode;
  apiKey: string;
  baseUrl: string;
  preferredModel: string;
  fallbackModels: string[];
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
  storeResponses: boolean;
  modelCheckTimeoutMs: number;
  requestTimeoutMs: number;
  maxOutputTokens: number;
  budget: OpenAiProposalBudgetConfig;
}

export interface OpenAiProposalBudgetConfig {
  maxEstimatedInputTokens: number;
  maxEstimatedTotalTokens: number;
  maxEstimatedCostUsd: number;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export const OPENAI_PROPOSAL_GATEWAY_COMMAND = "__openai_api_proposal_provider__";
export const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
export const OPENAI_CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
// OPENAI_CODEX_PROVIDER_AUTH_STORE: ignored repo-local OAuth store for the game provider. This is separate from
// Codex CLI auth and is the first place to check for gameplay LLM auth.
export const DEFAULT_OPENAI_CODEX_AUTH_STORE_PATH = "build/provider-auth/openai-codex-auth.json";
export const DEFAULT_OPENAI_CODEX_AUTH_PROFILE = "default";
export const DEFAULT_OPENAI_PROPOSAL_MODEL = "gpt-5.4-mini";
export const DEFAULT_OPENAI_PROPOSAL_FALLBACK_MODELS = [] as const;
export const DEFAULT_OPENAI_PROPOSAL_REASONING_EFFORT = "low" as const;
export const DEFAULT_OPENAI_PROPOSAL_BUDGET: OpenAiProposalBudgetConfig = {
  maxEstimatedInputTokens: 6000,
  maxEstimatedTotalTokens: 8000,
  maxEstimatedCostUsd: 0.01,
  inputUsdPerMillionTokens: 0.75,
  outputUsdPerMillionTokens: 4.5,
};

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
  if (normalized === "codex-cli" || normalized === "cli") {
    return "codex-cli";
  }
  if (normalized === "codex" || normalized === "openai-codex" || normalized === "codex-oauth") {
    return "openai-codex";
  }
  if (normalized === "openai" || normalized === "openai-api" || normalized === "api") {
    return "openai-api";
  }
  return "openai-codex";
}

function parseOpenAiProviderMode(value: unknown): OpenAiProposalProviderMode {
  return value === "openai-codex" ? "openai-codex" : "openai-api";
}

function parseReasoningEffort(value: string | undefined): OpenAiProposalConfig["reasoningEffort"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "medium" || normalized === "high" || normalized === "xhigh") {
    return normalized;
  }
  return DEFAULT_OPENAI_PROPOSAL_REASONING_EFFORT;
}

function parseBaseUrl(value: string | undefined, fallback: string): string {
  const parsed = parsePath(value, fallback);
  return parsed.replace(/\/+$/, "");
}

function readPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function normalizeOpenAiProposalBudget(value: unknown): OpenAiProposalBudgetConfig {
  const budget = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Partial<OpenAiProposalBudgetConfig>
    : {};

  return {
    maxEstimatedInputTokens: readPositiveNumber(
      budget.maxEstimatedInputTokens,
      DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedInputTokens,
    ),
    maxEstimatedTotalTokens: readPositiveNumber(
      budget.maxEstimatedTotalTokens,
      DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedTotalTokens,
    ),
    maxEstimatedCostUsd: readPositiveNumber(
      budget.maxEstimatedCostUsd,
      DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedCostUsd,
    ),
    inputUsdPerMillionTokens: readPositiveNumber(
      budget.inputUsdPerMillionTokens,
      DEFAULT_OPENAI_PROPOSAL_BUDGET.inputUsdPerMillionTokens,
    ),
    outputUsdPerMillionTokens: readPositiveNumber(
      budget.outputUsdPerMillionTokens,
      DEFAULT_OPENAI_PROPOSAL_BUDGET.outputUsdPerMillionTokens,
    ),
  };
}

function extractAuthProfileCredential(value: unknown, profileName: string): string {
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const profile = typeof record.profiles === "object" && record.profiles !== null && !Array.isArray(record.profiles)
    ? (record.profiles as Record<string, unknown>)[profileName]
    : undefined;
  if (profile) {
    const profileCredential = extractAuthProfileCredential(profile, profileName);
    if (profileCredential) return profileCredential;
  }

  const expires = record.expires ?? record.expiresAt ?? record.expires_at;
  if (typeof expires === "number" && expires > 0 && expires <= Date.now()) return "";
  if (typeof expires === "string" && expires.trim()) {
    const parsed = Date.parse(expires);
    if (Number.isFinite(parsed) && parsed <= Date.now()) return "";
  }

  for (const key of ["access", "accessToken", "apiKey", "token"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const credentials = record.credentials;
  if (typeof credentials === "object" && credentials !== null && !Array.isArray(credentials)) {
    return extractAuthProfileCredential(credentials, profileName);
  }

  return "";
}

function readOpenAiCodexCredential(env: NodeJS.ProcessEnv): string {
  // For gameplay, prefer the explicit provider token or repo-local profile
  // store. Do not read Codex CLI's private cache here.
  const directCredential = parsePath(env.OPENAI_CODEX_ACCESS_TOKEN, "")
    || parsePath(env.OPENAI_CODEX_API_KEY, "");
  if (directCredential) return directCredential;

  const storePath = parsePath(env.OPENAI_CODEX_AUTH_STORE_PATH, DEFAULT_OPENAI_CODEX_AUTH_STORE_PATH);
  if (!existsSync(storePath)) return "";

  try {
    const parsed = JSON.parse(readFileSync(storePath, "utf8")) as unknown;
    return extractAuthProfileCredential(
      parsed,
      parsePath(env.OPENAI_CODEX_AUTH_PROFILE, DEFAULT_OPENAI_CODEX_AUTH_PROFILE),
    );
  } catch {
    return "";
  }
}

export function encodeOpenAiProposalGatewayConfig(config: OpenAiProposalConfig): string {
  return Buffer.from(JSON.stringify(config), "utf8").toString("base64url");
}

export function decodeOpenAiProposalGatewayConfig(encoded: string | undefined): OpenAiProposalConfig {
  if (!encoded || !encoded.trim()) {
    throw new Error("missing OpenAI proposal gateway config");
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<OpenAiProposalConfig>;
  const provider = parseOpenAiProviderMode(parsed.provider);
  return {
    provider,
    apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim().length > 0
      ? parsed.baseUrl.trim().replace(/\/+$/, "")
      : (provider === "openai-codex" ? OPENAI_CODEX_BASE_URL : OPENAI_API_BASE_URL),
    preferredModel: typeof parsed.preferredModel === "string" && parsed.preferredModel.trim().length > 0
      ? parsed.preferredModel.trim()
      : DEFAULT_OPENAI_PROPOSAL_MODEL,
    fallbackModels: Array.isArray(parsed.fallbackModels)
      ? parsed.fallbackModels.filter((model): model is string => typeof model === "string" && model.trim().length > 0)
      : [...DEFAULT_OPENAI_PROPOSAL_FALLBACK_MODELS],
    reasoningEffort: parseReasoningEffort(parsed.reasoningEffort),
    storeResponses: typeof parsed.storeResponses === "boolean" ? parsed.storeResponses : false,
    modelCheckTimeoutMs: typeof parsed.modelCheckTimeoutMs === "number" && parsed.modelCheckTimeoutMs > 0
      ? Math.floor(parsed.modelCheckTimeoutMs)
      : 3000,
    requestTimeoutMs: typeof parsed.requestTimeoutMs === "number" && parsed.requestTimeoutMs > 0
      ? Math.floor(parsed.requestTimeoutMs)
      : 8000,
    maxOutputTokens: typeof parsed.maxOutputTokens === "number" && parsed.maxOutputTokens > 0
      ? Math.floor(parsed.maxOutputTokens)
      : 700,
    budget: normalizeOpenAiProposalBudget(parsed.budget),
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
  const openAiProvider: OpenAiProposalProviderMode = proposalProvider === "openai-codex" ? "openai-codex" : "openai-api";
  const openAiProposal: OpenAiProposalConfig = {
    provider: openAiProvider,
    apiKey: openAiProvider === "openai-codex"
      ? readOpenAiCodexCredential(env)
      : parsePath(env.OPENAI_API_KEY, ""),
    baseUrl: openAiProvider === "openai-codex"
      ? parseBaseUrl(env.OPENAI_CODEX_BASE_URL ?? env.OPENAI_BASE_URL, OPENAI_CODEX_BASE_URL)
      : parseBaseUrl(env.OPENAI_BASE_URL, OPENAI_API_BASE_URL),
    preferredModel: openAiProvider === "openai-codex"
      ? parsePath(env.OPENAI_CODEX_PROPOSAL_MODEL ?? env.OPENAI_PROPOSAL_PREFERRED_MODEL, DEFAULT_OPENAI_PROPOSAL_MODEL)
      : parsePath(env.OPENAI_PROPOSAL_PREFERRED_MODEL, DEFAULT_OPENAI_PROPOSAL_MODEL),
    fallbackModels: openAiProvider === "openai-codex"
      ? parseList(env.OPENAI_CODEX_PROPOSAL_MODEL_FALLBACKS ?? env.OPENAI_PROPOSAL_MODEL_FALLBACKS, [...DEFAULT_OPENAI_PROPOSAL_FALLBACK_MODELS])
      : parseList(env.OPENAI_PROPOSAL_MODEL_FALLBACKS, [...DEFAULT_OPENAI_PROPOSAL_FALLBACK_MODELS]),
    reasoningEffort: parseReasoningEffort(
      openAiProvider === "openai-codex"
        ? (env.OPENAI_CODEX_REASONING_EFFORT ?? env.OPENAI_PROPOSAL_REASONING_EFFORT)
        : env.OPENAI_PROPOSAL_REASONING_EFFORT,
    ),
    storeResponses: parseBoolean(env.OPENAI_PROPOSAL_STORE_RESPONSES, false),
    modelCheckTimeoutMs: parseNumber(env.OPENAI_MODEL_CHECK_TIMEOUT_MS, 3000),
    requestTimeoutMs: parseNumber(env.OPENAI_PROPOSAL_TIMEOUT_MS, 8000),
    maxOutputTokens: parseNumber(env.OPENAI_PROPOSAL_MAX_OUTPUT_TOKENS, 700),
    budget: {
      maxEstimatedInputTokens: parseNumber(
        env.OPENAI_PROPOSAL_MAX_ESTIMATED_INPUT_TOKENS,
        DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedInputTokens,
      ),
      maxEstimatedTotalTokens: parseNumber(
        env.OPENAI_PROPOSAL_MAX_ESTIMATED_TOTAL_TOKENS,
        DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedTotalTokens,
      ),
      maxEstimatedCostUsd: parseNumber(
        env.OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD,
        DEFAULT_OPENAI_PROPOSAL_BUDGET.maxEstimatedCostUsd,
      ),
      inputUsdPerMillionTokens: parseNumber(
        env.OPENAI_PROPOSAL_INPUT_USD_PER_MILLION_TOKENS,
        DEFAULT_OPENAI_PROPOSAL_BUDGET.inputUsdPerMillionTokens,
      ),
      outputUsdPerMillionTokens: parseNumber(
        env.OPENAI_PROPOSAL_OUTPUT_USD_PER_MILLION_TOKENS,
        DEFAULT_OPENAI_PROPOSAL_BUDGET.outputUsdPerMillionTokens,
      ),
    },
  };
  const hasCommandOverride = typeof env.CODEX_TOOL_COMMAND === "string" && env.CODEX_TOOL_COMMAND.trim().length > 0;
  const hasArgsOverride = typeof env.CODEX_TOOL_ARGS === "string" && env.CODEX_TOOL_ARGS.trim().length > 0;
  const usesOpenAiGateway = proposalProvider === "openai-api" || proposalProvider === "openai-codex";
  const codexCommand = usesOpenAiGateway
    ? OPENAI_PROPOSAL_GATEWAY_COMMAND
    : (hasCommandOverride ? env.CODEX_TOOL_COMMAND!.trim() : defaultTool.command);
  const codexArgs = usesOpenAiGateway
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
