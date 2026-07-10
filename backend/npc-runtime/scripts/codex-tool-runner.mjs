#!/usr/bin/env bun

import { spawnSync } from "node:child_process";

const VALID_TOOLS = new Set(["codex", "codex-reply"]);

function fail(message) {
  process.stderr.write(`[codex-tool-runner] ${message}\n`);
  process.exit(1);
}

function parsePayload(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    fail("payload JSON is required");
  }

  try {
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") {
      fail("payload must be a JSON object");
    }
    return payload;
  } catch (error) {
    fail(`invalid payload JSON: ${error.message}`);
  }
}

function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${fieldName} is required`);
  }
  return value.trim();
}

function buildCodexArgs(toolName, payload) {
  const prompt = requiredString(payload.prompt, "payload.prompt");
  const common = ["exec", "--json", "--skip-git-repo-check"];

  if (toolName === "codex") {
    return [...common, prompt];
  }

  const threadId = requiredString(payload.threadId, "payload.threadId");
  return ["exec", "resume", "--json", "--skip-git-repo-check", threadId, prompt];
}

function parseJsonLines(output) {
  let threadId = "";
  let content = "";

  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }

    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (event && event.type === "thread.started" && typeof event.thread_id === "string") {
      threadId = event.thread_id;
      continue;
    }

    if (event && event.type === "item.completed" && event.item && typeof event.item === "object") {
      const item = event.item;
      if (item.type === "agent_message" && typeof item.text === "string" && item.text.trim().length > 0) {
        content = item.text.trim();
      }
    }
  }

  return { threadId, content };
}

function summarizeError(stderr, stdout) {
  const joined = `${stderr ?? ""}\n${stdout ?? ""}`.trim();
  if (joined.length === 0) {
    return "no output";
  }

  const lines = joined.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.slice(-3).join(" | ");
}

function main() {
  const toolName = process.argv[2];
  if (!VALID_TOOLS.has(toolName)) {
    fail(`unsupported tool '${toolName}'. expected codex or codex-reply`);
  }

  const payload = parsePayload(process.argv[3]);
  const args = buildCodexArgs(toolName, payload);
  const codexCommand = typeof process.env.CODEX_CLI_COMMAND === "string" && process.env.CODEX_CLI_COMMAND.trim().length > 0
    ? process.env.CODEX_CLI_COMMAND.trim()
    : "codex";

  const result = spawnSync(codexCommand, args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.error) {
    fail(`failed to execute codex command: ${result.error.message}`);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    fail(`codex exited with status ${result.status}: ${summarizeError(result.stderr, result.stdout)}`);
  }

  const parsed = parseJsonLines(result.stdout ?? "");
  const fallbackThreadId = toolName === "codex-reply" && typeof payload.threadId === "string" ? payload.threadId.trim() : "";
  const threadId = parsed.threadId || fallbackThreadId;
  const content = parsed.content;

  if (!threadId) {
    fail("missing thread id in codex output");
  }

  if (!content) {
    fail("missing agent message content in codex output");
  }

  process.stdout.write(JSON.stringify({ threadId, content }));
}

main();
