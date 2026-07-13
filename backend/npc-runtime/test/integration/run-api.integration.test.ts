import assert from "node:assert/strict";
import { test } from "bun:test";
import { startSessionServer, type RunningSessionServer } from "../../src/api/http-server.js";
import { createSameOrderScriptedAdapter } from "../../src/providers/testing/same-order-script.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import { RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import { SessionService } from "../../src/runtime/session/service.js";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-http-${++counts[prefix]}`;
}

async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const running: RunningSessionServer = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: createSameOrderScriptedAdapter() }),
    runService: new RunService({
      proposalPort: createStudioReceptionScriptedAdapter(),
      idFactory: deterministicIds(),
    }),
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    await fn(base);
  } finally {
    await running.close();
  }
}

async function post(base: string, path: string, body: unknown): Promise<{ status: number; json: any }> {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function get(base: string, path: string): Promise<{ status: number; json: any }> {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, json: await response.json() };
}

async function groundRunConversation(
  base: string,
  runId: string,
  actorId: string,
  interactionZoneId: string,
  advanceId: string,
): Promise<void> {
  const snapshot = await get(base, `/v1/run/snapshot?runId=${encodeURIComponent(runId)}`);
  assert.equal(snapshot.status, 200, JSON.stringify(snapshot.json));
  const layout = loadRunLayout();
  const actor = snapshot.json.actors.find((candidate: { actorId: string }) => candidate.actorId === actorId);
  assert.ok(actor);
  const actors = snapshot.json.scheduler.actors.map((schedulerActor: any) => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    const target = schedulerActor.currentBlock;
    const reachableAnchorRefs = target?.targetKind === "anchor"
      ? [target.targetId]
      : target?.targetKind === "route"
        ? [...new Set(layout.routes.find(route => route.routeId === target.targetId)?.points ?? [])]
        : [];
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs,
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
      playerVisible: schedulerActor.actorId === actorId,
      playerAudible: schedulerActor.actorId === actorId,
      playerReachable: schedulerActor.actorId === actorId,
      playerInteractionZoneId: schedulerActor.actorId === actorId ? interactionZoneId : null,
    };
  });
  const grounded = actors.find((candidate: { actorId: string }) => candidate.actorId === actorId);
  assert.ok(grounded);
  const advanced = await post(base, "/v1/run/advance", {
    runId,
    advanceId,
    observedWorldRevision: snapshot.json.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.json.worldRevision,
      player: { position: grounded.position, locationId: actor.locationId },
      actors,
    },
  });
  assert.equal(advanced.status, 200, JSON.stringify(advanced.json));
}

