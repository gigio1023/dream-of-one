import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "bun:test";
import {
  runAdvanceRequestSchema,
  runAdvanceResponseSchema,
  runEncounterRequestSchema,
  runEncounterResponseSchema,
  runEndRequestSchema,
  runEndResponseSchema,
  runHearingRequestSchema,
  runHearingResponseSchema,
  runNpcDecisionRequestSchema,
  runNpcDecisionResponseSchema,
  runSessionAnswerRequestSchema,
  runSessionAnswerResponseSchema,
  runSessionEndRequestSchema,
  runSessionEndResponseSchema,
  runSessionPreloadResponseSchema,
  runSessionSnapshotRequestSchema,
  runSessionSnapshotResponseSchema,
  runSessionStartRequestSchema,
  runSessionStartResponseSchema,
  runSnapshotRequestSchema,
  runSnapshotSchema,
  runStartRequestSchema,
} from "../../src/runtime/run-schema.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const backendPath = resolve(testDir, "..", "..", "data", "fixtures", "run-api-examples.json");
const repoRoot = resolve(testDir, "..", "..", "..", "..");
const godotPath = resolve(repoRoot, "godot", "data", "fixtures", "run-api-examples.json");
const backendBody = readFileSync(backendPath, "utf-8");
const fixtures = JSON.parse(backendBody);

test("backend and Godot run fixtures are byte-identical", () => {
  assert.equal(readFileSync(godotPath, "utf-8"), backendBody);
});

