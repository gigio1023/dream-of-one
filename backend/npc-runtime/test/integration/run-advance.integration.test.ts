import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  advanceRunScheduler,
  canIssueActorGoalMovement,
  createRunScheduler,
  issueActorGoalMovement,
  ROUTE_DWELL_MAX_SECONDS,
  ROUTE_DWELL_MIN_SECONDS,
  routePointDwellSeconds,
  snapshotRunScheduler,
} from "../../src/runtime/run-scheduler.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import type { RunAdvanceResponse } from "../../src/runtime/run-schema.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

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

test("all six residents receive staggered early policy movement without provider work", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let providerCalls = 0;
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  const originalJudgment = adapter.judgeConversationTurn.bind(adapter);
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    providerCalls += 1;
    return originalConversation(request);
  };
  adapter.judgeConversationTurn = async request => {
    providerCalls += 1;
    return originalJudgment(request);
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    providerCalls += 1;
    return originalMerged(request);
  };
  adapter.proposeNextStep = async request => {
    providerCalls += 1;
    return originalNextStep(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const started = service.start("start-exact", "ko-KR");
  assert.deepEqual(service.start("start-exact", "ko-KR"), started);
  assert.throws(
    () => service.start("start-exact", "en-US"),
    (error: unknown) => error instanceof RunError && error.code === "start_id_conflict",
  );
  const initialDueTimes = started.scheduler.actors.map(actor => actor.nextRouteMoveAtSeconds);
  assert.ok(started.scheduler.actors.every(actor => actor.currentBlock?.targetKind === "route"));
  assert.ok(initialDueTimes.every(
    dueAt => dueAt !== null &&
      ROUTE_DWELL_MIN_SECONDS <= dueAt && dueAt <= ROUTE_DWELL_MAX_SECONDS,
  ));
  assert.equal(new Set(initialDueTimes).size, 6, "initial patrol departures must not lockstep");

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
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(await service.advance(request), response);
  await assert.rejects(
    service.advance({ ...request, elapsedSeconds: 9 }),
    (error: unknown) => error instanceof RunError && error.code === "advance_id_conflict",
  );
  await assert.rejects(
    service.advance({ ...request, advanceId: "advance-stale" }),
    (error: unknown) => error instanceof RunError && error.code === "stale_world_revision",
  );

  const secondRequest = {
    runId: started.runId,
    advanceId: "advance-policy-20",
    observedWorldRevision: response.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const second = await service.advance(secondRequest);
  assert.deepEqual(await service.advance(secondRequest), second);
  const third = await service.advance({
    runId: started.runId,
    advanceId: "advance-policy-30",
    observedWorldRevision: second.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  const policyMovements = [...second.movementDeltas, ...third.movementDeltas];
  assert.deepEqual(
    policyMovements.map(movement => movement.actorId).sort(),
    started.actors.map(actor => actor.actorId).sort(),
  );
  assert.deepEqual(
    policyMovements.map(movement => movement.issuedAtSeconds).sort((first, next) => first - next),
    initialDueTimes.filter((value): value is number => value !== null).sort((first, next) => first - next),
  );
  assert.deepEqual(
    policyMovements
      .map(movement => [movement.actorId, movement.routePointIndex] as const)
      .sort(([first], [secondActor]) => first.localeCompare(secondActor)),
    [
      ["NPC_Office_Worker", 1],
      ["NPC_Park_Caretaker", 1],
      ["NPC_Roaming_Liaison", 1],
      ["NPC_Station_Officer", 1],
      ["NPC_Studio_Manager", 2],
      ["NPC_Studio_Receptionist", 1],
    ],
    "the manager skips its co-located desk alias without changing the stable due time",
  );
  assert.equal(providerCalls, 0, "conventional schedule movement must never call the provider");
});

test("route progress waits for exact arrival and exposes the next per-point due time", async () => {
  const service = createService();
  const started = service.start("start-route", "ko-KR");
  const atTwenty = await advanceTo(service, started.runId, started, 20, "route-to-20");
  const firstRoutes = await service.advance({
    runId: started.runId,
    advanceId: "route-caretaker-due",
    observedWorldRevision: atTwenty.worldRevision,
    elapsedSeconds: 6,
    arrivals: [],
  });
  assert.deepEqual(
    firstRoutes.movementDeltas.map(movement => [movement.actorId, movement.routePointIndex]),
    [["NPC_Park_Caretaker", 1]],
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

  const caretakerMove = firstRoutes.movementDeltas[0];
  assert.ok(caretakerMove);
  const caretakerArrived = await service.advance({
    runId: started.runId,
    advanceId: "route-caretaker-arrival",
    observedWorldRevision: rejectedOnly.worldRevision,
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
  assert.equal(caretakerScheduler?.routePointArrivedAtSeconds, 26);
  const expectedNextDue = 26 + routePointDwellSeconds(
    "NPC_Park_Caretaker",
    "ParkCaretakerRound",
    1,
  );
  assert.equal(caretakerScheduler?.nextRouteMoveAtSeconds, expectedNextDue);
  const beforeDwell = await advanceTo(
    service,
    started.runId,
    caretakerArrived,
    expectedNextDue - 1,
    "route-before-next-due",
  );
  assert.ok(beforeDwell.movementDeltas.every(
    movement => movement.actorId !== "NPC_Park_Caretaker",
  ));
  const afterDwell = await service.advance({
    runId: started.runId,
    advanceId: "route-caretaker-next-due",
    observedWorldRevision: beforeDwell.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  assert.deepEqual(
    afterDwell.movementDeltas.map(movement => [movement.actorId, movement.routePointIndex]),
    [["NPC_Park_Caretaker", 2]],
  );
});

test("a route move held past its due time issues once when the hold clears", () => {
  const layout = loadRunLayout();
  const runtime = createRunScheduler(layout);
  const actorId = "NPC_Roaming_Liaison";
  const dueAt = snapshotRunScheduler(layout, runtime, 0).actors.find(
    actor => actor.actorId === actorId,
  )?.nextRouteMoveAtSeconds;
  assert.equal(dueAt, 12);

  const beforeDue = advanceRunScheduler({
    runId: "run-held-route",
    layout,
    runtime,
    fromSeconds: 0,
    toSeconds: 11,
    arrivals: [],
    observedWorldRevision: 0,
    heldActorIds: new Set([actorId]),
  });
  assert.ok(beforeDue.movementDeltas.every(movement => movement.actorId !== actorId));
  const heldPastDue = advanceRunScheduler({
    runId: "run-held-route",
    layout,
    runtime,
    fromSeconds: 11,
    toSeconds: 20,
    arrivals: [],
    observedWorldRevision: 1,
    heldActorIds: new Set([actorId]),
  });
  assert.ok(heldPastDue.movementDeltas.every(movement => movement.actorId !== actorId));

  const released = advanceRunScheduler({
    runId: "run-held-route",
    layout,
    runtime,
    fromSeconds: 20,
    toSeconds: 21,
    arrivals: [],
    observedWorldRevision: 2,
  });
  const releasedMovements = released.movementDeltas.filter(
    movement => movement.actorId === actorId,
  );
  assert.equal(releasedMovements.length, 1);
  assert.equal(releasedMovements[0]?.issuedAtSeconds, 21);

  const whilePending = advanceRunScheduler({
    runId: "run-held-route",
    layout,
    runtime,
    fromSeconds: 21,
    toSeconds: 22,
    arrivals: [],
    observedWorldRevision: 3,
  });
  assert.ok(whilePending.movementDeltas.every(movement => movement.actorId !== actorId));
});

test("automatic routes skip adjacent aliases across the cyclic boundary", () => {
  const layout = loadRunLayout();
  const actorId = "NPC_Roaming_Liaison";
  const route = layout.routes.find(candidate => candidate.routeId === "TownLiaisonCircuit");
  assert.ok(route);
  route.points = [
    "Park.liaison_spawn",
    "Park.studio_approach",
    "Studio.waiting_seats",
    "Park.office_approach",
  ];
  const aliasPosition = layout.anchorPositions["Park.liaison_spawn"];
  assert.ok(aliasPosition);
  layout.anchorPositions["Park.studio_approach"] = aliasPosition;
  layout.anchorPositions["Park.office_approach"] = aliasPosition;

  const runtime = createRunScheduler(layout);
  const actorState = runtime.actors.get(actorId);
  assert.ok(actorState);
  actorState.confirmedAnchorRef = "Park.office_approach";
  actorState.routePointIndex = 3;
  actorState.routePointArrivedAtSeconds = 0;
  const dueAt = routePointDwellSeconds(actorId, route.routeId, 3);

  const due = advanceRunScheduler({
    runId: "run-route-alias",
    layout,
    runtime,
    fromSeconds: 0,
    toSeconds: dueAt,
    arrivals: [],
    observedWorldRevision: 0,
  });
  const movement = due.movementDeltas.find(candidate => candidate.actorId === actorId);
  assert.equal(movement?.fromAnchorRef, "Park.office_approach");
  assert.equal(movement?.targetAnchorRef, "Studio.waiting_seats");
  assert.equal(movement?.routePointIndex, 2);
  assert.equal(movement?.issuedAtSeconds, dueAt);
  assert.notDeepEqual(
    layout.anchorPositions[movement?.fromAnchorRef ?? ""],
    layout.anchorPositions[movement?.targetAnchorRef ?? ""],
  );

  const whilePending = advanceRunScheduler({
    runId: "run-route-alias",
    layout,
    runtime,
    fromSeconds: dueAt,
    toSeconds: dueAt + 1,
    arrivals: [],
    observedWorldRevision: 1,
  });
  assert.ok(whilePending.movementDeltas.every(candidate => candidate.actorId !== actorId));
});

test("an all-alias route stays bounded and emits no no-op movement", () => {
  const layout = loadRunLayout();
  const actorId = "NPC_Roaming_Liaison";
  const route = layout.routes.find(candidate => candidate.routeId === "TownLiaisonCircuit");
  assert.ok(route);
  const aliasPosition = layout.anchorPositions["Park.liaison_spawn"];
  assert.ok(aliasPosition);
  for (const anchorRef of route.points) layout.anchorPositions[anchorRef] = aliasPosition;
  const runtime = createRunScheduler(layout);
  const dueAt = routePointDwellSeconds(actorId, route.routeId, 0);

  const due = advanceRunScheduler({
    runId: "run-all-alias",
    layout,
    runtime,
    fromSeconds: 0,
    toSeconds: dueAt,
    arrivals: [],
    observedWorldRevision: 0,
  });
  assert.ok(due.movementDeltas.every(candidate => candidate.actorId !== actorId));
  const later = advanceRunScheduler({
    runId: "run-all-alias",
    layout,
    runtime,
    fromSeconds: dueAt,
    toSeconds: dueAt + 1,
    arrivals: [],
    observedWorldRevision: 1,
  });
  assert.ok(later.movementDeltas.every(candidate => candidate.actorId !== actorId));
  assert.equal(runtime.actors.get(actorId)?.pendingMovement, null);
});

test("provider-selected route movement observes the same deterministic due time", () => {
  const layout = loadRunLayout();
  const runtime = createRunScheduler(layout);
  const initial = snapshotRunScheduler(layout, runtime, 0);
  const liaison = initial.actors.find(actor => actor.actorId === "NPC_Roaming_Liaison");
  assert.equal(liaison?.nextRouteMoveAtSeconds, 12);

  const options = {
    runId: "run-goal-cadence",
    layout,
    runtime,
    actorId: "NPC_Roaming_Liaison",
    targetAnchorRef: "Park.studio_approach",
  };
  assert.equal(issueActorGoalMovement({ ...options, elapsedSeconds: 11 }), null);
  const dueMovement = issueActorGoalMovement({ ...options, elapsedSeconds: 12 });
  assert.equal(dueMovement?.issuedAtSeconds, liaison.nextRouteMoveAtSeconds);
  assert.equal(dueMovement?.routePointIndex, 1);
});

test("provider-selected route movement skips a co-located semantic point", () => {
  const layout = loadRunLayout();
  const runtime = createRunScheduler(layout);
  const actorId = "NPC_Studio_Manager";
  const initial = snapshotRunScheduler(layout, runtime, 0);
  const manager = initial.actors.find(actor => actor.actorId === actorId);
  assert.ok(manager);
  const dueAt = manager.nextRouteMoveAtSeconds;
  assert.notEqual(dueAt, null);
  if (dueAt === null) throw new Error("manager route due time missing");

  assert.equal(canIssueActorGoalMovement({
    layout,
    runtime,
    actorId,
    targetAnchorRef: "Studio.manager_desk",
    elapsedSeconds: dueAt,
  }), false, "a semantic alias at the confirmed physical point is not offered");
  assert.equal(canIssueActorGoalMovement({
    layout,
    runtime,
    actorId,
    targetAnchorRef: "Studio.review_records",
    elapsedSeconds: dueAt - 1,
  }), false, "the per-waypoint dwell is authoritative");
  assert.equal(canIssueActorGoalMovement({
    layout,
    runtime,
    actorId,
    targetAnchorRef: "Studio.review_records",
    elapsedSeconds: dueAt,
  }), true);

  const movement = issueActorGoalMovement({
    runId: "run-goal-alias",
    layout,
    runtime,
    actorId,
    targetAnchorRef: "Studio.review_records",
    elapsedSeconds: dueAt,
  });
  assert.equal(movement?.targetAnchorRef, "Studio.review_records");
  assert.equal(movement?.routePointIndex, 2);
});

test("meeting wakes require both participant slots after the schedule boundary", async () => {
  const service = createService();
  const started = service.start("start-meeting", "ko-KR");
  const atSeventy = await advanceTo(service, started.runId, started, 70, "meeting-to-70");
  assert.equal(atSeventy.clock.graceEnded, false);
  const meetingMoves = atSeventy.movementDeltas.filter(movement =>
    ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(movement.actorId),
  );
  assert.deepEqual(
    meetingMoves.map(movement => [movement.actorId, movement.targetAnchorRef]),
    [
      ["NPC_Studio_Manager", "Park.meeting_north_west"],
      ["NPC_Park_Caretaker", "Park.meeting_north_east"],
    ],
  );
  assert.ok(
    meetingMoves.every(movement => movement.supersedesMovementId !== undefined),
    "meeting anchors must preempt in-flight conventional patrol movement",
  );
  assert.equal(
    atSeventy.scheduleWakes.filter(wake => wake.kind === "meeting_window").length,
    0,
  );
  const managerMove = meetingMoves.find(movement => movement.actorId === "NPC_Studio_Manager");
  const caretakerMove = meetingMoves.find(movement => movement.actorId === "NPC_Park_Caretaker");
  assert.ok(managerMove && caretakerMove);
  const managerArrived = await service.advance({
    runId: started.runId,
    advanceId: "meeting-manager-arrival",
    observedWorldRevision: atSeventy.worldRevision,
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
  const atNinety = await advanceTo(
    service,
    started.runId,
    managerArrived,
    90,
    "meeting-window-to-90",
  );
  assert.equal(atNinety.clock.graceEnded, true);
  assert.equal(
    atNinety.scheduleWakes.filter(wake => wake.kind === "meeting_window").length,
    1,
  );
  assert.ok(atNinety.scheduleWakes.every(wake => wake.kind !== "meeting_ready"));
  const caretakerArrived = await service.advance({
    runId: started.runId,
    advanceId: "meeting-caretaker-arrival",
    observedWorldRevision: atNinety.worldRevision,
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
    advanceId: "meeting-100",
    observedWorldRevision: caretakerArrived.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.ok(later.scheduleWakes.every(wake => wake.kind !== "meeting_ready"));
  assert.equal(later.scheduler.pendingWakes.filter(wake => wake.kind === "meeting_ready").length, 1);
});

test("run snapshots persist authoritative grace completion beyond one advance response", async () => {
  const service = createService();
  const started = service.start("start-persistent-grace", "ko-KR");
  assert.equal(started.worldClock.graceEnded, false);

  const beforeBoundary = await advanceTo(
    service,
    started.runId,
    started,
    80,
    "persistent-grace-before",
  );
  assert.equal(beforeBoundary.clock.graceEnded, false);
  const atBoundary = await advanceTo(
    service,
    started.runId,
    beforeBoundary,
    90,
    "persistent-grace-boundary",
  );
  assert.equal(atBoundary.clock.graceEnded, true);
  assert.equal(service.snapshot(started.runId).worldClock.graceEnded, true);
  assert.equal(
    beforeBoundary.clock.graceEnded,
    false,
    "an older one-shot advance remains stale while the full snapshot carries current truth",
  );
});

test("modal conversations pause clock and clock-only progress never reopens reception", async () => {
  const service = createService();
  const started = service.start("start-modal", "ko-KR");
  await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ground-modal-conversation",
  );
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
  assert.ok(tick.actorReadinessDeltas.every(
    delta => delta.actorId !== STUDIO_RECEPTIONIST_ID || !delta.playerConversationReady,
  ));
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
  assert.equal(atSeventeenNinetyFive.socialView.hearing.due, false);
  assert.equal(final.clock.requestedElapsedSeconds, 10);
  assert.equal(final.clock.appliedElapsedSeconds, 5);
  assert.equal(final.clock.toSeconds, 1800);
  assert.equal(final.clock.hearingDue, true);
  assert.equal(final.socialView.hearing.due, true);
  assert.equal(
    final.socialView.revision,
    atSeventeenNinetyFive.socialView.revision + 1,
    "hearing publication must advance player-knowledge revision exactly once",
  );
  assert.equal(final.scheduleWakes.filter(wake => wake.kind === "hearing").length, 1);
  assert.deepEqual(await service.advance(request), final);
  assert.deepEqual(service.snapshot(started.runId).socialView, final.socialView);
  const delayedOlderResponse = await service.advance({
    runId: started.runId,
    advanceId: "hearing-prelude-180",
    observedWorldRevision: atSeventeenNinetyFive.previousWorldRevision,
    elapsedSeconds: 5,
    arrivals: [],
  });
  assert.deepEqual(delayedOlderResponse, atSeventeenNinetyFive);
  assert.ok(delayedOlderResponse.socialView.revision < final.socialView.revision);
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
