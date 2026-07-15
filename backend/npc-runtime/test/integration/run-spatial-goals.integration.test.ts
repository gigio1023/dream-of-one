import assert from "node:assert/strict";
import { test } from "bun:test";
import type { AgentStepRequest } from "../../src/providers/ports.js";
import { ProviderBudgetReservedError } from "../../src/providers/ports.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { buildHearingJudgmentRequest } from "../../src/runtime/run-hearing.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  RUN_OBSERVE_ADMINISTRATIVE_SOURCE_LIMIT,
  RUN_OBSERVE_HEARD_SPEECH_LIMIT,
  RUN_OBSERVE_OWN_ACTION_NOTE_LIMIT,
  RunError,
  RunService,
} from "../../src/runtime/run-service.js";
import type {
  RunActorSpatialFacts,
  RunAdvanceResponse,
  RunMemory,
  RunRecord,
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
      playerVisible: false,
      playerAudible: false,
      playerReachable: false,
      playerInteractionZoneId: null,
    };
  });
}

function pendingArrivals(snapshot: RunSnapshot) {
  return snapshot.scheduler.actors.flatMap(actor => actor.pendingMovement
    ? [{
        movementId: actor.pendingMovement.movementId,
        actorId: actor.actorId,
        anchorRef: actor.pendingMovement.targetAnchorRef,
      }]
    : []);
}

function stationaryLayout(hearingAtSeconds = loadRunLayout().hearingAtSeconds) {
  const baseLayout = loadRunLayout();
  return {
    ...baseLayout,
    hearingAtSeconds,
    meetingWindows: [],
    actors: baseLayout.actors.map(actor => ({
      ...actor,
      scheduleBlocks: [{
        blockId: `test-still-${actor.actorId}`,
        startSeconds: 0,
        endSeconds: hearingAtSeconds,
        activity: "test_still",
        target: { kind: "anchor" as const, id: actor.spawnAnchorRef },
      }],
    })),
  };
}

function ambientHistoryMemory(sequence: number, listenerActorId: string): RunMemory {
  const serial = String(sequence).padStart(3, "0");
  return {
    memoryId: `memory-bounded-${serial}`,
    kind: "ambient_utterance",
    seq: sequence + 1,
    eventId: `speech-bounded-${serial}`,
    wakeId: `wake-bounded-${serial}`,
    conversationId: `conversation-bounded-${serial}`,
    turnId: `turn-bounded-${serial}`,
    speakerActorId: "NPC_Park_Caretaker",
    targetActorId: listenerActorId,
    listenerActorIds: [listenerActorId],
    line: `bounded history ${serial}`,
    worldSeconds: sequence,
    observedWorldRevision: 0,
    worldRevision: sequence + 1,
    audibility: {
      volumeId: "AUD_PARK",
      maxSpeechDistanceM: 18,
      speakerPosition: [0, 0, 0],
    },
    proposalMeta: {
      profileId: "scripted/studio-reception",
      transport: "scripted",
      usedFallback: false,
    },
  };
}