test("every run fixture packet validates against the public wire schemas", () => {
  const endpoints = fixtures.endpoints;

  runStartRequestSchema.parse(endpoints.runStart.request);
  runSnapshotSchema.parse(endpoints.runStart.response);

  runAdvanceRequestSchema.parse(endpoints.runAdvanceHearingDue.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvanceHearingDue.response);
  runAdvanceRequestSchema.parse(endpoints.runAdvancePropHandling.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvancePropHandling.response);
  runSnapshotRequestSchema.parse(endpoints.runSnapshotAfterPropHandling.request);
  runSnapshotSchema.parse(endpoints.runSnapshotAfterPropHandling.response);
  runHearingRequestSchema.parse(endpoints.runHearingOpen.request);
  runHearingResponseSchema.parse(endpoints.runHearingOpen.response);
  runHearingRequestSchema.parse(endpoints.runHearingAnswer.request);
  runHearingResponseSchema.parse(endpoints.runHearingAnswer.response);
  runEndRequestSchema.parse(endpoints.runEnd.request);
  runEndResponseSchema.parse(endpoints.runEnd.response);

  for (const endpoint of [
    endpoints.runAdvanceInitial,
    endpoints.runAdvanceArrival,
    endpoints.runAdvanceRoute,
    endpoints.runAdvanceRouteRetry,
  ]) {
    runAdvanceRequestSchema.parse(endpoint.request);
    runAdvanceResponseSchema.parse(endpoint.response);
  }
  runSnapshotRequestSchema.parse(endpoints.runSnapshotAfterAdvance.request);
  runSnapshotSchema.parse(endpoints.runSnapshotAfterAdvance.response);

  runNpcDecisionRequestSchema.parse(endpoints.npcDecision.request);
  runNpcDecisionResponseSchema.parse(endpoints.npcDecision.response);
  runAdvanceRequestSchema.parse(endpoints.runAdvanceSpatialFacts.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvanceSpatialFacts.response);
  assert.equal(endpoints.npcDecisionVariants.length, 7);
  for (const variant of endpoints.npcDecisionVariants) {
    runNpcDecisionRequestSchema.parse(variant.request);
    runNpcDecisionResponseSchema.parse(variant.response);
  }
  runAdvanceRequestSchema.parse(endpoints.runAdvanceAmbientSpeech.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvanceAmbientSpeech.response);
  runSnapshotRequestSchema.parse(endpoints.runSnapshotAfterMeeting.request);
  runSnapshotSchema.parse(endpoints.runSnapshotAfterMeeting.response);

  runAdvanceRequestSchema.parse(endpoints.runAdvancePlayerContactOpportunity.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvancePlayerContactOpportunity.response);
  runNpcDecisionRequestSchema.parse(endpoints.npcDecisionPlayerContact.request);
  runNpcDecisionResponseSchema.parse(endpoints.npcDecisionPlayerContact.response);
  runSessionStartRequestSchema.parse(endpoints.sessionPreloadPlayerContact.request);
  runSessionPreloadResponseSchema.parse(endpoints.sessionPreloadPlayerContact.response);
  runAdvanceRequestSchema.parse(endpoints.runAdvancePlayerContactSafeDistance.request);
  runAdvanceResponseSchema.parse(endpoints.runAdvancePlayerContactSafeDistance.response);
  runSessionStartRequestSchema.parse(endpoints.sessionStartPlayerContact.request);
  runSessionStartResponseSchema.parse(endpoints.sessionStartPlayerContact.response);

  assert.equal(endpoints.sessionPreloads.length, 6);
  for (const endpoint of endpoints.sessionPreloads) {
    runSessionStartRequestSchema.parse(endpoint.request);
    runSessionPreloadResponseSchema.parse(endpoint.response);
  }

  runSessionStartRequestSchema.parse(endpoints.sessionStart.request);
  runSessionStartResponseSchema.parse(endpoints.sessionStart.response);

  runSessionAnswerRequestSchema.parse(endpoints.sessionAnswer.request);
  runSessionAnswerResponseSchema.parse(endpoints.sessionAnswer.response);

  runSessionSnapshotRequestSchema.parse(endpoints.sessionSnapshot.request);
  runSessionSnapshotResponseSchema.parse(endpoints.sessionSnapshot.response);

  runSnapshotRequestSchema.parse(endpoints.runSnapshotAfterAnswer.request);
  runSnapshotSchema.parse(endpoints.runSnapshotAfterAnswer.response);

  runSessionEndRequestSchema.parse(endpoints.sessionEnd.request);
  runSessionEndResponseSchema.parse(endpoints.sessionEnd.response);

  runSnapshotRequestSchema.parse(endpoints.runSnapshotAfterEnd.request);
  runSnapshotSchema.parse(endpoints.runSnapshotAfterEnd.response);

  for (const endpoint of [
    endpoints.administrationWriteDecision,
    endpoints.administrationReadDecision,
  ]) {
    runNpcDecisionRequestSchema.parse(endpoint.request);
    runNpcDecisionResponseSchema.parse(endpoint.response);
  }
  runEncounterRequestSchema.parse(endpoints.administrationRecordEncounter.request);
  runEncounterResponseSchema.parse(endpoints.administrationRecordEncounter.response);
  runSnapshotRequestSchema.parse(endpoints.administrationFinalSnapshot.request);
  runSnapshotSchema.parse(endpoints.administrationFinalSnapshot.response);
});

test("prop fixture preserves the engine visibility boundary as factual memory", () => {
  const endpoints = fixtures.endpoints;
  const response = endpoints.runAdvancePropHandling.response;
  assert.deepEqual(response.acceptedPropEventIds, ["fixture-prop-event-1"]);
  assert.deepEqual(
    response.propObservationMemories.map((memory: { listenerActorId: string }) =>
      memory.listenerActorId
    ).sort(),
    ["NPC_Park_Caretaker", "NPC_Studio_Receptionist"],
  );
  assert.deepEqual(response.scheduleWakes, []);
  assert.deepEqual(response.actorReadinessDeltas, []);
  const snapshot = endpoints.runSnapshotAfterPropHandling.response;
  assert.equal(snapshot.records.length, 0);
  assert.equal(snapshot.ledgerEvents.length, 0);
  assert.equal(snapshot.institutionalPressure, 0);
  assert.equal(snapshot.actors.reduce(
    (count: number, actor: { memories: Array<{ kind: string }> }) =>
      count + actor.memories.filter(memory => memory.kind === "prop_handling_observation").length,
    0,
  ), 2);
});

