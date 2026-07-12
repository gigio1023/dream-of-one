import assert from "node:assert/strict";
import { test } from "bun:test";
import type { AmbientReplyRequest } from "../../src/providers/ports.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  RunError,
  RunService,
} from "../../src/runtime/run-service.js";
import type {
  RunActorSpatialFacts,
  RunAdvanceResponse,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";

function deterministicIds(label: string) {
  const counters = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counters) => `${prefix}-${label}-${++counters[prefix]}`;
}

function spatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    const block = schedulerActor.currentBlock;
    const reachableAnchorRefs = block?.targetKind === "anchor"
      ? [block.targetId]
      : block?.targetKind === "route"
        ? [...new Set(layout.routes.find(route => route.routeId === block.targetId)?.points ?? [])]
        : [];
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs,
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

function pendingArrivals(snapshot: RunSnapshot) {
  return snapshot.scheduler.actors.flatMap(actor => actor.pendingMovement
    ? [{
        movementId: actor.pendingMovement.movementId,
        actorId: actor.actorId,
        anchorRef: actor.pendingMovement.targetAnchorRef,
      }]
    : []);
}

async function advanceToParkContactOpportunity(
  service: RunService,
  started: RunSnapshot,
  label: string,
): Promise<{ response: RunAdvanceResponse; actorId: string; playerPosition: [number, number, number] }> {
  let current = started;
  for (let step = 1; step <= 9; step += 1) {
    await service.advance({
      runId: started.runId,
      advanceId: `${label}-clock-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: pendingArrivals(current),
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }
  const arrivals = pendingArrivals(current);
  if (arrivals.length > 0) {
    await service.advance({
      runId: started.runId,
      advanceId: `${label}-settle-grace`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }

  const actorId = "NPC_Park_Caretaker";
  const actors = spatialActors(current);
  const actor = actors.find(candidate => candidate.actorId === actorId);
  assert.ok(actor);
  actor.playerVisible = true;
  actor.playerAudible = true;
  actor.playerReachable = true;
  actor.playerInteractionZoneId = "ParkConversation";
  const manager = actors.find(candidate => candidate.actorId === "NPC_Studio_Manager");
  assert.ok(manager);
  manager.playerVisible = true;
  manager.playerAudible = true;
  manager.playerReachable = true;
  manager.playerInteractionZoneId = "ParkConversation";
  const playerPosition: [number, number, number] = [0, 0, 0];
  const response = await service.advance({
    runId: started.runId,
    advanceId: `${label}-park-contact-facts`,
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: playerPosition, locationId: "Park" },
      actors,
    },
  });
  return { response, actorId, playerPosition };
}

test("one spatial batch dispatches all six stable residents through the same goal path", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const calledActorIds: string[] = [];
  const ambientReplyRequests: AmbientReplyRequest[] = [];
  const visibleObjectIdsByActor = new Map<string, string[]>();
  const original = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    calledActorIds.push(request.observePacket.actorId);
    visibleObjectIdsByActor.set(
      request.observePacket.actorId,
      request.observePacket.visibleObjects.map(object => object.objectId),
    );
    assert.ok(Array.isArray(request.observePacket.reachableAnchorRefs));
    return original(request);
  };
  const originalAmbientReply = adapter.judgeAndProposeAmbientReply.bind(adapter);
  adapter.judgeAndProposeAmbientReply = async request => {
    ambientReplyRequests.push(structuredClone(request));
    return originalAmbientReply(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds("six") });
  const started = service.start("spatial-six", "ko-KR");
  const initialActors = spatialActors(started);
  const initialReceptionist = initialActors.find(
    actor => actor.actorId === "NPC_Studio_Receptionist",
  );
  assert.ok(initialReceptionist);
  initialReceptionist.visibleObjectIds = ["Prop_Studio_Keyboard"];
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-1",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: initialActors,
    },
  });
  const goalWakes = advanced.scheduleWakes.filter(wake => wake.kind === "goal");
  assert.equal(goalWakes.length, 6);

  for (const wake of goalWakes) {
    const response = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.equal(response.status, "completed");
    assert.equal(response.decisionKind, "actor_goal");
    assert.deepEqual(response.actorIds, wake.actorIds);
  }
  assert.deepEqual(calledActorIds.sort(), started.actors.map(actor => actor.actorId).sort());
  assert.deepEqual(
    visibleObjectIdsByActor.get("NPC_Studio_Receptionist"),
    ["Prop_Studio_Keyboard"],
  );

  const current = service.snapshot(started.runId);
  const changedFacts = spatialActors(current);
  const receptionist = changedFacts.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  const manager = changedFacts.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(receptionist);
  assert.ok(manager);
  receptionist.visibleActorIds = [manager.actorId];
  receptionist.audibleActorIds = [manager.actorId];
  manager.visibleActorIds = [receptionist.actorId];
  manager.audibleActorIds = [receptionist.actorId];
  const social = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-social",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedFacts,
    },
  });
  const receptionistWake = social.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === receptionist.actorId,
  );
  assert.ok(receptionistWake);
  const spoken = await service.decision({
    runId: started.runId,
    wakeId: receptionistWake.wakeId,
    observedWorldRevision: receptionistWake.observedWorldRevision,
  });
  assert.equal(spoken.status, "completed", JSON.stringify(spoken));
  assert.equal(spoken.actionDeltas[0]?.kind, "speech", JSON.stringify(spoken));
  assert.equal(spoken.speechEvents.length, 2, "talk_to commits a bounded two-agent exchange");
  assert.equal(spoken.speechEvents[0]?.audibility.volumeId, "AUD_STUDIO");
  assert.equal(spoken.speechEvents[1]?.speakerActorId, manager.actorId);
  assert.equal(ambientReplyRequests.length, 1);
  assert.equal(ambientReplyRequests[0]?.listenerActorId, manager.actorId);
  assert.equal(ambientReplyRequests[0]?.targetActorId, receptionist.actorId);
  assert.equal(ambientReplyRequests[0]?.sourceSpeakerActorId, receptionist.actorId);
  assert.equal(ambientReplyRequests[0]?.sourceUtterance, spoken.speechEvents[0]?.line);
  assert.equal(
    calledActorIds.length,
    started.actors.length + 1,
    "the goal action and first utterance stay in one proposal before the single ambient reply call",
  );
  const callsAfterExchange = calledActorIds.length;
  const restamped = await service.advance({
    runId: started.runId,
    advanceId: "spatial-six-social-restamp",
    observedWorldRevision: spoken.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: spoken.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedFacts,
    },
  });
  assert.ok(
    restamped.scheduleWakes.every(
      wake =>
        wake.kind !== "goal" ||
        (wake.actorIds[0] !== receptionist.actorId && wake.actorIds[0] !== manager.actorId),
    ),
    "both exchange participants consume their counterpart's reply without a new provider wake",
  );
  assert.equal(calledActorIds.length, callsAfterExchange);
});

test("mismatched facts and stale goal results cannot mutate after a fresh material wake", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("stale"),
  });
  const started = service.start("spatial-stale", "ko-KR");
  const actors = spatialActors(started);
  const beforeInvalid = service.snapshot(started.runId);
  await assert.rejects(
    service.advance({
      runId: started.runId,
      advanceId: "spatial-invalid",
      observedWorldRevision: started.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: started.worldRevision + 1,
        player: { position: [8, 0.05, 5], locationId: "" },
        actors,
      },
    }),
    (error: unknown) => error instanceof RunError && error.code === "invalid_spatial_facts",
  );
  assert.deepEqual(service.snapshot(started.runId), beforeInvalid);

  const spatial = await service.advance({
    runId: started.runId,
    advanceId: "spatial-valid",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors,
    },
  });
  const oldWake = spatial.scheduleWakes.find(
    wake => wake.kind === "goal" && wake.actorIds[0] === "NPC_Park_Caretaker",
  );
  assert.ok(oldWake);
  const changedActors = actors.map(actor => structuredClone(actor));
  const changedCaretaker = changedActors.find(
    actor => actor.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(changedCaretaker);
  changedCaretaker.visibleActorIds = ["NPC_Roaming_Liaison"];
  const refreshed = await service.advance({
    runId: started.runId,
    advanceId: "spatial-changed",
    observedWorldRevision: spatial.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: spatial.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  const beforeStaleDecision = service.snapshot(started.runId);
  const stale = await service.decision({
    runId: started.runId,
    wakeId: oldWake.wakeId,
    observedWorldRevision: oldWake.observedWorldRevision,
  });
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.actionDeltas, []);
  assert.deepEqual(service.snapshot(started.runId).actors, beforeStaleDecision.actors);
  assert.equal(service.snapshot(started.runId).ambientSpeech.cursor, 0);
  assert.ok(
    refreshed.scheduleWakes.some(
      wake => wake.kind === "goal" && wake.actorIds[0] === oldWake.actorIds[0],
    ),
    "a changed material fact batch must emit the fresh actor goal before the old result arrives",
  );
});

test("visible reachable player facts outside a conversation zone stay valid but cannot open contact", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeNextStep = async () => ({
    proposal: {
      toolCall: { tool: "move_to", args: { targetId: "player" } },
      rationale: "방문자에게 직접 확인하려고 합니다.",
      done: true,
    },
    meta: { profileId: "scripted/studio-reception", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("invalid-contact"),
    layout: { ...loadRunLayout(), graceEndsAtSeconds: 0 },
  });
  const started = service.start("invalid-contact-start", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  assert.ok(receptionist);
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = null;
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "invalid-contact-facts",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, -13], locationId: "Studio" },
      actors,
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === receptionist.actorId
  );
  assert.ok(wake);
  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(response.activeContact, null);
  assert.equal(service.snapshot(started.runId).activeContact, null);
});

test("a valid player zone survives actor semantic-location lag without permitting early contact", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.proposeNextStep = async () => ({
    proposal: {
      toolCall: { tool: "move_to", args: { targetId: "player" } },
      rationale: "방문자에게 직접 확인하려고 합니다.",
      done: true,
    },
    meta: { profileId: "scripted/studio-reception", transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("contact-location-lag"),
    layout: { ...loadRunLayout(), graceEndsAtSeconds: 0 },
  });
  const started = service.start("contact-location-lag-start", "ko-KR");
  const actors = spatialActors(started);
  const receptionist = actors.find(actor => actor.actorId === "NPC_Studio_Receptionist");
  assert.ok(receptionist);
  receptionist.position = [0, 0, -9.5];
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = "ParkConversation";
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "contact-location-lag-facts",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, -9], locationId: "Park" },
      actors,
    },
  });
  const wake = advanced.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === receptionist.actorId
  );
  assert.ok(wake);
  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(response.activeContact, null);
  assert.equal(service.snapshot(started.runId).activeContact, null);
});

test("one post-grace provider candidate creates one idempotent player contact and reuses preload at safe distance", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  let openingCalls = 0;
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    return originalOpening(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("contact"),
  });
  const started = service.start("contact-start", "ko-KR");
  const opportunity = await advanceToParkContactOpportunity(service, started, "contact");
  assert.ok(opportunity.response.clock.toSeconds <= 120);
  const wake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  assert.ok(wake, JSON.stringify(opportunity.response.scheduleWakes));
  const nonCandidateWake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager"
  );
  assert.ok(nonCandidateWake);
  const nonCandidate = await service.decision({
    runId: started.runId,
    wakeId: nonCandidateWake.wakeId,
    observedWorldRevision: nonCandidateWake.observedWorldRevision,
  });
  assert.equal(nonCandidate.activeContact, null, "only the stable selected candidate sees the affordance");

  const decided = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  const retried = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.deepEqual(retried, decided);
  assert.equal(decided.activeContact?.actorId, opportunity.actorId);
  assert.equal(decided.activeContact?.interactionZoneId, "ParkConversation");
  assert.equal(decided.activeContact?.originAnchorRef.startsWith("Park."), true);
  const contact = decided.activeContact;
  assert.ok(contact);

  await service.preloadConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(openingCalls, 1);
  await assert.rejects(
    service.startConversation(
      started.runId,
      opportunity.actorId,
      "ParkConversation",
      "ko-KR",
      contact.contactId,
    ),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
    "the preloaded opening cannot bypass physical contact distance",
  );

  const beforeClose = service.snapshot(started.runId);
  const closeActors = spatialActors(beforeClose);
  const closeActor = closeActors.find(candidate => candidate.actorId === opportunity.actorId);
  assert.ok(closeActor);
  closeActor.position = [...opportunity.playerPosition];
  closeActor.playerVisible = true;
  closeActor.playerAudible = false;
  closeActor.playerReachable = true;
  closeActor.playerInteractionZoneId = "ParkConversation";
  await service.advance({
    runId: started.runId,
    advanceId: "contact-close-distance",
    observedWorldRevision: beforeClose.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeClose.worldRevision,
      player: { position: opportunity.playerPosition, locationId: "Park" },
      actors: closeActors,
    },
  });
  await assert.rejects(
    service.startConversation(
      started.runId,
      opportunity.actorId,
      "ParkConversation",
      "ko-KR",
      contact.contactId,
    ),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
    "a contact lease cannot start speech from fresh but inaudible facts",
  );
  const beforeAudible = service.snapshot(started.runId);
  const audibleActors = structuredClone(closeActors);
  const audibleActor = audibleActors.find(candidate => candidate.actorId === opportunity.actorId);
  assert.ok(audibleActor);
  audibleActor.playerAudible = true;
  await service.advance({
    runId: started.runId,
    advanceId: "contact-audible-distance",
    observedWorldRevision: beforeAudible.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeAudible.worldRevision,
      player: { position: opportunity.playerPosition, locationId: "Park" },
      actors: audibleActors,
    },
  });
  const conversation = await service.startConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
    contact.contactId,
  );
  const startRetry = await service.startConversation(
    started.runId,
    opportunity.actorId,
    "ParkConversation",
    "ko-KR",
    contact.contactId,
  );
  assert.deepEqual(startRetry, conversation);
  assert.equal(conversation.activeContact, null);
  assert.equal(openingCalls, 1, "session start consumes the existing opening without a second call");
});

test("active contact holds one actor across a schedule boundary and repairs policy movement after one expiry", async () => {
  const layout = { ...loadRunLayout(), graceEndsAtSeconds: 80 };
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("contact-hold"),
    layout,
  });
  const started = service.start("contact-hold-start", "ko-KR");
  const seeded = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const olderCaretakerWake = seeded.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Park_Caretaker"
  );
  assert.ok(olderCaretakerWake);

  let current = service.snapshot(started.runId);
  for (let step = 1; step <= 8; step += 1) {
    await service.advance({
      runId: started.runId,
      advanceId: `contact-hold-clock-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: pendingArrivals(current),
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }
  const arrivals = pendingArrivals(current);
  if (arrivals.length > 0) {
    await service.advance({
      runId: started.runId,
      advanceId: "contact-hold-settle",
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 0,
      arrivals,
      spatialFacts: {
        observedWorldRevision: current.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(current),
      },
    });
    current = service.snapshot(started.runId);
  }

  const contactActors = spatialActors(current);
  const caretakerFacts = contactActors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.ok(caretakerFacts);
  caretakerFacts.playerVisible = true;
  caretakerFacts.playerAudible = true;
  caretakerFacts.playerReachable = true;
  caretakerFacts.playerInteractionZoneId = "ParkConversation";
  const opportunity = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-opportunity",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [0, 0, 0], locationId: "Park" },
      actors: contactActors,
    },
  });
  const contactWake = opportunity.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Park_Caretaker"
  );
  assert.ok(contactWake);
  const contacted = await service.decision({
    runId: started.runId,
    wakeId: contactWake.wakeId,
    observedWorldRevision: contactWake.observedWorldRevision,
  });
  assert.equal(contacted.activeContact?.actorId, "NPC_Park_Caretaker");

  const conflicting = await service.decision({
    runId: started.runId,
    wakeId: olderCaretakerWake.wakeId,
    observedWorldRevision: olderCaretakerWake.observedWorldRevision,
  });
  assert.equal(conflicting.status, "stale");
  assert.deepEqual(conflicting.actionDeltas, []);
  assert.deepEqual(conflicting.movementDeltas, []);

  current = service.snapshot(started.runId);
  const boundary = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-boundary",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(boundary.clock.toSeconds, 90);
  assert.equal(boundary.activeContact?.actorId, "NPC_Park_Caretaker");
  assert.ok(boundary.movementDeltas.every(delta => delta.actorId !== "NPC_Park_Caretaker"));
  assert.ok(boundary.scheduleWakes.every(wake =>
    wake.kind !== "goal" || wake.actorIds[0] !== "NPC_Park_Caretaker"
  ));

  current = service.snapshot(started.runId);
  await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-before-expiry",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  current = service.snapshot(started.runId);
  const expiryRequest = {
    runId: started.runId,
    advanceId: "contact-hold-expiry",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  };
  const expired = await service.advance(expiryRequest);
  const expiryRetry = await service.advance(expiryRequest);
  assert.deepEqual(expiryRetry, expired);
  assert.equal(expired.activeContact, null);
  const afterExpiry = service.snapshot(started.runId);
  const caretaker = afterExpiry.actors.find(actor => actor.actorId === "NPC_Park_Caretaker");
  assert.equal(
    caretaker?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );

  const repaired = await service.advance({
    runId: started.runId,
    advanceId: "contact-hold-repair",
    observedWorldRevision: afterExpiry.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  assert.ok(repaired.movementDeltas.some(delta => delta.actorId === "NPC_Park_Caretaker"));
  assert.equal(
    service.snapshot(started.runId).actors
      .find(actor => actor.actorId === "NPC_Park_Caretaker")
      ?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );
});

