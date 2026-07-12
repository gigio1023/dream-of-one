import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  RunError,
  RunService,
} from "../../src/runtime/run-service.js";
import type {
  RunActorSpatialFacts,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";

function deterministicIds(label: string) {
  const counters = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counters) => `${prefix}-${label}-${++counters[prefix]}`;
}

function spatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    const block = schedulerActor.currentBlock;
    const reachableAnchorRefs = block?.targetKind === "anchor"
      ? [block.targetId]
      : block?.targetKind === "route"
        ? [...new Set(layout.routes.find(route => route.routeId === block.targetId)?.points ?? [])]
        : [];
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs,
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
    };
  });
}

test("one spatial batch dispatches all six stable residents through the same goal path", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const calledActorIds: string[] = [];
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    calledActorIds.push(request.observePacket.actorId);
    assert.ok(Array.isArray(request.observePacket.reachableAnchorRefs));
    return original(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("six") });
  const started = service.start("spatial-six", "ko-KR");
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-1",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      actors: spatialActors(started),
    },
  });
  const goalWakes = advanced.scheduleWakes.filter(wake => wake.kind === "goal");
  assert.equal(goalWakes.length, 6);

  for (const wake of goalWakes) {
    const response = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(response.status, "completed");
    assert.equal(response.decisionKind, "actor_goal");
    assert.deepEqual(response.actorIds, wake.actorIds);
  }
  assert.deepEqual(calledActorIds.sort(), started.actors.map(actor => actor.actorId).sort());

  const current = service.snapshot(started.runId);
  const changedFacts = spatialActors(current);
  const receptionist = changedFacts.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  const manager = changedFacts.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(receptionist);
  assert.ok(manager);
  receptionist.visibleActorIds = [manager.actorId];
  receptionist.audibleActorIds = [manager.actorId];
  manager.visibleActorIds = [receptionist.actorId];
  manager.audibleActorIds = [receptionist.actorId];
  const social = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-social",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: current.worldRevision, actors: changedFacts },
  });
  const receptionistWake = social.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === receptionist.actorId,
  );
  assert.ok(receptionistWake);
  const spoken = await service.decision({
    runId: started.runId,
    wakeId: receptionistWake.wakeId,
    observedWorldRevision: receptionistWake.observedWorldRevision,
  });
  assert.equal(spoken.status, "completed", JSON.stringify(spoken));
  assert.equal(spoken.actionDeltas[0]?.kind, "speech", JSON.stringify(spoken));
  assert.equal(spoken.speechEvents.length, 2, "talk_to commits a bounded two-agent exchange");
  assert.equal(spoken.speechEvents[0]?.audibility.volumeId, "AUD_STUDIO");
  assert.equal(spoken.speechEvents[1]?.speakerActorId, manager.actorId);
  const callsAfterExchange = calledActorIds.length;
  const restamped = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-social-restamp",
    observedWorldRevision: spoken.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: spoken.worldRevision, actors: changedFacts },
  });
  assert.ok(
    restamped.scheduleWakes.every(
      wake =>
        wake.kind !== "goal" ||
        (wake.actorIds[0] !== receptionist.actorId && wake.actorIds[0] !== manager.actorId),
    ),
    "both exchange participants consume their counterpart's reply without a new provider wake",
  );
  assert.equal(calledActorIds.length, callsAfterExchange);
});

test("mismatched facts and stale goal results cannot mutate after a fresh material wake", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("stale"),
  });
  const started = service.start("spatial-stale", "ko-KR");
  const actors = spatialActors(started);
  const beforeInvalid = service.snapshot(started.runId);
  await assert.rejects(
    service.advance({
      runId: started.runId,
      advanceId: "spatial-invalid",
      observedWorldRevision: started.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: started.worldRevision + 1,
        actors,
      },
    }),
    (error: unknown) => error instanceof RunError && error.code === "invalid_spatial_facts",
  );
  assert.deepEqual(service.snapshot(started.runId), beforeInvalid);

  const spatial = await service.advance({
    runId: started.runId,
    advanceId: "spatial-valid",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: started.worldRevision, actors },
  });
  const oldWake = spatial.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === "NPC_Park_Caretaker",
  );
  assert.ok(oldWake);
  const changedActors = actors.map(actor => structuredClone(actor));
  const changedCaretaker = changedActors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(changedCaretaker);
  changedCaretaker.visibleActorIds = ["NPC_Roaming_Liaison"];
  const refreshed = await service.advance({
    runId: started.runId,
    advanceId: "spatial-changed",
    observedWorldRevision: spatial.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: spatial.worldRevision,
      actors: changedActors,
    },
  });
  const beforeStaleDecision = service.snapshot(started.runId);
  const stale = await service.decision({
    runId: started.runId,
    wakeId: oldWake.wakeId,
    observedWorldRevision: oldWake.observedWorldRevision,
  });
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.actionDeltas, []);
  assert.deepEqual(service.snapshot(started.runId).actors, beforeStaleDecision.actors);
  assert.equal(service.snapshot(started.runId).ambientSpeech.cursor, 0);
  assert.ok(
    refreshed.scheduleWakes.some(
      wake => wake.kind === "goal" && wake.actorIds[0] === oldWake.actorIds[0],
    ),
    "a changed material fact batch must emit the fresh actor goal before the old result arrives",
  );
});