async function advanceToParkContactOpportunity(
  service: RunService,
  started: RunSnapshot,
  label: string,
): Promise<{ response: RunAdvanceResponse; actorId: string; playerPosition: [number, number, number] }> {
  let current = started;
  for (let step = 1; step <= 23; step += 1) {
    await service.advance({
      runId: started.runId,
      advanceId: `${label}-clock-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: pendingArrivals(current),
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }
  const arrivals = pendingArrivals(current);
  if (arrivals.length > 0) {
    await service.advance({
      runId: started.runId,
      advanceId: `${label}-settle-grace`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }

  const actorId = "NPC_Park_Caretaker";
  const actors = spatialActors(current);
  const actor = actors.find(candidate => candidate.actorId === actorId);
  assert.ok(actor);
  actor.playerVisible = true;
  actor.playerAudible = true;
  actor.playerReachable = true;
  actor.playerInteractionZoneId = "ParkConversation";
  const manager = actors.find(candidate => candidate.actorId === "NPC_Studio_Manager");
  assert.ok(manager);
  manager.playerVisible = true;
  manager.playerAudible = true;
  manager.playerReachable = true;
  manager.playerInteractionZoneId = "ParkConversation";
  const playerPosition: [number, number, number] = [0, 0, 0];
  const response = await service.advance({
    runId: started.runId,
    advanceId: `${label}-park-contact-facts`,
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: playerPosition, locationId: "Park" },
      actors,
    },
  });
  return { response, actorId, playerPosition };
}

test("a caller-reserved first goal call ends as policy without provider evidence", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let proposalAttempts = 0;
  adapter.proposeNextStep = async () => {
    proposalAttempts += 1;
    throw new ProviderBudgetReservedError();
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("goal-caller-reserve"),
    layout: stationaryLayout(),
  });
  const started = service.start("goal-caller-reserve", "ko-KR");
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "goal-caller-reserve:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Office_Worker"
  );
  assert.ok(wake);
  const request = {
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  };
  const response = await service.decision(request);
  assert.equal(response.status, "budget_reserved");
  assert.equal(proposalAttempts, 1);
  assert.deepEqual(response.actorReadinessDeltas, []);
  assert.deepEqual(response.actionDeltas, []);
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(response.speechEvents, []);
  assert.deepEqual(response.providerMetas, []);
  assert.deepEqual(response.providerAudit.calls, []);
  assert.deepEqual(response.providerAudit.resolutions, []);
  assert.deepEqual(response.providerRuntimeTrace.entries, []);
  assert.deepEqual(await service.decision(request), response);
  assert.equal(proposalAttempts, 1);
});

test("a caller-reserved goal reply adds no reply evidence or partial speech", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let replyAttempts = 0;
  adapter.judgeAndProposeAmbientReply = async () => {
    replyAttempts += 1;
    throw new ProviderBudgetReservedError();
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("goal-reply-caller-reserve"),
    layout: stationaryLayout(),
  });
  const started = service.start("goal-reply-caller-reserve", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  const manager = actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(receptionist && manager);
  receptionist.visibleActorIds = [manager.actorId];
  receptionist.audibleActorIds = [manager.actorId];
  manager.visibleActorIds = [receptionist.actorId];
  manager.audibleActorIds = [receptionist.actorId];
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "goal-reply-caller-reserve:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors,
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === receptionist.actorId
  );
  assert.ok(wake);
  const request = {
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  };
  const response = await service.decision(request);
  assert.equal(response.status, "budget_reserved");
  assert.equal(replyAttempts, 1);
  assert.deepEqual(response.actorReadinessDeltas, []);
  assert.deepEqual(response.actionDeltas, []);
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(response.speechEvents, []);
  assert.equal(response.providerMetas.length, 1, "only the successful first goal step remains");
  assert.equal(response.providerRuntimeTrace.entries.length, 1);
  assert.deepEqual(await service.decision(request), response);
  assert.equal(replyAttempts, 1);
});

test("one initial spatial batch admits each resident once and a social exchange consumes its listener wake", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const calledActorIds: string[] = [];
  const visibleObjectIdsByActor = new Map<string, string[]>();
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    calledActorIds.push(request.observePacket.actorId);
    visibleObjectIdsByActor.set(
      request.observePacket.actorId,
      request.observePacket.visibleObjects.map(object => object.objectId),
    );
    assert.ok(Array.isArray(request.observePacket.reachableAnchorRefs));
    return original(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("six") });
  const started = service.start("spatial-six", "ko-KR");
  const initialActors = spatialActors(started);
  const initialReceptionist = initialActors.find(
    actor => actor.actorId === "NPC_Studio_Receptionist",
  );
  assert.ok(initialReceptionist);
  const initialManager = initialActors.find(
    actor => actor.actorId === "NPC_Studio_Manager",
  );
  assert.ok(initialManager);
  initialReceptionist.visibleObjectIds = ["Prop_Studio_Keyboard"];
  initialReceptionist.visibleActorIds = [initialManager.actorId];
  initialReceptionist.audibleActorIds = [initialManager.actorId];
  initialManager.visibleActorIds = [initialReceptionist.actorId];
  initialManager.audibleActorIds = [initialReceptionist.actorId];
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-1",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: initialActors,
    },
  });
  const goalWakes = advanced.scheduleWakes.filter(wake => wake.kind === "goal");
  assert.equal(goalWakes.length, 6);

  const receptionistWake = goalWakes.find(wake => wake.actorIds[0] === initialReceptionist.actorId);
  assert.ok(receptionistWake);
  const exchange = await service.decision({
    runId: started.runId,
    wakeId: receptionistWake.wakeId,
    observedWorldRevision: receptionistWake.observedWorldRevision,
  });
  assert.equal(exchange.status, "completed");
  assert.equal(exchange.speechEvents.length, 2);
  assert.equal(exchange.speechEvents[1]?.speakerActorId, initialManager.actorId);

  for (const wake of goalWakes.filter(candidate => candidate.wakeId !== receptionistWake.wakeId)) {
    const response = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(
      response.status,
      wake.actorIds[0] === initialManager.actorId ? "stale" : "completed",
    );
    assert.equal(response.decisionKind, "actor_goal");
    assert.deepEqual(response.actorIds, wake.actorIds);
  }
  assert.deepEqual(
    calledActorIds.sort(),
    started.actors
      .map(actor => actor.actorId)
      .filter(actorId => actorId !== initialManager.actorId)
      .sort(),
  );
  assert.deepEqual(
    visibleObjectIdsByActor.get("NPC_Studio_Receptionist"),
    ["Prop_Studio_Keyboard"],
  );
  assert.ok(service.snapshot(started.runId).scheduler.pendingWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== initialManager.actorId
  ));
});

test("run goals expose only fully executable talk targets to the provider", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const allowedTalkActorIdsByActor = new Map<string, string[] | undefined>();
  adapter.proposeNextStep = async request => {
    allowedTalkActorIdsByActor.set(
      request.observePacket.actorId,
      request.allowedTalkActorIds ? [...request.allowedTalkActorIds] : undefined,
    );
    return {
      proposal: {
        toolCall: null,
        utterance: null,
        rationale: "현재 실행 가능한 대화가 없으면 이 목표를 마칩니다.",
        done: true,
      },
      meta: {
        profileId: "scripted/exact-talk-scope",
        transport: "scripted",
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("exact-talk-scope"),
  });
  const started = service.start("exact-talk-scope", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  const manager = actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  const officeWorker = actors.find(actor => actor.actorId === "NPC_Office_Worker");
  assert.ok(receptionist && manager && officeWorker);

  // Both candidates are reported visible and mutually audible. Only the
  // manager shares the authored volume and satisfies the remaining runtime
  // talk predicate; the provider contract must not over-advertise the worker.
  receptionist.visibleActorIds = [manager.actorId, officeWorker.actorId];
  receptionist.audibleActorIds = [manager.actorId, officeWorker.actorId];
  manager.visibleActorIds = [receptionist.actorId];
  manager.audibleActorIds = [receptionist.actorId];
  officeWorker.visibleActorIds = [receptionist.actorId];
  officeWorker.audibleActorIds = [receptionist.actorId];

  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "exact-talk-scope:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors,
    },
  });
  for (const actorId of [receptionist.actorId, officeWorker.actorId]) {
    const wake = advanced.scheduleWakes.find(candidate =>
      candidate.kind === "goal" && candidate.actorIds[0] === actorId
    );
    assert.ok(wake);
    const response = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(response.status, "completed");
  }
  assert.deepEqual(
    allowedTalkActorIdsByActor.get(receptionist.actorId),
    [manager.actorId],
  );
  assert.deepEqual(
    allowedTalkActorIdsByActor.get(officeWorker.actorId),
    [],
    "an empty exact set stays explicit instead of widening to visible-and-audible",
  );
});

test("a visible record alone admits both look and read without inventing an object", async () => {
  const actorId = "NPC_Studio_Manager";
  const adapter = createStudioReceptionScriptedAdapter();
  let capturedRequest: AgentStepRequest | null = null;
  adapter.proposeNextStep = async request => {
    if (request.observePacket.actorId === actorId) capturedRequest = structuredClone(request);
    return {
      proposal: {
        toolCall: null,
        utterance: null,
        rationale: "보이는 기록의 위치를 확인한 뒤 현재 목표를 마칩니다.",
        done: true,
      },
      meta: {
        profileId: "scripted/record-only-look",
        transport: "scripted",
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("record-only-look"),
    layout: stationaryLayout(),
  });
  const started = service.start("record-only-look", "ko-KR");
  type MutableRun = { records: RunRecord[] };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  assert.ok(internalRun);
  internalRun.records.push({
    recordId: "record-visible-only",
    kind: "note",
    authorActorId: "NPC_Studio_Receptionist",
    authorRole: "studio_receptionist",
    targetId: "player",
    stateBody: "방문 경위를 확인해야 한다는 접수 기록입니다.",
    visibleToActorIds: [actorId],
    sourceRefs: [{
      sourceMemoryId: "memory-record-visible-only",
      originActorId: "player",
    }],
    textSurfaceId: "TS_Studio_ReviewRecords",
    createdWorldSeconds: 0,
    createdWorldRevision: 1,
    recordRevision: 1,
    lastLedgerEventId: "ledger-record-visible-only",
  });

  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "record-only-look:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === actorId
  );
  assert.ok(wake);
  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(response.status, "completed");
  const observed = capturedRequest;
  assert.ok(observed);
  assert.deepEqual(observed.observePacket.visibleActors, []);
  assert.deepEqual(observed.observePacket.visibleObjects, []);
  assert.deepEqual(
    observed.observePacket.visibleRecords.map(record => record.recordId),
    ["record-visible-only"],
  );
  assert.ok(observed.observePacket.toolCatalog.includes("look"));
  assert.ok(observed.observePacket.toolCatalog.includes("read_record"));
});

test("spatial churn cannot become a provider treadmill and refreshes once after 600 seconds", async () => {
  const layout = stationaryLayout();
  const adapter = createStudioReceptionScriptedAdapter();
  const originalProposal = adapter.proposeNextStep.bind(adapter);
  let providerCalls = 0;
  let markProviderStarted: (() => void) | null = null;
  const providerStarted = new Promise<void>(resolve => {
    markProviderStarted = resolve;
  });
  let releaseProvider: (() => void) | null = null;
  const providerReleased = new Promise<void>(resolve => {
    releaseProvider = resolve;
  });
  adapter.proposeNextStep = async request => {
    providerCalls += 1;
    if (request.observePacket.actorId === "NPC_Park_Caretaker" && providerCalls === 1) {
      markProviderStarted?.();
      await providerReleased;
    }
    return originalProposal(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("stale"),
    layout,
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
        player: { position: [8, 0.05, 5], locationId: "" },
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
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors,
    },
  });
  const oldWake = spatial.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === "NPC_Park_Caretaker",
  );
  assert.ok(oldWake);
  const staleDecision = service.decision({
    runId: started.runId,
    wakeId: oldWake.wakeId,
    observedWorldRevision: oldWake.observedWorldRevision,
  });
  await providerStarted;

  const changedActors = actors.map(actor => structuredClone(actor));
  const changedCaretaker = changedActors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(changedCaretaker);
  changedCaretaker.visibleActorIds = ["NPC_Roaming_Liaison"];
  const changed = await service.advance({
    runId: started.runId,
    advanceId: "spatial-changed",
    observedWorldRevision: spatial.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: spatial.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  assert.ok(changed.scheduleWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== oldWake.actorIds[0]
  ));
  const activeGoals = service.snapshot(started.runId).scheduler.pendingWakes.filter(
    wake => wake.kind === "goal" && (wake.status === "pending" || wake.status === "claimed"),
  );
  assert.ok(activeGoals.length <= started.actors.length);
  assert.ok(activeGoals.filter(wake => wake.actorIds[0] === oldWake.actorIds[0]).length <= 1);

  releaseProvider?.();
  const beforeStaleCommit = service.snapshot(started.runId);
  const stale = await staleDecision;
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.actionDeltas, []);
  assert.deepEqual(service.snapshot(started.runId).actors, beforeStaleCommit.actors);
  assert.equal(service.snapshot(started.runId).ambientSpeech.cursor, 0);

  let elapsedBeforeRefresh = 0;
  let churnSequence = 0;
  while (elapsedBeforeRefresh < 599) {
    churnSequence += 1;
    const elapsedSeconds = Math.min(10, 599 - elapsedBeforeRefresh);
    const beforeRefresh = service.snapshot(started.runId);
    const churnActors = changedActors.map(actor => structuredClone(actor));
    const churnCaretaker = churnActors.find(actor => actor.actorId === oldWake.actorIds[0]);
    assert.ok(churnCaretaker);
    churnCaretaker.visibleActorIds = churnSequence % 2 === 0
      ? []
      : ["NPC_Roaming_Liaison"];
    const notYetDue = await service.advance({
      runId: started.runId,
      advanceId: `spatial-before-refresh-${churnSequence}`,
      observedWorldRevision: beforeRefresh.worldRevision,
      elapsedSeconds,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: beforeRefresh.worldRevision,
        player: { position: [8, 0.05, 5], locationId: "" },
        actors: churnActors,
      },
    });
    assert.ok(notYetDue.scheduleWakes.every(
      wake => wake.kind !== "goal" || wake.actorIds[0] !== oldWake.actorIds[0]
    ));
    elapsedBeforeRefresh += elapsedSeconds;
  }
  assert.equal(providerCalls, 1);

  const atRefresh = service.snapshot(started.runId);
  const due = await service.advance({
    runId: started.runId,
    advanceId: "spatial-refresh-due",
    observedWorldRevision: atRefresh.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: atRefresh.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  const refreshedWakes = due.scheduleWakes.filter(
    wake => wake.kind === "goal" && wake.actorIds[0] === oldWake.actorIds[0],
  );
  assert.equal(refreshedWakes.length, 1);
  const latest = refreshedWakes[0];
  assert.ok(latest);
  await service.decision({
    runId: started.runId,
    wakeId: latest.wakeId,
    observedWorldRevision: latest.observedWorldRevision,
  });
  assert.ok(providerCalls >= 2 && providerCalls <= 1 + 3);
});

test("a delayed pending goal starts its spatial refresh window when provider work is claimed", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let providerCalls = 0;
  adapter.proposeNextStep = async () => {
    providerCalls += 1;
    return {
      proposal: {
        toolCall: null,
        utterance: null,
        rationale: "현재 역할 행동을 유지합니다.",
        done: true,
      },
      meta: {
        profileId: "scripted/studio-reception",
        transport: "scripted",
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("delayed-claim"),
    layout: stationaryLayout(2_000),
  });
  const started = service.start("delayed-claim-start", "ko-KR");
  const actors = spatialActors(started);
  const initial = await service.advance({
    runId: started.runId,
    advanceId: "delayed-claim-initial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors,
    },
  });
  const caretakerWake = initial.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === "NPC_Park_Caretaker",
  );
  assert.ok(caretakerWake);
  const changedActors = actors.map(actor => structuredClone(actor));
  const caretaker = changedActors.find(actor => actor.actorId === caretakerWake.actorIds[0]);
  assert.ok(caretaker);
  caretaker.visibleActorIds = ["NPC_Roaming_Liaison"];

  const advanceWithoutCaretakerWake = async (totalSeconds: number, label: string) => {
    let remaining = totalSeconds;
    let sequence = 0;
    while (remaining > 0) {
      sequence += 1;
      const elapsedSeconds = Math.min(10, remaining);
      const current = service.snapshot(started.runId);
      const response = await service.advance({
        runId: started.runId,
        advanceId: `${label}-${sequence}`,
        observedWorldRevision: current.worldRevision,
        elapsedSeconds,
        arrivals: [],
        spatialFacts: {
          observedWorldRevision: current.worldRevision,
          player: { position: [8, 0.05, 5], locationId: "" },
          actors: changedActors,
        },
      });
      assert.ok(response.scheduleWakes.every(
        wake => wake.kind !== "goal" || wake.actorIds[0] !== caretakerWake.actorIds[0]
      ));
      remaining -= elapsedSeconds;
    }
  };

  await advanceWithoutCaretakerWake(599, "delayed-claim-before-claim");
  const claimed = await service.decision({
    runId: started.runId,
    wakeId: caretakerWake.wakeId,
    observedWorldRevision: caretakerWake.observedWorldRevision,
  });
  assert.equal(claimed.status, "completed");
  assert.equal(providerCalls, 1);

  caretaker.visibleActorIds = [];
  await advanceWithoutCaretakerWake(599, "delayed-claim-after-claim");
  const dueAt = service.snapshot(started.runId);
  const due = await service.advance({
    runId: started.runId,
    advanceId: "delayed-claim-refresh-due",
    observedWorldRevision: dueAt.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: dueAt.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  assert.equal(
    due.scheduleWakes.filter(
      wake => wake.kind === "goal" && wake.actorIds[0] === caretakerWake.actorIds[0]
    ).length,
    1,
  );
});

test("a wake retired after decision registration resolves stale before provider work", async () => {
  const setup = (label: string) => {
    const adapter = createStudioReceptionScriptedAdapter();
    let providerCalls = 0;
    const original = adapter.proposeNextStep.bind(adapter);
    adapter.proposeNextStep = async request => {
      providerCalls += 1;
      return original(request);
    };
    const service = new RunService({
      proposalPort: adapter,
      idFactory: deterministicIds(label),
      layout: { ...stationaryLayout(), graceEndsAtSeconds: 0 },
    });
    const started = service.start(`${label}-start`, "ko-KR");
    return { service, started, providerCalls: () => providerCalls };
  };

  const runRace = async (label: string, observedRevisionOffset: number) => {
    const { service, started, providerCalls } = setup(label);
    const actors = spatialActors(started);
    const initial = await service.advance({
      runId: started.runId,
      advanceId: `${label}:initial`,
      observedWorldRevision: started.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: started.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors,
      },
    });
    const wake = initial.scheduleWakes.find(candidate =>
      candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Park_Caretaker"
    );
    assert.ok(wake);
    const current = service.snapshot(started.runId);
    const contactActors = spatialActors(current);
    const caretaker = contactActors.find(actor => actor.actorId === "NPC_Park_Caretaker");
    assert.ok(caretaker);
    caretaker.playerVisible = true;
    caretaker.playerAudible = true;
    caretaker.playerReachable = true;
    caretaker.playerInteractionZoneId = "ParkConversation";

    // The advance is serialized first but has not run yet. decision() still
    // sees the pending wake, registers an unclaimed attempt, and queues its
    // claim behind the advance that supersedes the wake.
    const supersedingAdvance = service.advance({
      runId: started.runId,
      advanceId: `${label}:supersede`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "Park" },
        actors: contactActors,
      },
    });
    const racedDecision = service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision + observedRevisionOffset,
    });
    await supersedingAdvance;
    return { service, wake, racedDecision, providerCalls };
  };

  const matching = await runRace("registered-race-match", 0);
  const stale = await matching.racedDecision;
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.providerMetas, []);
  assert.equal(matching.providerCalls(), 0);
  assert.deepEqual(
    await matching.service.decision({
      runId: stale.runId,
      wakeId: matching.wake.wakeId,
      observedWorldRevision: matching.wake.observedWorldRevision,
    }),
    stale,
  );

  const mismatched = await runRace("registered-race-mismatch", 1);
  await assert.rejects(
    mismatched.racedDecision,
    (error: unknown) => error instanceof RunError && error.code === "wake_not_pending",
  );
  assert.equal(mismatched.providerCalls(), 0);
});

test("contact loss updates admission without a wake while gain and a new epoch still wake", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let providerCalls = 0;
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    providerCalls += 1;
    return original(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("contact-transition"),
    layout: stationaryLayout(),
  });
  const started = service.start("contact-transition-start", "ko-KR");
  let current = service.snapshot(started.runId);
  await service.advance({
    runId: started.runId,
    advanceId: "contact-transition:initial",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: spatialActors(current),
    },
  });
  for (let step = 1; step <= 23; step += 1) {
    current = service.snapshot(started.runId);
    await service.advance({
      runId: started.runId,
      advanceId: `contact-transition:clock:${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
  }

  const contactActors = (candidateActorId: string | null) => {
    const snapshot = service.snapshot(started.runId);
    const actors = spatialActors(snapshot);
    if (candidateActorId) {
      const actor = actors.find(candidate => candidate.actorId === candidateActorId);
      assert.ok(actor);
      actor.playerVisible = true;
      actor.playerAudible = true;
      actor.playerReachable = true;
      actor.playerInteractionZoneId = "ParkConversation";
    }
    return actors;
  };
  const advanceContact = async (
    advanceId: string,
    candidateActorId: string | null,
    elapsedSeconds = 0,
  ) => {
    const snapshot = service.snapshot(started.runId);
    return service.advance({
      runId: started.runId,
      advanceId,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: snapshot.worldRevision,
        player: {
          position: [0, 0, 0],
          locationId: candidateActorId ? "Park" : "",
        },
        actors: contactActors(candidateActorId),
      },
    });
  };

  const caretakerId = "NPC_Park_Caretaker";
  const liaisonId = "NPC_Roaming_Liaison";
  const gained = await advanceContact("contact-transition:gain-a", caretakerId);
  assert.equal(
    gained.scheduleWakes.filter(wake => wake.kind === "goal" && wake.actorIds[0] === caretakerId).length,
    1,
  );
  const lost = await advanceContact("contact-transition:lose-a", null, 10);
  assert.ok(lost.scheduleWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== caretakerId
  ));
  assert.equal(
    service.snapshot(started.runId).scheduler.pendingWakes.filter(
      wake => wake.kind === "goal" && wake.actorIds[0] === caretakerId
    ).length,
    0,
  );

  await advanceContact("contact-transition:regain-a", caretakerId);
  const transferred = await advanceContact("contact-transition:a-to-b", liaisonId);
  assert.ok(transferred.scheduleWakes.every(
    wake => wake.kind !== "goal" || wake.actorIds[0] !== caretakerId
  ));
  assert.equal(
    transferred.scheduleWakes.filter(wake => wake.kind === "goal" && wake.actorIds[0] === liaisonId).length,
    1,
  );
  assert.equal(providerCalls, 0, "admission changes alone never invoke the provider");

  let elapsed = 0;
  let epochResponse: RunAdvanceResponse | null = null;
  while (elapsed < 75) {
    const delta = Math.min(10, 75 - elapsed);
    epochResponse = await advanceContact(
      `contact-transition:epoch:${elapsed + delta}`,
      liaisonId,
      delta,
    );
    if (elapsed + delta < 75) {
      assert.ok(epochResponse.scheduleWakes.every(
        wake => wake.kind !== "goal" || wake.actorIds[0] !== liaisonId
      ));
    }
    elapsed += delta;
  }
  assert.ok(epochResponse);
  assert.equal(
    epochResponse.scheduleWakes.filter(
      wake => wake.kind === "goal" && wake.actorIds[0] === liaisonId
    ).length,
    1,
  );
});

