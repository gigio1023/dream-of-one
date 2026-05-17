import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSameOrderProviderActionComparison } from "../../src/runtime/same-order-provider-action-comparison.js";
import {
  buildSameOrderProviderSchedulingReport,
  type SameOrderProviderSchedulingReport,
} from "../../src/runtime/same-order-provider-scheduling.js";

function loadPlayableSliceWithProviderScheduling(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order provider scheduling contract builds bounded role-agent jobs", () => {
  const report = buildSameOrderProviderSchedulingReport();

  assert.equal(report.contractPass, true, JSON.stringify(report.failures, null, 2));
  assert.equal(report.verdict, "SCHEDULING_CONTRACT_PASS_LIVE_GODOT_REQUIRED");
  assert.equal(report.liveGodotDispatchVerified, false);
  assert.equal(report.jobCount, 21);
  assert.deepEqual(report.routeIds, ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"]);
  assert.equal(report.jobs.every(job => job.allowedProviderFields.includes("npcLineCandidate")), true);
  assert.equal(report.jobs.every(job => job.forbiddenAuthorityFields.includes("verdict")), true);
  assert.equal(report.jobs.every(job => job.lockedAction.validation === "accepted"), true);
  assert.equal(report.jobs.every(job => job.promptContext.availableActions.length > 0), true);

  const stationJob = report.jobs.find(job => job.routeId === "inquest_opened" && job.actorRole === "station_officer");
  assert.ok(stationJob);
  assert.equal(stationJob.purpose, "station_intake_line");
  assert.equal(stationJob.dramaTone, "formal");
  assert.equal(stationJob.lockedAction.ledgerEventKind, "station_record_cited");
  assert.ok(stationJob.lockedAction.citedLedgerEventId);
  assert.deepEqual(stationJob.promptContext.recentLedgerEventKinds, [
    "store_receipt_marked",
    "store_exception_reported",
    "queue_delay_noted",
    "public_rumor_posted",
    "store_report_escalated",
  ]);
  assert.deepEqual(stationJob.promptContext.recentLedgerAffordances, [
    "mark_receipt",
    "place_note",
    "complain_delay",
    "post_rumor",
    "forward_report",
  ]);
  const citeRecord = stationJob.promptContext.availableActions.find(action => action.affordance === "cite_record");
  assert.ok(citeRecord);
  assert.equal(citeRecord.actionId, "station_dossier.cite_record");
  assert.equal(citeRecord.validationRuleId, "same_order.station_dossier.cite_record");
  assert.equal(citeRecord.preconditions.includes("known_store_ledger_event_required"), true);
  assert.equal(citeRecord.failureReasons.includes("station_citation_requires_store_record"), true);
});

test("playable slice evidence carries provider scheduling contract", () => {
  const artifact = loadPlayableSliceWithProviderScheduling();
  const playability = artifact.playability as {
    providerSchedulingPlan?: SameOrderProviderSchedulingReport;
  };
  const expected = buildSameOrderProviderSchedulingReport();

  assert.deepEqual(playability.providerSchedulingPlan, JSON.parse(JSON.stringify(expected)));
  assert.equal(playability.providerSchedulingPlan?.contractPass, true);
  assert.equal(playability.providerSchedulingPlan?.liveGodotDispatchVerified, false);
});

test("provider scheduling contract fails without deterministic fallback wording", () => {
  const comparison = buildSameOrderProviderActionComparison();
  comparison.providerProofs[0].actionTrace[0].providerLine = "";

  const report = buildSameOrderProviderSchedulingReport(comparison);

  assert.equal(report.contractPass, false);
  assert.equal(report.verdict, "SCHEDULING_CONTRACT_FAIL");
  assert.equal(report.failures.some(failure => failure.path === "jobs.fallbackLine"), true);
});

test("provider scheduling contract requires exact Station citation of the escalated Store report", () => {
  const comparison = buildSameOrderProviderActionComparison();
  const inquest = comparison.providerProofs.find(proof => proof.routeId === "inquest_opened");
  assert.ok(inquest);
  inquest.stationCitation = undefined;

  const report = buildSameOrderProviderSchedulingReport(comparison);

  assert.equal(report.contractPass, false);
  assert.equal(report.failures.some(failure => failure.path === "providerProofs.inquest_opened.stationCitation"), true);
});
