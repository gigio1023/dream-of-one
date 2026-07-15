import assert from "node:assert/strict";
import { test } from "bun:test";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import {
  MAX_SOCIAL_SOURCE_EXCERPT_CODE_POINTS,
  normalizeSocialSourceExcerpt,
  RunError,
  RunService,
  STUDIO_RECEPTIONIST_ID,
} from "../../src/runtime/run-service.js";
import {
  runSocialProvenanceSchema,
  type RunActorSpatialFacts,
  type RunMemory,
  type RunSnapshot,
} from "../../src/runtime/run-schema.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-admin-${++counts[prefix]}`;
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

function reportBearingPlayerMemory(memoryId: string): RunMemory {
  return {
    memoryId,
    kind: "player_conversation",
    sourceActorId: "player",
    listenerActorId: STUDIO_RECEPTIONIST_ID,
    conversationId: `${memoryId}:conversation`,
    turnId: `${memoryId}:turn`,
    playerLine: "접수 기록을 위조했습니다.",
    npcLine: "그 말은 그냥 넘길 수 없어요.",
    citedRecords: [],
    signals: [],
    whyLine: "방문자가 기록 위조를 직접 말했다.",
    suspicionBefore: 0,
    suspicionAfter: 25,
    suspicionDelta: 25,
    reportPressureBefore: 0,
    reportPressureAfter: 0,
    reportDelta: 25,
    institutionalPressureDelta: 0,
    proposedStance: "oppose",
    appliedStance: "oppose",
    meaningfulFirsthand: true,
    openQuestion: null,
    worldSeconds: 0,
    worldRevision: 0,
    proposalMeta: {
      profileId: "scripted/studio-reception",
      transport: "scripted",
      usedFallback: false,
    },
  };
}

test("social source excerpts remove unsafe controls and truncate by Unicode code point", () => {
  assert.equal(
    normalizeSocialSourceExcerpt("  first\tsecond\r\nthird  "),
    "first second third",
  );
  assert.equal(
    normalizeSocialSourceExcerpt(
      "A\u0000B\u007fC\u0085D\u061cE\u200eF\u200fG\u202eH\u2066I",
    ),
    "ABCDEFGHI",
  );
  assert.equal(normalizeSocialSourceExcerpt("\u0000\u202e\u2066"), "…");
  const astral = normalizeSocialSourceExcerpt("😀".repeat(200));
  assert.equal([...astral].length, MAX_SOCIAL_SOURCE_EXCERPT_CODE_POINTS);
  assert.equal(astral, `${"😀".repeat(159)}…`);

  const provenance = {
    originKind: "speech" as const,
    originActorId: "player",
    recipientKind: "listener" as const,
    recipientActorId: STUDIO_RECEPTIONIST_ID,
    sourceMemoryId: "mem-source",
    recordId: null,
    recordRevision: null,
    ledgerEventId: null,
    sourceExcerpt: "😀".repeat(160),
    whyLine: "직접 들은 답변입니다.",
  };
  assert.equal(runSocialProvenanceSchema.parse(provenance).sourceExcerpt, provenance.sourceExcerpt);
  assert.throws(() => runSocialProvenanceSchema.parse({
    ...provenance,
    sourceExcerpt: "😀".repeat(161),
  }));
});

