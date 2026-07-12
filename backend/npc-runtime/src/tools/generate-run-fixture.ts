import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStudioReceptionScriptedAdapter } from "../providers/testing/studio-reception-script.js";
import { conversationZoneFor, loadRunLayout } from "../runtime/run-layout.js";
import { RunService, STUDIO_RECEPTIONIST_ID } from "../runtime/run-service.js";
import type {
  RunAdvanceRequest,
  RunAdvanceResponse,
  RunNextTurn,
  RunSnapshot,
  RunSessionAnswer,
} from "../runtime/run-schema.js";

function fixtureIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-fixture-${++counts[prefix]}`;
}

function sortedArrivalBatch(response: RunAdvanceResponse) {
  return response.movementDeltas
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
    });
}

interface VariantSpec {
  variantId: string;
  answerFor: (turn: RunNextTurn) => RunSessionAnswer;
}

async function preloadAllResidents(service: RunService, runStartResponse: RunSnapshot) {
  const layout = loadRunLayout();
  const sessionPreloads = [];
  for (const actor of runStartResponse.actors) {
    const zone = conversationZoneFor(layout, actor.actorId, actor.locationId);
    if (!zone) throw new Error(`fixture actor has no conversation zone: ${actor.actorId}`);
    const request = {
      runId: runStartResponse.runId,
      actorId: actor.actorId,
      interactionZoneId: zone.zoneId,
      locale: "ko-KR" as const,
    };
    sessionPreloads.push({
      request,
      response: await service.preloadConversation(
        request.runId,
        request.actorId,
        request.interactionZoneId,
        request.locale,
      ),
    });
  }
  return sessionPreloads;
}

async function driveSpatialGoalVariants() {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const layout = loadRunLayout();
  const started = service.start("run-fixture-spatial-goals", "ko-KR");
  const actors = started.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    if (!position) throw new Error(`fixture actor has no anchor position: ${schedulerActor.actorId}`);
    const currentBlock = schedulerActor.currentBlock;
    const reachableAnchorRefs = currentBlock?.targetKind === "anchor"
      ? [currentBlock.targetId]
      : currentBlock?.targetKind === "route"
        ? [...new Set(layout.routes.find(route => route.routeId === currentBlock.targetId)?.points ?? [])]
        : [];
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]] as [number, number, number],
      reachableAnchorRefs,
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
    };
  });
  const advanceRequest: RunAdvanceRequest = {
    runId: started.runId,
    advanceId: `${started.runId}:spatial:000001`,
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      actors,
    },
  };
  const advanceResponse = await service.advance(advanceRequest);
  const goalWakes = advanceResponse.scheduleWakes.filter(wake => wake.kind === "goal");
  if (goalWakes.length !== 6) {
    throw new Error(`spatial goal fixture expected six wakes, got ${goalWakes.length}`);
  }
  const decisions = [];
  for (const wake of goalWakes) {
    const request = {
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    };
    const response = await service.decision(request);
    if (response.status !== "completed" || response.decisionKind !== "actor_goal") {
      throw new Error(`spatial goal fixture did not complete ${wake.wakeId}`);
    }
    decisions.push({
      variantId: `goal_${wake.actorIds[0]}`,
      request,
      response,
    });
  }
  return { advanceRequest, advanceResponse, decisions };
}

async function driveVariant(spec: VariantSpec) {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const runStartResponse = service.start("run-fixture-start-1", "ko-KR");
  const sessionPreloads = await preloadAllResidents(service, runStartResponse);
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
    sessionPreloads,
    sessionStartResponse,
    answerRequest,
    sessionAnswerResponse,
    sessionSnapshotResponse,
    runSnapshotAfterAnswerResponse,
    sessionEndResponse,
    runSnapshotAfterEndResponse,
  };
}

async function driveAdministrativeSequence() {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const layout = loadRunLayout();
  const started = service.start("run-fixture-administration", "ko-KR");
  await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  const answerRequest = {
    runId: started.runId,
    sessionId: conversation.sessionId,
    turnId: conversation.nextTurn.turnId,
    answer: { type: "choice" as const, choiceId: conversation.nextTurn.choices[2].choiceId },
  };
  const answerResponse = await service.answer(
    answerRequest.runId,
    answerRequest.sessionId,
    answerRequest.turnId,
    answerRequest.answer,
  );
  await service.endConversation(started.runId, conversation.sessionId);
  const beforeFacts = service.snapshot(started.runId);
  const actors = beforeFacts.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    if (!position) throw new Error(`administration fixture actor has no position: ${schedulerActor.actorId}`);
    const block = schedulerActor.currentBlock;
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]] as [number, number, number],
      reachableAnchorRefs: block?.targetKind === "anchor"
        ? [block.targetId]
        : [...new Set(layout.routes.find(route => route.routeId === block?.targetId)?.points ?? [])],
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
    };
  });
  const firstAdvanceRequest: RunAdvanceRequest = {
    runId: started.runId,
    advanceId: "fixture-admin-facts-1",
    observedWorldRevision: beforeFacts.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: beforeFacts.worldRevision, actors },
  };
  const firstAdvanceResponse = await service.advance(firstAdvanceRequest);
  for (const wake of firstAdvanceResponse.scheduleWakes.filter(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] !== STUDIO_RECEPTIONIST_ID,
  )) {
    await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
  }
  const writeWake = firstAdvanceResponse.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  if (!writeWake) throw new Error("administration fixture has no receptionist goal wake");
  const writeRequest = {
    runId: started.runId,
    wakeId: writeWake.wakeId,
    observedWorldRevision: writeWake.observedWorldRevision,
  };
  const writeResponse = await service.decision(writeRequest);
  const afterWrite = service.snapshot(started.runId);
  const secondAdvanceRequest: RunAdvanceRequest = {
    runId: started.runId,
    advanceId: "fixture-admin-facts-2",
    observedWorldRevision: afterWrite.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: afterWrite.worldRevision, actors },
  };
  const secondAdvanceResponse = await service.advance(secondAdvanceRequest);
  const readWake = secondAdvanceResponse.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  if (!readWake) throw new Error("administration fixture has no manager read wake");
  const readRequest = {
    runId: started.runId,
    wakeId: readWake.wakeId,
    observedWorldRevision: readWake.observedWorldRevision,
  };
  const readResponse = await service.decision(readRequest);
  const surface = layout.recordSurfaces.find(
    candidate => candidate.surfaceId === "TS_Studio_ReviewRecords",
  );
  if (!surface) throw new Error("administration fixture has no Studio record surface");
  const playerPosition = layout.anchorPositions[surface.anchorRef];
  if (!playerPosition) throw new Error("administration fixture surface has no position");
  const encounterRequest = {
    runId: started.runId,
    encounterId: "fixture-admin-encounter-1",
    encounter: {
      kind: "record_surface" as const,
      textSurfaceId: surface.surfaceId,
      playerPosition: [playerPosition[0], playerPosition[1], playerPosition[2]] as [number, number, number],
    },
  };
  const encounterResponse = await service.encounter(encounterRequest);
  return {
    answerRequest,
    answerResponse,
    firstAdvanceRequest,
    firstAdvanceResponse,
    writeRequest,
    writeResponse,
    secondAdvanceRequest,
    secondAdvanceResponse,
    readRequest,
    readResponse,
    encounterRequest,
    encounterResponse,
    finalSnapshot: service.snapshot(started.runId),
  };
}

async function driveAdvanceSequence() {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: fixtureIds(),
  });
  const runStartResponse = service.start("run-fixture-start-1", "ko-KR");
  await preloadAllResidents(service, runStartResponse);
  const preloadedRun = service.snapshot(runStartResponse.runId);
  const initialRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000001`,
    observedWorldRevision: preloadedRun.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const initialResponse = await service.advance(initialRequest);
  const routeRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000002`,
    observedWorldRevision: initialResponse.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const routeResponse = await service.advance(routeRequest);
  const routeRetryResponse = await service.advance(routeRequest);
  const arrivalRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:000003`,
    observedWorldRevision: routeResponse.worldRevision,
    elapsedSeconds: 0,
    arrivals: sortedArrivalBatch(routeResponse),
  };
  const arrivalResponse = await service.advance(arrivalRequest);
  const runSnapshotAfterAdvanceResponse = service.snapshot(runStartResponse.runId);
  const meetingReplaySteps: Array<{
    stepId: string;
    request: RunAdvanceRequest;
    response: RunAdvanceResponse;
  }> = [];
  let latestResponse = arrivalResponse;
  let sequence = 3;
  let clockStep = 0;
  let arrivalStep = 0;
  let meetingWake = latestResponse.scheduleWakes.find(wake => wake.kind === "meeting_ready");
  while (!meetingWake && meetingReplaySteps.length < 64) {
    const arrivals = sortedArrivalBatch(latestResponse);
    const isArrivalBatch = arrivals.length > 0;
    const request: RunAdvanceRequest = {
      runId: runStartResponse.runId,
      advanceId: `${runStartResponse.runId}:advance:${String(++sequence).padStart(6, "0")}`,
      observedWorldRevision: latestResponse.worldRevision,
      elapsedSeconds: isArrivalBatch ? 0 : 10,
      arrivals,
    };
    const response = await service.advance(request);
    meetingReplaySteps.push({
      stepId: isArrivalBatch
        ? `first_meeting_arrivals_${++arrivalStep}`
        : `first_meeting_clock_${++clockStep}`,
      request,
      response,
    });
    latestResponse = response;
    meetingWake = response.scheduleWakes.find(wake => wake.kind === "meeting_ready");
  }
  if (!meetingWake) throw new Error("run fixture did not reach the first meeting_ready wake");
  const meetingReadyStep = meetingReplaySteps.at(-1);
  if (!meetingReadyStep || meetingReadyStep.request.arrivals.length === 0) {
    throw new Error("first meeting_ready did not emerge from a confirmed arrival batch");
  }
  const npcDecisionRequest = {
    runId: runStartResponse.runId,
    wakeId: meetingWake.wakeId,
    observedWorldRevision: meetingWake.observedWorldRevision,
  };
  const npcDecisionResponse = await service.decision(npcDecisionRequest);
  if (npcDecisionResponse.status !== "completed") {
    throw new Error(`run fixture ambient decision did not complete: ${npcDecisionResponse.status}`);
  }
  const ambientDeliveryRequest = {
    runId: runStartResponse.runId,
    advanceId: `${runStartResponse.runId}:advance:${String(++sequence).padStart(6, "0")}`,
    observedWorldRevision: npcDecisionResponse.worldRevision,
    afterSpeechSeq: npcDecisionResponse.speechEvents.at(-1)?.seq ?? 0,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const ambientDeliveryResponse = await service.advance(ambientDeliveryRequest);
  const runSnapshotAfterMeetingResponse = service.snapshot(runStartResponse.runId);
  return {
    initialRequest,
    initialResponse,
    arrivalRequest,
    arrivalResponse,
    routeRequest,
    routeResponse,
    routeRetryResponse,
    runSnapshotAfterAdvanceResponse,
    meetingReplaySteps,
    npcDecisionRequest,
    npcDecisionResponse,
    ambientDeliveryRequest,
    ambientDeliveryResponse,
    runSnapshotAfterMeetingResponse,
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
  const spatialGoals = await driveSpatialGoalVariants();
  const administration = await driveAdministrativeSequence();

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
      npcDecision: {
        endpoint: "POST /v1/npc/decision",
        request: advancePath.npcDecisionRequest,
        response: advancePath.npcDecisionResponse,
      },
      runAdvanceSpatialFacts: {
        endpoint: "POST /v1/run/advance",
        request: spatialGoals.advanceRequest,
        response: spatialGoals.advanceResponse,
      },
      npcDecisionVariants: [
        {
          variantId: "meeting",
          request: advancePath.npcDecisionRequest,
          response: advancePath.npcDecisionResponse,
        },
        ...spatialGoals.decisions,
      ],
      runAdvanceAmbientSpeech: {
        endpoint: "POST /v1/run/advance",
        request: advancePath.ambientDeliveryRequest,
        response: advancePath.ambientDeliveryResponse,
      },
      runSnapshotAfterMeeting: {
        endpoint: "GET /v1/run/snapshot",
        request: { runId: defaultPath.runStartResponse.runId },
        response: advancePath.runSnapshotAfterMeetingResponse,
      },
      sessionPreloads: defaultPath.sessionPreloads.map(preload => ({
        endpoint: "POST /v1/session/preload",
        request: preload.request,
        response: preload.response,
      })),
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
      administrationWriteDecision: {
        endpoint: "POST /v1/npc/decision",
        request: administration.writeRequest,
        response: administration.writeResponse,
      },
      administrationReadDecision: {
        endpoint: "POST /v1/npc/decision",
        request: administration.readRequest,
        response: administration.readResponse,
      },
      administrationRecordEncounter: {
        endpoint: "POST /v1/run/encounter",
        request: administration.encounterRequest,
        response: administration.encounterResponse,
      },
      administrationFinalSnapshot: {
        endpoint: "GET /v1/run/snapshot",
        request: { runId: administration.finalSnapshot.runId },
        response: administration.finalSnapshot,
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
        stepId: "first_route_moves",
        endpoint: "POST /v1/run/advance",
        request: advancePath.routeRequest,
        response: advancePath.routeResponse,
      },
      {
        stepId: "initial_arrivals",
        endpoint: "POST /v1/run/advance",
        request: advancePath.arrivalRequest,
        response: advancePath.arrivalResponse,
      },
      ...advancePath.meetingReplaySteps.map(step => ({
        stepId: step.stepId,
        endpoint: "POST /v1/run/advance",
        request: step.request,
        response: step.response,
      })),
      {
        stepId: "first_meeting_speech_delivery",
        endpoint: "POST /v1/run/advance",
        request: advancePath.ambientDeliveryRequest,
        response: advancePath.ambientDeliveryResponse,
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
