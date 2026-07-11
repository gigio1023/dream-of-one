import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import type { RunAdvanceResponse } from "../../src/runtime/run-schema.js";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-advance-${++counts[prefix]}`;
}

function createService() {
  return new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
}

async function advanceTo(
  service: RunService,
  runId: string,
  start: RunAdvanceResponse | { worldRevision: number; clock?: never },
  targetSeconds: number,
  idPrefix: string,
): Promise<RunAdvanceResponse> {
  let revision = start.worldRevision;
  let elapsed = "clock" in start && start.clock ? start.clock.toSeconds : 0;
  let response: RunAdvanceResponse | null = null;
  let sequence = 0;
  while (elapsed < targetSeconds) {
    const step = Math.min(10, targetSeconds - elapsed);
    response = await service.advance({
      runId,
      advanceId: `${idPrefix}-${++sequence}`,
      observedWorldRevision: revision,
      elapsedSeconds: step,
      arrivals: [],
    });
    revision = response.worldRevision;
    elapsed = response.clock.toSeconds;
  }
  if (!response) throw new Error("advanceTo requires a target after the starting clock");
  return response;
}

test("run start and advance retries are exact, bounded, and provider-free", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let providerCalls = 0;
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    providerCalls += 1;
    return originalConversation(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const started = service.start("start-exact", "ko-KR");
  assert.deepEqual(service.start("start-exact", "ko-KR"), started);
  assert.throws(
    () => service.start("start-exact", "en-US"),
    (error: unknown) => error instanceof RunError && error.code === "start_id_conflict",
  );

  const request = {
    runId: started.runId,
    advanceId: "advance-exact",
    observedWorldRevision: 0,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const response = await service.advance(request);
  assert.equal(response.worldRevision, 1);
  assert.equal(response.clock.toSeconds, 10);
  assert.equal(providerCalls, 0);
  assert.deepEqual(
    response.movementDeltas.map(movement => movement.actorId),
    ["NPC_Studio_Receptionist", "NPC_Office_Worker", "NPC_Station_Officer"],
  );
  assert.deepEqual(await service.advance(request), response);
  await assert.rejects(
    service.advance({ ...request, elapsedSeconds: 9 }),
    (error: unknown) => error instanceof RunError && error.code === "advance_id_conflict",
  );
  await assert.rejects(
    service.advance({ ...request, advanceId: "advance-stale" }),
    (error: unknown) => error instanceof RunError && error.code === "stale_world_revision",
  );
});

test("route progress waits for exact arrival and then dwells fifteen world seconds", async () => {
  const service = createService();
  const started = service.start("start-route", "ko-KR");
  const initial = await service.advance({
    runId: started.runId,
    advanceId: "route-1",
    observedWorldRevision: 0,
    elapsedSeconds: 10,
    arrivals: [],
  });
  const initialArrivals = initial.movementDeltas.map(movement => ({
    movementId: movement.movementId,
    actorId: movement.actorId,
    anchorRef: movement.targetAnchorRef,
  }));
  const arrived = await service.advance({
    runId: started.runId,
    advanceId: "route-2",
    observedWorldRevision: initial.worldRevision,
    elapsedSeconds: 0,
    arrivals: initialArrivals,
  });
  const firstRoutes = await service.advance({
    runId: started.runId,
    advanceId: "route-3",
    observedWorldRevision: arrived.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.deepEqual(
    firstRoutes.movementDeltas.map(movement => [movement.actorId, movement.routePointIndex]),
    [
      ["NPC_Park_Caretaker", 1],
      ["NPC_Roaming_Liaison", 1],
    ],
  );
  const rejectedOnly = await service.advance({
    runId: started.runId,
    advanceId: "route-rejected-only",
    observedWorldRevision: firstRoutes.worldRevision,
    elapsedSeconds: 0,
    arrivals: [
      {
        movementId: "mov:known-but-not-current",
        actorId: "NPC_Park_Caretaker",
        anchorRef: "Park.bench_west",
      },
    ],
  });
  assert.equal(rejectedOnly.worldRevision, firstRoutes.worldRevision);
  assert.equal(rejectedOnly.arrivalsRejected[0]?.reason, "not_current");
  const waiting = await service.advance({
    runId: started.runId,
    advanceId: "route-4",
    observedWorldRevision: rejectedOnly.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(waiting.movementDeltas.length, 0, "clock time must not supersede an in-flight route move");

  const caretakerMove = firstRoutes.movementDeltas.find(
    movement => movement.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(caretakerMove);
  const caretakerArrived = await service.advance({
    runId: started.runId,
    advanceId: "route-5",
    observedWorldRevision: waiting.worldRevision,
    elapsedSeconds: 0,
    arrivals: [
      {
        movementId: caretakerMove.movementId,
        actorId: caretakerMove.actorId,
        anchorRef: caretakerMove.targetAnchorRef,
      },
    ],
  });
  const caretakerScheduler = caretakerArrived.scheduler.actors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.equal(caretakerScheduler?.routePointArrivedAtSeconds, 30);
  assert.equal(caretakerScheduler?.nextRouteMoveAtSeconds, 45);
  const beforeDwell = await service.advance({
    runId: started.runId,
    advanceId: "route-6",
    observedWorldRevision: caretakerArrived.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(beforeDwell.movementDeltas.length, 0);
  const afterDwell = await service.advance({
    runId: started.runId,
    advanceId: "route-7",
    observedWorldRevision: beforeDwell.worldRevision,
    elapsedSeconds: 5,
    arrivals: [],
  });
  assert.deepEqual(
    afterDwell.movementDeltas.map(movement => [movement.actorId, movement.routePointIndex]),
    [["NPC_Park_Caretaker", 2]],
  );
});

test("meeting wakes require both participant slots after the schedule boundary", async () => {
  const service = createService();
  const started = service.start("start-meeting", "ko-KR");
  const atNinety = await advanceTo(service, started.runId, started, 90, "meeting-to-90");
  assert.equal(atNinety.clock.graceEnded, true);
  const meetingMoves = atNinety.movementDeltas.filter(movement =>
    ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(movement.actorId),
  );
  assert.deepEqual(
    meetingMoves.map(movement => [movement.actorId, movement.targetAnchorRef]),
    [
      ["NPC_Studio_Manager", "Park.meeting_north_west"],
      ["NPC_Park_Caretaker", "Park.meeting_north_east"],
    ],
  );
  const managerMove = meetingMoves.find(movement => movement.actorId === "NPC_Studio_Manager");
  const caretakerMove = meetingMoves.find(movement => movement.actorId === "NPC_Park_Caretaker");
  assert.ok(managerMove && caretakerMove);
  const managerArrived = await service.advance({
    runId: started.runId,
    advanceId: "meeting-manager-arrival",
    observedWorldRevision: atNinety.worldRevision,
    elapsedSeconds: 0,
    arrivals: [
      {
        movementId: managerMove.movementId,
        actorId: managerMove.actorId,
        anchorRef: managerMove.targetAnchorRef,
      },
    ],
  });
  assert.ok(managerArrived.scheduleWakes.every(wake => wake.kind !== "meeting_ready"));
  const atHundred = await service.advance({
    runId: started.runId,
    advanceId: "meeting-100",
    observedWorldRevision: managerArrived.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  const atOneTen = await service.advance({
    runId: started.runId,
    advanceId: "meeting-110",
    observedWorldRevision: atHundred.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(
    atOneTen.scheduleWakes.filter(wake => wake.kind === "meeting_window").length,
    1,
  );
  assert.ok(atOneTen.scheduleWakes.every(wake => wake.kind !== "meeting_ready"));
  const caretakerArrived = await service.advance({
    runId: started.runId,
    advanceId: "meeting-caretaker-arrival",
    observedWorldRevision: atOneTen.worldRevision,
    elapsedSeconds: 0,
    arrivals: [
      {
        movementId: caretakerMove.movementId,
        actorId: caretakerMove.actorId,
        anchorRef: caretakerMove.targetAnchorRef,
      },
    ],
  });
  const ready = caretakerArrived.scheduleWakes.filter(wake => wake.kind === "meeting_ready");
  assert.equal(ready.length, 1);
  assert.deepEqual(ready[0]?.actorIds, ["NPC_Studio_Manager", "NPC_Park_Caretaker"]);
  assert.equal(ready[0]?.requiresDecision, true);
  const later = await service.advance({
    runId: started.runId,
    advanceId: "meeting-120",
    observedWorldRevision: caretakerArrived.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.ok(later.scheduleWakes.every(wake => wake.kind !== "meeting_ready"));
  assert.equal(later.scheduler.pendingWakes.filter(wake => wake.kind === "meeting_ready").length, 1);
});

test("modal conversations pause clock and clock-only progress never reopens reception", async () => {
  const service = createService();
  const started = service.start("start-modal", "ko-KR");
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  await assert.rejects(
    service.advance({
      runId: started.runId,
      advanceId: "modal-blocked",
      observedWorldRevision: conversation.worldRevision,
      elapsedSeconds: 1,
      arrivals: [],
    }),
    (error: unknown) => error instanceof RunError && error.code === "run_paused",
  );
  await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: conversation.nextTurn.choices[0].choiceId },
  );
  const ended = await service.endConversation(started.runId, conversation.sessionId);
  assert.equal(ended.actor.playerConversationReady, false);
  const tick = await service.advance({
    runId: started.runId,
    advanceId: "modal-after-end",
    observedWorldRevision: ended.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  const receptionist = service
    .snapshot(started.runId)
    .actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
  assert.equal(receptionist?.playerConversationReady, false);
  assert.ok(tick.movementDeltas.every(movement => movement.actorId !== STUDIO_RECEPTIONIST_ID));
});

test("hearing clamps one final batch and exact retry wins over terminal state", async () => {
  const service = createService();
  const started = service.start("start-hearing", "ko-KR");
  const atSeventeenNinetyFive = await advanceTo(
    service,
    started.runId,
    started,
    1795,
    "hearing-prelude",
  );
  const request = {
    runId: started.runId,
    advanceId: "hearing-final",
    observedWorldRevision: atSeventeenNinetyFive.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const final = await service.advance(request);
  assert.equal(final.clock.requestedElapsedSeconds, 10);
  assert.equal(final.clock.appliedElapsedSeconds, 5);
  assert.equal(final.clock.toSeconds, 1800);
  assert.equal(final.clock.hearingDue, true);
  assert.equal(final.scheduleWakes.filter(wake => wake.kind === "hearing").length, 1);
  assert.deepEqual(await service.advance(request), final);
  await assert.rejects(
    service.advance({
      ...request,
      advanceId: "hearing-too-late",
      observedWorldRevision: final.worldRevision,
      elapsedSeconds: 1,
    }),
    (error: unknown) => error instanceof RunError && error.code === "hearing_due",
  );
});