test("contact fixture reaches the same preloaded session through one grounded provider choice", () => {
  const endpoints = fixtures.endpoints;
  const opportunity = endpoints.runAdvancePlayerContactOpportunity.response;
  assert.ok(opportunity.clock.toSeconds <= 120);
  const decision = endpoints.npcDecisionPlayerContact.response;
  assert.equal(decision.activeContact.actorId, "NPC_Park_Caretaker");
  assert.equal(decision.activeContact.interactionZoneId, "ParkConversation");
  assert.equal(decision.providerMetas.at(-1).transport, "scripted");
  assert.equal(endpoints.sessionPreloadPlayerContact.response.activeContact.contactId,
    decision.activeContact.contactId);
  assert.equal(endpoints.sessionStartPlayerContact.request.contactId,
    decision.activeContact.contactId);
  assert.equal(endpoints.sessionStartPlayerContact.response.activeContact, null);
  assert.equal(endpoints.sessionStartPlayerContact.response.nextTurn.choices.length, 3);
});

test("administration fixture carries provider prose through write, read, pressure, and disclosure", () => {
  const endpoints = fixtures.endpoints;
  const written = endpoints.administrationWriteDecision.response;
  const writeDelta = written.actionDeltas.find(
    (delta: { kind: string }) => delta.kind === "administration",
  );
  assert.equal(writeDelta.action, "write_record");
  assert.equal(writeDelta.ledgerEvent.pressureDelta, 15);
  assert.equal(writeDelta.ledgerEvent.openQuestion.text, "접수 기록에 남은 방문 경위는 무엇인가?");
  assert.equal(writeDelta.record.stateBody, "방문자가 마을 절차를 모른다고 밝혀 방문 경위를 추가 확인해야 함.");
  const read = endpoints.administrationReadDecision.response.actionDeltas.find(
    (delta: { kind: string }) => delta.kind === "administration",
  );
  assert.equal(read.action, "read_record");
  assert.equal(read.ledgerEvent.pressureDelta, 10);
  assert.equal(
    read.ledgerEvent.openQuestion.text,
    "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?",
  );
  assert.equal(read.record.recordRevision, writeDelta.record.recordRevision);
  assert.equal(read.record.lastLedgerEventId, read.ledgerEvent.eventId);
  const finalSnapshot = endpoints.administrationFinalSnapshot.response;
  assert.equal(finalSnapshot.records.length, 1);
  assert.equal(finalSnapshot.ledgerEvents.length, 2);
  assert.equal(finalSnapshot.institutionalPressure, 25);
  assert.equal(finalSnapshot.socialView.encounteredRecords.length, 1);
  assert.equal(finalSnapshot.socialView.pressure.band, "raised");
  assert.equal(
    finalSnapshot.socialView.encounteredRecords[0].provenance.recipientActorId,
    "NPC_Studio_Manager",
  );
  assert.ok(finalSnapshot.socialView.openQuestions.some(
    (question: { questionId: string; text: string }) =>
      question.questionId === `question:record:${read.record.recordId}` &&
      question.text === "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?",
  ));
});

