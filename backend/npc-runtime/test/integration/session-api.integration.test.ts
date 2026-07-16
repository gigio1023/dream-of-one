import assert from "node:assert/strict";
import { test } from "bun:test";
import { startSessionServer, type RunningSessionServer } from "../../src/api/http-server.js";
import { SessionService } from "../../src/runtime/session/service.js";
import { createSameOrderScriptedAdapter } from "../../src/providers/testing/same-order-script.js";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import { ProviderFailureError } from "../../src/providers/ports.js";

type Answer = { type: "choice" | "free_input" | "hesitation"; choiceId?: string; text?: string };

async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const running: RunningSessionServer = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: createSameOrderScriptedAdapter() }),
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    await fn(base);
  } finally {
    await running.close();
  }
}

async function post(base: string, path: string, body: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function get(base: string, path: string): Promise<{ status: number; json: any }> {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, json: await res.json() };
}

async function driveRoute(base: string, answers: Answer[]): Promise<any> {
  const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
  assert.equal(start.status, 200, JSON.stringify(start.json));
  const sessionId = start.json.sessionId as string;
  let next = start.json.nextTurn;
  for (const answer of answers) {
    assert.ok(next, "expected a next turn to answer");
    const res = await post(base, "/v1/session/answer", { sessionId, turnId: next.turnId, answer });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    next = res.json.nextTurn;
  }
  const end = await post(base, "/v1/session/end", { sessionId });
  assert.equal(end.status, 200, JSON.stringify(end.json));
  return end.json;
}

test("legacy session provider failure leaves no partial start or answer mutation", async () => {
  const failedOpeningAdapter = createSameOrderScriptedAdapter();
  failedOpeningAdapter.proposeConversationTurn = async () => {
    throw new ProviderFailureError(
      failedOpeningAdapter.profileId,
      "unavailable",
      "conversation",
    );
  };
  const failedOpeningService = new SessionService({ proposalPort: failedOpeningAdapter });
  await assert.rejects(
    failedOpeningService.start("same-order", "ko-KR"),
    (error: unknown) =>
      error instanceof ProviderFailureError && error.reason === "unavailable",
  );
  assert.equal(
    (Reflect.get(failedOpeningService, "sessions") as Map<unknown, unknown>).size,
    0,
  );

  const adapter = createSameOrderScriptedAdapter();
  const originalAnswer = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let failAnswer = true;
  adapter.judgeAndProposeConversationTurn = async request => {
    if (failAnswer) {
      throw new ProviderFailureError(adapter.profileId, "timeout", "conversation_turn");
    }
    return originalAnswer(request);
  };
  const service = new SessionService({ proposalPort: adapter });
  const started = await service.start("same-order", "ko-KR");
  const before = service.snapshot(started.sessionId);
  const answer = {
    type: "choice" as const,
    choiceId: started.nextTurn.choices[0]?.choiceId,
  };
  await assert.rejects(
    service.answer(started.sessionId, started.nextTurn.turnId, answer),
    (error: unknown) => error instanceof ProviderFailureError && error.reason === "timeout",
  );
  assert.deepEqual(service.snapshot(started.sessionId), before);

  failAnswer = false;
  const answered = await service.answer(started.sessionId, started.nextTurn.turnId, answer);
  assert.ok(answered.whyLines[0]);
});

test("all four routes are drivable purely through the Session API", async () => {
  await withServer(async base => {
    const clean = await driveRoute(base, [
      { type: "choice", choiceId: "routine.generated.1" },
      { type: "choice", choiceId: "probe.generated.1" },
    ]);
    assert.equal(clean.route, "clean_cover");
    assert.equal(clean.outcomePanel.title, "무사 통과");

    const repair = await driveRoute(base, [
      { type: "choice", choiceId: "routine.generated.2" },
      { type: "choice", choiceId: "probe.generated.2" },
    ]);
    assert.equal(repair.route, "repair_recovery");

    const soft = await driveRoute(base, [
      { type: "choice", choiceId: "routine.generated.3" },
      { type: "choice", choiceId: "probe.generated.3" },
    ]);
    assert.equal(soft.route, "soft_report");

    const inquest = await driveRoute(base, [
      { type: "choice", choiceId: "routine.generated.3" },
      { type: "free_input", text: "저는 이 꿈에 방금 들어왔어요." },
      { type: "choice", choiceId: "reconciliation.generated.3" },
    ]);
    assert.equal(inquest.route, "hard_inquest");
    // The inquest outcome cites an exact Store ledger chain.
    assert.ok(inquest.outcomePanel.citedLedgerIds.length >= 3, "inquest should cite the store->station chain");
  });
});

test("session/start returns a validated world snapshot with five economy values", async () => {
  await withServer(async base => {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    assert.equal(start.status, 200);
    const econ = start.json.worldSnapshot.civicEconomy;
    assert.deepEqual(Object.keys(econ).sort(), [
      "accountCredit",
      "favor",
      "localTrust",
      "recordBurden",
      "stationAttention",
    ]);
    assert.equal(start.json.ledgerEvents.length, 0);
    assert.equal(start.json.nextTurn.beatId, "routine");
    assert.equal(start.json.nextTurn.proposalMeta.transport, "scripted");
  });
});

