import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  ProviderBudgetReservedError,
  ProviderFailureError,
} from "../../src/providers/ports.js";
import type {
  AmbientReplyRequest,
  AgentStepRequest,
  ConversationTurnRequest,
  NpcProposalPort,
} from "../../src/providers/ports.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import type {
  RunActorSpatialFacts,
  RunAdvanceResponse,
  RunAmbientSpeechEvent,
  RunLedgerEvent,
  RunMemory,
  RunNpcDecisionRequest,
  RunRecord,
  RunScheduleWake,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

function deterministicIds(label: string) {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-${label}-${++counts[prefix]}`;
}

function collidingMemoryIds(label: string) {
  const counts = { run: 0, sess: 0 };
  return (prefix: "run" | "sess" | "mem") => {
    if (prefix === "mem") return "mem-collision";
    return `${prefix}-${label}-${++counts[prefix]}`;
  };
}

async function readyFirstMeeting(
  service: RunService,
  startId: string,
): Promise<{
  started: RunSnapshot;
  ready: RunAdvanceResponse;
  wake: RunScheduleWake;
  request: RunNpcDecisionRequest;
}> {
  const started = service.start(startId, "ko-KR");
  let revision = started.worldRevision;
  let atNinety: RunAdvanceResponse | null = null;
  for (let step = 1; step <= 9; step += 1) {
    atNinety = await service.advance({
      runId: started.runId,
      advanceId: `${startId}:clock:${step}`,
      observedWorldRevision: revision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    revision = atNinety.worldRevision;
    if (atNinety.movementDeltas.length > 0) {
      atNinety = await service.advance({
        runId: started.runId,
        advanceId: `${startId}:clock:${step}:arrivals`,
        observedWorldRevision: revision,
        elapsedSeconds: 0,
        arrivals: atNinety.movementDeltas.map(movement => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        })),
      });
      revision = atNinety.worldRevision;
    }
  }
  assert.ok(atNinety);
  const ready = atNinety;
  const wake = [
    ...ready.scheduleWakes,
    ...service.snapshot(started.runId).scheduler.pendingWakes,
  ].find(candidate => candidate.kind === "meeting_ready");
  assert.ok(wake);
  return {
    started,
    ready,
    wake,
    request: {
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    },
  };
}

async function readyLaterMeeting(
  service: RunService,
  runId: string,
  startRevision: number,
  requestPrefix: string,
  sourceId: string,
): Promise<{
  ready: RunAdvanceResponse;
  wake: RunScheduleWake;
  request: RunNpcDecisionRequest;
}> {
  let revision = startRevision;
  for (let step = 1; step <= 50; step += 1) {
    let advanced = await service.advance({
      runId,
      advanceId: `${requestPrefix}:clock:${step}`,
      observedWorldRevision: revision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    revision = advanced.worldRevision;
    if (advanced.movementDeltas.length > 0) {
      advanced = await service.advance({
        runId,
        advanceId: `${requestPrefix}:clock:${step}:arrivals`,
        observedWorldRevision: revision,
        elapsedSeconds: 0,
        arrivals: advanced.movementDeltas.map(movement => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        })),
      });
      revision = advanced.worldRevision;
    }
    const wake = [
      ...advanced.scheduleWakes,
      ...service.snapshot(runId).scheduler.pendingWakes,
    ].find(candidate =>
      candidate.kind === "meeting_ready" && candidate.sourceId === sourceId
    );
    if (wake) {
      return {
        ready: advanced,
        wake,
        request: {
          runId,
          wakeId: wake.wakeId,
          observedWorldRevision: wake.observedWorldRevision,
        },
      };
    }
  }
  throw new Error(`meeting did not become ready: ${sourceId}`);
}

function capturingAdapter() {
  const adapter = createStudioReceptionScriptedAdapter();
  const requests: AgentStepRequest[] = [];
  const ambientRequests: AmbientReplyRequest[] = [];
  const original = adapter.proposeNextStep.bind(adapter);
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  adapter.proposeNextStep = async request => {
    requests.push(structuredClone(request));
    return original(request);
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    ambientRequests.push(structuredClone(request));
    return originalAmbientReply(request);
  };
  return { adapter, requests, ambientRequests };
}

function ambientSpatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs: [],
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
      playerVisible: false,
      playerAudible: false,
      playerReachable: false,
      playerInteractionZoneId: null,
    };
  });
}

function meetingBurstSpatialActors(
  snapshot: RunSnapshot,
  arrivals: ReadonlyArray<{ actorId: string; anchorRef: string }> = [],
): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  const arrivalAnchors = new Map(arrivals.map(arrival => [arrival.actorId, arrival.anchorRef]));
  const actors = ambientSpatialActors(snapshot);
  for (const actor of actors) {
    const arrivedAnchor = arrivalAnchors.get(actor.actorId);
    if (arrivedAnchor) {
      const position = layout.anchorPositions[arrivedAnchor];
      assert.ok(position);
      actor.position = [position[0], position[1], position[2]];
    }
  }

  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  assert.ok(receptionist);
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = "StudioReceptionConversation";

  const manager = actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  const caretaker = actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(manager);
  assert.ok(caretaker);
  const managerAtMeeting = manager.position.every(
    (value, index) => value === layout.anchorPositions["Park.meeting_north_west"]?.[index],
  );
  const caretakerAtMeeting = caretaker.position.every(
    (value, index) => value === layout.anchorPositions["Park.meeting_north_east"]?.[index],
  );
  if (managerAtMeeting && caretakerAtMeeting) {
    manager.visibleActorIds = [caretaker.actorId];
    manager.audibleActorIds = [caretaker.actorId];
    caretaker.visibleActorIds = [manager.actorId];
    caretaker.audibleActorIds = [manager.actorId];
  }
  return actors;
}

test("an active meeting owns participant social goals while an unrelated contact goal remains", async () => {
  const { adapter, requests, ambientRequests } = capturingAdapter();
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-goal-ownership"),
  });
  const started = service.start("meeting-goal-ownership", "ko-KR");
  const meetingOwnsActorGoal = Reflect.get(service, "activeMeetingOwnsActorGoal").bind(
    service,
  ) as (actorId: string, elapsedSeconds: number) => boolean;
  assert.equal(meetingOwnsActorGoal("NPC_Studio_Manager", 70), true);
  assert.equal(meetingOwnsActorGoal("NPC_Park_Caretaker", 70), true);
  assert.equal(meetingOwnsActorGoal("NPC_Studio_Receptionist", 460), true);
  assert.equal(meetingOwnsActorGoal("NPC_Park_Caretaker", 460), true);
  assert.equal(meetingOwnsActorGoal("NPC_Office_Worker", 700), true);
  assert.equal(meetingOwnsActorGoal("NPC_Roaming_Liaison", 700), true);
  assert.equal(meetingOwnsActorGoal("NPC_Station_Officer", 580), true);
  assert.equal(meetingOwnsActorGoal("NPC_Roaming_Liaison", 580), true);
  const decisionStatuses: Array<{
    wakeKind: string;
    actorIds: string[];
    status: string;
    providerCalls: number;
    speechCount: number;
  }> = [];

  const drainClientOrderedDecisions = async () => {
    const pending = service.snapshot(started.runId).scheduler.pendingWakes
      .filter(wake => wake.requiresDecision && wake.status === "pending")
      .sort((first, second) =>
        first.scheduledAtSeconds === second.scheduledAtSeconds
          ? first.wakeId.localeCompare(second.wakeId)
          : first.scheduledAtSeconds - second.scheduledAtSeconds
      );
    for (const wake of pending) {
      const response = await service.decision({
        runId: started.runId,
        wakeId: wake.wakeId,
        observedWorldRevision: wake.observedWorldRevision,
      });
      decisionStatuses.push({
        wakeKind: response.wakeKind,
        actorIds: [...response.actorIds],
        status: response.status,
        providerCalls: response.providerMetas.length,
        speechCount: response.speechEvents.length,
      });
    }
  };

  const initial = await service.advance({
    runId: started.runId,
    advanceId: "meeting-goal-ownership:initial-spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: meetingBurstSpatialActors(started),
    },
  });
  assert.equal(initial.scheduleWakes.filter(wake => wake.kind === "goal").length, 6);
  await drainClientOrderedDecisions();
  const callsBeforeWindow = requests.length + ambientRequests.length;
  assert.equal(callsBeforeWindow, 6, "the initial grounded goal for each resident resolves once");
  decisionStatuses.length = 0;

  let meetingReadySeen = false;
  for (let step = 1; step <= 9; step += 1) {
    let current = service.snapshot(started.runId);
    const advanced = await service.advance({
      runId: started.runId,
      advanceId: `meeting-goal-ownership:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: meetingBurstSpatialActors(current),
      },
    });
    meetingReadySeen ||= advanced.scheduleWakes.some(wake => wake.kind === "meeting_ready");
    await drainClientOrderedDecisions();
    current = service.snapshot(started.runId);
    const arrivals = advanced.movementDeltas.map(movement => ({
      movementId: movement.movementId,
      actorId: movement.actorId,
      anchorRef: movement.targetAnchorRef,
    }));
    if (arrivals.length === 0) continue;
    const settled = await service.advance({
      runId: started.runId,
      advanceId: `meeting-goal-ownership:clock:${step}:arrivals`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: meetingBurstSpatialActors(current, arrivals),
      },
    });
    meetingReadySeen ||= settled.scheduleWakes.some(wake => wake.kind === "meeting_ready");
    await drainClientOrderedDecisions();
  }

  assert.equal(service.snapshot(started.runId).worldClock.elapsedSeconds, 90);
  assert.equal(meetingReadySeen, true);
  const windowCalls = requests.length + ambientRequests.length - callsBeforeWindow;
  const meetingResolutions = decisionStatuses.filter(
    decision => decision.wakeKind === "meeting_ready" && decision.status === "completed",
  );
  const contactResolutions = decisionStatuses.filter(
    decision =>
      decision.wakeKind === "goal" &&
      decision.actorIds[0] === "NPC_Studio_Receptionist" &&
      decision.status === "completed",
  );
  const participantGoalResolutions = decisionStatuses.filter(
    decision =>
      decision.wakeKind === "goal" &&
      ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(decision.actorIds[0] ?? "") &&
      decision.providerCalls > 0,
  );
  assert.equal(windowCalls, 3, "one contact call plus exactly two meeting calls should resolve");
  assert.equal(meetingResolutions.length, 1);
  assert.equal(meetingResolutions[0]?.providerCalls, 2);
  assert.equal(meetingResolutions[0]?.speechCount, 2);
  assert.equal(contactResolutions.length, 1, "the unrelated receptionist contact goal remains live");
  assert.equal(contactResolutions[0]?.providerCalls, 1);
  assert.deepEqual(participantGoalResolutions, []);
  assert.equal(service.snapshot(started.runId).ambientSpeech.events.length, 2);

  const callsAfterMeeting = requests.length + ambientRequests.length;
  let postMeetingGoalActors: string[] = [];
  for (let step = 10; step <= 23; step += 1) {
    let current = service.snapshot(started.runId);
    const advanced = await service.advance({
      runId: started.runId,
      advanceId: `meeting-goal-ownership:post:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: meetingBurstSpatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
    const arrivals = advanced.movementDeltas.map(movement => ({
      movementId: movement.movementId,
      actorId: movement.actorId,
      anchorRef: movement.targetAnchorRef,
    }));
    if (arrivals.length === 0) continue;
    const settled = await service.advance({
      runId: started.runId,
      advanceId: `meeting-goal-ownership:post:${step}:arrivals`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: meetingBurstSpatialActors(current, arrivals),
      },
    });
    postMeetingGoalActors.push(
      ...settled.scheduleWakes
        .filter(wake => wake.kind === "goal")
        .flatMap(wake => wake.actorIds),
    );
  }
  postMeetingGoalActors = [...new Set(postMeetingGoalActors)].sort();
  assert.equal(service.snapshot(started.runId).worldClock.elapsedSeconds, 230);
  assert.deepEqual(
    postMeetingGoalActors.filter(actorId =>
      ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(actorId)
    ),
    [],
    "the deterministic return schedule and movement create no generic participant goal",
  );
  assert.equal(
    requests.length + ambientRequests.length,
    callsAfterMeeting,
    "the 230-second return transition spends no provider call",
  );

  type MutableActor = { memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  assert.ok(internalRun);
  const beforeIndependentEvent = service.snapshot(started.runId);
  for (const actorId of ["NPC_Studio_Manager", "NPC_Park_Caretaker"]) {
    const actor = internalRun.actors.get(actorId);
    const schedulerActor = beforeIndependentEvent.scheduler.actors.find(
      candidate => candidate.actorId === actorId,
    );
    assert.ok(actor);
    assert.ok(schedulerActor);
    actor.memories.push({
      memoryId: `independent-semantic-${actorId}`,
      kind: "player_contact_outcome",
      sourceActorId: "player",
      listenerActorId: actorId,
      contactId: `independent-contact-${actorId}`,
      outcome: "not_engaged",
      contactReason: "별도의 의미 사건을 기억했습니다.",
      interactionZoneId: "ParkConversation",
      originAnchorRef: schedulerActor.confirmedAnchorRef,
      worldSeconds: beforeIndependentEvent.worldClock.elapsedSeconds,
      worldRevision: beforeIndependentEvent.worldRevision,
    });
  }
  const independentEvent = await service.advance({
    runId: started.runId,
    advanceId: "meeting-goal-ownership:independent-semantic",
    observedWorldRevision: beforeIndependentEvent.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeIndependentEvent.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: meetingBurstSpatialActors(beforeIndependentEvent),
    },
  });
  const independentParticipantWakes = independentEvent.scheduleWakes
    .filter(wake =>
      wake.kind === "goal" &&
      ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(wake.actorIds[0] ?? "")
    )
    .sort((first, second) => first.wakeId.localeCompare(second.wakeId));
  assert.equal(independentParticipantWakes.length, 2);
  for (const wake of independentParticipantWakes) {
    const decision = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(decision.status, "completed");
    assert.equal(decision.providerMetas.length, 1);
  }
  assert.equal(requests.length + ambientRequests.length, callsAfterMeeting + 2);
});

test("a semantic memory gained after meeting speech wakes once when ownership releases", async () => {
  const { adapter, requests } = capturingAdapter();
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-deferred-memory"),
  });
  const meeting = await readyFirstMeeting(service, "meeting-deferred-memory");
  const committed = await service.decision(meeting.request);
  assert.equal(committed.status, "completed");

  type MutableActor = { memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(meeting.started.runId);
  const manager = internalRun?.actors.get("NPC_Studio_Manager");
  const afterMeetingSpeech = service.snapshot(meeting.started.runId);
  await service.advance({
    runId: meeting.started.runId,
    advanceId: "meeting-deferred-memory:baseline",
    observedWorldRevision: afterMeetingSpeech.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: afterMeetingSpeech.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: firstMeetingParticipantActors(afterMeetingSpeech),
    },
  });
  const atMeeting = service.snapshot(meeting.started.runId);
  const schedulerManager = atMeeting.scheduler.actors.find(
    actor => actor.actorId === "NPC_Studio_Manager",
  );
  assert.ok(manager && schedulerManager);
  manager.memories.push({
    memoryId: "meeting-deferred-memory:new-player-event",
    kind: "player_contact_outcome",
    sourceActorId: "player",
    listenerActorId: "NPC_Studio_Manager",
    contactId: "meeting-deferred-memory:contact",
    outcome: "not_engaged",
    contactReason: "회의 발화가 끝난 뒤 방문자와 별도의 일이 생겼습니다.",
    interactionZoneId: "ParkConversation",
    originAnchorRef: schedulerManager.confirmedAnchorRef,
    worldSeconds: atMeeting.worldClock.elapsedSeconds,
    worldRevision: atMeeting.worldRevision,
  });

  const owned = await service.advance({
    runId: meeting.started.runId,
    advanceId: "meeting-deferred-memory:owned",
    observedWorldRevision: atMeeting.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: atMeeting.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: firstMeetingParticipantActors(atMeeting),
    },
  });
  assert.ok(owned.scheduleWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== "NPC_Studio_Manager",
  ));

  const releasedWakes: RunScheduleWake[] = [];
  let current = service.snapshot(meeting.started.runId);
  for (let step = 10; step <= 23; step += 1) {
    let advanced = await service.advance({
      runId: meeting.started.runId,
      advanceId: `meeting-deferred-memory:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: firstMeetingParticipantActors(current),
      },
    });
    releasedWakes.push(...advanced.scheduleWakes);
    current = service.snapshot(meeting.started.runId);
    const arrivals = advanced.movementDeltas.map(movement => ({
      movementId: movement.movementId,
      actorId: movement.actorId,
      anchorRef: movement.targetAnchorRef,
    }));
    if (arrivals.length === 0) continue;
    advanced = await service.advance({
      runId: meeting.started.runId,
      advanceId: `meeting-deferred-memory:clock:${step}:arrivals`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: meetingBurstSpatialActors(current, arrivals),
      },
    });
    releasedWakes.push(...advanced.scheduleWakes);
    current = service.snapshot(meeting.started.runId);
  }
  assert.equal(current.worldClock.elapsedSeconds, 230);
  const managerWakes = releasedWakes.filter(
    wake => wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.equal(managerWakes.length, 1);
  assert.ok(releasedWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== "NPC_Park_Caretaker",
  ));

  const managerWake = managerWakes[0];
  assert.ok(managerWake);
  const resolved = await service.decision({
    runId: meeting.started.runId,
    wakeId: managerWake.wakeId,
    observedWorldRevision: managerWake.observedWorldRevision,
  });
  assert.equal(resolved.status, "completed");
  const managerRequest = requests.find(
    request =>
      request.observePacket.actorId === "NPC_Studio_Manager" &&
      request.observePacket.administrativeSources.some(
        source => source.memoryId === "meeting-deferred-memory:new-player-event",
      ),
  );
  assert.ok(managerRequest);

  const settled = service.snapshot(meeting.started.runId);
  const unchanged = await service.advance({
    runId: meeting.started.runId,
    advanceId: "meeting-deferred-memory:unchanged",
    observedWorldRevision: settled.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: settled.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: ambientSpatialActors(settled),
    },
  });
  assert.ok(unchanged.scheduleWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== "NPC_Studio_Manager",
  ));
});

