import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSameOrderAgenticRouteProofs,
  validateSameOrderAgenticRouteProofs,
} from "../../src/runtime/same-order-agentic-routes.js";
import {
  validateGodotEvidencePack,
  validateGodotEvidencePackSameOrderRouteProofs,
} from "../../src/godot/runtime-schema.js";

function loadPlayableSliceWithAgenticProofs(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order agentic route proofs cover clean, repair, soft report, and inquest ledger paths", () => {
  const proofs = buildSameOrderAgenticRouteProofs();
  const result = validateSameOrderAgenticRouteProofs(proofs);

  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.failures, null, 2));
  assert.deepEqual(
    proofs.map(proof => proof.routeId),
    ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"],
  );

  const clean = proofs.find(proof => proof.routeId === "clean_cover");
  assert.ok(clean);
  assert.deepEqual(clean.ledgerEventKinds, ["usual_order_cited", "store_sale_normal", "queue_routine_kept"]);
  assert.deepEqual(clean.ledgerAffordances, ["cite_expected_order", "create_receipt", "accept_routine"]);
  assert.equal(clean.finalObjectStates.receipt_tray, "normal");
  assert.equal(clean.finalObjectStates.store_queue_mark, "settled");
  assert.equal(clean.economyAfter.recordBurden, 0);
  assert.equal(
    clean.socialObservationTrace.some(observation =>
      observation.observerRole === "waiting_customer"
      && observation.observedActorRole === "store_clerk"
      && observation.observedAffordance === "create_receipt"
      && observation.resultingAffordance === "accept_routine"
    ),
    true,
  );

  const repair = proofs.find(proof => proof.routeId === "repair_recovered");
  assert.ok(repair);
  assert.equal(repair.ledgerEventKinds.includes("correction_offered"), true);
  assert.equal(repair.ledgerEventKinds.includes("store_sale_corrected"), true);
  assert.equal(repair.ledgerEventKinds.includes("queue_repair_accepted"), true);
  assert.equal(repair.finalObjectStates.store_queue_mark, "settled");
  assert.equal(
    repair.socialObservationTrace.some(observation =>
      observation.observerRole === "waiting_customer"
      && observation.observedActorRole === "store_clerk"
      && observation.observedAffordance === "attach_correction"
      && observation.resultingAffordance === "accept_repair"
    ),
    true,
  );
  assert.equal(repair.stationCitation, undefined);

  const softReport = proofs.find(proof => proof.routeId === "soft_report");
  assert.ok(softReport);
  assert.equal(softReport.actionTrace.some(trace => trace.actorRole === "store_manager"), true);
  assert.equal(softReport.ledgerEventKinds.includes("store_exception_reported"), true);
  assert.equal(softReport.ledgerEventKinds.includes("station_record_cited"), false);
  assert.equal(
    softReport.socialObservationTrace.some(observation =>
      observation.observerRole === "store_manager"
      && observation.observedActorRole === "store_clerk"
      && observation.observedAffordance === "place_note"
      && observation.resultingAffordance === "place_note"
      && observation.economyPressure.recordBurden >= 50
    ),
    true,
  );

  const inquest = proofs.find(proof => proof.routeId === "inquest_opened");
  assert.ok(inquest);
  assert.equal(inquest.stationCitation?.citedLedgerEventKind, "store_report_escalated");
  assert.deepEqual(inquest.ledgerAffordances, ["mark_receipt", "place_note", "complain_delay", "post_rumor", "forward_report", "cite_record"]);
  assert.deepEqual(
    inquest.socialObservationTrace.map(observation => [
      observation.observerRole,
      observation.observedActorRole,
      observation.observedAffordance,
      observation.resultingAffordance,
    ]),
    [
      ["waiting_customer", "store_clerk", "place_note", "complain_delay"],
      ["park_witness", "store_clerk", "place_note", "post_rumor"],
      ["store_manager", "store_clerk", "place_note", "forward_report"],
      ["station_officer", "store_manager", "forward_report", "cite_record"],
    ],
  );
  assert.equal(inquest.finalObjectStates.station_dossier, "cited");
  assert.equal(
    inquest.actionTrace.some(trace =>
      trace.actorRole === "station_officer"
      && trace.ledgerEventKind === "station_record_cited"
      && trace.citedLedgerEventId === inquest.stationCitation?.citedLedgerEventId
    ),
    true,
  );
});

test("Same Order agentic route proof validation rejects missing exact Station citation", () => {
  const proofs = buildSameOrderAgenticRouteProofs();
  const inquest = proofs.find(proof => proof.routeId === "inquest_opened");
  assert.ok(inquest);
  delete inquest.stationCitation;

  const result = validateSameOrderAgenticRouteProofs(proofs);

  assert.equal(result.ok, false);
  assert.equal(
    result.ok ? "" : result.failures.some(failure =>
      failure.routeId === "inquest_opened"
      && failure.path === "stationCitation"
      && failure.message.includes("exact Store ledger event")
    ),
    true,
  );
});

test("Same Order agentic route proof validation rejects missing NPC social observation evidence", () => {
  const proofs = buildSameOrderAgenticRouteProofs();
  const softReport = proofs.find(proof => proof.routeId === "soft_report");
  assert.ok(softReport);
  softReport.socialObservationTrace = [];

  const result = validateSameOrderAgenticRouteProofs(proofs);

  assert.equal(result.ok, false);
  assert.equal(
    result.ok ? "" : result.failures.some(failure =>
      failure.routeId === "soft_report"
      && failure.path === "socialObservationTrace"
      && failure.message.includes("manager acted from a visible clerk record")
    ),
    true,
  );
});