test("provider run observations bound recent history without deleting runtime or hearing evidence", async () => {
  const actorId = "NPC_Studio_Manager";
  const adapter = createStudioReceptionScriptedAdapter();
  let capturedRequest: AgentStepRequest | null = null;
  adapter.proposeNextStep = async request => {
    if (request.observePacket.actorId === actorId) capturedRequest = structuredClone(request);
    return {
      proposal: {
        toolCall: null,
        utterance: null,
        rationale: "현재 확인한 정보 안에서 행동을 멈춥니다.",
        done: true,
      },
      meta: {
        profileId: "scripted/studio-reception",
        transport: "scripted",
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("bounded-observe"),
    layout: stationaryLayout(),
  });
  const started = service.start("bounded-observe-start", "ko-KR");
  const historyCount = Math.max(
    RUN_OBSERVE_OWN_ACTION_NOTE_LIMIT,
    RUN_OBSERVE_HEARD_SPEECH_LIMIT,
    RUN_OBSERVE_ADMINISTRATIVE_SOURCE_LIMIT,
  ) + 5;
  type MutableActor = { actorId: string; memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  const internalActor = internalRun?.actors.get(actorId);
  assert.ok(internalRun && internalActor);
  const buildObserve = Reflect.get(service, "runObservePacket").bind(service) as (
    run: MutableRun,
    actor: MutableActor,
    visibleActorIds: string[],
    goals: string[],
    additionalSpeech: string[],
  ) => AgentStepRequest["observePacket"];
  const sparsePacket = buildObserve(internalRun, internalActor, [], ["대기합니다."], []);
  assert.deepEqual(sparsePacket.toolCatalog, ["wait"]);

  internalActor.memories.push(
    ...Array.from({ length: historyCount }, (_, sequence) =>
      ambientHistoryMemory(sequence, actorId)
    ),
  );

  const currentRequiredSpeech = "NPC_Park_Caretaker: 방금 들은 이 문장은 반드시 그대로 남아야 합니다.";
  const currentEvidencePacket = buildObserve(
    internalRun,
    internalActor,
    [],
    ["현재 발화에 답합니다."],
    [currentRequiredSpeech],
  );
  assert.equal(
    currentEvidencePacket.heardSpeech.length,
    RUN_OBSERVE_HEARD_SPEECH_LIMIT + 1,
  );
  assert.equal(currentEvidencePacket.heardSpeech.at(-1), currentRequiredSpeech);

  const fullSnapshot = service.snapshot(started.runId);
  const fullActor = fullSnapshot.actors.find(actor => actor.actorId === actorId);
  assert.ok(fullActor);
  assert.equal(fullActor.memories.length, historyCount);
  assert.equal(fullActor.memories[0]?.memoryId, "memory-bounded-000");
  assert.equal(
    fullActor.memories.at(-1)?.memoryId,
    `memory-bounded-${String(historyCount - 1).padStart(3, "0")}`,
  );
  const hearingRequest = buildHearingJudgmentRequest({
    runId: fullSnapshot.runId,
    hearingId: "bounded-observe-hearing",
    locale: fullSnapshot.locale,
    finalDefense: "제가 들은 내용은 그대로 남아 있습니다.",
    institutionalPressure: fullSnapshot.institutionalPressure,
    actors: fullSnapshot.actors,
    actorPresentationContexts: Object.fromEntries(
      fullSnapshot.actors.map(actor => [actor.actorId, {
        publicIdentity: actor.actorId,
        voice: { register: "담담함", cadence: "짧음", avoid: [] },
      }]),
    ),
    records: fullSnapshot.records,
    ledgerEvents: fullSnapshot.ledgerEvents,
  });
  const hearingActor = hearingRequest.residents.find(actor => actor.actorId === actorId);
  assert.ok(hearingActor);
  assert.equal(hearingActor.memories.length, historyCount);
  assert.equal(hearingActor.memories[0]?.memoryId, "memory-bounded-000");

  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "bounded-observe-spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === actorId
  );
  assert.ok(wake);
  const decision = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(decision.status, "completed");
  const observed = capturedRequest;
  assert.ok(observed);

  const expectedIds = (limit: number) => Array.from(
    { length: limit },
    (_, offset) => `memory-bounded-${String(historyCount - limit + offset).padStart(3, "0")}`,
  );
  const expectedLines = (limit: number) => Array.from(
    { length: limit },
    (_, offset) => `bounded history ${String(historyCount - limit + offset).padStart(3, "0")}`,
  );
  assert.deepEqual(
    observed.observePacket.actorMemory.ownActionNotes,
    expectedLines(RUN_OBSERVE_OWN_ACTION_NOTE_LIMIT).map(
      line => `[heard_from=NPC_Park_Caretaker] ${line}`,
    ),
  );
  assert.deepEqual(
    observed.observePacket.heardSpeech,
    expectedLines(RUN_OBSERVE_HEARD_SPEECH_LIMIT).map(
      line => `NPC_Park_Caretaker: ${line}`,
    ),
  );
  assert.deepEqual(
    observed.observePacket.administrativeSources.map(source => source.memoryId),
    expectedIds(RUN_OBSERVE_ADMINISTRATIVE_SOURCE_LIMIT),
  );
  assert.deepEqual(observed.observePacket.administrativeSources.at(-1), {
    memoryId: `memory-bounded-${String(historyCount - 1).padStart(3, "0")}`,
    kind: "ambient_utterance",
    originActorId: "NPC_Park_Caretaker",
    summary: `bounded history ${String(historyCount - 1).padStart(3, "0")}`,
    whyLine: `bounded history ${String(historyCount - 1).padStart(3, "0")}`,
    reportDelta: 0,
  });
  assert.equal(service.snapshot(started.runId).actors.find(
    actor => actor.actorId === actorId
  )?.memories.length, historyCount);
});

test("visible reachable player facts outside a conversation zone stay valid but cannot open contact", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeNextStep = async () => ({
    proposal: {
      toolCall: { tool: "move_to", args: { targetId: "player" } },
      rationale: "방문자에게 직접 확인하려고 합니다.",
      done: true,
    },
    meta: { profileId: "scripted/studio-reception", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("invalid-contact"),
    layout: { ...loadRunLayout(), graceEndsAtSeconds: 0 },
  });
  const started = service.start("invalid-contact-start", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  assert.ok(receptionist);
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = null;
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "invalid-contact-facts",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, -13], locationId: "Studio" },
      actors,
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === receptionist.actorId
  );
  assert.ok(wake);
  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(response.activeContact, null);
  assert.equal(service.snapshot(started.runId).activeContact, null);
});

