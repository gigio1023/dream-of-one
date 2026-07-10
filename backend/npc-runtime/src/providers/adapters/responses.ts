import OpenAI from "openai";
import type {
  ProviderFailureReason,
  TextGenPort,
  TextGenRequest,
  TextGenResult,
} from "../ports.js";

export interface ResponsesAdapterOptions {
  profileId: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  timeoutMs: number;
}

export class ResponsesAdapter implements TextGenPort {
  readonly adapterId = "responses";
  private readonly client?: OpenAI;

  constructor(private readonly options: ResponsesAdapterOptions) {
    if (options.apiKey) {
      this.client = new OpenAI({
        apiKey: options.apiKey,
        timeout: options.timeoutMs,
        maxRetries: 0,
      });
    }
  }

  async preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    return this.client
      ? { available: true }
      : { available: false, reason: "missing_credentials" };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    if (!this.client) {
      throw new Error(`missing credentials for ${this.options.profileId}`);
    }
    const response = await this.client.responses.create({
      model: this.options.model,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: this.options.maxTokens,
      reasoning: this.options.reasoningEffort
        ? { effort: this.options.reasoningEffort }
        : undefined,
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName,
          strict: true,
          schema: request.jsonSchema,
        },
      },
    });
    if (!response.output_text) {
      throw new Error("Responses API returned no output_text");
    }
    return {
      text: response.output_text,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }
}
