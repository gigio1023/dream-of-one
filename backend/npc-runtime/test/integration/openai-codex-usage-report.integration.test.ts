import assert from "node:assert/strict";
import test from "node:test";

import { buildOpenAiCodexLiveUsageReport } from "../../src/tools/report-openai-codex-live-usage.js";

test("OpenAI Codex usage report accounts for ledger and Godot live artifacts without spending", () => {
  const report = buildOpenAiCodexLiveUsageReport();

  assert.equal(report.status, "pass");
  assert.equal(report.spendsLiveBudget, false);
  assert.equal(report.provider, "openai-codex");
  assert.deepEqual(report.models, ["gpt-5.4-mini"]);
  assert.equal(report.reasoningEffort, "low");
  assert.equal(report.chatGptProQuotaRemaining, "not_exposed_by_codex_response");

  assert.equal(report.artifacts.length, 6);
  assert.equal(report.artifacts.filter(artifact => artifact.sourceType === "ledger").length, 4);
  assert.equal(report.artifacts.filter(artifact => artifact.sourceType === "artifact").length, 2);
  assert.equal(report.artifacts.every(artifact => artifact.usedFallback === false), true);

  assert.equal(report.totals.requestCount, 9);
  assert.equal(report.totals.totalEstimatedCostUsd, 0.036969749999999996);
  assert.equal(report.totals.totalActualInputTokens, 9489);
  assert.equal(report.totals.totalActualOutputTokens, 2021);
  assert.equal(report.totals.totalActualTokens, 11510);
});