test("advance fixture replays staggered moves, batched arrivals, and arrival-gated routes", () => {
  const sequence = fixtures.runAdvanceSequence;
  assert.deepEqual(
    sequence.slice(0, 3).map((step: { stepId: string }) => step.stepId),
    ["initial_clock", "first_route_moves", "initial_arrivals"],
  );
  assert.equal(sequence.at(-1)?.stepId, "first_meeting_speech_delivery");
  for (const step of sequence) {
    runAdvanceRequestSchema.parse(step.request);
    runAdvanceResponseSchema.parse(step.response);
  }
  for (let index = 1; index < sequence.length; index += 1) {
    const previous = sequence[index - 1];
    const current = sequence[index];
    const expectedArrivals = previous.response.movementDeltas
      .map(
        (movement: {
          movementId: string;
          actorId: string;
          targetAnchorRef: string;
        }) => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        }),
      )
      .sort(
        (
          first: { movementId: string; actorId: string },
          second: { movementId: string; actorId: string },
        ) => {
          const actorOrder = first.actorId.localeCompare(second.actorId);
          return actorOrder !== 0
            ? actorOrder
            : first.movementId.localeCompare(second.movementId);
        },
      );
    if (expectedArrivals.length > 0) {
      assert.equal(current.request.elapsedSeconds, 0);
      assert.deepEqual(current.request.arrivals, expectedArrivals);
    } else {
      assert.equal(current.request.elapsedSeconds, 10);
      assert.deepEqual(current.request.arrivals, []);
    }
  }
  const initial = fixtures.endpoints.runAdvanceInitial.response;
  assert.deepEqual(initial.movementDeltas, []);
  const route = fixtures.endpoints.runAdvanceRoute.response;
  assert.deepEqual(
    route.movementDeltas.map((movement: { actorId: string; routePointIndex: number }) => [
      movement.actorId,
      movement.routePointIndex,
    ]),
    [
      ["NPC_Studio_Receptionist", 1],
      ["NPC_Studio_Manager", 1],
      ["NPC_Office_Worker", 1],
      ["NPC_Roaming_Liaison", 1],
    ],
  );
  assert.deepEqual(route, fixtures.endpoints.runAdvanceRouteRetry.response);
  const arrival = fixtures.endpoints.runAdvanceArrival;
  assert.equal(arrival.request.arrivals.length, 4);
  assert.equal(arrival.response.arrivalsApplied.length, 4);
  const earlyPolicyMovements = sequence.flatMap(
    (step: { response: { clock: { toSeconds: number }; movementDeltas: Array<{
      actorId: string;
      issuedAtSeconds: number;
    }> } }) => step.response.clock.toSeconds <= 30 ? step.response.movementDeltas : [],
  );
  assert.deepEqual(
    [...new Set(earlyPolicyMovements.map((movement: { actorId: string }) => movement.actorId))].sort(),
    [
      "NPC_Office_Worker",
      "NPC_Park_Caretaker",
      "NPC_Roaming_Liaison",
      "NPC_Station_Officer",
      "NPC_Studio_Manager",
      "NPC_Studio_Receptionist",
    ],
  );
  assert.equal(
    new Set(earlyPolicyMovements.map(
      (movement: { issuedAtSeconds: number }) => movement.issuedAtSeconds,
    )).size,
    6,
  );
  const postRouteArrival = sequence
    .slice(3, -1)
    .find(
      (step: { request: { elapsedSeconds: number; arrivals: unknown[] } }) =>
        step.request.elapsedSeconds === 0 && step.request.arrivals.length > 0,
    );
  assert.ok(postRouteArrival, "issued route movement must be followed by an exact arrival barrier");
  const meetingReadyStep = sequence
    .slice(0, -1)
    .find((step: { response: { scheduleWakes: Array<{ kind: string }> } }) =>
      step.response.scheduleWakes.some(wake => wake.kind === "meeting_ready"),
    );
  assert.ok(meetingReadyStep);
  assert.equal(meetingReadyStep.request.elapsedSeconds, 0);
  assert.ok(meetingReadyStep.request.arrivals.length > 0);
  assert.equal(meetingReadyStep.response.clock.toSeconds, 90);
  const decision = runNpcDecisionResponseSchema.parse(fixtures.endpoints.npcDecision.response);
  assert.equal(decision.status, "completed");
  assert.equal(decision.speechEvents.length, 2);
  const delivery = runAdvanceResponseSchema.parse(
    fixtures.endpoints.runAdvanceAmbientSpeech.response,
  );
  assert.equal(fixtures.endpoints.runAdvanceAmbientSpeech.request.afterSpeechSeq, 2);
  assert.deepEqual(delivery.ambientSpeechEvents, []);
  assert.equal(delivery.ambientSpeechCursor, 2);
  const afterMeeting = runSnapshotSchema.parse(
    fixtures.endpoints.runSnapshotAfterMeeting.response,
  );
  assert.deepEqual(afterMeeting.ambientSpeech.events, decision.speechEvents);
  assert.equal(afterMeeting.ambientSpeech.cursor, 2);
});

