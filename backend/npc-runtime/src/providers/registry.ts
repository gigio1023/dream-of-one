import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ChatCompletionsAdapter } from "./adapters/chat-completions.js";
import { ResponsesAdapter } from "./adapters/responses.js";
import type { NpcProposalPort, TextGenPort } from "./ports.js";
import { ProviderService } from "./service.js";

const profileSchema = z
  .object({
    adapter: z.enum(["chat-completions", "responses"]),
    baseUrlEnv: z.string().optional(),
    apiKeyEnv: z.string().nullable(),
    model: z.string().min(1),
    timeoutMs: z.number().int().positive().optional(),
    params: z
      .object({
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().int().positive().default(400),
        reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh"]).optional(),
        enableThinking: z.boolean().optional(),
      })
      .default({ maxTokens: 400 }),
    structured: z.enum(["json-schema", "json-instructed"]).default("json-schema"),
  })
  .strict();

const providerConfigSchema = z
  .object({
    profiles: z.record(z.string(), profileSchema),
    selection: z
      .object({
        default: z.string().min(1),
        envOverride: z.string().min(1),
      })
      .strict(),
    runtime: z
      .object({
        timeoutMs: z.number().int().positive().default(2500),
        maxCallsPerSession: z.number().int().positive().default(50),
        maxTokensPerSession: z.number().int().positive().default(50_000),
      })
      .strict(),
  })
  .strict();

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

function configPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "providers.config.json");
}

export function loadProviderConfig() {
  return providerConfigSchema.parse(JSON.parse(readFileSync(configPath(), "utf-8")));
}

export interface ProviderRegistryResult {
  proposalPort: NpcProposalPort;
  profileId: string;
}

export function createProviderFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): ProviderRegistryResult {
  const config = loadProviderConfig();
  return createProviderFromConfig(config, env);
}

export function createProviderFromConfig(
  config: ProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
): ProviderRegistryResult {
  const override = env[config.selection.envOverride]?.trim();
  const profileId = override || config.selection.default;
  const profile = config.profiles[profileId];
  if (!profile) {
    throw new Error(`unknown NPC provider profile: ${profileId}`);
  }

  const apiKey = profile.apiKeyEnv ? env[profile.apiKeyEnv] : "local-no-key";
  const baseURL = profile.baseUrlEnv ? env[profile.baseUrlEnv] : undefined;
  const timeoutMs = profile.timeoutMs ?? config.runtime.timeoutMs;
  let textGen: TextGenPort;
  if (profile.adapter === "responses") {
    textGen = new ResponsesAdapter({
      profileId,
      apiKey,
      model: profile.model,
      maxTokens: profile.params.maxTokens,
      reasoningEffort: profile.params.reasoningEffort,
      timeoutMs,
    });
  } else {
    textGen = new ChatCompletionsAdapter({
      profileId,
      apiKey,
      baseURL,
      requiresBaseURL: profile.baseUrlEnv !== undefined,
      model: profile.model,
      maxTokens: profile.params.maxTokens,
      temperature: profile.params.temperature,
      enableThinking: profile.params.enableThinking,
      timeoutMs,
      structured: profile.structured,
    });
  }

  return {
    profileId,
    proposalPort: new ProviderService({
      profileId,
      textGen,
      timeoutMs,
      maxCallsPerSession: config.runtime.maxCallsPerSession,
      maxTokensPerSession: config.runtime.maxTokensPerSession,
      maxOutputTokensPerCall: profile.params.maxTokens,
    }),
  };
}
