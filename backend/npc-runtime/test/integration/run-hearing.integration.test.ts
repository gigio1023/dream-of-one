import assert from "node:assert/strict";
import { test } from "bun:test";
import { fallbackContent } from "../../src/localization/fallback-content.js";
import { SUPPORTED_GAMEPLAY_LOCALES } from "../../src/localization/supported-locales.js";
import { startSessionServer } from "../../src/api/http-server.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { ProviderBudgetReservedError } from "../../src/providers/ports.js";
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
import { hearingContactBasisForMemories } from "../../src/runtime/run-hearing.js";
import { RunError, RunService } from "../../src/runtime/run-service.js";
import {
  runGeneratedNextTurnSchema,
  runHearingNextTurnSchema,
} from "../../src/runtime/run-schema.js";
import type {
  RunActorSpatialFacts,
  RunScheduleWake,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";
import { SessionService } from "../../src/runtime/session/service.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

function deterministicIds(scope: string) {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-${scope}-${++counts[prefix]}`;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
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
      contactBasis: hearingContactBasisForMemories(resident.memories),
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
    await groundOrdinaryConversation(
      service,
      runId,
      actor.actorId,
      zone.zoneId,
      `ground-vouch-${actor.actorId}`,
    );
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

async function readyFirstMeeting(service: RunService, runId: string): Promise<RunScheduleWake> {
  let revision = service.snapshot(runId).worldRevision;
  for (let step = 1; step <= 9; step += 1) {
    let advanced = await service.advance({
      runId,
      advanceId: `hearing-ambient-clock-${step}`,
      observedWorldRevision: revision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    revision = advanced.worldRevision;
    if (advanced.movementDeltas.length > 0) {
      advanced = await service.advance({
        runId,
        advanceId: `hearing-ambient-arrivals-${step}`,
        observedWorldRevision: revision,
        elapsedSeconds: 0,
        arrivals: advanced.movementDeltas.map(movement => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        })),
      });
      revision = advanced.worldRevision;
    }
  }
  const wake = service.snapshot(runId).scheduler.pendingWakes.find(
    candidate => candidate.kind === "meeting_ready" && candidate.status === "pending",
  );
  assert.ok(wake);
  return wake;
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

test("hearing receives public cast identity and voice without private cast context", async () => {
  let captured: HearingJudgmentRequest | null = null;
  const service = createService("hearing-cast-privacy", request => {
    captured = structuredClone(request);
    return proposalFor(request, "abnormal");
  });
  const started = service.start("start-hearing-cast-privacy", "ko-KR");
  await makeDue(service, started.runId, "due-hearing-cast-privacy");
  await resolveHearing(service, started.runId, "hearing-cast-privacy");

  assert.ok(captured);
  const residents = captured.residents;
  assert.equal(residents.length, 6);
  assert.equal(
    residents.find(resident => resident.actorId === "NPC_Studio_Receptionist")?.publicIdentity,
    "미라 — 스튜디오 접수 담당자",
  );
  assert.ok(residents.every(resident =>
    resident.voice.register.length > 0 &&
    resident.voice.cadence.length > 0 &&
    resident.voice.avoid.length > 0
  ));
  const serialized = JSON.stringify(captured);
  assert.ok(!serialized.includes("selfOnlyPressures"));
  assert.ok(!serialized.includes("knownRelationships"));
  assert.ok(!serialized.includes("예외를 한 번 승인"));
  assert.ok(!serialized.includes("hud.m3r.player_brief.uncertainty"));
});

test("hearing open is an immediate localized free-input procedure in all six locales", async () => {
  for (const locale of SUPPORTED_GAMEPLAY_LOCALES) {
    const adapter = createStudioReceptionScriptedAdapter();
    const originalOpening = adapter.proposeConversationTurn.bind(adapter);
    let providerOpeningCalls = 0;
    adapter.proposeConversationTurn = async request => {
      if (request.beatId.startsWith("station_hearing:")) providerOpeningCalls += 1;
      return originalOpening(request);
    };
    const service = new RunService({
      proposalPort: adapter,
      idFactory: deterministicIds(`localized-hearing-${locale}`),
      layout: { ...loadRunLayout(), hearingAtSeconds: 10 },
    });
    const started = service.start(`start-localized-hearing-${locale}`, locale);
    await makeDue(service, started.runId, `due-localized-hearing-${locale}`);
    const opened = await service.hearing({
      action: "open",
      runId: started.runId,
      hearingId: `localized-hearing-${locale}`,
    });
    assert.equal(providerOpeningCalls, 0);
    assert.equal(opened.nextTurn.prompt, fallbackContent(locale).hearing.opening);
    assert.equal(opened.nextTurn.acceptsFreeInput, true);
    assert.deepEqual(opened.nextTurn.choices, []);
    assert.equal(opened.nextTurn.proposalMeta, null);
    assert.equal(opened.proposalMeta, null);
    assert.deepEqual(opened.providerAudit.resolutions, []);
    assert.deepEqual(opened.providerRuntimeTrace.entries, []);
    assert.equal(runHearingNextTurnSchema.safeParse(opened.nextTurn).success, true);
    assert.equal(runGeneratedNextTurnSchema.safeParse(opened.nextTurn).success, false);
  }
});

test("hearing opens before background drain and answer waits before one final judgment", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  const twoEntered = deferred();
  const releaseResidents = deferred();
  let residentTransportCalls = 0;
  let activeResidentCalls = 0;
  let hearingTransportCalls = 0;
  let goalTransportCalls = 0;
  let queuedResidentReachedTransport = false;
  adapter.proposeConversationTurn = async request => {
    if (request.beatId.startsWith("resident_opening_")) {
      residentTransportCalls += 1;
      if (residentTransportCalls > 2) queuedResidentReachedTransport = true;
      activeResidentCalls += 1;
      if (residentTransportCalls === 2) twoEntered.resolve();
      await releaseResidents.promise;
      activeResidentCalls -= 1;
    }
    return originalOpening(request);
  };
  const originalHearing = adapter.judgeHearing.bind(adapter);
  adapter.judgeHearing = async request => {
    hearingTransportCalls += 1;
    assert.equal(
      activeResidentCalls,
      0,
      "the final hearing judgment starts only after active background transport drains",
    );
    return originalHearing(request);
  };
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  adapter.proposeNextStep = async request => {
    goalTransportCalls += 1;
    return originalNextStep(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("hearing-background-drain"),
    layout: { ...loadRunLayout(), hearingAtSeconds: 10 },
  });
  const started = service.start("start-hearing-background-drain", "ko-KR");
  const spatial = await service.advance({
    runId: started.runId,
    advanceId: "seed-hearing-background-goal",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [0, 0, 0], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const goalWake = spatial.scheduleWakes.find(wake => wake.kind === "goal");
  assert.ok(goalWake);
  const layout = loadRunLayout();
  const preloadPromises = started.actors.slice(0, 3).map(actor => {
    const zone = conversationZoneFor(layout, actor.actorId, actor.locationId);
    assert.ok(zone);
    return service.preloadConversation(started.runId, actor.actorId, zone.zoneId, "ko-KR");
  });
  const preloadResults = Promise.allSettled(preloadPromises);
  await twoEntered.promise;
  const queuedGoal = service.decision({
    runId: started.runId,
    wakeId: goalWake.wakeId,
    observedWorldRevision: goalWake.observedWorldRevision,
  });
  await makeDue(service, started.runId, "due-hearing-background-drain");

  const opened = await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-background-drain",
  });
  assert.equal(opened.action, "open");
  assert.equal(hearingTransportCalls, 0, "opening is local and does not wait on provider work");
  const answer = service.hearing({
    action: "answer",
    runId: started.runId,
    hearingId: "hearing-background-drain",
    turnId: opened.nextTurn.turnId,
    answer: { type: "free_input", text: "최종 진술입니다." },
  });
  await Promise.resolve();
  assert.equal(hearingTransportCalls, 0, "final judgment waits while background calls remain active");
  releaseResidents.resolve();
  const answered = await answer;
  assert.equal(hearingTransportCalls, 1);
  assert.equal(answered.runStatus, "terminal");
  assert.equal(residentTransportCalls, 2);
  assert.equal(goalTransportCalls, 0);
  assert.equal(queuedResidentReachedTransport, false);
  assert.equal((await queuedGoal).status, "stale");

  const settled = await preloadResults;
  const errorCodes = settled.flatMap(result =>
    result.status === "rejected" && result.reason instanceof RunError
      ? [result.reason.code]
      : []
  ).sort();
  assert.deepEqual(errorCodes, [
    "conversation_not_ready",
    "conversation_not_ready",
    "hearing_due",
  ]);
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["scripted", "scripted", "scripted"],
    "two structurally resolved stale openings remain traced, while the cancelled opening adds no fake fallback",
  );
});

test("immediate hearing open reports held live background transport accurately", async () => {
  const entered = deferred();
  const release = deferred();
  const textGen: TextGenPort = {
    adapterId: "held-hearing-audit",
    preflight: async () => ({ available: true }),
    generate: async () => {
      entered.resolve();
      await release.promise;
      return {
        text: JSON.stringify({
          utterance: "방문 목적을 말씀해 주시겠습니까?",
          suggestedReplies: [
            { text: "업무 때문에 왔습니다.", intent: "safe/local" },
            { text: "무엇을 확인하시는 건가요?", intent: "uncertain/repair" },
            { text: "꿈에서 이곳을 봤습니다.", intent: "risky/weird" },
          ],
          continueConversation: true,
        }),
        usage: { inputTokens: 6, outputTokens: 4, totalTokens: 10 },
      };
    },
  };
  const layout = { ...loadRunLayout(), hearingAtSeconds: 10 };
  const service = new RunService({
    proposalPort: new ProviderService({
      profileId: "test/held-hearing-audit",
      textGen,
      fallback: new RuleFallbackNpcAdapter(),
    }),
    idFactory: deterministicIds("held-hearing-audit"),
    layout,
  });
  const started = service.start("start-held-hearing-audit", "ko-KR");
  const actor = started.actors[0];
  assert.ok(actor);
  const zone = conversationZoneFor(layout, actor.actorId, actor.locationId);
  assert.ok(zone);
  const pendingPreload = service
    .preloadConversation(started.runId, actor.actorId, zone.zoneId, "ko-KR")
    .catch(() => undefined);
  await entered.promise;
  const due = await service.advance({
    runId: started.runId,
    advanceId: "due-held-hearing-audit",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(due.clock.hearingDue, true);

  const opened = await service.hearing({
    action: "open",
    runId: started.runId,
    hearingId: "hearing-held-audit",
  });
  assert.equal(opened.providerAudit.complete, false);
  assert.equal(opened.providerAudit.inFlightCalls, 1);
  assert.deepEqual(opened.providerAudit.calls, []);
  assert.deepEqual(opened.providerAudit.resolutions, []);
  assert.deepEqual(opened.providerRuntimeTrace.entries, []);

  release.resolve();
  await pendingPreload;
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

test("hearing excludes prior vouches when their assessments cite no firsthand memory", async () => {
  const service = createService("uncited-prior-vouches", request => ({
    ...proposalFor(request, "ordinary"),
    residentAssessments: request.residents.map(resident => ({
      actorId: resident.actorId,
      contactBasis: hearingContactBasisForMemories(resident.memories),
      proposedStance: resident.stanceBefore,
      testimonyLine: `uncited testimony:${resident.actorId}`,
      citedMemoryIds: [],
    })) as HearingJudgment["residentAssessments"],
  }));
  const started = service.start("start-uncited-prior-vouches", "ko-KR");
  await earnVouches(service, started.runId, 4);
  await makeDue(service, started.runId, "due-uncited-prior-vouches");

  const result = await resolveHearing(
    service,
    started.runId,
    "hearing-uncited-prior-vouches",
  );

  assert.equal(result.terminalResult.evidencedVouchCount, 0);
  assert.equal(result.terminalResult.verdict, "abnormal");
  assert.ok(result.terminalResult.residentAssessments.every(
    assessment => assessment.appliedStance === "uncertain",
  ));
});

test("a never-conversed resident may preserve live oppose testimony when it cites its ambient judgment", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeAndProposeAmbientReply = async request => ({
    proposal: {
      toolCall: { tool: "talk_to", args: { actorId: request.targetActorId } },
      utterance: "그 이야기는 청문회에서도 분명히 말하겠습니다.",
      rationale: "직접 들은 구체적인 말이 방문자에 대한 경계를 키웠습니다.",
      done: true,
      suspicionDelta: 30,
      proposedStance: "oppose",
      whyLine: "관리자에게 들은 설명 때문에 방문자를 경계하게 됐습니다.",
      openQuestion: null,
    },
    meta: { profileId: "scripted/hearing-ambient", transport: "scripted", usedFallback: false },
  });
  adapter.judgeHearing = async request => ({
    proposal: {
      residentAssessments: request.residents.map(resident => {
        const ambient = resident.memories.find(
          memory => memory.kind === "ambient_stance_judgment",
        );
        return {
          actorId: resident.actorId,
          contactBasis: hearingContactBasisForMemories(resident.memories),
          proposedStance: ambient ? "oppose" as const : resident.stanceBefore,
          testimonyLine: ambient
            ? "관리자에게 직접 들은 말을 근거로 방문자를 반대합니다."
            : `직접 판단할 근거가 없습니다:${resident.actorId}`,
          citedMemoryIds: ambient ? [ambient.memoryId] : [],
        };
      }) as HearingJudgment["residentAssessments"],
      proposedVerdict: "abnormal",
      verdictWhyLine: "주민의 실제 기억에 남은 의문이 해소되지 않았습니다.",
      officerLine: "현재 증언으로는 평범하다고 판정할 수 없습니다.",
      citedRecordIds: [],
      citedLedgerEventIds: [],
    },
    meta: { profileId: adapter.profileId, transport: "scripted", usedFallback: false },
  });
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("hearing-ambient-memory"),
    layout: { ...loadRunLayout(), hearingAtSeconds: 100 },
  });
  const started = service.start("start-hearing-ambient-memory", "ko-KR");
  const wake = await readyFirstMeeting(service, started.runId);
  const ambient = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(ambient.status, "completed");
  await makeDue(service, started.runId, "due-hearing-ambient-memory");
  const result = await resolveHearing(
    service,
    started.runId,
    "hearing-ambient-memory",
  );
  const caretaker = result.terminalResult.residentAssessments.find(
    assessment => assessment.actorId === "NPC_Park_Caretaker",
  );
  assert.ok(caretaker);
  assert.equal(caretaker.appliedStance, "oppose");
  assert.equal(caretaker.citedMemoryIds.length, 1);
  assert.equal(
    caretaker.testimonyLine,
    "관리자에게 직접 들은 말을 근거로 방문자를 반대합니다.",
  );
  assert.equal(result.proposalMeta.transport, "scripted");
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
  assert.equal(opened.proposalMeta, null);
  assert.deepEqual(opened.providerRuntimeTrace.entries, []);
  assert.deepEqual(opened.providerAudit.resolutions, []);

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
    ["hearing_verdict"],
  );
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["fallback"],
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

test("RunService warns without prose when a live hearing still needs semantic replacement", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  adapter.judgeHearing = async request => {
    const invalid = proposalFor(request, "abnormal");
    invalid.residentAssessments[0].contactBasis = "meaningful_firsthand";
    return {
      proposal: invalid,
      meta: {
        profileId: "test/direct-live-semantic-invalid",
        transport: "live",
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
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
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  let answered;
  try {
    answered = await service.hearing({
      action: "answer",
      runId: started.runId,
      hearingId: "hearing-semantic-invalid-live",
      turnId: opened.nextTurn.turnId,
      answer: { type: "free_input", text: "제 대화를 확인해 주십시오." },
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(answered.action, "answer");
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => ({
      transport: entry.meta.transport,
      usedFallback: entry.meta.usedFallback,
      fallbackReason: entry.meta.fallbackReason ?? null,
    })),
    [
      { transport: "fallback", usedFallback: true, fallbackReason: "invalid_envelope" },
    ],
  );
  assert.equal(answered.proposalMeta.transport, "fallback");
  assert.equal(answered.proposalMeta.fallbackReason, "invalid_envelope");
  assert.ok(answered.terminalResult.residentAssessments.every(
    assessment => assessment.contactBasis === "never_conversed",
  ));
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.length, 1);
  const warning = warnings[0]?.[0] as Record<string, unknown>;
  assert.deepEqual(Object.keys(warning).sort(), ["category", "event", "reason"]);
  assert.equal(warning.event, "run_hearing_live_semantic_replacement");
  assert.equal(warning.category, "hearing_semantic_validation");
  assert.match(String(warning.reason), /contact basis contradicts/);
  assert.doesNotMatch(JSON.stringify(warning), /제 대화를 확인|provider verdict|provider officer/);
});

test("valid never-conversed contact bases keep a live hearing fallback-free", async () => {
  const textGen: TextGenPort = {
    adapterId: "runtime-fallback-then-live",
    preflight: async () => ({ available: true }),
    generate: async request => {
      const input = JSON.parse(request.input) as {
        residents: Array<{ actorId: string }>;
      };
      return {
        text: JSON.stringify({
          residentAssessments: input.residents.map(resident => ({
            actorId: resident.actorId,
            contactBasis: "never_conversed",
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
  assert.equal(answered.proposalMeta.transport, "live");
  assert.equal(answered.proposalMeta.usedFallback, false);
  assert.ok(answered.terminalResult.residentAssessments.every(
    assessment => assessment.contactBasis === "never_conversed",
  ));
  assert.deepEqual(
    answered.providerRuntimeTrace.entries.map(entry => entry.meta.transport),
    ["live"],
  );
  assert.equal(answered.providerRuntimeTrace.complete, true);
  assert.equal(answered.providerRuntimeTrace.truncated, false);
});

test("never-conversed vouches clamp without replacing live testimony and semantic-invalid or failed providers still terminalize", async () => {
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
      assessment.testimonyLine === `testimony:${assessment.actorId}`,
  ));
  assert.equal(neverMetResult.proposalMeta.transport, "fallback");
  assert.equal(neverMetResult.proposalMeta.fallbackReason, "invalid_envelope");
  assert.equal(neverMetResult.terminalResult.proposalMeta.transport, "fallback");
  assert.equal(neverMetResult.providerRuntimeTrace.entries.at(-1)?.meta.transport, "fallback");

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

test("a caller-reserved mandatory interrogation creates grounded contact without provider evidence", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryNextStep = adapter.proposeNextStep.bind(adapter);
  let interrogationAttempts = 0;
  adapter.proposeNextStep = async request => {
    if (request.observePacket.playerContact?.available) {
      interrogationAttempts += 1;
      throw new ProviderBudgetReservedError();
    }
    return ordinaryNextStep(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds("reserved-interrogation"),
  });
  const started = service.start("start-reserved-interrogation", "ko-KR");
  type MutableRun = {
    institutionalPressure: number;
    ledgerEvents: RunSnapshot["ledgerEvents"];
  };
  const runs = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = runs.get(started.runId);
  assert.ok(internalRun);
  internalRun.institutionalPressure = 90;
  internalRun.ledgerEvents.push({
    eventId: "ledger:reserved-interrogation:1",
    seq: 1,
    kind: "record_written",
    actorId: "NPC_Studio_Manager",
    actorRole: "studio_manager",
    recordId: "record:reserved-interrogation:1",
    sourceMemoryId: "memory:reserved-interrogation:1",
    recordRevision: 1,
    pressureBefore: 65,
    pressureDelta: 25,
    pressureAfter: 90,
    visibleToActorIds: ["player", "NPC_Station_Officer"],
    whyLine: "A recent pressure-bearing record requires a bounded Station interrogation.",
    openQuestion: null,
    worldSeconds: 0,
    worldRevision: started.worldRevision,
  });

  const layout = loadRunLayout();
  const beforeGrounding = service.snapshot(started.runId);
  const actorFacts = spatialActors(beforeGrounding);
  const officer = actorFacts.find(facts => facts.actorId === "NPC_Station_Officer");
  const stationPosition = layout.anchorPositions["Station.officer_spawn"];
  assert.ok(officer);
  assert.ok(stationPosition);
  officer.position = [stationPosition[0], stationPosition[1], stationPosition[2]];
  officer.playerVisible = true;
  officer.playerAudible = true;
  officer.playerReachable = true;
  officer.playerInteractionZoneId = "StationIntakeConversation";
  const grounded = await service.advance({
    runId: started.runId,
    advanceId: "reserved-interrogation-grounding",
    observedWorldRevision: beforeGrounding.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeGrounding.worldRevision,
      player: {
        position: [stationPosition[0], stationPosition[1], stationPosition[2]],
        locationId: "Station",
      },
      actors: actorFacts,
    },
  });
  const wake = grounded.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Station_Officer",
  );
  assert.ok(wake);
  const beforeDecision = service.snapshot(started.runId);
  const request = {
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  };
  const contact = await service.decision(request);
  assert.equal(contact.status, "completed");
  assert.equal(contact.activeContact?.actorId, "NPC_Station_Officer");
  assert.equal(contact.activeContact?.procedure, "interrogation");
  assert.deepEqual(contact.providerMetas, []);
  assert.deepEqual(contact.providerAudit, beforeDecision.providerAudit);
  assert.deepEqual(contact.providerRuntimeTrace, beforeDecision.providerRuntimeTrace);
  assert.deepEqual(contact.speechEvents, []);
  assert.deepEqual(contact.actorReadinessDeltas, []);
  assert.deepEqual(contact.actionDeltas, []);
  assert.deepEqual(contact.movementDeltas, []);
  assert.equal(interrogationAttempts, 1);
  assert.deepEqual(await service.decision(request), contact);
  assert.equal(interrogationAttempts, 1);
});

test("high-pressure Station interrogation is grounded, hesitation-only, survivable, and once per ledger escalation", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const ordinaryNextStep = adapter.proposeNextStep.bind(adapter);
  const ordinaryMergedTurn = adapter.judgeAndProposeConversationTurn.bind(adapter);
  let interrogationAnswerGoals: string[] | null = null;
  adapter.judgeAndProposeConversationTurn = async request => {
    const resolved = await ordinaryMergedTurn(request);
    if (request.playerLine === fallbackContent(request.locale).hesitationMarker) {
      interrogationAnswerGoals = [...request.observePacket.goals];
      resolved.proposal.meaningfulFirsthand = true;
      resolved.proposal.stance = "vouch";
    }
    return resolved;
  };
  let forceBudgetFallback = false;
  let firstInterrogationRequiredToolCall: unknown = null;
  adapter.proposeNextStep = async request => {
    if (
      request.observePacket.playerContact?.available &&
      !forceBudgetFallback &&
      firstInterrogationRequiredToolCall === null
    ) {
      firstInterrogationRequiredToolCall = request.requiredToolCall ?? null;
    }
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
    await groundOrdinaryConversation(
      service,
      started.runId,
      actor.actorId,
      zone.zoneId,
      `ground-interrogation-pressure-${index}`,
    );
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
  assert.equal(contactDecision.providerMetas.at(-1)?.transport, "scripted");
  assert.equal(contactDecision.providerMetas.at(-1)?.usedFallback, false);
  assert.deepEqual(firstInterrogationRequiredToolCall, {
    tool: "move_to",
    targetId: "player",
  });

  const contact = contactDecision.activeContact;
  assert.ok(contact);
  const contactPreload = await service.preloadConversation(
    started.runId,
    contact.actorId,
    contact.interactionZoneId,
    "ko-KR",
  );
  await service.advance({
    runId: started.runId,
    advanceId: "interrogation-contact-spatial-refresh",
    observedWorldRevision: contactPreload.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: contactPreload.worldRevision,
      player: {
        position: [stationPosition[0], stationPosition[1], stationPosition[2]],
        locationId: "Station",
      },
      actors: officerFacts,
    },
  });
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
  assert.ok(interrogationAnswerGoals?.some(goal =>
    goal.includes("Conduct one survivable Station interrogation")
  ));
  assert.equal(interrogationAnswerGoals?.some(goal =>
    goal.includes("Speak face to face with the outsider")
  ), false);
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
  await groundOrdinaryConversation(
    service,
    started.runId,
    liaison.actorId,
    liaisonZone.zoneId,
    "ground-interrogation-escalation",
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
  const traceCountBeforeExhaustion = service.snapshot(started.runId)
    .providerRuntimeTrace.entries.length;
  const reserveContact = await service.decision({
    runId: started.runId,
    wakeId: exhaustedWake.wakeId,
    observedWorldRevision: exhaustedWake.observedWorldRevision,
  });
  assert.equal(reserveContact.activeContact?.procedure, "interrogation");
  assert.equal(reserveContact.providerMetas.at(-1)?.transport, "fallback");
  assert.equal(reserveContact.providerMetas.at(-1)?.fallbackReason, "budget_exhausted");
  assert.equal(
    reserveContact.providerRuntimeTrace.entries.length,
    traceCountBeforeExhaustion + 1,
    "one budget-exhausted provider packet contributes exactly one runtime-trace entry",
  );
});
