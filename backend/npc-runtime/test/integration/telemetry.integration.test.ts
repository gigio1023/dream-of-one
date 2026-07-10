import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { test } from "bun:test";
import type { DecisionEnvelope } from "../../src/contracts/types.js";
import { RuntimeTelemetryCollector } from "../../src/runtime/telemetry.js";

type MailboxMetrics = Parameters<RuntimeTelemetryCollector["recordDecisionCycle"]>[0]["mailbox"];

function buildDecision(overrides: Partial<DecisionEnvelope> = {}): DecisionEnvelope {
  return {
    intent: {
      npcId: "npc-1",
      actionType: "Talk",
      utterance: "Queue procedure confirmed.",
      reasonCodes: ["store_report"],
      confidence: 0.9,
    },
    meta: {
      usedFallback: false,
      reasonCategory: "none",
      warningTier: "reference",
      transport: "codex",
      threadId: "thread-npc-1",
      socialLoopStage: "report",
      playerSpeechAct: "SA_COMPLY",
    },
    ...overrides,
  };
}

function buildMailbox(overrides: Partial<MailboxMetrics> = {}): MailboxMetrics {
  return {
    queued: 0,
    inflight: 0,
    coalesced: 0,
    dropped: 0,
    skippedBeforeBroker: 0,
    cancelled: 0,
    deadlineExceeded: 0,
    globalCap: 4,
    globalInFlight: 0,
    globalQueued: 0,
    backpressureRejected: 0,
    actorQueueSaturated: 0,
    globalQueueSaturated: 0,
    perBotPendingLimit: 8,
    globalPendingLimit: 128,
    currentGlobalPending: 0,
    ...overrides,
  };
}

function buildTrajectoryRun(
  stages: ReadonlyArray<NonNullable<DecisionEnvelope["meta"]["socialLoopStage"]>>,
): { runSignature: string; actorSignature: string } {
  const collector = new RuntimeTelemetryCollector({ maxRecords: 1000 });
  stages.forEach((stage, index) => {
    collector.recordDecisionCycle({
      requestId: `run-${index + 1}`,
      sessionId: "trajectory-session",
      npcId: "trajectory-npc",
      deadlineMs: 2000,
      latencyMs: 10 + index,
      decision: buildDecision({
        meta: {
          usedFallback: false,
          reasonCategory: "none",
          warningTier: "reference",
          transport: "codex",
          threadId: "thread-trajectory",
          socialLoopStage: stage,
          playerSpeechAct: "SA_COMPLY",
        },
      }),
      mailbox: buildMailbox({ currentGlobalPending: 1 }),
    });
  });
  const evidence = collector.buildEvidencePack();
  assert.equal(evidence.trajectorySummary.actorSignatures.length, 1);
  return {
    runSignature: evidence.trajectorySummary.runSignature,
    actorSignature: evidence.trajectorySummary.actorSignatures[0]!.signature,
  };
}

test("telemetry collector builds evidence summary for Godot observations and decisions", () => {
  const collector = new RuntimeTelemetryCollector({ maxRecords: 1000 });
  collector.recordGodotObservation({
    sessionId: "session-1",
    kind: "world",
    eventName: "observation_frame_emitted",
    payload: {
      position: { x: 1, y: 0, z: 1 },
    },
  });
  collector.recordGodotObservation({
    sessionId: "session-1",
    npcId: "npc-1",
    kind: "action",
    eventName: "command_executed",
    payload: {
      targetPosition: { x: 2, y: 0, z: 2 },
    },
  });
  collector.recordDecisionCycle({
    requestId: "req-1",
    sessionId: "session-1",
    npcId: "npc-1",
    deadlineMs: 2000,
    latencyMs: 12.5,
    decision: buildDecision(),
    mailbox: buildMailbox({
      queued: 1,
      globalInFlight: 1,
      currentGlobalPending: 1,
    }),
    dispatchResult: {
      actionId: "req-1",
      actionType: "Talk",
      result: {
        ok: true,
        actionId: "req-1",
        evidence: { eventName: "command_executed" },
      },
    },
  });

  const evidence = collector.buildEvidencePack();
  assert.equal(evidence.totalRecords, 3);
  assert.equal(evidence.countsByType.godot_observation, 2);
  assert.equal(evidence.countsByType.decision_cycle, 1);
  assert.equal(evidence.godotObservationSummary.worldEvents, 1);
  assert.equal(evidence.godotObservationSummary.actionEvents, 1);
  assert.equal(evidence.godotObservationSummary.nearbyNpcObservations, 2);
  assert.equal(evidence.decisionSummary.total, 1);
  assert.equal(evidence.decisionSummary.fallbackCount, 0);
  assert.equal(evidence.decisionSummary.socialLoopStage.report, 1);
  assert.equal(evidence.decisionSummary.actionSuccess, 1);
  assert.equal(evidence.trajectorySummary.decisionCycles, 1);
  assert.equal(evidence.trajectorySummary.actorSignatures.length, 1);
  assert.equal(evidence.trajectorySummary.actorSignatures[0]?.sessionId, "session-1");
  assert.equal(evidence.trajectorySummary.actorSignatures[0]?.npcId, "npc-1");
  assert.match(evidence.trajectorySummary.runSignature, /^[a-f0-9]{64}$/);
});