test("run-bound Studio conversation and legacy session routes coexist on one sidecar", async () => {
  await withServer(async base => {
    const run = await post(base, "/v1/run/start", { startId: "api-run-1", locale: "ko-KR" });
    assert.equal(run.status, 200, JSON.stringify(run.json));
    assert.equal(run.json.actors.length, 6);
    assert.equal(run.json.lastProposalMeta, null);
    assert.equal(run.json.activeContact, null);

    const preloaded = await post(base, "/v1/session/preload", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(preloaded.status, 200, JSON.stringify(preloaded.json));
    assert.equal(preloaded.json.actor.playerConversationReady, true);
    assert.equal(preloaded.json.activeContact, null);
    const preloadRetry = await post(base, "/v1/session/preload", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.deepEqual(preloadRetry, preloaded);
    await groundRunConversation(
      base,
      run.json.runId,
      STUDIO_RECEPTIONIST_ID,
      "StudioReceptionConversation",
      "api-ground-run-1",
    );

    const started = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal(started.json.nextTurn.choices.length, 3);
    assert.equal(started.json.nextTurn.proposalMeta.transport, "scripted");
    assert.equal(started.json.activeContact, null);
    const startRetry = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.deepEqual(startRetry, started);

    const prematureEnd = await post(base, "/v1/session/end", {
      runId: run.json.runId,
      sessionId: started.json.sessionId,
    });
    assert.equal(prematureEnd.status, 409);
    assert.equal(prematureEnd.json.error, "session_still_active");

    const answerRequest = {
      runId: run.json.runId,
      sessionId: started.json.sessionId,
      turnId: started.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: started.json.nextTurn.choices[0].choiceId },
    };
    const answered = await post(base, "/v1/session/answer", answerRequest);
    const retried = await post(base, "/v1/session/answer", answerRequest);
    assert.equal(answered.status, 200, JSON.stringify(answered.json));
    assert.deepEqual(retried, answered);
    assert.equal(answered.json.actor.stance, "vouch");
    assert.equal(answered.json.nextTurn, null);

    const sessionSnapshot = await get(
      base,
      `/v1/session/snapshot?runId=${encodeURIComponent(run.json.runId)}&sessionId=${encodeURIComponent(started.json.sessionId)}`,
    );
    assert.equal(sessionSnapshot.status, 200, JSON.stringify(sessionSnapshot.json));
    assert.equal(sessionSnapshot.json.status, "awaiting_end");
    assert.equal(sessionSnapshot.json.lastMemory.whyLine, answered.json.judgment.whyLine);

    const runSnapshot = await get(base, `/v1/run/snapshot?runId=${encodeURIComponent(run.json.runId)}`);
    assert.equal(runSnapshot.status, 200, JSON.stringify(runSnapshot.json));
    assert.equal(runSnapshot.json.activeConversationId, started.json.sessionId);
    assert.equal(runSnapshot.json.actors[0].memories.length, 2);
    assert.equal(runSnapshot.json.institutionalPressure, 0);

    const endRequest = { runId: run.json.runId, sessionId: started.json.sessionId };
    const ended = await post(base, "/v1/session/end", endRequest);
    const endRetry = await post(base, "/v1/session/end", endRequest);
    assert.equal(ended.status, 200, JSON.stringify(ended.json));
    assert.deepEqual(endRetry, ended);

    const afterEnd = await get(base, `/v1/run/snapshot?runId=${encodeURIComponent(run.json.runId)}`);
    assert.equal(afterEnd.json.activeConversationId, null);
    assert.equal(afterEnd.json.actors[0].stance, "vouch");

    const legacy = await post(base, "/v1/session/start", {
      storyletId: "same-order",
      locale: "ko-KR",
    });
    assert.equal(legacy.status, 200, JSON.stringify(legacy.json));
    assert.equal(legacy.json.nextTurn.beatId, "routine");
  });
});

test("run API keeps strict request bounds and explicit error codes", async () => {
  await withServer(async base => {
    const malformed = await post(base, "/v1/run/start", { locale: "ko-KR", extra: true });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.json.error, "invalid_request");

    const run = await post(base, "/v1/run/start", { startId: "api-run-2", locale: "ko-KR" });
    const malformedSpatial = await post(base, "/v1/run/advance", {
      runId: run.json.runId,
      advanceId: "api-malformed-spatial",
      observedWorldRevision: run.json.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: run.json.worldRevision,
        actors: [],
      },
    });
    assert.equal(malformedSpatial.status, 400);
    assert.equal(malformedSpatial.json.error, "invalid_request");
    const layout = loadRunLayout();
    const surface = layout.recordSurfaces.find(candidate => candidate.surfaceId === "TS_Studio_ReviewRecords");
    assert.ok(surface);
    const position = layout.anchorPositions[surface.anchorRef];
    assert.ok(position);
    const encounterRequest = {
      runId: run.json.runId,
      encounterId: "api-record-surface-1",
      encounter: {
        kind: "record_surface",
        textSurfaceId: surface.surfaceId,
        playerPosition: [position[0], position[1], position[2]],
      },
    };
    const encounter = await post(base, "/v1/run/encounter", encounterRequest);
    const encounterRetry = await post(base, "/v1/run/encounter", encounterRequest);
    assert.equal(encounter.status, 200, JSON.stringify(encounter.json));
    assert.deepEqual(encounterRetry, encounter);
    const encounterConflict = await post(base, "/v1/run/encounter", {
      ...encounterRequest,
      encounter: { ...encounterRequest.encounter, playerPosition: [999, 0, 999] },
    });
    assert.equal(encounterConflict.status, 409);
    assert.equal(encounterConflict.json.error, "encounter_id_conflict");
    const mismatchedActorZone = await post(base, "/v1/session/preload", {
      runId: run.json.runId,
      actorId: "NPC_Office_Worker",
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(mismatchedActorZone.status, 400);
    assert.equal(mismatchedActorZone.json.error, "invalid_interaction");

    const wrongLocale = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "en-US",
    });
    assert.equal(wrongLocale.status, 400);
    assert.equal(wrongLocale.json.error, "invalid_locale");

    const invalidInteraction = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "ParkConversation",
      locale: "ko-KR",
    });
    assert.equal(invalidInteraction.status, 400);
    assert.equal(invalidInteraction.json.error, "invalid_interaction");

    const preload = await post(base, "/v1/session/preload", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(preload.status, 200, JSON.stringify(preload.json));
    await groundRunConversation(
      base,
      run.json.runId,
      STUDIO_RECEPTIONIST_ID,
      "StudioReceptionConversation",
      "api-ground-run-2",
    );
    const started = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    const tooLong = await post(base, "/v1/session/answer", {
      runId: run.json.runId,
      sessionId: started.json.sessionId,
      turnId: started.json.nextTurn.turnId,
      answer: { type: "free_input", text: "가".repeat(121) },
    });
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.json.error, "invalid_request");

    const missing = await get(base, "/v1/run/snapshot?runId=run-does-not-exist");
    assert.equal(missing.status, 404);
    assert.equal(missing.json.error, "run_not_found");
  });
});

