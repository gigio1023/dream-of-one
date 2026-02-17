import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DefaultCodexBroker } from "../../src/broker/codex-broker.js";
import {
  CodexToolCancelledError,
  CodexToolTimeoutError,
  type CodexToolGateway,
  type CodexToolResponse,
} from "../../src/broker/codex-tool-gateway.js";
import { FileThreadStore, InMemoryThreadStore } from "../../src/broker/thread-store.js";
import type { PerceptionPacket } from "../../src/contracts/types.js";
import { FileActorWorkspaceStore } from "../../src/memory/actor-workspace-store.js";

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

  async codex(prompt: string, _options?: { signal?: AbortSignal; deadlineMs?: number }): Promise<CodexToolResponse> {
    this.calls.push({ tool: "codex", prompt });
    const step = this.codexSequence.shift();
    if (step?.error) throw step.error;
    if (step?.response) return step.response;
    if (this.codexError) throw this.codexError;
    if (!this.codexResponse) throw new Error("missing codex response");
    return this.codexResponse;
  }

  async codexReply(
    threadId: string,
    prompt: string,
    _options?: { signal?: AbortSignal; deadlineMs?: number },
  ): Promise<CodexToolResponse> {
    this.calls.push({ tool: "codex-reply", prompt, threadId });
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
  assert.equal(result.meta.warningTier, "reference");
  assert.equal(result.meta.reasonCategory, "none");
  assert.equal(result.intent.actionType, "Work");
  assert.equal(store.get("session-1", "npc-1"), "thread-1");
  assert.deepEqual(gateway.calls.map(c => c.tool), ["codex"]);
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

test("workspace artifacts are persisted and reused across calls", async t => {
  const tmpPath = mkdtempSync(join(tmpdir(), "npc-runtime-workspace-"));
  t.after(() => {
    rmSync(tmpPath, { recursive: true, force: true });
  });

  const storePath = join(tmpPath, "threads.json");
  const workspaceRoot = join(tmpPath, "workspaces");

  const gateway = new FakeGateway();
  gateway.codexResponse = {
    threadId: "thread-ws",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Work",
      reasonCodes: ["first_memory"],
      confidence: 0.9,
    }),
  };
  gateway.codexReplyResponse = {
    threadId: "thread-ws",
    content: JSON.stringify({
      npcId: "npc-1",
      actionType: "Report",
      reasonCodes: ["second_memory"],
      confidence: 0.91,
    }),
  };

  const broker = new DefaultCodexBroker(
    gateway,
    new FileThreadStore(storePath),
    new FileActorWorkspaceStore(workspaceRoot),
  );

  await broker.decide(buildPacket());
  await broker.decide(buildPacket());

  const actorDir = join(workspaceRoot, "session-1", "npc-1");
  assert.equal(existsSync(join(actorDir, "persona.json")), true);
  assert.equal(existsSync(join(actorDir, "policy.json")), true);
  assert.equal(existsSync(join(actorDir, "memory.json")), true);
  assert.equal(existsSync(join(actorDir, "summary.json")), true);
  assert.equal(existsSync(join(actorDir, "thread.json")), true);
  assert.equal(existsSync(join(actorDir, "MEMORY.md")), true);

  const thread = JSON.parse(readFileSync(join(actorDir, "thread.json"), "utf8")) as {
    threadId: string;
    transportHistory: string[];
  };
  const memory = JSON.parse(readFileSync(join(actorDir, "memory.json"), "utf8")) as {
    entries: Array<{ reasonCodes: string[] }>;
    lastReasonCodes: string[];
  };
  const expectedDate = new Date().toISOString().slice(0, 10);
  const durableMemory = readFileSync(join(actorDir, "MEMORY.md"), "utf8");
  const dailyMemory = readFileSync(join(actorDir, "memory", `${expectedDate}.md`), "utf8");

  assert.equal(thread.threadId, "thread-ws");
  assert.deepEqual(thread.transportHistory, ["codex", "codex-reply"]);
  assert.equal(memory.entries.length, 2);
  assert.deepEqual(memory.lastReasonCodes, ["second_memory"]);
  assert.ok(durableMemory.includes("## Simulation Memory Policy"));
  assert.ok(durableMemory.includes("Player suspicion snapshot: suspicion=0.2, exposure=0.1"));
  assert.ok(durableMemory.includes("Organization context reference: organization=Store, role=Clerk"));
  assert.ok(dailyMemory.includes(`# NPC Daily Memory (npc-1) - ${expectedDate}`));
  assert.ok(dailyMemory.includes("- actionType: Work"));
  assert.ok(dailyMemory.includes("- actionType: Report"));
  assert.ok(dailyMemory.includes("- reasonCodes: second_memory"));
  assert.ok(
    gateway.calls[1].prompt.includes("first_memory"),
    "expected second prompt to include prior workspace memory",
  );
});

