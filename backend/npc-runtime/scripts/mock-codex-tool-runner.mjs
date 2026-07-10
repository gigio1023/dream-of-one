#!/usr/bin/env bun

let counter = 0;

function fail(message) {
  process.stderr.write(`[mock-codex-tool-runner] ${message}\n`);
  process.exit(1);
}

function parsePayload(raw) {
  if (!raw || typeof raw !== "string") {
    fail("payload JSON is required");
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      fail("payload must be an object");
    }
    return parsed;
  } catch (error) {
    fail(`invalid payload JSON: ${error.message}`);
  }
}

function parseNpcId(prompt) {
  if (typeof prompt !== "string") {
    return "npc-unknown";
  }
  const match = prompt.match(/"npcId":"([^"]+)"/);
  return match?.[1] ?? "npc-unknown";
}

function resolveThreadId(toolName, payload) {
  if (toolName === "codex-reply" && typeof payload.threadId === "string" && payload.threadId.trim().length > 0) {
    return payload.threadId.trim();
  }
  counter += 1;
  return `mock-thread-${Date.now()}-${counter}`;
}

async function maybeDelay(mode) {
  if (mode !== "timeout") {
    return;
  }
  const delayMs = Math.max(1, Number.parseInt(process.env.MOCK_CODEX_TIMEOUT_DELAY_MS ?? "2500", 10));
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

async function main() {
  const toolName = process.argv[2];
  if (toolName !== "codex" && toolName !== "codex-reply") {
    fail(`unsupported tool: ${toolName}`);
  }

  const payload = parsePayload(process.argv[3]);
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  const npcId = parseNpcId(prompt);
  const mode = (process.env.MOCK_CODEX_MODE ?? "normal").trim().toLowerCase();
  const threadId = resolveThreadId(toolName, payload);

  if (mode === "tool-failure") {
    fail("simulated tool failure");
  }

  await maybeDelay(mode);

  let content;
  if (mode === "parse-failure") {
    content = "this is not valid JSON";
  } else {
    content = JSON.stringify({
      npcId,
      actionType: "Observe",
      reasonCodes: [`mock.${toolName}`],
      confidence: 0.91,
    });
  }

  process.stdout.write(JSON.stringify({ threadId, content }));
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