test("run start and clock advance expose retry-safe HTTP conflicts", async () => {
  await withServer(async base => {
    const startRequest = { startId: "api-retry-start", locale: "ko-KR" };
    const started = await post(base, "/v1/run/start", startRequest);
    const startRetry = await post(base, "/v1/run/start", startRequest);
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.deepEqual(startRetry, started);
    const startConflict = await post(base, "/v1/run/start", {
      startId: startRequest.startId,
      locale: "en-US",
    });
    assert.equal(startConflict.status, 409);
    assert.equal(startConflict.json.error, "start_id_conflict");

    const invalidAdvance = await post(base, "/v1/run/advance", {
      runId: started.json.runId,
      advanceId: "http-empty",
      observedWorldRevision: 0,
      elapsedSeconds: 0,
      arrivals: [],
    });
    assert.equal(invalidAdvance.status, 400);
    assert.equal(invalidAdvance.json.error, "invalid_request");

    const advanceRequest = {
      runId: started.json.runId,
      advanceId: "http-advance-1",
      observedWorldRevision: 0,
      elapsedSeconds: 10,
      arrivals: [],
    };
    const advanced = await post(base, "/v1/run/advance", advanceRequest);
    const advanceRetry = await post(base, "/v1/run/advance", advanceRequest);
    assert.equal(advanced.status, 200, JSON.stringify(advanced.json));
    assert.deepEqual(advanceRetry, advanced);

    const advanceConflict = await post(base, "/v1/run/advance", {
      ...advanceRequest,
      elapsedSeconds: 9,
    });
    assert.equal(advanceConflict.status, 409);
    assert.equal(advanceConflict.json.error, "advance_id_conflict");
    const stale = await post(base, "/v1/run/advance", {
      ...advanceRequest,
      advanceId: "http-advance-stale",
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.error, "stale_world_revision");

    const layout = loadRunLayout();
    const propEvent = {
      eventId: "http-prop-event-1",
      propId: "Prop_Studio_Keyboard",
      action: "pick_up",
      playerPosition: [0, 0, 0],
      objectPosition: [0, 0.8, 0],
      observedWorldRevision: advanced.json.worldRevision,
      observers: layout.actors.map(actor => ({ actorId: actor.actorId, visible: true })),
    };
    const propAccepted = await post(base, "/v1/run/advance", {
      runId: started.json.runId,
      advanceId: "http-prop-advance-1",
      observedWorldRevision: advanced.json.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      propHandlingEvents: [propEvent],
    });
    assert.equal(propAccepted.status, 200, JSON.stringify(propAccepted.json));
    const propConflict = await post(base, "/v1/run/advance", {
      runId: started.json.runId,
      advanceId: "http-prop-advance-conflict",
      observedWorldRevision: propAccepted.json.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      propHandlingEvents: [{ ...propEvent, action: "throw" }],
    });
    assert.equal(propConflict.status, 409);
    assert.equal(propConflict.json.error, "prop_event_id_conflict");

    let latest = propAccepted.json;
    const firstMeetingMovements = new Map<string, {
      movementId: string;
      actorId: string;
      targetAnchorRef: string;
    }>();
    for (let step = 2; step <= 9; step += 1) {
      const next = await post(base, "/v1/run/advance", {
        runId: started.json.runId,
        advanceId: `http-meeting-clock-${step}`,
        observedWorldRevision: latest.worldRevision,
        elapsedSeconds: 10,
        arrivals: [],
      });
      assert.equal(next.status, 200, JSON.stringify(next.json));
      for (const movement of next.json.movementDeltas as Array<{
        movementId: string;
        actorId: string;
        targetAnchorRef: string;
      }>) {
        if (["NPC_Studio_Manager", "NPC_Park_Caretaker"].includes(movement.actorId)) {
          firstMeetingMovements.set(movement.actorId, movement);
        }
      }
      latest = next.json;
    }
    const meetingArrivals = [...firstMeetingMovements.values()]
      .map((movement: { movementId: string; actorId: string; targetAnchorRef: string }) => ({
        movementId: movement.movementId,
        actorId: movement.actorId,
        anchorRef: movement.targetAnchorRef,
      }));
    assert.equal(meetingArrivals.length, 2);
    const arrived = await post(base, "/v1/run/advance", {
      runId: started.json.runId,
      advanceId: "http-meeting-arrivals",
      observedWorldRevision: latest.worldRevision,
      elapsedSeconds: 0,
      arrivals: meetingArrivals,
    });
    assert.equal(arrived.status, 200, JSON.stringify(arrived.json));
    const meetingWake = arrived.json.scheduleWakes.find(
      (wake: { kind: string }) => wake.kind === "meeting_ready",
    );
    assert.ok(meetingWake);
    const decision = await post(base, "/v1/npc/decision", {
      runId: started.json.runId,
      wakeId: meetingWake.wakeId,
      observedWorldRevision: meetingWake.observedWorldRevision,
    });
    assert.equal(decision.status, 200, JSON.stringify(decision.json));
    assert.equal(decision.json.status, "completed");
    assert.equal(decision.json.speechEvents.length, 2);
  });
});
