import assert from "node:assert/strict";
import test from "node:test";

import { DecisionService } from "../../src/runtime/decision-service.js";
import type { CodexBroker } from "../../src/broker/codex-broker.js";
import type { DecisionEnvelope, PerceptionPacket } from "../../src/contracts/types.js";

const noopBroker: CodexBroker = {
  async decide() {
    throw new Error("should not be called for invalid input");
  },
};

function buildPacket(npcId: string, eventCode: string, sessionId = "session-smoke"): PerceptionPacket {
  return {
    sessionId,
    npcId,
    landmarkId: "Store",
    nearbyActors: ["player"],
    recentEvents: [eventCode],
    organizationContext: { organization: "Store", role: "Clerk" },
    playerSignals: { suspicion: 0.4, exposure: 0.2 },
  };
}

function buildConversationPacket(npcId: string, turnId: string, sessionId = "session-conversation"): PerceptionPacket {
  const packet = buildPacket(npcId, turnId, sessionId);
  return {
    ...packet,
    conversation: {
      conversationId: "conv-same-order",
      turnId,
      promptId: "store.same_order.routine",
      choiceSetId: "store.same_order.choices",
      speakerId: "player",
      selectedChoiceId: `choice-${turnId}`,
      displayedPlayerLine: `line ${turnId}`,
    },
  };
}

function envelopeFromPacket(packet: PerceptionPacket): DecisionEnvelope {
  const reasonCode = packet.recentEvents[0] ?? "none";
  return {
    intent: {
      npcId: packet.npcId,
      actionType: "Observe",
      reasonCodes: [reasonCode],
      confidence: 0.8,
    },
    meta: {
      usedFallback: false,
      threadId: `thread-${packet.sessionId}-${packet.npcId}`,
      transport: "codex",
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test("invalid PerceptionPacket returns deterministic fallback envelope", async () => {
  const service = new DecisionService(noopBroker);

  const response = await service.decide({ foo: "bar" });

  assert.equal(response.meta.usedFallback, true);
  assert.equal(response.meta.transport, "fallback");
  assert.equal(response.meta.reason, "invalid_perception_packet");
  assert.equal(response.meta.reasonCategory, "schema");
  assert.equal(response.meta.warningTier, "blocking");
  assert.equal(response.intent.actionType, "Observe");
  assert.deepEqual(response.intent.reasonCodes, ["fallback:invalid_perception_packet"]);
});

test("same actor burst uses single-flight with latest-wins coalescing", async () => {
  const callOrder: string[] = [];
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      const eventCode = packet.recentEvents[0] ?? "none";
      callOrder.push(eventCode);
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      await sleep(30);
      activeCalls -= 1;
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker);
  const first = service.decide(buildPacket("npc-1", "e1"));
  const second = service.decide(buildPacket("npc-1", "e2"));
  const third = service.decide(buildPacket("npc-1", "e3"));

  const [firstResult, secondResult, thirdResult] = await Promise.all([first, second, third]);
  const metrics = service.getMailboxMetrics();

  assert.equal(maxActiveCalls, 1);
  assert.deepEqual(callOrder, ["e1", "e3"]);
  assert.deepEqual(firstResult.intent.reasonCodes, ["e1"]);
  assert.deepEqual(secondResult.intent.reasonCodes, ["e3"]);
  assert.deepEqual(thirdResult.intent.reasonCodes, ["e3"]);
  assert.equal(metrics.inflight, 0);
  assert.equal(metrics.queued, 1);
  assert.equal(metrics.coalesced, 1);
  assert.equal(metrics.dropped, 1);
});

test("same actor conversation turns are ordered and never coalesced", async () => {
  const callOrder: string[] = [];
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      const turnId = packet.conversation?.turnId ?? "none";
      callOrder.push(turnId);
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      await sleep(25);
      activeCalls -= 1;
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker);
  const first = service.decide(buildConversationPacket("npc-1", "turn-1"));
  const second = service.decide(buildConversationPacket("npc-1", "turn-2"));
  const third = service.decide(buildConversationPacket("npc-1", "turn-3"));

  const [firstResult, secondResult, thirdResult] = await Promise.all([first, second, third]);
  const metrics = service.getMailboxMetrics();

  assert.equal(maxActiveCalls, 1);
  assert.deepEqual(callOrder, ["turn-1", "turn-2", "turn-3"]);
  assert.deepEqual(firstResult.intent.reasonCodes, ["turn-1"]);
  assert.deepEqual(secondResult.intent.reasonCodes, ["turn-2"]);
  assert.deepEqual(thirdResult.intent.reasonCodes, ["turn-3"]);
  assert.equal(metrics.coalesced, 0);
  assert.equal(metrics.dropped, 0);
});

test("different actors remain isolated and can execute concurrently", async () => {
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      await sleep(35);
      activeCalls -= 1;
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker);

  const [first, second] = await Promise.all([
    service.decide(buildPacket("npc-1", "a1")),
    service.decide(buildPacket("npc-2", "b1")),
  ]);

  assert.deepEqual(first.intent.reasonCodes, ["a1"]);
  assert.deepEqual(second.intent.reasonCodes, ["b1"]);
  assert.ok(maxActiveCalls >= 2, `expected concurrent execution across actors, got ${maxActiveCalls}`);
});

