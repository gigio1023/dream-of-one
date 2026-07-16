import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunCast } from "../../src/runtime/run-cast.js";
import { conversationZoneFor, loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  buildHearingJudgmentRequest,
  normalizeHearingMemory,
  validateHearingJudgment,
  type HearingJudgment,
} from "../../src/runtime/run-hearing.js";
import {
  MAX_PROP_OBSERVATION_MEMORIES_PER_ACTOR,
  RunError,
  RunService,
} from "../../src/runtime/run-service.js";
import type {
  RunActorSpatialFacts,
  RunPropHandlingEvent,
} from "../../src/runtime/run-schema.js";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-prop-${++counts[prefix]}`;
}

function hearingPresentationContexts() {
  const layout = loadRunLayout();
  const cast = loadRunCast(layout);
  return Object.fromEntries(Object.entries(cast.actors).map(([actorId, actor]) => [
    actorId,
    { publicIdentity: actor.publicIdentity, voice: actor.voice },
  ]));
}

test("engine-observed prop handling creates only factual memories for visible residents", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let providerCalls = 0;
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  const originalJudgment = adapter.judgeConversationTurn.bind(adapter);
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  const originalHearing = adapter.judgeHearing.bind(adapter);
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
  adapter.judgeHearing = async request => {
    providerCalls += 1;
    return originalHearing(request);
  };

  const layout = loadRunLayout();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds(), layout });
  const started = service.start("start-prop-observation", "ko-KR");
  const visibleActorIds = new Set([
    "NPC_Studio_Receptionist",
    "NPC_Park_Caretaker",
  ]);
  const event: RunPropHandlingEvent = {
    eventId: "prop-event-pickup-1",
    propId: "Prop_Studio_Keyboard",
    action: "pick_up",
    playerPosition: [6.5, 0, 4.25],
    objectPosition: [6.8, 0.85, 4.1],
    observedWorldRevision: started.worldRevision,
    observers: layout.actors.map(actor => ({
      actorId: actor.actorId,
      visible: visibleActorIds.has(actor.actorId),
    })),
  };
  const request = {
    runId: started.runId,
    advanceId: "advance-prop-pickup-1",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    propHandlingEvents: [event],
  };

  const response = await service.advance(request);
  assert.equal(response.worldRevision, 1);
  assert.deepEqual(response.acceptedPropEventIds, [event.eventId]);
  assert.equal(response.propObservationMemories?.length, 2);
  assert.deepEqual(
    response.propObservationMemories?.map(memory => memory.listenerActorId).sort(),
    [...visibleActorIds].sort(),
  );
  assert.ok(response.propObservationMemories?.every(memory =>
    memory.kind === "prop_handling_observation" &&
    memory.sourceActorId === "player" &&
    memory.propId === event.propId &&
    memory.action === "pick_up"
  ));
  assert.deepEqual(response.scheduleWakes, []);
  assert.deepEqual(response.actorReadinessDeltas, []);
  assert.deepEqual(response.socialView, started.socialView);
  assert.equal(providerCalls, 0);

  const snapshot = service.snapshot(started.runId);
  for (const actor of snapshot.actors) {
    const observations = actor.memories.filter(
      memory => memory.kind === "prop_handling_observation",
    );
    assert.equal(observations.length, visibleActorIds.has(actor.actorId) ? 1 : 0);
    assert.equal(actor.stance, "uncertain");
    assert.equal(actor.suspicion, 0);
    assert.equal(actor.hasMeaningfulFirsthandConversation, false);
  }
  assert.equal(snapshot.institutionalPressure, 0);
  assert.deepEqual(snapshot.records, []);
  assert.deepEqual(snapshot.ledgerEvents, []);
  const observedMemory = snapshot.actors
    .flatMap(actor => actor.memories)
    .find(memory => memory.kind === "prop_handling_observation");
  assert.ok(observedMemory);
  assert.equal(normalizeHearingMemory(observedMemory).meaningfulFirsthand, false);
  const hearingRequest = buildHearingJudgmentRequest({
    runId: snapshot.runId,
    hearingId: "hearing-prop-eligibility",
    locale: "ko-KR",
    finalDefense: "물건을 옮겼습니다.",
    institutionalPressure: snapshot.institutionalPressure,
    actors: snapshot.actors,
    actorPresentationContexts: hearingPresentationContexts(),
    records: snapshot.records,
    ledgerEvents: snapshot.ledgerEvents,
  });
  const proposedVouches: HearingJudgment = {
    residentAssessments: hearingRequest.residents.map(resident => ({
      actorId: resident.actorId,
      contactBasis: "never_conversed" as const,
      proposedStance: "vouch" as const,
      testimonyLine: "물건 취급만 보았으며 직접 대화한 근거는 없다.",
      citedMemoryIds: resident.memories
        .filter(memory => memory.kind === "prop_handling_observation")
        .map(memory => memory.memoryId),
    })) as HearingJudgment["residentAssessments"],
    proposedVerdict: "ordinary",
    verdictWhyLine: "제안 판정",
    officerLine: "제안 진술",
    citedRecordIds: [],
    citedLedgerEventIds: [],
  };
  const validated = validateHearingJudgment(hearingRequest, proposedVouches);
  assert.equal(validated.ok, true);
  if (validated.ok) {
    assert.equal(validated.value.evidencedVouchCount, 0);
    assert.ok(validated.value.residentAssessments.every(
      assessment => assessment.appliedStance === "uncertain",
    ));
  }

  assert.deepEqual(await service.advance(request), response);
  const duplicate = await service.advance({
    ...request,
    advanceId: "advance-prop-pickup-duplicate",
    observedWorldRevision: response.worldRevision,
  });
  assert.equal(duplicate.worldRevision, response.worldRevision);
  assert.deepEqual(duplicate.acceptedPropEventIds, [event.eventId]);
  assert.deepEqual(duplicate.propObservationMemories, response.propObservationMemories);
  assert.equal(providerCalls, 0);
  const afterDuplicate = service.snapshot(started.runId);
  assert.deepEqual(
    afterDuplicate.actors.map(actor => actor.memories.length),
    snapshot.actors.map(actor => actor.memories.length),
  );

  await assert.rejects(
    service.advance({
      ...request,
      advanceId: "advance-prop-pickup-conflict",
      observedWorldRevision: response.worldRevision,
      propHandlingEvents: [{ ...event, action: "throw" }],
    }),
    (error: unknown) => error instanceof RunError && error.code === "prop_event_id_conflict",
  );
  await assert.rejects(
    service.advance({
      ...request,
      advanceId: "advance-prop-unknown",
      observedWorldRevision: response.worldRevision,
      propHandlingEvents: [{ ...event, eventId: "prop-event-unknown", propId: "Prop_Unknown" }],
    }),
    (error: unknown) => error instanceof RunError && error.code === "invalid_prop_event",
  );
});

test("prop spam keeps snapshots and provider context bounded without expiring receipts", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  let providerCalls = 0;
  let openingNotes: string[] = [];
  let openingAdministrativeSourceCount = -1;
  adapter.proposeConversationTurn = async request => {
    providerCalls += 1;
    openingNotes = [...request.observePacket.actorMemory.ownActionNotes];
    openingAdministrativeSourceCount = request.observePacket.administrativeSources.length;
    return originalConversation(request);
  };

  const layout = loadRunLayout();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds(), layout });
  const started = service.start("start-prop-spam", "ko-KR");
  const propIds = ["Prop_Studio_Keyboard", "Prop_Studio_Plant", "Prop_Park_Box"];
  const actions = ["pick_up", "carry", "place", "throw"] as const;
  const observers = layout.actors.map(actor => ({ actorId: actor.actorId, visible: true }));
  // The response cache retains 256 advance IDs. Four extra unique advances
  // ensure the first request is gone before receipt retry/conflict checks.
  const advanceCacheStressCount = 260;
  let revision = started.worldRevision;
  let firstEvent: RunPropHandlingEvent | null = null;
  for (let sequence = 0; sequence < advanceCacheStressCount; sequence += 1) {
    const event: RunPropHandlingEvent = {
      eventId: `stress-prop-event-${String(sequence).padStart(3, "0")}`,
      propId: propIds[sequence % propIds.length] as string,
      action: actions[sequence % actions.length] as (typeof actions)[number],
      playerPosition: [sequence * 0.01, 0, 0],
      objectPosition: [sequence * 0.01, 0.8, 0],
      observedWorldRevision: revision,
      observers,
    };
    if (!firstEvent) firstEvent = structuredClone(event);
    const response = await service.advance({
      runId: started.runId,
      advanceId: `advance-prop-stress-${sequence}`,
      observedWorldRevision: revision,
      elapsedSeconds: 0,
      arrivals: [],
      propHandlingEvents: [event],
    });
    assert.deepEqual(response.scheduleWakes, []);
    assert.deepEqual(response.actorReadinessDeltas, []);
    revision = response.worldRevision;
  }
  assert.equal(providerCalls, 0, "prop-only advances must not call the provider");

  const compacted = service.snapshot(started.runId);
  for (const actor of compacted.actors) {
    const propMemories = actor.memories.filter(
      memory => memory.kind === "prop_handling_observation",
    );
    assert.equal(propMemories.length, MAX_PROP_OBSERVATION_MEMORIES_PER_ACTOR);
    assert.equal(propMemories[0]?.eventId, "stress-prop-event-248");
    assert.equal(propMemories.at(-1)?.eventId, "stress-prop-event-259");
    assert.equal(actor.hasMeaningfulFirsthandConversation, false);
    assert.equal(actor.stance, "uncertain");
    assert.equal(actor.suspicion, 0);
  }
  assert.equal(compacted.institutionalPressure, 0);
  assert.deepEqual(compacted.records, []);
  assert.deepEqual(compacted.ledgerEvents, []);
  assert.deepEqual(compacted.socialView, started.socialView);

  const targetActor = compacted.actors[0];
  assert.ok(targetActor);
  const zone = conversationZoneFor(layout, targetActor.actorId, targetActor.locationId);
  assert.ok(zone);
  const preloaded = await service.preloadConversation(
    started.runId,
    targetActor.actorId,
    zone.zoneId,
    "ko-KR",
  );
  assert.equal(providerCalls, 1);
  assert.equal(openingNotes.length, MAX_PROP_OBSERVATION_MEMORIES_PER_ACTOR);
  assert.ok(openingNotes.every(note => note.includes("observed_player_prop_action")));
  assert.ok(openingNotes.at(-1)?.includes("stress-prop-event-259"));
  assert.equal(openingAdministrativeSourceCount, 0);
  revision = preloaded.worldRevision;

  const hearingContext = buildHearingJudgmentRequest({
    runId: compacted.runId,
    hearingId: "hearing-prop-stress",
    locale: "ko-KR",
    finalDefense: "물건을 여러 번 옮겼습니다.",
    institutionalPressure: compacted.institutionalPressure,
    actors: compacted.actors,
    actorPresentationContexts: hearingPresentationContexts(),
    records: compacted.records,
    ledgerEvents: compacted.ledgerEvents,
  });
  assert.ok(hearingContext.residents.every(resident =>
    resident.memories.length === MAX_PROP_OBSERVATION_MEMORIES_PER_ACTOR &&
    resident.memories.every(memory => !memory.meaningfulFirsthand)
  ));

  assert.ok(firstEvent);
  const oldReceiptRetry = await service.advance({
    runId: started.runId,
    advanceId: "advance-prop-stress-old-retry",
    observedWorldRevision: revision,
    elapsedSeconds: 0,
    arrivals: [],
    propHandlingEvents: [firstEvent],
  });
  assert.equal(oldReceiptRetry.worldRevision, revision);
  assert.equal(oldReceiptRetry.propObservationMemories?.length, 6);
  assert.ok(oldReceiptRetry.propObservationMemories?.every(
    memory => memory.eventId === firstEvent?.eventId,
  ));
  const afterOldRetry = service.snapshot(started.runId);
  assert.ok(afterOldRetry.actors.every(actor => {
    const propMemories = actor.memories.filter(
      memory => memory.kind === "prop_handling_observation",
    );
    return (
      propMemories.length === MAX_PROP_OBSERVATION_MEMORIES_PER_ACTOR &&
      propMemories[0]?.eventId === "stress-prop-event-248" &&
      !propMemories.some(memory => memory.eventId === firstEvent?.eventId)
    );
  }));
  await assert.rejects(
    service.advance({
      runId: started.runId,
      advanceId: "advance-prop-stress-old-conflict",
      observedWorldRevision: revision,
      elapsedSeconds: 0,
      arrivals: [],
      propHandlingEvents: [{ ...firstEvent, action: "throw" }],
    }),
    (error: unknown) => error instanceof RunError && error.code === "prop_event_id_conflict",
  );
});

test("same prop/action spam collapses to one latest fact in every provider surface", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  let providerCalls = 0;
  let openingNotes: string[] = [];
  adapter.proposeConversationTurn = async request => {
    providerCalls += 1;
    openingNotes = [...request.observePacket.actorMemory.ownActionNotes];
    return originalConversation(request);
  };
  const layout = loadRunLayout();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds(), layout });
  const started = service.start("start-same-prop-spam", "ko-KR");
  const observers = layout.actors.map(actor => ({ actorId: actor.actorId, visible: true }));
  let revision = started.worldRevision;
  for (let batch = 0; batch < 40; batch += 1) {
    const propHandlingEvents: RunPropHandlingEvent[] = [];
    for (let offset = 0; offset < 8; offset += 1) {
      const sequence = batch * 8 + offset;
      propHandlingEvents.push({
        eventId: `same-prop-event-${String(sequence).padStart(3, "0")}`,
        propId: "Prop_Studio_Keyboard",
        action: "carry",
        playerPosition: [sequence * 0.01, 0, 0],
        objectPosition: [sequence * 0.01, 0.8, 0],
        observedWorldRevision: revision,
        observers,
      });
    }
    const response = await service.advance({
      runId: started.runId,
      advanceId: `advance-same-prop-spam-${batch}`,
      observedWorldRevision: revision,
      elapsedSeconds: 0,
      arrivals: [],
      propHandlingEvents,
    });
    revision = response.worldRevision;
  }
  assert.equal(providerCalls, 0);
  const compacted = service.snapshot(started.runId);
  assert.ok(compacted.actors.every(actor => {
    const facts = actor.memories.filter(memory => memory.kind === "prop_handling_observation");
    return facts.length === 1 && facts[0]?.eventId === "same-prop-event-319";
  }));

  const targetActor = compacted.actors[0];
  assert.ok(targetActor);
  const zone = conversationZoneFor(layout, targetActor.actorId, targetActor.locationId);
  assert.ok(zone);
  await service.preloadConversation(
    started.runId,
    targetActor.actorId,
    zone.zoneId,
    "ko-KR",
  );
  assert.equal(providerCalls, 1);
  assert.equal(openingNotes.length, 1);
  assert.ok(openingNotes[0]?.includes("same-prop-event-319"));

  const hearingContext = buildHearingJudgmentRequest({
    runId: compacted.runId,
    hearingId: "hearing-same-prop-spam",
    locale: "ko-KR",
    finalDefense: "같은 물건을 반복해서 들었습니다.",
    institutionalPressure: compacted.institutionalPressure,
    actors: compacted.actors,
    actorPresentationContexts: hearingPresentationContexts(),
    records: compacted.records,
    ledgerEvents: compacted.ledgerEvents,
  });
  assert.ok(hearingContext.residents.every(resident =>
    resident.memories.length === 1 &&
    resident.memories[0]?.memoryId === compacted.actors
      .find(actor => actor.actorId === resident.actorId)?.memories[0]?.memoryId &&
    !resident.memories[0]?.meaningfulFirsthand
  ));
  assert.equal(compacted.institutionalPressure, 0);
  assert.deepEqual(compacted.records, []);
  assert.deepEqual(compacted.ledgerEvents, []);
  assert.deepEqual(compacted.socialView, started.socialView);
});

test("late first delivery cannot replace a newer observed prop fact", async () => {
  const layout = loadRunLayout();
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
    layout,
  });
  const started = service.start("start-late-prop-delivery", "ko-KR");
  const observers = layout.actors.map(actor => ({ actorId: actor.actorId, visible: true }));
  const clocked = await service.advance({
    runId: started.runId,
    advanceId: "advance-before-newer-prop",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  const newer = await service.advance({
    runId: started.runId,
    advanceId: "advance-newer-prop",
    observedWorldRevision: clocked.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    propHandlingEvents: [{
      eventId: "prop-event-newer-observation",
      propId: "Prop_Studio_Keyboard",
      action: "carry",
      playerPosition: [2, 0, 0],
      objectPosition: [2, 0.8, 0],
      observedWorldRevision: clocked.worldRevision,
      observers,
    }],
  });
  const late = await service.advance({
    runId: started.runId,
    advanceId: "advance-late-older-prop",
    observedWorldRevision: newer.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    propHandlingEvents: [{
      eventId: "prop-event-late-older-observation",
      propId: "Prop_Studio_Keyboard",
      action: "carry",
      playerPosition: [1, 0, 0],
      objectPosition: [1, 0.8, 0],
      observedWorldRevision: started.worldRevision,
      observers,
    }],
  });

  assert.deepEqual(late.acceptedPropEventIds, ["prop-event-late-older-observation"]);
  assert.equal(late.worldRevision, newer.worldRevision);
  assert.equal(late.propObservationMemories?.length, layout.actors.length);
  const snapshot = service.snapshot(started.runId);
  assert.ok(snapshot.actors.every(actor => {
    const matching = actor.memories.filter(memory =>
      memory.kind === "prop_handling_observation" &&
      memory.propId === "Prop_Studio_Keyboard" &&
      memory.action === "carry"
    );
    return (
      matching.length === 1 &&
      matching[0]?.eventId === "prop-event-newer-observation" &&
      matching[0]?.observedWorldRevision === clocked.worldRevision
    );
  }));

  const retry = await service.advance({
    runId: started.runId,
    advanceId: "advance-late-older-prop-retry",
    observedWorldRevision: newer.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    propHandlingEvents: [{
      eventId: "prop-event-late-older-observation",
      propId: "Prop_Studio_Keyboard",
      action: "carry",
      playerPosition: [1, 0, 0],
      objectPosition: [1, 0.8, 0],
      observedWorldRevision: started.worldRevision,
      observers,
    }],
  });
  assert.deepEqual(retry.propObservationMemories, late.propObservationMemories);
  assert.equal(service.snapshot(started.runId).worldRevision, newer.worldRevision);
});

test("visibility-only facts keep a preloaded opening and ground the later answer provider", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalConversation = adapter.proposeConversationTurn.bind(adapter);
  const originalAnswer = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let openingProviderCalls = 0;
  let answerProviderCalls = 0;
  let openingVisibleObjectIds: string[] = [];
  let answerVisibleObjectIds: string[] = [];
  adapter.proposeConversationTurn = async request => {
    openingProviderCalls += 1;
    openingVisibleObjectIds = request.observePacket.visibleObjects.map(object => object.objectId);
    return originalConversation(request);
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    answerProviderCalls += 1;
    answerVisibleObjectIds = request.observePacket.visibleObjects.map(object => object.objectId);
    return originalAnswer(request);
  };
  const layout = loadRunLayout();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds(), layout });
  const started = service.start("start-prop-visibility", "ko-KR");
  const actorFacts: RunActorSpatialFacts[] = started.scheduler.actors.map(schedulerActor => {
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
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "advance-prop-visibility-seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: actorFacts,
    },
  });
  assert.equal(seeded.scheduleWakes.filter(wake => wake.kind === "goal").length, 6);
  const targetActorId = actorFacts[0]?.actorId;
  assert.ok(targetActorId);
  const targetActor = service.snapshot(started.runId).actors.find(
    actor => actor.actorId === targetActorId,
  );
  assert.ok(targetActor);
  assert.deepEqual(targetActor.memories, []);
  const zone = conversationZoneFor(layout, targetActor.actorId, targetActor.locationId);
  assert.ok(zone);
  const preloaded = await service.preloadConversation(
    started.runId,
    targetActor.actorId,
    zone.zoneId,
    "ko-KR",
  );
  assert.equal(openingProviderCalls, 1);
  assert.equal(answerProviderCalls, 0);
  assert.deepEqual(openingVisibleObjectIds, []);

  const withVisibleProp = actorFacts.map(facts => ({
    ...facts,
    visibleObjectIds:
      facts.actorId === targetActorId ? ["Prop_Studio_Keyboard"] : [],
  }));
  const targetFacts = withVisibleProp.find(facts => facts.actorId === targetActorId);
  assert.ok(targetFacts);
  const visibilityUpdated = await service.advance({
    runId: started.runId,
    advanceId: "advance-prop-visibility-only",
    observedWorldRevision: preloaded.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: preloaded.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: withVisibleProp,
    },
  });
  assert.equal(visibilityUpdated.worldRevision, preloaded.worldRevision + 1);
  assert.deepEqual(visibilityUpdated.scheduleWakes, []);
  assert.deepEqual(visibilityUpdated.actorReadinessDeltas, []);
  assert.equal(openingProviderCalls, 1, "visibility-only facts must not reopen the cached opening");
  assert.equal(answerProviderCalls, 0);

  const groundedWithVisibleProp = withVisibleProp.map(facts => ({
    ...facts,
    playerVisible: facts.actorId === targetActorId,
    playerAudible: facts.actorId === targetActorId,
    playerReachable: facts.actorId === targetActorId,
    playerInteractionZoneId: facts.actorId === targetActorId ? zone.zoneId : null,
  }));
  await service.advance({
    runId: started.runId,
    advanceId: "advance-prop-conversation-grounding",
    observedWorldRevision: visibilityUpdated.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: visibilityUpdated.worldRevision,
      player: { position: [...targetFacts.position], locationId: targetActor.locationId },
      actors: groundedWithVisibleProp,
    },
  });

  const conversation = await service.startConversation(
    started.runId,
    targetActor.actorId,
    zone.zoneId,
    "ko-KR",
  );
  assert.equal(openingProviderCalls, 1, "start must consume the original empty preload");
  assert.equal(answerProviderCalls, 0);
  const choice = conversation.nextTurn.choices.find(candidate => candidate.intent === "safe/local");
  assert.ok(choice);
  await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: choice.choiceId },
  );
  assert.equal(answerProviderCalls, 1);
  assert.deepEqual(answerVisibleObjectIds, ["Prop_Studio_Keyboard"]);
});