test("a report-bearing writable goal asks for an explicit provider choice without forcing a record", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  let administrativeChoices = 0;
  const requests: Parameters<typeof adapter.proposeNextStep>[0][] = [];
  adapter.proposeNextStep = async request => {
    requests.push(structuredClone(request));
    if (
      request.observePacket.actorId === STUDIO_RECEPTIONIST_ID &&
      request.observePacket.administrativeSources.some(source => source.reportDelta !== 0) &&
      request.observePacket.toolCatalog.includes("write_record")
    ) {
      administrativeChoices += 1;
      assert.equal(request.requireToolCall, true);
      assert.equal(request.administrativeDecisionSpeech, true);
      assert.deepEqual(request.observePacket.toolCatalog, ["write_record", "wait"]);
      assert.match(request.goal, /report-inclination change of 25/);
      assert.match(request.goal, /A positive change favors preserving/);
      assert.match(request.goal, /concrete role policy justify changing course/);
      return {
        proposal: {
          toolCall: {
            tool: "wait",
            args: {
              reason: "외부 확인 전까지는 이 진술을 기록하지 않고 보류하겠습니다.",
            },
          },
          utterance: null,
          citedRecordIds: [],
          rationale: "접수 담당자의 확인 정책 때문에 이번 단독 진술은 보류합니다.",
          done: true,
        },
        meta: {
          profileId: adapter.profileId,
          transport: "scripted",
          usedFallback: false,
        },
      };
    }
    return originalNextStep(request);
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const started = service.start("admin-provider-declines", "ko-KR");
  type MutableActor = { locationId: string; memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const receptionist = internalRuns.get(started.runId)?.actors.get(STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  receptionist.locationId = "";
  receptionist.memories.push(reportBearingPlayerMemory("admin-provider-declines:source"));
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "admin-provider-declines:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(started),
    },
  });
  const parkWake = advanced.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(parkWake);
  const parkDecision = await service.decision({
    runId: started.runId,
    wakeId: parkWake.wakeId,
    observedWorldRevision: parkWake.observedWorldRevision,
  });
  assert.equal(parkDecision.status, "completed");
  assert.equal(administrativeChoices, 0, "no writable surface means no forced record choice");

  receptionist.locationId = "Studio";
  const beforeSurface = service.snapshot(started.runId);
  const atSurface = await service.advance({
    runId: started.runId,
    advanceId: "admin-provider-declines:writable-surface",
    observedWorldRevision: beforeSurface.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeSurface.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(beforeSurface),
    },
  });
  const writableWake = atSurface.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(writableWake, "gaining a writable surface re-admits the pending report decision once");
  const resolved = await service.decision({
    runId: started.runId,
    wakeId: writableWake.wakeId,
    observedWorldRevision: writableWake.observedWorldRevision,
  });
  assert.equal(resolved.status, "completed");
  assert.equal(administrativeChoices, 1);
  assert.equal(resolved.speechEvents.length, 1);
  assert.equal(
    resolved.speechEvents[0]?.line,
    "외부 확인 전까지는 이 진술을 기록하지 않고 보류하겠습니다.",
  );
  assert.deepEqual(resolved.speechEvents[0]?.listenerActorIds, []);
  assert.equal(resolved.actionDeltas[0]?.kind, "speech");
  assert.ok(resolved.actionDeltas.some(delta => delta.kind === "readiness"));
  let snapshot = service.snapshot(started.runId);
  assert.deepEqual(snapshot.records, []);
  assert.deepEqual(snapshot.ledgerEvents, []);
  assert.equal(snapshot.institutionalPressure, 0);

  const quietAfterAnnouncement = await service.advance({
    runId: started.runId,
    advanceId: "admin-provider-declines:announcement-settled",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(snapshot),
    },
  });
  assert.ok(quietAfterAnnouncement.scheduleWakes.every(
    candidate => candidate.kind !== "goal" || candidate.actorIds[0] !== STUDIO_RECEPTIONIST_ID,
  ));
  snapshot = service.snapshot(started.runId);

  receptionist.memories.push({
    memoryId: "admin-provider-declines:later-contact",
    kind: "player_contact_outcome",
    sourceActorId: "player",
    listenerActorId: STUDIO_RECEPTIONIST_ID,
    contactId: "admin-provider-declines:later-contact",
    outcome: "not_engaged",
    contactReason: "방문자가 나중의 질문에는 응하지 않았습니다.",
    interactionZoneId: "StudioReceptionConversation",
    originAnchorRef: "Studio.reception",
    worldSeconds: snapshot.worldClock.elapsedSeconds,
    worldRevision: snapshot.worldRevision,
  });
  const reconsidered = await service.advance({
    runId: started.runId,
    advanceId: "admin-provider-declines:later-semantic-event",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(snapshot),
    },
  });
  const laterWake = reconsidered.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(laterWake, "a genuinely new memory still admits ordinary resident work");
  const laterDecision = await service.decision({
    runId: started.runId,
    wakeId: laterWake.wakeId,
    observedWorldRevision: laterWake.observedWorldRevision,
  });
  assert.equal(laterDecision.status, "completed");
  assert.equal(administrativeChoices, 1, "the same declined source is never reconsidered");
  const laterRequest = requests.at(-1);
  assert.ok(laterRequest);
  assert.ok(laterRequest.observePacket.administrativeSources.every(
    source => source.memoryId !== "admin-provider-declines:source",
  ));
  assert.ok(laterRequest.observePacket.actorMemory.ownActionNotes.some(
    note =>
      note.includes("administrative_wait") &&
      note.includes("admin-provider-declines:source") &&
      note.includes("기록하지 않고 보류하겠습니다"),
  ));

  receptionist.locationId = "";
  const beforeLeaving = service.snapshot(started.runId);
  const leftSurface = await service.advance({
    runId: started.runId,
    advanceId: "admin-provider-declines:left-surface",
    observedWorldRevision: beforeLeaving.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeLeaving.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(beforeLeaving),
    },
  });
  assert.ok(leftSurface.scheduleWakes.every(
    candidate => candidate.kind !== "goal" || candidate.actorIds[0] !== STUDIO_RECEPTIONIST_ID,
  ));
});

