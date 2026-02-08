import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CodexToolResponse {
  threadId: string;
  content: string;
}

export interface CodexToolGateway {
  codex(prompt: string): Promise<CodexToolResponse>;
  codexReply(threadId: string, prompt: string): Promise<CodexToolResponse>;
}

export interface CommandCodexToolGatewayOptions {
  command: string;
  args?: string[];
  timeoutMs: number;
}

export class CodexToolTimeoutError extends Error {}
export class CodexToolError extends Error {}

export class CommandCodexToolGateway implements CodexToolGateway {
  private readonly command: string;
  private readonly args: string[];
  private readonly timeoutMs: number;

  constructor(options: CommandCodexToolGatewayOptions) {
    this.command = options.command;
    this.args = options.args ?? [];
    this.timeoutMs = options.timeoutMs;
  }

  codex(prompt: string): Promise<CodexToolResponse> {
    return this.run("codex", { prompt });
  }

  codexReply(threadId: string, prompt: string): Promise<CodexToolResponse> {
    return this.run("codex-reply", { threadId, prompt });
  }

  private async run(toolName: "codex" | "codex-reply", payload: Record<string, string>): Promise<CodexToolResponse> {
    try {
      const { stdout } = await execFileAsync(
        this.command,
        [...this.args, toolName, JSON.stringify(payload)],
        {
          timeout: this.timeoutMs,
          maxBuffer: 1024 * 1024,
        },
      );

      const parsed = this.parseToolResponse(stdout);
      return parsed;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      const maybeKilled = (err as NodeJS.ErrnoException & { killed?: boolean }).killed;
      if (err.name === "TimeoutError" || maybeKilled === true) {
        throw new CodexToolTimeoutError(`${toolName} timed out after ${this.timeoutMs}ms`);
      }

      if (err.code === "ENOENT") {
        throw new CodexToolError(`command not found: ${this.command}`);
      }

      throw new CodexToolError(`tool ${toolName} failed: ${err.message}`);
    }
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
