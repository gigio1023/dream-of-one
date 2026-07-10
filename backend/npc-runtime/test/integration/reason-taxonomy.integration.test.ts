import assert from "node:assert/strict";
import { test } from "bun:test";

import { annotateDecisionMeta, classifyReasonCategory, classifyWarningTier, normalizeReasonCode } from "../../src/policy/reason-taxonomy.js";

test("normalizeReasonCode strips detail suffix after colon", () => {
  assert.equal(normalizeReasonCode("runtime_http_error:502:Bad Gateway"), "runtime_http_error");
  assert.equal(normalizeReasonCode("  codex_timeout "), "codex_timeout");
});

test("reason category and warning tier mapping are deterministic", () => {
  assert.equal(classifyReasonCategory("policy_reject_non_codex_path"), "policy");
  assert.equal(classifyReasonCategory("invalid_perception_packet"), "schema");
  assert.equal(classifyReasonCategory("decision_deadline_exceeded"), "timeout");
  assert.equal(classifyReasonCategory("request_cancelled"), "cancelled");
  assert.equal(classifyReasonCategory("parse_failure"), "parse");
  assert.equal(classifyReasonCategory("tool_failure"), "tool");
  assert.equal(classifyReasonCategory("runtime_parse_error"), "parse");
  assert.equal(classifyWarningTier(true, "policy_reject_non_codex_path"), "blocking");
  assert.equal(classifyWarningTier(true, "codex_timeout"), "attention");
  assert.equal(classifyWarningTier(false, undefined), "reference");
});

test("annotateDecisionMeta enriches envelope metadata", () => {
  const codexEnvelope = annotateDecisionMeta({
    intent: {
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["ok"],
      confidence: 1,
    },
    meta: {
      usedFallback: false,
      transport: "codex",
      threadId: "thread-1",
    },
  });
  assert.equal(codexEnvelope.meta.reasonCategory, "none");
  assert.equal(codexEnvelope.meta.warningTier, "reference");

  const fallbackEnvelope = annotateDecisionMeta({
    intent: {
      npcId: "npc-1",
      actionType: "Observe",
      reasonCodes: ["fallback:runtime_http_error"],
      confidence: 0,
    },
    meta: {
      usedFallback: true,
      reason: "runtime_http_error:503:backend unavailable",
      transport: "fallback",
    },
  });
  assert.equal(fallbackEnvelope.meta.reason, "runtime_http_error");
  assert.equal(fallbackEnvelope.meta.reasonCategory, "runtime");
  assert.equal(fallbackEnvelope.meta.warningTier, "attention");
});
