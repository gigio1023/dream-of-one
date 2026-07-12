import assert from "node:assert/strict";
import { test } from "bun:test";
import type {
  AgentStepRequest,
  ConversationTurnRequest,
  NpcProposalPort,
} from "../../src/providers/ports.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import type {
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
    if (step === 1) {
      const fixedArrivals = atNinety.movementDeltas
        .filter(movement => [
          "NPC_Studio_Receptionist",
          "NPC_Office_Worker",
          "NPC_Station_Officer",
        ].includes(movement.actorId))
        .map(movement => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        }));
      assert.equal(fixedArrivals.length, 3);
      atNinety = await service.advance({
        runId: started.runId,
        advanceId: `${startId}:fixed-arrivals`,
        observedWorldRevision: revision,
        elapsedSeconds: 0,
        arrivals: fixedArrivals,
      });
      revision = atNinety.worldRevision;
    }
  }
  assert.ok(atNinety);
  const arrivals = atNinety.movementDeltas
    .filter(movement =>
      ["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(movement.actorId),
    )
    .map(movement => ({
      movementId: movement.movementId,
      actorId: movement.actorId,
      anchorRef: movement.targetAnchorRef,
    }));
  assert.equal(arrivals.length, 2);
  const ready = await service.advance({
    runId: started.runId,
    advanceId: `${startId}:meeting-arrivals`,
    observedWorldRevision: atNinety.worldRevision,
    elapsedSeconds: 0,
    arrivals,
  });
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

function capturingAdapter() {
  const adapter = createStudioReceptionScriptedAdapter();
  const requests: AgentStepRequest[] = [];
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    requests.push(structuredClone(request));
    return original(request);
  };
  return { adapter, requests };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

test("one meeting decision is single-flight, cached, and gives the responder the exact first line", async () => {
  const { adapter, requests } = capturingAdapter();
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("retry") });
  const meeting = await readyFirstMeeting(service, "ambient-retry");

  const [first, concurrent] = await Promise.all([
    service.decision(meeting.request),
    service.decision(meeting.request),
  ]);
  assert.deepEqual(concurrent, first);
  assert.equal(first.status, "completed");
  assert.equal(first.speechEvents.length, 2);
  assert.equal(requests.length, 2, "one wake produces exactly two provider proposals");
  assert.deepEqual(requests[0]?.observePacket.visibleActors, ["NPC_Park_Caretaker"]);
  assert.deepEqual(requests[1]?.observePacket.visibleActors, ["NPC_Studio_Manager"]);
  assert.deepEqual(requests[0]?.requiredToolCall, {
    tool: "talk_to",
    actorId: "NPC_Park_Caretaker",
  });
  assert.equal(requests[0]?.requireUtterance, true);
  assert.equal(
    requests[1]?.observePacket.heardSpeech.at(-1),
    `NPC_Studio_Manager: ${first.speechEvents[0]?.line}`,
  );

  const retried = await service.decision(meeting.request);
  assert.deepEqual(retried, first);
  assert.equal(requests.length, 2, "a completed retry must not call the provider again");
  await assert.rejects(
    service.decision({
      ...meeting.request,
      observedWorldRevision: meeting.request.observedWorldRevision + 1,
    }),
    (error: unknown) => error instanceof RunError && error.code === "decision_id_conflict",
  );
});

test("ambient utterances enter only the speaker and current runtime-confirmed listeners with full provenance", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("memory"),
  });
  const meeting = await readyFirstMeeting(service, "ambient-memory");
  const response = await service.decision(meeting.request);
  assert.equal(response.status, "completed");
  assert.deepEqual(response.speechEvents.map(event => event.seq), [1, 2]);
  assert.deepEqual(response.speechEvents[0]?.listenerActorIds, [
    "NPC_Park_Caretaker",
    "NPC_Roaming_Liaison",
  ]);
  assert.deepEqual(response.speechEvents[1]?.listenerActorIds, [
    "NPC_Studio_Manager",
    "NPC_Roaming_Liaison",
  ]);

  const snapshot = service.snapshot(meeting.started.runId);
  assert.equal(snapshot.ambientSpeech.cursor, 2);
  assert.deepEqual(snapshot.ambientSpeech.events, response.speechEvents);
  assert.equal(snapshot.ambientSpeech.activeConversation, null);
  assert.ok(snapshot.actors.every(actor => actor.stance === "uncertain"));
  const expectedMemoryCount: Record<string, number> = {
    NPC_Studio_Receptionist: 0,
    NPC_Studio_Manager: 2,
    NPC_Office_Worker: 0,
    NPC_Park_Caretaker: 2,
    NPC_Station_Officer: 0,
    NPC_Roaming_Liaison: 2,
  };
  const memoryIds = new Set<string>();
  for (const actor of snapshot.actors) {
    assert.equal(actor.memories.length, expectedMemoryCount[actor.actorId]);
    for (const memory of actor.memories) {
      assert.equal(memory.kind, "ambient_utterance");
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
  await service.endConversation(meeting.started.runId, playerConversation.sessionId);
  const committed = await service.decision(meeting.request);
  assert.equal(committed.status, "completed");
  assert.equal(committed.speechEvents.length, 2);
  assert.equal(ambientCalls, 2, "queued retry reuses both resolved proposals");
  assert.deepEqual(await service.decision(meeting.request), committed);
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