test("first-meeting arrivals suppress a new participant contact without suppressing unrelated contact", async () => {
  const { adapter, requests, ambientRequests } = capturingAdapter();
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("first-meeting-contact-race"),
  });
  const started = service.start("first-meeting-contact-race", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "first-meeting-contact-race:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: ambientSpatialActors(started),
    },
  });
  const initialGoals = seeded.scheduleWakes
    .filter(wake => wake.kind === "goal")
    .sort((first, second) => first.wakeId.localeCompare(second.wakeId));
  assert.equal(initialGoals.length, 6);
  for (const wake of initialGoals) {
    const decision = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(decision.status, "completed");
  }
  assert.equal(requests.length, 6);
  assert.equal(ambientRequests.length, 0);

  let meetingMoves: RunAdvanceResponse["movementDeltas"] = [];
  for (let step = 1; step <= 8; step += 1) {
    const current = service.snapshot(started.runId);
    const advanced = await service.advance({
      runId: started.runId,
      advanceId: `first-meeting-contact-race:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: ambientSpatialActors(current),
      },
    });
    if (advanced.clock.toSeconds === 70) {
      meetingMoves = advanced.movementDeltas.filter(movement =>
        ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(movement.actorId)
      );
    }
  }
  assert.deepEqual(
    meetingMoves.map(movement => [movement.actorId, movement.targetAnchorRef]),
    [
      ["NPC_Studio_Manager", "Park.meeting_north_west"],
      ["NPC_Park_Caretaker", "Park.meeting_north_east"],
    ],
  );

  const beforeArrival = service.snapshot(started.runId);
  assert.equal(beforeArrival.worldClock.elapsedSeconds, 80);
  const arrivals = meetingMoves.map(movement => ({
    movementId: movement.movementId,
    actorId: movement.actorId,
    anchorRef: movement.targetAnchorRef,
  }));
  const arrivalActors = meetingBurstSpatialActors(beforeArrival, arrivals);
  const receptionist = arrivalActors.find(actor =>
    actor.actorId === "NPC_Studio_Receptionist"
  );
  assert.ok(receptionist);
  receptionist.playerVisible = false;
  receptionist.playerAudible = false;
  receptionist.playerReachable = false;
  receptionist.playerInteractionZoneId = null;
  const caretaker = arrivalActors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretaker);
  caretaker.playerVisible = true;
  caretaker.playerAudible = true;
  caretaker.playerReachable = true;
  caretaker.playerInteractionZoneId = "ParkConversation";
  const simultaneousArrival = await service.advance({
    runId: started.runId,
    advanceId: "first-meeting-contact-race:simultaneous-arrival",
    observedWorldRevision: beforeArrival.worldRevision,
    elapsedSeconds: 10,
    arrivals,
    spatialFacts: {
      observedWorldRevision: beforeArrival.worldRevision,
      player: { position: [0, 0, 0], locationId: "Park" },
      actors: arrivalActors,
    },
  });
  assert.equal(simultaneousArrival.clock.toSeconds, 90);
  const ready = simultaneousArrival.scheduleWakes.filter(wake => wake.kind === "meeting_ready");
  assert.equal(ready.length, 1);
  assert.deepEqual(ready[0]?.actorIds, ["NPC_Studio_Manager", "NPC_Park_Caretaker"]);
  assert.ok(simultaneousArrival.scheduleWakes.every(wake =>
    wake.kind !== "goal" ||
    !["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(wake.actorIds[0] ?? "")
  ));

  const internalRuns = Reflect.get(service, "runs") as Map<string, unknown>;
  const currentContactCandidateActorId = Reflect.get(
    service,
    "currentContactCandidateActorId",
  ).bind(service) as (run: unknown, elapsedSeconds?: number) => string | null;
  const internalRun = internalRuns.get(started.runId);
  assert.ok(internalRun);
  assert.equal(
    currentContactCandidateActorId(internalRun, 90),
    "NPC_Park_Caretaker",
    "the participant is a grounded new contact candidate, but meeting ownership suppresses its goal",
  );

  const meetingWake = ready[0];
  assert.ok(meetingWake);
  const meetingDecision = await service.decision({
    runId: started.runId,
    wakeId: meetingWake.wakeId,
    observedWorldRevision: meetingWake.observedWorldRevision,
  });
  assert.equal(meetingDecision.status, "completed");
  assert.equal(meetingDecision.providerMetas.length, 2);
  assert.equal(meetingDecision.speechEvents.length, 2);
  assert.equal(requests.length, 7, "the meeting first turn is the only new agent-step call");
  assert.equal(ambientRequests.length, 1, "the exact listener reply is the only ambient call");
  assert.deepEqual(requests.at(-1)?.requiredToolCall, {
    tool: "talk_to",
    actorId: "NPC_Park_Caretaker",
  });

  const afterMeeting = service.snapshot(started.runId);
  const receptionistScheduler = afterMeeting.scheduler.actors.find(actor =>
    actor.actorId === "NPC_Studio_Receptionist"
  );
  assert.ok(receptionistScheduler);
  const receptionistArrival = receptionistScheduler.pendingMovement
    ? [{
        movementId: receptionistScheduler.pendingMovement.movementId,
        actorId: receptionistScheduler.actorId,
        anchorRef: receptionistScheduler.pendingMovement.targetAnchorRef,
      }]
    : [];
  const unrelatedContact = await service.advance({
    runId: started.runId,
    advanceId: "first-meeting-contact-race:unrelated-contact",
    observedWorldRevision: afterMeeting.worldRevision,
    elapsedSeconds: 0,
    arrivals: receptionistArrival,
    spatialFacts: {
      observedWorldRevision: afterMeeting.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: meetingBurstSpatialActors(afterMeeting, receptionistArrival),
    },
  });
  const unrelatedWake = unrelatedContact.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Receptionist"
  );
  assert.ok(unrelatedWake);
  assert.ok(unrelatedContact.scheduleWakes.every(wake =>
    wake.kind !== "goal" ||
    !["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(wake.actorIds[0] ?? "")
  ));
  const unrelatedDecision = await service.decision({
    runId: started.runId,
    wakeId: unrelatedWake.wakeId,
    observedWorldRevision: unrelatedWake.observedWorldRevision,
  });
  assert.equal(unrelatedDecision.status, "completed");
  assert.equal(unrelatedDecision.providerMetas.length, 1);
  assert.equal(requests.length, 8);
  assert.equal(ambientRequests.length, 1);
});

test("a claimed participant goal rechecks meeting ownership before provider transport", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  let goalProviderCalls = 0;
  adapter.proposeNextStep = async request => {
    goalProviderCalls += 1;
    return originalNextStep(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-pre-transport"),
  });
  const started = service.start("meeting-pre-transport", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "meeting-pre-transport:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: ambientSpatialActors(started),
    },
  });
  const managerGoal = seeded.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.ok(managerGoal);
  assert.equal(
    service.snapshot(started.runId).scheduler.actors.find(
      actor => actor.actorId === "NPC_Studio_Manager",
    )?.pendingMovement,
    null,
  );

  const acquireSlot = Reflect.get(service, "acquireBackgroundProviderSlot").bind(
    service,
  ) as (runId: string) => Promise<void>;
  const releaseSlot = Reflect.get(service, "releaseBackgroundProviderSlot").bind(
    service,
  ) as (runId: string) => void;
  let heldSlots = 0;
  await acquireSlot(started.runId);
  heldSlots += 1;
  await acquireSlot(started.runId);
  heldSlots += 1;

  const decisionPromise = service.decision({
    runId: started.runId,
    wakeId: managerGoal.wakeId,
    observedWorldRevision: managerGoal.observedWorldRevision,
  });
  try {
    let claimed = false;
    for (let spin = 0; spin < 50; spin += 1) {
      claimed = service.snapshot(started.runId).scheduler.pendingWakes.some(wake =>
        wake.wakeId === managerGoal.wakeId && wake.status === "claimed"
      );
      if (claimed) break;
      await Promise.resolve();
    }
    assert.equal(claimed, true);
    assert.equal(goalProviderCalls, 0, "the claimed goal is waiting outside provider transport");

    for (let step = 1; step <= 7; step += 1) {
      const current = service.snapshot(started.runId);
      await service.advance({
        runId: started.runId,
        advanceId: `meeting-pre-transport:clock:${step}`,
        observedWorldRevision: current.worldRevision,
        elapsedSeconds: 10,
        arrivals: [],
        spatialFacts: {
          observedWorldRevision: current.worldRevision,
          player: { position: [0, 0, 0], locationId: "" },
          actors: ambientSpatialActors(current),
        },
      });
    }
    assert.equal(service.snapshot(started.runId).worldClock.elapsedSeconds, 70);

    releaseSlot(started.runId);
    heldSlots -= 1;
    const decision = await decisionPromise;
    assert.equal(decision.status, "stale");
    assert.deepEqual(decision.providerMetas, []);
    assert.equal(goalProviderCalls, 0, "meeting ownership is rechecked after the slot wait");
  } finally {
    while (heldSlots > 0) {
      releaseSlot(started.runId);
      heldSlots -= 1;
    }
  }
});

test("a participant-anchor lead-in retires unrelated pending social work without provider calls", async () => {
  const { adapter, requests, ambientRequests } = capturingAdapter();
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-lead-in"),
  });
  const started = service.start("meeting-lead-in", "ko-KR");
  const initial = await service.advance({
    runId: started.runId,
    advanceId: "meeting-lead-in:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: ambientSpatialActors(started),
    },
  });
  assert.ok(initial.scheduleWakes.some(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Receptionist"
  ));

  let atLeadIn: RunAdvanceResponse | null = null;
  for (let step = 1; step <= 46; step += 1) {
    const current = service.snapshot(started.runId);
    atLeadIn = await service.advance({
      runId: started.runId,
      advanceId: `meeting-lead-in:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
  }
  assert.ok(atLeadIn);
  assert.equal(atLeadIn.clock.toSeconds, 460);
  assert.ok(atLeadIn.scheduleWakes.every(wake =>
    wake.kind !== "goal" ||
    !["NPC_Studio_Receptionist", "NPC_Park_Caretaker"].includes(wake.actorIds[0] ?? "")
  ));
  assert.ok(service.snapshot(started.runId).scheduler.pendingWakes.every(wake =>
    wake.kind !== "goal" ||
    !["NPC_Studio_Receptionist", "NPC_Park_Caretaker"].includes(wake.actorIds[0] ?? "")
  ));
  assert.equal(requests.length + ambientRequests.length, 0);
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function firstMeetingParticipantActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  return meetingBurstSpatialActors(snapshot, [
    { actorId: "NPC_Studio_Manager", anchorRef: "Park.meeting_north_west" },
    { actorId: "NPC_Park_Caretaker", anchorRef: "Park.meeting_north_east" },
  ]);
}

function targetOwnershipRaceLayout() {
  const base = loadRunLayout();
  const managerId = "NPC_Studio_Manager";
  const caretakerId = "NPC_Park_Caretaker";
  const participantIds = new Set([managerId, caretakerId]);
  const participantAnchorRefs = Object.fromEntries(
    base.actors
      .filter(actor => participantIds.has(actor.actorId))
      .map(actor => [actor.actorId, actor.spawnAnchorRef]),
  );
  return {
    ...base,
    meetingWindows: [{
      windowId: "TEST_TARGET_OWNERSHIP_RACE",
      startSeconds: 30,
      endSeconds: 60,
      anchorRef: participantAnchorRefs[managerId] as string,
      actorIds: [managerId, caretakerId] as [string, string],
      participantAnchorRefs,
    }],
    actors: base.actors.map(actor => ({
      ...actor,
      scheduleBlocks: participantIds.has(actor.actorId)
        ? [
            {
              blockId: `test-before-ownership-${actor.actorId}`,
              startSeconds: 0,
              endSeconds: 10,
              activity: "test_before_ownership",
              target: { kind: "anchor" as const, id: actor.spawnAnchorRef },
            },
            {
              blockId: `test-meeting-lead-in-${actor.actorId}`,
              startSeconds: 10,
              endSeconds: base.hearingAtSeconds,
              activity: "test_meeting_lead_in",
              target: { kind: "anchor" as const, id: actor.spawnAnchorRef },
            },
          ]
        : [{
            blockId: `test-stationary-${actor.actorId}`,
            startSeconds: 0,
            endSeconds: base.hearingAtSeconds,
            activity: "test_stationary",
            target: { kind: "anchor" as const, id: actor.spawnAnchorRef },
          }],
    })),
  };
}

function targetOwnershipRaceActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const actors = ambientSpatialActors(snapshot);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  const manager = actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(receptionist && manager);
  receptionist.visibleActorIds = [manager.actorId];
  receptionist.audibleActorIds = [manager.actorId];
  manager.visibleActorIds = [receptionist.actorId];
  manager.audibleActorIds = [receptionist.actorId];
  return actors;
}