test("global cap limits concurrent broker execution", async () => {
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      await sleep(35);
      activeCalls -= 1;
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });

  const [first, second] = await Promise.all([
    service.decide(buildPacket("npc-1", "cap-a")),
    service.decide(buildPacket("npc-2", "cap-b")),
  ]);
  const metrics = service.getMailboxMetrics();

  assert.deepEqual(first.intent.reasonCodes, ["cap-a"]);
  assert.deepEqual(second.intent.reasonCodes, ["cap-b"]);
  assert.equal(maxActiveCalls, 1);
  assert.equal(metrics.globalCap, 1);
  assert.equal(metrics.globalInFlight, 0);
});

test("request cancellation returns fallback and aborts running broker call", async () => {
  let sawAbort = false;

  const broker: CodexBroker = {
    async decide(packet, options) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 100);
        options?.signal?.addEventListener("abort", () => {
          sawAbort = true;
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const controller = new AbortController();

  const running = service.decide(buildPacket("npc-cancel", "c1"), {
    signal: controller.signal,
    deadlineMs: 500,
  });
  setTimeout(() => controller.abort(), 20);

  const result = await running;
  const metrics = service.getMailboxMetrics();

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.reason, "request_cancelled");
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reasonCategory, "cancelled");
  assert.equal(result.meta.warningTier, "attention");
  assert.equal(sawAbort, true);
  assert.equal(metrics.cancelled, 1);
});

