import { randomUUID } from "node:crypto";
import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../agentloop/context.js";
import type { CoarseStance } from "../contracts/types.js";
import type { NpcProposalPort, ProposalMeta } from "../providers/ports.js";
import { createProviderFromEnvironment } from "../providers/registry.js";
import {
  clampConversationScore,
  clampJudgmentDelta,
  JUDGMENT_REPORT_DELTA_CAP,
  JUDGMENT_SUSPICION_DELTA_CAP,
} from "./conversation-suspicion.js";
import type { WorldState } from "./world/index.js";
import { loadRunLayout, type RunLayout } from "./run-layout.js";
import {
  advanceRunScheduler,
  alignActorForPlayerConversation,
  createRunScheduler,
  snapshotRunScheduler,
  type RunSchedulerRuntime,
} from "./run-scheduler.js";
import type {
  RunActorReadinessDelta,
  RunAdvanceRequest,
  RunAdvanceResponse,
  RunActor,
  RunJudgment,
  RunMemory,
  RunNextTurn,
  RunNpcUtteranceMemory,
  RunPlayerConversationMemory,
  RunSessionAnswer,
  RunSessionAnswerResponse,
  RunSessionEndResponse,
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
const STUDIO_OBJECTIVE =
  "Understand why the outsider entered the studio, ask grounded follow-ups, and form a memory-based personal stance.";
const STUDIO_SCENE_FACTS = [
  "The conversation happens face to face at the studio reception desk.",
  "The player arrived from the park and has not supplied an administrative record.",
  "The receptionist may judge only this conversation and memories they personally hold.",
  "The scheduled Station hearing is later; this conversation cannot decide its verdict.",
] as const;

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
  conversations: Map<string, ConversationState>;
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

function emptyWorld(): WorldState {
  return {
    objects: [],
    records: [],
    ledger: [],
    economy: {
      accountCredit: 0,
      localTrust: 0,
      recordBurden: 0,
      stationAttention: 0,
      favor: 0,
    },
    nextSeq: 0,
  };
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
    elapsedSeconds: request.elapsedSeconds,
    arrivals,
  });
}

function anchorLocationId(anchorRef: string): string {
  return anchorRef.split(".", 1)[0] ?? anchorRef;
}

export class RunService {
  private readonly runs = new Map<string, RunState>();
  private readonly startCache = new Map<string, CachedStart>();
  private readonly runChains = new Map<string, Promise<unknown>>();
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
        playerConversationReady: seed.actorId === STUDIO_RECEPTIONIST_ID,
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
      conversations: new Map(),
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
        if (
          actor.actorId === STUDIO_RECEPTIONIST_ID &&
          arrival.anchorRef === this.layout.studioReceptionAnchorRef &&
          !actor.playerConversationReady
        ) {
          actor.playerConversationReady = true;
          actorReadinessDeltas.push({
            actorId: actor.actorId,
            playerConversationReady: true,
            reason: "arrival_at_interaction",
          });
        }
      }
      for (const movement of schedulerResult.movementDeltas) {
        if (
          movement.actorId === STUDIO_RECEPTIONIST_ID &&
          movement.targetAnchorRef !== this.layout.studioReceptionAnchorRef
        ) {
          const actor = this.requireActor(run, movement.actorId);
          if (actor.playerConversationReady) {
            actor.playerConversationReady = false;
            actorReadinessDeltas.push({
              actorId: actor.actorId,
              playerConversationReady: false,
              reason: "schedule_departure",
            });
          }
        }
      }

      const materialMutation =
        appliedElapsedSeconds > 0 ||
        schedulerResult.arrivalsApplied.length > 0 ||
        schedulerResult.movementDeltas.length > 0 ||
        schedulerResult.scheduleWakes.length > 0 ||
        actorReadinessDeltas.length > 0;
      if (materialMutation) {
        run.elapsedSeconds = toSeconds;
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
      if (interactionZoneId !== this.layout.studioReceptionInteractionZoneId) {
        throw new RunError(
          `interaction zone cannot start the Studio receptionist conversation: ${interactionZoneId}`,
          "invalid_interaction",
        );
      }
      const actor = this.requireActor(run, actorId);
      if (actorId !== STUDIO_RECEPTIONIST_ID) {
        throw new RunError(`actor has no player conversation surface in this slice: ${actorId}`, "actor_not_supported");
      }
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

      const sessionId = this.idFactory("sess");
      const resolved = await this.proposalPort.proposeConversationTurn({
        sessionId: run.runId,
        locale: run.locale,
        beatId: "studio_arrival",
        actorId,
        objective: STUDIO_OBJECTIVE,
        sceneFacts: [...STUDIO_SCENE_FACTS],
        observePacket: this.observePacket(run, actor),
        conversationHistory: [],
      });
      this.trackProposal(run, resolved.meta);
      alignActorForPlayerConversation(
        this.layout,
        run.scheduler,
        actor.actorId,
        this.layout.studioReceptionAnchorRef,
        run.elapsedSeconds,
      );
      actor.locationId = anchorLocationId(this.layout.studioReceptionAnchorRef);
      actor.playerConversationReady = false;
      const nextTurn = this.nextTurn(
        sessionId,
        0,
        "studio_arrival",
        "studio_visit_reason",
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
        observePacket: this.observePacket(run, actor, [playerLine]),
        suspicionBefore,
        reportPressureBefore: reportBefore,
        objective: STUDIO_OBJECTIVE,
        sceneFacts: [...STUDIO_SCENE_FACTS],
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
            `studio_follow_up_${conversation.turnCount}`,
            "studio_visit_follow_up",
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

  private observePacket(run: RunState, actor: RunActorState, additionalSpeech: string[] = []) {
    return assembleObservePacket(emptyWorld(), {
      actor: {
        actorId: actor.actorId,
        role: actor.role,
        landmarkId: actor.locationId,
        // The run has not received a sight/audibility observation for any
        // bystander yet; sharing a landmark alone is not visibility proof.
        knownActorIds: [],
        knownLandmarkIds: ["Park", "Studio", "Office", "Station"],
      },
      goals: [STUDIO_OBJECTIVE],
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory: {
        actorId: actor.actorId,
        ownActionNotes: actor.memories.map(
          memory =>
            memory.kind === "npc_utterance"
              ? `내 발언: ${memory.line}`
              : `플레이어 발언: ${memory.playerLine} / 내 답변: ${memory.npcLine} / 판단: ${memory.whyLine}`,
        ),
        observedLedgerEventIds: [],
      },
      heardSpeech: [
        ...actor.memories.flatMap(memory =>
          memory.kind === "player_conversation" ? [memory.playerLine] : [],
        ),
        ...additionalSpeech,
      ],
    });
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
