import assert from "node:assert/strict";
import { test } from "bun:test";
import type {
  ProviderFailureReason,
  TextGenPort,
  TextGenRequest,
  TextGenResult,
} from "../../src/providers/ports.js";
import { ProviderService } from "../../src/providers/service.js";
import { RunError, RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import type {
  RunAdvanceResponse,
  RunNpcDecisionRequest,
  RunScheduleWake,
  RunSnapshot,
} from "../../src/runtime/run-schema.js";
import { runSpatialActors } from "./run-spatial-test-helpers.js";

const STUDIO_ZONE_ID = "StudioReceptionConversation";
const LIVE_PROFILE_ID = "test/provider-evidence-live";

const liveOpening = JSON.stringify({
  utterance: "방문 목적을 말씀해 주시면 접수 절차를 확인하겠습니다.",
  suggestedReplies: [
    { text: "안내받은 절차를 확인하러 왔습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
    { text: "먼저 필요한 절차를 설명해 주세요.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
    { text: "그냥 지나가다 들어왔습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
  ],
  continueConversation: true,
});

const liveWait = JSON.stringify({
  toolCall: null,
  utterance: null,
  rationale: "현재 확인할 새로운 사실이 없어 이 자리에서 기다립니다.",
  done: true,
});

const liveMeetingOpening = JSON.stringify({
  toolCall: {
    tool: "talk_to",
    args: { actorId: "NPC_Park_Caretaker" },
  },
  utterance: "오늘 공원 일정에서 함께 확인할 일이 있는지 말씀해 주세요.",
  rationale: "함께 도착한 관리인에게 현재 일정을 직접 확인합니다.",
  done: true,
});

const liveMeetingReply = JSON.stringify({
  toolCall: {
    tool: "talk_to",
    args: { actorId: "NPC_Studio_Manager" },
  },
  utterance: "지금은 예정된 관리 일정을 그대로 이어 가면 됩니다.",
  rationale: "직접 들은 일정 확인에 사실대로 한 번 답합니다.",
  done: true,
  suspicionDelta: 0,
  proposedStance: "uncertain",
  whyLine: "방문자에 관한 새로운 근거를 들은 대화가 아니어서 판단을 유지합니다.",
  openQuestion: null,
});

function deterministicIds(label: string) {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-${label}-${++counts[prefix]}`;
}

class SequencedTextGen implements TextGenPort {
  readonly adapterId = "test/provider-evidence-textgen";
  readonly requests: TextGenRequest[] = [];

  constructor(private readonly outputs: TextGenResult[]) {}

  async preflight(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    this.requests.push(structuredClone(request));
    const output = this.outputs.shift();
    if (!output) throw new Error(`missing test output for ${request.purpose}`);
    return structuredClone(output);
  }
}

class DeferredTextGen implements TextGenPort {
  readonly adapterId = "test/provider-evidence-deferred";
  readonly requests: TextGenRequest[] = [];
  private resolveStarted!: () => void;
  private resolveOutput!: (output: TextGenResult) => void;
  readonly started = new Promise<void>(resolve => {
    this.resolveStarted = resolve;
  });
  private readonly output = new Promise<TextGenResult>(resolve => {
    this.resolveOutput = resolve;
  });

  async preflight(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    this.requests.push(structuredClone(request));
    this.resolveStarted();
    return structuredClone(await this.output);
  }

  finish(text: string): void {
    this.resolveOutput({
      text,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
  }
}

class RecoveringTextGen implements TextGenPort {
  readonly adapterId = "test/provider-evidence-unavailable";
  available = false;
  readonly requests: TextGenRequest[] = [];

  async preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    return this.available
      ? { available: true }
      : { available: false, reason: "missing_credentials" };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    this.requests.push(structuredClone(request));
    return output(liveWait, 5, 5);
  }
}

function liveProvider(textGen: TextGenPort): ProviderService {
  return new ProviderService({
    profileId: LIVE_PROFILE_ID,
    textGen,
    timeoutMs: 2_000,
    maxCallsPerSession: 120,
    maxTokensPerSession: 250_000,
    maxOutputTokensPerCall: 1_600,
  });
}

function output(text: string, inputTokens: number, outputTokens: number): TextGenResult {
  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}

async function readyFirstMeeting(
  service: RunService,
  startId: string,
): Promise<{
  started: RunSnapshot;
  ready: RunAdvanceResponse;
  wake: RunScheduleWake;
  request: RunNpcDecisionRequest;
}> {
  const started = service.start(startId, "ko-KR");
  let revision = started.worldRevision;
  let ready: RunAdvanceResponse | null = null;
  for (let step = 1; step <= 9; step += 1) {
    ready = await service.advance({
      runId: started.runId,
      advanceId: `${startId}:clock:${step}`,
      observedWorldRevision: revision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    revision = ready.worldRevision;
    if (ready.movementDeltas.length > 0) {
      ready = await service.advance({
        runId: started.runId,
        advanceId: `${startId}:clock:${step}:arrivals`,
        observedWorldRevision: revision,
        elapsedSeconds: 0,
        arrivals: ready.movementDeltas.map(movement => ({
          movementId: movement.movementId,
          actorId: movement.actorId,
          anchorRef: movement.targetAnchorRef,
        })),
      });
      revision = ready.worldRevision;
    }
  }
  assert.ok(ready);
  const wake = [
    ...ready.scheduleWakes,
    ...service.snapshot(started.runId).scheduler.pendingWakes,
  ].find(candidate => candidate.kind === "meeting_ready");
  assert.ok(wake);
  return {
    started,
    ready,
    wake,
    request: {
      runId: started.runId,
      wakeId: wake.wakeId,
      observedWorldRevision: wake.observedWorldRevision,
    },
  };
}

test("provider-bearing preload and goal responses expose fresh cumulative evidence and retry bytes", async () => {
  const textGen = new SequencedTextGen([
    output(liveOpening, 20, 10),
    output(liveWait, 18, 6),
  ]);
  const service = new RunService({
    proposalPort: liveProvider(textGen),
    idFactory: deterministicIds("response-evidence"),
  });
  const started = service.start("provider-response-evidence", "ko-KR");

  const preloaded = await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(preloaded.providerAudit.calls.length, 1);
  assert.equal(preloaded.providerAudit.calls[0]?.purpose, "conversation");
  assert.equal(preloaded.providerRuntimeTrace.entries.length, 1);
  assert.equal(preloaded.providerRuntimeTrace.entries[0]?.meta.transport, "live");
  const preloadRetry = await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  assert.equal(JSON.stringify(preloadRetry), JSON.stringify(preloaded));
  assert.equal(textGen.requests.length, 1, "a cached opening retry cannot call the provider");

  const current = service.snapshot(started.runId);
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "provider-response-evidence:spatial",
    observedWorldRevision: current.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: current.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: runSpatialActors(current),
    },
  });
  const goalWake = advanced.scheduleWakes.find(candidate => candidate.kind === "goal");
  assert.ok(goalWake);
  const request = {
    runId: started.runId,
    wakeId: goalWake.wakeId,
    observedWorldRevision: goalWake.observedWorldRevision,
  };
  const decided = await service.decision(request);
  assert.equal(decided.status, "completed");
  assert.equal(decided.providerAudit.calls.length, 2);
  assert.equal(decided.providerAudit.calls.at(-1)?.purpose, "agent_step");
  assert.equal(decided.providerRuntimeTrace.entries.length, 2);
  assert.equal(decided.providerRuntimeTrace.entries.at(-1)?.meta.transport, "live");
  const decisionRetry = await service.decision(request);
  assert.equal(JSON.stringify(decisionRetry), JSON.stringify(decided));
  assert.equal(textGen.requests.length, 2, "a terminal decision retry must be byte-stable");
});

test("meeting decision returns both physical calls and both consumed runtime metas immediately", async () => {
  const textGen = new SequencedTextGen([
    output(liveMeetingOpening, 24, 9),
    output(liveMeetingReply, 28, 12),
  ]);
  const service = new RunService({
    proposalPort: liveProvider(textGen),
    idFactory: deterministicIds("meeting-evidence"),
  });
  const meeting = await readyFirstMeeting(service, "provider-meeting-evidence");
  const response = await service.decision(meeting.request);

  assert.equal(response.status, "completed");
  assert.equal(response.speechEvents.length, 2);
  assert.deepEqual(
    response.providerAudit.calls.map(call => call.purpose),
    ["agent_step", "ambient_reply"],
  );
  assert.deepEqual(
    response.providerAudit.resolutions.map(resolution => resolution.purpose),
    ["agent_step", "ambient_reply"],
  );
  assert.equal(response.providerRuntimeTrace.entries.length, 2);
  assert.ok(response.providerRuntimeTrace.entries.every(
    entry => entry.meta.profileId === LIVE_PROFILE_ID && entry.meta.transport === "live",
  ));
  const retry = await service.decision(meeting.request);
  assert.equal(JSON.stringify(retry), JSON.stringify(response));
  assert.equal(textGen.requests.length, 2);
});

test("a live preload holds route cadence through provider latency and a bounded ready grace", async () => {
  const textGen = new DeferredTextGen();
  const service = new RunService({
    proposalPort: liveProvider(textGen),
    idFactory: deterministicIds("held-preload-evidence"),
  });
  const started = service.start("provider-held-preload-evidence", "ko-KR");
  const pending = service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    STUDIO_ZONE_ID,
    "ko-KR",
  );
  await textGen.started;

  for (let step = 1; step <= 8; step += 1) {
    const snapshot = service.snapshot(started.runId);
    await service.advance({
      runId: started.runId,
      advanceId: `provider-held-preload-evidence:clock:${step}`,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
    const receptionist = service.snapshot(started.runId).scheduler.actors.find(
      actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
    );
    assert.equal(receptionist?.pendingMovement, null);
  }
  textGen.finish(liveOpening);
  const preloaded = await pending;
  assert.equal(preloaded.actor.playerConversationReady, true);

  let snapshot = service.snapshot(started.runId);
  assert.equal(snapshot.providerAudit.calls.length, 1);
  assert.equal(snapshot.providerAudit.resolutions.length, 1);
  assert.equal(snapshot.providerRuntimeTrace.entries.length, 1);
  assert.equal(snapshot.providerRuntimeTrace.entries[0]?.meta.transport, "live");
  assert.equal(snapshot.actors.find(
    actor => actor.actorId === STUDIO_RECEPTIONIST_ID,
  )?.playerConversationReady, true);
  assert.equal(textGen.requests.length, 1);

  const withinGrace = await service.advance({
    runId: started.runId,
    advanceId: "provider-held-preload-evidence:ready-grace",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.ok(withinGrace.movementDeltas.every(
    movement => movement.actorId !== STUDIO_RECEPTIONIST_ID,
  ));
  snapshot = service.snapshot(started.runId);
  const afterGrace = await service.advance({
    runId: started.runId,
    advanceId: "provider-held-preload-evidence:released",
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 10,
    arrivals: [],
  });
  assert.equal(
    afterGrace.movementDeltas.filter(
      movement => movement.actorId === STUDIO_RECEPTIONIST_ID,
    ).length,
    1,
  );
});

test("a schedule transition still makes an in-flight preload stale and tracks it once", async () => {
  const textGen = new DeferredTextGen();
  const service = new RunService({
    proposalPort: liveProvider(textGen),
    idFactory: deterministicIds("scheduled-stale-preload-evidence"),
  });
  const started = service.start("provider-scheduled-stale-preload-evidence", "ko-KR");
  const pending = service.preloadConversation(
    started.runId,
    "NPC_Studio_Manager",
    "StudioManagerConversation",
    "ko-KR",
  );
  await textGen.started;

  for (let step = 1; step <= 7; step += 1) {
    const snapshot = service.snapshot(started.runId);
    await service.advance({
      runId: started.runId,
      advanceId: `provider-scheduled-stale-preload-evidence:clock:${step}`,
      observedWorldRevision: snapshot.worldRevision,
      elapsedSeconds: 10,
      arrivals: [],
    });
  }
  const manager = service.snapshot(started.runId).scheduler.actors.find(
    actor => actor.actorId === "NPC_Studio_Manager",
  );
  assert.ok(manager?.pendingMovement, "the t=70 schedule transition must outrank route hold");

  textGen.finish(liveOpening);
  await assert.rejects(
    pending,
    (error: unknown) => error instanceof RunError && error.code === "conversation_not_ready",
  );
  const snapshot = service.snapshot(started.runId);
  assert.equal(snapshot.providerAudit.calls.length, 1);
  assert.equal(snapshot.providerAudit.resolutions.length, 1);
  assert.equal(snapshot.providerRuntimeTrace.entries.length, 1);
  assert.equal(snapshot.actors.find(
    actor => actor.actorId === "NPC_Studio_Manager",
  )?.playerConversationReady, false);
  assert.equal(textGen.requests.length, 1);
});

test("provider failure surfaces without a synthesized runtime-trace entry", async () => {
  const textGen = new RecoveringTextGen();
  const service = new RunService({
    proposalPort: liveProvider(textGen),
    idFactory: deterministicIds("accepted-fallback-evidence"),
  });
  const started = service.start("provider-accepted-fallback-evidence", "ko-KR");
  const advanced = await service.advance({
    runId: started.runId,
    advanceId: "provider-accepted-fallback-evidence:spatial",
    observedWorldRevision: started.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: started.worldRevision,
      player: { position: [8, 0.05, 5], locationId: "" },
      actors: runSpatialActors(started),
    },
  });
  const wake = advanced.scheduleWakes.find(candidate => candidate.kind === "goal");
  assert.ok(wake);

  const response = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });

  assert.equal(response.status, "failed");
  assert.deepEqual(response.providerMetas, []);
  assert.deepEqual(response.actionDeltas, []);
  assert.deepEqual(response.movementDeltas, []);
  assert.deepEqual(response.providerFailure, {
    profileId: LIVE_PROFILE_ID,
    reason: "missing_credentials",
    purpose: "agent_step",
    operationKey: `npc_decision:${wake.wakeId}`,
  });
  assert.equal(response.providerAudit.calls.length, 0);
  assert.equal(response.providerAudit.resolutions.length, 0);
  assert.equal(response.providerRuntimeTrace.entries.length, 0);

  const failedSnapshot = service.snapshot(started.runId);
  assert.equal(failedSnapshot.worldRevision, response.worldRevision);
  assert.equal(failedSnapshot.providerFailure?.operationKey, `npc_decision:${wake.wakeId}`);
  textGen.available = true;
  const recovered = await service.decision({
    runId: started.runId,
    wakeId: wake.wakeId,
    observedWorldRevision: wake.observedWorldRevision,
  });
  assert.equal(recovered.status, "completed");
  assert.deepEqual(recovered.actionDeltas, []);
  assert.deepEqual(recovered.movementDeltas, []);
  assert.equal(recovered.providerFailure, null);
  assert.equal(service.snapshot(started.runId).providerFailure, null);
  assert.equal(textGen.requests.length, 1);
});
