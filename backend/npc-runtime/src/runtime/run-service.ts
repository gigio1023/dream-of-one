import { randomUUID } from "node:crypto";
import {
  DEFAULT_ROLE_POLICIES,
  type ObservePacket,
} from "../agentloop/context.js";
import { toolCatalogForRole } from "../agentloop/tools.js";
import type { CoarseStance } from "../contracts/types.js";
import { agentStepProposalSchema } from "../providers/envelope.js";
import type {
  AgentStepProposal,
  ConversationProposal,
  ConversationTurnRequest,
  NpcProposalPort,
  ProposalMeta,
  ResolvedProposal,
} from "../providers/ports.js";
import { createProviderFromEnvironment } from "../providers/registry.js";
import {
  clampConversationScore,
  clampJudgmentDelta,
  JUDGMENT_REPORT_DELTA_CAP,
  JUDGMENT_SUSPICION_DELTA_CAP,
} from "./conversation-suspicion.js";
import {
  conversationZoneFor,
  loadRunLayout,
  type RunAudibilityVolume,
  type RunLayout,
  type RunMeetingWindow,
} from "./run-layout.js";
import {
  advanceRunScheduler,
  alignActorForPlayerConversation,
  createRunScheduler,
  snapshotRunScheduler,
  type RunSchedulerRuntime,
} from "./run-scheduler.js";
import type {
  RunActorReadinessDelta,
  RunAmbientConversation,
  RunAmbientSpeechEvent,
  RunAmbientUtteranceMemory,
  RunAdvanceRequest,
  RunAdvanceResponse,
  RunActor,
  RunJudgment,
  RunMemory,
  RunNextTurn,
  RunNpcDecisionRequest,
  RunNpcDecisionResponse,
  RunNpcUtteranceMemory,
  RunPlayerConversationMemory,
  RunSessionAnswer,
  RunSessionAnswerResponse,
  RunSessionEndResponse,
  RunSessionPreloadResponse,
  RunSessionSnapshotResponse,
  RunSessionStartResponse,
  RunSnapshot,
} from "./run-schema.js";

export const STUDIO_RECEPTIONIST_ID = "NPC_Studio_Receptionist";
export const RUN_PROVIDER_BUDGET = {
  callLimit: 120,
  tokenLimit: 300_000,
  reservedCalls: 20,
  reservedTokens: 50_000,
} as const;

const MAX_CONVERSATION_TURNS = 3;
const AMBIENT_TURN_LIMIT = 2;
const AMBIENT_MAX_CALLS_PER_TURN = 2;
const AMBIENT_TOKEN_HEADROOM_PER_TURN = 4_000;
const MAX_CONCURRENT_OPENING_PRELOADS = 2;
const PLAYER_CONVERSATION_GOAL =
  "Speak face to face with the outsider, ask only what your role and memories support, and form a memory-based personal stance.";

type RunActorState = RunActor;

interface CachedStart {
  signature: string;
  response: RunSnapshot;
}

interface CachedAdvance {
  signature: string;
  response: RunAdvanceResponse;
}

interface CachedAnswer {
  signature: string;
  response: RunSessionAnswerResponse;
}

interface AmbientObservation {
  windowId: string;
  participantAnchorRefs: Record<string, string>;
  audibilityVolumeId: string;
  observePackets: Record<string, ObservePacket>;
}

interface AmbientResolvedTurn {
  speakerActorId: string;
  targetActorId: string;
  line: string;
  meta: ProposalMeta;
}

interface AmbientMeetingValidation {
  window: RunMeetingWindow;
  volume: RunAudibilityVolume;
}

interface AmbientDecisionAttempt {
  signature: string;
  request: RunNpcDecisionRequest;
  windowId: string;
  conversationId: string;
  participantActorIds: [string, string];
  state: "unclaimed" | "resolving" | "queued" | "completed" | "terminal";
  observation: AmbientObservation | null;
  resolvedTurns: AmbientResolvedTurn[];
  providerMetas: ProposalMeta[];
  actorReadinessDeltas: RunActorReadinessDelta[];
  response?: RunNpcDecisionResponse;
  inFlight?: Promise<RunNpcDecisionResponse>;
}

interface ConversationState {
  sessionId: string;
  actorId: string;
  status: "active" | "awaiting_end" | "ended";
  dialogue: Array<{ speakerId: string; line: string }>;
  turnCount: number;
  activeTurn: RunNextTurn | null;
  answerCache: Map<string, CachedAnswer>;
  lastJudgment: RunJudgment | null;
  lastMemory: RunMemory | null;
  lastProposalMeta: ProposalMeta | null;
  endResponse?: RunSessionEndResponse;
}

interface ConversationOpeningAttempt {
  actorId: string;
  interactionZoneId: string;
  evidenceKey: string;
  request: ConversationTurnRequest;
  resolved?: ResolvedProposal<ConversationProposal>;
  inFlight?: Promise<RunSessionPreloadResponse>;
}

interface OpeningPreloadGate {
  active: number;
  waiters: Array<() => void>;
}

type ConversationOpeningClaim =
  | { response: RunSessionPreloadResponse; inFlight?: never }
  | { response?: never; inFlight: Promise<RunSessionPreloadResponse> };

interface RunState {
  runId: string;
  worldId: string;
  layoutRevision: string;
  worldRevision: number;
  locale: "ko-KR";
  elapsedSeconds: number;
  graceEndsAtSeconds: number;
  hearingAtSeconds: number;
  institutionalPressure: number;
  providerBudget: RunSnapshot["providerBudget"];
  lastProposalMeta: ProposalMeta | null;
  activeConversationId: string | null;
  actors: Map<string, RunActorState>;
  scheduler: RunSchedulerRuntime;
  advanceCache: Map<string, CachedAdvance>;
  ambientDecisions: Map<string, AmbientDecisionAttempt>;
  ambientSpeechEvents: RunAmbientSpeechEvent[];
  ambientSpeechCursor: number;
  activeAmbientConversation: RunAmbientConversation | null;
  conversations: Map<string, ConversationState>;
  conversationOpenings: Map<string, ConversationOpeningAttempt>;
  consumedConversationEvidence: Map<string, string>;
  preloadRequiredEvidence: Map<string, string>;
  records: RunSnapshot["records"];
  ledgerEvents: RunSnapshot["ledgerEvents"];
}

type IdPrefix = "run" | "sess" | "mem";

export interface RunServiceOptions {
  proposalPort?: NpcProposalPort;
  idFactory?: (prefix: IdPrefix) => string;
  layout?: RunLayout;
}

export type RunErrorCode =
  | "run_not_found"
  | "actor_not_found"
  | "actor_not_supported"
  | "conversation_active"
  | "conversation_not_ready"
  | "session_not_found"
  | "session_ended"
  | "session_still_active"
  | "unexpected_turn"
  | "unknown_choice"
  | "invalid_answer"
  | "invalid_interaction"
  | "invalid_locale"
  | "start_id_conflict"
  | "advance_id_conflict"
  | "decision_id_conflict"
  | "wake_not_pending"
  | "wake_not_supported"
  | "ambient_conversation_active"
  | "stale_world_revision"
  | "run_paused"
  | "hearing_due"
  | "invalid_arrival";

