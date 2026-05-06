import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GODOT_COORDINATE_SPACE,
  GODOT_SCHEMA_VERSION,
  GODOT_TIME_UNITS,
  validateGodotEvidenceEvent,
  validateGodotEvidencePack,
  validateGodotNpcCommandEnvelope,
  validateGodotObservationFrame,
  type GodotRuntimeContext,
} from "../../src/godot/runtime-schema.js";

const context: GodotRuntimeContext = {
  activeSessionId: "session-1",
  activeWorldId: "godot-main",
  worldRevision: "rev-social-stealth-v1",
  actorIds: ["npc-officer-1", "npc-clerk-1", "player"],
  landmarkIds: ["Store", "Studio", "Park", "Station"],
  zoneIds: ["station-report-desk", "store-counter"],
  textSurfaceIds: ["station-intake-notice", "store-queue-notice"],
  completedCommandIds: ["cmd-complete"],
  inFlightActorIds: [],
};

function buildObservation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: GODOT_SCHEMA_VERSION,
    sessionId: "session-1",
    worldId: "godot-main",
    worldRevision: "rev-social-stealth-v1",
    frameId: "frame-1",
    timestampMs: 1_775_000_000_000,
    deltaMs: 16,
    npcId: "npc-officer-1",
    playerId: "player",
    landmarkId: "Station",
    zoneId: "station-report-desk",
    position: { x: 1, y: 0, z: -2 },
    velocity: { x: 0, y: 0, z: 0 },
    nearbyActors: ["player", "npc-clerk-1"],
    visibleLandmarks: ["Station"],
    visibleTextSurfaces: [
      {
        id: "station-intake-notice",
        landmarkId: "Station",
        text: "State the procedural purpose of your visit.",
        dreamLawIds: ["DL_N1_PROCEDURE_SPEECH_ONLY"],
        coverTestIds: ["CT_STATION_SOFT_INQUEST"],
      },
    ],
    recentEvents: ["intake_started", "dossier_open"],
    organizationContext: { org: "Station", role: "Officer" },
    playerSignals: { speechAct: "SA_COMPLY", rawText: "I am here to file a normal report.", exposureDelta: 0 },
    socialLoopStage: "intake",
    exposure: { score: 45, thresholds: { stationInterest: 60, inquest: 80, verdict: 100 } },
    station: { intakeOpen: true, inquestOpen: true, verdictReady: false, sessionTerminationAllowed: false },
    evidence: [
      {
        id: "evidence-intake-1",
        type: "intake_dossier",
        stage: "intake",
        summary: "Officer opened intake dossier after Station report.",
      },
    ],
    ...overrides,
  };
}

function buildCommand(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: GODOT_SCHEMA_VERSION,
    commandId: "cmd-1",
    sessionId: "session-1",
    worldId: "godot-main",
    worldRevision: "rev-social-stealth-v1",
    npcId: "npc-officer-1",
    issuedAtMs: 1_775_000_000_010,
    timeoutMs: 2_000,
    actionType: "Talk",
    target: { actorId: "player" },
    utterance: "Please answer the intake question directly.",
    reasonCodes: ["station_intake_procedural_prompt"],
    expectedStage: "intake",
    source: "codex",
    ...overrides,
  };
}

test("Godot runtime units are explicit for 3D migration fixtures", () => {
  assert.equal(GODOT_COORDINATE_SPACE.unit, "meter");
  assert.equal(GODOT_COORDINATE_SPACE.axes.y, "up");
  assert.equal(GODOT_TIME_UNITS.timeoutMs, "milliseconds");
});

test("Godot ObservationFrame accepts a Station intake frame with text-pressure Evidence", () => {
  const result = validateGodotObservationFrame(buildObservation());

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.value.socialLoopStage : "", "intake");
  assert.equal(result.ok ? result.value.visibleTextSurfaces[0]?.dreamLawIds[0] : "", "DL_N1_PROCEDURE_SPEECH_ONLY");
  assert.equal(result.ok ? result.value.station.sessionTerminationAllowed : true, false);
});

test("Godot ObservationFrame rejects invalid player speech acts and verdict frames without why-lines", () => {
  const invalidSpeech = validateGodotObservationFrame(buildObservation({ playerSignals: { speechAct: "SA_UNKNOWN" } }));
  assert.equal(invalidSpeech.ok, false);
  assert.equal(
    invalidSpeech.ok ? "" : invalidSpeech.failures.some(failure => failure.reasonCode === "schema_invalid_player_speech_act"),
    true,
  );

  const invalidVerdict = validateGodotObservationFrame(
    buildObservation({
      socialLoopStage: "verdict",
      recentEvents: ["verdict_lucid_identified"],
      evidence: [{ id: "memo-1", type: "memo", stage: "report", summary: "A report without final why-line." }],
    }),
  );
  assert.equal(invalidVerdict.ok, false);
  assert.equal(
    invalidVerdict.ok ? "" : invalidVerdict.failures.some(failure => failure.reasonCode === "schema_invalid_end_state"),
    true,
  );
});

test("Godot NpcCommandEnvelope accepts bounded action commands with world identity checks", () => {
  const result = validateGodotNpcCommandEnvelope(buildCommand(), context);

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.value.actionType : "", "Talk");
  assert.equal(result.ok ? result.value.target.actorId : "", "player");
});

