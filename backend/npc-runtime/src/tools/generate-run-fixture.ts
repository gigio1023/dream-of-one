import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStudioReceptionScriptedAdapter } from "../providers/testing/studio-reception-script.js";
import { RunService, STUDIO_RECEPTIONIST_ID } from "../runtime/run-service.js";
import type { RunNextTurn, RunSessionAnswer } from "../runtime/run-schema.js";

function fixtureIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-fixture-${++counts[prefix]}`;
}

interface VariantSpec {
  variantId: string;
  answerFor: (turn: RunNextTurn) => RunSessionAnswer;
}

async function driveVariant(spec: VariantSpec) {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const runStartResponse = service.start("run-fixture-start-1", "ko-KR");
  const sessionStartResponse = await service.startConversation(
    runStartResponse.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  const answerRequest = {
    runId: runStartResponse.runId,
    sessionId: sessionStartResponse.sessionId,
    turnId: sessionStartResponse.nextTurn.turnId,
    answer: spec.answerFor(sessionStartResponse.nextTurn),
  };
  const sessionAnswerResponse = await service.answer(
    answerRequest.runId,
    answerRequest.sessionId,
    answerRequest.turnId,
    answerRequest.answer,
  );
  const sessionSnapshotResponse = service.sessionSnapshot(
    runStartResponse.runId,
    sessionStartResponse.sessionId,
  );
  const runSnapshotAfterAnswerResponse = service.snapshot(runStartResponse.runId);
  const sessionEndResponse = await service.endConversation(
    runStartResponse.runId,
    sessionStartResponse.sessionId,
  );
  const runSnapshotAfterEndResponse = service.snapshot(runStartResponse.runId);

  return {
    variantId: spec.variantId,
    runStartResponse,
    sessionStartResponse,
    answerRequest,
    sessionAnswerResponse,
    sessionSnapshotResponse,
    runSnapshotAfterAnswerResponse,
    sessionEndResponse,
    runSnapshotAfterEndResponse,
  };
}

async function driveAdvanceSequence() {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const runStartResponse = service.start("run-fixture-start-1", "ko-KR");
  const initialRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000001`,
    observedWorldRevision: runStartResponse.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const initialResponse = await service.advance(initialRequest);
  const arrivalRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000002`,
    observedWorldRevision: initialResponse.worldRevision,
    elapsedSeconds: 0,
    arrivals: initialResponse.movementDeltas
      .map(movement => ({
        movementId: movement.movementId,
        actorId: movement.actorId,
        anchorRef: movement.targetAnchorRef,
      }))
      .sort((first, second) => {
        const actorOrder = first.actorId.localeCompare(second.actorId);
        return actorOrder !== 0
          ? actorOrder
          : first.movementId.localeCompare(second.movementId);
      }),
  };
  const arrivalResponse = await service.advance(arrivalRequest);
  const routeRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000003`,
    observedWorldRevision: arrivalResponse.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const routeResponse = await service.advance(routeRequest);
  const routeRetryResponse = await service.advance(routeRequest);
  const runSnapshotAfterAdvanceResponse = service.snapshot(runStartResponse.runId);
  return {
    initialRequest,
    initialResponse,
    arrivalRequest,
    arrivalResponse,
    routeRequest,
    routeResponse,
    routeRetryResponse,
    runSnapshotAfterAdvanceResponse,
  };
}