test("telemetry collector computes deterministic session/npc trajectory signatures", () => {
  const collector = new RuntimeTelemetryCollector({ maxRecords: 1000 });
  collector.recordDecisionCycle({
    requestId: "req-a",
    sessionId: "session-signature",
    npcId: "npc-1",
    deadlineMs: 2000,
    latencyMs: 10,
    decision: buildDecision(),
    mailbox: buildMailbox({ currentGlobalPending: 1 }),
  });
  collector.recordDecisionCycle({
    requestId: "req-b",
    sessionId: "session-signature",
    npcId: "npc-1",
    deadlineMs: 2000,
    latencyMs: 11,
    decision: buildDecision({
      meta: {
        usedFallback: false,
        reasonCategory: "none",
        warningTier: "reference",
        transport: "codex",
        threadId: "thread-npc-1",
        socialLoopStage: "verdict",
        playerSpeechAct: "SA_INQUIRE",
      },
    }),
    mailbox: buildMailbox({ currentGlobalPending: 1 }),
  });
  collector.recordDecisionCycle({
    requestId: "req-c",
    sessionId: "session-signature",
    npcId: "npc-2",
    deadlineMs: 2000,
    latencyMs: 12,
    decision: buildDecision({
      intent: {
        npcId: "npc-2",
        actionType: "Report",
        reasonCodes: ["station_report"],
        confidence: 0.85,
      },
    }),
    mailbox: buildMailbox({ currentGlobalPending: 1 }),
  });

  const firstPass = collector.buildEvidencePack().trajectorySummary;
  const secondPass = collector.buildEvidencePack().trajectorySummary;
  assert.deepEqual(secondPass, firstPass);
  assert.equal(firstPass.actorSignatures.length, 2);
  assert.equal(firstPass.actorSignatures[0]?.sessionId, "session-signature");
  assert.equal(firstPass.actorSignatures[0]?.npcId, "npc-1");
  assert.equal(firstPass.actorSignatures[0]?.decisions, 2);
  assert.equal(firstPass.actorSignatures[1]?.sessionId, "session-signature");
  assert.equal(firstPass.actorSignatures[1]?.npcId, "npc-2");
  assert.equal(firstPass.actorSignatures[1]?.decisions, 1);
});

test("trajectory evidence differentiates three non-identical social trajectories", () => {
  const runOne = buildTrajectoryRun(["report", "intake", "verdict"]);
  const runTwo = buildTrajectoryRun(["report", "verdict", "intake"]);
  const runThree = buildTrajectoryRun(["ambient", "report", "verdict"]);
  assert.equal(new Set([runOne.runSignature, runTwo.runSignature, runThree.runSignature]).size, 3);
  assert.equal(new Set([runOne.actorSignature, runTwo.actorSignature, runThree.actorSignature]).size, 3);
});

test("telemetry collector exports evidence pack JSON file", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-evidence-"));
  const collector = new RuntimeTelemetryCollector({
    evidenceOutputDir: tempDir,
  });
  collector.recordDecisionCycle({
    requestId: "req-2",
    sessionId: "session-2",
    npcId: "npc-2",
    deadlineMs: 2500,
    latencyMs: 10,
    decision: buildDecision({
      meta: {
        usedFallback: true,
        reason: "policy_utterance_empty",
        reasonCategory: "policy",
        warningTier: "blocking",
        transport: "fallback",
        socialLoopStage: "intake",
      },
    }),
    mailbox: buildMailbox(),
  });

  const outputPath = await collector.writeEvidencePack("pack.json");
  const content = await readFile(outputPath, "utf8");
  const parsed = JSON.parse(content) as {
    decisionSummary: { fallbackCount: number };
    trajectorySummary: {
      runSignature: string;
      actorSignatures: Array<{ sessionId: string; npcId: string; decisions: number }>;
    };
  };

  assert.equal(parsed.decisionSummary.fallbackCount, 1);
  assert.match(parsed.trajectorySummary.runSignature, /^[a-f0-9]{64}$/);
  assert.equal(parsed.trajectorySummary.actorSignatures[0]?.sessionId, "session-2");
  assert.equal(parsed.trajectorySummary.actorSignatures[0]?.npcId, "npc-2");
  assert.equal(parsed.trajectorySummary.actorSignatures[0]?.decisions, 1);

  const traversalName = `../${randomUUID()}.json`;
  const traversalOutputPath = await collector.writeEvidencePack(traversalName);
  const traversalRelative = relative(tempDir, traversalOutputPath);
  assert.equal(traversalRelative, traversalName.slice(3));
  assert.equal(traversalRelative.startsWith(".."), false);
  assert.equal(isAbsolute(traversalRelative), false);

  const absoluteName = join(tmpdir(), `${randomUUID()}.json`);
  const absoluteOutputPath = await collector.writeEvidencePack(absoluteName);
  const absoluteRelative = relative(tempDir, absoluteOutputPath);
  assert.equal(absoluteRelative.startsWith(".."), false);
  assert.equal(isAbsolute(absoluteRelative), false);
  await rm(tempDir, { recursive: true, force: true });
});