test("ambient fixture contains one listener-owned no-change judgment with exact speech provenance", () => {
  const snapshot = fixtures.endpoints.runSnapshotAfterMeeting.response;
  const caretaker = snapshot.actors.find(
    (actor: { actorId: string }) => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(caretaker);
  const judgment = caretaker.memories.find(
    (memory: { kind: string }) => memory.kind === "ambient_stance_judgment",
  );
  assert.ok(judgment);
  const source = caretaker.memories.find(
    (memory: { memoryId: string }) => memory.memoryId === judgment.sourceMemoryId,
  );
  assert.ok(source);
  assert.equal(source.kind, "ambient_utterance");
  assert.equal(source.eventId, judgment.sourceSpeechEventId);
  assert.equal(source.speakerActorId, judgment.sourceActorId);
  assert.equal(judgment.listenerActorId, caretaker.actorId);
  assert.equal(judgment.suspicionDelta, 0);
  assert.equal(judgment.appliedStance, "uncertain");
});

test("the fixture proves one attributable Studio stance change without institutional mutation", () => {
  const answer = fixtures.endpoints.sessionAnswer.response;
  const afterAnswer = fixtures.endpoints.runSnapshotAfterAnswer.response;
  const receptionist = afterAnswer.actors.find(
    (actor: { actorId: string }) => actor.actorId === "NPC_Studio_Receptionist",
  );

  assert.equal(answer.judgment.stanceBefore, "uncertain");
  assert.equal(answer.judgment.stanceAfter, "vouch");
  assert.equal(answer.judgment.institutionalPressureDelta, 0);
  assert.equal(answer.proposalMeta.transport, "scripted");
  assert.equal(receptionist.memories.length, 2);
  const judgmentMemory = receptionist.memories.find(
    (memory: { kind: string }) => memory.kind === "player_conversation",
  );
  assert.equal(judgmentMemory.whyLine, answer.judgment.whyLine);
  assert.equal(afterAnswer.institutionalPressure, 0);
  assert.equal(afterAnswer.ledgerEvents.length, 0);
  assert.equal(fixtures.endpoints.runSnapshotAfterEnd.response.activeConversationId, null);
});

test("fixture replay covers every issued choice plus bounded free input", () => {
  const variants = fixtures.sessionAnswerVariants;
  assert.equal(variants.length, 4);
  const issuedChoiceIds = fixtures.endpoints.sessionStart.response.nextTurn.choices.map(
    (choice: { choiceId: string }) => choice.choiceId,
  );
  const replayedChoiceIds: string[] = [];
  let freeInputCount = 0;

  for (const variant of variants) {
    const request = runSessionAnswerRequestSchema.parse(variant.request);
    const response = runSessionAnswerResponseSchema.parse(variant.response);
    const sessionSnapshot = runSessionSnapshotResponseSchema.parse(
      variant.sessionSnapshotResponse,
    );
    const runSnapshot = runSnapshotSchema.parse(variant.runSnapshotResponse);
    const end = runSessionEndResponseSchema.parse(variant.endResponse);
    const endRunSnapshot = runSnapshotSchema.parse(variant.endRunSnapshotResponse);
    assert.equal(response.nextTurn, null);
    assert.equal(sessionSnapshot.actor.stance, response.actor.stance);
    assert.equal(runSnapshot.actors[0].stance, response.actor.stance);
    assert.equal(end.ended, true);
    assert.equal(endRunSnapshot.activeConversationId, null);
    if (request.answer.type === "choice") {
      replayedChoiceIds.push(request.answer.choiceId);
    } else {
      freeInputCount += 1;
      assert.ok(request.answer.text.length > 0 && request.answer.text.length <= 120);
    }
  }

  assert.deepEqual(replayedChoiceIds.sort(), issuedChoiceIds.sort());
  assert.equal(freeInputCount, 1);
});
