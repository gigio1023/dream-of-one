import assert from "node:assert/strict";
import test from "node:test";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { DEFAULT_ROLE_POLICIES, type ActorMemory } from "../../src/agentloop/context.js";
import { runBeat } from "../../src/agentloop/engine.js";
import type { ActorContextLite, ToolCall } from "../../src/agentloop/tools.js";
import { TranscriptStore } from "../../src/agentloop/transcript.js";

function clerk(): ActorContextLite {
  return {
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    landmarkId: "Store",
    knownActorIds: ["player", "NPC_Store_Manager"],
    knownLandmarkIds: ["Store", "Station"],
  };
}

function emptyMemory(actorId: string): ActorMemory {
  return { actorId, ownActionNotes: [], observedLedgerEventIds: [] };
}

test("a blocked result changes the next step and is never retried", () => {
  const world = createSameOrderWorld();
  const transcript = new TranscriptStore();
  const blockedCall: ToolCall = {
    tool: "use_object",
    args: { objectId: "no_such_object", toState: "normal", ledgerKind: "store_sale_normal" },
  };
  const validCall: ToolCall = {
    tool: "use_object",
    args: { objectId: "receipt_tray", toState: "normal", ledgerKind: "store_sale_normal", whyLine: "정상 판매" },
  };

  const result = runBeat({
    world,
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goals: [
      { call: blockedCall, goalLabel: "attempt blocked object" },
      { call: blockedCall, goalLabel: "retry the same blocked object" },
      { call: validCall, goalLabel: "serve the receipt" },
    ],
    transcript,
    budget: 5,
  });

  // Three transcript deltas: blocked, retry-suppressed, applied.
  assert.equal(result.transcriptDeltas.length, 3);
  assert.equal(result.transcriptDeltas[0].validation.ok, false);
  assert.equal(result.transcriptDeltas[0].validation.reason, "not_visible");
  assert.match(result.transcriptDeltas[0].nextStepChange, /blocked/);
  assert.equal(result.transcriptDeltas[1].validation.reason, "retry_suppressed");
  assert.match(result.transcriptDeltas[1].nextStepChange, /skipped/);
  assert.equal(result.transcriptDeltas[2].validation.ok, true);

  // Exactly one mutation reached the world (the valid serve).
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].kind, "store_sale_normal");
  // The retry produced no action; only the blocked attempt and the valid serve did.
  assert.equal(result.actions.length, 2);
});

test("the iteration budget is clamped to 3-6 attempts per beat", () => {
  const world = createSameOrderWorld();
  const transcript = new TranscriptStore();
  const goals = Array.from({ length: 10 }, (_, i) => ({
    call: { tool: "wait", args: { reason: `hold-${i}` } } as ToolCall,
    goalLabel: `wait ${i}`,
  }));

  const result = runBeat({
    world,
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goals,
    transcript,
    budget: 10,
  });

  // budget 10 -> clamped to 6 attempts.
  assert.equal(result.actions.length, 6);
});

test("observe -> apply is deterministic and records the ledger effect in the transcript", () => {
  const world = createSameOrderWorld();
  const transcript = new TranscriptStore();
  const call: ToolCall = {
    tool: "use_object",
    args: { objectId: "usual_order_cue", toState: "cited", ledgerKind: "usual_order_cited", whyLine: "인용" },
  };
  const result = runBeat({
    world,
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goals: [{ call, goalLabel: "cite usual order" }],
    transcript,
    budget: 3,
  });
  assert.equal(result.events.length, 1);
  const entry = result.transcriptDeltas[0];
  assert.equal(entry.ledgerEventId, result.events[0].eventId);
  assert.match(entry.observedSummary, /role=store_clerk/);
});
