import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildProviderRouteProof,
  buildSameOrderProviderActionComparison,
  type SameOrderProviderActionFrame,
  type SameOrderProviderActionProposal,
} from "../../src/runtime/same-order-provider-action-comparison.js";

function loadPlayableSliceWithProviderComparison(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order provider action comparison preserves provider-off ledger outcomes", () => {
  const comparison = buildSameOrderProviderActionComparison();

  assert.equal(comparison.pass, true, JSON.stringify(comparison.failures, null, 2));
  assert.deepEqual(comparison.baselineRouteIds, comparison.providerRouteIds);

  const clean = comparison.providerProofs.find(proof => proof.routeId === "clean_cover");
  assert.ok(clean);
  assert.equal(clean.ledgerEventKinds.includes("queue_routine_kept"), true);
  assert.equal(clean.ledgerEventKinds.includes("public_routine_vouched"), true);
  assert.equal(clean.ledgerEventKinds.includes("local_tip_shared"), true);
  assert.equal(clean.finalObjectStates.store_queue_mark, "helped");
  assert.equal(clean.actionTrace.some(trace => trace.actorRole === "waiting_customer" && trace.affordance === "accept_routine"), true);
  assert.equal(clean.actionTrace.some(trace => trace.actorRole === "park_witness" && trace.affordance === "vouch_routine"), true);
  assert.equal(clean.actionTrace.some(trace => trace.actorRole === "waiting_customer" && trace.affordance === "share_local_tip"), true);

  const repair = comparison.providerProofs.find(proof => proof.routeId === "repair_recovered");
  assert.ok(repair);
  assert.equal(repair.ledgerEventKinds.includes("queue_repair_accepted"), true);
  assert.equal(repair.ledgerEventKinds.includes("public_repair_noted"), true);
  assert.equal(repair.finalObjectStates.store_queue_mark, "settled");
  assert.equal(repair.actionTrace.some(trace => trace.actorRole === "waiting_customer" && trace.affordance === "accept_repair"), true);
  assert.equal(repair.actionTrace.some(trace => trace.actorRole === "park_witness" && trace.affordance === "post_repair_notice"), true);

  const inquest = comparison.providerProofs.find(proof => proof.routeId === "inquest_opened");
  assert.ok(inquest);
  assert.deepEqual(inquest.ledgerEventKinds, [
    "store_receipt_marked",
    "store_exception_reported",
    "queue_delay_noted",
    "public_rumor_posted",
    "store_report_escalated",
    "station_record_cited",
    "queue_contact_refused",
  ]);
  assert.deepEqual(inquest.ledgerAffordances, [
    "mark_receipt",
    "place_note",
    "complain_delay",
    "post_rumor",
    "forward_report",
    "cite_record",
    "refuse_contact",
  ]);
  assert.equal(inquest.stationCitation?.citedLedgerEventKind, "store_report_escalated");
  const stationTrace = inquest.actionTrace.find(trace => trace.actorRole === "station_officer" && trace.affordance === "cite_record");
  assert.equal(stationTrace?.providerProposal.citedLedgerEventId, inquest.stationCitation?.citedLedgerEventId);
  assert.equal(inquest.actionTrace.every(trace =>
    trace.availableActions.some(action =>
      action.affordance === trace.affordance
      && action.objectId === trace.objectId
      && (!action.requiresLedgerEvent || action.citableLedgerEventIds.includes(trace.citedLedgerEventId ?? ""))
    )
  ), true);
  assert.equal(inquest.actionTrace.every(trace => trace.providerLine && trace.providerLine.length > 0), true);
});

test("playable slice evidence carries provider action comparison proof", () => {
  const artifact = loadPlayableSliceWithProviderComparison();
  const playability = artifact.playability as {
    providerActionComparison?: ReturnType<typeof buildSameOrderProviderActionComparison>;
  };
  const expected = buildSameOrderProviderActionComparison();

  assert.deepEqual(playability.providerActionComparison, JSON.parse(JSON.stringify(expected)));
  assert.equal(playability.providerActionComparison?.pass, true);
});

test("provider action proposal cannot select an unavailable affordance", () => {
  assert.throws(
    () => buildProviderRouteProof("soft_report", (frame: SameOrderProviderActionFrame): SameOrderProviderActionProposal => ({
      affordance: frame.stepId === "soft.manager.place_followup_note" ? "forward_report" : frame.availableActions[0].affordance,
      objectId: frame.stepId === "soft.manager.place_followup_note" ? "report_tray" : frame.availableActions[0].objectId,
      recordId: frame.availableActions[0].recordId,
      whyLine: "The provider tries to choose a route action from the current candidate set.",
    })),
    /unavailable action/,
  );
});

test("provider action proposal cannot smuggle state or authority fields", () => {
  assert.throws(
    () => buildProviderRouteProof("clean_cover", (frame: SameOrderProviderActionFrame) => ({
      affordance: frame.availableActions[0].affordance,
      objectId: frame.availableActions[0].objectId,
      whyLine: "The provider proposes text while trying to smuggle authority.",
      verdict: "detained",
      stationAttention: 100,
    } as unknown as SameOrderProviderActionProposal)),
    /unsupported field/,
  );
});
