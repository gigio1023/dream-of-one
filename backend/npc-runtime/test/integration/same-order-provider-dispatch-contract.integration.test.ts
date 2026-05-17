import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSameOrderProviderDispatchContractReport,
  buildSameOrderProviderDispatchPacket,
  type SameOrderProviderDispatchContractReport,
} from "../../src/runtime/same-order-provider-dispatch-contract.js";
import { buildSameOrderProviderSchedulingReport } from "../../src/runtime/same-order-provider-scheduling.js";
import { parsePerceptionPacket, SchemaValidationError } from "../../src/runtime/schema.js";

function loadPlayableSliceWithProviderDispatchContract(): Record<string, unknown> {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  return JSON.parse(readFileSync(artifactUrl, "utf8")) as Record<string, unknown>;
}

test("Same Order provider dispatch contract builds backend decision packets for scheduled jobs", () => {
  const report = buildSameOrderProviderDispatchContractReport();

  assert.equal(report.contractPass, true, JSON.stringify(report.failures, null, 2));
  assert.equal(report.verdict, "DISPATCH_PACKET_CONTRACT_PASS_LIVE_HTTP_REQUIRED");
  assert.equal(report.liveHttpDispatchVerified, false);
  assert.equal(report.endpoint, "/v1/npc/decision");
  assert.equal(report.jobCount, 19);
  assert.equal(report.packetProofs.every(proof => proof.schemaPass && proof.boundedBehaviorPass), true);
  assert.equal(report.packetProofs.every(proof => proof.packet.organizationContext.authorityBoundary === "provider_writes_wording_only_runtime_locks_action"), true);

  const stationProof = report.packetProofs.find(proof => proof.routeId === "inquest_opened" && proof.actorRole === "station_officer");
  assert.ok(stationProof);
  assert.equal(stationProof.packet.landmarkId, "Station");
  assert.equal(stationProof.actionType, "Ask");
  assert.equal(stationProof.socialLoopStage, "intake");
  assert.equal(stationProof.packet.playerSignals.speechAct, "SA_FRAME");
  assert.deepEqual(stationProof.packet.organizationContext.recentLedgerAffordances, [
    "mark_receipt",
    "place_note",
    "complain_delay",
    "post_rumor",
    "forward_report",
  ]);
  const stationActions = stationProof.packet.organizationContext.availableActions as Array<Record<string, unknown>>;
  assert.equal(stationActions.some(action =>
    action.actionId === "station_dossier.cite_record"
    && action.validationRuleId === "same_order.station_dossier.cite_record"
  ), true);
  assert.equal(stationProof.packet.recentEvents.includes("store_report_escalated:forward_report"), true);
  assert.equal(stationProof.packet.recentEvents.includes("station_inquest_opened"), true);
});

test("playable slice evidence carries provider dispatch contract", () => {
  const artifact = loadPlayableSliceWithProviderDispatchContract();
  const playability = artifact.playability as {
    providerDispatchContract?: SameOrderProviderDispatchContractReport;
  };
  const expected = buildSameOrderProviderDispatchContractReport();

  assert.deepEqual(playability.providerDispatchContract, JSON.parse(JSON.stringify(expected)));
  assert.equal(playability.providerDispatchContract?.contractPass, true);
  assert.equal(playability.providerDispatchContract?.liveHttpDispatchVerified, false);
});

test("provider dispatch packet remains schema-safe and rejects caller-authored conversation authority", () => {
  const scheduling = buildSameOrderProviderSchedulingReport();
  const packet = buildSameOrderProviderDispatchPacket(scheduling.jobs[0]);

  assert.equal(parsePerceptionPacket(packet).npcId, scheduling.jobs[0].actorId);
  assert.throws(
    () => parsePerceptionPacket({
      ...packet,
      conversation: {
        ...packet.conversation,
        suspicionAfter: 100,
      },
    }),
    SchemaValidationError,
  );
});

test("provider dispatch contract fails when scheduling no longer passes", () => {
  const scheduling = buildSameOrderProviderSchedulingReport();
  scheduling.contractPass = false;

  const report = buildSameOrderProviderDispatchContractReport(scheduling);

  assert.equal(report.contractPass, false);
  assert.equal(report.verdict, "DISPATCH_PACKET_CONTRACT_FAIL");
  assert.equal(report.failures.some(failure => failure.path === "providerScheduling.contractPass"), true);
});