test("queued request that misses deadline returns deterministic fallback", async () => {
  const broker: CodexBroker = {
    async decide(packet) {
      await sleep(40);
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker);
  const first = service.decide(buildPacket("npc-deadline", "d1"), { deadlineMs: 300 });
  const second = service.decide(buildPacket("npc-deadline", "d2"), { deadlineMs: 10 });

  const [firstResult, secondResult] = await Promise.all([first, second]);
  const metrics = service.getMailboxMetrics();

  assert.deepEqual(firstResult.intent.reasonCodes, ["d1"]);
  assert.equal(secondResult.meta.usedFallback, true);
  assert.equal(secondResult.meta.reason, "decision_deadline_exceeded");
  assert.equal(secondResult.meta.transport, "fallback");
  assert.equal(secondResult.meta.reasonCategory, "timeout");
  assert.equal(secondResult.meta.warningTier, "attention");
  assert.ok(metrics.deadlineExceeded >= 1);
});

test("global limiter reports queued work when max in-flight is reached", async () => {
  let releaseFirst: (() => void) | undefined;
  const broker: CodexBroker = {
    async decide(packet) {
      if (packet.recentEvents[0] === "blocking") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const first = service.decide(buildPacket("npc-block", "blocking"));
  await sleep(10);
  const second = service.decide(buildPacket("npc-wait", "queued"));
  await sleep(10);

  const metrics = service.getMailboxMetrics();
  assert.equal(metrics.globalQueued, 1);

  releaseFirst?.();
  await first;
  await second;
});

test("queued cancellation before execution returns fallback without extra broker calls", async () => {
  let releaseFirst: (() => void) | undefined;
  let callCount = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      callCount += 1;
      if (packet.recentEvents[0] === "cancellable") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const first = service.decide(buildPacket("npc-cancellable", "cancellable"));
  await sleep(10);

  const controller = new AbortController();
  const second = service.decide(buildPacket("npc-queued", "cancel"), {
    signal: controller.signal,
    deadlineMs: 1000,
  });
  await sleep(10);
  controller.abort();

  const fallback = await second;
  const metrics = service.getMailboxMetrics();

  assert.equal(fallback.meta.usedFallback, true);
  assert.equal(fallback.meta.reason, "request_cancelled");
  assert.equal(fallback.meta.transport, "fallback");
  assert.equal(fallback.meta.reasonCategory, "cancelled");
  assert.equal(fallback.meta.warningTier, "attention");
  assert.equal(metrics.cancelled, 1);
  assert.equal(callCount, 1, "expected only the blocking request to reach the broker");

  releaseFirst?.();
  await first;
});

test("global limiter waiting job skips broker execution when all waiters cancel", async () => {
  let releaseFirst: (() => void) | undefined;
  let callCount = 0;

  const broker: CodexBroker = {
    async decide(packet, options) {
      callCount += 1;
      if (packet.recentEvents[0] === "hold") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      if (options?.signal?.aborted) {
        await sleep(1);
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const first = service.decide(buildPacket("npc-hold", "hold"), { deadlineMs: 2000 });
  await sleep(10);

  const controller = new AbortController();
  const second = service.decide(buildPacket("npc-cancel-wait", "cancel-wait"), {
    signal: controller.signal,
    deadlineMs: 1200,
  });
  await sleep(10);
  controller.abort();

  const cancelled = await second;
  releaseFirst?.();
  await first;
  await sleep(10);

  const metrics = service.getMailboxMetrics();
  assert.equal(cancelled.meta.usedFallback, true);
  assert.equal(cancelled.meta.reason, "request_cancelled");
  assert.equal(callCount, 1, "expected waiting cancelled job not to invoke broker");
  assert.ok(metrics.skippedBeforeBroker >= 1);
  assert.equal(metrics.inflight, 0);
});

test("global limiter waiting job skips broker execution when deadline elapses", async () => {
  let releaseFirst: (() => void) | undefined;
  let callCount = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      callCount += 1;
      if (packet.recentEvents[0] === "hold") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const first = service.decide(buildPacket("npc-hold-deadline", "hold"), { deadlineMs: 2000 });
  await sleep(10);

  const second = service.decide(buildPacket("npc-deadline-wait", "deadline-wait"), {
    deadlineMs: 20,
  });
  await sleep(60);

  releaseFirst?.();
  await first;
  const timedOut = await second;
  await sleep(10);

  const metrics = service.getMailboxMetrics();
  assert.equal(timedOut.meta.usedFallback, true);
  assert.equal(timedOut.meta.reason, "decision_deadline_exceeded");
  assert.equal(callCount, 1, "expected deadline elapsed waiting job not to invoke broker");
  assert.ok(metrics.deadlineExceeded >= 1);
  assert.ok(metrics.skippedBeforeBroker >= 1);
  assert.equal(metrics.inflight, 0);
});

test("per-bot pending limit rejects with deterministic backpressure fallback", async () => {
  let releaseFirst: (() => void) | undefined;
  let callCount = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      callCount += 1;
      if (packet.recentEvents[0] === "hold") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, {
    maxBrokerInFlight: 1,
    maxPendingPerBot: 1,
    maxPendingGlobal: 10,
  });
  const first = service.decide(buildPacket("npc-saturated", "hold"));
  await sleep(10);

  const second = await service.decide(buildPacket("npc-saturated", "overflow"));
  const metrics = service.getMailboxMetrics();

  assert.equal(second.meta.usedFallback, true);
  assert.equal(second.meta.reason, "runtime_actor_queue_saturated");
  assert.equal(second.meta.reasonCategory, "runtime");
  assert.equal(second.meta.warningTier, "attention");
  assert.equal(metrics.backpressureRejected, 1);
  assert.equal(metrics.actorQueueSaturated, 1);
  assert.equal(callCount, 1, "overflow request must not call broker");

  releaseFirst?.();
  await first;
});

test("global pending limit rejects cross-bot overload deterministically", async () => {
  let releaseFirst: (() => void) | undefined;
  let callCount = 0;

  const broker: CodexBroker = {
    async decide(packet) {
      callCount += 1;
      if (packet.recentEvents[0] === "hold") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return envelopeFromPacket(packet);
    },
  };

  const service = new DecisionService(broker, {
    maxBrokerInFlight: 1,
    maxPendingPerBot: 10,
    maxPendingGlobal: 1,
  });

  const first = service.decide(buildPacket("npc-global-1", "hold"));
  await sleep(10);
  const second = await service.decide(buildPacket("npc-global-2", "hold-second"));

  const metrics = service.getMailboxMetrics();
  const scheduler = service.getSchedulerSnapshot();

  assert.equal(second.meta.usedFallback, true);
  assert.equal(second.meta.reason, "runtime_global_queue_saturated");
  assert.equal(second.meta.reasonCategory, "runtime");
  assert.equal(metrics.backpressureRejected, 1);
  assert.equal(metrics.globalQueueSaturated, 1);
  assert.equal(callCount, 1, "global overflow request must not call broker");
  assert.equal(scheduler.global.maxPendingGlobal, 1);
  assert.ok(scheduler.global.pending >= 1);

  releaseFirst?.();
  await first;
});
