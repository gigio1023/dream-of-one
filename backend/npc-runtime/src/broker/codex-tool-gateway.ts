import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  decodeOpenAiProposalGatewayConfig,
  OPENAI_PROPOSAL_GATEWAY_COMMAND,
  type OpenAiProposalProviderMode,
  type OpenAiProposalConfig,
} from "../config.js";
import type { ActionType, PerceptionPacket } from "../contracts/types.js";

const execFileAsync = promisify(execFile);

export interface CodexToolResponse {
  threadId: string;
  content: string;
  providerUsage?: OpenAiProposalUsageSummary;
}

export interface CodexToolRunOptions {
  signal?: AbortSignal;
  deadlineMs?: number;
}

export interface CodexToolGateway {
  codex(prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse>;
  codexReply(threadId: string, prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse>;
}

export interface CommandCodexToolGatewayOptions {
  command: string;
  args?: string[];
  timeoutMs: number;
}

export class CodexToolTimeoutError extends Error {}
export class CodexToolCancelledError extends Error {}
export class CodexToolError extends Error {}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export type OpenAiProposalHealthReason =
  | "openai_api_key_missing"
  | "openai_model_unavailable"
  | "openai_model_check_timeout"
  | "openai_provider_unavailable";

export interface OpenAiProposalHealth {
  ok: boolean;
  provider: OpenAiProposalProviderMode;
  preferredModel: string;
  fallbackModels: string[];
  checkedModels: string[];
  storeResponses: boolean;
  budget: OpenAiProposalBudgetSummary;
  selectedModel?: string;
  reason?: OpenAiProposalHealthReason;
  detail?: string;
}

export interface OpenAiProposalBudgetSummary {
  maxEstimatedInputTokens: number;
  maxEstimatedTotalTokens: number;
  maxEstimatedCostUsd: number;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

interface OpenAiProposalBudgetEstimate {
  model: string;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCostUsd: number;
}

export interface OpenAiProposalUsageSummary extends OpenAiProposalBudgetEstimate {
  actualInputTokens?: number;
  actualOutputTokens?: number;
  actualTotalTokens?: number;
}

interface OpenAiProposalGatewayOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
}

interface PromptFrame {
  packet: PerceptionPacket;
  workspace: Record<string, unknown>;
}

interface NpcTextProposal {
  npcId: string;
  npcLineCandidates: string[];
  stationPressureWording: string[];
  localizedVariants: Array<{ locale: string; text: string }>;
  fallbackTextVariants: string[];
}

interface OpenAiResponsePayload {
  id: string;
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

const OPENAI_PROPOSAL_INSTRUCTIONS = [
  "You are a Dream of One NPC text proposal worker.",
  "Return only the structured JSON schema. You do not own game state.",
  "You may propose only NPC line candidates, Station pressure wording, localized variants, and fallback text variants.",
  "Do not decide Exposure delta, risk tag, Evidence type, why-line authority, Inquest state, Verdict, or session termination.",
  "Use only supplied facts. Do not invent laws, witnesses, artifacts, zones, records, model internals, backend internals, or schema explanations.",
  "Speak only as the NPC named by PerceptionPacket.npcId and its organizationContext.role.",
  "Never write the player's line, confess as the player, take blame for the player's order, or copy availableChoices as NPC speech.",
  "For waiting-customer roles, use observer wording about queue flow, public records, distance, help, or refusal; do not say the customer made the player's mistake.",
  "Keep lines short, diegetic, Korean-first when possible, and suitable for a civic pressure scene.",
].join("\n");

const OPENAI_CODEX_PROVIDER_MODELS = new Set([
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.5",
  "gpt-5.5-pro",
]);

const OPENAI_PROPOSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "npcId",
    "npcLineCandidates",
    "stationPressureWording",
    "localizedVariants",
    "fallbackTextVariants",
  ],
  properties: {
    npcId: { type: "string", minLength: 1 },
    npcLineCandidates: {
      type: "array",
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 240 },
    },
    stationPressureWording: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 240 },
    },
    localizedVariants: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["locale", "text"],
        properties: {
          locale: { type: "string", minLength: 2, maxLength: 16 },
          text: { type: "string", minLength: 1, maxLength: 240 },
        },
      },
    },
    fallbackTextVariants: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 240 },
    },
  },
} as const;

