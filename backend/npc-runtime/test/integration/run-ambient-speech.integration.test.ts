import assert from "node:assert/strict";
import { test } from "bun:test";
import { fallbackContent } from "../../src/localization/fallback-content.js";
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
  RunNpcDecisionRequest,
  RunScheduleWake,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";

function deterministicIds(label: string) {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-${label}-${++counts[prefix]}`;
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
  const wake = ready.scheduleWakes.find(candidate => candidate.kind === "meeting_ready");
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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

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
    ambientRequests[0]?.observePacket.heardSpeech.at(-1),
    `NPC_Studio_Manager: ${first.speechEvents[0]?.line}`,
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
  assert.deepEqual(response.speechEvents[0]?.listenerActorIds, ["NPC_Park_Caretaker"]);
  assert.deepEqual(response.speechEvents[1]?.listenerActorIds, ["NPC_Studio_Manager"]);

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
    NPC_Roaming_Liaison: 0,
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
  assert.equal(memoryIds.size, 4);
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
    ["NPC_Park_Caretaker", "NPC_Studio_Manager"].sort(),
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
  assert.deepEqual(managerRequest.observePacket.visibleActors, ["player"]);
  assert.ok(managerRequest.observePacket.heardSpeech.some(
    line => line.startsWith("NPC_Park_Caretaker:"),
  ));
  assert.ok(managerRequest.observePacket.actorMemory.ownActionNotes.some(
    line => line.includes("[heard_from=NPC_Park_Caretaker]"),
  ));
  assert.deepEqual(officeRequest.observePacket.visibleActors, ["player"]);
  assert.deepEqual(officeRequest.observePacket.heardSpeech, []);
  assert.ok(officeRequest.observePacket.actorMemory.ownActionNotes.every(
    line => !line.includes("NPC_Park_Caretaker"),
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

test("a neutral ambient reply still records one localized no-change judgment", async () => {
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
  assert.equal(judgment.whyLine, fallbackContent("ko-KR").agent.ambientNoChangeWhy);
  assert.deepEqual(snapshot.socialView.encounteredResidents, []);

  await service.preloadConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
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
  assert.equal(disclosed.provenance?.whyLine, judgment.whyLine);
  const revision = started.socialView.revision;
  const retried = await service.startConversation(
    meeting.started.runId,
    caretaker.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(retried.socialView.revision, revision, "a start retry cannot disclose twice");
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