test("an unengaged contact expires once into attributable factual memory without judgment movement", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds("contact-timeout"),
  });
  const started = service.start("contact-timeout-start", "ko-KR");
  const opportunity = await advanceToParkContactOpportunity(
    service,
    started,
    "contact-timeout",
  );
  const wake = opportunity.response.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  assert.ok(wake);
  const decided = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.ok(decided.activeContact);
  const before = service.snapshot(started.runId);
  const beforeActor = before.actors.find(actor => actor.actorId === opportunity.actorId);
  assert.ok(beforeActor);

  let current = before;
  let lastRequest: Parameters<RunService["advance"]>[0] | null = null;
  for (let step = 1; step <= 3; step += 1) {
    lastRequest = {
      runId: started.runId,
      advanceId: `contact-timeout-expire-${step}`,
      observedWorldRevision: current.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    };
    await service.advance(lastRequest);
    current = service.snapshot(started.runId);
  }
  assert.equal(current.activeContact, null);
  const afterActor = current.actors.find(actor => actor.actorId === opportunity.actorId);
  assert.ok(afterActor);
  const outcomes = afterActor.memories.filter(memory => memory.kind === "player_contact_outcome");
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0]?.sourceActorId, "player");
  assert.equal(outcomes[0]?.listenerActorId, opportunity.actorId);
  assert.equal(outcomes[0]?.outcome, "not_engaged");
  assert.equal(afterActor.stance, beforeActor.stance);
  assert.equal(afterActor.suspicion, beforeActor.suspicion);
  assert.equal(current.institutionalPressure, before.institutionalPressure);
  assert.ok(lastRequest);
  const retry = await service.advance(lastRequest);
  assert.equal(retry.activeContact, null);
  const afterRetry = service.snapshot(started.runId).actors.find(
    actor => actor.actorId === opportunity.actorId,
  );
  assert.equal(
    afterRetry?.memories.filter(memory => memory.kind === "player_contact_outcome").length,
    1,
  );
  const cooled = await service.advance({
    runId: started.runId,
    advanceId: "contact-timeout-cooldown",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 1,
    arrivals: [],
  });
  const followUp = cooled.scheduleWakes.find(candidate =>
    candidate.kind === "goal" && candidate.actorIds[0] === opportunity.actorId
  );
  if (followUp) {
    const result = await service.decision({
      runId: started.runId,
      wakeId: followUp.wakeId,
      observedWorldRevision: followUp.observedWorldRevision,
    });
    assert.equal(result.activeContact, null, "cooldown forbids an immediate second approach");
  }
});