test("fallback evidence is persisted when codex fails", async t => {
  const tmpPath = mkdtempSync(join(tmpdir(), "npc-runtime-fallback-"));
  t.after(() => {
    rmSync(tmpPath, { recursive: true, force: true });
  });

  const storePath = join(tmpPath, "threads.json");
  const workspaceRoot = join(tmpPath, "workspaces");

  const gateway = new FakeGateway();
  gateway.codexError = new CodexToolTimeoutError("codex timed out");

  const broker = new DefaultCodexBroker(
    gateway,
    new FileThreadStore(storePath),
    new FileActorWorkspaceStore(workspaceRoot),
  );

  const fallback = await broker.decide(buildPacket());

  const actorDir = join(workspaceRoot, "session-1", "npc-1");
  const thread = JSON.parse(readFileSync(join(actorDir, "thread.json"), "utf8")) as {
    transportHistory: string[];
  };
  const memory = JSON.parse(readFileSync(join(actorDir, "memory.json"), "utf8")) as {
    entries: Array<{ usedFallback: boolean; transport: string; reasonCodes: string[] }>;
    lastReasonCodes: string[];
  };
  const expectedDate = new Date().toISOString().slice(0, 10);
  const durableMemory = readFileSync(join(actorDir, "MEMORY.md"), "utf8");
  const dailyMemory = readFileSync(join(actorDir, "memory", `${expectedDate}.md`), "utf8");

  assert.equal(fallback.meta.usedFallback, true);
  assert.equal(fallback.meta.transport, "fallback");
  assert.equal(fallback.meta.reasonCategory, "timeout");
  assert.equal(fallback.meta.warningTier, "attention");
  assert.ok(thread.transportHistory.includes("fallback"));
  const lastEntry = memory.entries.at(-1);
  assert.ok(lastEntry, "expected fallback memory entry");
  assert.equal(lastEntry.usedFallback, true);
  assert.equal(lastEntry.transport, "fallback");
  assert.deepEqual(memory.lastReasonCodes, ["fallback:codex_timeout"]);
  assert.ok(durableMemory.includes("Player suspicion snapshot: suspicion=0.2, exposure=0.1"));
  assert.ok(dailyMemory.includes("- usedFallback: true"));
  assert.ok(dailyMemory.includes("- transport: fallback"));
  assert.ok(dailyMemory.includes("- reasonCodes: fallback:codex_timeout"));
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

test("request cancellation propagates deterministic fallback without retry", async () => {
  const store = new InMemoryThreadStore();
  const gateway = new FakeGateway();
  gateway.codexError = new CodexToolCancelledError("cancelled");

  const broker = new DefaultCodexBroker(gateway, store);
  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "request_cancelled");
  assert.equal(result.intent.actionType, "Observe");
  assert.deepEqual(result.intent.reasonCodes, ["fallback:request_cancelled"]);
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
  assert.equal(result.meta.reasonCategory, "policy");
  assert.equal(result.meta.warningTier, "blocking");
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
