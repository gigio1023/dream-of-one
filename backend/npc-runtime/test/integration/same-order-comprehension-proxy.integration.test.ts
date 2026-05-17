import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSameOrderComprehensionProxyReport,
} from "../../src/runtime/same-order-comprehension-proxy.js";

function loadPlayableSlice(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order playable evidence passes the comprehension proxy but keeps external blocker open", () => {
  const artifact = loadPlayableSlice();
  const report = buildSameOrderComprehensionProxyReport(artifact);

  assert.equal(report.pass, true, JSON.stringify(report.checks, null, 2));
  assert.equal(report.verdict, "PROXY_PASS_EXTERNAL_REQUIRED");
  assert.equal(report.externalBlockerClosed, false);
  assert.deepEqual(report.routeIds, ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"]);
  assert.equal(report.checks.every(check => check.proxyResult === "pass"), true);
  assert.equal(report.checks.find(check => check.id === "C6")?.label, "Validated action trail remains readable");
  assert.equal(report.checks.find(check => check.id === "C6")?.externalRequired, false);
  assert.equal(report.checks.find(check => check.id === "C7")?.externalRequired, true);
});

test("playable slice evidence carries the generated comprehension proxy report", () => {
  const artifact = loadPlayableSlice();
  const playability = artifact.playability as {
    comprehensionProxy?: ReturnType<typeof buildSameOrderComprehensionProxyReport>;
  };
  const expected = buildSameOrderComprehensionProxyReport(artifact);

  assert.deepEqual(playability.comprehensionProxy, JSON.parse(JSON.stringify(expected)));
});

test("comprehension proxy fails if risky Station inquest route is missing", () => {
  const artifact = loadPlayableSlice();
  const playability = artifact.playability as { routeProofs: Array<Record<string, unknown>> };
  playability.routeProofs = playability.routeProofs.filter(route => route.routeId !== "inquest_opened");

  const report = buildSameOrderComprehensionProxyReport(artifact);

  assert.equal(report.pass, false);
  assert.equal(report.checks.find(check => check.id === "C1")?.proxyResult, "fail");
  assert.equal(report.checks.find(check => check.id === "C5")?.proxyResult, "fail");
});
