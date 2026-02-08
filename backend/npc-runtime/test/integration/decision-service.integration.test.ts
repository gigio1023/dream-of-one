import assert from "node:assert/strict";
import test from "node:test";

import { DecisionService } from "../../src/runtime/decision-service.js";
import type { CodexBroker } from "../../src/broker/codex-broker.js";

const noopBroker: CodexBroker = {
  async decide() {
    throw new Error("should not be called for invalid input");
  },
};

test("invalid PerceptionPacket returns deterministic fallback envelope", async () => {
  const service = new DecisionService(noopBroker);

  const response = await service.decide({ foo: "bar" });

  assert.equal(response.meta.usedFallback, true);
  assert.equal(response.meta.transport, "fallback");
  assert.equal(response.intent.actionType, "Observe");
  assert.deepEqual(response.intent.reasonCodes, ["fallback:invalid_perception_packet"]);
});
