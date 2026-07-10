import assert from "node:assert/strict";
import { test } from "bun:test";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { DEFAULT_ROLE_POLICIES, type ActorMemory } from "../../src/agentloop/context.js";
import { runBeat } from "../../src/agentloop/engine.js";
import type { ActorContextLite, ToolCall } from "../../src/agentloop/tools.js";
import { TranscriptStore } from "../../src/agentloop/transcript.js";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import type { AgentStepProposal } from "../../src/providers/ports.js";

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

function adapterFor(steps: AgentStepProposal[]): ScriptedNpcAdapter {
  return new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "테스트 질문",
      suggestedReplies: [
        { text: "네", intent: "safe/local" },
        { text: "확인할게요", intent: "uncertain/repair" },
        { text: "아니요", intent: "risky/weird" },
      ],
      continueConversation: true,
    }),
    nextStep: request =>
      steps[request.iteration] ?? { rationale: "script complete", done: true },
  });
}

function active(call: ToolCall, rationale: string): AgentStepProposal {
  return { toolCall: call, rationale, done: false };
}

test("a blocked provider proposal is returned to the adapter and changes the next step", async () => {
  const blockedCall: ToolCall = {
    tool: "use_object",
    args: { objectId: "no_such_object", toState: "normal", ledgerKind: "store_sale_normal" },
  };
  const validCall: ToolCall = {
    tool: "use_object",
    args: {
      objectId: "receipt_tray",
      toState: "normal",
      ledgerKind: "store_sale_normal",
      whyLine: "정상 판매",
    },
  };
  const seenPreviousResults: Array<boolean> = [];
  const base = adapterFor([]);
  const proposalPort = new ScriptedNpcAdapter({
    conversation: request => base.proposeConversationTurn(request).then(result => result.proposal),
    nextStep: request => {
      seenPreviousResults.push(request.previousResult?.ok ?? true);
      if (request.iteration === 0) return active(blockedCall, "try a missing prop");
      if (request.iteration === 1) return active(blockedCall, "bad retry for suppression proof");
      if (request.iteration === 2) return active(validCall, "use a visible receipt tray instead");
      return { rationale: "served", done: true };
    },
  });

  const result = await runBeat({
    sessionId: "test-session",
    world: createSameOrderWorld(),
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goal: "serve using a visible affordance",
    proposalPort,
    transcript: new TranscriptStore(),
    budget: 5,
  });

  assert.equal(result.transcriptDeltas.length, 3);
  assert.equal(result.transcriptDeltas[0].validation.reason, "not_visible");
  assert.equal(result.transcriptDeltas[1].validation.reason, "retry_suppressed");
  assert.equal(result.transcriptDeltas[2].validation.ok, true);
  assert.deepEqual(seenPreviousResults.slice(0, 3), [true, false, false]);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].kind, "store_sale_normal");
  assert.equal(result.actions.length, 2);
});

test("the provider iteration budget is clamped to six attempts", async () => {
  const steps = Array.from({ length: 10 }, (_, index) =>
    active({ tool: "wait", args: { reason: `hold-${index}` } }, `wait ${index}`),
  );
  const result = await runBeat({
    sessionId: "test-session",
    world: createSameOrderWorld(),
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goal: "wait while the counter is occupied",
    proposalPort: adapterFor(steps),
    transcript: new TranscriptStore(),
    budget: 10,
  });
  assert.equal(result.actions.length, 6);
});

test("an identical successful call is suppressed within the same beat", async () => {
  const call: ToolCall = { tool: "look", args: { targetId: "usual_order_cue" } };
  const result = await runBeat({
    sessionId: "test-session",
    world: createSameOrderWorld(),
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goal: "look at the visible routine once",
    proposalPort: adapterFor([
      active(call, "inspect the cue"),
      active(call, "repeat the same completed look"),
      { rationale: "the cue was already inspected", done: true },
    ]),
    transcript: new TranscriptStore(),
    budget: 3,
  });
  assert.equal(result.actions.length, 1);
  assert.equal(result.transcriptDeltas.length, 2);
  assert.equal(result.transcriptDeltas[0].validation.ok, true);
  assert.equal(result.transcriptDeltas[1].validation.reason, "retry_suppressed");
});

test("provider-proposed mutations still pass deterministic validation and ledger application", async () => {
  const call: ToolCall = {
    tool: "use_object",
    args: {
      objectId: "usual_order_cue",
      toState: "cited",
      ledgerKind: "usual_order_cited",
      whyLine: "인용",
    },
  };
  const result = await runBeat({
    sessionId: "test-session",
    world: createSameOrderWorld(),
    actor: clerk(),
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: emptyMemory("NPC_Store_Clerk"),
    goal: "inspect and cite the routine",
    proposalPort: adapterFor([active(call, "cite the visible routine")]),
    transcript: new TranscriptStore(),
    budget: 3,
  });
  assert.equal(result.events.length, 1);
  assert.equal(result.transcriptDeltas[0].ledgerEventId, result.events[0].eventId);
  assert.equal(result.transcriptDeltas[0].proposalMeta.transport, "scripted");
});
