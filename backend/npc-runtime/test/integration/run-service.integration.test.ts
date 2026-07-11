import assert from "node:assert/strict";
import { test } from "bun:test";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { loadProviderConfig } from "../../src/providers/registry.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import { runSnapshotSchema } from "../../src/runtime/run-schema.js";

const STUDIO_ZONE_ID = "StudioReceptionConversation";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-test-${++counts[prefix]}`;
}

test("run/start hydrates the shared town layout into six persistent uncertain actors", () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const snapshot = runSnapshotSchema.parse(service.start("run-test-start", "ko-KR"));

  assert.equal(snapshot.worldId, "m3r_first_person_town");
  assert.equal(snapshot.layoutRevision, "rev-first-person-town-v2");
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
  assert.equal(snapshot.actors[0].playerConversationReady, true);
  assert.ok(snapshot.actors.slice(1).every(actor => !actor.playerConversationReady));
  assert.equal(snapshot.scheduler.actors.length, 6);
  assert.ok(snapshot.scheduler.actors.every(actor => actor.currentBlock !== null));
  assert.ok(snapshot.scheduler.actors.every(actor => actor.pendingMovement === null));
});

test("a Studio answer persists model judgment and stance once across idempotent retries", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let mergedCalls = 0;
  let mergedRequest: Parameters<typeof adapter.judgeAndProposeConversationTurn>[0] | undefined;
  adapter.judgeAndProposeConversationTurn = async request => {
    mergedCalls += 1;
    mergedRequest = request;
    return originalMerged(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const run = service.start("run-test-start", "ko-KR");
  const started = await service.startConversation(
    run.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
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
  assert.equal(answered.worldRevision, 2);
  assert.equal(answered.judgment.stanceBefore, "uncertain");
  assert.equal(answered.judgment.stanceAfter, "vouch");
  assert.equal(answered.judgment.whyLine, "방문 이유를 접수 절차에 맞게 분명히 설명했습니다.");
  assert.equal(answered.nextTurn, null);
  assert.equal(answered.proposalMeta.transport, "scripted");
  assert.ok(mergedRequest);
  assert.deepEqual(mergedRequest.observePacket.visibleActors, []);
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

test("ending a child conversation is idempotent and leaves its run state alive", async () => {
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-test-start", "ko-KR");
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
  assert.equal(ended.worldRevision, 3);
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
});

test("rule fallback stays in-fiction and reaches a bounded clean end", async () => {
  const service = new RunService({
    proposalPort: new RuleFallbackNpcAdapter(),
    idFactory: deterministicIds(),
  });
  const run = service.start("run-test-start", "ko-KR");
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