const PROPOSAL_ALLOWED_KEYS = new Set([
  "npcId",
  "npcLineCandidates",
  "stationPressureWording",
  "localizedVariants",
  "fallbackTextVariants",
]);

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "exposure",
  "exposuredelta",
  "risk",
  "risktag",
  "evidence",
  "evidencetype",
  "whyline",
  "whylineauthority",
  "stationintake",
  "inquest",
  "inqueststate",
  "verdict",
  "sessiontermination",
  "terminatesession",
  "termination",
]);

const FORBIDDEN_AUTHORITY_TEXT = [
  /\bexposure\s*delta\b/i,
  /\brisk\s*tag\b/i,
  /\bevidence\s*type\b/i,
  /\bwhy[-\s]?line\b/i,
  /\binquest\s*state\b/i,
  /\bverdict\b/i,
  /\bsession\s*termination\b/i,
  /\bterminate\s+session\b/i,
] as const;

function defaultFetch(): FetchLike {
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new CodexToolError("global fetch is not available for OpenAI proposal provider");
  }
  return fetchImpl as unknown as FetchLike;
}

function uniqueModels(preferredModel: string, fallbackModels: string[]): string[] {
  return [...new Set([preferredModel, ...fallbackModels].map(model => model.trim()).filter(Boolean))];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePromptFrame(prompt: string): PromptFrame {
  const workspaceMarker = "Workspace artifacts:\n";
  const inputMarker = "\nInput packet:\n";
  const workspaceStart = prompt.indexOf(workspaceMarker);
  const inputStart = prompt.indexOf(inputMarker);

  if (workspaceStart < 0 || inputStart < 0 || inputStart <= workspaceStart) {
    throw new CodexToolError("OpenAI proposal gateway could not find prompt frame markers");
  }

  try {
    const workspaceRaw = prompt.slice(workspaceStart + workspaceMarker.length, inputStart).trim();
    const packetRaw = prompt.slice(inputStart + inputMarker.length).trim();
    const workspace = JSON.parse(workspaceRaw) as Record<string, unknown>;
    const packet = JSON.parse(packetRaw) as PerceptionPacket;
    if (!isRecord(workspace) || !isRecord(packet) || typeof packet.npcId !== "string" || packet.npcId.trim().length === 0) {
      throw new Error("prompt frame missing workspace or npcId");
    }
    return { workspace, packet };
  } catch (error) {
    throw new CodexToolError(`OpenAI proposal gateway could not parse prompt frame: ${errorMessage(error)}`);
  }
}

function normalizeLineArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new CodexToolError(`OpenAI proposal ${label} must be a string[]`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new CodexToolError(`OpenAI proposal ${label}[${index}] must be a non-empty string`);
    }
    const trimmed = item.trim();
    if (trimmed.length > 240) {
      throw new CodexToolError(`OpenAI proposal ${label}[${index}] exceeds 240 characters`);
    }
    assertNoForbiddenAuthorityText(trimmed, `${label}[${index}]`);
    return trimmed;
  });
}

function assertNoForbiddenAuthorityText(text: string, label: string): void {
  for (const pattern of FORBIDDEN_AUTHORITY_TEXT) {
    if (pattern.test(text)) {
      throw new CodexToolError(`OpenAI proposal ${label} contains forbidden authority wording`);
    }
  }
}

function normalizeLocalizedVariants(value: unknown): Array<{ locale: string; text: string }> {
  if (!Array.isArray(value)) {
    throw new CodexToolError("OpenAI proposal localizedVariants must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new CodexToolError(`OpenAI proposal localizedVariants[${index}] must be an object`);
    }
    const locale = item.locale;
    const text = item.text;
    if (typeof locale !== "string" || locale.trim().length === 0) {
      throw new CodexToolError(`OpenAI proposal localizedVariants[${index}].locale must be a non-empty string`);
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new CodexToolError(`OpenAI proposal localizedVariants[${index}].text must be a non-empty string`);
    }
    const trimmedText = text.trim();
    if (trimmedText.length > 240) {
      throw new CodexToolError(`OpenAI proposal localizedVariants[${index}].text exceeds 240 characters`);
    }
    assertNoForbiddenAuthorityText(trimmedText, `localizedVariants[${index}].text`);
    return {
      locale: locale.trim(),
      text: trimmedText,
    };
  });
}

function assertNoForbiddenProposalKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenProposalKeys(item, `${path}[${index}]`));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (FORBIDDEN_AUTHORITY_KEYS.has(normalized)) {
      throw new CodexToolError(`OpenAI proposal contains forbidden authority field at ${path}.${key}`);
    }
    assertNoForbiddenProposalKeys(nested, `${path}.${key}`);
  }
}

function parseNpcTextProposal(rawText: string, expectedNpcId: string): NpcTextProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new CodexToolError(`OpenAI proposal response was not JSON: ${errorMessage(error)}`);
  }

  if (!isRecord(parsed)) {
    throw new CodexToolError("OpenAI proposal response must be an object");
  }

  for (const key of Object.keys(parsed)) {
    if (!PROPOSAL_ALLOWED_KEYS.has(key)) {
      throw new CodexToolError(`OpenAI proposal contains unsupported field: ${key}`);
    }
  }
  assertNoForbiddenProposalKeys(parsed);

  const npcId = parsed.npcId;
  if (typeof npcId !== "string" || npcId.trim().length === 0) {
    throw new CodexToolError("OpenAI proposal npcId must be a non-empty string");
  }
  if (npcId !== expectedNpcId) {
    throw new CodexToolError(`OpenAI proposal npcId mismatch: expected ${expectedNpcId}, got ${npcId}`);
  }

  const proposal: NpcTextProposal = {
    npcId,
    npcLineCandidates: normalizeLineArray(parsed.npcLineCandidates, "npcLineCandidates"),
    stationPressureWording: normalizeLineArray(parsed.stationPressureWording, "stationPressureWording"),
    localizedVariants: normalizeLocalizedVariants(parsed.localizedVariants),
    fallbackTextVariants: normalizeLineArray(parsed.fallbackTextVariants, "fallbackTextVariants"),
  };

  const totalLines = proposal.npcLineCandidates.length
    + proposal.stationPressureWording.length
    + proposal.localizedVariants.length
    + proposal.fallbackTextVariants.length;
  if (totalLines === 0) {
    throw new CodexToolError("OpenAI proposal must include at least one text variant");
  }

  return proposal;
}

function selectLocalizedLine(proposal: NpcTextProposal): string | undefined {
  const ko = proposal.localizedVariants.find(variant => variant.locale.toLowerCase().startsWith("ko"));
  if (ko) return ko.text;
  const en = proposal.localizedVariants.find(variant => variant.locale.toLowerCase().startsWith("en"));
  return en?.text ?? proposal.localizedVariants[0]?.text;
}

function selectProposalLine(packet: PerceptionPacket, proposal: NpcTextProposal): string {
  const stationLine = packet.landmarkId === "Station" ? proposal.stationPressureWording[0] : undefined;
  const utterance = stationLine
    ?? proposal.npcLineCandidates[0]
    ?? selectLocalizedLine(proposal)
    ?? proposal.stationPressureWording[0]
    ?? proposal.fallbackTextVariants[0];

  if (!utterance) {
    throw new CodexToolError("OpenAI proposal did not include a usable utterance");
  }

  return utterance;
}

function deterministicProposalActionType(packet: PerceptionPacket): ActionType {
  if (packet.landmarkId === "Station") {
    return "Ask";
  }
  return "Talk";
}

function proposalToIntentJson(packet: PerceptionPacket, proposal: NpcTextProposal): string {
  const utterance = selectProposalLine(packet, proposal);
  return JSON.stringify({
    npcId: packet.npcId,
    actionType: deterministicProposalActionType(packet),
    reasonCodes: ["openai_text_proposal"],
    confidence: 0.5,
    utterance,
  });
}

function extractOpenAiResponseText(payload: unknown): OpenAiResponsePayload {
  if (!isRecord(payload)) {
    throw new CodexToolError("OpenAI response payload must be an object");
  }

  const id = payload.id;
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new CodexToolError("OpenAI response missing id");
  }

  const outputText = payload.output_text;
  if (typeof outputText === "string" && outputText.trim().length > 0) {
    const usage = extractOpenAiUsage(payload);
    return { id: id.trim(), text: outputText.trim(), ...(usage ? { usage } : {}) };
  }

  const output = payload.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        continue;
      }
      for (const content of item.content) {
        if (!isRecord(content)) {
          continue;
        }
        const text = content.text;
        if (typeof text === "string" && text.trim().length > 0) {
          const usage = extractOpenAiUsage(payload);
          return { id: id.trim(), text: text.trim(), ...(usage ? { usage } : {}) };
        }
      }
    }
  }

  throw new CodexToolError("OpenAI response missing output text");
}