test("answer surfaces the provider-authored why-line and a suspicion delta", async () => {
  await withServer(async base => {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const sessionId = start.json.sessionId;
    const res = await post(base, "/v1/session/answer", {
      sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.3" },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.signals, ["local_routine_mismatch"]);
    assert.ok(res.json.whyLines[0].length > 0);
    assert.equal(
      res.json.whyLines[0],
      "The line contradicted the local routine the NPC assumed.",
    );
    assert.ok(res.json.suspicionDelta > 0);
  });
});

test("npc/decision runs through the injected proposal port with transcript deltas", async () => {
  await withServer(async base => {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const decision = await post(base, "/v1/npc/decision", { sessionId: start.json.sessionId, beat: 1 });
    assert.equal(decision.status, 200, JSON.stringify(decision.json));
    assert.ok(decision.json.npcActions.length >= 1);
    assert.ok(decision.json.transcriptDeltas.length >= 1);
  });
});

test("Session API exposes a blocked tool result followed by a provider re-plan", async () => {
  const previousResults: Array<boolean | undefined> = [];
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "오늘도 같은 걸로 드릴까요?",
      suggestedReplies: [
        { text: "네, 같은 걸로 부탁해요.", intent: "safe/local" },
        { text: "제가 보통 뭘 시켰죠?", intent: "uncertain/repair" },
        { text: "오늘 처음 왔는데요.", intent: "risky/weird" },
      ],
      continueConversation: true,
    }),
    nextStep: request => {
      previousResults.push(request.previousResult?.ok);
      if (request.iteration === 0) {
        return {
          toolCall: { tool: "look", args: { targetId: "missing_counter" } },
          rationale: "Check the assumed counter.",
          done: false,
        };
      }
      if (request.iteration === 1) {
        return {
          toolCall: { tool: "look", args: { targetId: "store_counter" } },
          rationale: "Use the visible counter after the failure.",
          done: false,
        };
      }
      return { rationale: "Re-plan complete.", done: true };
    },
  });
  const service = new SessionService({ proposalPort: adapter });
  const running = await startSessionServer({
    logListen: false,
    service,
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const answer = await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.1" },
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    // Agent-loop beats no longer delay the answer; drain the aftermath queue.
    await service.awaitIdle(start.json.sessionId);
    const aftermath = service.takeLastAftermath(start.json.sessionId);
    assert.ok(aftermath);
    assert.equal(aftermath.transcriptDeltas[0].validation.reason, "not_visible");
    assert.equal(aftermath.transcriptDeltas[1].validation.ok, true);
    assert.deepEqual(previousResults.slice(0, 2), [undefined, false]);
  } finally {
    await running.close();
  }
});

test("legacy session/end waits for delayed answer aftermath before freezing the result", async () => {
  let markAftermathStarted!: () => void;
  const aftermathStarted = new Promise<void>(resolve => {
    markAftermathStarted = resolve;
  });
  let releaseAftermath!: () => void;
  const aftermathReleased = new Promise<void>(resolve => {
    releaseAftermath = resolve;
  });

  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "평소 주문으로 마칠까요?",
      suggestedReplies: [
        { text: "네, 같은 걸로 부탁해요.", intent: "safe/local" },
        { text: "제가 보통 뭘 시켰죠?", intent: "uncertain/repair" },
        { text: "오늘 처음 왔는데요.", intent: "risky/weird" },
      ],
      continueConversation: false,
    }),
    nextStep: async request => {
      if (request.iteration === 0) {
        markAftermathStarted();
        await aftermathReleased;
        return {
          toolCall: {
            tool: "use_object",
            args: {
              objectId: "usual_order_cue",
              toState: "cited",
              ledgerKind: "usual_order_cited",
              whyLine: "점원이 보이는 평소 주문 표식을 확인했습니다.",
            },
          },
          rationale: "Confirm the visible routine before closing service.",
          done: false,
        };
      }
      return { rationale: "The routine is confirmed.", done: true };
    },
  });

  let markEndCalled!: () => void;
  const endCalled = new Promise<void>(resolve => {
    markEndCalled = resolve;
  });
  class EndObservedSessionService extends SessionService {
    override end(sessionId: string) {
      markEndCalled();
      return super.end(sessionId);
    }
  }

  const service = new EndObservedSessionService({ proposalPort: adapter });
  const running = await startSessionServer({ logListen: false, service });
  const base = `http://${running.host}:${running.port}`;
  try {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const answer = await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.1" },
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    await aftermathStarted;

    const endPromise = post(base, "/v1/session/end", { sessionId: start.json.sessionId });
    await endCalled;
    releaseAftermath();

    const ended = await endPromise;
    assert.equal(ended.status, 200, JSON.stringify(ended.json));
    assert.equal(ended.json.route, "clean_cover");
    assert.equal(ended.json.outcomePanel.body, "평소 순서대로 응대가 끝났습니다.");
    assert.equal(ended.json.outcomePanel.citedLedgerIds.length, 1);
    assert.equal(ended.json.telemetrySummary.ledgerEventCount, 1);
    assert.equal(ended.json.telemetrySummary.providerProfile, "scripted/test");
    assert.equal(ended.json.telemetrySummary.fallbackCount, 0);

    const retry = await post(base, "/v1/session/end", { sessionId: start.json.sessionId });
    assert.deepEqual(retry, ended);
  } finally {
    releaseAftermath();
    await running.close();
  }
});

