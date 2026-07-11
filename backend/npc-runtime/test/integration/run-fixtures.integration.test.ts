import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "bun:test";
import {
  runAdvanceRequestSchema,
  runAdvanceResponseSchema,
  runSessionAnswerRequestSchema,
  runSessionAnswerResponseSchema,
  runSessionEndRequestSchema,
  runSessionEndResponseSchema,
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
});

test("advance fixture replays initial moves, batched arrivals, and arrival-gated routes", () => {
  const sequence = fixtures.runAdvanceSequence;
  assert.deepEqual(
    sequence.map((step: { stepId: string }) => step.stepId),
    ["initial_clock", "initial_arrivals", "first_route_moves"],
  );
  for (const step of sequence) {
    runAdvanceRequestSchema.parse(step.request);
    runAdvanceResponseSchema.parse(step.response);
  }
  const initial = fixtures.endpoints.runAdvanceInitial.response;
  assert.deepEqual(
    initial.movementDeltas.map((movement: { actorId: string }) => movement.actorId),
    ["NPC_Studio_Receptionist", "NPC_Office_Worker", "NPC_Station_Officer"],
  );
  const arrival = fixtures.endpoints.runAdvanceArrival;
  assert.equal(arrival.request.arrivals.length, 3);
  assert.equal(arrival.response.arrivalsApplied.length, 3);
  const route = fixtures.endpoints.runAdvanceRoute.response;
  assert.deepEqual(
    route.movementDeltas.map((movement: { actorId: string; routePointIndex: number }) => [
      movement.actorId,
      movement.routePointIndex,
    ]),
    [
      ["NPC_Park_Caretaker", 1],
      ["NPC_Roaming_Liaison", 1],
    ],
  );
  assert.deepEqual(route, fixtures.endpoints.runAdvanceRouteRetry.response);
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