function readNestedString(value: unknown, keys: string[]): string | undefined {
  let cursor = value;
  for (const key of keys) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[key];
  }
  return typeof cursor === "string" && cursor.trim().length > 0 ? cursor.trim() : undefined;
}

function readNestedNumber(value: unknown, keys: string[]): number | undefined {
  let cursor = value;
  for (const key of keys) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[key];
  }
  return typeof cursor === "number" && Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : undefined;
}

function extractOpenAiUsage(value: unknown): OpenAiResponsePayload["usage"] {
  const usage = isRecord(value) ? value.usage : undefined;
  if (!isRecord(usage)) return undefined;

  const inputTokens =
    readNestedNumber(usage, ["input_tokens"])
    ?? readNestedNumber(usage, ["prompt_tokens"]);
  const outputTokens =
    readNestedNumber(usage, ["output_tokens"])
    ?? readNestedNumber(usage, ["completion_tokens"]);
  const totalTokens =
    readNestedNumber(usage, ["total_tokens"])
    ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);

  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }

  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
  };
}

function extractOpenAiStreamResponseText(payload: string): OpenAiResponsePayload {
  let responseId = "";
  let outputText = "";
  let completedResponse: unknown;
  let streamUsage: OpenAiResponsePayload["usage"];

  for (const rawLine of payload.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const data = line.slice("data:".length).trim();
    if (!data || data === "[DONE]") continue;

    let event: unknown;
    try {
      event = JSON.parse(data) as unknown;
    } catch {
      continue;
    }
    if (!isRecord(event)) continue;

    const id = readNestedString(event, ["response", "id"]) ?? readNestedString(event, ["id"]);
    if (id) responseId = id;

    const delta = readNestedString(event, ["delta"]);
    if (delta) outputText += delta;

    const type = readNestedString(event, ["type"]);
    if (type === "response.completed" && event.response) {
      completedResponse = event.response;
      streamUsage = extractOpenAiUsage(event.response);
    }

    const text = readNestedString(event, ["item", "content", "text"]) ?? readNestedString(event, ["content", "text"]);
    if (!outputText && text) outputText = text;
  }

  if (completedResponse) {
    try {
      const completed = extractOpenAiResponseText(completedResponse);
      return {
        id: completed.id || responseId,
        text: completed.text || outputText,
        ...((completed.usage ?? streamUsage) ? { usage: completed.usage ?? streamUsage } : {}),
      };
    } catch {
      // Codex Responses stream completion events can omit output text while
      // earlier delta events carry the text. Use the accumulated stream text.
    }
  }

  if (!responseId) {
    responseId = `openai-codex-stream-${Date.now()}`;
  }
  if (!outputText.trim()) {
    throw new CodexToolError("OpenAI stream response missing output text");
  }

  return {
    id: responseId,
    text: outputText.trim(),
    ...(streamUsage ? { usage: streamUsage } : {}),
  };
}

function parseModelIds(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new CodexToolError("OpenAI models response must include data[]");
  }

  return payload.data.flatMap(item => {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.trim().length === 0) {
      return [];
    }
    return [item.id.trim()];
  });
}