async function advanceToFirstMeetingLeadIn(
  service: RunService,
  runId: string,
  requestPrefix: string,
): Promise<void> {
  for (let step = 1; step <= 7; step += 1) {
    let current = service.snapshot(runId);
    const advanced = await service.advance({
      runId,
      advanceId: `${requestPrefix}:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: firstMeetingParticipantActors(current),
      },
    });
    const arrivals = advanced.movementDeltas.map(movement => ({
      movementId: movement.movementId,
      actorId: movement.actorId,
      anchorRef: movement.targetAnchorRef,
    }));
    if (arrivals.length === 0) continue;
    current = service.snapshot(runId);
    await service.advance({
      runId,
      advanceId: `${requestPrefix}:clock:${step}:arrivals`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "Studio" },
        actors: firstMeetingParticipantActors(current),
      },
    });
  }
  const atLeadIn = service.snapshot(runId);
  assert.equal(atLeadIn.worldClock.elapsedSeconds, 70);
  assert.equal(
    atLeadIn.scheduler.actors.find(actor => actor.actorId === "NPC_Studio_Manager")
      ?.pendingMovement,
    null,
    "the held decision must be rejected by meeting ownership, not a pending movement",
  );
}

test("an in-flight participant goal cannot commit after the first-meeting lead-in begins", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const entered = deferred();
  const release = deferred();
  let managerCalls = 0;
  adapter.proposeNextStep = async _request => {
    managerCalls += 1;
    entered.resolve();
    await release.promise;
    return {
      proposal: {
        toolCall: { tool: "wait", args: { reason: "회의 전에 잠시 기다립니다." } },
        rationale: "Wait once, then yield.",
        done: true,
      },
      meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-in-flight-commit"),
  });
  const started = service.start("meeting-in-flight-commit", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "meeting-in-flight-commit:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: firstMeetingParticipantActors(started),
    },
  });
  const managerGoal = seeded.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.ok(managerGoal);
  assert.equal(
    service.snapshot(started.runId).scheduler.actors.find(
      actor => actor.actorId === "NPC_Studio_Manager",
    )?.pendingMovement,
    null,
  );

  const pending = service.decision({
    runId: started.runId,
    wakeId: managerGoal.wakeId,
    observedWorldRevision: managerGoal.observedWorldRevision,
  });
  const entryOutcome = await Promise.race([
    entered.promise.then(() => "entered" as const),
    pending.then(response => `resolved:${response.status}` as const),
    new Promise<"timeout">(resolve => setTimeout(() => resolve("timeout"), 100)),
  ]);
  assert.equal(entryOutcome, "entered");
  assert.equal(service.snapshot(started.runId).worldClock.elapsedSeconds, 0);
  assert.equal(managerCalls, 1, "provider transport starts before meeting ownership begins");

  await advanceToFirstMeetingLeadIn(service, started.runId, "meeting-in-flight-commit");
  release.resolve();
  const response = await pending;
  assert.equal(response.status, "stale");
  assert.equal(response.providerMetas.length, 1);
  assert.deepEqual(response.actionDeltas, []);
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(response.speechEvents, []);
});

test("meeting ownership stops an in-flight participant talk before the reply provider spend", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  const entered = deferred();
  const release = deferred();
  let firstTurnCalls = 0;
  let replyCalls = 0;
  adapter.proposeNextStep = async _request => {
    firstTurnCalls += 1;
    entered.resolve();
    await release.promise;
    return {
      proposal: {
        toolCall: { tool: "talk_to", args: { actorId: "NPC_Park_Caretaker" } },
        utterance: "회의 전에 확인할 말이 있습니다.",
        rationale: "Address the audible caretaker once.",
        done: true,
      },
      meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
    };
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    replyCalls += 1;
    return originalAmbientReply(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-in-flight-talk"),
  });
  const started = service.start("meeting-in-flight-talk", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "meeting-in-flight-talk:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: firstMeetingParticipantActors(started),
    },
  });
  const managerGoal = seeded.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.ok(managerGoal);

  const pending = service.decision({
    runId: started.runId,
    wakeId: managerGoal.wakeId,
    observedWorldRevision: managerGoal.observedWorldRevision,
  });
  const entryOutcome = await Promise.race([
    entered.promise.then(() => "entered" as const),
    pending.then(response => `resolved:${response.status}` as const),
    new Promise<"timeout">(resolve => setTimeout(() => resolve("timeout"), 100)),
  ]);
  assert.equal(entryOutcome, "entered");
  assert.equal(firstTurnCalls, 1, "the first provider transport is genuinely in flight");

  await advanceToFirstMeetingLeadIn(service, started.runId, "meeting-in-flight-talk");
  release.resolve();
  const response = await pending;
  assert.equal(response.status, "stale");
  assert.equal(response.providerMetas.length, 1);
  assert.equal(replyCalls, 0, "meeting ownership is claimed before ambient reply transport");
  assert.deepEqual(response.speechEvents, []);
  assert.equal(service.snapshot(started.runId).ambientSpeech.activeConversation, null);
});

test("a nonparticipant cannot finish or newly target a meeting-owned participant", async () => {
  const sourceActorId = "NPC_Studio_Receptionist";
  const targetActorId = "NPC_Studio_Manager";
  const adapter = createStudioReceptionScriptedAdapter();
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  const replyEntered = deferred();
  const replyRelease = deferred();
  let phase: "race" | "observe" = "race";
  let allowedAtClaim: string[] | undefined;
  let allowedWhileOwned: string[] | undefined;
  let replyCalls = 0;
  adapter.proposeNextStep = async request => {
    if (request.observePacket.actorId === sourceActorId) {
      if (phase === "race") allowedAtClaim = [...(request.allowedTalkActorIds ?? [])];
      else allowedWhileOwned = [...(request.allowedTalkActorIds ?? [])];
    }
    if (phase === "observe") {
      return {
        proposal: {
          toolCall: null,
          utterance: null,
          rationale: "회의가 소유한 상대에게 별도 대화를 시도하지 않습니다.",
          done: true,
        },
        meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
      };
    }
    return {
      proposal: {
        toolCall: { tool: "talk_to", args: { actorId: targetActorId } },
        utterance: "회의 전에 잠깐 확인할 말이 있습니다.",
        rationale: "Address the currently available manager once.",
        done: true,
      },
      meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
    };
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    replyCalls += 1;
    replyEntered.resolve();
    await replyRelease.promise;
    return originalAmbientReply(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-owned-target"),
    layout: targetOwnershipRaceLayout(),
  });
  const started = service.start("meeting-owned-target", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "meeting-owned-target:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: targetOwnershipRaceActors(started),
    },
  });
  const sourceGoal = seeded.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === sourceActorId
  );
  assert.ok(sourceGoal);

  const pending = service.decision({
    runId: started.runId,
    wakeId: sourceGoal.wakeId,
    observedWorldRevision: sourceGoal.observedWorldRevision,
  });
  await replyEntered.promise;
  assert.deepEqual(allowedAtClaim, [targetActorId]);
  assert.equal(replyCalls, 1, "the reply was claimed while both actors were still available");

  let current = service.snapshot(started.runId);
  await service.advance({
    runId: started.runId,
    advanceId: "meeting-owned-target:lead-in",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: targetOwnershipRaceActors(current),
    },
  });
  const meetingOwnsActorGoal = Reflect.get(service, "activeMeetingOwnsActorGoal").bind(
    service,
  ) as (actorId: string, elapsedSeconds: number) => boolean;
  assert.equal(meetingOwnsActorGoal(sourceActorId, 10), false);
  assert.equal(meetingOwnsActorGoal(targetActorId, 10), true);

  replyRelease.resolve();
  const stale = await pending;
  assert.equal(stale.status, "stale");
  assert.equal(stale.providerMetas.length, 2);
  assert.deepEqual(stale.speechEvents, []);
  assert.equal(service.snapshot(started.runId).ambientSpeech.activeConversation, null);

  type MutableActor = { memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  const sourceActor = internalRun?.actors.get(sourceActorId);
  current = service.snapshot(started.runId);
  const sourceScheduler = current.scheduler.actors.find(actor => actor.actorId === sourceActorId);
  assert.ok(sourceActor && sourceScheduler);
  sourceActor.memories.push({
    memoryId: "meeting-owned-target:new-semantic-memory",
    kind: "player_contact_outcome",
    sourceActorId: "player",
    listenerActorId: sourceActorId,
    contactId: "meeting-owned-target:contact",
    outcome: "not_engaged",
    contactReason: "새로운 의미 사건을 기억했습니다.",
    interactionZoneId: "StudioReceptionConversation",
    originAnchorRef: sourceScheduler.confirmedAnchorRef,
    worldSeconds: current.worldClock.elapsedSeconds,
    worldRevision: current.worldRevision,
  });
  phase = "observe";
  const readmitted = await service.advance({
    runId: started.runId,
    advanceId: "meeting-owned-target:readmit",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: targetOwnershipRaceActors(current),
    },
  });
  const readmittedGoal = readmitted.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === sourceActorId
  );
  assert.ok(readmittedGoal);
  const observed = await service.decision({
    runId: started.runId,
    wakeId: readmittedGoal.wakeId,
    observedWorldRevision: readmittedGoal.observedWorldRevision,
  });
  assert.equal(observed.status, "completed");
  assert.deepEqual(
    allowedWhileOwned,
    [],
    "meeting ownership removes the target from the exact provider scope",
  );
});

test("a queued goal reply rechecks meeting ownership after its background slot is granted", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  const firstTurnReturned = deferred();
  let replyCalls = 0;
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("meeting-queued-reply"),
  });
  const acquireSlot = Reflect.get(service, "acquireBackgroundProviderSlot").bind(
    service,
  ) as (runId: string) => Promise<void>;
  const releaseSlot = Reflect.get(service, "releaseBackgroundProviderSlot").bind(
    service,
  ) as (runId: string) => void;
  let heldSlots = 0;
  let queuedHoldScheduled = false;
  let queuedHoldAcquired = Promise.resolve();

  adapter.proposeNextStep = async request => {
    await acquireSlot(request.sessionId);
    heldSlots += 1;
    queuedHoldScheduled = true;
    queuedHoldAcquired = acquireSlot(request.sessionId).then(() => {
      heldSlots += 1;
    });
    firstTurnReturned.resolve();
    return {
      proposal: {
        toolCall: { tool: "talk_to", args: { actorId: "NPC_Park_Caretaker" } },
        utterance: "회의 전에 확인할 말이 있습니다.",
        rationale: "Address the audible caretaker once.",
        done: true,
      },
      meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
    };
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    replyCalls += 1;
    return originalAmbientReply(request);
  };

  const started = service.start("meeting-queued-reply", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "meeting-queued-reply:seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "Studio" },
      actors: firstMeetingParticipantActors(started),
    },
  });
  const managerGoal = seeded.scheduleWakes.find(wake =>
    wake.kind === "goal" && wake.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.ok(managerGoal);

  const pending = service.decision({
    runId: started.runId,
    wakeId: managerGoal.wakeId,
    observedWorldRevision: managerGoal.observedWorldRevision,
  });
  try {
    await firstTurnReturned.promise;
    assert.equal(queuedHoldScheduled, true);
    await queuedHoldAcquired;

    type BackgroundGate = { active: number; waiters: unknown[] };
    const gates = Reflect.get(service, "backgroundProviderGates") as Map<string, BackgroundGate>;
    let replyQueued = false;
    for (let spin = 0; spin < 100; spin += 1) {
      const activeConversation = service.snapshot(started.runId).ambientSpeech.activeConversation;
      const gate = gates.get(started.runId);
      replyQueued = activeConversation?.wakeId === managerGoal.wakeId && gate?.waiters.length === 1;
      if (replyQueued) break;
      await Promise.resolve();
    }
    assert.equal(replyQueued, true, "the listener reply must be queued behind two held slots");
    assert.equal(replyCalls, 0);

    await advanceToFirstMeetingLeadIn(service, started.runId, "meeting-queued-reply");
    releaseSlot(started.runId);
    heldSlots -= 1;

    const response = await pending;
    assert.equal(response.status, "stale");
    assert.equal(response.providerMetas.length, 1);
    assert.equal(replyCalls, 0, "the granted reply slot rechecks both meeting participants");
    assert.deepEqual(response.speechEvents, []);
    assert.equal(service.snapshot(started.runId).ambientSpeech.activeConversation, null);
  } finally {
    while (heldSlots > 0) {
      releaseSlot(started.runId);
      heldSlots -= 1;
    }
  }
});

test("one meeting decision is single-flight and uses two calls with an exact grounded ambient reply", async () => {
  const { adapter, requests, ambientRequests } = capturingAdapter();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("retry") });
  const meeting = await readyFirstMeeting(service, "ambient-retry");
  const current = service.snapshot(meeting.started.runId);
  const actors = ambientSpatialActors(current);
  const manager = actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  const caretaker = actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(manager);
  assert.ok(caretaker);
  manager.visibleActorIds = [caretaker.actorId];
  manager.audibleActorIds = [caretaker.actorId];
  manager.visibleObjectIds = ["Prop_Park_Box"];
  caretaker.visibleActorIds = [manager.actorId];
  caretaker.audibleActorIds = [manager.actorId];
  caretaker.visibleObjectIds = ["Prop_Studio_Plant"];
  await service.advance({
    runId: meeting.started.runId,
    advanceId: "ambient-retry:current-spatial-context",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors,
    },
  });

  const [first, concurrent] = await Promise.all([
    service.decision(meeting.request),
    service.decision(meeting.request),
  ]);
  assert.deepEqual(concurrent, first);
  assert.equal(first.status, "completed");
  assert.equal(first.speechEvents.length, 2);
  assert.equal(requests.length, 1, "the first speaker still uses one ordinary agent proposal");
  assert.equal(ambientRequests.length, 1, "the listener reply and judgment share one second call");
  assert.deepEqual(requests[0]?.observePacket.visibleActors, ["NPC_Park_Caretaker"]);
  assert.deepEqual(ambientRequests[0]?.observePacket.visibleActors, ["NPC_Studio_Manager"]);
  assert.deepEqual(
    requests[0]?.observePacket.visibleObjects.map(object => object.objectId),
    ["Prop_Park_Box"],
  );
  assert.deepEqual(
    ambientRequests[0]?.observePacket.visibleObjects.map(object => object.objectId),
    ["Prop_Studio_Plant"],
  );
  assert.deepEqual(requests[0]?.requiredToolCall, {
    tool: "talk_to",
    actorId: "NPC_Park_Caretaker",
  });
  assert.equal(requests[0]?.requireUtterance, true);
  assert.equal(requests[0]?.locale, "ko-KR");
  assert.equal(ambientRequests[0]?.locale, "ko-KR");
  assert.equal(ambientRequests[0]?.listenerActorId, "NPC_Park_Caretaker");
  assert.equal(ambientRequests[0]?.targetActorId, "NPC_Studio_Manager");
  assert.equal(ambientRequests[0]?.sourceSpeakerActorId, "NPC_Studio_Manager");
  assert.equal(ambientRequests[0]?.sourceUtterance, first.speechEvents[0]?.line);
  assert.equal(
    requests[0]?.observePacket.actorContext?.publicIdentity,
    "이보 — 스튜디오 관리자",
  );
  assert.ok(
    requests[0]?.observePacket.selfContext?.selfOnlyPressures[0]?.includes("예외를 한 번 승인"),
  );
  assert.deepEqual(
    requests[0]?.observePacket.selfContext?.knownRelationships.map(
      relationship => relationship.actorId,
    ),
    ["NPC_Park_Caretaker"],
  );
  assert.equal(
    ambientRequests[0]?.observePacket.actorContext?.publicIdentity,
    "솔 — 공원 관리인",
  );
  assert.ok(
    ambientRequests[0]?.observePacket.selfContext?.selfOnlyPressures[0]?.includes("식별하지 못했다"),
  );
  assert.deepEqual(
    ambientRequests[0]?.observePacket.selfContext?.knownRelationships.map(
      relationship => relationship.actorId,
    ),
    ["NPC_Studio_Manager", "NPC_Studio_Receptionist"],
  );
  assert.ok(!JSON.stringify(requests[0]?.observePacket).includes("현재 방문자인지는 식별"));
  assert.ok(!JSON.stringify(ambientRequests[0]?.observePacket).includes("예외를 한 번 승인"));
  assert.deepEqual(
    ambientRequests[0]?.observePacket.heardSpeech.at(-1),
    {
      speakerActorId: "NPC_Studio_Manager",
      source: {
        kind: "ambient_utterance",
        id: `ambient_speech:${meeting.request.wakeId}:1`,
      },
      line: first.speechEvents[0]?.line,
    },
  );

  const retried = await service.decision(meeting.request);
  assert.deepEqual(retried, first);
  assert.equal(
    requests.length + ambientRequests.length,
    2,
    "a completed retry must not call the provider again",
  );
  await assert.rejects(
    service.decision({
      ...meeting.request,
      observedWorldRevision: meeting.request.observedWorldRevision + 1,
    }),
    (error: unknown) => error instanceof RunError && error.code === "decision_id_conflict",
  );
});

test("ambient utterances enter only the speaker and current runtime-confirmed listeners with full provenance", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeAndProposeAmbientReply = async request => ({
    proposal: {
      toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
      utterance: "그 이야기를 들으니 방문자를 조금 더 경계해야겠습니다.",
      rationale: "직접 들은 말이 방문자에 대한 의문을 키웠습니다.",
      done: true,
      suspicionDelta: 35,
      proposedStance: "oppose",
      whyLine: "관리인이 전한 구체적인 말 때문에 방문자를 경계하게 됐습니다.",
      openQuestion: null,
    },
    meta: { profileId: "scripted/ambient-change", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("memory"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-memory");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "completed");
  assert.deepEqual(response.speechEvents.map(event => event.seq), [1, 2]);
  assert.deepEqual(
    response.speechEvents[0]?.listenerActorIds,
    ["NPC_Park_Caretaker", "NPC_Roaming_Liaison"],
  );
  assert.deepEqual(
    response.speechEvents[1]?.listenerActorIds,
    ["NPC_Studio_Manager", "NPC_Roaming_Liaison"],
  );

  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.ambientSpeech.cursor, 2);
  assert.deepEqual(snapshot.ambientSpeech.events, response.speechEvents);
  assert.equal(snapshot.ambientSpeech.activeConversation, null);
  const manager = snapshot.actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  const caretaker = snapshot.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(manager);
  assert.ok(caretaker);
  assert.equal(manager.stance, "uncertain");
  assert.equal(manager.suspicion, 0);
  assert.equal(caretaker.stance, "oppose");
  assert.equal(caretaker.suspicion, 35);
  assert.equal(caretaker.hasMeaningfulFirsthandConversation, false);
  const expectedMemoryCount: Record<string, number> = {
    NPC_Studio_Receptionist: 0,
    NPC_Studio_Manager: 2,
    NPC_Office_Worker: 0,
    NPC_Park_Caretaker: 3,
    NPC_Station_Officer: 0,
    NPC_Roaming_Liaison: 2,
  };
  const memoryIds = new Set<string>();
  for (const actor of snapshot.actors) {
    assert.equal(actor.memories.length, expectedMemoryCount[actor.actorId]);
    for (const memory of actor.memories.filter(memory => memory.kind === "ambient_utterance")) {
      if (memory.kind !== "ambient_utterance") continue;
      assert.ok(!memoryIds.has(memory.memoryId));
      memoryIds.add(memory.memoryId);
      const event = response.speechEvents.find(candidate => candidate.eventId === memory.eventId);
      assert.ok(event);
      const { memoryId: _memoryId, kind: _kind, ...provenance } = memory;
      assert.deepEqual(provenance, event);
    }
  }
  assert.equal(memoryIds.size, 6);
  const sourceEvent = response.speechEvents[0];
  assert.ok(sourceEvent);
  const sourceMemory = caretaker.memories.find(
    memory => memory.kind === "ambient_utterance" && memory.eventId === sourceEvent.eventId,
  );
  const judgmentMemory = caretaker.memories.find(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(sourceMemory && sourceMemory.kind === "ambient_utterance");
  assert.ok(judgmentMemory && judgmentMemory.kind === "ambient_stance_judgment");
  assert.equal(judgmentMemory.sourceActorId, sourceEvent.speakerActorId);
  assert.equal(judgmentMemory.listenerActorId, caretaker.actorId);
  assert.equal(judgmentMemory.sourceSpeechEventId, sourceEvent.eventId);
  assert.equal(judgmentMemory.sourceMemoryId, sourceMemory.memoryId);
  assert.equal(judgmentMemory.suspicionBefore, 0);
  assert.equal(judgmentMemory.suspicionDelta, 35);
  assert.equal(judgmentMemory.suspicionAfter, 35);
  assert.equal(judgmentMemory.stanceBefore, "uncertain");
  assert.equal(judgmentMemory.proposedStance, "oppose");
  assert.equal(judgmentMemory.appliedStance, "oppose");
  assert.equal(snapshot.institutionalPressure, 0);
  assert.deepEqual(snapshot.records, []);
  assert.deepEqual(snapshot.ledgerEvents, []);
  assert.deepEqual(snapshot.socialView.encounteredResidents, []);
  const afterCursor = await service.advance({
    runId: meeting.started.runId,
    advanceId: "ambient-after-cursor",
    observedWorldRevision: response.worldRevision,
    afterSpeechSeq: 2,
    elapsedSeconds: 1,
    arrivals: [],
  });
  assert.deepEqual(afterCursor.ambientSpeechEvents, []);
  assert.equal(afterCursor.ambientSpeechCursor, 2);
});

test("player speech encounter acknowledgements prove audibility without leaking a hidden stance", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("player-encounter"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-player-encounter");
  const response = await service.decision(meeting.request);
  const event = response.speechEvents[0];
  assert.ok(event);
  const before = service.snapshot(meeting.started.runId);
  const encountered = await service.encounter({
    runId: meeting.started.runId,
    encounterId: "heard-1",
    encounter: {
      kind: "speech",
      speechEventId: event.eventId,
      playerPosition: [...event.audibility.speakerPosition],
    },
  });
  assert.deepEqual(encountered.socialView.encounteredResidents, []);
  assert.deepEqual(encountered.socialView.openQuestions, []);
  assert.equal(service.snapshot(meeting.started.runId).worldRevision, before.worldRevision);
  const retried = await service.encounter({
    runId: meeting.started.runId,
    encounterId: "heard-1",
    encounter: {
      kind: "speech",
      speechEventId: event.eventId,
      playerPosition: [...event.audibility.speakerPosition],
    },
  });
  assert.deepEqual(retried, encountered);
  await assert.rejects(
    service.encounter({
      runId: meeting.started.runId,
      encounterId: "heard-far",
      encounter: {
        kind: "speech",
        speechEventId: event.eventId,
        playerPosition: [1000, 0, 1000],
      },
    }),
    (error: unknown) => error instanceof RunError && error.code === "encounter_not_visible",
  );
});

test("provider-cited visible records survive ambient commit and disclose only after the player hears them", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    if (
      request.requiredToolCall?.tool === "talk_to" &&
      request.observePacket.visibleRecords.some(
        record => record.recordId === "record:ambient:cited",
      )
    ) {
      return {
        proposal: {
          toolCall: {
            tool: "talk_to",
            args: { actorId: request.requiredToolCall.actorId },
          },
          utterance: "방문자가 접수 경위를 설명했다는 기록이 있습니다.",
          citedRecordIds: ["record:ambient:cited"],
          rationale: "현재 보이는 기록의 내용을 상대에게 전합니다.",
          done: true,
        },
        meta: {
          profileId: "scripted/ambient-cited-record",
          transport: "scripted",
          usedFallback: false,
        },
      };
    }
    const resolved = await originalNextStep(request);
    if (resolved.proposal.utterance && request.observePacket.visibleRecords.some(
      record => record.recordId === "record:ambient:cited",
    )) {
      resolved.proposal.citedRecordIds = ["record:ambient:cited"];
    }
    return resolved;
  };
  const originalReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  adapter.judgeAndProposeAmbientReply = async request => {
    const resolved = await originalReply(request);
    if (request.observePacket.visibleRecords.some(
      record => record.recordId === "record:ambient:cited",
    )) {
      resolved.proposal.citedRecordIds = ["record:ambient:cited"];
    }
    return resolved;
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("ambient-cited-record"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-cited-record");
  type MutableRun = {
    records: RunRecord[];
    ledgerEvents: RunLedgerEvent[];
  };
  const runs = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const run = runs.get(meeting.started.runId);
  assert.ok(run);
  const record: RunRecord = {
    recordId: "record:ambient:cited",
    kind: "note",
    authorActorId: STUDIO_RECEPTIONIST_ID,
    authorRole: "studio_receptionist",
    targetId: "player",
    stateBody: "방문자가 접수 경위를 설명했다는 기록입니다.",
    visibleToActorIds: [...new Set(["player", ...meeting.wake.actorIds])],
    sourceRefs: [{ sourceMemoryId: "mem:ambient:cited", originActorId: "player" }],
    textSurfaceId: "TS_Studio_ReviewRecords",
    createdWorldSeconds: 1,
    createdWorldRevision: 1,
    recordRevision: 1,
    lastLedgerEventId: "ledger:ambient:cited",
  };
  const ledgerEvent: RunLedgerEvent = {
    eventId: record.lastLedgerEventId,
    seq: 1,
    kind: "record_written",
    actorId: record.authorActorId,
    actorRole: record.authorRole,
    recordId: record.recordId,
    sourceMemoryId: record.sourceRefs[0]!.sourceMemoryId,
    recordRevision: record.recordRevision,
    pressureBefore: 0,
    pressureDelta: 0,
    pressureAfter: 0,
    visibleToActorIds: [...record.visibleToActorIds],
    whyLine: "접수 경위를 기록했습니다.",
    openQuestion: null,
    worldSeconds: 1,
    worldRevision: 1,
  };
  run.records.push(record);
  run.ledgerEvents.push(ledgerEvent);

  const decision = await service.decision(meeting.request);
  assert.equal(decision.status, "completed");
  assert.equal(decision.speechEvents.length, 2);
  assert.ok(decision.speechEvents.every(event =>
    event.citedRecords[0]?.recordId === record.recordId &&
    event.citedRecords[0]?.recordRevision === record.recordRevision &&
    event.citedRecords[0]?.lastLedgerEventId === record.lastLedgerEventId
  ));
  assert.deepEqual(
    service.snapshot(meeting.started.runId).socialView.encounteredRecords,
    [],
    "off-screen committed speech is not yet player knowledge",
  );
  const event = decision.speechEvents[0];
  assert.ok(event);
  const heard = await service.encounter({
    runId: meeting.started.runId,
    encounterId: "heard-provider-cited-record",
    encounter: {
      kind: "speech",
      speechEventId: event.eventId,
      playerPosition: [...event.audibility.speakerPosition],
    },
  });
  assert.equal(heard.socialView.encounteredRecords[0]?.recordId, record.recordId);
  assert.equal(heard.socialView.encounteredRecords[0]?.provenance.originKind, "speech");
  assert.equal(heard.socialView.encounteredRecords[0]?.provenance.sourceExcerpt, event.line);
});

test("audible record citations disclose only the frozen revision and direct inspection upgrades provenance", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("spoken-record"),
  });
  const started = service.start("spoken-record-start", "ko-KR");
  const layout = loadRunLayout();
  const volume = layout.audibilityVolumes[0];
  const box = volume?.boxes[0];
  const surface = layout.recordSurfaces.find(
    candidate => candidate.surfaceId === "TS_Studio_ReviewRecords",
  );
  const surfacePosition = surface ? layout.anchorPositions[surface.anchorRef] : undefined;
  assert.ok(volume && box && surface && surfacePosition);

  const record: RunRecord = {
    recordId: "record:spoken:1",
    kind: "note",
    authorActorId: STUDIO_RECEPTIONIST_ID,
    authorRole: "studio_receptionist",
    targetId: "player",
    stateBody: "방문자가 접수 경위를 설명했다는 기록입니다.",
    visibleToActorIds: [STUDIO_RECEPTIONIST_ID, "player"],
    sourceRefs: [{ sourceMemoryId: "mem:spoken:source", originActorId: "player" }],
    textSurfaceId: surface.surfaceId,
    createdWorldSeconds: 1,
    createdWorldRevision: 1,
    recordRevision: 1,
    lastLedgerEventId: "ledger:spoken:1",
  };
  const ledgerEvent: RunLedgerEvent = {
    eventId: record.lastLedgerEventId,
    seq: 1,
    kind: "record_written",
    actorId: STUDIO_RECEPTIONIST_ID,
    actorRole: "studio_receptionist",
    recordId: record.recordId,
    sourceMemoryId: record.sourceRefs[0]!.sourceMemoryId,
    recordRevision: record.recordRevision,
    pressureBefore: 0,
    pressureDelta: 25,
    pressureAfter: 25,
    visibleToActorIds: [...record.visibleToActorIds],
    whyLine: "접수 경위가 기록으로 남았습니다.",
    openQuestion: {
      status: "open",
      text: "기록에 남은 방문 경위는 무엇인가?",
      whyLine: "직접 기록을 확인했습니다.",
    },
    worldSeconds: 1,
    worldRevision: 1,
  };
  const event = (eventId: string, seq: number, recordRevision: number): RunAmbientSpeechEvent => ({
    seq,
    eventId,
    wakeId: "wake:spoken-record",
    conversationId: "ambient:spoken-record",
    turnId: `ambient:spoken-record#${seq}`,
    speakerActorId: STUDIO_RECEPTIONIST_ID,
    targetActorId: "NPC_Studio_Manager",
    listenerActorIds: ["NPC_Studio_Manager"],
    line: "방문자가 접수 경위를 설명했다는 기록이 있습니다.",
    citedRecords: [{
      recordId: record.recordId,
      recordRevision,
      lastLedgerEventId: record.lastLedgerEventId,
    }],
    worldSeconds: 1,
    observedWorldRevision: 0,
    worldRevision: 1,
    audibility: {
      volumeId: volume.volumeId,
      maxSpeechDistanceM: volume.maxSpeechDistanceM,
      speakerPosition: [box.center[0], box.center[1], box.center[2]],
    },
    proposalMeta: {
      profileId: "scripted/spoken-record",
      transport: "scripted",
      usedFallback: false,
    },
  });
  type MutableRun = {
    records: RunRecord[];
    ledgerEvents: RunLedgerEvent[];
    ambientSpeechEvents: RunAmbientSpeechEvent[];
  };
  const runs = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const run = runs.get(started.runId);
  assert.ok(run);
  run.records.push(record);
  run.ledgerEvents.push(ledgerEvent);
  const staleEvent = event("speech:spoken:stale", 1, 2);
  const exactEvent = event("speech:spoken:exact", 2, 1);
  run.ambientSpeechEvents.push(staleEvent, exactEvent);

  const playerPosition: [number, number, number] = [
    box.center[0],
    box.center[1],
    box.center[2],
  ];
  const stale = await service.encounter({
    runId: started.runId,
    encounterId: "heard-stale-record-citation",
    encounter: {
      kind: "speech",
      speechEventId: staleEvent.eventId,
      playerPosition,
    },
  });
  assert.deepEqual(stale.socialView.encounteredRecords, []);

  const heard = await service.encounter({
    runId: started.runId,
    encounterId: "heard-exact-record-citation",
    encounter: {
      kind: "speech",
      speechEventId: exactEvent.eventId,
      playerPosition,
    },
  });
  const spokenRecord = heard.socialView.encounteredRecords[0];
  assert.ok(spokenRecord);
  assert.equal(spokenRecord.stateBody, record.stateBody);
  assert.equal(spokenRecord.provenance.originKind, "speech");
  assert.equal(spokenRecord.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(spokenRecord.provenance.recipientKind, "listener");
  assert.equal(spokenRecord.provenance.recipientActorId, "player");
  assert.equal(spokenRecord.provenance.sourceExcerpt, exactEvent.line);
  assert.equal(heard.socialView.pressure.band, "low");
  assert.deepEqual(heard.socialView.openQuestions, []);

  const inspected = await service.encounter({
    runId: started.runId,
    encounterId: "inspect-spoken-record",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [surfacePosition[0], surfacePosition[1], surfacePosition[2]],
    },
  });
  const inspectedRecord = inspected.socialView.encounteredRecords[0];
  assert.ok(inspectedRecord);
  assert.equal(inspectedRecord.provenance.originKind, "record");
  assert.equal(inspected.socialView.pressure.band, "raised");
  assert.equal(inspected.socialView.openQuestions[0]?.text, ledgerEvent.openQuestion?.text);
});

