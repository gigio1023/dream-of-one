import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type {
  ProviderFailureReason,
  TextGenPort,
  TextGenRequest,
  TextGenResult,
} from "../ports.js";

export interface ChatCompletionsAdapterOptions {
  profileId: string;
  apiKey?: string;
  baseURL?: string;
  requiresBaseURL: boolean;
  model: string;
  maxTokens: number;
  temperature?: number;
  enableThinking?: boolean;
  timeoutMs: number;
  structured: "json-schema" | "json-instructed";
}

export class ChatCompletionsAdapter implements TextGenPort {
  readonly adapterId = "chat-completions";
  private readonly client?: OpenAI;

  constructor(private readonly options: ChatCompletionsAdapterOptions) {
    if (options.apiKey && (!options.requiresBaseURL || options.baseURL)) {
      this.client = new OpenAI({
        apiKey: options.apiKey,
        baseURL: options.baseURL,
        timeout: options.timeoutMs,
        maxRetries: 0,
      });
    }
  }

  async preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    if (!this.options.apiKey) return { available: false, reason: "missing_credentials" };
    if (this.options.requiresBaseURL && !this.options.baseURL) {
      return { available: false, reason: "unavailable" };
    }
    return { available: true };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    if (!this.client) {
      throw new Error(`missing credentials for ${this.options.profileId}`);
    }
    const responseFormat =
      this.options.structured === "json-schema"
        ? {
            type: "json_schema" as const,
            json_schema: {
              name: request.schemaName,
              strict: true,
              schema: request.jsonSchema,
            },
          }
        : { type: "json_object" as const };
    const instructions =
      this.options.structured === "json-instructed"
        ? `${request.instructions}\nJSON Schema (${request.schemaName}): ${JSON.stringify(request.jsonSchema)}`
        : request.instructions;
    const body: ChatCompletionCreateParamsNonStreaming & {
      chat_template_kwargs?: { enable_thinking: boolean };
    } = {
      model: this.options.model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: request.input },
      ],
      response_format: responseFormat,
      max_tokens: this.options.maxTokens,
      temperature: this.options.temperature,
      ...(this.options.enableThinking === undefined
        ? {}
        : { chat_template_kwargs: { enable_thinking: this.options.enableThinking } }),
    };
    const completion = await this.client.chat.completions.create(
      body,
      { timeout: request.timeoutMs ?? this.options.timeoutMs },
    );
    const text = completion.choices?.[0]?.message.content;
    if (!text) {
      throw new Error("chat completion returned no message content");
    }
    const usage = completion.usage;
    return {
      text,
      usage: usage
        ? {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  }
}
