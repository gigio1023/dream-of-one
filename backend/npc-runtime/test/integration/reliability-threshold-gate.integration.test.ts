import assert from "node:assert/strict";
import test from "node:test";

import { ReliabilityTelemetry } from "../../src/runtime/reliability-telemetry.js";
import { evaluateReliabilityThresholdGate } from "../../src/runtime/reliability-threshold-gate.js";

function recordRequests(telemetry: ReliabilityTelemetry, count: number): void {
  for (let i = 0; i < count; i++) {
    telemetry.recordDecisionRequest();
  }
}

function recordFallbacks(telemetry: ReliabilityTelemetry, count: number): void {
  for (let i = 0; i < count; i++) {
    telemetry.recordFallback();
  }
}

function recordFailures(telemetry: ReliabilityTelemetry, reason: string, count: number): void {
  for (let i = 0; i < count; i++) {
    telemetry.recordFailure(reason);
  }
}

test("reliability threshold gate passes when rates are within limits", () => {
  const telemetry = new ReliabilityTelemetry();
  recordRequests(telemetry, 20);
  recordFallbacks(telemetry, 4);
  recordFailures(telemetry, "codex_timeout", 2);
  recordFailures(telemetry, "parse_failure", 2);

  const result = evaluateReliabilityThresholdGate(telemetry.snapshot(), {
    fallbackRateMax: 0.3,
    timeoutRateMax: 0.2,
    parseFailureRateMax: 0.2,
  });

  assert.equal(result.pass, true, result.summary);
  assert.equal(result.status, "pass");
  assert.equal(result.violations.length, 0);
  assert.match(result.summary, /\[ReliabilityGate\] PASS/);
});

test("reliability threshold gate fails with explicit violation summary", () => {
  const telemetry = new ReliabilityTelemetry();
  recordRequests(telemetry, 12);
  recordFallbacks(telemetry, 7);
  recordFailures(telemetry, "codex_timeout", 4);
  recordFailures(telemetry, "parse_failure", 3);

  const result = evaluateReliabilityThresholdGate(telemetry.snapshot(), {
    fallbackRateMax: 0.3,
    timeoutRateMax: 0.25,
    parseFailureRateMax: 0.2,
  });

  assert.equal(result.pass, false, "Expected threshold gate to fail for elevated failure rates");
  assert.equal(result.status, "fail");
  assert.deepEqual(
    result.violations.map(violation => violation.metric).sort(),
    ["fallbackRate", "parseFailureRate", "timeoutRate"],
  );
  assert.match(result.summary, /\[ReliabilityGate\] FAIL/);
  assert.match(result.summary, /violations=/);
  assert.match(result.summary, /fallbackRate=/);
  assert.match(result.summary, /timeoutRate=/);
  assert.match(result.summary, /parseFailureRate=/);
});

test("reliability threshold gate reports insufficient sample before pass/fail evaluation", () => {
  const telemetry = new ReliabilityTelemetry();
  recordRequests(telemetry, 3);
  recordFallbacks(telemetry, 0);

  const result = evaluateReliabilityThresholdGate(telemetry.snapshot(), {
    minimumDecisions: 5,
    fallbackRateMax: 0.1,
    timeoutRateMax: 0.1,
    parseFailureRateMax: 0.1,
  });

  assert.equal(result.pass, false);
  assert.equal(result.status, "insufficient_sample");
  assert.equal(result.reason, "insufficient_sample");
  assert.equal(result.violations.length, 0);
  assert.match(result.summary, /\[ReliabilityGate\] INSUFFICIENT_SAMPLE/);
  assert.match(result.summary, /minimum=5/);
});