test("Godot NpcCommandEnvelope rejects session mismatch, duplicate command, and unknown targets", () => {
  const result = validateGodotNpcCommandEnvelope(
    buildCommand({
      commandId: "cmd-complete",
      sessionId: "wrong-session",
      target: { actorId: "unknown-player" },
    }),
    context,
  );

  assert.equal(result.ok, false);
  const reasonCodes = result.ok ? [] : result.failures.map(failure => failure.reasonCode);
  assert.equal(reasonCodes.includes("schema_session_mismatch"), true);
  assert.equal(reasonCodes.includes("schema_duplicate_command"), true);
  assert.equal(reasonCodes.includes("schema_unknown_actor"), true);
});

test("Godot NpcCommandEnvelope rejects action-specific target omissions before execution", () => {
  const result = validateGodotNpcCommandEnvelope(
    buildCommand({
      actionType: "Escort",
      target: { actorId: "player" },
    }),
    context,
  );

  assert.equal(result.ok, false);
  const reasonCodes = result.ok ? [] : result.failures.map(failure => failure.reasonCode);
  assert.equal(reasonCodes.includes("schema_invalid_action_target"), true);
});

test("Godot Evidence events require AI, command, fallback, and domain fields for parity", () => {
  const aiEvent = validateGodotEvidenceEvent({
    schemaVersion: GODOT_SCHEMA_VERSION,
    eventId: "event-ai-1",
    eventName: "decision_response_received",
    eventFamily: "ai",
    adapter: "godot",
    sessionId: "session-1",
    worldId: "godot-main",
    worldRevision: "rev-social-stealth-v1",
    timestampMs: 1_775_000_000_020,
    transport: "codex",
    threadId: "thread-npc-officer-1",
    usedFallback: false,
    summary: "Codex proposed a bounded Talk action.",
  });
  assert.equal(aiEvent.ok, true);

  const invalidFallback = validateGodotEvidenceEvent({
    schemaVersion: GODOT_SCHEMA_VERSION,
    eventId: "event-fallback-1",
    eventName: "fallback_selected",
    eventFamily: "fallback",
    adapter: "godot",
    sessionId: "session-1",
    worldId: "godot-main",
    worldRevision: "rev-social-stealth-v1",
    timestampMs: 1_775_000_000_030,
    usedFallback: true,
    summary: "Fallback was selected without a reason.",
  });
  assert.equal(invalidFallback.ok, false);
  assert.equal(
    invalidFallback.ok ? "" : invalidFallback.failures.some(failure => failure.reasonCode === "schema_invalid_evidence_pack"),
    true,
  );
});

test("Godot Evidence Pack validates release-comparable summaries and event identity", () => {
  const pack = validateGodotEvidencePack({
    schemaVersion: GODOT_SCHEMA_VERSION,
    runId: "godot-shell-run-1",
    adapter: "godot",
    sessionId: "session-1",
    worldId: "godot-main",
    worldRevision: "rev-social-stealth-v1",
    createdAtMs: 1_775_000_000_100,
    events: [
      {
        schemaVersion: GODOT_SCHEMA_VERSION,
        eventId: "event-domain-1",
        eventName: "verdict_reached",
        eventFamily: "domain",
        adapter: "godot",
        sessionId: "session-1",
        worldId: "godot-main",
        worldRevision: "rev-social-stealth-v1",
        timestampMs: 1_775_000_000_080,
        socialLoopStage: "verdict",
        summary: "Station verdict reached from intake dossier and why-line.",
      },
      {
        schemaVersion: GODOT_SCHEMA_VERSION,
        eventId: "event-export-1",
        eventName: "evidence_pack_created",
        eventFamily: "evidence_export",
        adapter: "godot",
        sessionId: "session-1",
        worldId: "godot-main",
        worldRevision: "rev-social-stealth-v1",
        timestampMs: 1_775_000_000_100,
        artifactPath: "data/evidence/godot/shell/dre_171_shell_evidence.json",
        summary: "Godot shell Evidence Pack exported.",
      },
    ],
    summaries: {
      runSignature: "run-godot-shell-1",
      actorSignatures: { "npc-officer-1": "actor-npc-officer-1" },
      fallbackCounters: { total: 0 },
      commandOutcomeCounts: { validated: 1, rejected: 0 },
      domainTriggerCounts: { verdict: 1 },
      verdictEndStateTrace: "Trigger -> Officer -> Dossier -> verdict -> warning",
      blockedChecks: ["godot_cli_missing"],
    },
  });

  assert.equal(pack.ok, true);
  assert.equal(pack.ok ? pack.value.summaries.blockedChecks[0] : "", "godot_cli_missing");
});

test("Generated playable slice Evidence Pack validates against backend schema", () => {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  const artifact = JSON.parse(readFileSync(artifactUrl, "utf8")) as unknown;
  const pack = validateGodotEvidencePack(artifact);

  assert.equal(pack.ok, true, pack.ok ? undefined : JSON.stringify(pack.failures, null, 2));
  assert.equal(pack.ok ? pack.value.runId : "", "dre-171-playable-slice-run");
  assert.equal(pack.ok ? pack.value.adapter : "", "godot");
  assert.equal(pack.ok ? pack.value.events.some(event => event.eventFamily === "evidence_export") : false, true);
});