export class RunError extends Error {
  constructor(
    message: string,
    readonly code: RunErrorCode,
  ) {
    super(message);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function answerSignature(answer: RunSessionAnswer): string {
  return answer.type === "choice"
    ? `choice:${answer.choiceId}`
    : `free_input:${answer.text.trim()}`;
}

function startSignature(locale: string): string {
  return JSON.stringify({ locale });
}

function advanceSignature(request: RunAdvanceRequest): string {
  const arrivals = [...request.arrivals].sort((first, second) => {
    const actorOrder = first.actorId.localeCompare(second.actorId);
    if (actorOrder !== 0) return actorOrder;
    const movementOrder = first.movementId.localeCompare(second.movementId);
    return movementOrder !== 0 ? movementOrder : first.anchorRef.localeCompare(second.anchorRef);
  });
  return JSON.stringify({
    runId: request.runId,
    advanceId: request.advanceId,
    observedWorldRevision: request.observedWorldRevision,
    afterSpeechSeq: request.afterSpeechSeq ?? 0,
    elapsedSeconds: request.elapsedSeconds,
    arrivals,
  });
}

function decisionSignature(request: RunNpcDecisionRequest): string {
  return JSON.stringify({
    runId: request.runId,
    wakeId: request.wakeId,
    observedWorldRevision: request.observedWorldRevision,
  });
}

function runAmbientCallCeiling(run: RunState): number {
  return run.providerBudget.callLimit - run.providerBudget.reservedCalls;
}

function runAmbientTokenCeiling(run: RunState): number {
  return run.providerBudget.tokenLimit - run.providerBudget.reservedTokens;
}

function pointInsideBox(
  point: readonly [number, number, number],
  center: readonly [number, number, number],
  size: readonly [number, number, number],
): boolean {
  return point.every(
    (coordinate, index) => Math.abs(coordinate - center[index]) <= size[index] / 2,
  );
}

function volumeContains(
  volume: RunAudibilityVolume,
  point: readonly [number, number, number],
): boolean {
  return volume.boxes.some(box => pointInsideBox(point, box.center, box.size));
}

function distanceBetween(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return Math.sqrt(
    first.reduce((sum, coordinate, index) => sum + (coordinate - second[index]) ** 2, 0),
  );
}

function anchorLocationId(anchorRef: string): string {
  return anchorRef.split(".", 1)[0] ?? anchorRef;
}

export class RunService {
  private readonly runs = new Map<string, RunState>();
  private readonly startCache = new Map<string, CachedStart>();
  private readonly runChains = new Map<string, Promise<unknown>>();
  private readonly openingPreloadGates = new Map<string, OpeningPreloadGate>();
  private readonly proposalPort: NpcProposalPort;
  private readonly idFactory: (prefix: IdPrefix) => string;
  private readonly layout: RunLayout;

  constructor(options: RunServiceOptions = {}) {
    this.proposalPort = options.proposalPort ?? createProviderFromEnvironment().proposalPort;
    this.idFactory = options.idFactory ?? (prefix => `${prefix}-${randomUUID()}`);
    this.layout = options.layout ?? loadRunLayout();
  }

  providerProfile(): string {
    return this.proposalPort.profileId;
  }

  providerPreflight() {
    return this.proposalPort.preflight();
  }

  start(startId: string, locale: string): RunSnapshot {
    const signature = startSignature(locale);
    const cached = this.startCache.get(startId);
    if (cached) {
      if (cached.signature !== signature) {
        throw new RunError("the same startId cannot be retried with a different payload", "start_id_conflict");
      }
      return clone(cached.response);
    }
    if (locale !== "ko-KR") {
      throw new RunError(`M3R first-contact runs require ko-KR, got ${locale}`, "invalid_locale");
    }
    const runId = this.idFactory("run");
    const scheduler = createRunScheduler(this.layout);
    const actors = new Map<string, RunActorState>();
    for (const seed of this.layout.actors) {
      const confirmedAnchorRef = scheduler.actors.get(seed.actorId)?.confirmedAnchorRef;
      if (!confirmedAnchorRef) throw new Error(`scheduler did not hydrate actor ${seed.actorId}`);
      actors.set(seed.actorId, {
        actorId: seed.actorId,
        role: seed.role,
        locationId: anchorLocationId(confirmedAnchorRef),
        stance: "uncertain",
        suspicion: 0,
        playerConversationReady: false,
        hasMeaningfulFirsthandConversation: false,
        memories: [],
      });
    }
    const run: RunState = {
      runId,
      worldId: this.layout.worldId,
      layoutRevision: this.layout.layoutRevision,
      worldRevision: 0,
      locale,
      elapsedSeconds: 0,
      graceEndsAtSeconds: this.layout.graceEndsAtSeconds,
      hearingAtSeconds: this.layout.hearingAtSeconds,
      institutionalPressure: 0,
      providerBudget: {
        ...RUN_PROVIDER_BUDGET,
        callsUsed: 0,
        tokensUsed: 0,
      },
      lastProposalMeta: null,
      activeConversationId: null,
      actors,
      scheduler,
      advanceCache: new Map(),
      ambientDecisions: new Map(),
      ambientSpeechEvents: [],
      ambientSpeechCursor: 0,
      activeAmbientConversation: null,
      conversations: new Map(),
      conversationOpenings: new Map(),
      consumedConversationEvidence: new Map(),
      preloadRequiredEvidence: new Map(),
      records: [],
      ledgerEvents: [],
    };
    this.runs.set(runId, run);
    const response = this.snapshot(runId);
    this.startCache.set(startId, { signature, response: clone(response) });
    while (this.startCache.size > 256) {
      const oldest = this.startCache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.startCache.delete(oldest);
    }
    return response;
  }

  snapshot(runId: string): RunSnapshot {
    const run = this.requireRun(runId);
    return {
      runId: run.runId,
      worldId: run.worldId,
      layoutRevision: run.layoutRevision,
      worldRevision: run.worldRevision,
      locale: run.locale,
      worldClock: {
        elapsedSeconds: run.elapsedSeconds,
        graceEndsAtSeconds: run.graceEndsAtSeconds,
        hearingAtSeconds: run.hearingAtSeconds,
        paused: run.activeConversationId !== null,
      },
      institutionalPressure: run.institutionalPressure,
      providerBudget: clone(run.providerBudget),
      lastProposalMeta: clone(run.lastProposalMeta),
      activeConversationId: run.activeConversationId,
      actors: [...run.actors.values()].map(actor => this.publicActor(actor)),
      scheduler: snapshotRunScheduler(this.layout, run.scheduler, run.elapsedSeconds),
      ambientSpeech: {
        cursor: run.ambientSpeechCursor,
        events: clone(run.ambientSpeechEvents),
        activeConversation: clone(run.activeAmbientConversation),
      },
      records: clone(run.records),
      ledgerEvents: clone(run.ledgerEvents),
    };
  }

  advance(request: RunAdvanceRequest): Promise<RunAdvanceResponse> {
    return this.serialize(request.runId, async () => {
      const run = this.requireRun(request.runId);
      const signature = advanceSignature(request);
      const cached = run.advanceCache.get(request.advanceId);
      if (cached) {
        if (cached.signature !== signature) {
          throw new RunError(
            "the same advanceId cannot be retried with a different payload",
            "advance_id_conflict",
          );
        }
        return clone(cached.response);
      }
      if (request.observedWorldRevision !== run.worldRevision) {
        throw new RunError(
          `advance observed revision ${request.observedWorldRevision}, current is ${run.worldRevision}`,
          "stale_world_revision",
        );
      }
      if (run.activeConversationId !== null) {
        throw new RunError("the unpaused run clock cannot advance during a modal conversation", "run_paused");
      }
      if (run.elapsedSeconds >= run.hearingAtSeconds) {
        throw new RunError("the Station hearing is already due", "hearing_due");
      }
      for (const arrival of request.arrivals) {
        this.requireActor(run, arrival.actorId);
        if (!this.layout.anchorRefs.includes(arrival.anchorRef)) {
          throw new RunError(`arrival references unknown anchor: ${arrival.anchorRef}`, "invalid_arrival");
        }
      }

      const previousWorldRevision = run.worldRevision;
      const fromSeconds = run.elapsedSeconds;
      const appliedElapsedSeconds = Math.min(
        request.elapsedSeconds,
        run.hearingAtSeconds - fromSeconds,
      );
      const toSeconds = fromSeconds + appliedElapsedSeconds;
      const candidateWorldRevision = previousWorldRevision + 1;
      const schedulerResult = advanceRunScheduler({
        runId: run.runId,
        layout: this.layout,
        runtime: run.scheduler,
        fromSeconds,
        toSeconds,
        arrivals: request.arrivals,
        observedWorldRevision: candidateWorldRevision,
      });
      const actorReadinessDeltas: RunActorReadinessDelta[] = [];

      // Arrivals are observations at the request's starting instant and are
      // applied before schedule boundaries in this same batch.
      for (const arrival of schedulerResult.arrivalsApplied) {
        const actor = this.requireActor(run, arrival.actorId);
        actor.locationId = arrival.locationId;
      }
      for (const movement of schedulerResult.movementDeltas) {
        const actor = this.requireActor(run, movement.actorId);
        this.setActorReadiness(actor, false, "movement_started", actorReadinessDeltas);
      }

      const schedulerMutation =
        appliedElapsedSeconds > 0 ||
        schedulerResult.arrivalsApplied.length > 0 ||
        schedulerResult.movementDeltas.length > 0 ||
        schedulerResult.scheduleWakes.length > 0;
      if (schedulerMutation) run.elapsedSeconds = toSeconds;

      for (const actor of run.actors.values()) {
        const schedulerActor = run.scheduler.actors.get(actor.actorId);
        if (schedulerActor?.pendingMovement) continue;
        this.reconcileConversationOpening(run, actor, actorReadinessDeltas);
      }

      const materialMutation = schedulerMutation || actorReadinessDeltas.length > 0;
      if (materialMutation) {
        if (!schedulerMutation) run.elapsedSeconds = toSeconds;
        run.worldRevision = candidateWorldRevision;
      }
      const response: RunAdvanceResponse = {
        runId: run.runId,
        advanceId: request.advanceId,
        previousWorldRevision,
        worldRevision: run.worldRevision,
        clock: {
          fromSeconds,
          toSeconds: materialMutation ? toSeconds : fromSeconds,
          requestedElapsedSeconds: request.elapsedSeconds,
          appliedElapsedSeconds: materialMutation ? appliedElapsedSeconds : 0,
          graceEnded:
            materialMutation &&
            fromSeconds < run.graceEndsAtSeconds &&
            run.graceEndsAtSeconds <= toSeconds,
          hearingDue:
            materialMutation &&
            fromSeconds < run.hearingAtSeconds &&
            run.hearingAtSeconds <= toSeconds,
        },
        arrivalsApplied: schedulerResult.arrivalsApplied,
        arrivalsRejected: schedulerResult.arrivalsRejected,
        scheduleWakes: schedulerResult.scheduleWakes,
        movementDeltas: schedulerResult.movementDeltas,
        actorReadinessDeltas,
        ambientSpeechEvents: clone(
          run.ambientSpeechEvents.filter(event => event.seq > (request.afterSpeechSeq ?? 0)),
        ),
        ambientSpeechCursor: run.ambientSpeechCursor,
        scheduler: snapshotRunScheduler(this.layout, run.scheduler, run.elapsedSeconds),
      };
      run.advanceCache.set(request.advanceId, { signature, response: clone(response) });
      while (run.advanceCache.size > 256) {
        const oldest = run.advanceCache.keys().next().value as string | undefined;
        if (!oldest) break;
        run.advanceCache.delete(oldest);
      }
      return response;
    });
  }

  decision(request: RunNpcDecisionRequest): Promise<RunNpcDecisionResponse> {
    const run = this.requireRun(request.runId);
    const signature = decisionSignature(request);
    let attempt = run.ambientDecisions.get(request.wakeId);
    if (attempt) {
      if (attempt.signature !== signature) {
        return Promise.reject(
          new RunError(
            "the same wakeId cannot be retried with a different payload",
            "decision_id_conflict",
          ),
        );
      }
      if (attempt.inFlight) return attempt.inFlight.then(response => clone(response));
      if (
        attempt.response &&
        (attempt.state === "completed" || attempt.state === "terminal")
      ) {
        return Promise.resolve(clone(attempt.response));
      }
    } else {
      const wake = run.scheduler.pendingWakes.get(request.wakeId);
      if (!wake) {
        return Promise.reject(new RunError(`wake is not pending: ${request.wakeId}`, "wake_not_pending"));
      }
      if (wake.kind !== "meeting_ready" || wake.actorIds.length !== 2) {
        return Promise.reject(
          new RunError(`wake cannot open ambient speech: ${request.wakeId}`, "wake_not_supported"),
        );
      }
      const [firstActorId, secondActorId] = wake.actorIds;
      if (!firstActorId || !secondActorId) {
        return Promise.reject(new RunError("meeting wake has invalid participants", "wake_not_supported"));
      }
      attempt = {
        signature,
        request: clone(request),
        windowId: wake.sourceId,
        conversationId: `ambient:${request.wakeId}`,
        participantActorIds: [firstActorId, secondActorId],
        state: "unclaimed",
        observation: null,
        resolvedTurns: [],
        providerMetas: [],
        actorReadinessDeltas: [],
      };
      run.ambientDecisions.set(request.wakeId, attempt);
    }

    const executing = this.executeAmbientDecision(request.runId, attempt);
    attempt.inFlight = executing;
    void executing
      .finally(() => {
        if (attempt?.inFlight === executing) attempt.inFlight = undefined;
      })
      .catch(() => undefined);
    return executing.then(response => clone(response));
  }

  preloadConversation(
    runId: string,
    actorId: string,
    interactionZoneId: string,
    locale: string,
  ): Promise<RunSessionPreloadResponse> {
    return this.serialize(runId, async (): Promise<ConversationOpeningClaim> => {
      const run = this.requireRun(runId);
      const actor = this.requireActor(run, actorId);
      this.validateConversationRequest(run, actor, interactionZoneId, locale);
      if (run.activeConversationId !== null) {
        throw new RunError("conversation openings cannot preload during a modal conversation", "run_paused");
      }
      if (run.scheduler.actors.get(actorId)?.pendingMovement) {
        throw new RunError("actor is moving and has no stable conversation opening", "conversation_not_ready");
      }

      const evidenceKey = this.conversationEvidenceKey(run, actor);
      if (run.consumedConversationEvidence.get(actorId) === evidenceKey) {
        throw new RunError("unchanged evidence cannot reopen this conversation", "conversation_not_ready");
      }
      const existing = run.conversationOpenings.get(actorId);
      if (
        existing &&
        existing.evidenceKey === evidenceKey &&
        existing.interactionZoneId === interactionZoneId
      ) {
        if (existing.resolved) {
          const wasReady = actor.playerConversationReady;
          this.setActorReadiness(actor, true);
          if (!wasReady) run.worldRevision += 1;
          return { response: this.preloadResponse(run, actor, existing) };
        }
        if (existing.inFlight) return { inFlight: existing.inFlight };
      }
      if (existing) run.conversationOpenings.delete(actorId);

      const attempt: ConversationOpeningAttempt = {
        actorId,
        interactionZoneId,
        evidenceKey,
        request: this.conversationOpeningRequest(run, actor),
      };
      run.conversationOpenings.set(actorId, attempt);
      run.preloadRequiredEvidence.delete(actorId);
      const executing = this.executeConversationOpening(runId, attempt);
      attempt.inFlight = executing;
      void executing
        .finally(() => {
          if (attempt.inFlight === executing) attempt.inFlight = undefined;
        })
        .catch(() => undefined);
      return { inFlight: executing };
    }).then(claim =>
      claim.response ? clone(claim.response) : claim.inFlight.then(response => clone(response)),
    );
  }

  startConversation(
    runId: string,
    actorId: string,
    interactionZoneId: string,
    locale: string,
  ): Promise<RunSessionStartResponse> {
    return this.serialize(runId, async () => {
      const run = this.requireRun(runId);
      if (locale !== run.locale) {
        throw new RunError(`conversation locale ${locale} does not match run locale ${run.locale}`, "invalid_locale");
      }
      const actor = this.requireActor(run, actorId);
      this.validateConversationRequest(run, actor, interactionZoneId, locale);
      if (run.activeConversationId) {
        const active = this.requireConversation(run, run.activeConversationId);
        // A timed-out start request can be retried safely. Returning the
        // current answerable turn also gives reconnecting clients a direct
        // reconciliation path without creating another provider call.
        if (active.actorId === actorId && active.status === "active" && active.activeTurn) {
          return {
            runId,
            sessionId: active.sessionId,
            worldRevision: run.worldRevision,
            actor: this.publicActor(actor),
            nextTurn: clone(active.activeTurn),
          };
        }
        throw new RunError(
          `run already has an active conversation: ${run.activeConversationId}`,
          "conversation_active",
        );
      }
      if (!actor.playerConversationReady) {
        throw new RunError("actor is not ready for a player conversation", "conversation_not_ready");
      }

      const opening = run.conversationOpenings.get(actorId);
      const evidenceKey = this.conversationEvidenceKey(run, actor);
      if (
        !opening?.resolved ||
        opening.evidenceKey !== evidenceKey ||
        opening.interactionZoneId !== interactionZoneId ||
        run.consumedConversationEvidence.get(actorId) === evidenceKey ||
        run.scheduler.actors.get(actorId)?.pendingMovement
      ) {
        actor.playerConversationReady = false;
        run.conversationOpenings.delete(actorId);
        throw new RunError("actor has no valid preloaded conversation opening", "conversation_not_ready");
      }

      const sessionId = this.idFactory("sess");
      const resolved = opening.resolved;
      const confirmedAnchorRef = run.scheduler.actors.get(actor.actorId)?.confirmedAnchorRef;
      if (!confirmedAnchorRef) {
        throw new RunError("actor has no confirmed conversation position", "conversation_not_ready");
      }
      alignActorForPlayerConversation(
        this.layout,
        run.scheduler,
        actor.actorId,
        confirmedAnchorRef,
        run.elapsedSeconds,
      );
      actor.playerConversationReady = false;
      run.conversationOpenings.delete(actorId);
      run.preloadRequiredEvidence.delete(actorId);
      const nextTurn = this.nextTurn(
        sessionId,
        0,
        `resident_opening_${actor.role}`,
        "resident_first_question",
        actorId,
        resolved.proposal,
        resolved.meta,
      );
      const openingRevision = run.worldRevision + 1;
      const openingMemory: RunNpcUtteranceMemory = {
        memoryId: this.idFactory("mem"),
        kind: "npc_utterance",
        sourceActorId: actor.actorId,
        listenerActorIds: ["player"],
        conversationId: sessionId,
        turnId: nextTurn.turnId,
        line: nextTurn.prompt,
        worldSeconds: run.elapsedSeconds,
        worldRevision: openingRevision,
        proposalMeta: clone(resolved.meta),
      };
      actor.memories.push(openingMemory);
      const conversation: ConversationState = {
        sessionId,
        actorId,
        status: "active",
        dialogue: [{ speakerId: actorId, line: nextTurn.prompt }],
        turnCount: 0,
        activeTurn: nextTurn,
        answerCache: new Map(),
        lastJudgment: null,
        lastMemory: null,
        lastProposalMeta: resolved.meta,
      };
      run.conversations.set(sessionId, conversation);
      run.activeConversationId = sessionId;
      run.worldRevision = openingRevision;
      return {
        runId,
        sessionId,
        worldRevision: run.worldRevision,
        actor: this.publicActor(actor),
        nextTurn: clone(nextTurn),
      };
    });
  }

  answer(
    runId: string,
    sessionId: string,
    turnId: string,
    answer: RunSessionAnswer,
  ): Promise<RunSessionAnswerResponse> {
    return this.serialize(runId, async () => {
      const run = this.requireRun(runId);
      const conversation = this.requireConversation(run, sessionId);
      const signature = answerSignature(answer);
      const cached = conversation.answerCache.get(turnId);
      if (cached) {
        if (cached.signature !== signature) {
          throw new RunError("the same turn cannot be retried with a different answer", "unexpected_turn");
        }
        return clone(cached.response);
      }
      if (conversation.status !== "active" || !conversation.activeTurn) {
        throw new RunError("conversation has no answerable turn", "session_ended");
      }
      if (turnId !== conversation.activeTurn.turnId) {
        throw new RunError(
          `unexpected turn: got ${turnId}, expected ${conversation.activeTurn.turnId}`,
          "unexpected_turn",
        );
      }

      const playerLine = this.resolvePlayerLine(conversation.activeTurn, answer);
      const actor = this.requireActor(run, conversation.actorId);
      const stanceBefore = actor.stance;
      const suspicionBefore = actor.suspicion;
      const reportBefore = run.institutionalPressure;
      const currentTurnAllowsContinuation = conversation.activeTurn.continueConversation;
      const resolved = await this.proposalPort.judgeAndProposeConversationTurn({
        sessionId: run.runId,
        locale: run.locale,
        beatId: conversation.activeTurn.beatId,
        promptId: conversation.activeTurn.promptId,
        actorId: actor.actorId,
        playerLine,
        conversationHistory: clone(conversation.dialogue.slice(-10)),
        observePacket: this.runObservePacket(
          run,
          actor,
          ["player"],
          this.conversationGoals(actor),
          [playerLine],
        ),
        suspicionBefore,
        reportPressureBefore: reportBefore,
        objective: this.conversationObjective(actor),
        sceneFacts: this.conversationSceneFacts(actor),
        stanceBefore,
        hasMeaningfulFirsthandConversation: actor.hasMeaningfulFirsthandConversation,
      });
      this.trackProposal(run, resolved.meta);

      const suspicionAfter = clampConversationScore(
        suspicionBefore +
          clampJudgmentDelta(resolved.proposal.suspicionDelta, JUDGMENT_SUSPICION_DELTA_CAP),
      );
      // Speech changes this actor's remembered judgment. Shared institutional
      // pressure may move only after a validated administrative tool/record,
      // which is intentionally outside this first-contact slice.
      const reportDelta = clampJudgmentDelta(
        resolved.proposal.reportDelta,
        JUDGMENT_REPORT_DELTA_CAP,
      );
      const reportPressureAfter = reportBefore;
      const meaningfulFirsthand = resolved.proposal.meaningfulFirsthand && playerLine.trim().length > 0;
      const hasFirsthand = actor.hasMeaningfulFirsthandConversation || meaningfulFirsthand;
      const stanceAfter = this.validatedStance(resolved.proposal.stance, hasFirsthand);
      const nextRevision = run.worldRevision + 1;
      const judgment: RunJudgment = {
        signals: [...resolved.proposal.signals],
        whyLine: resolved.proposal.whyLine,
        suspicionDelta: suspicionAfter - suspicionBefore,
        reportDelta,
        institutionalPressureDelta: 0,
        suspicionAfter,
        reportPressureAfter,
        stanceBefore,
        stanceAfter,
        meaningfulFirsthand,
      };
      const memory: RunPlayerConversationMemory = {
        memoryId: this.idFactory("mem"),
        kind: "player_conversation",
        sourceActorId: "player",
        listenerActorId: actor.actorId,
        conversationId: sessionId,
        turnId,
        playerLine,
        npcLine: resolved.proposal.utterance,
        signals: [...resolved.proposal.signals],
        whyLine: resolved.proposal.whyLine,
        suspicionBefore,
        suspicionAfter,
        suspicionDelta: judgment.suspicionDelta,
        reportPressureBefore: reportBefore,
        reportPressureAfter,
        reportDelta: judgment.reportDelta,
        institutionalPressureDelta: judgment.institutionalPressureDelta,
        proposedStance: resolved.proposal.stance,
        appliedStance: stanceAfter,
        meaningfulFirsthand,
        worldSeconds: run.elapsedSeconds,
        worldRevision: nextRevision,
        proposalMeta: clone(resolved.meta),
      };

      actor.suspicion = suspicionAfter;
      actor.stance = stanceAfter;
      actor.hasMeaningfulFirsthandConversation = hasFirsthand;
      actor.memories.push(memory);
      run.worldRevision = nextRevision;
      conversation.turnCount += 1;
      conversation.dialogue.push(
        { speakerId: "player", line: playerLine },
        { speakerId: actor.actorId, line: resolved.proposal.utterance },
      );
      const continueConversation =
        currentTurnAllowsContinuation &&
        resolved.proposal.continueConversation &&
        conversation.turnCount < MAX_CONVERSATION_TURNS;
      const nextTurn = continueConversation
        ? this.nextTurn(
            sessionId,
            conversation.turnCount,
            `resident_follow_up_${actor.role}_${conversation.turnCount}`,
            "resident_follow_up",
            actor.actorId,
            resolved.proposal,
            resolved.meta,
          )
        : null;
      conversation.activeTurn = nextTurn;
      conversation.status = nextTurn ? "active" : "awaiting_end";
      conversation.lastJudgment = judgment;
      conversation.lastMemory = memory;
      conversation.lastProposalMeta = resolved.meta;

      const response: RunSessionAnswerResponse = {
        runId,
        sessionId,
        worldRevision: run.worldRevision,
        judgment: clone(judgment),
        memoryDelta: clone(memory),
        actor: this.publicActor(actor),
        nextTurn: clone(nextTurn),
        proposalMeta: clone(resolved.meta),
      };
      conversation.answerCache.set(turnId, { signature, response: clone(response) });
      return response;
    });
  }

  endConversation(runId: string, sessionId: string): Promise<RunSessionEndResponse> {
    return this.serialize(runId, async () => {
      const run = this.requireRun(runId);
      const conversation = this.requireConversation(run, sessionId);
      if (conversation.endResponse) return clone(conversation.endResponse);
      if (conversation.status === "active") {
        throw new RunError("conversation still has an answerable turn", "session_still_active");
      }
      const actor = this.requireActor(run, conversation.actorId);
      conversation.status = "ended";
      conversation.activeTurn = null;
      if (run.activeConversationId === sessionId) run.activeConversationId = null;
      actor.playerConversationReady = false;
      run.conversationOpenings.delete(actor.actorId);
      run.preloadRequiredEvidence.delete(actor.actorId);
      run.consumedConversationEvidence.set(
        actor.actorId,
        this.conversationEvidenceKey(run, actor),
      );
      run.worldRevision += 1;
      const response: RunSessionEndResponse = {
        runId,
        sessionId,
        ended: true,
        worldRevision: run.worldRevision,
        actor: this.publicActor(actor),
        queuedRunDeltas: [],
      };
      conversation.endResponse = clone(response);
      return response;
    });
  }

  sessionSnapshot(runId: string, sessionId: string): RunSessionSnapshotResponse {
    const run = this.requireRun(runId);
    const conversation = this.requireConversation(run, sessionId);
    const actor = this.requireActor(run, conversation.actorId);
    return {
      runId,
      sessionId,
      actorId: actor.actorId,
      worldRevision: run.worldRevision,
      status: conversation.status,
      actor: this.publicActor(actor),
      nextTurn: clone(conversation.activeTurn),
      lastJudgment: clone(conversation.lastJudgment),
      lastMemory: clone(conversation.lastMemory),
      lastProposalMeta: clone(conversation.lastProposalMeta),
    };
  }

  private async executeAmbientDecision(
    runId: string,
    attempt: AmbientDecisionAttempt,
  ): Promise<RunNpcDecisionResponse> {
    if (attempt.state === "unclaimed") {
      const early = await this.serialize(runId, async () =>
        this.claimAmbientDecision(this.requireRun(runId), attempt),
      );
      if (early) return early;
    }
    if (attempt.response && (attempt.state === "completed" || attempt.state === "terminal")) {
      return clone(attempt.response);
    }
    if (attempt.state === "queued") {
      return this.serialize(runId, async () =>
        this.commitAmbientDecision(this.requireRun(runId), attempt),
      );
    }

    if (attempt.resolvedTurns.length === 0) {
      try {
        for (let turnIndex = 0; turnIndex < AMBIENT_TURN_LIMIT; turnIndex += 1) {
          if (turnIndex > 0) {
            const reserveAvailable = await this.serialize(runId, async () => {
              const run = this.requireRun(runId);
              this.refreshProviderBudget(run);
              return this.hasAmbientReserve(run, AMBIENT_TURN_LIMIT - turnIndex);
            });
            if (!reserveAvailable) {
              return this.serialize(runId, async () =>
                this.finishAmbientAttempt(this.requireRun(runId), attempt, "budget_reserved"),
              );
            }
          }

          const observation = attempt.observation;
          if (!observation) {
            return this.serialize(runId, async () =>
              this.finishAmbientAttempt(this.requireRun(runId), attempt, "failed"),
            );
          }
          const speakerActorId = attempt.participantActorIds[turnIndex];
          const targetActorId = attempt.participantActorIds[1 - turnIndex];
          if (!speakerActorId || !targetActorId) {
            return this.serialize(runId, async () =>
              this.finishAmbientAttempt(this.requireRun(runId), attempt, "failed"),
            );
          }
          const observePacket = clone(observation.observePackets[speakerActorId]);
          if (!observePacket) {
            return this.serialize(runId, async () =>
              this.finishAmbientAttempt(this.requireRun(runId), attempt, "failed"),
            );
          }
          const firstTurn = attempt.resolvedTurns[0];
          if (turnIndex === 1 && firstTurn) {
            observePacket.heardSpeech.push(`${firstTurn.speakerActorId}: ${firstTurn.line}`);
          }
          const resolved = await this.proposalPort.proposeNextStep({
            sessionId: runId,
            iteration: turnIndex,
            goal: "함께 도착한 주민과 지금 상황에 맞는 한 문장을 직접 나누고 대화를 마친다.",
            observePacket,
            blockedSignatures: [],
            requiredToolCall: { tool: "talk_to", actorId: targetActorId },
            requireUtterance: true,
            budgetCeiling: {
              maxCalls: runAmbientCallCeiling(this.requireRun(runId)),
              maxTokens: runAmbientTokenCeiling(this.requireRun(runId)),
            },
          });
          await this.serialize(runId, async () => {
            const run = this.requireRun(runId);
            this.trackProposal(run, resolved.meta);
            if (run.activeAmbientConversation?.conversationId === attempt.conversationId) {
              run.activeAmbientConversation.currentSpeakerActorId =
              attempt.participantActorIds[Math.min(turnIndex + 1, AMBIENT_TURN_LIMIT - 1)];
            }
          });
          attempt.providerMetas.push(clone(resolved.meta));
          if (resolved.meta.fallbackReason === "budget_exhausted") {
            return this.serialize(runId, async () =>
              this.finishAmbientAttempt(this.requireRun(runId), attempt, "budget_reserved"),
            );
          }
          const line = this.validatedAmbientLine(
            resolved,
            observePacket,
            targetActorId,
          );
          if (!line) {
            return this.serialize(runId, async () =>
              this.finishAmbientAttempt(this.requireRun(runId), attempt, "failed"),
            );
          }
          attempt.resolvedTurns.push({
            speakerActorId,
            targetActorId,
            line,
            meta: clone(resolved.meta),
          });
        }
      } catch {
        return this.serialize(runId, async () => {
          const run = this.requireRun(runId);
          this.refreshProviderBudget(run);
          return this.finishAmbientAttempt(run, attempt, "failed");
        });
      }
    }

    return this.serialize(runId, async () =>
      this.commitAmbientDecision(this.requireRun(runId), attempt),
    );
  }

  private claimAmbientDecision(
    run: RunState,
    attempt: AmbientDecisionAttempt,
  ): RunNpcDecisionResponse | null {
    const wake = run.scheduler.pendingWakes.get(attempt.request.wakeId);
    if (!wake) {
      throw new RunError(`wake is not pending: ${attempt.request.wakeId}`, "wake_not_pending");
    }
    if (
      wake.kind !== "meeting_ready" ||
      wake.sourceId !== attempt.windowId ||
      wake.actorIds.length !== 2 ||
      wake.actorIds[0] !== attempt.participantActorIds[0] ||
      wake.actorIds[1] !== attempt.participantActorIds[1]
    ) {
      throw new RunError(`wake cannot open ambient speech: ${attempt.request.wakeId}`, "wake_not_supported");
    }
    if (
      run.activeAmbientConversation &&
      run.activeAmbientConversation.wakeId !== attempt.request.wakeId
    ) {
      throw new RunError(
        `another ambient conversation is active: ${run.activeAmbientConversation.wakeId}`,
        "ambient_conversation_active",
      );
    }

    // Claim before any provider await. This wake can now finish only through
    // this signature-bound attempt, including stale/failure outcomes.
    run.scheduler.pendingWakes.delete(attempt.request.wakeId);
    if (wake.observedWorldRevision !== attempt.request.observedWorldRevision) {
      return this.finishAmbientAttempt(run, attempt, "stale");
    }
    const meeting = this.currentAmbientMeeting(run, attempt);
    if (!meeting) return this.finishAmbientAttempt(run, attempt, "stale");

    this.refreshProviderBudget(run);
    if (!this.hasAmbientReserve(run, AMBIENT_TURN_LIMIT)) {
      return this.finishAmbientAttempt(run, attempt, "budget_reserved");
    }
    const [firstActorId, secondActorId] = attempt.participantActorIds;
    attempt.observation = {
      windowId: meeting.window.windowId,
      participantAnchorRefs: clone(meeting.window.participantAnchorRefs),
      audibilityVolumeId: meeting.volume.volumeId,
      observePackets: {
        [firstActorId]: this.ambientObservePacket(run, firstActorId, secondActorId),
        [secondActorId]: this.ambientObservePacket(run, secondActorId, firstActorId),
      },
    };
    attempt.state = "resolving";
    run.activeAmbientConversation = {
      conversationId: attempt.conversationId,
      wakeId: attempt.request.wakeId,
      participantActorIds: clone(attempt.participantActorIds),
      initiatorActorId: firstActorId,
      currentSpeakerActorId: firstActorId,
      observedWorldRevision: attempt.request.observedWorldRevision,
      status: "resolving",
      turnLimit: AMBIENT_TURN_LIMIT,
      audibilityVolumeId: meeting.volume.volumeId,
    };
    return null;
  }

  private commitAmbientDecision(
    run: RunState,
    attempt: AmbientDecisionAttempt,
  ): RunNpcDecisionResponse {
    if (attempt.response && attempt.state === "completed") return clone(attempt.response);
    if (attempt.resolvedTurns.length !== AMBIENT_TURN_LIMIT || !attempt.observation) {
      return this.finishAmbientAttempt(run, attempt, "failed");
    }
    if (run.activeConversationId !== null) {
      if (attempt.state === "queued" && attempt.response) return clone(attempt.response);
      attempt.state = "queued";
      if (run.activeAmbientConversation?.conversationId === attempt.conversationId) {
        run.activeAmbientConversation.status = "queued";
      }
      const response = this.ambientDecisionResponse(run, attempt, "queued", []);
      attempt.response = clone(response);
      return response;
    }

    const meeting = this.currentAmbientMeeting(run, attempt);
    if (
      !meeting ||
      meeting.window.windowId !== attempt.observation.windowId ||
      meeting.volume.volumeId !== attempt.observation.audibilityVolumeId ||
      Object.entries(attempt.observation.participantAnchorRefs).some(
        ([actorId, anchorRef]) => meeting.window.participantAnchorRefs[actorId] !== anchorRef,
      )
    ) {
      return this.finishAmbientAttempt(run, attempt, "stale");
    }

    const committed: RunAmbientSpeechEvent[] = [];
    const memoryChangedActorIds = new Set<string>();
    for (let turnIndex = 0; turnIndex < attempt.resolvedTurns.length; turnIndex += 1) {
      const turn = attempt.resolvedTurns[turnIndex];
      if (!turn) return this.finishAmbientAttempt(run, attempt, "failed");
      const freshMeeting = this.currentAmbientMeeting(run, attempt);
      if (!freshMeeting || freshMeeting.volume.volumeId !== attempt.observation.audibilityVolumeId) {
        return this.finishAmbientAttempt(run, attempt, "stale");
      }
      const speakerPosition = this.actorPosition(run, turn.speakerActorId);
      const listenerActorIds = this.currentNpcListeners(
        run,
        turn.speakerActorId,
        freshMeeting.volume,
        speakerPosition,
      );
      if (!listenerActorIds.includes(turn.targetActorId)) {
        return this.finishAmbientAttempt(run, attempt, "stale");
      }

      const seq = run.ambientSpeechCursor + 1;
      const worldRevision = run.worldRevision + 1;
      const event: RunAmbientSpeechEvent = {
        seq,
        eventId: `speech:${run.runId}:${seq}`,
        wakeId: attempt.request.wakeId,
        conversationId: attempt.conversationId,
        turnId: `${attempt.conversationId}#${turnIndex}`,
        speakerActorId: turn.speakerActorId,
        targetActorId: turn.targetActorId,
        listenerActorIds,
        line: turn.line,
        worldSeconds: run.elapsedSeconds,
        observedWorldRevision: attempt.request.observedWorldRevision,
        worldRevision,
        audibility: {
          volumeId: freshMeeting.volume.volumeId,
          maxSpeechDistanceM: freshMeeting.volume.maxSpeechDistanceM,
          speakerPosition: [speakerPosition[0], speakerPosition[1], speakerPosition[2]],
        },
        proposalMeta: clone(turn.meta),
      };
      const memoryHolders = [turn.speakerActorId, ...listenerActorIds];
      for (const holderActorId of memoryHolders) {
        const memory: RunAmbientUtteranceMemory = {
          ...clone(event),
          memoryId: this.idFactory("mem"),
          kind: "ambient_utterance",
        };
        this.requireActor(run, holderActorId).memories.push(memory);
        memoryChangedActorIds.add(holderActorId);
      }
      run.ambientSpeechCursor = seq;
      run.ambientSpeechEvents.push(event);
      run.worldRevision = worldRevision;
      committed.push(event);
    }

    attempt.actorReadinessDeltas = [];
    for (const actorId of memoryChangedActorIds) {
      this.reconcileConversationOpening(
        run,
        this.requireActor(run, actorId),
        attempt.actorReadinessDeltas,
      );
    }

    attempt.state = "completed";
    run.activeAmbientConversation = null;
    const response = this.ambientDecisionResponse(run, attempt, "completed", committed);
    attempt.response = clone(response);
    return response;
  }

  private currentAmbientMeeting(
    run: RunState,
    attempt: AmbientDecisionAttempt,
  ): AmbientMeetingValidation | null {
    const window = this.layout.meetingWindows.find(
      candidate => candidate.windowId === attempt.windowId,
    );
    if (
      !window ||
      !(window.startSeconds <= run.elapsedSeconds && run.elapsedSeconds < window.endSeconds) ||
      window.actorIds[0] !== attempt.participantActorIds[0] ||
      window.actorIds[1] !== attempt.participantActorIds[1]
    ) {
      return null;
    }
    const positions: Array<readonly [number, number, number]> = [];
    for (const actorId of attempt.participantActorIds) {
      const anchorRef = run.scheduler.actors.get(actorId)?.confirmedAnchorRef;
      const expectedAnchorRef = window.participantAnchorRefs[actorId];
      const position = anchorRef ? this.layout.anchorPositions[anchorRef] : undefined;
      if (!anchorRef || anchorRef !== expectedAnchorRef || !position) return null;
      positions.push(position);
    }
    const firstPosition = positions[0];
    const secondPosition = positions[1];
    if (!firstPosition || !secondPosition) return null;
    const volume = this.layout.audibilityVolumes.find(
      candidate =>
        volumeContains(candidate, firstPosition) &&
        volumeContains(candidate, secondPosition) &&
        distanceBetween(firstPosition, secondPosition) <= candidate.maxSpeechDistanceM,
    );
    return volume ? { window, volume } : null;
  }

  private actorPosition(
    run: RunState,
    actorId: string,
  ): readonly [number, number, number] {
    const anchorRef = run.scheduler.actors.get(actorId)?.confirmedAnchorRef;
    const position = anchorRef ? this.layout.anchorPositions[anchorRef] : undefined;
    if (!anchorRef || !position) throw new Error(`actor has no confirmed position: ${actorId}`);
    return position;
  }

  private currentNpcListeners(
    run: RunState,
    speakerActorId: string,
    volume: RunAudibilityVolume,
    speakerPosition: readonly [number, number, number],
  ): string[] {
    return this.layout.actors
      .map(actor => actor.actorId)
      .filter(actorId => {
        if (actorId === speakerActorId) return false;
        const position = this.actorPosition(run, actorId);
        return (
          volumeContains(volume, position) &&
          distanceBetween(speakerPosition, position) <= volume.maxSpeechDistanceM
        );
      });
  }

  private ambientObservePacket(
    run: RunState,
    speakerActorId: string,
    targetActorId: string,
  ): ObservePacket {
    const actor = this.requireActor(run, speakerActorId);
    return this.runObservePacket(
      run,
      actor,
      [targetActorId],
      ["함께 도착한 주민과 직접 말을 나누고 들은 내용을 정확히 기억한다."],
    );
  }

  private validatedAmbientLine(
    resolved: ResolvedProposal<AgentStepProposal>,
    observePacket: ObservePacket,
    targetActorId: string,
  ): string | null {
    const parsed = agentStepProposalSchema.safeParse(resolved.proposal);
    if (!parsed.success) return null;
    const proposal = parsed.data;
    if (
      proposal.toolCall?.tool !== "talk_to" ||
      proposal.toolCall.args.actorId !== targetActorId ||
      !proposal.utterance
    ) {
      return null;
    }
    return observePacket.visibleActors.includes(targetActorId)
      ? proposal.utterance.trim()
      : null;
  }

  private hasAmbientReserve(run: RunState, remainingTurns: number): boolean {
    const ambientCallCeiling = run.providerBudget.callLimit - run.providerBudget.reservedCalls;
    const ambientTokenCeiling = run.providerBudget.tokenLimit - run.providerBudget.reservedTokens;
    return (
      run.providerBudget.callsUsed + remainingTurns * AMBIENT_MAX_CALLS_PER_TURN <=
        ambientCallCeiling &&
      run.providerBudget.tokensUsed + remainingTurns * AMBIENT_TOKEN_HEADROOM_PER_TURN <=
        ambientTokenCeiling
    );
  }

  private refreshProviderBudget(run: RunState): void {
    const exactAccounting = this.proposalPort.accountingSnapshot?.(run.runId);
    if (!exactAccounting) return;
    run.providerBudget.callsUsed = exactAccounting.callsUsed;
    run.providerBudget.tokensUsed = exactAccounting.tokensUsed;
  }

  private finishAmbientAttempt(
    run: RunState,
    attempt: AmbientDecisionAttempt,
    status: "stale" | "budget_reserved" | "failed",
  ): RunNpcDecisionResponse {
    this.refreshProviderBudget(run);
    attempt.state = "terminal";
    if (run.activeAmbientConversation?.conversationId === attempt.conversationId) {
      run.activeAmbientConversation = null;
    }
    const response = this.ambientDecisionResponse(run, attempt, status, []);
    attempt.response = clone(response);
    return response;
  }

  private ambientDecisionResponse(
    run: RunState,
    attempt: AmbientDecisionAttempt,
    status: RunNpcDecisionResponse["status"],
    speechEvents: RunAmbientSpeechEvent[],
  ): RunNpcDecisionResponse {
    return {
      runId: run.runId,
      wakeId: attempt.request.wakeId,
      status,
      observedWorldRevision: attempt.request.observedWorldRevision,
      worldRevision: run.worldRevision,
      conversationId: attempt.conversationId,
      participantActorIds: clone(attempt.participantActorIds),
      speechEvents: clone(speechEvents),
      actorReadinessDeltas: clone(attempt.actorReadinessDeltas),
      providerMetas: clone(attempt.providerMetas),
    };
  }

  private serialize<T>(runId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.runChains.get(runId) ?? Promise.resolve();
    const next = previous.then(task, task);
    this.runChains.set(
      runId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  private requireRun(runId: string): RunState {
    const run = this.runs.get(runId);
    if (!run) throw new RunError(`unknown run: ${runId}`, "run_not_found");
    return run;
  }

  private requireActor(run: RunState, actorId: string): RunActorState {
    const actor = run.actors.get(actorId);
    if (!actor) throw new RunError(`unknown actor in run ${run.runId}: ${actorId}`, "actor_not_found");
    return actor;
  }

  private requireConversation(run: RunState, sessionId: string): ConversationState {
    const conversation = run.conversations.get(sessionId);
    if (!conversation) {
      throw new RunError(`unknown conversation in run ${run.runId}: ${sessionId}`, "session_not_found");
    }
    return conversation;
  }

  private publicActor(actor: RunActorState): RunActor {
    return {
      actorId: actor.actorId,
      role: actor.role,
      locationId: actor.locationId,
      stance: actor.stance,
      suspicion: actor.suspicion,
      playerConversationReady: actor.playerConversationReady,
      hasMeaningfulFirsthandConversation: actor.hasMeaningfulFirsthandConversation,
      memories: clone(actor.memories),
    };
  }

  private async executeConversationOpening(
    runId: string,
    attempt: ConversationOpeningAttempt,
  ): Promise<RunSessionPreloadResponse> {
    await this.acquireOpeningPreloadSlot(runId);
    let resolved: ResolvedProposal<ConversationProposal>;
    try {
      resolved = await this.proposalPort.proposeConversationTurn(clone(attempt.request));
    } catch (error) {
      await this.serialize(runId, async () => {
        const run = this.requireRun(runId);
        if (run.conversationOpenings.get(attempt.actorId) === attempt) {
          run.conversationOpenings.delete(attempt.actorId);
          run.preloadRequiredEvidence.delete(attempt.actorId);
        }
        this.refreshProviderBudget(run);
      });
      throw error;
    } finally {
      this.releaseOpeningPreloadSlot(runId);
    }

    return this.serialize(runId, async () => {
      const run = this.requireRun(runId);
      const actor = this.requireActor(run, attempt.actorId);
      this.trackProposal(run, resolved.meta);
      const current = run.conversationOpenings.get(actor.actorId);
      const zone = conversationZoneFor(this.layout, actor.actorId, actor.locationId);
      const evidenceKey = this.conversationEvidenceKey(run, actor);
      if (
        current !== attempt ||
        zone?.zoneId !== attempt.interactionZoneId ||
        evidenceKey !== attempt.evidenceKey ||
        run.consumedConversationEvidence.get(actor.actorId) === evidenceKey ||
        run.activeConversationId !== null ||
        run.scheduler.actors.get(actor.actorId)?.pendingMovement
      ) {
        if (current === attempt) {
          run.conversationOpenings.delete(actor.actorId);
          run.preloadRequiredEvidence.delete(actor.actorId);
          actor.playerConversationReady = false;
        }
        throw new RunError("conversation opening became stale before commit", "conversation_not_ready");
      }
      attempt.resolved = clone(resolved);
      actor.playerConversationReady = true;
      run.preloadRequiredEvidence.delete(actor.actorId);
      run.worldRevision += 1;
      return this.preloadResponse(run, actor, attempt);
    });
  }

  private async acquireOpeningPreloadSlot(runId: string): Promise<void> {
    const gate = this.openingPreloadGates.get(runId) ?? { active: 0, waiters: [] };
    this.openingPreloadGates.set(runId, gate);
    if (gate.active < MAX_CONCURRENT_OPENING_PRELOADS) {
      gate.active += 1;
      return;
    }
    await new Promise<void>(resolve => gate.waiters.push(resolve));
  }

  private releaseOpeningPreloadSlot(runId: string): void {
    const gate = this.openingPreloadGates.get(runId);
    if (!gate) return;
    const next = gate.waiters.shift();
    if (next) {
      next();
      return;
    }
    gate.active = Math.max(0, gate.active - 1);
    if (gate.active === 0) this.openingPreloadGates.delete(runId);
  }

  private validateConversationRequest(
    run: RunState,
    actor: RunActorState,
    interactionZoneId: string,
    locale: string,
  ): void {
    if (locale !== run.locale) {
      throw new RunError(
        `conversation locale ${locale} does not match run locale ${run.locale}`,
        "invalid_locale",
      );
    }
    const zone = conversationZoneFor(this.layout, actor.actorId, actor.locationId);
    if (!zone || zone.zoneId !== interactionZoneId) {
      throw new RunError(
        `interaction zone ${interactionZoneId} does not match ${actor.actorId} at ${actor.locationId}`,
        "invalid_interaction",
      );
    }
  }

  private conversationGoals(actor: RunActorState): string[] {
    return [
      ...DEFAULT_ROLE_POLICIES[actor.role].stableGoals,
      PLAYER_CONVERSATION_GOAL,
    ];
  }

  private conversationObjective(actor: RunActorState): string {
    return this.conversationGoals(actor).join(" ");
  }

  private conversationSceneFacts(actor: RunActorState): string[] {
    return [
      `The conversation is face to face with the player at ${actor.locationId}.`,
      `The speaker's role is ${actor.role}; it may use only its own memories, heard speech, and visible records.`,
      "This personal conversation cannot create an administrative record or decide the later Station hearing.",
    ];
  }

  private conversationOpeningRequest(
    run: RunState,
    actor: RunActorState,
  ): ConversationTurnRequest {
    return {
      sessionId: run.runId,
      locale: run.locale,
      beatId: `resident_opening_${actor.role}`,
      actorId: actor.actorId,
      objective: this.conversationObjective(actor),
      sceneFacts: this.conversationSceneFacts(actor),
      observePacket: this.runObservePacket(
        run,
        actor,
        ["player"],
        this.conversationGoals(actor),
      ),
      conversationHistory: [],
    };
  }

  private conversationEvidenceKey(run: RunState, actor: RunActorState): string {
    const layoutActor = this.layout.actors.find(candidate => candidate.actorId === actor.actorId);
    const block = layoutActor?.scheduleBlocks.find(
      candidate => candidate.startSeconds <= run.elapsedSeconds && run.elapsedSeconds < candidate.endSeconds,
    );
    const visibleRecordVersions = run.records
      .filter(record => record.visibleToActorIds.includes(actor.actorId))
      .map(record => [record.recordId, record.lastLedgerEventId ?? "", record.stateBody])
      .sort((first, second) => String(first[0]).localeCompare(String(second[0])));
    return JSON.stringify({
      role: actor.role,
      locationId: actor.locationId,
      scheduleBlockId: block?.blockId ?? "none",
      activity: block?.activity ?? "none",
      goals: this.conversationGoals(actor),
      memoryIds: actor.memories.map(memory => memory.memoryId),
      visibleRecordVersions,
    });
  }

  private preloadResponse(
    run: RunState,
    actor: RunActorState,
    attempt: ConversationOpeningAttempt,
  ): RunSessionPreloadResponse {
    if (!attempt.resolved) throw new Error("conversation opening has no resolved proposal");
    return {
      runId: run.runId,
      worldRevision: run.worldRevision,
      interactionZoneId: attempt.interactionZoneId,
      actor: this.publicActor(actor),
      proposalMeta: clone(attempt.resolved.meta),
    };
  }

  private setActorReadiness(
    actor: RunActorState,
    ready: boolean,
    reason?: RunActorReadinessDelta["reason"],
    deltas?: RunActorReadinessDelta[],
  ): void {
    if (actor.playerConversationReady === ready) return;
    actor.playerConversationReady = ready;
    if (reason && deltas) {
      deltas.push({ actorId: actor.actorId, playerConversationReady: ready, reason });
    }
  }

  private markPreloadRequired(
    run: RunState,
    actor: RunActorState,
    evidenceKey: string,
    deltas: RunActorReadinessDelta[],
  ): void {
    if (run.preloadRequiredEvidence.get(actor.actorId) === evidenceKey) return;
    run.preloadRequiredEvidence.set(actor.actorId, evidenceKey);
    actor.playerConversationReady = false;
    deltas.push({
      actorId: actor.actorId,
      playerConversationReady: false,
      reason: "preload_required",
    });
  }

  private reconcileConversationOpening(
    run: RunState,
    actor: RunActorState,
    deltas: RunActorReadinessDelta[],
  ): void {
    const evidenceKey = this.conversationEvidenceKey(run, actor);
    let opening = run.conversationOpenings.get(actor.actorId);
    const zone = conversationZoneFor(this.layout, actor.actorId, actor.locationId);
    if (
      opening &&
      (opening.evidenceKey !== evidenceKey || opening.interactionZoneId !== zone?.zoneId)
    ) {
      run.conversationOpenings.delete(actor.actorId);
      opening = undefined;
    }
    if (run.scheduler.actors.get(actor.actorId)?.pendingMovement) {
      this.setActorReadiness(actor, false);
      return;
    }
    if (
      opening?.resolved &&
      run.consumedConversationEvidence.get(actor.actorId) !== evidenceKey
    ) {
      run.preloadRequiredEvidence.delete(actor.actorId);
      this.setActorReadiness(actor, true, "opening_ready", deltas);
      return;
    }
    if (opening?.inFlight) {
      this.setActorReadiness(actor, false);
      return;
    }
    if (run.consumedConversationEvidence.get(actor.actorId) !== evidenceKey) {
      this.markPreloadRequired(run, actor, evidenceKey, deltas);
    } else {
      this.setActorReadiness(actor, false);
    }
  }

  private runObservePacket(
    run: RunState,
    actor: RunActorState,
    visibleActorIds: string[],
    goals: string[],
    additionalSpeech: string[] = [],
  ): ObservePacket {
    const policy = DEFAULT_ROLE_POLICIES[actor.role];
    const visibleRecords = run.records
      .filter(record => record.visibleToActorIds.includes(actor.actorId))
      .map(record => ({
        recordId: record.recordId,
        kind: record.kind,
        stateBody: record.stateBody,
      }));
    const ownActionNotes = actor.memories.map(memory => {
      if (memory.kind === "npc_utterance") return `[self_utterance] ${memory.line}`;
      if (memory.kind === "player_conversation") {
        return [
          `[player_utterance] ${memory.playerLine}`,
          `[self_reply] ${memory.npcLine}`,
          `[judgment_reason] ${memory.whyLine}`,
        ].join(" / ");
      }
      return memory.speakerActorId === actor.actorId
        ? `[self_utterance] ${memory.line}`
        : `[heard_from=${memory.speakerActorId}] ${memory.line}`;
    });
    const heardSpeech = actor.memories.flatMap(memory => {
      if (memory.kind === "player_conversation") return [memory.playerLine];
      if (
        memory.kind === "ambient_utterance" &&
        memory.speakerActorId !== actor.actorId &&
        memory.listenerActorIds.includes(actor.actorId)
      ) {
        return [`${memory.speakerActorId}: ${memory.line}`];
      }
      return [];
    });
    return {
      actorId: actor.actorId,
      role: actor.role,
      landmarkId: actor.locationId,
      goals: [...goals],
      actorPolicy: {
        role: policy.role,
        stableGoals: [...policy.stableGoals],
        priorityShifts: [...policy.priorityShifts],
        forbiddenClaims: [...policy.forbiddenClaims],
      },
      actorMemory: {
        actorId: actor.actorId,
        ownActionNotes,
        observedLedgerEventIds: run.ledgerEvents
          .filter(event => event.actorId === actor.actorId)
          .map(event => event.eventId),
      },
      visibleObjects: [],
      visibleRecords,
      visibleLedgerEvents: [],
      visibleActors: [...new Set(visibleActorIds.filter(id => id !== actor.actorId))],
      heardSpeech: [...heardSpeech, ...additionalSpeech],
      toolCatalog: toolCatalogForRole(actor.role),
    };
  }

  private nextTurn(
    sessionId: string,
    turnIndex: number,
    beatId: string,
    promptId: string,
    actorId: string,
    proposal: {
      utterance: string;
      suggestedReplies: readonly [
        { text: string; intent: RunNextTurn["choices"][number]["intent"] },
        { text: string; intent: RunNextTurn["choices"][number]["intent"] },
        { text: string; intent: RunNextTurn["choices"][number]["intent"] },
      ];
      continueConversation: boolean;
    },
    proposalMeta: ProposalMeta,
  ): RunNextTurn {
    const choiceSetId = `${beatId}.generated`;
    return {
      turnId: `${sessionId}#${turnIndex}`,
      beatId,
      promptId,
      choiceSetId,
      speakerId: actorId,
      prompt: proposal.utterance,
      acceptsFreeInput: true,
      continueConversation: proposal.continueConversation,
      choices: proposal.suggestedReplies.map((reply, index) => ({
        choiceId: `${choiceSetId}.${index + 1}`,
        intent: reply.intent,
        line: reply.text,
      })) as RunNextTurn["choices"],
      proposalMeta: clone(proposalMeta),
    };
  }

  private resolvePlayerLine(turn: RunNextTurn, answer: RunSessionAnswer): string {
    if (answer.type === "choice") {
      const choice = turn.choices.find(candidate => candidate.choiceId === answer.choiceId);
      if (!choice) throw new RunError(`unknown choice: ${answer.choiceId}`, "unknown_choice");
      return choice.line;
    }
    const text = answer.text.trim();
    if (text.length === 0 || text.length > 120) {
      throw new RunError("free_input must contain 1..120 characters", "invalid_answer");
    }
    return text;
  }

  private validatedStance(proposed: CoarseStance, hasMeaningfulFirsthand: boolean): CoarseStance {
    return proposed === "vouch" && !hasMeaningfulFirsthand ? "uncertain" : proposed;
  }

  private trackProposal(run: RunState, meta: ProposalMeta): void {
    const exactAccounting = this.proposalPort.accountingSnapshot?.(run.runId);
    if (exactAccounting) {
      run.providerBudget.callsUsed = exactAccounting.callsUsed;
      run.providerBudget.tokensUsed = exactAccounting.tokensUsed;
    } else if (meta.transport === "live") {
      run.providerBudget.callsUsed += 1;
      run.providerBudget.tokensUsed += meta.usage?.totalTokens ?? 0;
    }
    run.lastProposalMeta = clone(meta);
  }
}
