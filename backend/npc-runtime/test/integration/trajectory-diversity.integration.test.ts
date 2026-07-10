import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  GODOT_SCHEMA_VERSION,
  validateGodotEvidencePackTrajectoryDiversity,
  type GodotEvidenceEvent,
  type GodotEvidencePack,
} from "../../src/godot/runtime-schema.js";

type TrajectoryKind = "safe" | "risky" | "verdict";

const WORLD_ID = "dre_171_godot_shell";
const WORLD_REVISION = "rev-social-stealth-v1";
const BASE_TIME_MS = 1_778_000_000_000;

const TRAJECTORIES: Record<
  TrajectoryKind,
  {
    eventName: string;
    stage: GodotEvidenceEvent["socialLoopStage"];
    reasonCode?: string;
    reasonCategory?: GodotEvidenceEvent["reasonCategory"];
    warningTier: GodotEvidenceEvent["warningTier"];
    commandOutcomeCounts: Record<string, number>;
    domainTriggerCounts: Record<string, number>;
    trace: string;
  }
> = {
  safe: {
    eventName: "cover_test_passed",
    stage: "report",
    warningTier: "reference",
    commandOutcomeCounts: { executed: 0, rejected: 0, validated: 1 },
    domainTriggerCounts: { cover_test_passed: 1 },
    trace: "Text surface read -> procedural answer -> Exposure 0 -> report remains open",
  },
  risky: {
    eventName: "cover_test_pressure",
    stage: "intake",
    reasonCode: "policy_station_intake_requires_procedural_speech",
    reasonCategory: "policy",
    warningTier: "attention",
    commandOutcomeCounts: { executed: 0, rejected: 1, validated: 0 },
    domainTriggerCounts: { cover_test_pressure: 1 },
    trace: "Text surface read -> risky answer -> Exposure 75 -> intake opens without verdict",
  },
  verdict: {
    eventName: "verdict_reached",
    stage: "verdict",
    reasonCode: "policy_station_evidence_threshold_met",
    reasonCategory: "policy",
    warningTier: "blocking",
    commandOutcomeCounts: { executed: 0, rejected: 0, validated: 0 },
    domainTriggerCounts: { verdict_reached: 1 },
    trace: "Text surface read -> repeated break -> Exposure 100 -> verdict ready -> termination allowed",
  },
};

function buildDomainEvent(kind: TrajectoryKind, runIndex: number): GodotEvidenceEvent {
  const trajectory = TRAJECTORIES[kind];
  return {
    schemaVersion: GODOT_SCHEMA_VERSION,
    eventId: `${kind}-domain-${runIndex}`,
    eventName: trajectory.eventName,
    eventFamily: "domain",
    adapter: "godot",
    sessionId: `${kind}-session-${runIndex}`,
    worldId: WORLD_ID,
    worldRevision: WORLD_REVISION,
    timestampMs: BASE_TIME_MS + runIndex,
    socialLoopStage: trajectory.stage,
    actorId: "NPC_Station_Officer",
    reasonCode: trajectory.reasonCode,
    reasonCategory: trajectory.reasonCategory,
    warningTier: trajectory.warningTier,
    summary: `${kind} trajectory domain event.`,
  };
}

function buildExportEvent(kind: TrajectoryKind, runIndex: number): GodotEvidenceEvent {
  return {
    schemaVersion: GODOT_SCHEMA_VERSION,
    eventId: `${kind}-export-${runIndex}`,
    eventName: "evidence_pack_created",
    eventFamily: "evidence_export",
    adapter: "godot",
    sessionId: `${kind}-session-${runIndex}`,
    worldId: WORLD_ID,
    worldRevision: WORLD_REVISION,
    timestampMs: BASE_TIME_MS + runIndex + 1,
    artifactPath: `data/evidence/godot/trajectory/${kind}-${runIndex}.json`,
    summary: `${kind} trajectory Evidence Pack exported.`,
  };
}

function buildEvidencePack(kind: TrajectoryKind, runIndex: number): GodotEvidencePack {
  const trajectory = TRAJECTORIES[kind];
  return {
    schemaVersion: GODOT_SCHEMA_VERSION,
    runId: `${kind}-run-${runIndex}`,
    adapter: "godot",
    sessionId: `${kind}-session-${runIndex}`,
    worldId: WORLD_ID,
    worldRevision: WORLD_REVISION,
    createdAtMs: BASE_TIME_MS + runIndex + 2,
    events: [buildDomainEvent(kind, runIndex), buildExportEvent(kind, runIndex)],
    summaries: {
      runSignature: `${kind}-run-${runIndex}:${WORLD_ID}:${WORLD_REVISION}`,
      actorSignatures: { NPC_Station_Officer: `${WORLD_ID}:NPC_Station_Officer:${trajectory.stage}` },
      fallbackCounters: { total: 0 },
      commandOutcomeCounts: trajectory.commandOutcomeCounts,
      domainTriggerCounts: trajectory.domainTriggerCounts,
      verdictEndStateTrace: trajectory.trace,
      blockedChecks: [],
    },
  };
}

function identityOnlyCopy(pack: GodotEvidencePack, runIndex: number): GodotEvidencePack {
  const copy = JSON.parse(JSON.stringify(pack)) as GodotEvidencePack;
  copy.runId = `identity-only-run-${runIndex}`;
  copy.sessionId = `identity-only-session-${runIndex}`;
  copy.createdAtMs = BASE_TIME_MS + 100 + runIndex;
  copy.summaries.runSignature = `${copy.runId}:${copy.sessionId}:${WORLD_ID}:${WORLD_REVISION}`;
  copy.events = copy.events.map((event, eventIndex) => ({
    ...event,
    eventId: `identity-only-event-${runIndex}-${eventIndex}`,
    sessionId: copy.sessionId,
    timestampMs: BASE_TIME_MS + 100 + runIndex + eventIndex,
    artifactPath: event.artifactPath ? `data/evidence/godot/trajectory/identity-only-${runIndex}.json` : undefined,
  }));
  return copy;
}

test("Godot Evidence Pack trajectory diversity passes for safe, risky, and verdict trajectories", () => {
  const result = validateGodotEvidencePackTrajectoryDiversity([
    buildEvidencePack("safe", 1),
    buildEvidencePack("risky", 2),
    buildEvidencePack("verdict", 3),
  ]);

  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.failures, null, 2));
  assert.equal(result.ok ? result.value.runCount : 0, 3);
  assert.equal(result.ok ? result.value.distinctTrajectories : 0, 3);
  assert.equal(result.ok ? result.value.pass : false, true);
});

test("Godot Evidence Pack trajectory diversity fails for behaviorally identical three-run evidence", () => {
  const riskyPack = buildEvidencePack("risky", 1);
  const result = validateGodotEvidencePackTrajectoryDiversity([
    identityOnlyCopy(riskyPack, 1),
    identityOnlyCopy(riskyPack, 2),
    identityOnlyCopy(riskyPack, 3),
  ]);

  assert.equal(result.ok, false, "Expected identical trajectories to fail diversity verification");
  assert.match(JSON.stringify(result.ok ? [] : result.failures), /behaviorally distinct social trajectories/);
});