function summarizeBudget(config: OpenAiProposalConfig): OpenAiProposalBudgetSummary {
  return {
    maxEstimatedInputTokens: Math.max(1, Math.floor(config.budget.maxEstimatedInputTokens)),
    maxEstimatedTotalTokens: Math.max(1, Math.floor(config.budget.maxEstimatedTotalTokens)),
    maxEstimatedCostUsd: Math.max(0.000001, config.budget.maxEstimatedCostUsd),
    inputUsdPerMillionTokens: Math.max(0.000001, config.budget.inputUsdPerMillionTokens),
    outputUsdPerMillionTokens: Math.max(0.000001, config.budget.outputUsdPerMillionTokens),
  };
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

function estimateProposalBudget(
  config: OpenAiProposalConfig,
  model: string,
  proposalPrompt: string,
): OpenAiProposalBudgetEstimate {
  const budget = summarizeBudget(config);
  const estimatedInputTokens = estimateTokens(`${OPENAI_PROPOSAL_INSTRUCTIONS}\n${proposalPrompt}`);
  const maxOutputTokens = Math.max(1, Math.floor(config.maxOutputTokens));
  const estimatedTotalTokens = estimatedInputTokens + maxOutputTokens;
  const estimatedCostUsd = (estimatedInputTokens / 1_000_000 * budget.inputUsdPerMillionTokens)
    + (maxOutputTokens / 1_000_000 * budget.outputUsdPerMillionTokens);

  return {
    model,
    estimatedInputTokens,
    maxOutputTokens,
    estimatedTotalTokens,
    estimatedCostUsd,
  };
}

function summarizeProviderUsage(
  estimate: OpenAiProposalBudgetEstimate,
  usage: OpenAiResponsePayload["usage"],
): OpenAiProposalUsageSummary {
  return {
    ...estimate,
    ...(usage?.inputTokens !== undefined ? { actualInputTokens: usage.inputTokens } : {}),
    ...(usage?.outputTokens !== undefined ? { actualOutputTokens: usage.outputTokens } : {}),
    ...(usage?.totalTokens !== undefined ? { actualTotalTokens: usage.totalTokens } : {}),
  };
}

function assertProposalWithinBudget(config: OpenAiProposalConfig, estimate: OpenAiProposalBudgetEstimate): void {
  const budget = summarizeBudget(config);
  if (estimate.estimatedInputTokens > budget.maxEstimatedInputTokens) {
    throw new CodexToolError(
      `OpenAI proposal budget exceeded for ${estimate.model}: estimated input tokens `
      + `${estimate.estimatedInputTokens} > ${budget.maxEstimatedInputTokens}`,
    );
  }
  if (estimate.estimatedTotalTokens > budget.maxEstimatedTotalTokens) {
    throw new CodexToolError(
      `OpenAI proposal budget exceeded for ${estimate.model}: estimated total tokens `
      + `${estimate.estimatedTotalTokens} > ${budget.maxEstimatedTotalTokens}`,
    );
  }
  if (estimate.estimatedCostUsd > budget.maxEstimatedCostUsd) {
    throw new CodexToolError(
      `OpenAI proposal budget exceeded for ${estimate.model}: estimated cost `
      + `$${estimate.estimatedCostUsd.toFixed(6)} > $${budget.maxEstimatedCostUsd.toFixed(6)}`,
    );
  }
}

class OpenAiDecisionBudget {
  private readonly requestTimeoutMs: number;
  private readonly deadlineAtMs: number | undefined;

  constructor(requestTimeoutMs: number, deadlineMs: number | undefined) {
    this.requestTimeoutMs = Math.max(1, Math.floor(requestTimeoutMs));
    if (!Number.isFinite(deadlineMs) || deadlineMs === undefined) {
      this.deadlineAtMs = undefined;
      return;
    }

    this.deadlineAtMs = Date.now() + Math.max(1, Math.floor(deadlineMs));
  }

  remainingTimeoutMs(): number {
    if (this.deadlineAtMs === undefined) {
      return this.requestTimeoutMs;
    }

    const remainingMs = this.deadlineAtMs - Date.now();
    if (remainingMs <= 0) {
      throw new CodexToolTimeoutError("OpenAI API decision deadline exhausted");
    }

    return Math.min(this.requestTimeoutMs, Math.max(1, Math.floor(remainingMs)));
  }
}

export class OpenAiProposalGateway implements CodexToolGateway {
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  // AI_PROVIDER_SEARCH_INDEX: docs/agent-search-index.md.
  // This gateway adapts external LLM providers into Dream of One's proposal
  // contract. The current default implementation is `openai-codex`, but every
  // provider must return bounded wording that the backend validates before any
  // player-visible consequence exists.
  constructor(
    private readonly config: OpenAiProposalConfig,
    options: OpenAiProposalGatewayOptions = {},
  ) {
    this.fetchImpl = options.fetch ?? defaultFetch();
    this.timeoutMs = Math.max(1, Math.floor(options.timeoutMs ?? config.requestTimeoutMs));
  }

  async codex(prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse> {
    const frame = parsePromptFrame(prompt);
    return await this.propose(frame, undefined, options);
  }

  async codexReply(threadId: string, prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse> {
    const frame = parsePromptFrame(prompt);
    return await this.propose(frame, threadId, options);
  }

  async checkHealth(): Promise<OpenAiProposalHealth> {
    const checkedModels = uniqueModels(this.config.preferredModel, this.config.fallbackModels);
    const budget = summarizeBudget(this.config);
    if (!this.config.apiKey.trim()) {
      return {
        ok: false,
        provider: this.config.provider,
        preferredModel: this.config.preferredModel,
        fallbackModels: [...this.config.fallbackModels],
        checkedModels,
        storeResponses: this.config.storeResponses,
        budget,
        reason: "openai_api_key_missing",
      };
    }

    if (this.config.provider === "openai-codex") {
      const selectedModel = checkedModels.find(model => OPENAI_CODEX_PROVIDER_MODELS.has(model));
      return selectedModel
        ? {
            ok: true,
            provider: this.config.provider,
            preferredModel: this.config.preferredModel,
            fallbackModels: [...this.config.fallbackModels],
            checkedModels,
            storeResponses: this.config.storeResponses,
            budget,
            selectedModel,
          }
        : {
            ok: false,
            provider: this.config.provider,
            preferredModel: this.config.preferredModel,
            fallbackModels: [...this.config.fallbackModels],
            checkedModels,
            storeResponses: this.config.storeResponses,
            budget,
            reason: "openai_model_unavailable",
          };
    }

    try {
      const availableModels = await this.listAvailableModelIds(this.config.modelCheckTimeoutMs);
      const selectedModel = checkedModels.find(model => availableModels.has(model));
      if (!selectedModel) {
        return {
          ok: false,
          provider: this.config.provider,
          preferredModel: this.config.preferredModel,
          fallbackModels: [...this.config.fallbackModels],
          checkedModels,
          storeResponses: this.config.storeResponses,
          budget,
          reason: "openai_model_unavailable",
        };
      }

      return {
        ok: true,
        provider: this.config.provider,
        preferredModel: this.config.preferredModel,
        fallbackModels: [...this.config.fallbackModels],
        checkedModels,
        storeResponses: this.config.storeResponses,
        budget,
        selectedModel,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.config.provider,
        preferredModel: this.config.preferredModel,
        fallbackModels: [...this.config.fallbackModels],
        checkedModels,
        storeResponses: this.config.storeResponses,
        budget,
        reason: error instanceof CodexToolTimeoutError ? "openai_model_check_timeout" : "openai_provider_unavailable",
        detail: errorMessage(error),
      };
    }
  }

  private async propose(
    frame: PromptFrame,
    previousResponseId: string | undefined,
    options?: CodexToolRunOptions,
  ): Promise<CodexToolResponse> {
    if (!this.config.apiKey.trim()) {
      throw new CodexToolError("OpenAI API key is not configured");
    }

    const budget = this.createDecisionBudget(options?.deadlineMs);
    const selectedModel = await this.resolveAvailableModel(budget, options?.signal);
    const prompt = this.buildProposalPrompt(frame);
    const budgetEstimate = estimateProposalBudget(this.config, selectedModel, prompt);
    assertProposalWithinBudget(this.config, budgetEstimate);
    const body: Record<string, unknown> = {
      model: selectedModel,
      instructions: OPENAI_PROPOSAL_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "npc_text_proposal",
          schema: OPENAI_PROPOSAL_SCHEMA,
          strict: true,
        },
      },
      store: this.config.storeResponses,
    };

    if (this.config.provider === "openai-codex") {
      body.stream = true;
    } else {
      body.max_output_tokens = Math.max(1, Math.floor(this.config.maxOutputTokens));
    }

    if (this.config.reasoningEffort) {
      body.reasoning = { effort: this.config.reasoningEffort };
    }

    if (previousResponseId && this.config.storeResponses) {
      body.previous_response_id = previousResponseId;
    }

    const timeout = budget.remainingTimeoutMs();
    const payload = this.config.provider === "openai-codex"
      ? await this.fetchText("responses", {
          method: "POST",
          body: JSON.stringify(body),
        }, timeout, options?.signal)
      : await this.fetchJson("responses", {
          method: "POST",
          body: JSON.stringify(body),
        }, timeout, options?.signal);
    const response = typeof payload === "string"
      ? extractOpenAiStreamResponseText(payload)
      : extractOpenAiResponseText(payload);
    const proposal = parseNpcTextProposal(response.text, frame.packet.npcId);

    return {
      threadId: response.id,
      content: proposalToIntentJson(frame.packet, proposal),
      providerUsage: summarizeProviderUsage(budgetEstimate, response.usage),
    };
  }

  private buildProposalPrompt(frame: PromptFrame): string {
    return [
      "Build bounded text proposals for this NPC interaction.",
      "The backend will validate and decide all game consequences.",
      "Role voice policy:",
      "Use only the requested npcId's role and organizationContext.roleVoicePolicy.",
      "availableChoices, when present, are player speech options, not NPC lines to repeat.",
      "actorMemory, when present, is bounded observed memory only: use ownRecentActions and observedRecentActions as context, and do not infer hidden events, private intent, or unobserved ledger facts.",
      "actorPolicy, when present, defines stable goals, priority shifts, action-selection policy, and forbidden claims; it must not be used to invent new affordances, authority, records, or state mutations.",
      "PerceptionPacket:",
      JSON.stringify(frame.packet),
      "WorkspaceArtifacts:",
      JSON.stringify(frame.workspace),
      "Allowed proposal fields:",
      "npcId, npcLineCandidates, stationPressureWording, localizedVariants, fallbackTextVariants.",
    ].join("\n");
  }

  private async resolveAvailableModel(budget: OpenAiDecisionBudget, signal?: AbortSignal): Promise<string> {
    const checkedModels = uniqueModels(this.config.preferredModel, this.config.fallbackModels);
    if (checkedModels.length === 0) {
      throw new CodexToolError("OpenAI proposal model list is empty");
    }

    if (this.config.provider === "openai-codex") {
      const selected = checkedModels.find(model => OPENAI_CODEX_PROVIDER_MODELS.has(model));
      if (!selected) {
        throw new CodexToolError(`OpenAI Codex proposal models unavailable in local catalog: ${checkedModels.join(", ")}`);
      }
      return selected;
    }

    const timeout = Math.min(this.config.modelCheckTimeoutMs, budget.remainingTimeoutMs());
    const availableModels = await this.listAvailableModelIds(timeout, signal);
    const selected = checkedModels.find(model => availableModels.has(model));
    if (!selected) {
      throw new CodexToolError(`OpenAI proposal models unavailable: ${checkedModels.join(", ")}`);
    }
    return selected;
  }

  private async listAvailableModelIds(timeoutMs: number, signal?: AbortSignal): Promise<Set<string>> {
    const payload = await this.fetchJson("models", { method: "GET" }, timeoutMs, signal);
    return new Set(parseModelIds(payload));
  }

  private async fetchJson(
    path: string,
    init: { method: string; body?: string },
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return await this.fetchPayload(path, init, timeoutMs, signal, "json");
  }

  private async fetchText(
    path: string,
    init: { method: string; body?: string },
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<string> {
    return await this.fetchPayload(path, init, timeoutMs, signal, "text") as string;
  }

  private async fetchPayload(
    path: string,
    init: { method: string; body?: string },
    timeoutMs: number,
    signal: AbortSignal | undefined,
    responseMode: "json" | "text",
  ): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, Math.max(1, Math.floor(timeoutMs)));

    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/+$/, "")}/${path}`, {
        method: init.method,
        headers: {
          "authorization": `Bearer ${this.config.apiKey}`,
          "content-type": "application/json",
        },
        body: init.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const suffix = detail.trim().length > 0 ? `: ${detail.trim().slice(0, 300)}` : "";
        throw new CodexToolError(`OpenAI API ${path} failed with ${response.status} ${response.statusText}${suffix}`);
      }

      return responseMode === "text" ? await response.text() : await response.json();
    } catch (error) {
      if (signal?.aborted && !timedOut) {
        throw new CodexToolCancelledError(`OpenAI API ${path} cancelled`);
      }
      if (timedOut || isAbortError(error)) {
        throw new CodexToolTimeoutError(`OpenAI API ${path} timed out after ${Math.max(1, Math.floor(timeoutMs))}ms`);
      }
      if (error instanceof CodexToolError || error instanceof CodexToolCancelledError || error instanceof CodexToolTimeoutError) {
        throw error;
      }
      throw new CodexToolError(`OpenAI API ${path} failed: ${errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  private createDecisionBudget(deadlineMs?: number): OpenAiDecisionBudget {
    return new OpenAiDecisionBudget(this.resolveRequestTimeout(), deadlineMs);
  }

  private resolveRequestTimeout(): number {
    const configured = Math.max(1, Math.floor(this.config.requestTimeoutMs));
    const gatewayTimeout = Math.max(1, Math.floor(this.timeoutMs));
    return Math.min(configured, gatewayTimeout);
  }
}

