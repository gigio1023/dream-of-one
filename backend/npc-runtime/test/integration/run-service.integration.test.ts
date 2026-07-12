import assert from "node:assert/strict";
import { test } from "bun:test";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { loadProviderConfig } from "../../src/providers/registry.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  appendProviderRuntimeTrace,
  MAX_PROVIDER_RUNTIME_TRACE_ENTRIES,
  PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M,
  RunError,
  RunService,
  STUDIO_RECEPTIONIST_ID,
} from "../../src/runtime/run-service.js";
import { runSnapshotSchema } from "../../src/runtime/run-schema.js";
import {
  groundOrdinaryConversation,
  runSpatialActors,
} from "./run-spatial-test-helpers.js";

const STUDIO_ZONE_ID = "StudioReceptionConversation";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-test-${++counts[prefix]}`;
}

async function preloadReceptionist(service: RunService, runId: string) {
  return service.preloadConversation(
    runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
}

test("run/start hydrates the shared town layout into six persistent uncertain actors", () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const snapshot = runSnapshotSchema.parse(service.start("run-test-start", "ko-KR"));

  assert.equal(snapshot.worldId, "m3r_first_person_town");
  assert.equal(snapshot.layoutRevision, "rev-first-person-town-v5");
  assert.equal(snapshot.worldRevision, 0);
  assert.equal(snapshot.worldClock.graceEndsAtSeconds, 90);
  assert.equal(snapshot.worldClock.hearingAtSeconds, 1800);
  assert.equal(snapshot.worldClock.paused, false);
  const providerConfig = loadProviderConfig();
  assert.equal(snapshot.providerBudget.callLimit, providerConfig.runtime.maxCallsPerSession);
  assert.equal(snapshot.providerBudget.tokenLimit, providerConfig.runtime.maxTokensPerSession);
  assert.equal(snapshot.actors.length, 6);
  assert.deepEqual(
    snapshot.actors.map(actor => actor.actorId),
    [
      "NPC_Studio_Receptionist",
      "NPC_Studio_Manager",
      "NPC_Office_Worker",
      "NPC_Park_Caretaker",
      "NPC_Station_Officer",
      "NPC_Roaming_Liaison",
    ],
  );
  assert.ok(snapshot.actors.every(actor => actor.stance === "uncertain"));
  assert.ok(snapshot.actors.every(actor => actor.memories.length === 0));
  assert.ok(snapshot.actors.every(actor => !actor.playerConversationReady));
  assert.equal(snapshot.scheduler.actors.length, 6);
  assert.ok(snapshot.scheduler.actors.every(actor => actor.currentBlock !== null));
  assert.ok(snapshot.scheduler.actors.every(actor => actor.pendingMovement === null));
});

test("all six residents preload and consume a conversation through their current actor-location zone", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-all-six", "ko-KR");
  const zones: Record<string, string> = {
    NPC_Studio_Receptionist: "StudioReceptionConversation",
    NPC_Studio_Manager: "StudioManagerConversation",
    NPC_Office_Worker: "OfficeConversation",
    NPC_Park_Caretaker: "ParkConversation",
    NPC_Station_Officer: "StationIntakeConversation",
    NPC_Roaming_Liaison: "ParkConversation",
  };

  await assert.rejects(
    service.preloadConversation(
      run.runId,
      "NPC_Office_Worker",
      "StudioReceptionConversation",
      "ko-KR",
    ),
    (error: unknown) => error instanceof RunError && error.code === "invalid_interaction",
  );
  for (const actor of run.actors) {
    const zone = zones[actor.actorId];
    assert.ok(zone);
    const preloaded = await service.preloadConversation(
      run.runId,
      actor.actorId,
      zone,
      "ko-KR",
    );
    assert.equal(preloaded.interactionZoneId, zone);
    assert.equal(preloaded.actor.actorId, actor.actorId);
    assert.equal(preloaded.actor.playerConversationReady, true);
  }
  assert.ok(service.snapshot(run.runId).actors.every(actor => actor.playerConversationReady));

  for (const [index, actor] of run.actors.entries()) {
    const zone = zones[actor.actorId];
    assert.ok(zone);
    await groundOrdinaryConversation(
      service,
      run.runId,
      actor.actorId,
      zone,
      `ground-all-six-${index}`,
    );
    const started = await service.startConversation(run.runId, actor.actorId, zone, "ko-KR");
    assert.equal(started.actor.actorId, actor.actorId);
    assert.ok(started.nextTurn.prompt.length > 0);
    const answered = await service.answer(
      run.runId,
      started.sessionId,
      started.nextTurn.turnId,
      { type: "choice", choiceId: started.nextTurn.choices[0].choiceId },
    );
    assert.equal(answered.nextTurn, null);
    const ended = await service.endConversation(run.runId, started.sessionId);
    assert.equal(ended.actor.actorId, actor.actorId);
    assert.equal(ended.actor.playerConversationReady, false);
  }
});

test("speculative opening stays cached until current spatial facts ground an ordinary start", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryOpening = adapter.proposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let openingVisibleActors: string[] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    openingVisibleActors = [...request.observePacket.visibleActors];
    return ordinaryOpening(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-grounded-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  assert.deepEqual(openingVisibleActors, [], "a speculative preload cannot invent a visible player");
  assert.equal(openingCalls, 1);

  const submitFacts = async (
    advanceId: string,
    playerPosition: [number, number, number],
    visible: boolean,
  ) => {
    const snapshot = service.snapshot(run.runId);
    const actors = runSpatialActors(snapshot);
    const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
    assert.ok(receptionist);
    receptionist.playerVisible = visible;
    receptionist.playerAudible = true;
    receptionist.playerReachable = true;
    receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
    await service.advance({
      runId: run.runId,
      advanceId,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: snapshot.worldRevision,
        player: { position: playerPosition, locationId: "Studio" },
        actors,
      },
    });
    return receptionist.position;
  };

  const initial = service.snapshot(run.runId);
  const initialFacts = runSpatialActors(initial).find(
    actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(initialFacts);
  await submitFacts(
    "grounded-start-remote",
    [initialFacts.position[0] + 10, initialFacts.position[1], initialFacts.position[2]],
    true,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  assert.equal(service.snapshot(run.runId).actors[0]?.playerConversationReady, true);

  const nearPosition = await submitFacts(
    "grounded-start-hidden",
    initialFacts.position,
    false,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  assert.equal(service.snapshot(run.runId).actors[0]?.playerConversationReady, true);

  await submitFacts("grounded-start-fresh", nearPosition, true);
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(openingCalls, 1, "failed spatial starts do not consume the speculative opening");
});

test("ordinary conversation center distance includes the ray-hit collider radius only", async () => {
  const layout = structuredClone(loadRunLayout());
  const zone = layout.conversationZones.find(candidate => candidate.zoneId === STUDIO_ZONE_ID);
  assert.ok(zone);
  zone.radius = 10;
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
    layout,
  });
  const run = service.start("run-conversation-center-distance", "ko-KR");
  await preloadReceptionist(service, run.runId);

  const submitAtCenterDistance = async (advanceId: string, distance: number) => {
    const snapshot = service.snapshot(run.runId);
    const actors = runSpatialActors(snapshot);
    const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
    assert.ok(receptionist);
    receptionist.playerVisible = true;
    receptionist.playerAudible = true;
    receptionist.playerReachable = true;
    receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
    await service.advance({
      runId: run.runId,
      advanceId,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: snapshot.worldRevision,
        player: {
          position: [
            receptionist.position[0] + distance,
            receptionist.position[1],
            receptionist.position[2],
          ],
          locationId: "Studio",
        },
        actors,
      },
    });
  };

  await submitAtCenterDistance(
    "conversation-center-distance-outside",
    PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M + 0.001,
  );
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );

  await submitAtCenterDistance(
    "conversation-center-distance-inside",
    PLAYER_CONVERSATION_MAX_CENTER_DISTANCE_M - 0.001,
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
});

test("an identical post-preload spatial observation rebases grounding without a world event", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryOpening = adapter.proposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let openingVisibleActors: string[] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    openingVisibleActors = [...request.observePacket.visibleActors];
    return ordinaryOpening(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-identical-spatial-rebase", "ko-KR");
  const actors = runSpatialActors(run);
  const receptionist = actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  receptionist.playerVisible = true;
  receptionist.playerAudible = true;
  receptionist.playerReachable = true;
  receptionist.playerInteractionZoneId = STUDIO_ZONE_ID;
  const spatialFacts = {
    player: { position: [...receptionist.position] as [number, number, number], locationId: "Studio" },
    actors,
  };
  await service.advance({
    runId: run.runId,
    advanceId: "identical-spatial-seed",
    observedWorldRevision: run.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: { observedWorldRevision: run.worldRevision, ...structuredClone(spatialFacts) },
  });
  await preloadReceptionist(service, run.runId);
  assert.deepEqual(openingVisibleActors, ["player"]);
  const beforeRefresh = service.snapshot(run.runId);

  const refreshed = await service.advance({
    runId: run.runId,
    advanceId: "identical-spatial-refresh",
    observedWorldRevision: beforeRefresh.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeRefresh.worldRevision,
      ...structuredClone(spatialFacts),
    },
  });
  assert.equal(refreshed.worldRevision, beforeRefresh.worldRevision);
  assert.equal(refreshed.clock.appliedElapsedSeconds, 0);
  assert.deepEqual(refreshed.scheduleWakes, []);

  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.actor.actorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(openingCalls, 1);
});

test("a Studio answer persists model judgment and stance once across idempotent retries", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let openingCalls = 0;
  let mergedCalls = 0;
  let mergedRequest: Parameters<typeof adapter.judgeAndProposeConversationTurn>[0] | undefined;
  adapter.proposeConversationTurn = async request => {
    openingCalls += 1;
    return originalOpening(request);
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    mergedCalls += 1;
    mergedRequest = request;
    return originalMerged(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-test-start", "ko-KR");
  const [preloaded, preloadRetry] = await Promise.all([
    preloadReceptionist(service, run.runId),
    preloadReceptionist(service, run.runId),
  ]);
  assert.deepEqual(preloadRetry, preloaded);
  assert.equal(openingCalls, 1, "concurrent preload retries share one provider call");
  assert.equal(preloaded.actor.playerConversationReady, true);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-idempotent-start",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(openingCalls, 1, "starting consumes the opening without a provider call");
  const startRetry = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.deepEqual(startRetry, started);
  assert.equal(started.actor.memories.length, 1);
  assert.equal(started.actor.memories[0].kind, "npc_utterance");
  if (started.actor.memories[0].kind === "npc_utterance") {
    assert.equal(started.actor.memories[0].line, started.nextTurn.prompt);
  }
  assert.equal(service.snapshot(run.runId).providerBudget.callsUsed, 0);
  assert.equal(service.snapshot(run.runId).worldClock.paused, true);

  const payload = { type: "choice" as const, choiceId: started.nextTurn.choices[0].choiceId };
  const answered = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, payload);
  const retried = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, payload);

  assert.deepEqual(retried, answered);
  assert.equal(mergedCalls, 1, "an answer retry must not call the provider or mutate twice");
  assert.equal(answered.worldRevision, 4);
  assert.equal(answered.judgment.stanceBefore, "uncertain");
  assert.equal(answered.judgment.stanceAfter, "vouch");
  assert.equal(answered.judgment.whyLine, "방문 이유를 접수 절차에 맞게 분명히 설명했습니다.");
  assert.equal(answered.nextTurn, null);
  assert.equal(answered.proposalMeta.transport, "scripted");
  assert.ok(mergedRequest);
  assert.deepEqual(mergedRequest.observePacket.visibleActors, ["player"]);
  assert.deepEqual(mergedRequest.conversationHistory, [
    {
      speakerId: STUDIO_RECEPTIONIST_ID,
      line: "접수를 도와드리겠습니다. 이곳에 오신 이유를 말씀해 주세요.",
    },
  ]);

  const snapshot = service.snapshot(run.runId);
  const receptionist = snapshot.actors.find(actor => actor.actorId === STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  assert.equal(receptionist.stance, "vouch");
  assert.equal(receptionist.hasMeaningfulFirsthandConversation, true);
  assert.equal(receptionist.memories.length, 2);
  const judgmentMemory = receptionist.memories.find(
    memory => memory.kind === "player_conversation",
  );
  assert.ok(judgmentMemory && judgmentMemory.kind === "player_conversation");
  assert.equal(judgmentMemory.whyLine, answered.judgment.whyLine);
  assert.deepEqual(judgmentMemory.proposalMeta, answered.proposalMeta);
  assert.ok(
    snapshot.actors
      .filter(actor => actor.actorId !== STUDIO_RECEPTIONIST_ID)
      .every(actor => actor.memories.length === 0 && actor.stance === "uncertain"),
  );

  await assert.rejects(
    service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
      type: "choice",
      choiceId: started.nextTurn.choices[1].choiceId,
    }),
    (error: unknown) => error instanceof RunError && error.code === "unexpected_turn",
  );
});

test("vouch provenance is clamped and speech cannot silently move institutional pressure", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "방문 이유를 말씀해 주세요.",
      suggestedReplies: [
        { text: "안내받아 왔습니다.", intent: "safe/local" },
        { text: "무엇을 확인하나요?", intent: "uncertain/repair" },
        { text: "말하지 않겠습니다.", intent: "risky/weird" },
      ],
      continueConversation: true,
    }),
    mergedTurn: () => ({
      suspicionDelta: 20,
      reportDelta: 50,
      signals: ["authority_evasion"],
      whyLine: "직접 답을 피해서 의문이 남았습니다.",
      stance: "vouch",
      meaningfulFirsthand: false,
      utterance: "지금은 판단을 보류하겠습니다.",
      suggestedReplies: [
        { text: "다시 설명하겠습니다.", intent: "safe/local" },
        { text: "어떤 답이 필요한가요?", intent: "uncertain/repair" },
        { text: "더 답하지 않겠습니다.", intent: "risky/weird" },
      ],
      continueConversation: false,
    }),
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-test-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-vouch-clamp",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const answered = await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
    type: "choice",
    choiceId: started.nextTurn.choices[0].choiceId,
  });

  assert.equal(answered.judgment.reportDelta, 50, "the model's private report inclination is preserved");
  assert.equal(answered.judgment.institutionalPressureDelta, 0);
  assert.equal(answered.judgment.reportPressureAfter, 0);
  assert.equal(answered.judgment.stanceAfter, "uncertain", "vouch needs meaningful firsthand provenance");
  assert.equal(answered.actor.hasMeaningfulFirsthandConversation, false);
  assert.equal(service.snapshot(run.runId).institutionalPressure, 0);
  assert.equal(service.snapshot(run.runId).ledgerEvents.length, 0);
});

test("a direct multi-turn conversation can visibly recover from oppose and high suspicion", async () => {
  let turn = 0;
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "방문 목적을 정확히 설명해 주세요.",
      suggestedReplies: [
        { text: "처음에는 사실을 숨겼습니다.", intent: "risky/weird" },
        { text: "어떤 부분부터 말할까요?", intent: "uncertain/repair" },
        { text: "지금부터 모두 설명하겠습니다.", intent: "safe/local" },
      ],
      continueConversation: true,
    }),
    mergedTurn: () => {
      turn += 1;
      return turn === 1
        ? {
            suspicionDelta: 90,
            reportDelta: 0,
            signals: ["authority_evasion"],
            whyLine: "처음 설명에서 중요한 사실을 숨겨 강하게 경계하게 됐습니다.",
            stance: "oppose",
            meaningfulFirsthand: true,
            openQuestion: null,
            utterance: "숨긴 사실이 무엇인지 지금 분명히 말해 주세요.",
            suggestedReplies: [
              { text: "두려워서 방문 경위를 숨겼습니다.", intent: "safe/local" },
              { text: "어떤 증거가 필요한가요?", intent: "uncertain/repair" },
              { text: "더는 답하지 않겠습니다.", intent: "risky/weird" },
            ],
            continueConversation: true,
          }
        : {
            suspicionDelta: -70,
            reportDelta: 0,
            signals: [],
            whyLine: "숨긴 이유와 방문 경위를 구체적으로 바로잡아 의심이 크게 줄었습니다.",
            stance: "vouch",
            meaningfulFirsthand: true,
            openQuestion: null,
            utterance: "이제 설명이 앞뒤가 맞습니다. 제가 직접 들은 내용으로 보증하겠습니다.",
            suggestedReplies: [
              { text: "고맙습니다.", intent: "safe/local" },
              { text: "더 확인할 것이 있나요?", intent: "uncertain/repair" },
              { text: "이제 가겠습니다.", intent: "risky/weird" },
            ],
            continueConversation: false,
          };
    },
    nextStep: () => ({ rationale: "후속 행동 없음", done: true }),
  });
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-direct-recovery", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-direct-recovery",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  const first = await service.answer(
    run.runId,
    started.sessionId,
    started.nextTurn.turnId,
    { type: "choice", choiceId: started.nextTurn.choices[0].choiceId },
  );
  assert.equal(first.actor.suspicion, 90);
  assert.equal(first.actor.stance, "oppose");
  assert.ok(first.nextTurn);
  const waryView = first.socialView.encounteredResidents.find(
    resident => resident.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(waryView);
  assert.equal(waryView.stance, "oppose");
  assert.equal(waryView.whyLine, first.judgment.whyLine);
  assert.equal("suspicion" in waryView, false, "numeric suspicion remains debug/internal");

  const second = await service.answer(
    run.runId,
    started.sessionId,
    first.nextTurn.turnId,
    { type: "choice", choiceId: first.nextTurn.choices[0].choiceId },
  );
  assert.equal(second.actor.suspicion, 20);
  assert.equal(second.actor.stance, "vouch");
  assert.ok(second.actor.suspicion < first.actor.suspicion);
  const recoveredView = second.socialView.encounteredResidents.find(
    resident => resident.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(recoveredView);
  assert.equal(recoveredView.stance, "vouch");
  assert.equal(recoveredView.whyLine, second.judgment.whyLine);
  assert.ok(recoveredView.stanceRevision > waryView.stanceRevision);
});

test("ending a child conversation is idempotent and leaves its run state alive", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-test-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-child-end",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  await assert.rejects(
    service.endConversation(run.runId, started.sessionId),
    (error: unknown) => error instanceof RunError && error.code === "session_still_active",
  );
  await service.answer(run.runId, started.sessionId, started.nextTurn.turnId, {
    type: "choice",
    choiceId: started.nextTurn.choices[0].choiceId,
  });
  const ended = await service.endConversation(run.runId, started.sessionId);
  const retried = await service.endConversation(run.runId, started.sessionId);

  assert.deepEqual(retried, ended);
  assert.equal(ended.worldRevision, 5);
  const snapshot = service.snapshot(run.runId);
  assert.equal(snapshot.activeConversationId, null);
  assert.equal(snapshot.worldClock.paused, false);
  assert.equal(snapshot.actors[0].stance, "vouch");
  assert.equal(snapshot.actors[0].memories.length, 2);
  assert.equal(service.sessionSnapshot(run.runId, started.sessionId).status, "ended");
  await assert.rejects(
    service.startConversation(run.runId, STUDIO_RECEPTIONIST_ID, STUDIO_ZONE_ID, "ko-KR"),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  await assert.rejects(
    preloadReceptionist(service, run.runId),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );

  let latest = await service.advance({
    runId: run.runId,
    advanceId: "unchanged-clock-1",
    observedWorldRevision: ended.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  await assert.rejects(
    preloadReceptionist(service, run.runId),
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  for (let step = 2; step <= 46; step += 1) {
    latest = await service.advance({
      runId: run.runId,
      advanceId: `changed-schedule-${step}`,
      observedWorldRevision: latest.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
  }
  const receptionistMove = latest.movementDeltas.find(
    movement => movement.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(receptionistMove);
  const arrived = await service.advance({
    runId: run.runId,
    advanceId: "changed-schedule-arrival",
    observedWorldRevision: latest.worldRevision,
    elapsedSeconds: 0,
    arrivals: [{
      movementId: receptionistMove.movementId,
      actorId: receptionistMove.actorId,
      anchorRef: receptionistMove.targetAnchorRef,
    }],
  });
  assert.ok(arrived.actorReadinessDeltas.some(
    delta => delta.actorId === STUDIO_RECEPTIONIST_ID && delta.reason === "preload_required",
  ));
  const changed = await service.preloadConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    "ParkConversation",
    "ko-KR",
  );
  assert.equal(changed.actor.locationId, "Park");
  assert.equal(changed.actor.playerConversationReady, true);
});

test("rule fallback stays in-fiction and reaches a bounded clean end", async () => {
  const service = new RunService({
    proposalPort: new RuleFallbackNpcAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-test-start", "ko-KR");
  await preloadReceptionist(service, run.runId);
  await groundOrdinaryConversation(
    service,
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ground-rule-fallback",
  );
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(started.nextTurn.proposalMeta.transport, "fallback");
  assert.doesNotMatch(started.nextTurn.prompt, /주문|상점/);

  let next = started.nextTurn;
  let lastAnswer;
  for (let index = 0; index < 3; index += 1) {
    lastAnswer = await service.answer(run.runId, started.sessionId, next.turnId, {
      type: "choice",
      choiceId: next.choices[0].choiceId,
    });
    assert.equal(lastAnswer.proposalMeta.transport, "fallback");
    assert.match(lastAnswer.judgment.whyLine, /[가-힣]/);
    if (lastAnswer.nextTurn) next = lastAnswer.nextTurn;
  }
  assert.ok(lastAnswer);
  assert.equal(lastAnswer.nextTurn, null, "the deterministic turn cap guarantees an ending");
});

test("runtime proposal trace truncates explicitly instead of hiding later metadata", async () => {
  const trace = {
    complete: true,
    truncated: false,
    droppedCount: 0,
    entries: [],
  } satisfies ReturnType<RunService["start"]>["providerRuntimeTrace"];
  let seq = 0;
  for (let index = 0; index < MAX_PROVIDER_RUNTIME_TRACE_ENTRIES + 2; index += 1) {
    seq = appendProviderRuntimeTrace(trace, seq, {
      profileId: "scripted/test",
      transport: "scripted",
      usedFallback: false,
    });
  }
  assert.equal(trace.entries.length, MAX_PROVIDER_RUNTIME_TRACE_ENTRIES);
  assert.equal(trace.entries[0]?.seq, 1);
  assert.equal(trace.entries.at(-1)?.seq, MAX_PROVIDER_RUNTIME_TRACE_ENTRIES);
  assert.equal(trace.droppedCount, 2);
  assert.equal(trace.truncated, true);
  assert.equal(trace.complete, false);
});
