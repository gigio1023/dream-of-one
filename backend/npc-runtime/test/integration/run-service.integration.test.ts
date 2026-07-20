import assert from "node:assert/strict";
import { test } from "bun:test";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { ProviderFailureError, playerStatementEvidenceId } from "../../src/providers/ports.js";
import { loadProviderConfig } from "../../src/providers/registry.js";
import { conversationZoneFor, loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  issueActorGoalMovement,
  type RunSchedulerRuntime,
} from "../../src/runtime/run-scheduler.js";
import {
  appendProviderRuntimeTrace,
  MAX_PROVIDER_RUNTIME_TRACE_ENTRIES,
  PLAYER_CONVERSATION_APPROACH_HOLD_DISTANCE_M,
  PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M,
  RunError,
  RunService,
  STUDIO_RECEPTIONIST_ID,
} from "../../src/runtime/run-service.js";
import {
  runSnapshotSchema,
  type RunLedgerEvent,
  type RunMemory,
  type RunRecord,
} from "../../src/runtime/run-schema.js";
import { normalizeHearingMemory } from "../../src/runtime/run-hearing.js";
import {
  groundOrdinaryConversation,
  runSpatialActors,
} from "./run-spatial-test-helpers.js";

const STUDIO_ZONE_ID = "StudioReceptionConversation";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-test-${++counts[prefix]}`;
}

async function preloadReceptionist(service: RunService, runId: string) {
  return service.preloadConversation(
    runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
}

test("run/start hydrates the shared town layout into six persistent uncertain actors", () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const snapshot = runSnapshotSchema.parse(service.start("run-test-start", "ko-KR"));

  assert.equal(snapshot.worldId, "m3r_first_person_town");
  assert.equal(snapshot.layoutRevision, "rev-first-person-town-v6");
  assert.equal(snapshot.worldRevision, 0);
  assert.equal(snapshot.worldClock.graceEndsAtSeconds, 90);
  assert.equal(snapshot.worldClock.graceEnded, false);
  assert.equal(snapshot.worldClock.hearingAtSeconds, 900);
  assert.equal(snapshot.worldClock.paused, false);
  const providerConfig = loadProviderConfig();
  assert.equal(snapshot.providerBudget.callLimit, providerConfig.runtime.maxCallsPerSession);
  assert.equal(snapshot.providerBudget.tokenLimit, providerConfig.runtime.maxTokensPerSession);
  assert.equal(snapshot.providerBudget.tokenLimit, 450_000);
  assert.equal(snapshot.providerBudget.reservedTokens, 200_000);
  assert.equal(
    snapshot.providerBudget.tokenLimit - snapshot.providerBudget.reservedTokens,
    250_000,
    "the richer foreground budget must not increase autonomous provider spend",
  );
  assert.equal(snapshot.actors.length, 6);
  assert.deepEqual(
    snapshot.actors.map(actor => actor.actorId),
    [
      "NPC_Studio_Receptionist",
      "NPC_Studio_Manager",
      "NPC_Office_Worker",
      "NPC_Park_Caretaker",
      "NPC_Station_Officer",
      "NPC_Roaming_Liaison",
    ],
  );
  assert.ok(snapshot.actors.every(actor => actor.stance === "uncertain"));
  assert.ok(snapshot.actors.every(actor => actor.memories.length === 0));
  assert.ok(snapshot.actors.every(actor => !actor.playerConversationReady));
  assert.equal(snapshot.scheduler.actors.length, 6);
  assert.ok(snapshot.scheduler.actors.every(actor => actor.currentBlock !== null));
  assert.ok(snapshot.scheduler.actors.every(actor => actor.pendingMovement === null));
});

test("player provider failures preserve exact state and clear only after the same operation succeeds", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  const originalAnswer = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let failOpening = true;
  let failAnswer = true;
  adapter.proposeConversationTurn = async request => {
    if (request.actorId === STUDIO_RECEPTIONIST_ID && failOpening) {
      throw new ProviderFailureError(adapter.profileId, "unavailable", "conversation");
    }
    return originalOpening(request);
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    if (request.actorId === STUDIO_RECEPTIONIST_ID && failAnswer) {
      throw new ProviderFailureError(adapter.profileId, "timeout", "conversation_turn");
    }
    return originalAnswer(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const started = service.start("player-provider-exact-retry", "ko-KR");
  const beforeOpening = service.snapshot(started.runId);

  await assert.rejects(
    preloadReceptionist(service, started.runId),
    (error: unknown) =>
      error instanceof ProviderFailureError && error.reason === "unavailable",
  );
  const openingFailed = service.snapshot(started.runId);
  assert.equal(openingFailed.worldRevision, beforeOpening.worldRevision);
  assert.equal(
    openingFailed.actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID)?.memories.length,
    0,
  );
  assert.equal(openingFailed.providerFailure?.purpose, "conversation");
  const openingOperationKey = openingFailed.providerFailure?.operationKey;
  assert.ok(openingOperationKey);

  const layout = loadRunLayout();
  const other = openingFailed.actors.find(actor => actor.actorId === "NPC_Office_Worker");
  assert.ok(other);
  const otherZone = conversationZoneFor(layout, other.actorId, other.locationId);
  assert.ok(otherZone);
  await service.preloadConversation(
    started.runId,
    other.actorId,
    otherZone.zoneId,
    "ko-KR",
  );
  assert.equal(
    service.snapshot(started.runId).providerFailure?.operationKey,
    openingOperationKey,
    "a different successful provider operation must not erase the failure",
  );

  failOpening = false;
  await preloadReceptionist(service, started.runId);
  assert.equal(service.snapshot(started.runId).providerFailure, null);
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "player-provider-exact-retry:ground",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const safe = conversation.nextTurn.choices.find(choice => choice.intent === "safe/local");
  assert.ok(safe);
  const beforeAnswer = service.snapshot(started.runId);
  const answer = { type: "choice" as const, choiceId: safe.choiceId };

  await assert.rejects(
    service.answer(started.runId, conversation.sessionId, conversation.nextTurn.turnId, answer),
    (error: unknown) =>
      error instanceof ProviderFailureError && error.reason === "timeout",
  );
  const answerFailed = service.snapshot(started.runId);
  assert.equal(answerFailed.worldRevision, beforeAnswer.worldRevision);
  assert.deepEqual(answerFailed.actors, beforeAnswer.actors);
  assert.equal(answerFailed.providerFailure?.purpose, "conversation_turn");

  failAnswer = false;
  const answered = await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    answer,
  );
  assert.equal(answered.actor.memories.length, 2);
  assert.equal(service.snapshot(started.runId).providerFailure, null);
});

test("an interrupted run can be abandoned idempotently without a fabricated terminal result", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeConversationTurn = async () => {
    throw new ProviderFailureError(adapter.profileId, "unavailable", "conversation");
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const startId = "provider-interrupted-abandon";
  const started = service.start(startId, "ko-KR");
  await assert.rejects(
    preloadReceptionist(service, started.runId),
    (error: unknown) =>
      error instanceof ProviderFailureError && error.reason === "unavailable",
  );
  const interrupted = service.snapshot(started.runId);
  assert.equal(interrupted.terminalResult, null);
  assert.equal(interrupted.providerFailure?.purpose, "conversation");

  const request = { runId: started.runId, abandonId: "abandon-provider-interrupted" };
  const abandoned = await service.abandonRun(request);
  assert.equal(abandoned.runStatus, "closed");
  assert.equal(abandoned.reason, "provider_failed");
  assert.deepEqual(abandoned.providerFailure, interrupted.providerFailure);
  assert.ok(!("terminalResult" in abandoned));
  await assert.rejects(
    Promise.resolve().then(() => service.snapshot(started.runId)),
    (error: unknown) => error instanceof RunError && error.code === "run_not_found",
  );
  assert.deepEqual(await service.abandonRun(request), abandoned);
  await assert.rejects(
    service.abandonRun({ ...request, abandonId: "different-abandon-id" }),
    (error: unknown) => error instanceof RunError && error.code === "abandon_id_conflict",
  );

  const cleanRestart = service.start(startId, "ko-KR");
  assert.notEqual(cleanRestart.runId, started.runId);
  assert.equal(cleanRestart.providerFailure, null);
});

test("abandon rejects healthy runs and evicted interruption tombstones do not resurrect state", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeConversationTurn = async () => {
    throw new ProviderFailureError(adapter.profileId, "timeout", "conversation");
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
    closedRunRetentionLimit: 1,
  });
  const healthy = service.start("healthy-abandon-rejected", "ko-KR");
  await assert.rejects(
    service.abandonRun({ runId: healthy.runId, abandonId: "abandon-healthy" }),
    (error: unknown) => error instanceof RunError && error.code === "run_not_interrupted",
  );

  const first = service.start("first-interrupted-abandon", "ko-KR");
  await assert.rejects(preloadReceptionist(service, first.runId));
  const firstRequest = { runId: first.runId, abandonId: "abandon-first" };
  await service.abandonRun(firstRequest);

  const second = service.start("second-interrupted-abandon", "ko-KR");
  await assert.rejects(preloadReceptionist(service, second.runId));
  await service.abandonRun({ runId: second.runId, abandonId: "abandon-second" });

  await assert.rejects(
    service.abandonRun(firstRequest),
    (error: unknown) => error instanceof RunError && error.code === "run_not_found",
  );
});

test("conversation zones cover every authored resident position plus interaction reach", () => {
  const layout = loadRunLayout();
  const routes = new Map(layout.routes.map(route => [route.routeId, route.points]));

  for (const actor of layout.actors) {
    const anchorRefs = new Set<string>([
      actor.spawnAnchorRef,
      ...(routes.get(actor.routeId) ?? []),
    ]);
    for (const block of actor.scheduleBlocks) {
      if (block.target.kind === "anchor") anchorRefs.add(block.target.id);
      else for (const anchorRef of routes.get(block.target.id) ?? []) anchorRefs.add(anchorRef);
    }

    for (const anchorRef of anchorRefs) {
      const landmarkId = anchorRef.split(".", 1)[0] ?? "";
      const zone = layout.conversationZones.find(candidate =>
        candidate.landmarkId === landmarkId && candidate.actorIds.includes(actor.actorId)
      );
      assert.ok(zone, `${actor.actorId} has no conversation zone at ${anchorRef}`);
      const zonePosition = layout.anchorPositions[zone.anchorRef];
      const actorPosition = layout.anchorPositions[anchorRef];
      assert.ok(zonePosition && actorPosition);
      const routeDistance = Math.hypot(
        actorPosition[0] - zonePosition[0],
        actorPosition[2] - zonePosition[2],
      );
      assert.ok(
        zone.radius + 0.001 >= routeDistance + PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M,
        `${zone.zoneId} cannot support ${actor.actorId} at ${anchorRef}: ` +
          `radius ${zone.radius} < required ${(
            routeDistance + PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M
          ).toFixed(3)}`,
      );
    }
  }
});

test("a ready resident keeps its route anchor while the player approaches in grounded range", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const started = service.start("run-ready-player-route-hold", "ko-KR");
  await preloadReceptionist(service, started.runId);
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-ready-player-route-hold",
  );

  let snapshot = service.snapshot(started.runId);
  const approachActors = runSpatialActors(snapshot);
  const receptionistFacts = approachActors.find(
    actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(receptionistFacts);
  receptionistFacts.playerVisible = true;
  receptionistFacts.playerAudible = true;
  receptionistFacts.playerReachable = true;
  receptionistFacts.playerInteractionZoneId = STUDIO_ZONE_ID;
  await service.advance({
    runId: started.runId,
    advanceId: "ready-player-route-hold:approach",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.worldRevision,
      player: {
        position: [
          receptionistFacts.position[0] +
            PLAYER_CONVERSATION_APPROACH_HOLD_DISTANCE_M - 0.25,
          receptionistFacts.position[1],
          receptionistFacts.position[2],
        ],
        locationId: "Studio",
      },
      actors: approachActors,
    },
  });

  for (let step = 1; step <= 8; step += 1) {
    snapshot = service.snapshot(started.runId);
    const held = await service.advance({
      runId: started.runId,
      advanceId: `ready-player-route-hold:${step}`,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    assert.ok(held.movementDeltas.every(
      movement => movement.actorId !== STUDIO_RECEPTIONIST_ID,
    ));
    const receptionist = held.scheduler.actors.find(
      actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
    );
    assert.equal(receptionist?.pendingMovement, null);
  }

  snapshot = service.snapshot(started.runId);
  await service.advance({
    runId: started.runId,
    advanceId: "ready-player-route-hold:player-left",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.worldRevision,
      player: { position: [0, 0, 0], locationId: "Park" },
      actors: runSpatialActors(snapshot),
    },
  });
  snapshot = service.snapshot(started.runId);
  const released = await service.advance({
    runId: started.runId,
    advanceId: "ready-player-route-hold:released",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  assert.equal(
    released.movementDeltas.filter(
      movement => movement.actorId === STUDIO_RECEPTIONIST_ID,
    ).length,
    1,
  );
});

test("player E atomically claims a grounded opening over a newly issued movement", async () => {
  const layout = loadRunLayout();
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
    layout,
  });
  const started = service.start("run-ready-opening-movement-race", "ko-KR");
  await preloadReceptionist(service, started.runId);
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-ready-opening-movement-race",
  );

  type MutableRun = { elapsedSeconds: number; scheduler: RunSchedulerRuntime };
  const runs = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const run = runs.get(started.runId);
  assert.ok(run);
  const movement = issueActorGoalMovement({
    runId: started.runId,
    layout,
    runtime: run.scheduler,
    actorId: STUDIO_RECEPTIONIST_ID,
    targetAnchorRef: "Studio.reception_desk",
    elapsedSeconds: 60,
  });
  assert.ok(movement, "the race fixture must issue a real scheduler movement");
  assert.ok(
    service.snapshot(started.runId).scheduler.actors.find(
      actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
    )?.pendingMovement,
  );
  assert.equal(
    service.snapshot(started.runId).actors.find(
      actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
    )?.playerConversationReady,
    true,
    "the client may still be showing E before the concurrent movement delta arrives",
  );

  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );

  assert.ok(conversation.nextTurn.prompt.length > 0);
  assert.equal(
    service.snapshot(started.runId).scheduler.actors.find(
      actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
    )?.pendingMovement,
    null,
  );
});

test("all six residents preload and consume a conversation through their current actor-location zone", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-all-six", "ko-KR");
  const zones: Record<string, string> = {
    NPC_Studio_Receptionist: "StudioReceptionConversation",
    NPC_Studio_Manager: "StudioManagerConversation",
    NPC_Office_Worker: "OfficeConversation",
    NPC_Park_Caretaker: "ParkConversation",
    NPC_Station_Officer: "StationIntakeConversation",
    NPC_Roaming_Liaison: "ParkConversation",
  };

  await assert.rejects(
    service.preloadConversation(
      run.runId,
      "NPC_Office_Worker",
      "StudioReceptionConversation",
      "ko-KR",
    ),
    (error: unknown) => error instanceof RunError && error.code === "invalid_interaction",
  );
  for (const actor of run.actors) {
    const zone = zones[actor.actorId];
    assert.ok(zone);
    const preloaded = await service.preloadConversation(
      run.runId,
      actor.actorId,
      zone,
      "ko-KR",
    );
    assert.equal(preloaded.interactionZoneId, zone);
    assert.equal(preloaded.actor.actorId, actor.actorId);
    assert.equal(preloaded.actor.playerConversationReady, true);
  }
  assert.ok(service.snapshot(run.runId).actors.every(actor => actor.playerConversationReady));

  for (const [index, actor] of run.actors.entries()) {
    const zone = zones[actor.actorId];
    assert.ok(zone);
    await groundOrdinaryConversation(
      service,
      run.runId,
      actor.actorId,
      zone,
      `ground-all-six-${index}`,
    );
    const started = await service.startConversation(run.runId, actor.actorId, zone, "ko-KR");
    assert.equal(started.actor.actorId, actor.actorId);
    assert.ok(started.nextTurn.prompt.length > 0);
    const answered = await service.answer(
      run.runId,
      started.sessionId,
      started.nextTurn.turnId,
      { type: "choice", choiceId: started.nextTurn.choices[0].choiceId },
    );
    assert.equal(answered.nextTurn, null);
    const ended = await service.endConversation(run.runId, started.sessionId);
    assert.equal(ended.actor.actorId, actor.actorId);
    assert.equal(ended.actor.playerConversationReady, false);
  }
});

test("a record becomes player knowledge only when a cited modal line is presented", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    const resolved = await originalOpening(request);
    if (request.observePacket.visibleRecords.some(record =>
      record.recordId === "record:conversation:opening"
    )) {
      resolved.proposal.utterance = "방문 경위를 확인한 첫 기록이 여기 있습니다.";
      resolved.proposal.citedRecordIds = ["record:conversation:opening"];
    }
    return resolved;
  };
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  adapter.judgeAndProposeConversationTurn = async request => {
    const resolved = await originalMerged(request);
    if (request.observePacket.visibleRecords.some(record =>
      record.recordId === "record:conversation:reply"
    )) {
      resolved.proposal.utterance = "답변과 함께 두 번째 확인 기록도 살펴봤습니다.";
      resolved.proposal.citedRecordIds = ["record:conversation:reply"];
    }
    return resolved;
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const started = service.start("run-modal-record-citations", "ko-KR");
  const record = (
    suffix: "opening" | "reply",
    seq: number,
  ): { record: RunRecord; ledger: RunLedgerEvent } => {
    const recordId = `record:conversation:${suffix}`;
    const ledgerEventId = `ledger:conversation:${suffix}`;
    const sourceMemoryId = `mem:conversation:${suffix}`;
    const seeded: RunRecord = {
      recordId,
      kind: "note",
      authorActorId: STUDIO_RECEPTIONIST_ID,
      authorRole: "studio_receptionist",
      targetId: "player",
      stateBody: suffix === "opening"
        ? "방문 경위를 확인한 첫 기록입니다."
        : "답변 뒤에 확인한 두 번째 기록입니다.",
      visibleToActorIds: [STUDIO_RECEPTIONIST_ID],
      sourceRefs: [{ sourceMemoryId, originActorId: "player" }],
      textSurfaceId: "TS_Studio_ReviewRecords",
      createdWorldSeconds: 1,
      createdWorldRevision: 1,
      recordRevision: 1,
      lastLedgerEventId: ledgerEventId,
    };
    const ledger: RunLedgerEvent = {
      eventId: ledgerEventId,
      seq,
      kind: "record_written",
      actorId: STUDIO_RECEPTIONIST_ID,
      actorRole: "studio_receptionist",
      recordId,
      sourceMemoryId,
      recordRevision: 1,
      pressureBefore: 0,
      pressureDelta: 0,
      pressureAfter: 0,
      visibleToActorIds: [STUDIO_RECEPTIONIST_ID],
      whyLine: "접수 경위를 기록했습니다.",
      openQuestion: null,
      worldSeconds: 1,
      worldRevision: 1,
    };
    return { record: seeded, ledger };
  };
  type MutableRun = { records: RunRecord[]; ledgerEvents: RunLedgerEvent[] };
  const internalRun = (Reflect.get(service, "runs") as Map<string, MutableRun>)
    .get(started.runId);
  assert.ok(internalRun);
  const openingRecord = record("opening", 1);
  const replyRecord = record("reply", 2);
  internalRun.records.push(openingRecord.record, replyRecord.record);
  internalRun.ledgerEvents.push(openingRecord.ledger, replyRecord.ledger);

  await preloadReceptionist(service, started.runId);
  assert.deepEqual(
    service.snapshot(started.runId).socialView.encounteredRecords,
    [],
    "preloading provider prose is not a player encounter",
  );
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-modal-record-citations",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(conversation.socialView.encounteredRecords.length, 1);
  assert.equal(
    conversation.socialView.encounteredRecords[0]?.recordId,
    openingRecord.record.recordId,
  );
  assert.equal(
    conversation.socialView.encounteredRecords[0]?.provenance.sourceExcerpt,
    conversation.nextTurn.prompt,
  );
  const openingMemory = conversation.actor.memories.find(
    memory => memory.kind === "npc_utterance" && memory.turnId === conversation.nextTurn.turnId,
  );
  assert.ok(openingMemory && openingMemory.kind === "npc_utterance");
  assert.deepEqual(openingMemory.citedRecords, [{
    recordId: openingRecord.record.recordId,
    recordRevision: 1,
    lastLedgerEventId: openingRecord.ledger.eventId,
  }]);

  const answered = await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: conversation.nextTurn.choices[0].choiceId },
  );
  assert.equal(answered.socialView.encounteredRecords.length, 2);
  const disclosedReplyRecord = answered.socialView.encounteredRecords.find(
    entry => entry.recordId === replyRecord.record.recordId,
  );
  assert.equal(disclosedReplyRecord?.provenance.sourceExcerpt, answered.memoryDelta.npcLine);
  assert.deepEqual(answered.memoryDelta.citedRecords, [{
    recordId: replyRecord.record.recordId,
    recordRevision: 1,
    lastLedgerEventId: replyRecord.ledger.eventId,
  }]);
});

test("speculative opening stays cached until current spatial facts ground an ordinary start", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryOpening = adapter.proposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let openingVisibleActors: string[] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    openingVisibleActors = [...request.observePacket.visibleActors];
    return ordinaryOpening(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-grounded-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  assert.deepEqual(openingVisibleActors, [], "a speculative preload cannot invent a visible player");
  assert.equal(openingCalls, 1);

  const submitFacts = async (
    advanceId: string,
    playerPosition: [number, number, number],
    visible: boolean,
  ) => {
    const snapshot = service.snapshot(run.runId);
    const actors = runSpatialActors(snapshot);
    const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
    assert.ok(receptionist);
    receptionist.playerVisible = visible;
    receptionist.playerAudible = true;
    receptionist.playerReachable = true;
    receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
    await service.advance({
      runId: run.runId,
      advanceId,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: snapshot.worldRevision,
        player: { position: playerPosition, locationId: "Studio" },
        actors,
      },
    });
    return receptionist.position;
  };

  const initial = service.snapshot(run.runId);
  const initialFacts = runSpatialActors(initial).find(
    actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(initialFacts);
  await submitFacts(
    "grounded-start-remote",
    [initialFacts.position[0] + 10, initialFacts.position[1], initialFacts.position[2]],
    true,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  assert.equal(service.snapshot(run.runId).actors[0]?.playerConversationReady, true);

  const nearPosition = await submitFacts(
    "grounded-start-hidden",
    initialFacts.position,
    false,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  assert.equal(service.snapshot(run.runId).actors[0]?.playerConversationReady, true);

  await submitFacts("grounded-start-fresh", nearPosition, true);
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(openingCalls, 1, "failed spatial starts do not consume the speculative opening");
});

test("ordinary conversation center distance includes the ray-hit collider radius only", async () => {
  const layout = structuredClone(loadRunLayout());
  const zone = layout.conversationZones.find(candidate => candidate.zoneId === STUDIO_ZONE_ID);
  assert.ok(zone);
  zone.radius = 10;
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
    layout,
  });
  const run = service.start("run-conversation-center-distance", "ko-KR");
  await preloadReceptionist(service, run.runId);

  const submitAtCenterDistance = async (advanceId: string, distance: number) => {
    const snapshot = service.snapshot(run.runId);
    const actors = runSpatialActors(snapshot);
    const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
    assert.ok(receptionist);
    receptionist.playerVisible = true;
    receptionist.playerAudible = true;
    receptionist.playerReachable = true;
    receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
    await service.advance({
      runId: run.runId,
      advanceId,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: snapshot.worldRevision,
        player: {
          position: [
            receptionist.position[0] + distance,
            receptionist.position[1],
            receptionist.position[2],
          ],
          locationId: "Studio",
        },
        actors,
      },
    });
  };

  await submitAtCenterDistance(
    "conversation-center-distance-outside",
    PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M + 0.001,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );

  await submitAtCenterDistance(
    "conversation-center-distance-inside",
    PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M - 0.001,
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
});

test("an identical post-preload spatial observation rebases grounding without a world event", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryOpening = adapter.proposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let openingVisibleActors: string[] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    openingVisibleActors = [...request.observePacket.visibleActors];
    return ordinaryOpening(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-identical-spatial-rebase", "ko-KR");
  const actors = runSpatialActors(run);
  const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
  const spatialFacts = {
    player: { position: [...receptionist.position] as [number, number, number], locationId: "Studio" },
    actors,
  };
  await service.advance({
    runId: run.runId,
    advanceId: "identical-spatial-seed",
    observedWorldRevision: run.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: run.worldRevision, ...structuredClone(spatialFacts) },
  });
  await preloadReceptionist(service, run.runId);
  assert.deepEqual(openingVisibleActors, ["player"]);
  const beforeRefresh = service.snapshot(run.runId);

  const refreshed = await service.advance({
    runId: run.runId,
    advanceId: "identical-spatial-refresh",
    observedWorldRevision: beforeRefresh.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeRefresh.worldRevision,
      ...structuredClone(spatialFacts),
    },
  });
  assert.equal(refreshed.worldRevision, beforeRefresh.worldRevision);
  assert.equal(refreshed.clock.appliedElapsedSeconds, 0);
  assert.deepEqual(refreshed.scheduleWakes, []);

  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(openingCalls, 1);
});

test("a Studio answer persists model judgment and stance once across idempotent retries", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let mergedCalls = 0;
  let mergedRequest: Parameters<typeof adapter.judgeAndProposeConversationTurn>[0] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    const resolved = await originalOpening(request);
    const selectedEvidenceId = `scene_fact:${request.beatId}:1`;
    const unselectedEvidenceId = `scene_fact:${request.beatId}:2`;
    resolved.proposal.suggestedReplies[0].evidenceIds = [selectedEvidenceId];
    resolved.proposal.suggestedReplies[2].evidenceIds = [unselectedEvidenceId];
    resolved.proposal.suggestedReplies[2].introducesNewClaim = true;
    return resolved;
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    mergedCalls += 1;
    mergedRequest = request;
    return originalMerged(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-test-start", "ko-KR");
  const [preloaded, preloadRetry] = await Promise.all([
    preloadReceptionist(service, run.runId),
    preloadReceptionist(service, run.runId),
  ]);
  assert.deepEqual(preloadRetry, preloaded);
  assert.equal(openingCalls, 1, "concurrent preload retries share one provider call");
  assert.equal(preloaded.actor.playerConversationReady, true);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-idempotent-start",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(openingCalls, 1, "starting consumes the opening without a provider call");
  const startRetry = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.deepEqual(startRetry, started);
  assert.equal(started.actor.memories.length, 1);
  assert.equal(started.actor.memories[0].kind, "npc_utterance");
  if (started.actor.memories[0].kind === "npc_utterance") {
    assert.equal(started.actor.memories[0].line, started.nextTurn.prompt);
  }
  assert.equal(service.snapshot(run.runId).providerBudget.callsUsed, 0);
  assert.equal(service.snapshot(run.runId).worldClock.paused, true);

  const payload = { type: "choice" as const, choiceId: started.nextTurn.choices[0].choiceId };
  const answered = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, payload);
  const retried = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, payload);

  assert.deepEqual(retried, answered);
  assert.equal(mergedCalls, 1, "an answer retry must not call the provider or mutate twice");
  assert.equal(answered.worldRevision, 4);
  assert.equal(answered.judgment.stanceBefore, "uncertain");
  assert.equal(answered.judgment.stanceAfter, "vouch");
  assert.equal(answered.judgment.whyLine, "방문 이유를 접수 절차에 맞게 분명히 설명했습니다.");
  assert.equal(answered.nextTurn, null);
  assert.equal(answered.proposalMeta.transport, "scripted");
  assert.ok(mergedRequest);
  assert.deepEqual(mergedRequest.observePacket.visibleActors, ["player"]);
  assert.equal(
    mergedRequest.playerLine,
    started.nextTurn.choices[0].line,
    "only the selected candidate becomes the player's statement",
  );
  assert.deepEqual(mergedRequest.conversationHistory, [
    {
      speakerId: STUDIO_RECEPTIONIST_ID,
      line: "접수를 도와드리겠습니다. 이곳에 오신 이유를 말씀해 주세요.",
      evidenceId: null,
    },
  ]);

  const snapshot = service.snapshot(run.runId);
  const receptionist = snapshot.actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  assert.equal(receptionist.stance, "vouch");
  assert.equal(receptionist.hasMeaningfulFirsthandConversation, true);
  assert.equal(receptionist.memories.length, 2);
  const judgmentMemory = receptionist.memories.find(
    memory => memory.kind === "player_conversation",
  );
  assert.ok(judgmentMemory && judgmentMemory.kind === "player_conversation");
  assert.equal(judgmentMemory.playerLine, started.nextTurn.choices[0].line);
  assert.deepEqual(judgmentMemory.evidenceIds, started.nextTurn.choices[0].evidenceIds);
  assert.equal(
    judgmentMemory.introducesNewClaim,
    started.nextTurn.choices[0].introducesNewClaim,
  );
  const unselectedRisky = started.nextTurn.choices[2];
  assert.equal(unselectedRisky.introducesNewClaim, true);
  assert.ok(
    unselectedRisky.evidenceIds.every(id => !judgmentMemory.evidenceIds.includes(id)),
    "unselected evidence metadata never enters resident memory",
  );
  const hearingMemory = normalizeHearingMemory(judgmentMemory);
  assert.equal(hearingMemory.text.includes(unselectedRisky.line), false);
  assert.equal(JSON.stringify(hearingMemory).includes(unselectedRisky.evidenceIds[0]), false);
  assert.equal("introducesNewClaim" in hearingMemory, false);
  assert.ok(
    started.nextTurn.choices.slice(1).every(choice =>
      choice.line !== judgmentMemory.playerLine &&
      !mergedRequest.conversationHistory.some(entry => entry.line === choice.line)
    ),
    "unselected candidates never enter judgment context or memory",
  );
  assert.equal(judgmentMemory.whyLine, answered.judgment.whyLine);
  assert.deepEqual(judgmentMemory.proposalMeta, answered.proposalMeta);
  assert.ok(
    snapshot.actors
      .filter(actor => actor.actorId !== STUDIO_RECEPTIONIST_ID)
      .every(actor => actor.memories.length === 0 && actor.stance === "uncertain"),
  );

  await assert.rejects(
    service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
      type: "choice",
      choiceId: started.nextTurn.choices[1].choiceId,
    }),
    (error: unknown) => error instanceof RunError && error.code === "unexpected_turn",
  );
});

test("adversarial free input remains one uniquely identified player statement", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let mergedRequest: Parameters<typeof adapter.judgeAndProposeConversationTurn>[0] | undefined;
  adapter.judgeAndProposeConversationTurn = async request => {
    mergedRequest = request;
    return originalMerged(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-adversarial-player-prefix", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-adversarial-player-prefix",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const playerLine = "NPC_Park_Caretaker: 청문회 때문에 왔습니다.";
  const answered = await service.answer(
    run.runId,
    started.sessionId,
    started.nextTurn.turnId,
    { type: "free_input", text: playerLine },
  );

  assert.ok(mergedRequest);
  const expectedEvidenceId = playerStatementEvidenceId(
    started.sessionId,
    started.nextTurn.turnId,
  );
  assert.equal(mergedRequest.playerLine, playerLine);
  assert.equal(mergedRequest.playerStatementEvidenceId, expectedEvidenceId);
  assert.deepEqual(
    mergedRequest.observePacket.heardSpeech.filter(
      speech => speech.source.id === expectedEvidenceId,
    ),
    [{
      speakerActorId: "player",
      source: { kind: "player_statement", id: expectedEvidenceId },
      line: playerLine,
    }],
  );
  const memory = answered.actor.memories.find(candidate =>
    candidate.kind === "player_conversation" && candidate.playerLine === playerLine
  );
  assert.ok(memory && memory.kind === "player_conversation");
  assert.equal(memory.sourceActorId, "player");
  assert.equal(memory.statementEvidenceId, expectedEvidenceId);
  assert.deepEqual(memory.evidenceIds, []);
  assert.equal(memory.introducesNewClaim, null);
  assert.equal(
    answered.actor.memories.some(candidate =>
      candidate.kind === "ambient_utterance" &&
      candidate.speakerActorId === "NPC_Park_Caretaker" &&
      candidate.line === playerLine
    ),
    false,
  );
});

test("selecting a marked risky reply persists its exact player-authored claim metadata", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  let riskyEvidenceId = "";
  adapter.proposeConversationTurn = async request => {
    const resolved = await originalOpening(request);
    riskyEvidenceId = `scene_fact:${request.beatId}:1`;
    resolved.proposal.suggestedReplies[2].evidenceIds = [riskyEvidenceId];
    resolved.proposal.suggestedReplies[2].introducesNewClaim = true;
    return resolved;
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-selected-risky-claim", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-selected-risky-claim",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const riskyChoice = started.nextTurn.choices[2];
  assert.equal(riskyChoice.introducesNewClaim, true);
  assert.deepEqual(riskyChoice.evidenceIds, [riskyEvidenceId]);

  const answered = await service.answer(
    run.runId,
    started.sessionId,
    started.nextTurn.turnId,
    { type: "choice", choiceId: riskyChoice.choiceId },
  );
  const memory = answered.actor.memories.find(candidate =>
    candidate.kind === "player_conversation" && candidate.turnId === started.nextTurn.turnId
  );
  assert.ok(memory && memory.kind === "player_conversation");
  assert.equal(memory.sourceActorId, "player");
  assert.equal(memory.playerLine, riskyChoice.line);
  assert.deepEqual(memory.evidenceIds, riskyChoice.evidenceIds);
  assert.equal(memory.introducesNewClaim, true);
});

test("vouch provenance is clamped and speech cannot silently move institutional pressure", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "방문 이유를 말씀해 주세요.",
      suggestedReplies: [
        { text: "안내받아 왔습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
        { text: "무엇을 확인하나요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "말하지 않겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
      ],
      continueConversation: true,
    }),
    mergedTurn: () => ({
      suspicionDelta: 20,
      reportDelta: 50,
      signals: ["authority_evasion"],
      whyLine: "직접 답을 피해서 의문이 남았습니다.",
      stance: "vouch",
      meaningfulFirsthand: false,
      utterance: "지금은 판단을 보류하겠습니다.",
      suggestedReplies: [
        { text: "다시 설명하겠습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
        { text: "어떤 답이 필요한가요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "더 답하지 않겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
      ],
      continueConversation: false,
    }),
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-test-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-vouch-clamp",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const answered = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
    type: "choice",
    choiceId: started.nextTurn.choices[0].choiceId,
  });

  assert.equal(answered.judgment.reportDelta, 50, "the model's private report inclination is preserved");
  assert.equal(answered.judgment.institutionalPressureDelta, 0);
  assert.equal(answered.judgment.reportPressureAfter, 0);
  assert.equal(answered.judgment.stanceAfter, "uncertain", "vouch needs meaningful firsthand provenance");
  assert.equal(answered.actor.hasMeaningfulFirsthandConversation, false);
  assert.equal(service.snapshot(run.runId).institutionalPressure, 0);
  assert.equal(service.snapshot(run.runId).ledgerEvents.length, 0);
});

test("a direct multi-turn conversation can visibly recover from oppose and high suspicion", async () => {
  let turn = 0;
  const trackedQuestion = {
    status: "open" as const,
    text: "숨긴 방문 경위는 무엇인가요?",
    whyLine: "처음 설명에서 중요한 사실을 숨겼습니다.",
  };
  const receivedCurrentQuestions: unknown[] = [];
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "방문 목적을 정확히 설명해 주세요.",
      suggestedReplies: [
        { text: "처음에는 사실을 숨겼습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
        { text: "어떤 부분부터 말할까요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "지금부터 모두 설명하겠습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
      ],
      continueConversation: true,
    }),
    mergedTurn: request => {
      receivedCurrentQuestions.push(structuredClone(request.currentOpenQuestion ?? null));
      turn += 1;
      return turn === 1
        ? {
            suspicionDelta: 90,
            reportDelta: 0,
            signals: ["authority_evasion"],
            whyLine: "처음 설명에서 중요한 사실을 숨겨 강하게 경계하게 됐습니다.",
            stance: "oppose",
            meaningfulFirsthand: true,
            openQuestion: trackedQuestion,
            utterance: "숨긴 사실이 무엇인지 지금 분명히 말해 주세요.",
            suggestedReplies: [
              { text: "두려워서 방문 경위를 숨겼습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
              { text: "어떤 증거가 필요한가요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
              { text: "더는 답하지 않겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
            ],
            continueConversation: true,
          }
        : {
            suspicionDelta: -70,
            reportDelta: 0,
            signals: [],
            whyLine: "숨긴 이유와 방문 경위를 구체적으로 바로잡아 의심이 크게 줄었습니다.",
            stance: "vouch",
            meaningfulFirsthand: true,
            openQuestion: {
              ...trackedQuestion,
              status: "resolved",
              whyLine: "플레이어가 숨긴 방문 경위와 이유를 직접 설명했습니다.",
            },
            utterance: "이제 설명이 앞뒤가 맞습니다. 제가 직접 들은 내용으로 보증하겠습니다.",
            suggestedReplies: [
              { text: "고맙습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
              { text: "더 확인할 것이 있나요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
              { text: "이제 가겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
            ],
            continueConversation: false,
          };
    },
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-direct-recovery", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-direct-recovery",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const first = await service.answer(
    run.runId,
    started.sessionId,
    started.nextTurn.turnId,
    { type: "choice", choiceId: started.nextTurn.choices[0].choiceId },
  );
  assert.equal(first.actor.suspicion, 90);
  assert.equal(first.actor.stance, "oppose");
  assert.ok(first.nextTurn);
  assert.deepEqual(receivedCurrentQuestions, [null]);
  const firstQuestion = first.socialView.openQuestions.find(
    question => question.subjectActorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(firstQuestion);
  assert.equal(firstQuestion.status, "open");
  const waryView = first.socialView.encounteredResidents.find(
    resident => resident.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(waryView);
  assert.equal(waryView.stance, "oppose");
  assert.equal(waryView.whyLine, first.judgment.whyLine);
  assert.equal("suspicion" in waryView, false, "numeric suspicion remains debug/internal");

  const second = await service.answer(
    run.runId,
    started.sessionId,
    first.nextTurn.turnId,
    { type: "choice", choiceId: first.nextTurn.choices[0].choiceId },
  );
  assert.equal(second.actor.suspicion, 20);
  assert.equal(second.actor.stance, "vouch");
  assert.ok(second.actor.suspicion < first.actor.suspicion);
  assert.deepEqual(receivedCurrentQuestions, [null, trackedQuestion]);
  const resolvedQuestion = second.socialView.openQuestions.find(
    question => question.subjectActorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(resolvedQuestion);
  assert.equal(resolvedQuestion.status, "resolved");
  const recoveredView = second.socialView.encounteredResidents.find(
    resident => resident.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(recoveredView);
  assert.equal(recoveredView.stance, "vouch");
  assert.equal(recoveredView.whyLine, second.judgment.whyLine);
  assert.ok(recoveredView.stanceRevision > waryView.stanceRevision);
  const statementEvidenceIds = second.actor.memories
    .filter(memory => memory.kind === "player_conversation")
    .map(memory => memory.statementEvidenceId);
  assert.equal(statementEvidenceIds.length, 2);
  assert.equal(new Set(statementEvidenceIds).size, 2);
  assert.deepEqual(statementEvidenceIds, [
    playerStatementEvidenceId(started.sessionId, started.nextTurn.turnId),
    playerStatementEvidenceId(started.sessionId, first.nextTurn.turnId),
  ]);
});

test("an exact open question crosses conversations, survives interruption, and is replaced by resolution", async () => {
  const openQuestion = {
    status: "open" as const,
    text: "두 번째 방문에서 확인할 원본 기록은 어디에 있나요?",
    whyLine: "첫 방문에서 원본 기록의 위치가 확인되지 않았습니다.",
  };
  const resolvedQuestion = {
    status: "resolved" as const,
    text: openQuestion.text,
    whyLine: "두 번째 방문에서 원본 기록의 위치를 직접 확인했습니다.",
  };
  const receivedCurrentQuestions: unknown[] = [];
  let mergedAttempt = 0;
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "확인할 내용을 말씀해 주세요.",
      suggestedReplies: [
        { text: "원본 기록의 위치를 설명하겠습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
        { text: "무엇을 더 확인해야 하나요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "답하지 않겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
      ],
      continueConversation: false,
    }),
    mergedTurn: request => {
      receivedCurrentQuestions.push(structuredClone(request.currentOpenQuestion ?? null));
      mergedAttempt += 1;
      if (mergedAttempt === 2) {
        throw new ProviderFailureError(
          "scripted/studio-reception",
          "timeout",
          "conversation_turn",
        );
      }
      const question = mergedAttempt === 1 ? openQuestion : resolvedQuestion;
      return {
        suspicionDelta: 0,
        reportDelta: 0,
        signals: [],
        whyLine: question.whyLine,
        stance: "uncertain",
        meaningfulFirsthand: true,
        openQuestion: question,
        utterance: mergedAttempt === 1
          ? "원본 기록의 위치를 다음에 확인하겠습니다."
          : "원본 기록의 위치를 확인했습니다.",
        suggestedReplies: [
          { text: "알겠습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
          { text: "더 확인할 것이 있나요?", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
          { text: "이제 가겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
        ],
        continueConversation: false,
      };
    },
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-cross-conversation-question", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-cross-question-first",
  );
  const firstSession = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const firstAnswer = await service.answer(
    run.runId,
    firstSession.sessionId,
    firstSession.nextTurn.turnId,
    { type: "choice", choiceId: firstSession.nextTurn.choices[0].choiceId },
  );
  assert.equal(firstAnswer.nextTurn, null);
  assert.deepEqual(receivedCurrentQuestions, [null]);
  const disclosedOpenQuestion = firstAnswer.socialView.openQuestions.find(
    question => question.subjectActorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(disclosedOpenQuestion);
  assert.equal(disclosedOpenQuestion.questionId, `question:${firstAnswer.memoryDelta.memoryId}`);
  assert.equal(disclosedOpenQuestion.status, openQuestion.status);
  assert.equal(disclosedOpenQuestion.text, openQuestion.text);
  assert.equal(disclosedOpenQuestion.whyLine, openQuestion.whyLine);
  assert.equal(disclosedOpenQuestion.provenance.whyLine, openQuestion.whyLine);
  await service.endConversation(run.runId, firstSession.sessionId);

  type MutableActor = { memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const actor = internalRuns.get(run.runId)?.actors.get(STUDIO_RECEPTIONIST_ID);
  assert.ok(actor);
  actor.memories.push({
    memoryId: "memory-between-question-sessions",
    kind: "npc_utterance",
    sourceActorId: STUDIO_RECEPTIONIST_ID,
    listenerActorIds: ["player"],
    conversationId: "between-question-sessions",
    turnId: "between-question-sessions#0",
    line: "새로운 확인 자료가 도착했습니다.",
    citedRecords: [],
    worldSeconds: 0,
    worldRevision: service.snapshot(run.runId).worldRevision,
    proposalMeta: {
      profileId: "scripted/studio-reception",
      transport: "scripted",
      usedFallback: false,
    },
  });

  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-cross-question-second",
  );
  const secondSession = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const secondAnswerRequest = {
    type: "choice" as const,
    choiceId: secondSession.nextTurn.choices[0].choiceId,
  };
  const beforeInterruption = service.snapshot(run.runId).socialView;
  await assert.rejects(
    service.answer(
      run.runId,
      secondSession.sessionId,
      secondSession.nextTurn.turnId,
      secondAnswerRequest,
    ),
    (error: unknown) =>
      error instanceof ProviderFailureError && error.reason === "timeout",
  );
  assert.deepEqual(service.snapshot(run.runId).socialView, beforeInterruption);

  const resolved = await service.answer(
    run.runId,
    secondSession.sessionId,
    secondSession.nextTurn.turnId,
    secondAnswerRequest,
  );
  assert.deepEqual(receivedCurrentQuestions, [null, openQuestion, openQuestion]);
  const disclosedResolution = resolved.socialView.openQuestions.find(
    question => question.subjectActorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(disclosedResolution);
  assert.equal(disclosedResolution.status, resolvedQuestion.status);
  assert.equal(disclosedResolution.text, resolvedQuestion.text);
  assert.equal(disclosedResolution.whyLine, resolvedQuestion.whyLine);
  assert.equal(disclosedResolution.provenance.whyLine, resolvedQuestion.whyLine);
  assert.equal(
    resolved.socialView.openQuestions.filter(
      question => question.subjectActorId === STUDIO_RECEPTIONIST_ID,
    ).length,
    1,
  );
});

test("the final bounded player turn ends without erasing an unanswered open question", async () => {
  const continuationFlags: Array<boolean | undefined> = [];
  const question = {
    status: "open" as const,
    text: "청문회 장소를 알고 있나요?",
    whyLine: "방문자가 청문회 장소를 아직 확인하지 못했습니다.",
  };
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "청문회 절차에 관해 아는 내용을 말씀해 주세요.",
      suggestedReplies: [
        { text: "아는 범위부터 말씀드리겠습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
        { text: "정확한 장소는 모릅니다.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "답하지 않겠습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
      ],
      continueConversation: true,
    }),
    mergedTurn: request => {
      continuationFlags.push(request.continuationAllowed);
      const finalTurn = request.continuationAllowed === false;
      return {
        suspicionDelta: 0,
        reportDelta: 0,
        signals: [],
        whyLine: "방문자가 아는 범위를 일관되게 설명했습니다.",
        stance: "uncertain",
        meaningfulFirsthand: true,
        openQuestion: question,
        utterance: finalTurn
          ? "말씀하신 범위는 이해했습니다."
          : "청문회 장소에 관해 조금 더 아는 내용이 있나요?",
        suggestedReplies: [
          { text: "아는 내용은 여기까지입니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
          { text: "더 떠오르는 것은 없습니다.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
          { text: "이제 그만 묻으십시오.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
        ],
        continueConversation: !finalTurn,
      };
    },
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-final-turn-capacity", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-final-turn-capacity",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );

  let turn = started.nextTurn;
  for (let index = 0; index < 3; index += 1) {
    const answered = await service.answer(run.runId, started.sessionId, turn.turnId, {
      type: "choice",
      choiceId: turn.choices[0].choiceId,
    });
    if (index < 2) {
      assert.ok(answered.nextTurn);
      turn = answered.nextTurn;
    } else {
      assert.equal(answered.nextTurn, null);
      assert.equal(answered.memoryDelta.openQuestion?.status, "open");
    }
  }

  assert.deepEqual(continuationFlags, [true, true, false]);
});

test("ending a child conversation is idempotent and leaves its run state alive", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-test-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-child-end",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  await assert.rejects(
    service.endConversation(run.runId, started.sessionId),
    (error: unknown) => error instanceof RunError && error.code === "session_still_active",
  );
  await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
    type: "choice",
    choiceId: started.nextTurn.choices[0].choiceId,
  });
  const ended = await service.endConversation(run.runId, started.sessionId);
  const retried = await service.endConversation(run.runId, started.sessionId);

  assert.deepEqual(retried, ended);
  assert.equal(ended.worldRevision, 5);
  const snapshot = service.snapshot(run.runId);
  assert.equal(snapshot.activeConversationId, null);
  assert.equal(snapshot.worldClock.paused, false);
  assert.equal(snapshot.actors[0].stance, "vouch");
  assert.equal(snapshot.actors[0].memories.length, 2);
  assert.equal(service.sessionSnapshot(run.runId, started.sessionId).status, "ended");
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  await assert.rejects(
    preloadReceptionist(service, run.runId),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );

  let latest = await service.advance({
    runId: run.runId,
    advanceId: "unchanged-clock-1",
    observedWorldRevision: ended.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  await assert.rejects(
    preloadReceptionist(service, run.runId),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  for (let step = 2; step <= 46; step += 1) {
    latest = await service.advance({
      runId: run.runId,
      advanceId: `changed-schedule-${step}`,
      observedWorldRevision: latest.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
  }
  const receptionistMove = latest.movementDeltas.find(
    movement => movement.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(receptionistMove);
  const arrived = await service.advance({
    runId: run.runId,
    advanceId: "changed-schedule-arrival",
    observedWorldRevision: latest.worldRevision,
    elapsedSeconds: 0,
    arrivals: [{
      movementId: receptionistMove.movementId,
      actorId: receptionistMove.actorId,
      anchorRef: receptionistMove.targetAnchorRef,
    }],
  });
  assert.ok(arrived.actorReadinessDeltas.some(
    delta => delta.actorId === STUDIO_RECEPTIONIST_ID && delta.reason === "preload_required",
  ));
  const changed = await service.preloadConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(changed.actor.locationId, "Park");
  assert.equal(changed.actor.playerConversationReady, true);
});

test("an injected fallback proposal is rejected before it can become simulation state", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    const resolved = await originalOpening(request);
    return {
      ...resolved,
      meta: {
        profileId: "test/forbidden-fallback",
        transport: "fallback" as const,
        usedFallback: true,
        fallbackReason: "transport_error" as const,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const run = service.start("forbidden-injected-fallback", "ko-KR");
  await assert.rejects(
    preloadReceptionist(service, run.runId),
    (error: unknown) =>
      error instanceof ProviderFailureError &&
      error.reason === "transport_error" &&
      error.purpose === "conversation",
  );
  const snapshot = service.snapshot(run.runId);
  assert.equal(snapshot.worldRevision, 0);
  assert.equal(snapshot.actors[0]?.playerConversationReady, false);
  assert.equal(snapshot.actors[0]?.memories.length, 0);
  assert.equal(snapshot.providerFailure?.reason, "transport_error");
});

test("runtime proposal trace truncates explicitly instead of hiding later metadata", async () => {
  const trace = {
    complete: true,
    truncated: false,
    droppedCount: 0,
    entries: [],
  } satisfies ReturnType<RunService["start"]>["providerRuntimeTrace"];
  let seq = 0;
  for (let index = 0; index < MAX_PROVIDER_RUNTIME_TRACE_ENTRIES + 2; index += 1) {
    seq = appendProviderRuntimeTrace(trace, seq, {
      profileId: "scripted/test",
      transport: "scripted",
      usedFallback: false,
    });
  }
  assert.equal(trace.entries.length, MAX_PROVIDER_RUNTIME_TRACE_ENTRIES);
  assert.equal(trace.entries[0]?.seq, 1);
  assert.equal(trace.entries.at(-1)?.seq, MAX_PROVIDER_RUNTIME_TRACE_ENTRIES);
  assert.equal(trace.droppedCount, 2);
  assert.equal(trace.truncated, true);
  assert.equal(trace.complete, false);
});