export function createOpenAiProposalGatewayFromEncodedConfig(
  encodedConfig: string | undefined,
  options: OpenAiProposalGatewayOptions = {},
): OpenAiProposalGateway {
  return new OpenAiProposalGateway(decodeOpenAiProposalGatewayConfig(encodedConfig), options);
}

export async function checkOpenAiProposalProviderHealth(
  config: OpenAiProposalConfig,
  options: OpenAiProposalGatewayOptions = {},
): Promise<OpenAiProposalHealth> {
  return await new OpenAiProposalGateway(config, options).checkHealth();
}

export class CommandCodexToolGateway implements CodexToolGateway {
  private readonly command: string;
  private readonly args: string[];
  private readonly timeoutMs: number;
  private readonly openAiGateway?: OpenAiProposalGateway;

  constructor(options: CommandCodexToolGatewayOptions) {
    this.command = options.command;
    this.args = options.args ?? [];
    this.timeoutMs = options.timeoutMs;
    if (options.command === OPENAI_PROPOSAL_GATEWAY_COMMAND) {
      this.openAiGateway = createOpenAiProposalGatewayFromEncodedConfig(this.args[0], {
        timeoutMs: this.timeoutMs,
      });
    }
  }

  codex(prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse> {
    if (this.openAiGateway) {
      return this.openAiGateway.codex(prompt, options);
    }
    return this.run("codex", { prompt }, options);
  }

  codexReply(threadId: string, prompt: string, options?: CodexToolRunOptions): Promise<CodexToolResponse> {
    if (this.openAiGateway) {
      return this.openAiGateway.codexReply(threadId, prompt, options);
    }
    return this.run("codex-reply", { threadId, prompt }, options);
  }

  private async run(
    toolName: "codex" | "codex-reply",
    payload: Record<string, string>,
    options?: CodexToolRunOptions,
  ): Promise<CodexToolResponse> {
    const timeout = this.resolveTimeout(options?.deadlineMs);
    try {
      const { stdout } = await execFileAsync(
        this.command,
        [...this.args, toolName, JSON.stringify(payload)],
        {
          timeout,
          maxBuffer: 1024 * 1024,
          signal: options?.signal,
        },
      );

      const parsed = this.parseToolResponse(stdout);
      return parsed;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.name === "AbortError" || err.code === "ABORT_ERR") {
        throw new CodexToolCancelledError(`tool ${toolName} cancelled`);
      }

      const maybeKilled = (err as NodeJS.ErrnoException & { killed?: boolean }).killed;
      if (err.name === "TimeoutError" || maybeKilled === true) {
        throw new CodexToolTimeoutError(`${toolName} timed out after ${timeout}ms`);
      }

      if (err.code === "ENOENT") {
        throw new CodexToolError(`command not found: ${this.command}`);
      }

      throw new CodexToolError(`tool ${toolName} failed: ${err.message}`);
    }
  }

  private resolveTimeout(deadlineMs?: number): number {
    if (!Number.isFinite(deadlineMs) || deadlineMs === undefined) {
      return this.timeoutMs;
    }
    const normalized = Math.max(1, Math.floor(deadlineMs));
    return Math.min(this.timeoutMs, normalized);
  }

  private parseToolResponse(raw: string): CodexToolResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new CodexToolError(`invalid tool JSON response: ${(error as Error).message}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new CodexToolError("tool response must be an object");
    }

    const obj = parsed as Record<string, unknown>;
    const structured = (obj.structuredContent ?? obj) as Record<string, unknown>;

    const threadId = structured.threadId;
    const content = structured.content;

    if (typeof threadId !== "string" || threadId.trim().length === 0) {
      throw new CodexToolError("tool response missing threadId");
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      throw new CodexToolError("tool response missing content");
    }

    return { threadId, content };
  }
}
