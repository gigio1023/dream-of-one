import assert from "node:assert/strict";
import { test } from "bun:test";
import { fallbackContent } from "../../src/localization/fallback-content.js";
import { startSessionServer } from "../../src/api/http-server.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { ProviderService } from "../../src/providers/service.js";
import type {
  HearingJudgment,
  HearingJudgmentRequest,
  ResolvedProposal,
  TextGenPort,
} from "../../src/providers/ports.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { createSameOrderScriptedAdapter } from "../../src/providers/testing/same-order-script.js";
import { conversationZoneFor, loadRunLayout } from "../../src/runtime/run-layout.js";
import { RunError, RunService } from "../../src/runtime/run-service.js";
import type { RunActorSpatialFacts, RunSnapshot } from "../../src/runtime/run-schema.js";
import { SessionService } from "../../src/runtime/session/service.js";

function deterministicIds(scope: string) {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-${scope}-${++counts[prefix]}`;
}

function proposalFor(
  request: HearingJudgmentRequest,
  verdict: "ordinary" | "abnormal",
  options: { allVouch?: boolean; invalidCitation?: boolean } = {},
): HearingJudgment {
  const residentAssessments = request.residents.map((resident, index) => {
    const firsthand = resident.memories.find(
      memory => memory.kind === "player_conversation" && memory.meaningfulFirsthand,
    );
    return {
      actorId: resident.actorId,
      proposedStance: firsthand || options.allVouch ? "vouch" as const : "uncertain" as const,
      testimonyLine: `testimony:${resident.actorId}`,
      citedMemoryIds:
        index === 0 && options.invalidCitation
          ? ["memory-that-does-not-exist"]
          : firsthand
            ? [firsthand.memoryId]
            : [],
    };
  }) as HearingJudgment["residentAssessments"];
  return {
    residentAssessments,
    proposedVerdict: verdict,
    verdictWhyLine: `provider verdict:${verdict}`,
    officerLine: `provider officer:${verdict}`,
    citedRecordIds: [],
    citedLedgerEventIds: [],
  };
}

function createService(
  scope: string,
  hearing: (request: HearingJudgmentRequest) => HearingJudgment | Promise<HearingJudgment>,
): RunService {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeHearing = async request => ({
    proposal: await hearing(request),
    meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
  });
  const layout = { ...loadRunLayout(), hearingAtSeconds: 10 };
  return new RunService({ proposalPort: adapter, idFactory: deterministicIds(scope), layout });
}

function spatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position);
    const block = schedulerActor.currentBlock;
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs: block?.targetKind === "anchor"
        ? [block.targetId]
        : [...new Set(layout.routes.find(route => route.routeId === block?.targetId)?.points ?? [])],
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

async function earnVouches(service: RunService, runId: string, count: number): Promise<void> {
  const layout = loadRunLayout();
  const actors = service.snapshot(runId).actors.slice(0, count);
  for (const actor of actors) {
    const zone = conversationZoneFor(layout, actor.actorId, actor.locationId);
    assert.ok(zone, `missing conversation zone for ${actor.actorId}@${actor.locationId}`);
    await service.preloadConversation(runId, actor.actorId, zone.zoneId, "ko-KR");
    const started = await service.startConversation(runId, actor.actorId, zone.zoneId, "ko-KR");
    const safe = started.nextTurn.choices.find(choice => choice.intent === "safe/local");
    assert.ok(safe);
    const answered = await service.answer(runId, started.sessionId, started.nextTurn.turnId, {
      type: "choice",
      choiceId: safe.choiceId,
    });
    assert.equal(answered.actor.stance, "vouch");
    assert.equal(answered.nextTurn, null);
    await service.endConversation(runId, started.sessionId);
  }
}

async function makeDue(service: RunService, runId: string, advanceId: string): Promise<void> {
  const before = service.snapshot(runId);
  const due = await service.advance({
    runId,
    advanceId,
    observedWorldRevision: before.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(due.clock.hearingDue, true);
  const snapshot = service.snapshot(runId);
  assert.equal(snapshot.runStatus, "hearing_due");
  assert.equal(snapshot.hearingProcedure, null);
  assert.equal(snapshot.worldClock.paused, true);
}

async function resolveHearing(service: RunService, runId: string, hearingId: string) {
  const opened = await service.hearing({ action: "open", runId, hearingId });
  assert.equal(opened.action, "open");
  return service.hearing({
    action: "answer",
    runId,
    hearingId,
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input", text: "최종 진술입니다." },
  });
}

test("hearing opening provider receives the officer's current visible objects", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  let hearingVisibleObjectIds: string[] = [];
  adapter.proposeConversationTurn = async request => {
    if (request.beatId.startsWith("station_hearing:")) {
      hearingVisibleObjectIds = request.observePacket.visibleObjects.map(object => object.objectId);
    }
    return originalOpening(request);
  };
  const layout = { ...loadRunLayout(), hearingAtSeconds: 10 };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("hearing-spatial-context"),
    layout,
  });
  const started = service.start("start-hearing-spatial-context", "ko-KR");
  const actors = spatialActors(started);
  const officer = actors.find(actor => actor.actorId === "NPC_Station_Officer");
  assert.ok(officer);
  officer.visibleObjectIds = ["Prop_Park_Box"];
  await service.advance({
    runId: started.runId,
    advanceId: "hearing-spatial-context-seed",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors,
    },
  });
  await makeDue(service, started.runId, "due-hearing-spatial-context");
  await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-spatial-context",
  });
  assert.deepEqual(hearingVisibleObjectIds, ["Prop_Park_Box"]);
});

test("hearing quorum uses evidenced vouches and preserves provider abnormal authority", async () => {
  for (const scenario of [
    { scope: "three-ordinary", vouches: 3, proposed: "ordinary" as const, expected: "abnormal" },
    { scope: "four-ordinary", vouches: 4, proposed: "ordinary" as const, expected: "ordinary" },
    { scope: "four-abnormal", vouches: 4, proposed: "abnormal" as const, expected: "abnormal" },
  ]) {
    const service = createService(scenario.scope, request => proposalFor(request, scenario.proposed));
    const started = service.start(`start-${scenario.scope}`, "ko-KR");
    await earnVouches(service, started.runId, scenario.vouches);
    await makeDue(service, started.runId, `due-${scenario.scope}`);
    const result = await resolveHearing(service, started.runId, `hearing-${scenario.scope}`);
    assert.equal(result.action, "answer");
    assert.equal(result.runStatus, "terminal");
    assert.equal(result.terminalResult.evidencedVouchCount, scenario.vouches);
    assert.equal(result.terminalResult.verdict, scenario.expected);
    assert.equal(service.snapshot(started.runId).runStatus, "terminal");
  }
});

test("hearing and run end are retry-stable, conflict-safe, and freeze ordinary mutations", async () => {
  const service = createService("lifecycle", request => proposalFor(request, "ordinary"));
  const started = service.start("start-lifecycle", "ko-KR");
  await earnVouches(service, started.runId, 4);
  await makeDue(service, started.runId, "due-lifecycle");

  await assert.rejects(
    service.advance({
      runId: started.runId,
      advanceId: "after-due",
      observedWorldRevision: service.snapshot(started.runId).worldRevision,
      elapsedSeconds: 1,
      arrivals: [],
    }),
    (error: unknown) => error instanceof RunError && error.code === "hearing_due",
  );
  await assert.rejects(
    service.preloadConversation(
      started.runId,
      service.snapshot(started.runId).actors[0]!.actorId,
      "unused",
      "ko-KR",
    ),
    (error: unknown) => error instanceof RunError && error.code === "run_not_active",
  );
  await assert.rejects(
    service.decision({
      runId: started.runId,
      wakeId: "new-after-due",
      observedWorldRevision: service.snapshot(started.runId).worldRevision,
    }),
    (error: unknown) => error instanceof RunError && error.code === "run_not_active",
  );

  const openRequest = { action: "open" as const, runId: started.runId, hearingId: "hearing-lifecycle" };
  const opened = await service.hearing(openRequest);
  assert.deepEqual(await service.hearing(openRequest), opened);
  await assert.rejects(
    service.hearing({ action: "open", runId: started.runId, hearingId: "hearing-conflict" }),
    (error: unknown) => error instanceof RunError && error.code === "hearing_id_conflict",
  );
  const answerRequest = {
    action: "answer" as const,
    runId: started.runId,
    hearingId: openRequest.hearingId,
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input" as const, text: "저는 평범합니다." },
  };
  const answered = await service.hearing(answerRequest);
  assert.deepEqual(await service.hearing(answerRequest), answered);
  await assert.rejects(
    service.hearing({ ...answerRequest, answer: { type: "free_input", text: "다른 진술" } }),
    (error: unknown) => error instanceof RunError && error.code === "unexpected_turn",
  );

  const endRequest = { runId: started.runId, endId: "end-lifecycle" };
  const ended = await service.endRun(endRequest);
  assert.equal(ended.runStatus, "closed");
  assert.deepEqual(await service.endRun(endRequest), ended);
  await assert.rejects(
    service.endRun({ runId: started.runId, endId: "end-conflict" }),
    (error: unknown) => error instanceof RunError && error.code === "end_id_conflict",
  );
  assert.equal(service.snapshot(started.runId).runStatus, "closed");

  const reset = service.start("start-reset", "ko-KR");
  assert.equal(reset.runStatus, "active");
  assert.equal(reset.hearingProcedure, null);
  assert.equal(reset.terminalResult, null);
});

test("run-wide provider audit survives terminal hearing, end, and a fresh run reset", async () => {
  const unavailableTextGen: TextGenPort = {
    adapterId: "audit-unavailable",
    preflight: async () => ({ available: false, reason: "missing_credentials" }),
    generate: async () => {
      throw new Error("unavailable transport must not be called");
    },
  };
  const proposalPort = new ProviderService({
    profileId: "test/run-audit",
    textGen: unavailableTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const service = new RunService({
    proposalPort,
    idFactory: deterministicIds("run-audit"),
    layout: { ...loadRunLayout(), hearingAtSeconds: 10 },
  });
  const started = service.start("start-run-audit", "ko-KR");
  assert.equal(started.providerAudit.callsUsed, 0);
  assert.deepEqual(started.providerAudit.resolutions, []);

  await makeDue(service, started.runId, "due-run-audit");
  const opened = await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-run-audit",
  });
  assert.equal(opened.action, "open");
  assert.deepEqual(
    opened.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["fallback"],
  );
  assert.deepEqual(opened.providerAudit.resolutions.map(resolution => ({
    purpose: resolution.purpose,
    transport: resolution.transport,
    fallbackReason: resolution.fallbackReason,
    callSeqs: resolution.callSeqs,
  })), [{
    purpose: "conversation",
    transport: "fallback",
    fallbackReason: "missing_credentials",
    callSeqs: [],
  }]);

  const answered = await service.hearing({
    action: "answer",
    runId: started.runId,
    hearingId: "hearing-run-audit",
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input", text: "최종 진술입니다." },
  });
  assert.equal(answered.action, "answer");
  assert.equal(answered.runStatus, "terminal");
  assert.equal(answered.providerAudit.callsUsed, 0);
  assert.equal(answered.providerAudit.complete, true);
  assert.equal(answered.providerAudit.truncated, false);
  assert.equal(answered.providerAudit.inFlightCalls, 0);
  assert.deepEqual(
    answered.providerAudit.resolutions.map(resolution => resolution.purpose),
    ["conversation", "hearing_verdict"],
  );
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["fallback", "fallback"],
  );
  assert.ok(answered.providerAudit.resolutions.every(
    resolution =>
      resolution.profileId === "test/run-audit" &&
      resolution.transport === "fallback" &&
      resolution.fallbackReason === "missing_credentials" &&
      resolution.callSeqs.length === 0,
  ));

  const ended = await service.endRun({ runId: started.runId, endId: "end-run-audit" });
  assert.deepEqual(ended.providerAudit, answered.providerAudit);
  assert.deepEqual(ended.providerRuntimeTrace, answered.providerRuntimeTrace);
  assert.deepEqual(service.snapshot(started.runId).providerAudit, answered.providerAudit);

  const reset = service.start("start-run-audit-reset", "ko-KR");
  assert.equal(reset.providerAudit.callsUsed, 0);
  assert.deepEqual(reset.providerAudit.calls, []);
  assert.deepEqual(reset.providerAudit.resolutions, []);
  assert.deepEqual(reset.providerRuntimeTrace.entries, []);
});

test("semantic-invalid live hearing remains visible as a runtime fallback", async () => {
  const liveTextGen: TextGenPort = {
    adapterId: "semantic-invalid-live",
    preflight: async () => ({ available: true }),
    generate: async request => {
      const usage = { inputTokens: 6, outputTokens: 4, totalTokens: 10 };
      if (request.schemaName === "npc_conversation_turn") {
        return {
          text: JSON.stringify({
            utterance: "최종 진술을 말씀해 주십시오.",
            suggestedReplies: [
              { text: "주민들과 직접 대화했습니다.", intent: "safe/local" },
              { text: "기록을 다시 확인해 주십시오.", intent: "uncertain/repair" },
              { text: "더 설명하지 않겠습니다.", intent: "risky/weird" },
            ],
            continueConversation: false,
          }),
          usage,
        };
      }
      const input = JSON.parse(request.input) as {
        residents: Array<{ actorId: string }>;
      };
      return {
        text: JSON.stringify({
          residentAssessments: input.residents.map((resident, index) => ({
            actorId: resident.actorId,
            proposedStance: "uncertain",
            testimonyLine: "직접 확인할 근거가 충분하지 않습니다.",
            citedMemoryIds: index === 0 ? ["memory-that-does-not-exist"] : [],
          })),
          proposedVerdict: "abnormal",
          verdictWhyLine: "제출된 증언만으로는 평범함을 확인하기 어렵습니다.",
          officerLine: "근거를 다시 검토한 결과 평범하다고 판정할 수 없습니다.",
          citedRecordIds: [],
          citedLedgerEventIds: [],
        }),
        usage,
      };
    },
  };
  const service = new RunService({
    proposalPort: new ProviderService({
      profileId: "test/semantic-invalid-live",
      textGen: liveTextGen,
      fallback: new RuleFallbackNpcAdapter(),
    }),
    idFactory: deterministicIds("semantic-invalid-live"),
    layout: { ...loadRunLayout(), hearingAtSeconds: 10 },
  });
  const started = service.start("start-semantic-invalid-live", "ko-KR");
  await makeDue(service, started.runId, "due-semantic-invalid-live");
  const opened = await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-semantic-invalid-live",
  });
  const answered = await service.hearing({
    action: "answer",
    runId: started.runId,
    hearingId: "hearing-semantic-invalid-live",
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input", text: "제 대화를 확인해 주십시오." },
  });
  assert.equal(answered.action, "answer");
  assert.ok(answered.providerAudit.calls.every(
    call => call.transport === "live" && call.outcome === "success",
  ));
  assert.ok(answered.providerAudit.resolutions.every(
    resolution => resolution.transport === "live" && !resolution.usedFallback,
  ));
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => ({
      transport: entry.meta.transport,
      usedFallback: entry.meta.usedFallback,
      fallbackReason: entry.meta.fallbackReason ?? null,
    })),
    [
      { transport: "live", usedFallback: false, fallbackReason: null },
      { transport: "fallback", usedFallback: true, fallbackReason: "invalid_envelope" },
    ],
  );
  assert.equal(answered.proposalMeta.transport, "fallback");
  assert.equal(answered.proposalMeta.fallbackReason, "invalid_envelope");
});

test("runtime trace retains an early provider fallback followed by live judgment", async () => {
  let preflightCount = 0;
  const textGen: TextGenPort = {
    adapterId: "runtime-fallback-then-live",
    preflight: async () => {
      preflightCount += 1;
      return preflightCount === 1
        ? { available: false, reason: "missing_credentials" }
        : { available: true };
    },
    generate: async request => {
      const input = JSON.parse(request.input) as {
        residents: Array<{ actorId: string }>;
      };
      return {
        text: JSON.stringify({
          residentAssessments: input.residents.map(resident => ({
            actorId: resident.actorId,
            proposedStance: "uncertain",
            testimonyLine: "직접 대화한 근거가 없어 보증할 수 없습니다.",
            citedMemoryIds: [],
          })),
          proposedVerdict: "abnormal",
          verdictWhyLine: "직접 대화에 근거한 보증이 부족합니다.",
          officerLine: "현재 증언으로는 평범하다고 판정할 수 없습니다.",
          citedRecordIds: [],
          citedLedgerEventIds: [],
        }),
        usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
      };
    },
  };
  const service = new RunService({
    proposalPort: new ProviderService({
      profileId: "test/runtime-fallback-then-live",
      textGen,
      fallback: new RuleFallbackNpcAdapter(),
    }),
    idFactory: deterministicIds("runtime-fallback-then-live"),
    layout: { ...loadRunLayout(), hearingAtSeconds: 10 },
  });
  const started = service.start("start-runtime-fallback-then-live", "ko-KR");
  await makeDue(service, started.runId, "due-runtime-fallback-then-live");
  const opened = await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-runtime-fallback-then-live",
  });
  const answered = await service.hearing({
    action: "answer",
    runId: started.runId,
    hearingId: "hearing-runtime-fallback-then-live",
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input", text: "직접 대화한 기록을 확인해 주십시오." },
  });
  assert.equal(answered.action, "answer");
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["fallback", "live"],
  );
  assert.equal(answered.providerRuntimeTrace.complete, true);
  assert.equal(answered.providerRuntimeTrace.truncated, false);
});

test("never-met vouches clamp and semantic-invalid or failed providers still terminalize", async () => {
  const neverMet = createService("never-met", request =>
    proposalFor(request, "ordinary", { allVouch: true })
  );
  const neverMetRun = neverMet.start("start-never-met", "ko-KR");
  await makeDue(neverMet, neverMetRun.runId, "due-never-met");
  const neverMetResult = await resolveHearing(neverMet, neverMetRun.runId, "hearing-never-met");
  assert.equal(neverMetResult.terminalResult.evidencedVouchCount, 0);
  assert.equal(neverMetResult.terminalResult.verdict, "abnormal");
  assert.ok(neverMetResult.terminalResult.residentAssessments.every(
    assessment =>
      assessment.appliedStance === "uncertain" &&
      assessment.citedMemoryIds.length === 0 &&
      assessment.testimonyLine === fallbackContent("ko-KR").hearing.neverMetTestimony,
  ));

  const invalid = createService("invalid", request =>
    proposalFor(request, "ordinary", { invalidCitation: true })
  );
  const invalidRun = invalid.start("start-invalid", "ko-KR");
  await makeDue(invalid, invalidRun.runId, "due-invalid");
  const invalidResult = await resolveHearing(invalid, invalidRun.runId, "hearing-invalid");
  assert.equal(invalidResult.runStatus, "terminal");
  assert.equal(invalidResult.proposalMeta.transport, "fallback");
  assert.equal(invalidResult.proposalMeta.usedFallback, true);
  assert.equal(invalidResult.proposalMeta.fallbackReason, "invalid_envelope");

  const failed = createService("failed", async () => {
    throw new Error("provider unavailable");
  });
  const failedRun = failed.start("start-failed", "ko-KR");
  await makeDue(failed, failedRun.runId, "due-failed");
  const failedResult = await resolveHearing(failed, failedRun.runId, "hearing-failed");
  assert.equal(failedResult.runStatus, "terminal");
  assert.equal(failedResult.proposalMeta.transport, "fallback");
  assert.equal(failedResult.proposalMeta.fallbackReason, "transport_error");
});

test("HTTP hearing and run-end routes validate the full lifecycle envelope", async () => {
  const runService = createService("http", request => proposalFor(request, "ordinary"));
  const running = await startSessionServer({
    logListen: false,
    service: new SessionService({ proposalPort: createSameOrderScriptedAdapter() }),
    runService,
  });
  const post = async (path: string, body: unknown) => {
    const response = await fetch(`http://${running.host}:${running.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, json: await response.json() as any };
  };
  try {
    const started = await post("/v1/run/start", { startId: "start-http-hearing", locale: "ko-KR" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const due = await post("/v1/run/advance", {
      runId: started.json.runId,
      advanceId: "due-http-hearing",
      observedWorldRevision: started.json.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    assert.equal(due.status, 200, JSON.stringify(due.json));
    const openRequest = {
      action: "open",
      runId: started.json.runId,
      hearingId: "hearing-http-1",
    };
    const opened = await post("/v1/run/hearing", openRequest);
    assert.equal(opened.status, 200, JSON.stringify(opened.json));
    assert.equal(opened.json.nextTurn.procedure, "hearing");
    assert.equal(opened.json.nextTurn.hesitationMs, 0);
    assert.equal(opened.json.nextTurn.continueConversation, false);
    assert.deepEqual(opened.json.staging, {
      playerAnchorRef: "Station.hearing_player",
      focusAnchorRef: "Station.hearing_table",
    });
    assert.deepEqual(await post("/v1/run/hearing", openRequest), opened);
    const answerRequest = {
      action: "answer",
      runId: started.json.runId,
      hearingId: openRequest.hearingId,
      turnId: opened.json.nextTurn.turnId,
      answer: { type: "free_input", text: "최종 답변" },
    };
    const answered = await post("/v1/run/hearing", answerRequest);
    assert.equal(answered.status, 200, JSON.stringify(answered.json));
    assert.equal(answered.json.runStatus, "terminal");
    assert.deepEqual(await post("/v1/run/hearing", answerRequest), answered);
    const endRequest = { runId: started.json.runId, endId: "end-http-1" };
    const ended = await post("/v1/run/end", endRequest);
    assert.equal(ended.status, 200, JSON.stringify(ended.json));
    assert.equal(ended.json.runStatus, "closed");
    assert.deepEqual(await post("/v1/run/end", endRequest), ended);
  } finally {
    await running.close();
  }
});

test("high-pressure Station interrogation is grounded, hesitation-only, survivable, and once per ledger escalation", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryNextStep = adapter.proposeNextStep.bind(adapter);
  const ordinaryMergedTurn = adapter.judgeAndProposeConversationTurn.bind(adapter);
  adapter.judgeAndProposeConversationTurn = async request => {
    const resolved = await ordinaryMergedTurn(request);
    if (request.playerLine === fallbackContent(request.locale).hesitationMarker) {
      resolved.proposal.meaningfulFirsthand = true;
      resolved.proposal.stance = "vouch";
    }
    return resolved;
  };
  let forceInterrogationWait = false;
  let forceBudgetFallback = false;
  adapter.proposeNextStep = async request => {
    if (request.observePacket.playerContact?.available && forceBudgetFallback) {
      return {
        proposal: {
          toolCall: { tool: "move_to", args: { targetId: "player" } },
          rationale: "The provider budget races the pre-claim reserve check.",
          done: true,
        },
        meta: {
          profileId: adapter.profileId,
          transport: "fallback",
          usedFallback: true,
          fallbackReason: "budget_exhausted",
        },
      };
    }
    if (request.observePacket.playerContact?.available && forceInterrogationWait) {
      return {
        proposal: {
          toolCall: { tool: "wait", args: { reason: "provider tries to skip interrogation" } },
          rationale: "Try to wait.",
          done: true,
        },
        meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
      };
    }
    if (request.observePacket.playerContact?.available) return ordinaryNextStep(request);
    const source = request.observePacket.administrativeSources.find(memory => memory.reportDelta > 0);
    const textSurfaceId = request.observePacket.administrativeAuthority.writableTextSurfaceIds[0];
    const recordKind = request.observePacket.administrativeAuthority.allowedRecordKinds[0];
    if (source && textSurfaceId && recordKind) {
      return {
        proposal: {
          toolCall: {
            tool: "write_record",
            args: {
              recordKind,
              sourceMemoryId: source.memoryId,
              stateBody: `pressure record:${request.actorId}`,
              whyLine: `pressure evidence:${request.actorId}`,
              institutionalPressureDelta: 25,
              textSurfaceId,
              openQuestion: null,
            },
          },
          rationale: "Record the firsthand pressure-bearing statement.",
          done: true,
        },
        meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
      };
    }
    return ordinaryNextStep(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("interrogation"),
  });
  const started = service.start("start-interrogation", "ko-KR");
  const layout = loadRunLayout();
  const pressureActors = service.snapshot(started.runId).actors.slice(0, 4);

  for (const [index, actor] of pressureActors.entries()) {
    const zone = conversationZoneFor(layout, actor.actorId, actor.locationId);
    assert.ok(zone);
    await service.preloadConversation(started.runId, actor.actorId, zone.zoneId, "ko-KR");
    const conversation = await service.startConversation(
      started.runId,
      actor.actorId,
      zone.zoneId,
      "ko-KR",
    );
    assert.equal(conversation.nextTurn.procedure, "ordinary");
    assert.equal(conversation.nextTurn.hesitationMs, 0);
    if (index === 0) {
      await assert.rejects(
        service.answer(
          started.runId,
          conversation.sessionId,
          conversation.nextTurn.turnId,
          { type: "hesitation" },
        ),
        (error: unknown) => error instanceof RunError && error.code === "invalid_answer",
      );
    }
    const risky = conversation.nextTurn.choices.find(choice => choice.intent === "risky/weird");
    assert.ok(risky);
    await service.answer(
      started.runId,
      conversation.sessionId,
      conversation.nextTurn.turnId,
      { type: "choice", choiceId: risky.choiceId },
    );
    await service.endConversation(started.runId, conversation.sessionId);

    const beforeFacts = service.snapshot(started.runId);
    const advanced = await service.advance({
      runId: started.runId,
      advanceId: `pressure-facts-${index + 1}`,
      observedWorldRevision: beforeFacts.worldRevision,
      elapsedSeconds: 0,
      arrivals: [],
      spatialFacts: {
        observedWorldRevision: beforeFacts.worldRevision,
        player: { position: [0, 0, 0], locationId: "" },
        actors: spatialActors(beforeFacts),
      },
    });
    const wake = advanced.scheduleWakes.find(
      candidate => candidate.kind === "goal" && candidate.actorIds[0] === actor.actorId,
    );
    assert.ok(wake, `missing pressure goal for ${actor.actorId}`);
    const decided = await service.decision({
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    });
    assert.ok(decided.actionDeltas.some(
      delta => delta.kind === "administration" && delta.ledgerEvent.pressureDelta === 25,
    ));
  }
  assert.equal(service.snapshot(started.runId).institutionalPressure, 100);
  forceInterrogationWait = true;

  const beforeContact = service.snapshot(started.runId);
  const officerFacts = spatialActors(beforeContact);
  const officer = officerFacts.find(facts => facts.actorId === "NPC_Station_Officer");
  assert.ok(officer);
  const stationPosition = layout.anchorPositions["Station.officer_spawn"];
  assert.ok(stationPosition);
  officer.position = [stationPosition[0], stationPosition[1], stationPosition[2]];
  officer.playerVisible = true;
  officer.playerAudible = true;
  officer.playerReachable = true;
  officer.playerInteractionZoneId = "StationIntakeConversation";
  const grounded = await service.advance({
    runId: started.runId,
    advanceId: "interrogation-grounded",
    observedWorldRevision: beforeContact.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeContact.worldRevision,
      player: {
        position: [stationPosition[0], stationPosition[1], stationPosition[2]],
        locationId: "Station",
      },
      actors: officerFacts,
    },
  });
  const officerWake = grounded.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Station_Officer",
  );
  assert.ok(officerWake);
  const contactDecision = await service.decision({
    runId: started.runId,
    wakeId: officerWake.wakeId,
    observedWorldRevision: officerWake.observedWorldRevision,
  });
  assert.equal(contactDecision.activeContact?.actorId, "NPC_Station_Officer");
  assert.equal(contactDecision.activeContact?.procedure, "interrogation");
  assert.equal(contactDecision.providerMetas.at(-1)?.transport, "fallback");

  const contact = contactDecision.activeContact;
  assert.ok(contact);
  await service.preloadConversation(
    started.runId,
    contact.actorId,
    contact.interactionZoneId,
    "ko-KR",
  );
  const interrogation = await service.startConversation(
    started.runId,
    contact.actorId,
    contact.interactionZoneId,
    "ko-KR",
    contact.contactId,
  );
  assert.equal(interrogation.nextTurn.procedure, "interrogation");
  assert.equal(interrogation.nextTurn.hesitationMs, 40_000);
  const answered = await service.answer(
    started.runId,
    interrogation.sessionId,
    interrogation.nextTurn.turnId,
    { type: "hesitation" },
  );
  assert.equal(answered.nextTurn, null);
  assert.equal(answered.judgment.meaningfulFirsthand, false);
  assert.equal(answered.memoryDelta.meaningfulFirsthand, false);
  assert.notEqual(answered.actor.stance, "vouch");
  assert.equal(answered.actor.hasMeaningfulFirsthandConversation, false);
  const ended = await service.endConversation(started.runId, interrogation.sessionId);
  assert.equal(ended.ended, true);
  const after = service.snapshot(started.runId);
  assert.equal(after.runStatus, "active");
  assert.equal(after.terminalResult, null);
  const station = after.actors.find(actor => actor.actorId === "NPC_Station_Officer");
  assert.ok(station?.memories.some(
    memory => memory.kind === "interrogation_outcome" && memory.ledgerSeq === 4,
  ));

  const afterAdvance = await service.advance({
    runId: started.runId,
    advanceId: "interrogation-no-repeat",
    observedWorldRevision: after.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: after.worldRevision,
      player: {
        position: [stationPosition[0], stationPosition[1], stationPosition[2]],
        locationId: "Station",
      },
      actors: spatialActors(after).map(facts =>
        facts.actorId === "NPC_Station_Officer"
          ? {
              ...facts,
              position: [stationPosition[0], stationPosition[1], stationPosition[2]],
              playerVisible: true,
              playerAudible: true,
              playerReachable: true,
              playerInteractionZoneId: "StationIntakeConversation",
            }
          : facts
      ),
    },
  });
  assert.equal(afterAdvance.activeContact, null);

  // A later positive ledger event creates another interrogation even when
  // the provider reports exact budget exhaustion after the pre-claim reserve
  // check. Contact is then deterministic and the foreground conversation can
  // still use the protected player/hearing reserve.
  forceInterrogationWait = false;
  const liaison = after.actors.find(actor => actor.actorId === "NPC_Roaming_Liaison");
  assert.ok(liaison);
  const liaisonZone = conversationZoneFor(layout, liaison.actorId, liaison.locationId);
  assert.ok(liaisonZone);
  await service.preloadConversation(
    started.runId,
    liaison.actorId,
    liaisonZone.zoneId,
    "ko-KR",
  );
  const liaisonConversation = await service.startConversation(
    started.runId,
    liaison.actorId,
    liaisonZone.zoneId,
    "ko-KR",
  );
  const liaisonRisky = liaisonConversation.nextTurn.choices.find(
    choice => choice.intent === "risky/weird",
  );
  assert.ok(liaisonRisky);
  await service.answer(
    started.runId,
    liaisonConversation.sessionId,
    liaisonConversation.nextTurn.turnId,
    { type: "choice", choiceId: liaisonRisky.choiceId },
  );
  await service.endConversation(started.runId, liaisonConversation.sessionId);
  const beforeEscalation = service.snapshot(started.runId);
  const escalationAdvance = await service.advance({
    runId: started.runId,
    advanceId: "interrogation-new-escalation",
    observedWorldRevision: beforeEscalation.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeEscalation.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: spatialActors(beforeEscalation),
    },
  });
  const liaisonWake = escalationAdvance.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === liaison.actorId,
  );
  assert.ok(liaisonWake);
  await service.decision({
    runId: started.runId,
    wakeId: liaisonWake.wakeId,
    observedWorldRevision: liaisonWake.observedWorldRevision,
  });
  const escalated = service.snapshot(started.runId);
  assert.equal(escalated.institutionalPressure, 125);
  forceBudgetFallback = true;
  const exhaustedActors = spatialActors(escalated);
  const exhaustedOfficer = exhaustedActors.find(
    facts => facts.actorId === "NPC_Station_Officer",
  );
  assert.ok(exhaustedOfficer);
  exhaustedOfficer.position = [stationPosition[0], stationPosition[1], stationPosition[2]];
  exhaustedOfficer.playerVisible = true;
  exhaustedOfficer.playerAudible = true;
  exhaustedOfficer.playerReachable = true;
  exhaustedOfficer.playerInteractionZoneId = "StationIntakeConversation";
  const exhaustedAdvance = await service.advance({
    runId: started.runId,
    advanceId: "interrogation-reserve-contact",
    observedWorldRevision: escalated.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: escalated.worldRevision,
      player: {
        position: [stationPosition[0], stationPosition[1], stationPosition[2]],
        locationId: "Station",
      },
      actors: exhaustedActors,
    },
  });
  const exhaustedWake = exhaustedAdvance.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Station_Officer",
  );
  assert.ok(exhaustedWake);
  const reserveContact = await service.decision({
    runId: started.runId,
    wakeId: exhaustedWake.wakeId,
    observedWorldRevision: exhaustedWake.observedWorldRevision,
  });
  assert.equal(reserveContact.activeContact?.procedure, "interrogation");
  assert.equal(reserveContact.providerMetas.at(-1)?.transport, "fallback");
  assert.equal(reserveContact.providerMetas.at(-1)?.fallbackReason, "budget_exhausted");
});
