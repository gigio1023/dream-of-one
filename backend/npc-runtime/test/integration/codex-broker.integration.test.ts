import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DefaultCodexBroker } from "../../src/broker/codex-broker.js";
import { CodexToolTimeoutError, type CodexToolGateway, type CodexToolResponse } from "../../src/broker/codex-tool-gateway.js";
import { FileThreadStore, InMemoryThreadStore } from "../../src/broker/thread-store.js";
import type { PerceptionPacket } from "../../src/contracts/types.js";
import { ReliabilityTelemetry } from "../../src/runtime/reliability-telemetry.js";

function buildPacket(): PerceptionPacket {
  return {
    sessionId: "session-1",
    npcId: "npc-1",
    landmarkId: "Store",
    nearbyActors: ["npc-2", "player"],
    recentEvents: ["checklist_start"],
    organizationContext: { organization: "Store", role: "Clerk" },
    playerSignals: { suspicion: 0.2, exposure: 0.1 },
  };
}

class FakeGateway implements CodexToolGateway {
  readonly calls: Array<{ tool: "codex" | "codex-reply"; prompt: string; threadId?: string }> = [];
  codexResponse?: CodexToolResponse;
  codexReplyResponse?: CodexToolResponse;
  codexSequence: Array<{ response?: CodexToolResponse; error?: Error }> = [];
  codexReplySequence: Array<{ response?: CodexToolResponse; error?: Error }> = [];
  codexError?: Error;
  codexReplyError?: Error;
  codexDelayMs = 0;
  codexReplyDelayMs = 0;

  async codex(prompt: string): Promise<CodexToolResponse> {
    this.calls.push({ tool: "codex", prompt });
    if (this.codexDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.codexDelayMs));
    }
    const step = this.codexSequence.shift();
    if (step?.error) throw step.error;
    if (step?.response) return step.response;
    if (this.codexError) throw this.codexError;
    if (!this.codexResponse) throw new Error("missing codex response");
    return this.codexResponse;
  }

  async codexReply(threadId: string, prompt: string): Promise<CodexToolResponse> {
    this.calls.push({ tool: "codex-reply", prompt, threadId });
    if (this.codexReplyDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.codexReplyDelayMs));
    }
    const step = this.codexReplySequence.shift();
    if (step?.error) throw step.error;
    if (step?.response) return step.response;
    if (this.codexReplyError) throw this.codexReplyError;
    if (!this.codexReplyResponse) throw new Error("missing codex-reply response");
    return this.codexReplyResponse;
  }
}

test("first decision call starts a new codex thread", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexResponse = {
    threadId: "thread-1",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Work",
      reasonCodes: ["routine_task"],
      confidence: 0.91,
    }),
  };

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.transport, "codex");
  assert.equal(result.meta.threadId, "thread-1");
  assert.equal(result.intent.actionType, "Work");
  assert.equal(store.get("session-1", "npc-1"), "thread-1");
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex"]);
  assert.match(gateway.calls[0].prompt, /Policy version: dre-115-v1/);
  assert.match(gateway.calls[0].prompt, /Organization template:/);
  assert.match(gateway.calls[0].prompt, /Role card:/);
});

test("second decision call reuses existing thread via codex-reply", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();

  gateway.codexResponse = {
    threadId: "thread-1",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["first_step"],
      confidence: 0.71,
    }),
  };

  gateway.codexReplyResponse = {
    threadId: "thread-1",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Report",
      reasonCodes: ["escalation"],
      confidence: 0.84,
    }),
  };

  const broker = new DefaultCodexBroker(gateway, store);

  await broker.decide(buildPacket());
  const second = await broker.decide(buildPacket());

  assert.equal(second.meta.usedFallback, false);
  assert.equal(second.meta.transport, "codex-reply");
  assert.equal(second.intent.actionType, "Report");
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex", "codex-reply"]);
  assert.equal(gateway.calls[1].threadId, "thread-1");
});