test("an over-eager model judgment is clamped by the per-turn validity cap", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "오늘도 같은 걸로 드릴까요?",
      suggestedReplies: [
        { text: "네, 같은 걸로 부탁해요.", intent: "safe/local" },
        { text: "제가 보통 뭘 시켰죠?", intent: "uncertain/repair" },
        { text: "오늘 처음 왔는데요.", intent: "risky/weird" },
      ],
      continueConversation: true,
    }),
    judgment: () => ({
      suspicionDelta: 999,
      reportDelta: -999,
      signals: ["dream_language_leak"],
      whyLine: "그 대답은 꿈 바깥의 말처럼 들렸습니다.",
    }),
    nextStep: () => ({ rationale: "No world action needed.", done: true }),
  });
  const running = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: adapter }),
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const answer = await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.1" },
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    assert.equal(answer.json.suspicionDelta, 100, "suspicion delta must clamp to the per-turn cap");
    assert.equal(answer.json.reportPressure, 0, "report pressure must clamp at zero");
  } finally {
    await running.close();
  }
});

test("the provider sees both sides of the dialogue, including the NPC's own prior line", async () => {
  const histories: Array<Array<{ speakerId: string; line: string }>> = [];
  const adapter = new ScriptedNpcAdapter({
    conversation: request => {
      histories.push(request.conversationHistory.map(entry => ({ ...entry })));
      return {
        utterance: request.beatId === "routine" ? "오늘도 같은 걸로 드릴까요?" : "기록과 다르지 않습니까?",
        suggestedReplies: [
          { text: "네, 같은 걸로 부탁해요.", intent: "safe/local" },
          { text: "제가 보통 뭘 시켰죠?", intent: "uncertain/repair" },
          { text: "오늘 처음 왔는데요.", intent: "risky/weird" },
        ],
        continueConversation: true,
      };
    },
    nextStep: () => ({ rationale: "No world action needed.", done: true }),
  });
  const running = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: adapter }),
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.1" },
    });
    const secondHistory = histories[1];
    assert.ok(secondHistory, "expected a second conversation turn request");
    assert.deepEqual(secondHistory, [
      { speakerId: "NPC_Store_Clerk", line: "오늘도 같은 걸로 드릴까요?" },
      { speakerId: "player", line: "네, 같은 걸로 부탁해요." },
    ]);
  } finally {
    await running.close();
  }
});

test("provider conversation pacing may close within the deterministic storylet bound", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "평소 주문으로 마칠까요?",
      suggestedReplies: [
        { text: "네, 마칩니다.", intent: "safe/local" },
        { text: "잠깐 확인해 주세요.", intent: "uncertain/repair" },
        { text: "처음 왔습니다.", intent: "risky/weird" },
      ],
      continueConversation: false,
    }),
    nextStep: () => ({ rationale: "No world action needed.", done: true }),
  });
  const running = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: adapter }),
  });
  const base = `http://${running.host}:${running.port}`;
  try {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const answer = await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: start.json.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.generated.1" },
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    assert.equal(answer.json.nextTurn, null);
    assert.equal(answer.json.routeState.terminal, true);
    assert.equal(answer.json.routeState.projectedRoute, "clean_cover");
  } finally {
    await running.close();
  }
});

test("snapshot returns full renderable state", async () => {
  await withServer(async base => {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const snap = await get(base, `/v1/session/snapshot?sessionId=${encodeURIComponent(start.json.sessionId)}`);
    assert.equal(snap.status, 200, JSON.stringify(snap.json));
    assert.equal(snap.json.storyletId, "same-order");
    assert.ok(Array.isArray(snap.json.records));
    assert.ok(snap.json.nextTurn);
  });
});

test("ordered turns are enforced: a stale/wrong turnId is rejected", async () => {
  await withServer(async base => {
    const start = await post(base, "/v1/session/start", { storyletId: "same-order", locale: "ko-KR" });
    const res = await post(base, "/v1/session/answer", {
      sessionId: start.json.sessionId,
      turnId: "conv-same-order#9#not-a-real-turn",
      answer: { type: "choice", choiceId: "routine.safe" },
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.error, "unexpected_turn");
  });
});

test("request validation rejects a malformed start body", async () => {
  await withServer(async base => {
    const res = await post(base, "/v1/session/start", { locale: "ko-KR" });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, "invalid_request");
  });
});

test("unknown session returns 404", async () => {
  await withServer(async base => {
    const res = await post(base, "/v1/session/end", { sessionId: "sess-does-not-exist" });
    assert.equal(res.status, 404);
    assert.equal(res.json.error, "session_not_found");
  });
});
