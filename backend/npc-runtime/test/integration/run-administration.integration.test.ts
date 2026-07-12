import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  MAX_SOCIAL_SOURCE_EXCERPT_CODE_POINTS,
  normalizeSocialSourceExcerpt,
  RunError,
  RunService,
  STUDIO_RECEPTIONIST_ID,
} from "../../src/runtime/run-service.js";
import {
  runSocialProvenanceSchema,
  type RunActorSpatialFacts,
  type RunSnapshot,
} from "../../src/runtime/run-schema.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-admin-${++counts[prefix]}`;
}

function spatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    const block = schedulerActor.currentBlock;
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs: block?.targetKind === "anchor"
        ? [block.targetId]
        : [...new Set(layout.routes.find(route => route.routeId === block?.targetId)?.points ?? [])],
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

test("social source excerpts remove unsafe controls and truncate by Unicode code point", () => {
  assert.equal(
    normalizeSocialSourceExcerpt("  first\tsecond\r\nthird  "),
    "first second third",
  );
  assert.equal(
    normalizeSocialSourceExcerpt(
      "A\u0000B\u007fC\u0085D\u061cE\u200eF\u200fG\u202eH\u2066I",
    ),
    "ABCDEFGHI",
  );
  assert.equal(normalizeSocialSourceExcerpt("\u0000\u202e\u2066"), "…");
  const astral = normalizeSocialSourceExcerpt("😀".repeat(200));
  assert.equal([...astral].length, MAX_SOCIAL_SOURCE_EXCERPT_CODE_POINTS);
  assert.equal(astral, `${"😀".repeat(159)}…`);

  const provenance = {
    originKind: "speech" as const,
    originActorId: "player",
    recipientKind: "listener" as const,
    recipientActorId: STUDIO_RECEPTIONIST_ID,
    sourceMemoryId: "mem-source",
    recordId: null,
    recordRevision: null,
    ledgerEventId: null,
    sourceExcerpt: "😀".repeat(160),
    whyLine: "직접 들은 답변입니다.",
  };
  assert.equal(runSocialProvenanceSchema.parse(provenance).sourceExcerpt, provenance.sourceExcerpt);
  assert.throws(() => runSocialProvenanceSchema.parse({
    ...provenance,
    sourceExcerpt: "😀".repeat(161),
  }));
});