test("a valid player zone survives actor semantic-location lag without permitting early contact", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeNextStep = async () => ({
    proposal: {
      toolCall: { tool: "move_to", args: { targetId: "player" } },
      rationale: "방문자에게 직접 확인하려고 합니다.",
      done: true,
    },
    meta: { profileId: "scripted/studio-reception", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("contact-location-lag"),
    layout: { ...loadRunLayout(), graceEndsAtSeconds: 0 },
  });
  const started = service.start("contact-location-lag-start", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  assert.ok(receptionist);
  receptionist.position = [0, 0, -9.5];
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = "ParkConversation";
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "contact-location-lag-facts",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, -9], locationId: "Park" },
      actors,
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === receptionist.actorId
  );
  assert.ok(wake);
  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(response.activeContact, null);
  assert.equal(service.snapshot(started.runId).activeContact, null);
});

test("one post-grace provider candidate creates one idempotent player contact and reuses preload at safe distance", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let openingCalls = 0;
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    return originalOpening(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("contact"),
  });
  const started = service.start("contact-start", "ko-KR");
  const opportunity = await advanceToParkContactOpportunity(service, started, "contact");
  assert.ok(opportunity.response.clock.toSeconds <= 240);
  const wake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  assert.ok(wake, JSON.stringify(opportunity.response.scheduleWakes));
  const nonCandidateWake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.equal(
    nonCandidateWake,
    undefined,
    "the semantic contact change supersedes only the selected actor's pending goal",
  );
  const pendingGoals = service.snapshot(started.runId).scheduler.pendingWakes.filter(
    candidate => candidate.kind === "goal" && candidate.status === "pending",
  );
  assert.equal(
    pendingGoals.filter(candidate => candidate.actorIds[0] === "NPC_Studio_Manager").length,
    0,
    "the completed meeting block leaves no overlapping manager schedule goal",
  );
  assert.equal(
    pendingGoals.filter(candidate => candidate.actorIds[0] === opportunity.actorId).length,
    1,
  );

  const decided = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  const retried = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.deepEqual(retried, decided);
  assert.equal(decided.activeContact?.actorId, opportunity.actorId);
  assert.equal(decided.activeContact?.interactionZoneId, "ParkConversation");
  assert.equal(decided.activeContact?.originAnchorRef.startsWith("Park."), true);
  const contact = decided.activeContact;
  assert.ok(contact);

  await service.preloadConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(openingCalls, 1);
  await assert.rejects(
    service.startConversation(
      started.runId,
      opportunity.actorId,
      "ParkConversation",
      "ko-KR",
      contact.contactId,
    ),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
    "the preloaded opening cannot bypass physical contact distance",
  );

  const beforeClose = service.snapshot(started.runId);
  const closeActors = spatialActors(beforeClose);
  const closeActor = closeActors.find(candidate => candidate.actorId === opportunity.actorId);
  assert.ok(closeActor);
  closeActor.position = [...opportunity.playerPosition];
  closeActor.playerVisible = true;
  closeActor.playerAudible = false;
  closeActor.playerReachable = true;
  closeActor.playerInteractionZoneId = "ParkConversation";
  await service.advance({
    runId: started.runId,
    advanceId: "contact-close-distance",
    observedWorldRevision: beforeClose.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeClose.worldRevision,
      player: { position: opportunity.playerPosition, locationId: "Park" },
      actors: closeActors,
    },
  });
  await assert.rejects(
    service.startConversation(
      started.runId,
      opportunity.actorId,
      "ParkConversation",
      "ko-KR",
      contact.contactId,
    ),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
    "a contact lease cannot start speech from fresh but inaudible facts",
  );
  const beforeAudible = service.snapshot(started.runId);
  const audibleActors = structuredClone(closeActors);
  const audibleActor = audibleActors.find(candidate => candidate.actorId === opportunity.actorId);
  assert.ok(audibleActor);
  audibleActor.playerAudible = true;
  await service.advance({
    runId: started.runId,
    advanceId: "contact-audible-distance",
    observedWorldRevision: beforeAudible.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeAudible.worldRevision,
      player: { position: opportunity.playerPosition, locationId: "Park" },
      actors: audibleActors,
    },
  });
  const conversation = await service.startConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
    contact.contactId,
  );
  const startRetry = await service.startConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
    contact.contactId,
  );
  assert.deepEqual(startRetry, conversation);
  assert.equal(conversation.activeContact, null);
  assert.equal(openingCalls, 1, "session start consumes the existing opening without a second call");
});