test("player opening context includes a listener's ambient memory but never leaks it to an uninvolved actor", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const openingRequests: ConversationTurnRequest[] = [];
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    openingRequests.push(structuredClone(request));
    return originalOpening(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("privacy") });
  const meeting = await readyFirstMeeting(service, "ambient-privacy");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "completed");
  assert.deepEqual(
    response.actorReadinessDeltas.map(delta => delta.actorId).sort(),
    ["NPC_Park_Caretaker", "NPC_Roaming_Liaison", "NPC_Studio_Manager"].sort(),
  );

  await service.preloadConversation(
    meeting.started.runId,
    "NPC_Studio_Manager",
    "ParkConversation",
    "ko-KR",
  );
  await service.preloadConversation(
    meeting.started.runId,
    "NPC_Office_Worker",
    "OfficeConversation",
    "ko-KR",
  );
  const managerRequest = openingRequests.find(request => request.actorId === "NPC_Studio_Manager");
  const officeRequest = openingRequests.find(request => request.actorId === "NPC_Office_Worker");
  assert.ok(managerRequest);
  assert.ok(officeRequest);
  assert.deepEqual(managerRequest.observePacket.visibleActors, []);
  assert.ok(managerRequest.observePacket.heardSpeech.some(
    speech => speech.speakerActorId === "NPC_Park_Caretaker",
  ));
  assert.ok(managerRequest.observePacket.actorMemory.evidence.some(
    evidence =>
      evidence.evidenceType === "utterance" &&
      evidence.sourceActorId === "NPC_Park_Caretaker",
  ));
  assert.deepEqual(officeRequest.observePacket.visibleActors, []);
  assert.deepEqual(officeRequest.observePacket.heardSpeech, []);
  assert.ok(officeRequest.observePacket.actorMemory.evidence.every(
    evidence => evidence.sourceActorId !== "NPC_Park_Caretaker",
  ));
});