test("Generated playable slice includes Same Order agentic route proofs in the Godot Evidence Pack", () => {
  const artifact = loadPlayableSliceWithAgenticProofs();
  const pack = validateGodotEvidencePack(artifact);
  const routeProof = validateGodotEvidencePackSameOrderRouteProofs(artifact);
  const playability = artifact.playability as { agenticRouteProofs: ReturnType<typeof buildSameOrderAgenticRouteProofs> };
  const playableSummary = artifact.playableSummary as {
    recordObjects: Record<string, string>;
    civicEconomy: Record<string, number>;
    civicLedger: Array<Record<string, unknown>>;
    agentActionLog: Array<Record<string, unknown>>;
    worldRecordProps: Record<string, { state: string; label: string; visible: boolean; hasBody: boolean }>;
  };
  const agenticProof = validateSameOrderAgenticRouteProofs(playability.agenticRouteProofs);

  assert.equal(pack.ok, true, pack.ok ? undefined : JSON.stringify(pack.failures, null, 2));
  assert.equal(routeProof.ok, true, routeProof.ok ? undefined : JSON.stringify(routeProof.failures, null, 2));
  assert.equal(agenticProof.ok, true, agenticProof.ok ? undefined : JSON.stringify(agenticProof.failures, null, 2));
  assert.deepEqual(playability.agenticRouteProofs, JSON.parse(JSON.stringify(buildSameOrderAgenticRouteProofs())));
  assert.equal(playableSummary.recordObjects.receipt_tray, "marked");
  assert.equal(playableSummary.recordObjects.store_queue_mark, "disrupted");
  assert.equal(playableSummary.recordObjects.report_tray, "forwarded");
  assert.equal(playableSummary.recordObjects.station_dossier, "cited");
  assert.equal(playableSummary.recordObjects.park_notice_board, "rumored");
  assert.equal(playableSummary.civicEconomy.recordBurden, 85);
  assert.equal(playableSummary.civicEconomy.stationAttention, 70);
  assert.equal(playableSummary.civicLedger.length, 6);
  assert.equal(playableSummary.civicLedger.at(-1)?.kind, "station_record_cited");
  assert.equal(playableSummary.agentActionLog.length, playableSummary.civicLedger.length);
  assert.deepEqual(
    playableSummary.agentActionLog.map(action => action.ledgerEventKind),
    playableSummary.civicLedger.map(event => event.kind),
  );
  assert.equal(playableSummary.agentActionLog.every(action => action.accepted === true), true);
  assert.equal(playableSummary.agentActionLog.every(action =>
    Array.isArray(action.availableActions)
    && action.availableActions.some(candidate => {
      if (typeof candidate !== "object" || candidate === null) {
        return false;
      }
      const availableAction = candidate as Record<string, unknown>;
      const citableLedgerEventIds = availableAction.citableLedgerEventIds;
      return availableAction.objectId === action.objectId
        && availableAction.affordance === action.affordance
        && (
          availableAction.requiresLedgerEvent !== true
          || (Array.isArray(citableLedgerEventIds) && citableLedgerEventIds.includes(action.citedLedgerEventId))
        );
    })
  ), true);
  assert.equal(playableSummary.agentActionLog.every(action => typeof action.selectionReason === "string" && action.selectionReason.length > 0), true);
  assert.equal(playableSummary.agentActionLog.some(action => action.actorRole === "store_manager"), true);
  assert.equal(playableSummary.agentActionLog.some(action => action.actorRole === "waiting_customer" && action.affordance === "complain_delay"), true);
  assert.equal(playableSummary.agentActionLog.some(action => action.actorRole === "park_witness" && action.affordance === "post_rumor"), true);
  assert.equal(
    playability.agenticRouteProofs.some(proof =>
      proof.routeId === "inquest_opened"
      && proof.socialObservationTrace.some(observation =>
        observation.observerRole === "station_officer"
        && observation.observedActorRole === "store_manager"
        && observation.observedAffordance === "forward_report"
        && observation.resultingAffordance === "cite_record"
      )
    ),
    true,
  );
  assert.equal(playableSummary.agentActionLog.at(-1)?.actorRole, "station_officer");
  assert.equal(playableSummary.agentActionLog.at(-1)?.affordance, "cite_record");
  assert.equal(playableSummary.worldRecordProps.receipt_tray.state, "marked");
  assert.equal(playableSummary.worldRecordProps.store_queue_mark.state, "disrupted");
  assert.equal(playableSummary.worldRecordProps.park_notice_board.state, "rumored");
  assert.equal(playableSummary.worldRecordProps.report_tray.state, "forwarded");
  assert.equal(playableSummary.worldRecordProps.station_dossier.state, "cited");
  assert.equal(playableSummary.worldRecordProps.station_dossier.label.includes("인용"), true);
  assert.equal(playableSummary.worldRecordProps.civic_ledger.label.includes("6"), true);
  assert.equal(playableSummary.worldRecordProps.civic_economy_panel.state, "attention");
  assert.equal(playableSummary.worldRecordProps.civic_economy_panel.label.includes(String(playableSummary.civicEconomy.accountCredit)), true);
  assert.equal(playableSummary.worldRecordProps.civic_economy_panel.label.includes("85"), true);
  assert.equal(playableSummary.worldRecordProps.civic_economy_panel.label.includes("70"), true);
  assert.equal(Object.values(playableSummary.worldRecordProps).every(prop => prop.visible && prop.hasBody), true);
});