test("one stale administrative choice retries after the scene settles, then stays final", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  let administrativeCalls = 0;
  let markStarted: (() => void) | null = null;
  const providerStarted = new Promise<void>(resolve => {
    markStarted = resolve;
  });
  let releaseProvider: (() => void) | null = null;
  const providerReleased = new Promise<void>(resolve => {
    releaseProvider = resolve;
  });
  adapter.proposeNextStep = async request => {
    const source = request.observePacket.administrativeSources.find(
      candidate => candidate.reportDelta !== 0,
    );
    if (!source) return originalNextStep(request);
    administrativeCalls += 1;
    if (administrativeCalls === 1) {
      markStarted?.();
      await providerReleased;
    }
    return {
      proposal: {
        toolCall: { tool: "wait", args: { reason: "이 출처는 기록하지 않기로 최종 판단했습니다." } },
        utterance: null,
        citedRecordIds: [],
        rationale: "기록으로 남길 근거가 충분하지 않습니다.",
        done: true,
      },
      meta: {
        profileId: adapter.profileId,
        transport: "scripted" as const,
        usedFallback: false,
      },
    };
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const started = service.start("admin-stale-retry", "ko-KR");
  type MutableActor = { memories: RunMemory[] };
  type MutableRun = { actors: Map<string, MutableActor> };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const receptionist = internalRuns.get(started.runId)?.actors.get(STUDIO_RECEPTIONIST_ID);
  assert.ok(receptionist);
  receptionist.memories.push(reportBearingPlayerMemory("admin-stale-retry:source"));

  const initialActors = spatialActors(started);
  const initial = await service.advance({
    runId: started.runId,
    advanceId: "admin-stale-retry:initial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: initialActors,
    },
  });
  const firstWake = initial.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(firstWake);
  const firstDecision = service.decision({
    runId: started.runId,
    wakeId: firstWake.wakeId,
    observedWorldRevision: firstWake.observedWorldRevision,
  });
  await providerStarted;

  const changedActors = initialActors.map(actor => structuredClone(actor));
  const changedReceptionist = changedActors.find(
    actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(changedReceptionist);
  changedReceptionist.visibleActorIds = ["NPC_Studio_Manager"];
  const changed = await service.advance({
    runId: started.runId,
    advanceId: "admin-stale-retry:changed-during-provider",
    observedWorldRevision: initial.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: initial.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  assert.ok(changed.scheduleWakes.every(
    candidate => candidate.kind !== "goal" || candidate.actorIds[0] !== STUDIO_RECEPTIONIST_ID,
  ));
  releaseProvider?.();
  const stale = await firstDecision;
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.actionDeltas, []);

  const beforeRetry = service.snapshot(started.runId);
  const retried = await service.advance({
    runId: started.runId,
    advanceId: "admin-stale-retry:settled",
    observedWorldRevision: beforeRetry.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeRetry.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  const retryWake = retried.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(retryWake, "a stale administrative choice gets one event-driven retry");
  const completed = await service.decision({
    runId: started.runId,
    wakeId: retryWake.wakeId,
    observedWorldRevision: retryWake.observedWorldRevision,
  });
  assert.equal(completed.status, "completed");
  assert.equal(administrativeCalls, 2);
  assert.equal(completed.speechEvents.length, 1);
  assert.equal(completed.speechEvents[0]?.line, "이 출처는 기록하지 않기로 최종 판단했습니다.");
  assert.equal(completed.actionDeltas[0]?.kind, "speech");
  assert.ok(completed.actionDeltas.some(delta => delta.kind === "readiness"));

  const settled = service.snapshot(started.runId);
  const unchanged = await service.advance({
    runId: started.runId,
    advanceId: "admin-stale-retry:unchanged",
    observedWorldRevision: settled.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: settled.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: changedActors,
    },
  });
  assert.ok(unchanged.scheduleWakes.every(
    candidate => candidate.kind !== "goal" || candidate.actorIds[0] !== STUDIO_RECEPTIONIST_ID,
  ));
  assert.equal(administrativeCalls, 2);
});

test("provider-owned administration is sourced, clamped, exactly-once, and disclosed only on encounter", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const originalNextStep = adapter.proposeNextStep.bind(adapter);
  const administrativeRequests: Parameters<typeof adapter.proposeNextStep>[0][] = [];
  adapter.proposeNextStep = async request => {
    if (request.observePacket.administrativeSources.some(source => source.reportDelta !== 0)) {
      administrativeRequests.push(structuredClone(request));
    }
    const resolved = await originalNextStep(request);
    const derivedSource = request.observePacket.administrativeSources.find(
      source => source.kind === "record_read",
    );
    const derivedVisibleRecordId = request.observePacket.visibleRecords[0]?.recordId;
    const derivedRecordKind = request.observePacket.administrativeAuthority.allowedRecordKinds[0];
    const derivedSurfaceId = request.observePacket.administrativeAuthority.writableTextSurfaceIds[0];
    if (derivedSource && derivedRecordKind && derivedSurfaceId) {
      resolved.proposal = {
        toolCall: {
          tool: "write_record",
          args: {
            recordKind: derivedRecordKind,
            sourceMemoryId: derivedSource.memoryId,
            stateBody: "관리자가 읽은 접수 기록을 후속 확인 기록으로 전파했습니다.",
            whyLine: "같은 접수 근거를 후속 확인 기록으로 남기겠습니다.",
            institutionalPressureDelta: 25,
            textSurfaceId: derivedSurfaceId,
            openQuestion: null,
          },
        },
        citedRecordIds: derivedVisibleRecordId ? [derivedVisibleRecordId] : [],
        rationale: "읽은 기록을 권한 안에서 후속 기록으로 전파합니다.",
        done: true,
      };
      return resolved;
    }
    if (resolved.proposal.toolCall?.tool === "write_record") {
      resolved.proposal.toolCall.args.institutionalPressureDelta = 999;
    }
    return resolved;
  };
  const service = new RunService({
    proposalPort: adapter,
    idFactory: deterministicIds(),
  });
  const started = service.start("admin-start", "ko-KR");
  assert.deepEqual(started.socialView.encounteredResidents, []);
  const preloaded = await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ground-administration-source",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  assert.deepEqual(conversation.socialView.encounteredResidents, []);
  const answered = await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: conversation.nextTurn.choices[2].choiceId },
  );
  assert.equal(answered.judgment.reportDelta, 15);
  assert.equal(answered.judgment.institutionalPressureDelta, 0);
  assert.equal(answered.socialView.encounteredResidents.length, 1);
  assert.equal(
    answered.socialView.encounteredResidents[0]?.provenance?.sourceExcerpt,
    answered.memoryDelta.playerLine,
  );
  assert.equal(answered.socialView.openQuestions[0]?.text, "이 방문자는 왜 마을 절차를 전혀 모르는가?");
  assert.equal(
    answered.socialView.openQuestions[0]?.provenance.sourceExcerpt,
    answered.memoryDelta.playerLine,
  );
  assert.ok(answered.nextTurn);
  const recovered = await service.answer(
    started.runId,
    conversation.sessionId,
    answered.nextTurn.turnId,
    { type: "free_input", text: "안내받은 절차를 확인하러 왔습니다." },
  );
  assert.equal(recovered.nextTurn, null);
  const beforeEnd = service.snapshot(started.runId);
  assert.equal(beforeEnd.institutionalPressure, 0);
  assert.equal(beforeEnd.ledgerEvents.length, 0);
  await service.endConversation(started.runId, conversation.sessionId);

  const beforeFacts = service.snapshot(started.runId);
  const facts = spatialActors(beforeFacts);
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-1",
    observedWorldRevision: beforeFacts.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: beforeFacts.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: facts,
    },
  });
  const wake = advanced.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(wake);
  const written = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  const retry = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.deepEqual(retry, written);
  const adminDelta = written.actionDeltas.find(
    delta => delta.kind === "administration",
  );
  assert.ok(adminDelta && adminDelta.kind === "administration");
  const administrativeRequest = administrativeRequests.find(
    request => request.observePacket.actorId === STUDIO_RECEPTIONIST_ID,
  );
  assert.ok(administrativeRequest);
  assert.deepEqual(administrativeRequest.observePacket.toolCatalog, ["write_record", "wait"]);
  assert.deepEqual(administrativeRequest.allowedTalkActorIds, []);
  assert.match(administrativeRequest.goal, /report-inclination change of 15/);
  assert.match(administrativeRequest.goal, /Generic delay or generic insufficient-evidence/);
  assert.match(administrativeRequest.goal, /never a deterministic mandate to write/);
  assert.equal(adminDelta.action, "write_record");
  assert.equal(written.speechEvents.length, 1);
  assert.equal(
    written.speechEvents[0]?.line,
    adminDelta.ledgerEvent.whyLine,
    "the committed write branch and its world subtitle have one source of truth",
  );
  assert.equal(adminDelta.ledgerEvent.sourceMemoryId, answered.memoryDelta.memoryId);
  assert.equal(adminDelta.ledgerEvent.pressureDelta, 25);
  assert.equal(adminDelta.ledgerEvent.openQuestion?.text, "접수 기록에 남은 방문 경위는 무엇인가?");
  const hidden = service.snapshot(started.runId);
  assert.equal(hidden.records.length, 1);
  assert.equal(hidden.ledgerEvents.length, 1);
  assert.equal(hidden.institutionalPressure, 25);
  assert.equal(
    hidden.actors[0]?.stance,
    "vouch",
    "the immediate recovery turn may repair stance without erasing the earlier pressure source",
  );
  assert.equal(hidden.socialView.pressure.band, "low", "hidden administration must not leak");
  assert.deepEqual(hidden.socialView.encounteredRecords, []);
  assert.ok(hidden.socialView.openQuestions.every(
    question => !question.questionId.startsWith("question:record:"),
  ));

  // Corrupted legacy state must never make disclosure guess a hidden source.
  // Exercise the projection seam directly so duplicate references, a memory-id
  // collision in another resident, and a missing/ambiguous author memory all
  // fall back to the record body that this surface already exposes.
  type MutableMemory = {
    memoryId: string;
    kind: string;
    playerLine?: string;
    [key: string]: unknown;
  };
  type MutableActor = { actorId: string; memories: MutableMemory[] };
  type MutableRecord = {
    recordId: string;
    authorActorId: string;
    stateBody: string;
    sourceRefs: Array<{ sourceMemoryId: string; originActorId: string }>;
  };
  type MutableLedgerEvent = { eventId: string; sourceMemoryId: string };
  type MutableRun = {
    actors: Map<string, MutableActor>;
    records: MutableRecord[];
    ledgerEvents: MutableLedgerEvent[];
  };
  const internalRuns = Reflect.get(service, "runs") as Map<string, MutableRun>;
  const internalRun = internalRuns.get(started.runId);
  assert.ok(internalRun);
  const internalRecord = internalRun.records.find(
    record => record.recordId === adminDelta.record.recordId,
  );
  const internalEvent = internalRun.ledgerEvents.find(
    event => event.eventId === adminDelta.ledgerEvent.eventId,
  );
  const author = internalRun.actors.get(adminDelta.record.authorActorId);
  const foreignActor = [...internalRun.actors.values()].find(
    actor => actor.actorId !== adminDelta.record.authorActorId,
  );
  assert.ok(internalRecord && internalEvent && author && foreignActor);
  const sourceIndex = author.memories.findIndex(
    memory => memory.memoryId === adminDelta.ledgerEvent.sourceMemoryId,
  );
  assert.notEqual(sourceIndex, -1);
  const sourceMemory = author.memories[sourceIndex];
  assert.ok(sourceMemory);
  const projectExcerpt = Reflect.get(service, "recordSourceExcerpt").bind(service) as (
    run: MutableRun,
    record: MutableRecord,
    event: MutableLedgerEvent,
  ) => string;
  const foreignCollision = structuredClone(sourceMemory);
  foreignCollision.playerLine = "숨겨진 다른 주민의 잘못된 기억";
  foreignActor.memories.push(foreignCollision);
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), answered.memoryDelta.playerLine);
  foreignActor.memories.pop();

  internalRecord.sourceRefs.push(structuredClone(internalRecord.sourceRefs[0]));
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  internalRecord.sourceRefs.pop();

  const [removedSource] = author.memories.splice(sourceIndex, 1);
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  assert.ok(removedSource);
  author.memories.splice(sourceIndex, 0, removedSource);
  author.memories.push(structuredClone(removedSource));
  assert.equal(projectExcerpt(internalRun, internalRecord, internalEvent), internalRecord.stateBody);
  author.memories.pop();

  const layout = loadRunLayout();
  const surface = layout.recordSurfaces.find(candidate => candidate.surfaceId === "TS_Studio_ReviewRecords");
  assert.ok(surface);
  const position = layout.anchorPositions[surface.anchorRef];
  assert.ok(position);
  const worldRevisionBeforeEncounter = hidden.worldRevision;
  const disclosed = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-1",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.equal(disclosed.socialView.encounteredRecords.length, 1);
  assert.equal(disclosed.socialView.pressure.band, "raised");
  assert.equal(
    disclosed.socialView.pressure.latestEncounteredWhyLine,
    adminDelta.ledgerEvent.whyLine,
  );
  const firstDisclosedRecord = disclosed.socialView.encounteredRecords[0];
  assert.ok(firstDisclosedRecord);
  assert.equal(firstDisclosedRecord.lastLedgerEventId, adminDelta.ledgerEvent.eventId);
  assert.equal(firstDisclosedRecord.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(firstDisclosedRecord.provenance.recipientActorId, "player");
  assert.equal(firstDisclosedRecord.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  const recordQuestionId = `question:record:${adminDelta.record.recordId}`;
  const firstRecordQuestion = disclosed.socialView.openQuestions.find(
    question => question.questionId === recordQuestionId,
  );
  assert.equal(firstRecordQuestion?.text, "접수 기록에 남은 방문 경위는 무엇인가?");
  assert.equal(firstRecordQuestion?.provenance.ledgerEventId, adminDelta.ledgerEvent.eventId);
  assert.equal(firstRecordQuestion?.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(service.snapshot(started.runId).worldRevision, worldRevisionBeforeEncounter);
  const disclosedRetry = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-1",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.deepEqual(disclosedRetry, disclosed);
  await assert.rejects(
    service.encounter({
      runId: started.runId,
      encounterId: "record-encounter-far",
      encounter: {
        kind: "record_surface",
        textSurfaceId: surface.surfaceId,
        playerPosition: [position[0] + 100, position[1], position[2]],
      },
    }),
    (error: unknown) => error instanceof RunError && error.code === "encounter_not_visible",
  );

  // The manager's stale pre-record wake cannot read current facts. A fresh
  // record-version goal reads once; its next retry wake produces no mutation.
  const initialManagerWake = [
    ...advanced.scheduleWakes,
    ...service.snapshot(started.runId).scheduler.pendingWakes,
  ].find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(initialManagerWake);
  const stale = await service.decision({
    runId: started.runId,
    wakeId: initialManagerWake.wakeId,
    observedWorldRevision: initialManagerWake.observedWorldRevision,
  });
  assert.equal(stale.status, "stale");
  const afterWrite = service.snapshot(started.runId);
  const refreshed = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-2",
    observedWorldRevision: afterWrite.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: afterWrite.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(afterWrite),
    },
  });
  const readWake = refreshed.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(readWake);
  const read = await service.decision({
    runId: started.runId,
    wakeId: readWake.wakeId,
    observedWorldRevision: readWake.observedWorldRevision,
  });
  const readDelta = read.actionDeltas.find(
    delta => delta.kind === "administration" && delta.action === "read_record",
  );
  assert.ok(readDelta && readDelta.kind === "administration");
  assert.equal(
    readDelta.ledgerEvent.pressureDelta,
    0,
    "reading an already-positive evidence root cannot mint more pressure",
  );
  assert.equal(
    readDelta.ledgerEvent.openQuestion?.text,
    "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?",
  );
  assert.equal(readDelta.record.recordRevision, adminDelta.record.recordRevision);
  assert.notEqual(readDelta.record.lastLedgerEventId, adminDelta.record.lastLedgerEventId);
  assert.equal(readDelta.record.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  const afterRead = service.snapshot(started.runId);
  assert.equal(afterRead.ledgerEvents.length, 2);
  assert.equal(afterRead.institutionalPressure, 25);
  assert.equal(afterRead.records[0]?.recordRevision, adminDelta.record.recordRevision);
  assert.equal(afterRead.records[0]?.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  assert.deepEqual(
    afterRead.socialView,
    disclosed.socialView,
    "offscreen record reading must remain hidden until the player inspects again",
  );
  const manager = afterRead.actors.find(actor => actor.actorId === "NPC_Studio_Manager");
  assert.ok(manager?.memories.some(memory => memory.kind === "record_read"));
  assert.equal(manager?.stance, "uncertain", "record reading cannot move stance");

  const redisclosed = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-after-read",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  const redisclosedRecord = redisclosed.socialView.encounteredRecords[0];
  assert.ok(redisclosedRecord);
  assert.equal(redisclosedRecord.recordRevision, firstDisclosedRecord.recordRevision);
  assert.equal(redisclosedRecord.lastLedgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(redisclosedRecord.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(redisclosedRecord.provenance.recipientActorId, "NPC_Studio_Manager");
  assert.equal(redisclosedRecord.provenance.sourceMemoryId, readDelta.ledgerEvent.sourceMemoryId);
  assert.equal(redisclosedRecord.provenance.ledgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(redisclosedRecord.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(
    redisclosed.socialView.pressure.latestEncounteredWhyLine,
    readDelta.ledgerEvent.whyLine,
  );
  const readQuestion = redisclosed.socialView.openQuestions.find(
    question => question.questionId === recordQuestionId,
  );
  assert.equal(readQuestion?.text, "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?");
  assert.equal(readQuestion?.provenance.originActorId, STUDIO_RECEPTIONIST_ID);
  assert.equal(readQuestion?.provenance.recipientActorId, "NPC_Studio_Manager");
  assert.equal(readQuestion?.provenance.sourceMemoryId, readDelta.ledgerEvent.sourceMemoryId);
  assert.equal(readQuestion?.provenance.ledgerEventId, readDelta.ledgerEvent.eventId);
  assert.equal(readQuestion?.provenance.sourceExcerpt, answered.memoryDelta.playerLine);
  assert.equal(redisclosed.socialView.revision, disclosed.socialView.revision + 1);
  const repeatedInspection = await service.encounter({
    runId: started.runId,
    encounterId: "record-encounter-after-read-repeat",
    encounter: {
      kind: "record_surface",
      textSurfaceId: surface.surfaceId,
      playerPosition: [position[0], position[1], position[2]],
    },
  });
  assert.deepEqual(repeatedInspection.socialView, redisclosed.socialView);

  const rereadAdvance = await service.advance({
    runId: started.runId,
    advanceId: "admin-facts-3",
    observedWorldRevision: afterRead.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: afterRead.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: spatialActors(afterRead),
    },
  });
  const rereadWake = rereadAdvance.scheduleWakes.find(
    candidate => candidate.kind === "goal" && candidate.actorIds[0] === "NPC_Studio_Manager",
  );
  assert.ok(rereadWake);
  const derivedWrite = await service.decision({
    runId: started.runId,
    wakeId: rereadWake.wakeId,
    observedWorldRevision: rereadWake.observedWorldRevision,
  });
  const derivedDelta = derivedWrite.actionDeltas.find(
    delta => delta.kind === "administration" && delta.action === "write_record",
  );
  assert.ok(derivedDelta && derivedDelta.kind === "administration");
  assert.equal(derivedDelta.ledgerEvent.pressureDelta, 0);
  assert.equal(derivedDelta.ledgerEvent.sourceMemoryId, manager.memories.find(
    memory => memory.kind === "record_read"
  )?.memoryId);
  const afterDerivedWrite = service.snapshot(started.runId);
  assert.equal(afterDerivedWrite.ledgerEvents.length, 3);
  assert.equal(afterDerivedWrite.institutionalPressure, 25);
  assert.equal(afterDerivedWrite.records.length, 2, "record propagation remains legal");
});
