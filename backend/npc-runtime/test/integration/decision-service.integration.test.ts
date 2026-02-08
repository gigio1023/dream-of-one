import assert from "node:assert/strict";
import test from "node:test";

import { DecisionService } from "../../src/runtime/decision-service.js";
import type { CodexBroker } from "../../src/broker/codex-broker.js";
import { ReliabilityTelemetry } from "../../src/runtime/reliability-telemetry.js";

const noopBroker: CodexBroker = {
  async decide() {
    throw new Error("should not be called for invalid input");
  },
};

test("invalid PerceptionPacket returns deterministic fallback envelope", async () => {
  const telemetry = new ReliabilityTelemetry();
  const service = new DecisionService(noopBroker, telemetry);

  const response = await service.decide({ foo: "bar" });
  const metrics = telemetry.snapshot();

  assert.equal(response.meta.usedFallback, true);
  assert.equal(response.meta.transport, "fallback");
  assert.equal(response.intent.actionType, "Observe");
  assert.deepEqual(response.intent.reasonCodes, ["fallback:invalid_perception_packet"]);
  assert.equal(metrics.counters.decisionRequests, 1);
  assert.equal(metrics.counters.invalidPackets, 1);
  assert.equal(metrics.counters.fallbackResponses, 1);
});
