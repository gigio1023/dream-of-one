import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSameOrderStoryletRuntimeMapReport,
  type SameOrderStoryletRuntimeMapReport,
} from "../../src/runtime/same-order-storylet-runtime-map.js";
import { buildSameOrderProviderSchedulingReport } from "../../src/runtime/same-order-provider-scheduling.js";

function loadPlayableSliceWithStoryletRuntimeMap(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order storylet runtime map binds beats to route actions and provider jobs", () => {
  const report = buildSameOrderStoryletRuntimeMapReport();

  assert.equal(report.contractPass, true, JSON.stringify(report.failures, null, 2));
  assert.equal(report.verdict, "STORYLET_RUNTIME_MAP_PASS");
  assert.equal(report.beatCount, 4);
  assert.deepEqual(report.routeIds, ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"]);

  const routine = report.beats.find(beat => beat.beatId === "routine_assumption");
  assert.ok(routine);
  assert.equal(routine.promptId, "store.same_order.routine");
  assert.equal(routine.choiceSetId, "store.same_order.routine.choices");
  assert.equal(routine.actionStepIds.includes("clean.clerk.create_receipt"), true);
  assert.equal(routine.providerJobIds.includes("clean_cover.clean.clerk.create_receipt.provider-action-proposal"), true);

  const handoff = report.beats.find(beat => beat.beatId === "social_handoff");
  assert.ok(handoff);
  assert.deepEqual(handoff.routeIds, ["soft_report", "inquest_opened"]);
  assert.equal(handoff.actionStepIds.includes("soft.manager.pause_service"), true);
  assert.equal(handoff.providerJobIds.includes("soft_report.soft.manager.pause_service.provider-action-proposal"), true);
  assert.equal(handoff.actionStepIds.includes("soft.waiting_customer.leave_queue"), true);
  assert.equal(handoff.providerJobIds.includes("soft_report.soft.waiting_customer.leave_queue.provider-action-proposal"), true);
  assert.equal(handoff.actionStepIds.includes("inquest.manager.forward_report"), true);
  assert.equal(handoff.providerJobIds.includes("inquest_opened.inquest.manager.forward_report.provider-action-proposal"), true);

  const station = report.beats.find(beat => beat.beatId === "station_reconciliation");
  assert.ok(station);
  assert.equal(station.providerPurpose, "mixed");
  assert.deepEqual(station.ledgerEventKinds, ["station_record_cited", "queue_contact_refused"]);
  assert.deepEqual(station.affordances, ["cite_record", "refuse_contact"]);
  assert.equal(station.actionStepIds[0], "inquest.station.cite_store_report");
  assert.equal(station.actionStepIds[1], "inquest.waiting_customer.refuse_contact");
  assert.equal(station.providerJobIds[0], "inquest_opened.inquest.station.cite_store_report.provider-action-proposal");
  assert.equal(station.providerJobIds[1], "inquest_opened.inquest.waiting_customer.refuse_contact.provider-action-proposal");
});

test("Same Order storylet runtime map fails when a provider job disappears", () => {
  const providerScheduling = buildSameOrderProviderSchedulingReport();
  const report = buildSameOrderStoryletRuntimeMapReport({
    providerScheduling: { ...providerScheduling, jobs: [] },
  });

  assert.equal(report.contractPass, false);
  assert.equal(report.failures.some(failure => failure.path === "beats.providerJobIds"), true);
});

test("playable slice evidence carries storylet runtime map", () => {
  const artifact = loadPlayableSliceWithStoryletRuntimeMap();
  const playability = artifact.playability as {
    storyletRuntimeMap?: SameOrderStoryletRuntimeMapReport;
  };
  const expected = buildSameOrderStoryletRuntimeMapReport();

  assert.deepEqual(playability.storyletRuntimeMap, JSON.parse(JSON.stringify(expected)));
  assert.equal(playability.storyletRuntimeMap?.contractPass, true);
});