test("restored store reuses persisted thread across process restart", async t => {
  const tmpPath = mkdtempSync(join(tmpdir(), "npc-runtime-thread-store-"));
  t.after(() => {
    rmSync(tmpPath, { recursive: true, force: true });
  });

  const storePath = join(tmpPath, "threads.json");

  const firstGateway = new FakeGateway();
  firstGateway.codexResponse = {
    threadId: "thread-persisted",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["initial"],
      confidence: 0.8,
    }),
  };
  const firstBroker = new DefaultCodexBroker(firstGateway, new FileThreadStore(storePath));
  await firstBroker.decide(buildPacket());

  const secondGateway = new FakeGateway();
  secondGateway.codexReplyResponse = {
    threadId: "thread-persisted",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Report",
      reasonCodes: ["continued_context"],
      confidence: 0.93,
    }),
  };

  const secondBroker = new DefaultCodexBroker(secondGateway, new FileThreadStore(storePath));
  const second = await secondBroker.decide(buildPacket());

  assert.equal(second.meta.transport, "codex-reply");
  assert.equal(second.meta.threadId, "thread-persisted");
  assert.deepEqual(secondGateway.calls.map(c => c.tool), ["codex-reply"]);
  assert.equal(secondGateway.calls[0].threadId, "thread-persisted");
});

test("invalid codex response triggers parse fallback", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();

  gateway.codexResponse = {
    threadId: "thread-parse",
    content: "not-a-json-object",
  };

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "parse_failure");
  assert.equal(result.intent.actionType, "Observe");
  assert.deepEqual(result.intent.reasonCodes, ["fallback:parse_failure"]);
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex", "codex"]);
});

test("codex timeout triggers deterministic fallback", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexError = new CodexToolTimeoutError("codex timed out");

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "codex_timeout");
  assert.equal(result.intent.actionType, "Observe");
  assert.deepEqual(result.intent.reasonCodes, ["fallback:codex_timeout"]);
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex"]);
});

test("pre-hook rejects non-codex cognition path before calling gateway", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexResponse = {
    threadId: "thread-ignored",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["ignored"],
      confidence: 0.5,
    }),
  };

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide({
    ...buildPacket(),
    cognitionPath: "manual",
  });

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "policy_reject_non_codex_path");
  assert.deepEqual(gateway.calls, []);
});

test("pre-hook required field guard rejects malformed packet", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexResponse = {
    threadId: "thread-ignored",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["ignored"],
      confidence: 0.5,
    }),
  };

  const broker = new DefaultCodexBroker(gateway, store);
  const malformedPacket = {
    ...buildPacket(),
    sessionId: "",
  } as PerceptionPacket;

  const result = await broker.decide(malformedPacket);

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "policy_required_field_missing");
  assert.deepEqual(gateway.calls, []);
});

test("tool-hook retries once and succeeds on second codex call", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexSequence.push({
    response: {
      threadId: "thread-r1",
      content: "not-json",
    },
  });
  gateway.codexSequence.push({
    response: {
      threadId: "thread-r1",
      content: JSON.stringify({
        npcId: "npc-1",
        actionType: "Work",
        reasonCodes: ["retry_success"],
        confidence: 0.9,
      }),
    },
  });

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.transport, "codex");
  assert.equal(result.meta.threadId, "thread-r1");
  assert.equal(result.intent.actionType, "Work");
  assert.deepEqual(result.intent.reasonCodes, ["retry_success"]);
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex", "codex"]);
});

test("global runtime budget can short-circuit retry with budget fallback", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  const telemetry = new ReliabilityTelemetry();
  gateway.codexDelayMs = 5;
  gateway.codexSequence.push({
    response: {
      threadId: "thread-budget",
      content: "not-json",
    },
  });
  gateway.codexSequence.push({
    response: {
      threadId: "thread-budget",
      content: JSON.stringify({
        npcId: "npc-1",
        actionType: "Observe",
        reasonCodes: ["unexpected_second_try"],
        confidence: 0.8,
      }),
    },
  });

  const broker = new DefaultCodexBroker(gateway, store, {
    maxToolRuntimeMs: 1,
    telemetry,
  });
  const result = await broker.decide(buildPacket());
  const metrics = telemetry.snapshot();

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "codex_budget_exceeded");
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex"]);
  assert.equal(metrics.counters.budgetExceeded, 1);
  assert.equal(metrics.counters.retryAttempts, 1);
});
