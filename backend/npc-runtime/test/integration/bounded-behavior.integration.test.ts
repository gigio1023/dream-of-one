import assert from "node:assert/strict";
import test from "node:test";
import type { DecisionEnvelope, PerceptionPacket } from "../../src/contracts/types.js";
import { enforceBoundedBehavior } from "../../src/runtime/bounded-behavior.js";

function buildPacket(overrides: Partial<PerceptionPacket> = {}): PerceptionPacket {
  return {
    sessionId: "session-1",
    npcId: "npc-1",
    landmarkId: "Store",
    nearbyActors: ["player", "npc-2"],
    recentEvents: ["report_created"],
    organizationContext: { org: "Store" },
    playerSignals: { speechAct: "SA_COMPLY" },
    ...overrides,
  };
}

function buildDecision(overrides: Partial<DecisionEnvelope> = {}): DecisionEnvelope {
  return {
    intent: {
      npcId: "npc-1",
      actionType: "Talk",
      utterance: "Please follow the queue procedure.",
      reasonCodes: ["store_procedure"],
      confidence: 0.8,
      command: "chat",
      commandArgs: { message: "Please follow the queue procedure." },
    },
    meta: {
      usedFallback: false,
      transport: "codex",
      threadId: "thread-npc-1",
    },
    ...overrides,
  };
}

test("bounded behavior keeps valid decision and annotates social loop stage", () => {
  const evaluated = enforceBoundedBehavior(buildPacket(), buildDecision());

  assert.equal(evaluated.appliedFallback, false);
  assert.equal(evaluated.socialLoop.stage, "report");
  assert.equal(evaluated.socialLoop.nearbyNpcCount, 1);
  assert.equal(evaluated.commandType, "chat");
  assert.equal(evaluated.decision.meta.socialLoopStage, "report");
  assert.equal(evaluated.decision.meta.playerSpeechAct, "SA_COMPLY");
  assert.equal(evaluated.decision.meta.warningTier, "reference");
});

test("bounded behavior rejects invalid player speech act deterministically", () => {
  const evaluated = enforceBoundedBehavior(
    buildPacket({ playerSignals: { speechAct: "SA_UNKNOWN" } }),
    buildDecision(),
  );

  assert.equal(evaluated.appliedFallback, true);
  assert.equal(evaluated.decision.meta.usedFallback, true);
  assert.equal(evaluated.decision.meta.reason, "policy_invalid_player_speech_act");
  assert.equal(evaluated.decision.meta.reasonCategory, "policy");
  assert.equal(evaluated.decision.meta.warningTier, "blocking");
});

test("bounded behavior rejects disallowed command for action type", () => {
  const evaluated = enforceBoundedBehavior(
    buildPacket(),
    buildDecision({
      intent: {
        ...buildDecision().intent,
        actionType: "Move",
        command: "dig",
        commandArgs: {},
      },
    }),
  );

  assert.equal(evaluated.appliedFallback, true);
  assert.equal(evaluated.decision.meta.reason, "policy_command_not_allowed");
  assert.equal(evaluated.decision.meta.reasonCategory, "policy");
});

test("bounded behavior rejects SA_BREAK during intake stage", () => {
  const evaluated = enforceBoundedBehavior(
    buildPacket({
      landmarkId: "Station",
      recentEvents: ["intake_started"],
      playerSignals: { speechAct: "SA_BREAK" },
    }),
    buildDecision(),
  );

  assert.equal(evaluated.appliedFallback, true);
  assert.equal(evaluated.socialLoop.stage, "intake");
  assert.equal(evaluated.decision.meta.reason, "policy_station_intake_requires_procedural_speech");
  assert.equal(evaluated.decision.meta.reasonCategory, "policy");
});