test("run advance remains responsive while an ambient provider proposal is pending", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const original = adapter.proposeNextStep.bind(adapter);
  const entered = deferred();
  const release = deferred();
  let calls = 0;
  adapter.proposeNextStep = async request => {
    calls += 1;
    if (calls === 1) {
      entered.resolve();
      await release.promise;
    }
    return original(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("async") });
  const meeting = await readyFirstMeeting(service, "ambient-async");
  const pendingDecision = service.decision(meeting.request);
  await entered.promise;

  const advanced = service.advance({
    runId: meeting.started.runId,
    advanceId: "ambient-while-provider-pending",
    observedWorldRevision: meeting.ready.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  const winner = await Promise.race([
    advanced.then(() => "advance" as const),
    new Promise<"timeout">(resolve => setTimeout(() => resolve("timeout"), 100)),
  ]);
  assert.equal(winner, "advance", "provider I/O must be outside the per-run serialize chain");
  const advanceResponse = await advanced;
  assert.equal(advanceResponse.clock.toSeconds, 91);
  release.resolve();
  const decision = await pendingDecision;
  assert.equal(decision.status, "completed", "revision movement alone must not stale valid meeting facts");
  assert.ok(decision.worldRevision > advanceResponse.worldRevision);
});

test("a modal queues resolved ambient speech and exact retry commits it without another provider call", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const original = adapter.proposeNextStep.bind(adapter);
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  const entered = deferred();
  const release = deferred();
  let ambientCalls = 0;
  adapter.proposeNextStep = async request => {
    ambientCalls += 1;
    if (ambientCalls === 1) {
      entered.resolve();
      await release.promise;
    }
    return original(request);
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    ambientCalls += 1;
    return originalAmbientReply(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("modal") });
  const meeting = await readyFirstMeeting(service, "ambient-modal");
  const pendingDecision = service.decision(meeting.request);
  await entered.promise;

  await service.preloadConversation(
    meeting.started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    meeting.started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ground-ambient-modal-player",
    [[meeting.wake.actorIds[0] as string, meeting.wake.actorIds[1] as string]],
  );
  const playerConversation = await service.startConversation(
    meeting.started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  release.resolve();
  const queued = await pendingDecision;
  assert.equal(queued.status, "queued");
  assert.deepEqual(queued.speechEvents, []);
  assert.equal(ambientCalls, 2);
  assert.equal(service.snapshot(meeting.started.runId).ambientSpeech.cursor, 0);
  assert.equal(
    service.snapshot(meeting.started.runId).ambientSpeech.activeConversation?.status,
    "queued",
  );
  assert.deepEqual(await service.decision(meeting.request), queued);
  assert.equal(ambientCalls, 2);

  await service.answer(
    meeting.started.runId,
    playerConversation.sessionId,
    playerConversation.nextTurn.turnId,
    { type: "choice", choiceId: playerConversation.nextTurn.choices[0].choiceId },
  );
  const ended = await service.endConversation(meeting.started.runId, playerConversation.sessionId);
  assert.equal(
    ended.queuedRunDeltas.filter(delta => delta.kind === "speech").length,
    2,
    "the modal close drains each resolved utterance exactly once",
  );
  const afterDrain = service.snapshot(meeting.started.runId);
  const listenerJudgments = afterDrain.actors.flatMap(actor =>
    actor.memories.filter(memory => memory.kind === "ambient_stance_judgment"),
  );
  assert.equal(listenerJudgments.length, 1, "the queued listener judgment commits exactly once");
  const committed = await service.decision(meeting.request);
  assert.equal(committed.status, "completed");
  assert.equal(committed.speechEvents.length, 0, "the decision retry cannot redeliver drained speech");
  assert.equal(ambientCalls, 2, "queued retry reuses both resolved proposals");
  assert.deepEqual(await service.decision(meeting.request), committed);
});

test("a neutral ambient reply records the provider-authored no-change judgment", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("no-change"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-no-change");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "completed");

  const snapshot = service.snapshot(meeting.started.runId);
  const caretaker = snapshot.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretaker);
  const judgment = caretaker.memories.find(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(judgment && judgment.kind === "ambient_stance_judgment");
  assert.equal(judgment.suspicionDelta, 0);
  assert.equal(judgment.stanceBefore, "uncertain");
  assert.equal(judgment.proposedStance, "uncertain");
  assert.equal(judgment.appliedStance, "uncertain");
  assert.equal(judgment.whyLine, "테스트 대화만으로는 판단을 바꾸지 않았습니다.");
  assert.deepEqual(snapshot.socialView.encounteredResidents, []);

  await service.preloadConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ground-ambient-no-change",
  );
  const started = await service.startConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.deepEqual(
    started.socialView.encounteredResidents,
    [],
    "a pure no-change judgment remains diagnostic memory, not a social-view disclosure",
  );
});