export async function buildRunApiFixture() {
  const variants: VariantSpec[] = [
    ...([0, 1, 2] as const).map(choiceIndex => ({
      variantId: `choice_${choiceIndex + 1}`,
      answerFor: (turn: RunNextTurn): RunSessionAnswer => ({
        type: "choice",
        choiceId: turn.choices[choiceIndex].choiceId,
      }),
    })),
    {
      variantId: "free_input",
      answerFor: (): RunSessionAnswer => ({
        type: "free_input",
        text: "안내받은 절차를 확인하러 왔습니다.",
      }),
    },
  ];
  const driven = [];
  for (const variant of variants) driven.push(await driveVariant(variant));
  const defaultPath = driven[0];
  if (!defaultPath) throw new Error("run fixture has no default path");
  const advancePath = await driveAdvanceSequence();

  return {
    note: "Generated through the fixture-only Studio adapter and production RunService paths. Regenerate with `bun run --cwd backend/npc-runtime fixtures:run:generate`.",
    locale: "ko-KR",
    endpoints: {
      runStart: {
        endpoint: "POST /v1/run/start",
        request: { startId: "run-fixture-start-1", locale: "ko-KR" },
        response: defaultPath.runStartResponse,
      },
      runAdvanceInitial: {
        endpoint: "POST /v1/run/advance",
        request: advancePath.initialRequest,
        response: advancePath.initialResponse,
      },
      runAdvanceArrival: {
        endpoint: "POST /v1/run/advance",
        request: advancePath.arrivalRequest,
        response: advancePath.arrivalResponse,
      },
      runAdvanceRoute: {
        endpoint: "POST /v1/run/advance",
        request: advancePath.routeRequest,
        response: advancePath.routeResponse,
      },
      runAdvanceRouteRetry: {
        endpoint: "POST /v1/run/advance",
        request: advancePath.routeRequest,
        response: advancePath.routeRetryResponse,
      },
      runSnapshotAfterAdvance: {
        endpoint: "GET /v1/run/snapshot",
        request: { runId: defaultPath.runStartResponse.runId },
        response: advancePath.runSnapshotAfterAdvanceResponse,
      },
      sessionStart: {
        endpoint: "POST /v1/session/start",
        request: {
          runId: defaultPath.runStartResponse.runId,
          actorId: STUDIO_RECEPTIONIST_ID,
          interactionZoneId: "StudioReceptionConversation",
          locale: "ko-KR",
        },
        response: defaultPath.sessionStartResponse,
      },
      sessionAnswer: {
        endpoint: "POST /v1/session/answer",
        request: defaultPath.answerRequest,
        response: defaultPath.sessionAnswerResponse,
      },
      sessionSnapshot: {
        endpoint: "GET /v1/session/snapshot",
        request: {
          runId: defaultPath.runStartResponse.runId,
          sessionId: defaultPath.sessionStartResponse.sessionId,
        },
        response: defaultPath.sessionSnapshotResponse,
      },
      runSnapshotAfterAnswer: {
        endpoint: "GET /v1/run/snapshot",
        request: { runId: defaultPath.runStartResponse.runId },
        response: defaultPath.runSnapshotAfterAnswerResponse,
      },
      sessionEnd: {
        endpoint: "POST /v1/session/end",
        request: {
          runId: defaultPath.runStartResponse.runId,
          sessionId: defaultPath.sessionStartResponse.sessionId,
        },
        response: defaultPath.sessionEndResponse,
      },
      runSnapshotAfterEnd: {
        endpoint: "GET /v1/run/snapshot",
        request: { runId: defaultPath.runStartResponse.runId },
        response: defaultPath.runSnapshotAfterEndResponse,
      },
    },
    runAdvanceSequence: [
      {
        stepId: "initial_clock",
        endpoint: "POST /v1/run/advance",
        request: advancePath.initialRequest,
        response: advancePath.initialResponse,
      },
      {
        stepId: "initial_arrivals",
        endpoint: "POST /v1/run/advance",
        request: advancePath.arrivalRequest,
        response: advancePath.arrivalResponse,
      },
      {
        stepId: "first_route_moves",
        endpoint: "POST /v1/run/advance",
        request: advancePath.routeRequest,
        response: advancePath.routeResponse,
      },
    ],
    sessionAnswerVariants: driven.map(variant => ({
      variantId: variant.variantId,
      request: variant.answerRequest,
      response: variant.sessionAnswerResponse,
      sessionSnapshotResponse: variant.sessionSnapshotResponse,
      runSnapshotResponse: variant.runSnapshotAfterAnswerResponse,
      endResponse: variant.sessionEndResponse,
      endRunSnapshotResponse: variant.runSnapshotAfterEndResponse,
    })),
  };
}

const fixture = await buildRunApiFixture();
const toolsDir = dirname(fileURLToPath(import.meta.url));
const backendPath = resolve(
  toolsDir,
  "..",
  "..",
  "data",
  "fixtures",
  "run-api-examples.json",
);
const repoRoot = resolve(toolsDir, "..", "..", "..", "..");
const godotPath = resolve(repoRoot, "godot", "data", "fixtures", "run-api-examples.json");
const body = `${JSON.stringify(fixture, null, 2)}\n`;
writeFileSync(backendPath, body, "utf-8");
writeFileSync(godotPath, body, "utf-8");
console.log(`wrote ${backendPath}`);
console.log(`wrote ${godotPath}`);