test("provider-owned administration is sourced, clamped, exactly-once, and disclosed only on encounter", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    const resolved = await originalNextStep(request);
    if (resolved.proposal.toolCall?.tool === "write_record") {
      resolved.proposal.toolCall.args.institutionalPressureDelta = 999;
    }
    return resolved;
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const started = service.start("admin-start", "ko-KR");
  assert.deepEqual(started.socialView.encounteredResidents, []);
  const preloaded = await service.preloadConversation(
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
    "ground-administration-source",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  assert.deepEqual(conversation.socialView.encounteredResidents, []);
  const answered = await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: conversation.nextTurn.choices[2].choiceId },
  );
  assert.equal(answered.judgment.reportDelta, 15);
  assert.equal(answered.judgment.institutionalPressureDelta, 0);
  assert.equal(answered.socialView.encounteredResidents.length, 1);
  assert.equal(
    answered.socialView.encounteredResidents[0]?.provenance?.sourceExcerpt,
    answered.memoryDelta.playerLine,
  );
  assert.equal(answered.socialView.openQuestions[0]?.text, "이 방문자는 왜 마을 절차를 전혀 모르는가?");
  assert.equal(
    answered.socialView.openQuestions[0]?.provenance.sourceExcerpt,
    answered.memoryDelta.playerLine,
  );
  const beforeEnd = service.snapshot(started.runId);
  assert.equal(beforeEnd.institutionalPressure, 0);
  assert.equal(beforeEnd.ledgerEvents.length, 0);
  await service.endConversation(started.runId, conversation.sessionId);

  const beforeFacts = service.snapshot(started.runId);
  const facts = spatialActors(beforeFacts);
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-1",
    observedWorldRevision: beforeFacts.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeFacts.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: facts,
    },
  });
  const wake = advanced.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(wake);
  const written = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  const retry = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.deepEqual(retry, written);
  const adminDelta = written.actionDeltas.find(
    delta => delta.kind === "administration",
  );
  assert.ok(adminDelta && adminDelta.kind === "administration");
  assert.equal(adminDelta.action, "write_record");
  assert.equal(adminDelta.ledgerEvent.sourceMemoryId, answered.memoryDelta.memoryId);
  assert.equal(adminDelta.ledgerEvent.pressureDelta, 25);
  assert.equal(adminDelta.ledgerEvent.openQuestion?.text, "접수 기록에 남은 방문 경위는 무엇인가?");
  const hidden = service.snapshot(started.runId);
  assert.equal(hidden.records.length, 1);
  assert.equal(hidden.ledgerEvents.length, 1);
  assert.equal(hidden.institutionalPressure, 25);
  assert.equal(hidden.actors[0]?.stance, "oppose");
  assert.equal(hidden.socialView.pressure.band, "low", "hidden administration must not leak");
  assert.deepEqual(hidden.socialView.encounteredRecords, []);
  assert.ok(hidden.socialView.openQuestions.every(
    question => !question.questionId.startsWith("question:record:"),
  ));

  // Corrupted legacy state must never make disclosure guess a hidden source.
  // Exercise the projection seam directly so duplicate references, a memory-id
  // collision in another resident, and a missing/ambiguous author memory all
  // fall back to the record body that this surface already exposes.
  type MutableMemory = {
    memoryId: string;
    kind: string;
    playerLine?: string;
    [key: string]: unknown;
  };
  type MutableActor = { actorId: string; memories: MutableMemory[] };
  type MutableRecord = {
    recordId: string;
    authorActorId: string;
    stateBody: string;
    sourceRefs: Array<{ sourceMemoryId: string; originActorId: string }>;
  };
  type MutableLedgerEvent = { eventId: string; sourceMemoryId: string };
  type MutableRun = {
    actors: Map<string, MutableActor>;
    records: MutableRecord[];
    ledgerEvents: MutableLedgerEvent[];
  };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  assert.ok(internalRun);
  const internalRecord = internalRun.records.find(
    record => record.recordId === adminDelta.record.recordId,
  );
  const internalEvent = internalRun.ledgerEvents.find(
    event => event.eventId === adminDelta.ledgerEvent.eventId,
  );
  const author = internalRun.actors.get(adminDelta.record.authorActorId);
  const foreignActor = [...internalRun.actors.values()].find(
    actor => actor.actorId !== adminDelta.record.authorActorId,
  );
  assert.ok(internalRecord && internalEvent && author && foreignActor);
  const sourceIndex = author.memories.findIndex(
    memory => memory.memoryId === adminDelta.ledgerEvent.sourceMemoryId,
  );
  assert.notEqual(sourceIndex, -1);
  const sourceMemory = author.memories[sourceIndex];
  assert.ok(sourceMemory);
  const projectExcerpt = Reflect.get(service, "recordSourceExcerpt").bind(service) as (
    run: MutableRun,
    record: MutableRecord,
    event: MutableLedgerEvent,
  ) => string;
  const foreignCollision = structuredClone(sourceMemory);
  foreignCollision.playerLine = "숨겨진 다른 주민의 잘못된 기억";
  foreignActor.memories.push(foreignCollision);
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), answered.memoryDelta.playerLine);
  foreignActor.memories.pop();

  internalRecord.sourceRefs.push(structuredClone(internalRecord.sourceRefs[0]));
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  internalRecord.sourceRefs.pop();

  const [removedSource] = author.memories.splice(sourceIndex, 1);
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  assert.ok(removedSource);
  author.memories.splice(sourceIndex, 0, removedSource);
  author.memories.push(structuredClone(removedSource));
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  author.memories.pop();

  const layout = loadRunLayout();
  const surface = layout.recordSurfaces.find(candidate => candidate.surfaceId === "TS_Studio_ReviewRecords");
  assert.ok(surface);
  const position = layout.anchorPositions[surface.anchorRef];
  assert.ok(position);
  const worldRevisionBeforeEncounter = hidden.worldRevision;
  const disclosed = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-1",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.equal(disclosed.socialView.encounteredRecords.length, 1);
  assert.equal(disclosed.socialView.pressure.band, "raised");
  assert.equal(
    disclosed.socialView.pressure.latestEncounteredWhyLine,
    adminDelta.ledgerEvent.whyLine,
  );
  const firstDisclosedRecord = disclosed.socialView.encounteredRecords[0];
  assert.ok(firstDisclosedRecord);
  assert.equal(firstDisclosedRecord.lastLedgerEventId, adminDelta.ledgerEvent.eventId);
  assert.equal(firstDisclosedRecord.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(firstDisclosedRecord.provenance.recipientActorId, "player");
  assert.equal(firstDisclosedRecord.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  const recordQuestionId = `question:record:${adminDelta.record.recordId}`;
  const firstRecordQuestion = disclosed.socialView.openQuestions.find(
    question => question.questionId === recordQuestionId,
  );
  assert.equal(firstRecordQuestion?.text, "접수 기록에 남은 방문 경위는 무엇인가?");
  assert.equal(firstRecordQuestion?.provenance.ledgerEventId, adminDelta.ledgerEvent.eventId);
  assert.equal(firstRecordQuestion?.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(service.snapshot(started.runId).worldRevision, worldRevisionBeforeEncounter);
  const disclosedRetry = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-1",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.deepEqual(disclosedRetry, disclosed);
  await assert.rejects(
    service.encounter({
      runId: started.runId,
      encounterId: "record-encounter-far",
      encounter: {
        kind: "record_surface",
        textSurfaceId: surface.surfaceId,
        playerPosition: [position[0] + 100, position[1], position[2]],
      },
    }),
    (error: unknown) => error instanceof RunError && error.code === "encounter_not_visible",
  );

  // The manager's stale pre-record wake cannot read current facts. A fresh
  // record-version goal reads once; its next retry wake produces no mutation.
  const initialManagerWake = [
    ...advanced.scheduleWakes,
    ...service.snapshot(started.runId).scheduler.pendingWakes,
  ].find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(initialManagerWake);
  const stale = await service.decision({
    runId: started.runId,
    wakeId: initialManagerWake.wakeId,
    observedWorldRevision: initialManagerWake.observedWorldRevision,
  });
  assert.equal(stale.status, "stale");
  const afterWrite = service.snapshot(started.runId);
  const refreshed = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-2",
    observedWorldRevision: afterWrite.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: afterWrite.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(afterWrite),
    },
  });
  const readWake = refreshed.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(readWake);
  const read = await service.decision({
    runId: started.runId,
    wakeId: readWake.wakeId,
    observedWorldRevision: readWake.observedWorldRevision,
  });
  const readDelta = read.actionDeltas.find(
    delta => delta.kind === "administration" && delta.action === "read_record",
  );
  assert.ok(readDelta && readDelta.kind === "administration");
  assert.equal(readDelta.ledgerEvent.pressureDelta, 10);
  assert.equal(
    readDelta.ledgerEvent.openQuestion?.text,
    "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?",
  );
  assert.equal(readDelta.record.recordRevision, adminDelta.record.recordRevision);
  assert.notEqual(readDelta.record.lastLedgerEventId, adminDelta.record.lastLedgerEventId);
  assert.equal(readDelta.record.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  const afterRead = service.snapshot(started.runId);
  assert.equal(afterRead.ledgerEvents.length, 2);
  assert.equal(afterRead.institutionalPressure, 35);
  assert.equal(afterRead.records[0]?.recordRevision, adminDelta.record.recordRevision);
  assert.equal(afterRead.records[0]?.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  assert.deepEqual(
    afterRead.socialView,
    disclosed.socialView,
    "offscreen record reading must remain hidden until the player inspects again",
  );
  const manager = afterRead.actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(manager?.memories.some(memory => memory.kind === "record_read"));
  assert.equal(manager?.stance, "uncertain", "record reading cannot move stance");

  const redisclosed = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-after-read",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  const redisclosedRecord = redisclosed.socialView.encounteredRecords[0];
  assert.ok(redisclosedRecord);
  assert.equal(redisclosedRecord.recordRevision, firstDisclosedRecord.recordRevision);
  assert.equal(redisclosedRecord.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(redisclosedRecord.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(redisclosedRecord.provenance.recipientActorId, "NPC_Studio_Manager");
  assert.equal(redisclosedRecord.provenance.sourceMemoryId, readDelta.ledgerEvent.sourceMemoryId);
  assert.equal(redisclosedRecord.provenance.ledgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(redisclosedRecord.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(
    redisclosed.socialView.pressure.latestEncounteredWhyLine,
    readDelta.ledgerEvent.whyLine,
  );
  const readQuestion = redisclosed.socialView.openQuestions.find(
    question => question.questionId === recordQuestionId,
  );
  assert.equal(readQuestion?.text, "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?");
  assert.equal(readQuestion?.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(readQuestion?.provenance.recipientActorId, "NPC_Studio_Manager");
  assert.equal(readQuestion?.provenance.sourceMemoryId, readDelta.ledgerEvent.sourceMemoryId);
  assert.equal(readQuestion?.provenance.ledgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(readQuestion?.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(redisclosed.socialView.revision, disclosed.socialView.revision + 1);
  const repeatedInspection = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-after-read-repeat",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.deepEqual(repeatedInspection.socialView, redisclosed.socialView);

  const rereadAdvance = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-3",
    observedWorldRevision: afterRead.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: afterRead.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(afterRead),
    },
  });
  const rereadWake = rereadAdvance.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(rereadWake);
  const reread = await service.decision({
    runId: started.runId,
    wakeId: rereadWake.wakeId,
    observedWorldRevision: rereadWake.observedWorldRevision,
  });
  assert.ok(reread.actionDeltas.every(delta => delta.kind !== "administration"));
  assert.equal(service.snapshot(started.runId).ledgerEvents.length, 2);
});