test("ambient hearsay cannot create a vouch without prior meaningful firsthand conversation", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeAndProposeAmbientReply = async request => ({
    proposal: {
      toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
      utterance: "그 말이라면 방문자를 믿어도 되겠습니다.",
      rationale: "전해 들은 내용을 긍정적으로 판단했습니다.",
      done: true,
      suspicionDelta: -20,
      proposedStance: "vouch",
      whyLine: "전해 들은 설명은 긍정적이지만 직접 확인한 적은 없습니다.",
      openQuestion: null,
    },
    meta: { profileId: "scripted/ambient-vouch", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("vouch") });
  const meeting = await readyFirstMeeting(service, "ambient-vouch-clamp");
  await service.decision(meeting.request);
  const caretaker = service.snapshot(meeting.started.runId).actors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(caretaker);
  const judgment = caretaker.memories.find(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(judgment && judgment.kind === "ambient_stance_judgment");
  assert.equal(judgment.proposedStance, "vouch");
  assert.equal(judgment.appliedStance, "uncertain");
  assert.equal(caretaker.stance, "uncertain");
  assert.equal(caretaker.hasMeaningfulFirsthandConversation, false);
});

test("preload keeps an off-screen ambient judgment hidden and the next conversation start discloses exact speech provenance once", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeAndProposeAmbientReply = async request => ({
    proposal: {
      toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
      utterance: "직접 만나서 그 부분을 확인해 봐야겠습니다.",
      rationale: "전해 들은 내용에 확인할 점이 생겼습니다.",
      done: true,
      suspicionDelta: 24,
      proposedStance: "oppose",
      whyLine: "스튜디오 관리자가 전한 말 때문에 방문자의 설명을 의심하게 됐습니다.",
      openQuestion: {
        status: "open",
        text: "방문자는 왜 관리자에게 다른 설명을 했을까?",
        whyLine: "전해 들은 설명과 직접 확인할 내용이 남았습니다.",
      },
    },
    meta: { profileId: "scripted/ambient-disclosure", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("disclose"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-disclosure");
  const decision = await service.decision(meeting.request);
  const hidden = service.snapshot(meeting.started.runId);
  const caretaker = hidden.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretaker);
  const judgment = caretaker.memories.find(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(judgment && judgment.kind === "ambient_stance_judgment");
  assert.deepEqual(hidden.socialView.encounteredResidents, []);

  await service.preloadConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.deepEqual(
    service.snapshot(meeting.started.runId).socialView.encounteredResidents,
    [],
    "preloading an opening is not a player encounter",
  );
  await groundOrdinaryConversation(
    service,
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ground-ambient-disclosure",
  );
  const started = await service.startConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  const disclosed = started.socialView.encounteredResidents.find(
    resident => resident.actorId === caretaker.actorId,
  );
  assert.ok(disclosed);
  assert.equal(disclosed.stance, "oppose");
  assert.equal(disclosed.stanceRevision, judgment.worldRevision);
  assert.equal(disclosed.whyLine, judgment.whyLine);
  assert.equal(disclosed.provenance?.originActorId, decision.speechEvents[0]?.speakerActorId);
  assert.equal(disclosed.provenance?.recipientActorId, caretaker.actorId);
  assert.equal(disclosed.provenance?.sourceMemoryId, judgment.sourceMemoryId);
  assert.equal(disclosed.provenance?.sourceExcerpt, decision.speechEvents[0]?.line);
  assert.equal(disclosed.provenance?.sourceExcerpt.includes(judgment.sourceMemoryId), false);
  assert.equal(
    disclosed.provenance?.sourceExcerpt.includes(judgment.sourceSpeechEventId),
    false,
  );
  assert.equal(disclosed.provenance?.whyLine, judgment.whyLine);
  const disclosedQuestion = started.socialView.openQuestions.find(
    question => question.subjectActorId === caretaker.actorId,
  );
  assert.equal(disclosedQuestion?.provenance.sourceExcerpt, decision.speechEvents[0]?.line);
  const revision = started.socialView.revision;
  const retried = await service.startConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(retried.socialView.revision, revision, "a start retry cannot disclose twice");
  assert.deepEqual(retried.socialView, started.socialView);
});

test("an ambiguous ambient source memory stays hidden instead of guessing an excerpt", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeAndProposeAmbientReply = async request => ({
    proposal: {
      toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
      utterance: "직접 확인할 내용이 생겼습니다.",
      rationale: "전해 들은 설명에 확인이 필요합니다.",
      done: true,
      suspicionDelta: 20,
      proposedStance: "oppose",
      whyLine: "전해 들은 설명 때문에 방문자를 의심하게 됐습니다.",
      openQuestion: null,
    },
    meta: {
      profileId: "scripted/ambient-ambiguous-source",
      transport: "scripted",
      usedFallback: false,
    },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: collidingMemoryIds("ambiguous-source"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-ambiguous-source");
  await service.decision(meeting.request);
  const hidden = service.snapshot(meeting.started.runId);
  const caretaker = hidden.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretaker);
  assert.equal(
    caretaker.memories.filter(memory =>
      memory.kind === "ambient_utterance" && memory.memoryId === "mem-collision"
    ).length,
    2,
  );
  await service.preloadConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ground-ambiguous-source",
  );
  const started = await service.startConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.deepEqual(started.socialView.encounteredResidents, []);
  assert.deepEqual(started.socialView.openQuestions, []);
});

test("a newer no-change ambient judgment cannot hide or misattribute an earlier material change", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let replyIndex = 0;
  adapter.judgeAndProposeAmbientReply = async request => {
    replyIndex += 1;
    if (replyIndex === 1) {
      return {
        proposal: {
          toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
          utterance: "그 이야기는 방문자에게 직접 확인해 봐야겠습니다.",
          rationale: "처음 들은 말이 방문자에 대한 판단을 바꿨습니다.",
          done: true,
          suspicionDelta: 24,
          proposedStance: "oppose",
          whyLine: "스튜디오 관리자가 전한 말 때문에 방문자의 설명을 의심하게 됐습니다.",
          openQuestion: {
            status: "open",
            text: "방문자는 왜 관리자에게 다른 설명을 했을까?",
            whyLine: "관리자에게 들은 말과 직접 확인할 내용이 남았습니다.",
          },
        },
        meta: {
          profileId: "scripted/ambient-material-then-neutral",
          transport: "scripted",
          usedFallback: false,
        },
      };
    }
    return {
      proposal: {
        toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
        utterance: "그 말만으로는 판단을 더 바꾸지 않겠습니다.",
        rationale: "두 번째 말에는 기존 판단을 바꿀 새 근거가 없습니다.",
        done: true,
        suspicionDelta: 0,
        proposedStance: request.stanceBefore,
        whyLine: "새로 들은 말만으로는 방문자에 대한 판단이 달라지지 않았습니다.",
        openQuestion: null,
      },
      meta: {
        profileId: "scripted/ambient-material-then-neutral",
        transport: "scripted",
        usedFallback: false,
      },
    };
  };

  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("material-then-neutral"),
  });
  const firstMeeting = await readyFirstMeeting(service, "ambient-material-then-neutral");
  await service.decision(firstMeeting.request);
  const afterMaterial = service.snapshot(firstMeeting.started.runId);
  const caretakerAfterMaterial = afterMaterial.actors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(caretakerAfterMaterial);
  const material = caretakerAfterMaterial.memories.find(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(material && material.kind === "ambient_stance_judgment");
  assert.equal(material.sourceActorId, "NPC_Studio_Manager");
  assert.equal(material.appliedStance, "oppose");

  const secondMeeting = await readyLaterMeeting(
    service,
    firstMeeting.started.runId,
    afterMaterial.worldRevision,
    "ambient-material-then-neutral:second",
    "MEET_RECEPTIONIST_CARETAKER",
  );
  await service.decision(secondMeeting.request);
  const hidden = service.snapshot(firstMeeting.started.runId);
  const caretaker = hidden.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretaker);
  const judgments = caretaker.memories.filter(
    memory => memory.kind === "ambient_stance_judgment",
  );
  assert.equal(judgments.length, 2);
  const noChange = judgments[1];
  assert.ok(noChange && noChange.kind === "ambient_stance_judgment");
  assert.equal(noChange.sourceActorId, "NPC_Studio_Receptionist");
  assert.ok(noChange.worldRevision > material.worldRevision);
  assert.equal(noChange.suspicionDelta, 0);
  assert.equal(noChange.appliedStance, noChange.stanceBefore);
  assert.equal(noChange.openQuestion, null);
  assert.deepEqual(hidden.socialView.encounteredResidents, []);

  await service.preloadConversation(
    firstMeeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    firstMeeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ground-material-then-neutral",
  );
  const started = await service.startConversation(
    firstMeeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  const disclosed = started.socialView.encounteredResidents.find(
    resident => resident.actorId === caretaker.actorId,
  );
  assert.ok(disclosed);
  assert.equal(disclosed.stance, caretaker.stance, "the disclosed stance is the current stance");
  assert.equal(disclosed.stance, "oppose");
  assert.equal(disclosed.stanceRevision, material.worldRevision);
  assert.equal(disclosed.whyLine, material.whyLine);
  assert.equal(disclosed.provenance?.originActorId, material.sourceActorId);
  assert.equal(disclosed.provenance?.sourceMemoryId, material.sourceMemoryId);
  const materialSource = caretaker.memories.find(
    memory => memory.kind === "ambient_utterance" && memory.memoryId === material.sourceMemoryId,
  );
  assert.ok(materialSource && materialSource.kind === "ambient_utterance");
  assert.equal(disclosed.provenance?.sourceExcerpt, materialSource.line);
  assert.equal(disclosed.provenance?.whyLine, material.whyLine);
  assert.notEqual(disclosed.provenance?.originActorId, noChange.sourceActorId);
  assert.notEqual(disclosed.provenance?.sourceMemoryId, noChange.sourceMemoryId);

  const socialRevision = started.socialView.revision;
  const retried = await service.startConversation(
    firstMeeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(retried.socialView.revision, socialRevision, "the material change discloses once");
});

test("a target evidence change while the ambient reply is pending makes the queued exchange stale with no partial speech", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  const entered = deferred();
  const release = deferred();
  adapter.judgeAndProposeAmbientReply = async request => {
    entered.resolve();
    await release.promise;
    return originalAmbientReply(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("stale") });
  const meeting = await readyFirstMeeting(service, "ambient-stale-evidence");
  const pending = service.decision(meeting.request);
  await entered.promise;

  await service.preloadConversation(
    meeting.started.runId,
    "NPC_Park_Caretaker",
    "ParkConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    meeting.started.runId,
    "NPC_Park_Caretaker",
    "ParkConversation",
    "ground-ambient-stale-player",
  );
  const playerConversation = await service.startConversation(
    meeting.started.runId,
    "NPC_Park_Caretaker",
    "ParkConversation",
    "ko-KR",
  );
  await service.answer(
    meeting.started.runId,
    playerConversation.sessionId,
    playerConversation.nextTurn.turnId,
    { type: "choice", choiceId: playerConversation.nextTurn.choices[0].choiceId },
  );
  release.resolve();
  const queued = await pending;
  assert.equal(queued.status, "queued");
  const ended = await service.endConversation(
    meeting.started.runId,
    playerConversation.sessionId,
  );
  assert.deepEqual(ended.queuedRunDeltas, []);
  const stale = await service.decision(meeting.request);
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.speechEvents, []);
  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.ambientSpeech.cursor, 0);
  assert.ok(snapshot.actors.every(actor =>
    actor.memories.every(memory => memory.kind !== "ambient_stance_judgment")
  ));
});