test("active contact holds one actor across a schedule boundary and repairs policy movement after one expiry", async () => {
  const layout = { ...loadRunLayout(), graceEndsAtSeconds: 60 };
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("contact-hold"),
    layout,
  });
  const started = service.start("contact-hold-start", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const olderCaretakerWake = seeded.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Park_Caretaker"
  );
  assert.ok(olderCaretakerWake);

  let current = service.snapshot(started.runId);
  for (let step = 1; step <= 6; step += 1) {
    await service.advance({
      runId: started.runId,
      advanceId: `contact-hold-clock-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: pendingArrivals(current),
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }
  const arrivals = pendingArrivals(current);
  if (arrivals.length > 0) {
    await service.advance({
      runId: started.runId,
      advanceId: "contact-hold-settle",
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }

  const contactActors = spatialActors(current);
  const caretakerFacts = contactActors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretakerFacts);
  caretakerFacts.playerVisible = true;
  caretakerFacts.playerAudible = true;
  caretakerFacts.playerReachable = true;
  caretakerFacts.playerInteractionZoneId = "ParkConversation";
  const opportunity = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-opportunity",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [0, 0, 0], locationId: "Park" },
      actors: contactActors,
    },
  });
  const contactWake = opportunity.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Park_Caretaker"
  );
  assert.ok(contactWake);
  const contacted = await service.decision({
    runId: started.runId,
    wakeId: contactWake.wakeId,
    observedWorldRevision: contactWake.observedWorldRevision,
  });
  assert.equal(contacted.activeContact?.actorId, "NPC_Park_Caretaker");

  const conflicting = await service.decision({
    runId: started.runId,
    wakeId: olderCaretakerWake.wakeId,
    observedWorldRevision: olderCaretakerWake.observedWorldRevision,
  });
  assert.equal(conflicting.status, "stale");
  assert.deepEqual(conflicting.actionDeltas, []);
  assert.deepEqual(conflicting.movementDeltas, []);

  current = service.snapshot(started.runId);
  const boundary = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-boundary",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(boundary.clock.toSeconds, 70);
  assert.equal(boundary.activeContact?.actorId, "NPC_Park_Caretaker");
  assert.ok(boundary.movementDeltas.every(delta => delta.actorId !== "NPC_Park_Caretaker"));
  assert.ok(boundary.scheduleWakes.every(wake =>
    wake.kind !== "goal" || wake.actorIds[0] !== "NPC_Park_Caretaker"
  ));

  current = service.snapshot(started.runId);
  await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-before-expiry",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  current = service.snapshot(started.runId);
  const expiryRequest = {
    runId: started.runId,
    advanceId: "contact-hold-expiry",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const expired = await service.advance(expiryRequest);
  const expiryRetry = await service.advance(expiryRequest);
  assert.deepEqual(expiryRetry, expired);
  assert.equal(expired.activeContact, null);
  const afterExpiry = service.snapshot(started.runId);
  const caretaker = afterExpiry.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.equal(
    caretaker?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );

  const repaired = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-repair",
    observedWorldRevision: afterExpiry.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  assert.ok(repaired.movementDeltas.some(delta => delta.actorId === "NPC_Park_Caretaker"));
  assert.equal(
    service.snapshot(started.runId).actors
      .find(actor => actor.actorId === "NPC_Park_Caretaker")
      ?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );
});

test("an unengaged contact expires once into attributable factual memory without judgment movement", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("contact-timeout"),
  });
  const started = service.start("contact-timeout-start", "ko-KR");
  const opportunity = await advanceToParkContactOpportunity(
    service,
    started,
    "contact-timeout",
  );
  const wake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  assert.ok(wake);
  const decided = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.ok(decided.activeContact);
  const before = service.snapshot(started.runId);
  const beforeActor = before.actors.find(actor => actor.actorId === opportunity.actorId);
  assert.ok(beforeActor);

  let current = before;
  let lastRequest: Parameters<RunService["advance"]>[0] | null = null;
  for (let step = 1; step <= 3; step += 1) {
    lastRequest = {
      runId: started.runId,
      advanceId: `contact-timeout-expire-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    };
    await service.advance(lastRequest);
    current = service.snapshot(started.runId);
  }
  assert.equal(current.activeContact, null);
  const afterActor = current.actors.find(actor => actor.actorId === opportunity.actorId);
  assert.ok(afterActor);
  const outcomes = afterActor.memories.filter(memory => memory.kind === "player_contact_outcome");
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0]?.sourceActorId, "player");
  assert.equal(outcomes[0]?.listenerActorId, opportunity.actorId);
  assert.equal(outcomes[0]?.outcome, "not_engaged");
  assert.equal(afterActor.stance, beforeActor.stance);
  assert.equal(afterActor.suspicion, beforeActor.suspicion);
  assert.equal(current.institutionalPressure, before.institutionalPressure);
  assert.ok(lastRequest);
  const retry = await service.advance(lastRequest);
  assert.equal(retry.activeContact, null);
  const afterRetry = service.snapshot(started.runId).actors.find(
    actor => actor.actorId === opportunity.actorId,
  );
  assert.equal(
    afterRetry?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );
  const cooled = await service.advance({
    runId: started.runId,
    advanceId: "contact-timeout-cooldown",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  const followUp = cooled.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  if (followUp) {
    const result = await service.decision({
      runId: started.runId,
      wakeId: followUp.wakeId,
      observedWorldRevision: followUp.observedWorldRevision,
    });
    assert.equal(result.activeContact, null, "cooldown forbids an immediate second approach");
  }
});
