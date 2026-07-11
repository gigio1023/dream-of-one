import assert from "node:assert/strict";
import { test } from "bun:test";
import { startSessionServer, type RunningSessionServer } from "../../src/api/http-server.js";
import { createSameOrderScriptedAdapter } from "../../src/providers/testing/same-order-script.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
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

test("run-bound Studio conversation and legacy session routes coexist on one sidecar", async () => {
  await withServer(async base => {
    const run = await post(base, "/v1/run/start", { locale: "ko-KR" });
    assert.equal(run.status, 200, JSON.stringify(run.json));
    assert.equal(run.json.actors.length, 6);
    assert.equal(run.json.lastProposalMeta, null);

    const started = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal(started.json.nextTurn.choices.length, 3);
    assert.equal(started.json.nextTurn.proposalMeta.transport, "scripted");
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

    const run = await post(base, "/v1/run/start", { locale: "ko-KR" });
    const unsupported = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: "NPC_Office_Worker",
      interactionZoneId: "StudioReceptionConversation",
      locale: "ko-KR",
    });
    assert.equal(unsupported.status, 409);
    assert.equal(unsupported.json.error, "actor_not_supported");

    const wrongLocale = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "StudioReceptionConversation",
      locale: "en-US",
    });
    assert.equal(wrongLocale.status, 400);
    assert.equal(wrongLocale.json.error, "invalid_request");

    const invalidInteraction = await post(base, "/v1/session/start", {
      runId: run.json.runId,
      actorId: STUDIO_RECEPTIONIST_ID,
      interactionZoneId: "ParkConversation",
      locale: "ko-KR",
    });
    assert.equal(invalidInteraction.status, 400);
    assert.equal(invalidInteraction.json.error, "invalid_interaction");

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