test("losing the ambient reserve after turn one commits neither speech nor judgment", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const original = adapter.proposeNextStep.bind(adapter);
  let firstCallCompleted = false;
  let firstCalls = 0;
  let replyCalls = 0;
  adapter.proposeNextStep = async request => {
    firstCalls += 1;
    const resolved = await original(request);
    firstCallCompleted = true;
    return resolved;
  };
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  adapter.judgeAndProposeAmbientReply = async request => {
    replyCalls += 1;
    return originalAmbientReply(request);
  };
  Object.defineProperty(adapter, "accountingSnapshot", {
    value: () => ({ callsUsed: firstCallCompleted ? 99 : 0, tokensUsed: 0 }),
  });
  const service = new RunService({
    proposalPort: adapter as NpcProposalPort,
    idFactory: deterministicIds("second-reserve"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-second-reserve");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "budget_reserved");
  assert.equal(firstCalls, 1);
  assert.equal(replyCalls, 0);
  assert.deepEqual(response.speechEvents, []);
  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.ambientSpeech.cursor, 0);
  assert.ok(snapshot.actors.every(actor => actor.memories.length === 0));
});

test("the run reserve stops ambient dispatch before any provider spend", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let ambientCalls = 0;
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    ambientCalls += 1;
    return original(request);
  };
  Object.defineProperty(adapter, "accountingSnapshot", {
    value: () => ({ callsUsed: 97, tokensUsed: 249_000 }),
  });
  const service = new RunService({
    proposalPort: adapter as NpcProposalPort,
    idFactory: deterministicIds("reserve"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-reserve");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "budget_reserved");
  assert.deepEqual(response.speechEvents, []);
  assert.deepEqual(response.providerMetas, []);
  assert.equal(ambientCalls, 0);
  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.providerBudget.callsUsed, 97);
  assert.equal(snapshot.providerBudget.tokensUsed, 249_000);
  assert.equal(snapshot.ambientSpeech.cursor, 0);
  assert.equal(snapshot.ambientSpeech.activeConversation, null);
  assert.deepEqual(await service.decision(meeting.request), response);
});

test("ambient provider failure commits no partial turn and exact retry replays the whole exchange", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeNextStep.bind(adapter);
  const originalReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  let openingCalls = 0;
  let replyCalls = 0;
  let failReply = true;
  adapter.proposeNextStep = async request => {
    openingCalls += 1;
    return originalOpening(request);
  };
  adapter.judgeAndProposeAmbientReply = async request => {
    replyCalls += 1;
    if (failReply) {
      throw new ProviderFailureError(adapter.profileId, "timeout", "ambient_reply");
    }
    return originalReply(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("ambient-provider-retry"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-provider-retry");
  const before = service.snapshot(meeting.started.runId);
  const failed = await service.decision(meeting.request);
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.speechEvents, []);
  assert.deepEqual(failed.actionDeltas, []);
  assert.equal(failed.providerFailure?.reason, "timeout");
  assert.equal(failed.providerFailure?.purpose, "ambient_reply");
  const afterFailure = service.snapshot(meeting.started.runId);
  assert.equal(afterFailure.worldRevision, before.worldRevision);
  assert.equal(afterFailure.ambientSpeech.cursor, before.ambientSpeech.cursor);
  assert.ok(afterFailure.actors.every(actor => actor.memories.length === 0));

  failReply = false;
  const recovered = await service.decision(meeting.request);
  assert.equal(recovered.status, "completed");
  assert.equal(recovered.speechEvents.length, 2);
  assert.equal(recovered.providerFailure, null);
  assert.equal(service.snapshot(meeting.started.runId).providerFailure, null);
  assert.equal(openingCalls, 2, "retry cannot commit the first attempt's partial opening");
  assert.equal(replyCalls, 2);
});

test("a caller-reserved first ambient call leaves no fallback or partial exchange", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let proposalAttempts = 0;
  adapter.proposeNextStep = async () => {
    proposalAttempts += 1;
    throw new ProviderBudgetReservedError();
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("ambient-caller-reserve"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-caller-reserve");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "budget_reserved");
  assert.equal(proposalAttempts, 1);
  assert.deepEqual(response.speechEvents, []);
  assert.deepEqual(response.actorReadinessDeltas, []);
  assert.deepEqual(response.actionDeltas, []);
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(response.providerMetas, []);
  assert.deepEqual(response.providerAudit.calls, []);
  assert.deepEqual(response.providerAudit.resolutions, []);
  assert.deepEqual(response.providerRuntimeTrace.entries, []);
  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.ambientSpeech.cursor, 0);
  assert.equal(snapshot.ambientSpeech.activeConversation, null);
  assert.ok(snapshot.actors.every(actor => actor.memories.length === 0));
  assert.deepEqual(await service.decision(meeting.request), response);
  assert.equal(proposalAttempts, 1);
});
