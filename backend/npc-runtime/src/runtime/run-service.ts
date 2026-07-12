import { createHash, randomUUID } from "node:crypto";
import {
  DEFAULT_ROLE_POLICIES,
  summarizeObservePacket,
  type ObservePacket,
} from "../agentloop/context.js";
import { recordKindsForRole, toolCatalogForRole } from "../agentloop/tools.js";
import { runBoundedProposalLoop } from "../agentloop/proposal-loop.js";
import { TranscriptStore } from "../agentloop/transcript.js";
import type { CoarseStance } from "../contracts/types.js";
import {
  gameplayLocaleSchema,
  type GameplayLocale,
} from "../localization/supported-locales.js";
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
  claimRunWake,
  createRunScheduler,
  emitRunWake,
  finishRunWake,
  issueActorGoalMovement,
  ROUTE_CADENCE_SECONDS,
  snapshotRunScheduler,
  type RunSchedulerRuntime,
} from "./run-scheduler.js";
import {
  applyRunAdministration,
  type ValidatedAdministrativeAction,
} from "./world/run-administration.js";
import { RECORD_KINDS, type RecordKind } from "./world/types.js";
import type {
  RunAdministrationDelta,
  RunActorReadinessDelta,
  RunActorSpatialFacts,
  RunAmbientConversation,
  RunAmbientSpeechEvent,
  RunAmbientUtteranceMemory,
  RunAdvanceRequest,
  RunAdvanceResponse,
  RunActor,
  RunDecisionDelta,
  RunEncounterRequest,
  RunEncounterResponse,
  RunJudgment,
  RunMemory,
  RunMovementDelta,
  RunNextTurn,
  RunNpcDecisionRequest,
  RunNpcDecisionResponse,
  RunNpcUtteranceMemory,
  RunOpenQuestion,
  RunPlayerConversationMemory,
  RunRecord,
  RunRecordReadMemory,
  RunSessionAnswer,
  RunSessionAnswerResponse,
  RunSessionEndResponse,
  RunSessionPreloadResponse,
  RunSessionSnapshotResponse,
  RunSessionStartResponse,
  RunSnapshot,
  RunSocialProvenance,
  RunSocialView,
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
const MAX_CONCURRENT_BACKGROUND_PROPOSALS = 2;
const GOAL_MAX_ATTEMPTS = 3;
const GOAL_SPEECH_COOLDOWN_SECONDS = 60;
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

interface CachedEncounter {
  signature: string;
  response: RunEncounterResponse;
}

interface AmbientObservation {
  windowId: string;
  participantAnchorRefs: Record<string, string>;
  audibilityVolumeId: string;
  observePackets: Record<string, ObservePacket>;
  participantEvidenceKeys: Record<string, string>;
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
  deliveredViaSessionEnd?: boolean;
  inFlight?: Promise<RunNpcDecisionResponse>;
}

interface CanonicalSpatialFacts {
  worldRevision: number;
  actors: Map<string, RunActorSpatialFacts>;
  materialSignatures: Map<string, string>;
}

type GoalAction =
  | { tool: "wait"; reason: string }
  | { tool: "look"; targetKind: "actor" | "object" | "record"; targetId: string }
  | { tool: "talk_to"; targetActorId: string; utterance: string }
  | { tool: "move_to"; targetAnchorRef: string }
  | ValidatedAdministrativeAction;

interface GoalObservation {
  actorId: string;
  goalKey: string;
  factRevision: number;
  factSignature: string;
  observePacket: ObservePacket;
  goal: string;
}

interface GoalDecisionAttempt {
  signature: string;
  request: RunNpcDecisionRequest;
  actorId: string;
  goalKey: string;
  state: "unclaimed" | "resolving" | "queued" | "completed" | "terminal";
  observation: GoalObservation | null;
  resolvedAction: GoalAction | null;
  actionMeta: ProposalMeta | null;
  providerMetas: ProposalMeta[];
  conversationId: string | null;
  conversationActorIds: [string, string] | null;
  conversationFactSignatures: Record<string, string>;
  conversationEvidenceKeys: Record<string, string>;
  resolvedTurns: AmbientResolvedTurn[];
  response?: RunNpcDecisionResponse;
  deliveredViaSessionEnd?: boolean;
  inFlight?: Promise<RunNpcDecisionResponse>;
}

interface GoalConversationReplyClaim {
  speakerActorId: string;
  targetActorId: string;
  observePacket: ObservePacket;
}

type GoalConversationReplyClaimResult =
  | { claim: GoalConversationReplyClaim; response?: never }
  | { claim?: never; response: RunNpcDecisionResponse };

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

interface BackgroundProviderGate {
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
  locale: GameplayLocale;
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
  goalDecisions: Map<string, GoalDecisionAttempt>;
  ambientSpeechEvents: RunAmbientSpeechEvent[];
  ambientSpeechCursor: number;
  activeAmbientConversation: RunAmbientConversation | null;
  spatialFacts: CanonicalSpatialFacts | null;
  completedGoalKeys: Set<string>;
  lastGoalSpeechAt: Map<string, number>;
  agentTranscript: TranscriptStore;
  conversations: Map<string, ConversationState>;
  conversationOpenings: Map<string, ConversationOpeningAttempt>;
  consumedConversationEvidence: Map<string, string>;
  preloadRequiredEvidence: Map<string, string>;
  records: RunSnapshot["records"];
  ledgerEvents: RunSnapshot["ledgerEvents"];
  socialView: RunSocialView;
  encounterCache: Map<string, CachedEncounter>;
  encounteredIdentityIds: Set<string>;
  encounteredSpeechEventIds: Set<string>;
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
  | "invalid_arrival"
  | "invalid_spatial_facts"
  | "encounter_id_conflict"
  | "encounter_not_visible";

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
  const spatialFacts = request.spatialFacts
    ? {
        observedWorldRevision: request.spatialFacts.observedWorldRevision,
        actors: [...request.spatialFacts.actors]
          .sort((first, second) => first.actorId.localeCompare(second.actorId))
          .map(actor => ({
            actorId: actor.actorId,
            position: actor.position,
            reachableAnchorRefs: [...actor.reachableAnchorRefs].sort(),
            visibleActorIds: [...actor.visibleActorIds].sort(),
            audibleActorIds: [...actor.audibleActorIds].sort(),
            visibleObjectIds: [...actor.visibleObjectIds].sort(),
          })),
      }
    : undefined;
  return JSON.stringify({
    runId: request.runId,
    advanceId: request.advanceId,
    observedWorldRevision: request.observedWorldRevision,
    afterSpeechSeq: request.afterSpeechSeq ?? 0,
    elapsedSeconds: request.elapsedSeconds,
    arrivals,
    spatialFacts,
  });
}

function decisionSignature(request: RunNpcDecisionRequest): string {
  return JSON.stringify({
    runId: request.runId,
    wakeId: request.wakeId,
    observedWorldRevision: request.observedWorldRevision,
  });
}

function encounterSignature(request: RunEncounterRequest): string {
  return JSON.stringify(request.encounter);
}

function pressureBand(value: number): RunSocialView["pressure"]["band"] {
  if (value >= 90) return "high";
  if (value > 0) return "raised";
  return "low";
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

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function canonicalSpatialActor(facts: RunActorSpatialFacts): RunActorSpatialFacts {
  return {
    actorId: facts.actorId,
    position: [facts.position[0], facts.position[1], facts.position[2]],
    reachableAnchorRefs: [...facts.reachableAnchorRefs].sort(),
    visibleActorIds: [...facts.visibleActorIds].sort(),
    audibleActorIds: [...facts.audibleActorIds].sort(),
    visibleObjectIds: [...facts.visibleObjectIds].sort(),
  };
}

function spatialMaterialSignature(facts: RunActorSpatialFacts): string {
  // Continuous position drift is not a provider wake. Arrival has its own
  // exact event; visibility, audibility, reachability, and objects are the
  // material decision facts.
  return JSON.stringify({
    reachableAnchorRefs: facts.reachableAnchorRefs,
    visibleActorIds: facts.visibleActorIds,
    audibleActorIds: facts.audibleActorIds,
    visibleObjectIds: facts.visibleObjectIds,
  });
}

export class RunService {
  private readonly runs = new Map<string, RunState>();
  private readonly startCache = new Map<string, CachedStart>();
  private readonly runChains = new Map<string, Promise<unknown>>();
  private readonly backgroundProviderGates = new Map<string, BackgroundProviderGate>();
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
    const parsedLocale = gameplayLocaleSchema.safeParse(locale);
    if (!parsedLocale.success) {
      throw new RunError(`unsupported gameplay locale: ${locale}`, "invalid_locale");
    }
    const runLocale = parsedLocale.data;
    const signature = startSignature(runLocale);
    const cached = this.startCache.get(startId);
    if (cached) {
      if (cached.signature !== signature) {
        throw new RunError("the same startId cannot be retried with a different payload", "start_id_conflict");
      }
      return clone(cached.response);
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
      locale: runLocale,
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
      goalDecisions: new Map(),
      ambientSpeechEvents: [],
      ambientSpeechCursor: 0,
      activeAmbientConversation: null,
      spatialFacts: null,
      completedGoalKeys: new Set(),
      lastGoalSpeechAt: new Map(),
      agentTranscript: new TranscriptStore(),
      conversations: new Map(),
      conversationOpenings: new Map(),
      consumedConversationEvidence: new Map(),
      preloadRequiredEvidence: new Map(),
      records: [],
      ledgerEvents: [],
      socialView: {
        revision: 0,
        hearing: { atSeconds: this.layout.hearingAtSeconds, due: false },
        pressure: { band: "low", latestEncounteredWhyLine: null },
        encounteredResidents: [],
        openQuestions: [],
        encounteredRecords: [],
      },
      encounterCache: new Map(),
      encounteredIdentityIds: new Set(),
      encounteredSpeechEventIds: new Set(),
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
      socialView: this.publicSocialView(run),
    };
  }

  encounter(request: RunEncounterRequest): Promise<RunEncounterResponse> {
    return this.serialize(request.runId, async () => {
      const run = this.requireRun(request.runId);
      const signature = encounterSignature(request);
      const cached = run.encounterCache.get(request.encounterId);
      if (cached) {
        if (cached.signature !== signature) {
          throw new RunError(
            "the same encounterId cannot be retried with a different payload",
            "encounter_id_conflict",
          );
        }
        return clone(cached.response);
      }

      const encounter = request.encounter;
      if (encounter.kind === "speech") {
        const event = run.ambientSpeechEvents.find(
          candidate => candidate.eventId === encounter.speechEventId,
        );
        const volume = event
          ? this.layout.audibilityVolumes.find(
              candidate => candidate.volumeId === event.audibility.volumeId,
            )
          : undefined;
        if (
          !event ||
          !volume ||
          !volumeContains(volume, encounter.playerPosition) ||
          distanceBetween(event.audibility.speakerPosition, encounter.playerPosition) >
            event.audibility.maxSpeechDistanceM
        ) {
          throw new RunError("speech was not audible at the reported player position", "encounter_not_visible");
        }
        this.discloseSpeech(run, event);
      } else {
        const surface = this.layout.recordSurfaces.find(
          candidate => candidate.surfaceId === encounter.textSurfaceId,
        );
        const anchorPosition = surface ? this.layout.anchorPositions[surface.anchorRef] : undefined;
        if (
          !surface ||
          !anchorPosition ||
          distanceBetween(anchorPosition, encounter.playerPosition) > 3
        ) {
          throw new RunError("record surface was not visible at the reported player position", "encounter_not_visible");
        }
        const matchingRecords = run.records
          .filter(record =>
            record.textSurfaceId === surface.surfaceId &&
            record.visibleToActorIds.includes("player")
          )
          .sort((first, second) => {
            const firstSeq = run.ledgerEvents.find(
              event => event.eventId === first.lastLedgerEventId,
            )?.seq ?? 0;
            const secondSeq = run.ledgerEvents.find(
              event => event.eventId === second.lastLedgerEventId,
            )?.seq ?? 0;
            return firstSeq - secondSeq;
          });
        for (const record of matchingRecords) {
          this.discloseRecord(run, record);
        }
      }

      const response: RunEncounterResponse = {
        runId: run.runId,
        encounterId: request.encounterId,
        socialView: this.publicSocialView(run),
      };
      run.encounterCache.set(request.encounterId, { signature, response: clone(response) });
      while (run.encounterCache.size > 256) {
        const oldest = run.encounterCache.keys().next().value as string | undefined;
        if (!oldest) break;
        run.encounterCache.delete(oldest);
      }
      return response;
    });
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

      let incomingSpatialFacts: Map<string, RunActorSpatialFacts> | null = null;
      if (request.spatialFacts) {
        if (request.spatialFacts.observedWorldRevision !== request.observedWorldRevision) {
          throw new RunError(
            "spatial facts must observe the same revision as the advance",
            "invalid_spatial_facts",
          );
        }
        const expectedActorIds = new Set(this.layout.actors.map(actor => actor.actorId));
        const receivedActorIds = new Set(request.spatialFacts.actors.map(actor => actor.actorId));
        if (
          receivedActorIds.size !== expectedActorIds.size ||
          [...expectedActorIds].some(actorId => !receivedActorIds.has(actorId))
        ) {
          throw new RunError(
            "spatial facts must contain each of the six run actors exactly once",
            "invalid_spatial_facts",
          );
        }
        incomingSpatialFacts = new Map();
        for (const rawFacts of request.spatialFacts.actors) {
          const facts = canonicalSpatialActor(rawFacts);
          for (const values of [
            rawFacts.reachableAnchorRefs,
            rawFacts.visibleActorIds,
            rawFacts.audibleActorIds,
            rawFacts.visibleObjectIds,
          ]) {
            if (new Set(values).size !== values.length) {
              throw new RunError(
                `spatial facts contain duplicate ids for ${rawFacts.actorId}`,
                "invalid_spatial_facts",
              );
            }
          }
          if (facts.visibleObjectIds.length > 0) {
            throw new RunError(
              `spatial facts reference objects before a canonical object source exists: ${facts.actorId}`,
              "invalid_spatial_facts",
            );
          }
          if (facts.reachableAnchorRefs.some(anchorRef => !this.layout.anchorRefs.includes(anchorRef))) {
            throw new RunError(
              `spatial facts reference an unknown anchor for ${facts.actorId}`,
              "invalid_spatial_facts",
            );
          }
          for (const targetId of [...facts.visibleActorIds, ...facts.audibleActorIds]) {
            if (!expectedActorIds.has(targetId) || targetId === facts.actorId) {
              throw new RunError(
                `spatial facts reference an invalid actor target ${facts.actorId}:${targetId}`,
                "invalid_spatial_facts",
              );
            }
          }
          incomingSpatialFacts.set(facts.actorId, facts);
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
      for (const arrival of schedulerResult.arrivalsApplied) {
        emitRunWake(
          run.scheduler,
          {
            wakeId: `wake:${run.runId}:arrival:${arrival.movementId}`,
            kind: "arrival",
            phase: "due",
            sourceId: arrival.movementId,
            actorIds: [arrival.actorId],
            scheduledAtSeconds: fromSeconds,
            observedWorldRevision: candidateWorldRevision,
            requiresDecision: false,
            status: "informational",
          },
          schedulerResult.scheduleWakes,
        );
      }

      let spatialFactsChanged = false;
      if (incomingSpatialFacts) {
        const prior = run.spatialFacts;
        for (const layoutActor of this.layout.actors) {
          const facts = incomingSpatialFacts.get(layoutActor.actorId);
          if (!facts) continue;
          const materialSignature = spatialMaterialSignature(facts);
          const priorMaterialSignature = prior?.materialSignatures.get(layoutActor.actorId);
          if (priorMaterialSignature !== materialSignature) {
            spatialFactsChanged = true;
            emitRunWake(
              run.scheduler,
              {
                wakeId: `wake:${run.runId}:observation:${layoutActor.actorId}:${candidateWorldRevision}`,
                kind: "observation",
                phase: "due",
                sourceId: `spatial:${digest(materialSignature)}`,
                actorIds: [layoutActor.actorId],
                scheduledAtSeconds: toSeconds,
                observedWorldRevision: candidateWorldRevision,
                requiresDecision: false,
                status: "informational",
              },
              schedulerResult.scheduleWakes,
            );
          }

          const schedulerActor = run.scheduler.actors.get(layoutActor.actorId);
          if (schedulerActor?.pendingMovement) continue;
          const actor = this.requireActor(run, layoutActor.actorId);
          const goalKey = this.actorGoalKey(run, actor, materialSignature, toSeconds);
          const goalAlreadyCompleted = run.completedGoalKeys.has(`${actor.actorId}:${goalKey}`);
          const goalAlreadyPending = [...run.scheduler.pendingWakes.values()].some(
            wake =>
              wake.kind === "goal" &&
              wake.actorIds[0] === actor.actorId &&
              wake.sourceId === goalKey &&
              (wake.status === "pending" || wake.status === "claimed"),
          );
          if (goalAlreadyCompleted || goalAlreadyPending) continue;
          emitRunWake(
            run.scheduler,
            {
              wakeId: `wake:${run.runId}:goal:${actor.actorId}:${candidateWorldRevision}`,
              kind: "goal",
              phase: "due",
              sourceId: goalKey,
              actorIds: [actor.actorId],
              scheduledAtSeconds: toSeconds,
              observedWorldRevision: candidateWorldRevision,
              requiresDecision: true,
              status: "pending",
            },
            schedulerResult.scheduleWakes,
          );
        }
      }
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

      const spatialPositionChanged = incomingSpatialFacts
        ? this.spatialPositionsChanged(run.spatialFacts, incomingSpatialFacts)
        : false;
      const materialMutation =
        schedulerMutation ||
        actorReadinessDeltas.length > 0 ||
        spatialFactsChanged ||
        spatialPositionChanged;
      if (materialMutation) {
        if (!schedulerMutation) run.elapsedSeconds = toSeconds;
        run.worldRevision = candidateWorldRevision;
        if (incomingSpatialFacts) {
          run.spatialFacts = {
            worldRevision: candidateWorldRevision,
            actors: incomingSpatialFacts,
            materialSignatures: new Map(
              [...incomingSpatialFacts].map(([actorId, facts]) => [
                actorId,
                spatialMaterialSignature(facts),
              ]),
            ),
          };
        }
      }
      if (!run.socialView.hearing.due && run.elapsedSeconds >= run.hearingAtSeconds) {
        run.socialView.hearing.due = true;
        this.bumpSocialRevision(run);
      }
      schedulerResult.scheduleWakes.sort((first, second) =>
        first.scheduledAtSeconds === second.scheduledAtSeconds
          ? first.wakeId.localeCompare(second.wakeId)
          : first.scheduledAtSeconds - second.scheduledAtSeconds,
      );
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
        socialView: this.publicSocialView(run),
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
    const ambientAttempt = run.ambientDecisions.get(request.wakeId);
    const goalAttempt = run.goalDecisions.get(request.wakeId);
    const existing = ambientAttempt ?? goalAttempt;
    if (existing) {
      if (existing.signature !== signature) {
        return Promise.reject(
          new RunError(
            "the same wakeId cannot be retried with a different payload",
            "decision_id_conflict",
          ),
        );
      }
      if (existing.inFlight) return existing.inFlight.then(response => clone(response));
      if (
        existing.response &&
        (existing.state === "completed" || existing.state === "terminal")
      ) {
        return Promise.resolve(clone(existing.response));
      }
    }

    if (ambientAttempt) return this.startAmbientDecisionExecution(request.runId, ambientAttempt);
    if (goalAttempt) return this.startGoalDecisionExecution(request.runId, goalAttempt);

    const wake = run.scheduler.pendingWakes.get(request.wakeId);
    if (!wake || wake.status !== "pending") {
      return Promise.reject(new RunError(`wake is not pending: ${request.wakeId}`, "wake_not_pending"));
    }
    if (wake.kind === "meeting_ready" && wake.actorIds.length === 2) {
      const [firstActorId, secondActorId] = wake.actorIds;
      if (!firstActorId || !secondActorId) {
        return Promise.reject(new RunError("meeting wake has invalid participants", "wake_not_supported"));
      }
      const attempt: AmbientDecisionAttempt = {
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
      return this.startAmbientDecisionExecution(request.runId, attempt);
    }
    if (wake.kind === "goal" && wake.actorIds.length === 1 && wake.actorIds[0]) {
      const attempt: GoalDecisionAttempt = {
        signature,
        request: clone(request),
        actorId: wake.actorIds[0],
        goalKey: wake.sourceId,
        state: "unclaimed",
        observation: null,
        resolvedAction: null,
        actionMeta: null,
        providerMetas: [],
        conversationId: null,
        conversationActorIds: null,
        conversationFactSignatures: {},
        conversationEvidenceKeys: {},
        resolvedTurns: [],
      };
      run.goalDecisions.set(request.wakeId, attempt);
      return this.startGoalDecisionExecution(request.runId, attempt);
    }
    return Promise.reject(
      new RunError(`wake cannot open an NPC decision: ${request.wakeId}`, "wake_not_supported"),
    );
  }

  private startAmbientDecisionExecution(
    runId: string,
    attempt: AmbientDecisionAttempt,
  ): Promise<RunNpcDecisionResponse> {
    const executing = this.executeAmbientDecision(runId, attempt);
    attempt.inFlight = executing;
    void executing
      .finally(() => {
        if (attempt?.inFlight === executing) attempt.inFlight = undefined;
      })
      .catch(() => undefined);
    return executing.then(response => clone(response));
  }

  private startGoalDecisionExecution(
    runId: string,
    attempt: GoalDecisionAttempt,
  ): Promise<RunNpcDecisionResponse> {
    const executing = this.executeGoalDecision(runId, attempt);
    attempt.inFlight = executing;
    void executing
      .finally(() => {
        if (attempt.inFlight === executing) attempt.inFlight = undefined;
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
            socialView: this.publicSocialView(run),
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
      run.encounteredIdentityIds.add(actor.actorId);
      return {
        runId,
        sessionId,
        worldRevision: run.worldRevision,
        actor: this.publicActor(actor),
        nextTurn: clone(nextTurn),
        socialView: this.publicSocialView(run),
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
        openQuestion: clone(resolved.proposal.openQuestion ?? null),
        worldSeconds: run.elapsedSeconds,
        worldRevision: nextRevision,
        proposalMeta: clone(resolved.meta),
      };

      actor.suspicion = suspicionAfter;
      actor.stance = stanceAfter;
      actor.hasMeaningfulFirsthandConversation = hasFirsthand;
      actor.memories.push(memory);
      run.worldRevision = nextRevision;
      this.discloseResidentJudgment(run, actor, memory);
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
        socialView: this.publicSocialView(run),
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
      const queuedRunDeltas = this.drainQueuedRunDeltas(run);
      actor.playerConversationReady = false;
      run.conversationOpenings.delete(actor.actorId);
      run.preloadRequiredEvidence.delete(actor.actorId);
      run.consumedConversationEvidence.set(
        actor.actorId,
        this.conversationEvidenceKey(run, actor),
      );
      run.worldRevision += 1;
      for (const delta of queuedRunDeltas) {
        if (delta.kind === "look") delta.worldRevision = run.worldRevision;
      }
      const response: RunSessionEndResponse = {
        runId,
        sessionId,
        ended: true,
        worldRevision: run.worldRevision,
        actor: this.publicActor(actor),
        queuedRunDeltas,
        socialView: this.publicSocialView(run),
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

  private drainQueuedRunDeltas(run: RunState): RunDecisionDelta[] {
    const drained: RunDecisionDelta[] = [];
    for (const attempt of run.ambientDecisions.values()) {
      if (attempt.state !== "queued") continue;
      const committed = this.commitAmbientDecision(run, attempt);
      drained.push(...clone(committed.actionDeltas));
      if (committed.actionDeltas.length > 0) {
        attempt.deliveredViaSessionEnd = true;
        attempt.response = {
          ...clone(committed),
          speechEvents: [],
          actorReadinessDeltas: [],
          actionDeltas: [],
          movementDeltas: [],
        };
      }
    }
    for (const attempt of run.goalDecisions.values()) {
      if (attempt.state !== "queued") continue;
      const committed = this.commitGoalDecision(run, attempt);
      drained.push(...clone(committed.actionDeltas));
      if (committed.actionDeltas.length > 0) {
        attempt.deliveredViaSessionEnd = true;
        attempt.response = {
          ...clone(committed),
          speechEvents: [],
          actorReadinessDeltas: [],
          actionDeltas: [],
          movementDeltas: [],
        };
      }
    }
    return drained;
  }

  private async executeGoalDecision(
    runId: string,
    attempt: GoalDecisionAttempt,
  ): Promise<RunNpcDecisionResponse> {
    if (attempt.state === "unclaimed") {
      const early = await this.serialize(runId, async () =>
        this.claimGoalDecision(this.requireRun(runId), attempt),
      );
      if (early) return early;
    }
    if (attempt.response && (attempt.state === "completed" || attempt.state === "terminal")) {
      return clone(attempt.response);
    }
    if (attempt.state === "queued") {
      return this.serialize(runId, async () =>
        this.commitGoalDecision(this.requireRun(runId), attempt),
      );
    }

    const observation = attempt.observation;
    if (!observation) {
      return this.serialize(runId, async () =>
        this.finishGoalAttempt(this.requireRun(runId), attempt, "failed"),
      );
    }

    let budgetReserved = false;
    const budgetStop = new Error("goal_background_budget_reserved");
    try {
      const initialRun = this.requireRun(runId);
      const loop = await runBoundedProposalLoop<GoalAction>({
        sessionId: runId,
        locale: initialRun.locale,
        actorId: attempt.actorId,
        goal: observation.goal,
        maxAttempts: GOAL_MAX_ATTEMPTS,
        proposalPort: this.proposalPort,
        transcript: initialRun.agentTranscript,
        observe: () => clone(observation.observePacket),
        budgetCeiling: {
          maxCalls: runAmbientCallCeiling(initialRun),
          maxTokens: runAmbientTokenCeiling(initialRun),
        },
        invoke: async request => {
          const reserveAvailable = await this.serialize(runId, async () => {
            const run = this.requireRun(runId);
            this.refreshProviderBudget(run);
            return this.hasAmbientReserve(run, 1);
          });
          if (!reserveAvailable) {
            budgetReserved = true;
            throw budgetStop;
          }
          return this.withBackgroundProviderSlot(runId, () =>
            this.proposalPort.proposeNextStep(request),
          );
        },
        onMeta: async meta => {
          await this.serialize(runId, async () => {
            this.trackProposal(this.requireRun(runId), meta);
          });
          attempt.providerMetas.push(clone(meta));
          while (attempt.providerMetas.length > 3) attempt.providerMetas.shift();
          if (meta.fallbackReason === "budget_exhausted") {
            budgetReserved = true;
            throw budgetStop;
          }
        },
        evaluate: proposal => {
          const validated = this.validateGoalProposal(
            this.requireRun(runId),
            observation,
            proposal,
          );
          if (validated.action) {
            return {
              status: "accepted",
              value: validated.action,
              validation: { ok: true, note: `validated ${validated.action.tool}` },
              nextStepChange: "validated action is ready for fresh commit revalidation",
            };
          }
          return {
            status: "blocked",
            validation: {
              ok: false,
              reason: validated.reason ?? "invalid_args",
              detail: validated.detail ?? "goal proposal was not valid in current spatial facts",
              note: validated.detail ?? "goal proposal blocked",
            },
            nextStepChange: `blocked (${validated.reason ?? "invalid_args"}); provider must re-plan`,
          };
        },
      });
      attempt.resolvedAction = loop.accepted[0] ?? null;
      attempt.actionMeta = loop.accepted.length > 0 ? clone(loop.metas.at(-1) as ProposalMeta) : null;
    } catch (error) {
      if (budgetReserved || error === budgetStop) {
        return this.serialize(runId, async () =>
          this.finishGoalAttempt(this.requireRun(runId), attempt, "budget_reserved", true),
        );
      }
      // The deterministic policy action below keeps the wake terminal and
      // honest without granting any world mutation after provider failure.
    }

    if (attempt.resolvedAction?.tool === "talk_to" && attempt.actionMeta) {
      const early = await this.resolveGoalConversationReply(runId, attempt);
      if (early) return early;
    }

    if (!attempt.resolvedAction) {
      attempt.resolvedAction = { tool: "wait", reason: "bounded goal fallback" };
      const fallbackMeta = this.goalFallbackMeta("invalid_envelope");
      attempt.actionMeta = fallbackMeta;
      attempt.providerMetas = [
        ...attempt.providerMetas.slice(-(GOAL_MAX_ATTEMPTS - 1)),
        clone(fallbackMeta),
      ];
    }
    return this.serialize(runId, async () => {
      const run = this.requireRun(runId);
      if (attempt.actionMeta?.usedFallback) {
        this.trackProposal(run, attempt.actionMeta);
        run.agentTranscript.append({
          actorId: attempt.actorId,
          step: run.agentTranscript.nextStep(attempt.actorId),
          observedSummary: summarizeObservePacket(observation.observePacket),
          tool: "wait",
          args: { reason: "bounded goal fallback" },
          rationale: "provider attempts exhausted; deterministic policy yields this beat",
          proposalMeta: clone(attempt.actionMeta),
          validation: { ok: true, note: "deterministic fallback wait" },
          nextStepChange: "goal yields without a world mutation",
        });
      }
      return this.commitGoalDecision(run, attempt);
    });
  }

  private claimGoalDecision(
    run: RunState,
    attempt: GoalDecisionAttempt,
  ): RunNpcDecisionResponse | null {
    const pending = run.scheduler.pendingWakes.get(attempt.request.wakeId);
    if (!pending || pending.status !== "pending") {
      throw new RunError(`wake is not pending: ${attempt.request.wakeId}`, "wake_not_pending");
    }
    const wake = claimRunWake(run.scheduler, attempt.request.wakeId);
    if (
      !wake ||
      wake.kind !== "goal" ||
      wake.actorIds.length !== 1 ||
      wake.actorIds[0] !== attempt.actorId ||
      wake.sourceId !== attempt.goalKey
    ) {
      throw new RunError(`wake cannot open an actor goal: ${attempt.request.wakeId}`, "wake_not_supported");
    }
    const facts = run.spatialFacts?.actors.get(attempt.actorId);
    if (
      wake.observedWorldRevision !== attempt.request.observedWorldRevision ||
      !facts ||
      run.scheduler.actors.get(attempt.actorId)?.pendingMovement
    ) {
      return this.finishGoalAttempt(run, attempt, "stale");
    }
    const actor = this.requireActor(run, attempt.actorId);
    const factSignature = spatialMaterialSignature(facts);
    if (this.actorGoalKey(run, actor, factSignature) !== attempt.goalKey) {
      return this.finishGoalAttempt(run, attempt, "stale");
    }
    this.refreshProviderBudget(run);
    if (!this.hasAmbientReserve(run, 1)) {
      return this.finishGoalAttempt(run, attempt, "budget_reserved", true);
    }
    const policy = DEFAULT_ROLE_POLICIES[actor.role];
    const goal = [...policy.stableGoals, "Advance one currently actionable role goal, then yield."].join(" ");
    const observePacket = this.runObservePacket(
      run,
      actor,
      facts.visibleActorIds,
      [goal],
      [],
      facts,
    );
    observePacket.reachableAnchorRefs = facts.reachableAnchorRefs.filter(anchorRef =>
      this.schedulePermitsAnchor(run, actor.actorId, anchorRef) &&
      run.scheduler.actors.get(actor.actorId)?.confirmedAnchorRef !== anchorRef,
    );
    const offeredTools: ObservePacket["toolCatalog"] = ["wait"];
    if (observePacket.reachableAnchorRefs.length > 0) offeredTools.unshift("move_to");
    if (
      observePacket.visibleActors.length > 0 ||
      observePacket.visibleObjects.length > 0 ||
      observePacket.visibleRecords.length > 0
    ) offeredTools.unshift("look");
    if (observePacket.visibleRecords.some(record =>
      !this.hasReadRecordRevision(actor, record.recordId, record.recordRevision ?? 0)
    )) offeredTools.unshift("read_record");
    if (
      observePacket.administrativeSources.length > 0 &&
      observePacket.administrativeAuthority.allowedRecordKinds.length > 0 &&
      observePacket.administrativeAuthority.writableTextSurfaceIds.length > 0
    ) offeredTools.unshift("write_record");
    const lastSpokeAt = run.lastGoalSpeechAt.get(actor.actorId);
    const talkAvailable =
      run.activeAmbientConversation === null &&
      (lastSpokeAt === undefined ||
        run.elapsedSeconds - lastSpokeAt >= GOAL_SPEECH_COOLDOWN_SECONDS) &&
      facts.visibleActorIds.some(targetActorId => {
        const targetFacts = run.spatialFacts?.actors.get(targetActorId);
        const targetLastSpokeAt = run.lastGoalSpeechAt.get(targetActorId);
        return Boolean(
          facts.audibleActorIds.includes(targetActorId) &&
          targetFacts?.audibleActorIds.includes(actor.actorId) &&
          (targetLastSpokeAt === undefined ||
            run.elapsedSeconds - targetLastSpokeAt >= GOAL_SPEECH_COOLDOWN_SECONDS) &&
          !run.scheduler.actors.get(targetActorId)?.pendingMovement &&
          this.spatialAudibilityVolume(run, actor.actorId, targetActorId),
        );
      });
    if (talkAvailable) offeredTools.unshift("talk_to");
    observePacket.toolCatalog = offeredTools;
    attempt.observation = {
      actorId: actor.actorId,
      goalKey: attempt.goalKey,
      factRevision: run.worldRevision,
      factSignature,
      observePacket,
      goal,
    };
    attempt.state = "resolving";
    return null;
  }

  private validateGoalProposal(
    run: RunState,
    observation: GoalObservation,
    proposal: AgentStepProposal,
  ): { action?: GoalAction; reason?: string; detail?: string } {
    const parsed = agentStepProposalSchema.safeParse({
      toolCall: proposal.toolCall ?? null,
      utterance: proposal.utterance ?? null,
      rationale: proposal.rationale,
      done: proposal.done,
    });
    if (!parsed.success) {
      return { reason: "invalid_args", detail: "agent step envelope is invalid" };
    }
    const step = parsed.data;
    if (step.done && !step.toolCall) {
      return { action: { tool: "wait", reason: step.rationale } };
    }
    const call = step.toolCall;
    if (!call) return { reason: "invalid_args", detail: "goal step requires a tool or done" };
    const asId = (value: unknown): string | null =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
    const asOpenQuestion = (value: unknown): RunOpenQuestion | null | undefined => {
      if (value === null) return null;
      if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
      const question = value as Record<string, unknown>;
      const status = question.status;
      const text = asId(question.text);
      const whyLine = asId(question.whyLine);
      if ((status !== "open" && status !== "resolved") || !text || !whyLine) return undefined;
      if (Object.keys(question).some(key => !["status", "text", "whyLine"].includes(key))) {
        return undefined;
      }
      return { status, text, whyLine };
    };
    switch (call.tool) {
      case "wait":
        return {
          action: {
            tool: "wait",
            reason: asId(call.args.reason) ?? step.rationale,
          },
        };
      case "look": {
        const targetId = asId(call.args.targetId);
        if (!targetId) return { reason: "invalid_args", detail: "look requires targetId" };
        if (observation.observePacket.visibleActors.includes(targetId)) {
          return { action: { tool: "look", targetKind: "actor", targetId } };
        }
        if (observation.observePacket.visibleObjects.some(object => object.objectId === targetId)) {
          return { action: { tool: "look", targetKind: "object", targetId } };
        }
        if (observation.observePacket.visibleRecords.some(record => record.recordId === targetId)) {
          return { action: { tool: "look", targetKind: "record", targetId } };
        }
        return { reason: "not_visible", detail: `${targetId} is not visible` };
      }
      case "talk_to": {
        const targetActorId = asId(call.args.actorId);
        if (!targetActorId || !step.utterance) {
          return { reason: "invalid_args", detail: "talk_to requires actorId and utterance" };
        }
        if (
          run.activeAmbientConversation !== null ||
          !observation.observePacket.visibleActors.includes(targetActorId) ||
          !observation.observePacket.audibleActorIds.includes(targetActorId) ||
          !run.spatialFacts?.actors.get(targetActorId)?.audibleActorIds.includes(observation.actorId)
        ) {
          return { reason: "target_unavailable", detail: `${targetActorId} is not visible and audible` };
        }
        const lastSpokeAt = run.lastGoalSpeechAt.get(observation.actorId);
        const targetLastSpokeAt = run.lastGoalSpeechAt.get(targetActorId);
        if (
          (lastSpokeAt !== undefined &&
            run.elapsedSeconds - lastSpokeAt < GOAL_SPEECH_COOLDOWN_SECONDS) ||
          (targetLastSpokeAt !== undefined &&
            run.elapsedSeconds - targetLastSpokeAt < GOAL_SPEECH_COOLDOWN_SECONDS)
        ) {
          return {
            reason: "target_unavailable",
            detail: "a participant already spoke during this world-time instant",
          };
        }
        if (!this.spatialAudibilityVolume(run, observation.actorId, targetActorId)) {
          return {
            reason: "target_unavailable",
            detail: `${targetActorId} has no authored audibility volume shared with the speaker`,
          };
        }
        return { action: { tool: "talk_to", targetActorId, utterance: step.utterance } };
      }
      case "move_to": {
        const targetAnchorRef = asId(call.args.targetId);
        if (!targetAnchorRef) {
          return { reason: "invalid_args", detail: "move_to requires targetId" };
        }
        if (!observation.observePacket.reachableAnchorRefs.includes(targetAnchorRef)) {
          return { reason: "unreachable", detail: `${targetAnchorRef} is not navmesh-reachable` };
        }
        if (!this.schedulePermitsAnchor(run, observation.actorId, targetAnchorRef)) {
          return { reason: "unreachable", detail: `${targetAnchorRef} is outside current schedule policy` };
        }
        return { action: { tool: "move_to", targetAnchorRef } };
      }
      case "write_record": {
        const recordKind = asId(call.args.recordKind) as RecordKind | null;
        const sourceMemoryId = asId(call.args.sourceMemoryId);
        const stateBody = asId(call.args.stateBody);
        const whyLine = asId(call.args.whyLine);
        const textSurfaceId = asId(call.args.textSurfaceId);
        const requestedRecordId = asId(call.args.recordId);
        const pressureDelta = Number(call.args.institutionalPressureDelta);
        const openQuestion = Object.prototype.hasOwnProperty.call(call.args, "openQuestion")
          ? asOpenQuestion(call.args.openQuestion)
          : undefined;
        if (
          !recordKind ||
          !RECORD_KINDS.includes(recordKind) ||
          !sourceMemoryId ||
          !stateBody ||
          !whyLine ||
          !textSurfaceId ||
          !Number.isInteger(pressureDelta) ||
          openQuestion === undefined
        ) {
          return { reason: "invalid_args", detail: "write_record requires the M3R administrative contract" };
        }
        if (!observation.observePacket.administrativeAuthority.allowedRecordKinds.includes(recordKind)) {
          return { reason: "role_authority_exceeded", detail: `${recordKind} is not authorized for this role` };
        }
        if (!observation.observePacket.administrativeAuthority.writableTextSurfaceIds.includes(textSurfaceId)) {
          return { reason: "not_visible", detail: `${textSurfaceId} is not an available record surface` };
        }
        const source = observation.observePacket.administrativeSources.find(
          candidate => candidate.memoryId === sourceMemoryId,
        );
        if (!source) {
          return { reason: "cited_event_unknown", detail: `${sourceMemoryId} is not this actor's memory` };
        }
        if (this.sourceAlreadyAdministered(run, observation.actorId, sourceMemoryId)) {
          return { reason: "already_recorded", detail: "that source memory already produced an administrative record" };
        }
        const existing = requestedRecordId
          ? run.records.find(record => record.recordId === requestedRecordId)
          : undefined;
        if (requestedRecordId && (!existing || existing.authorActorId !== observation.actorId)) {
          return { reason: "record_visibility_denied", detail: "only the author may update this visible record" };
        }
        if (existing && existing.textSurfaceId !== textSurfaceId) {
          return { reason: "invalid_args", detail: "a record update cannot move between surfaces" };
        }
        return {
          action: {
            tool: "write_record",
            recordKind: existing?.kind ?? recordKind,
            sourceMemoryId,
            originActorId: source.originActorId,
            stateBody,
            whyLine,
            institutionalPressureDelta: pressureDelta,
            textSurfaceId: existing?.textSurfaceId ?? textSurfaceId,
            ...(existing ? { recordId: existing.recordId } : {}),
            visibleToActorIds: existing?.visibleToActorIds ??
              this.recordVisibility(run, observation.actorId, recordKind),
            openQuestion,
          },
        };
      }
      case "read_record": {
        const recordId = asId(call.args.recordId);
        const whyLine = asId(call.args.whyLine);
        const pressureDelta = Number(call.args.institutionalPressureDelta);
        const openQuestion = Object.prototype.hasOwnProperty.call(call.args, "openQuestion")
          ? asOpenQuestion(call.args.openQuestion)
          : undefined;
        const record = recordId
          ? run.records.find(candidate =>
              candidate.recordId === recordId &&
              candidate.visibleToActorIds.includes(observation.actorId)
            )
          : undefined;
        if (
          !recordId ||
          !record ||
          !whyLine ||
          !Number.isInteger(pressureDelta) ||
          openQuestion === undefined
        ) {
          return { reason: "record_visibility_denied", detail: "read_record requires one visible record revision" };
        }
        const actor = this.requireActor(run, observation.actorId);
        if (this.hasReadRecordRevision(actor, record.recordId, record.recordRevision)) {
          return { reason: "already_read", detail: "this actor already read that record revision" };
        }
        const sourceMemoryId = record.sourceRefs[0]?.sourceMemoryId;
        if (!sourceMemoryId) return { reason: "cited_event_unknown", detail: "record has no source memory" };
        return {
          action: {
            tool: "read_record",
            recordId: record.recordId,
            sourceMemoryId,
            whyLine,
            institutionalPressureDelta: pressureDelta,
            openQuestion,
          },
        };
      }
      default:
        return { reason: "role_authority_exceeded", detail: `${call.tool} is not legal for a T4 goal wake` };
    }
  }

  private async resolveGoalConversationReply(
    runId: string,
    attempt: GoalDecisionAttempt,
  ): Promise<RunNpcDecisionResponse | null> {
    const claimed = await this.serialize(runId, async () =>
      this.claimGoalConversationReply(this.requireRun(runId), attempt),
    );
    if (claimed.response) return claimed.response;
    const claim = claimed.claim;
    const budgetStop = new Error("goal_conversation_budget_reserved");
    let budgetReserved = false;
    try {
      const run = this.requireRun(runId);
      const loop = await runBoundedProposalLoop<AmbientResolvedTurn>({
        sessionId: runId,
        locale: run.locale,
        actorId: claim.speakerActorId,
        goal: "Reply once to the resident who addressed you, then end this exchange cleanly.",
        maxAttempts: 1,
        proposalPort: this.proposalPort,
        transcript: run.agentTranscript,
        observe: () => clone(claim.observePacket),
        budgetCeiling: {
          maxCalls: runAmbientCallCeiling(run),
          maxTokens: runAmbientTokenCeiling(run),
        },
        invoke: async request => {
          const reserveAvailable = await this.serialize(runId, async () => {
            const current = this.requireRun(runId);
            this.refreshProviderBudget(current);
            return this.hasAmbientReserve(current, 1);
          });
          if (!reserveAvailable) {
            budgetReserved = true;
            throw budgetStop;
          }
          return this.withBackgroundProviderSlot(runId, () =>
            this.proposalPort.proposeNextStep({
              ...request,
              requiredToolCall: { tool: "talk_to", actorId: claim.targetActorId },
              requireUtterance: true,
            }),
          );
        },
        onMeta: async meta => {
          await this.serialize(runId, async () => {
            this.trackProposal(this.requireRun(runId), meta);
          });
          attempt.providerMetas.push(clone(meta));
          while (attempt.providerMetas.length > 3) attempt.providerMetas.shift();
          if (meta.fallbackReason === "budget_exhausted") {
            budgetReserved = true;
            throw budgetStop;
          }
        },
        evaluate: (proposal, meta) => {
          const line = this.validatedAmbientLine(
            { proposal, meta },
            claim.observePacket,
            claim.targetActorId,
          );
          if (!line || !claim.observePacket.audibleActorIds.includes(claim.targetActorId)) {
            return {
              status: "blocked",
              validation: {
                ok: false,
                reason: "target_unavailable",
                detail: "reply target is not currently visible and audible",
                note: "reply was blocked",
              },
              nextStepChange: "bounded exchange ends without committing partial speech",
            };
          }
          return {
            status: "accepted",
            value: {
              speakerActorId: claim.speakerActorId,
              targetActorId: claim.targetActorId,
              line,
              meta: clone(meta),
            },
            validation: { ok: true, note: "validated bounded reply" },
            nextStepChange: "the two-turn exchange is ready for fresh commit revalidation",
          };
        },
      });
      const reply = loop.accepted[0];
      if (reply) {
        attempt.resolvedTurns.push(reply);
        return null;
      }
    } catch (error) {
      if (budgetReserved || error === budgetStop) {
        return this.serialize(runId, async () =>
          this.finishGoalAttempt(this.requireRun(runId), attempt, "budget_reserved", true),
        );
      }
    }

    await this.serialize(runId, async () => {
      const current = this.requireRun(runId);
      if (current.activeAmbientConversation?.wakeId === attempt.request.wakeId) {
        current.activeAmbientConversation = null;
      }
      attempt.resolvedAction = null;
      attempt.actionMeta = null;
      attempt.conversationId = null;
      attempt.conversationActorIds = null;
      attempt.conversationFactSignatures = {};
      attempt.conversationEvidenceKeys = {};
      attempt.resolvedTurns = [];
    });
    return null;
  }

  private claimGoalConversationReply(
    run: RunState,
    attempt: GoalDecisionAttempt,
  ): GoalConversationReplyClaimResult {
    const action = attempt.resolvedAction;
    if (!attempt.observation || action?.tool !== "talk_to" || !attempt.actionMeta) {
      return { response: this.finishGoalAttempt(run, attempt, "failed") };
    }
    if (
      run.activeAmbientConversation &&
      run.activeAmbientConversation.wakeId !== attempt.request.wakeId
    ) {
      return { response: this.finishGoalAttempt(run, attempt, "failed") };
    }
    const speakerFacts = run.spatialFacts?.actors.get(attempt.actorId);
    const targetFacts = run.spatialFacts?.actors.get(action.targetActorId);
    const volume = this.spatialAudibilityVolume(run, attempt.actorId, action.targetActorId);
    const targetLastSpokeAt = run.lastGoalSpeechAt.get(action.targetActorId);
    const actor = this.requireActor(run, attempt.actorId);
    if (
      !speakerFacts ||
      !targetFacts ||
      !volume ||
      this.actorGoalKey(run, actor, spatialMaterialSignature(speakerFacts)) !== attempt.goalKey ||
      (targetLastSpokeAt !== undefined &&
        run.elapsedSeconds - targetLastSpokeAt < GOAL_SPEECH_COOLDOWN_SECONDS) ||
      !this.goalActionStillValid(run, attempt, speakerFacts)
    ) {
      return { response: this.finishGoalAttempt(run, attempt, "stale") };
    }
    const target = this.requireActor(run, action.targetActorId);
    const goal = "Reply once to the resident who addressed you, using only what you heard and know.";
    const observePacket = this.runObservePacket(
      run,
      target,
      targetFacts.visibleActorIds,
      [goal],
      [`${attempt.actorId}: ${action.utterance}`],
      targetFacts,
    );
    observePacket.toolCatalog = ["talk_to", "wait"];
    const conversationId = `goal:${attempt.request.wakeId}`;
    attempt.conversationId = conversationId;
    attempt.conversationActorIds = [attempt.actorId, action.targetActorId];
    attempt.conversationFactSignatures = {
      [attempt.actorId]: spatialMaterialSignature(speakerFacts),
      [action.targetActorId]: spatialMaterialSignature(targetFacts),
    };
    attempt.conversationEvidenceKeys = {
      [attempt.actorId]: this.conversationEvidenceKey(run, this.requireActor(run, attempt.actorId)),
      [action.targetActorId]: this.conversationEvidenceKey(run, target),
    };
    attempt.resolvedTurns = [{
      speakerActorId: attempt.actorId,
      targetActorId: action.targetActorId,
      line: action.utterance,
      meta: clone(attempt.actionMeta),
    }];
    run.activeAmbientConversation = {
      conversationId,
      wakeId: attempt.request.wakeId,
      participantActorIds: [attempt.actorId, action.targetActorId],
      initiatorActorId: attempt.actorId,
      currentSpeakerActorId: action.targetActorId,
      observedWorldRevision: attempt.observation.factRevision,
      status: "resolving",
      turnLimit: 2,
      audibilityVolumeId: volume.volumeId,
    };
    return {
      claim: {
        speakerActorId: action.targetActorId,
        targetActorId: attempt.actorId,
        observePacket,
      },
    };
  }

  private commitGoalDecision(
    run: RunState,
    attempt: GoalDecisionAttempt,
  ): RunNpcDecisionResponse {
    if (attempt.response && attempt.state === "completed") return clone(attempt.response);
    if (!attempt.observation || !attempt.resolvedAction || !attempt.actionMeta) {
      return this.finishGoalAttempt(run, attempt, "failed");
    }
    if (run.activeConversationId !== null) {
      if (attempt.state === "queued" && attempt.response) return clone(attempt.response);
      attempt.state = "queued";
      if (run.activeAmbientConversation?.wakeId === attempt.request.wakeId) {
        run.activeAmbientConversation.status = "queued";
      }
      const response = this.goalDecisionResponse(run, attempt, "queued", [], []);
      attempt.response = clone(response);
      return response;
    }

    const facts = run.spatialFacts?.actors.get(attempt.actorId);
    const actor = this.requireActor(run, attempt.actorId);
    if (
      !facts ||
      spatialMaterialSignature(facts) !== attempt.observation.factSignature ||
      this.actorGoalKey(run, actor, attempt.observation.factSignature) !== attempt.goalKey ||
      run.scheduler.actors.get(attempt.actorId)?.pendingMovement ||
      !this.goalActionStillValid(run, attempt, facts)
    ) {
      return this.finishGoalAttempt(run, attempt, "stale");
    }

    const actionDeltas: RunDecisionDelta[] = [];
    const movementDeltas: RunMovementDelta[] = [];
    const readinessDeltas: RunActorReadinessDelta[] = [];
    const action = attempt.resolvedAction;
    if (action.tool === "look") {
      actionDeltas.push({
        kind: "look",
        actorId: actor.actorId,
        targetKind: action.targetKind,
        targetId: action.targetId,
        worldRevision: run.worldRevision,
      });
    } else if (action.tool === "move_to") {
      const movement = issueActorGoalMovement({
        runId: run.runId,
        layout: this.layout,
        runtime: run.scheduler,
        actorId: actor.actorId,
        targetAnchorRef: action.targetAnchorRef,
        elapsedSeconds: run.elapsedSeconds,
      });
      if (!movement) return this.finishGoalAttempt(run, attempt, "stale");
      run.worldRevision += 1;
      movementDeltas.push(movement);
      actionDeltas.push({ kind: "movement", movementDelta: clone(movement) });
      this.setActorReadiness(actor, false, "movement_started", readinessDeltas);
    } else if (action.tool === "write_record" || action.tool === "read_record") {
      const nextRevision = run.worldRevision + 1;
      const applied = applyRunAdministration({
        runId: run.runId,
        actorId: actor.actorId,
        actorRole: actor.role,
        action,
        records: run.records,
        ledgerEvents: run.ledgerEvents,
        institutionalPressure: run.institutionalPressure,
        worldSeconds: run.elapsedSeconds,
        worldRevision: nextRevision,
        ...(action.tool === "read_record" ? { memoryId: this.idFactory("mem") } : {}),
      });
      run.records = applied.records;
      run.ledgerEvents = applied.ledgerEvents;
      run.institutionalPressure = applied.institutionalPressure;
      run.worldRevision = nextRevision;
      if (applied.recordReadMemory) actor.memories.push(applied.recordReadMemory);
      actionDeltas.push(clone(applied.delta));
      for (const visibleActorId of applied.delta.record.visibleToActorIds) {
        if (visibleActorId === "player") continue;
        const visibleActor = run.actors.get(visibleActorId);
        if (visibleActor) this.reconcileConversationOpening(run, visibleActor, readinessDeltas);
      }
    } else if (action.tool === "talk_to") {
      const events = this.commitGoalConversation(run, attempt);
      if (!events) return this.finishGoalAttempt(run, attempt, "stale");
      for (const event of events) {
        actionDeltas.push({ kind: "speech", speechEvent: clone(event) });
        for (const holderId of [event.speakerActorId, ...event.listenerActorIds]) {
          this.reconcileConversationOpening(run, this.requireActor(run, holderId), readinessDeltas);
        }
      }
    }
    for (const readinessDelta of readinessDeltas) {
      actionDeltas.push({ kind: "readiness", readinessDelta: clone(readinessDelta) });
    }

    this.rememberCompletedGoal(run, actor.actorId, attempt.goalKey);
    attempt.state = "completed";
    finishRunWake(run.scheduler, attempt.request.wakeId, "completed");
    const response = this.goalDecisionResponse(
      run,
      attempt,
      "completed",
      actionDeltas,
      movementDeltas,
      readinessDeltas,
    );
    attempt.response = clone(response);
    return response;
  }

  private commitGoalConversation(
    run: RunState,
    attempt: GoalDecisionAttempt,
  ): RunAmbientSpeechEvent[] | null {
    const participants = attempt.conversationActorIds;
    const active = run.activeAmbientConversation;
    if (
      !attempt.observation ||
      !attempt.conversationId ||
      !participants ||
      attempt.resolvedTurns.length !== 2 ||
      !active ||
      active.wakeId !== attempt.request.wakeId ||
      active.conversationId !== attempt.conversationId
    ) return null;
    for (const actorId of participants) {
      const facts = run.spatialFacts?.actors.get(actorId);
      const lastSpokeAt = run.lastGoalSpeechAt.get(actorId);
      if (
        !facts ||
        run.scheduler.actors.get(actorId)?.pendingMovement ||
        (lastSpokeAt !== undefined &&
          run.elapsedSeconds - lastSpokeAt < GOAL_SPEECH_COOLDOWN_SECONDS) ||
        this.conversationEvidenceKey(run, this.requireActor(run, actorId)) !==
          attempt.conversationEvidenceKeys[actorId] ||
        spatialMaterialSignature(facts) !== attempt.conversationFactSignatures[actorId]
      ) return null;
    }
    const expectedVolumeId = active.audibilityVolumeId;
    const events = this.commitResolvedConversationTurns(run, {
      wakeId: attempt.request.wakeId,
      conversationId: attempt.conversationId,
      observedWorldRevision: attempt.observation.factRevision,
      turns: attempt.resolvedTurns,
      resolveAudibility: turn => {
        const volume = this.spatialAudibilityVolume(run, turn.speakerActorId, turn.targetActorId);
        const speakerPosition = run.spatialFacts?.actors.get(turn.speakerActorId)?.position;
        if (!volume || volume.volumeId !== expectedVolumeId || !speakerPosition) return null;
        const listenerActorIds = this.spatialNpcListeners(
          run,
          turn.speakerActorId,
          volume,
          speakerPosition,
        );
        return listenerActorIds.includes(turn.targetActorId)
          ? { volume, speakerPosition, listenerActorIds }
          : null;
      },
    });
    if (events) {
      this.rememberPostCommitParticipantGoals(run, participants);
      run.activeAmbientConversation = null;
    }
    return events;
  }

  private commitResolvedConversationTurns(
    run: RunState,
    options: {
      wakeId: string;
      conversationId: string;
      observedWorldRevision: number;
      turns: AmbientResolvedTurn[];
      resolveAudibility: (turn: AmbientResolvedTurn) => {
        volume: RunAudibilityVolume;
        speakerPosition: readonly [number, number, number];
        listenerActorIds: string[];
      } | null;
    },
  ): RunAmbientSpeechEvent[] | null {
    const resolvedAudibility = options.turns.map(turn => options.resolveAudibility(turn));
    if (resolvedAudibility.some(value => value === null)) return null;
    const committed: RunAmbientSpeechEvent[] = [];
    for (let turnIndex = 0; turnIndex < options.turns.length; turnIndex += 1) {
      const turn = options.turns[turnIndex];
      const audibility = resolvedAudibility[turnIndex];
      if (!turn || !audibility) return null;
      const seq = run.ambientSpeechCursor + 1;
      const worldRevision = run.worldRevision + 1;
      const event: RunAmbientSpeechEvent = {
        seq,
        eventId: `speech:${run.runId}:${seq}`,
        wakeId: options.wakeId,
        conversationId: options.conversationId,
        turnId: `${options.conversationId}#${turnIndex}`,
        speakerActorId: turn.speakerActorId,
        targetActorId: turn.targetActorId,
        listenerActorIds: clone(audibility.listenerActorIds),
        line: turn.line,
        worldSeconds: run.elapsedSeconds,
        observedWorldRevision: options.observedWorldRevision,
        worldRevision,
        audibility: {
          volumeId: audibility.volume.volumeId,
          maxSpeechDistanceM: audibility.volume.maxSpeechDistanceM,
          speakerPosition: [
            audibility.speakerPosition[0],
            audibility.speakerPosition[1],
            audibility.speakerPosition[2],
          ],
        },
        proposalMeta: clone(turn.meta),
      };
      for (const holderActorId of [turn.speakerActorId, ...audibility.listenerActorIds]) {
        const memory: RunAmbientUtteranceMemory = {
          ...clone(event),
          memoryId: this.idFactory("mem"),
          kind: "ambient_utterance",
        };
        this.requireActor(run, holderActorId).memories.push(memory);
      }
      run.ambientSpeechCursor = seq;
      run.ambientSpeechEvents.push(event);
      run.lastGoalSpeechAt.set(turn.speakerActorId, run.elapsedSeconds);
      run.worldRevision = worldRevision;
      committed.push(event);
    }
    return committed;
  }

  private spatialNpcListeners(
    run: RunState,
    speakerActorId: string,
    volume: RunAudibilityVolume,
    speakerPosition: readonly [number, number, number],
  ): string[] {
    const spatial = run.spatialFacts;
    if (!spatial) return [];
    return [...spatial.actors.values()]
      .filter(facts =>
        facts.actorId !== speakerActorId &&
        facts.audibleActorIds.includes(speakerActorId) &&
        volumeContains(volume, facts.position) &&
        distanceBetween(speakerPosition, facts.position) <= volume.maxSpeechDistanceM,
      )
      .map(facts => facts.actorId)
      .sort();
  }

  private spatialAudibilityVolume(
    run: RunState,
    speakerActorId: string,
    targetActorId: string,
  ): RunAudibilityVolume | null {
    const speaker = run.spatialFacts?.actors.get(speakerActorId);
    const target = run.spatialFacts?.actors.get(targetActorId);
    if (!speaker || !target) return null;
    return this.layout.audibilityVolumes.find(
      volume =>
        volumeContains(volume, speaker.position) &&
        volumeContains(volume, target.position) &&
        distanceBetween(speaker.position, target.position) <= volume.maxSpeechDistanceM,
    ) ?? null;
  }

  private finishGoalAttempt(
    run: RunState,
    attempt: GoalDecisionAttempt,
    status: "stale" | "budget_reserved" | "failed",
    completeGoalKey = false,
  ): RunNpcDecisionResponse {
    this.refreshProviderBudget(run);
    attempt.state = "terminal";
    if (run.activeAmbientConversation?.wakeId === attempt.request.wakeId) {
      run.activeAmbientConversation = null;
    }
    finishRunWake(run.scheduler, attempt.request.wakeId, "terminal");
    if (completeGoalKey) this.rememberCompletedGoal(run, attempt.actorId, attempt.goalKey);
    const response = this.goalDecisionResponse(run, attempt, status, [], []);
    attempt.response = clone(response);
    return response;
  }

  private goalDecisionResponse(
    run: RunState,
    attempt: GoalDecisionAttempt,
    status: RunNpcDecisionResponse["status"],
    actionDeltas: RunDecisionDelta[],
    movementDeltas: RunMovementDelta[],
    actorReadinessDeltas: RunActorReadinessDelta[] = [],
  ): RunNpcDecisionResponse {
    const speechEvents = actionDeltas
      .filter((delta): delta is Extract<RunDecisionDelta, { kind: "speech" }> => delta.kind === "speech")
      .map(delta => clone(delta.speechEvent));
    return {
      runId: run.runId,
      wakeId: attempt.request.wakeId,
      decisionKind: "actor_goal",
      wakeKind: "goal",
      actorIds: [attempt.actorId],
      status,
      observedWorldRevision: attempt.request.observedWorldRevision,
      worldRevision: run.worldRevision,
      conversationId: attempt.conversationId,
      participantActorIds: clone(attempt.conversationActorIds ?? []),
      speechEvents,
      actorReadinessDeltas: clone(actorReadinessDeltas),
      actionDeltas: clone(actionDeltas),
      movementDeltas: clone(movementDeltas),
      providerMetas: clone(attempt.providerMetas),
      socialView: this.publicSocialView(run),
    };
  }

  private schedulePermitsAnchor(run: RunState, actorId: string, anchorRef: string): boolean {
    const actor = this.layout.actors.find(candidate => candidate.actorId === actorId);
    const block = actor?.scheduleBlocks.find(
      candidate => candidate.startSeconds <= run.elapsedSeconds && run.elapsedSeconds < candidate.endSeconds,
    );
    if (!block) return false;
    if (block.target.kind === "anchor") return block.target.id === anchorRef;
    const schedulerActor = run.scheduler.actors.get(actorId);
    const points = this.layout.routes.find(route => route.routeId === block.target.id)?.points;
    if (
      !schedulerActor ||
      !points ||
      schedulerActor.routePointIndex === null ||
      schedulerActor.routePointArrivedAtSeconds === null ||
      run.elapsedSeconds < schedulerActor.routePointArrivedAtSeconds + ROUTE_CADENCE_SECONDS
    ) return false;
    return points[(schedulerActor.routePointIndex + 1) % points.length] === anchorRef;
  }

  private goalActionStillValid(
    run: RunState,
    attempt: GoalDecisionAttempt,
    facts: RunActorSpatialFacts,
  ): boolean {
    const action = attempt.resolvedAction;
    if (!action || action.tool === "wait") return action !== null;
    if (action.tool === "look") {
      if (action.targetKind === "actor") return facts.visibleActorIds.includes(action.targetId);
      if (action.targetKind === "object") return facts.visibleObjectIds.includes(action.targetId);
      return run.records.some(
        record =>
          record.recordId === action.targetId &&
          record.visibleToActorIds.includes(attempt.actorId),
      );
    }
    if (action.tool === "move_to") {
      return (
        facts.reachableAnchorRefs.includes(action.targetAnchorRef) &&
        this.schedulePermitsAnchor(run, attempt.actorId, action.targetAnchorRef) &&
        run.scheduler.actors.get(attempt.actorId)?.confirmedAnchorRef !== action.targetAnchorRef
      );
    }
    if (action.tool === "write_record") {
      const actor = this.requireActor(run, attempt.actorId);
      const sourceExists = actor.memories.some(memory => memory.memoryId === action.sourceMemoryId);
      const surface = this.layout.recordSurfaces.find(
        candidate => candidate.surfaceId === action.textSurfaceId,
      );
      const existing = action.recordId
        ? run.records.find(record => record.recordId === action.recordId)
        : undefined;
      return Boolean(
        sourceExists &&
        !this.sourceAlreadyAdministered(run, actor.actorId, action.sourceMemoryId) &&
        surface?.landmarkId === actor.locationId &&
        recordKindsForRole(actor.role).includes(action.recordKind) &&
        (!action.recordId || (
          existing?.authorActorId === actor.actorId &&
          existing.textSurfaceId === action.textSurfaceId
        )),
      );
    }
    if (action.tool === "read_record") {
      const actor = this.requireActor(run, attempt.actorId);
      const record = run.records.find(candidate => candidate.recordId === action.recordId);
      return Boolean(
        record &&
        record.visibleToActorIds.includes(actor.actorId) &&
        record.sourceRefs[0]?.sourceMemoryId === action.sourceMemoryId &&
        !this.hasReadRecordRevision(actor, record.recordId, record.recordRevision),
      );
    }
    const targetFacts = run.spatialFacts?.actors.get(action.targetActorId);
    const lastSpokeAt = run.lastGoalSpeechAt.get(attempt.actorId);
    const targetLastSpokeAt = run.lastGoalSpeechAt.get(action.targetActorId);
    return Boolean(
      targetFacts &&
      (run.activeAmbientConversation === null ||
        run.activeAmbientConversation.wakeId === attempt.request.wakeId) &&
      !run.scheduler.actors.get(action.targetActorId)?.pendingMovement &&
      facts.visibleActorIds.includes(action.targetActorId) &&
      facts.audibleActorIds.includes(action.targetActorId) &&
      targetFacts.audibleActorIds.includes(attempt.actorId) &&
      this.spatialAudibilityVolume(run, attempt.actorId, action.targetActorId) &&
      (lastSpokeAt === undefined ||
        run.elapsedSeconds - lastSpokeAt >= GOAL_SPEECH_COOLDOWN_SECONDS) &&
      (targetLastSpokeAt === undefined ||
        run.elapsedSeconds - targetLastSpokeAt >= GOAL_SPEECH_COOLDOWN_SECONDS),
    );
  }

  private goalFallbackMeta(reason: ProposalMeta["fallbackReason"]): ProposalMeta {
    return {
      profileId: this.proposalPort.profileId,
      transport: "fallback",
      usedFallback: true,
      ...(reason ? { fallbackReason: reason } : {}),
    };
  }

  private rememberCompletedGoal(run: RunState, actorId: string, goalKey: string): void {
    run.completedGoalKeys.add(`${actorId}:${goalKey}`);
    while (run.completedGoalKeys.size > 512) {
      const oldest = run.completedGoalKeys.values().next().value as string | undefined;
      if (!oldest) break;
      run.completedGoalKeys.delete(oldest);
    }
  }

  private rememberPostCommitParticipantGoals(run: RunState, actorIds: readonly string[]): void {
    for (const actorId of actorIds) {
      const actor = this.requireActor(run, actorId);
      const facts = run.spatialFacts?.actors.get(actorId);
      if (!facts) continue;
      const goalKey = this.actorGoalKey(run, actor, spatialMaterialSignature(facts));
      this.rememberCompletedGoal(run, actorId, goalKey);
    }
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
          const resolved = await this.withBackgroundProviderSlot(runId, () =>
            this.proposalPort.proposeNextStep({
              sessionId: runId,
              locale: this.requireRun(runId).locale,
              iteration: turnIndex,
              goal: "Speak one context-appropriate sentence directly to the resident who arrived with you, then end the exchange.",
              observePacket,
              blockedSignatures: [],
              requiredToolCall: { tool: "talk_to", actorId: targetActorId },
              requireUtterance: true,
              budgetCeiling: {
                maxCalls: runAmbientCallCeiling(this.requireRun(runId)),
                maxTokens: runAmbientTokenCeiling(this.requireRun(runId)),
              },
            }),
          );
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
    const pendingWake = run.scheduler.pendingWakes.get(attempt.request.wakeId);
    if (!pendingWake || pendingWake.status !== "pending") {
      throw new RunError(`wake is not pending: ${attempt.request.wakeId}`, "wake_not_pending");
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
    const wake = claimRunWake(run.scheduler, attempt.request.wakeId);
    if (!wake) throw new RunError(`wake is not pending: ${attempt.request.wakeId}`, "wake_not_pending");
    if (
      wake.kind !== "meeting_ready" ||
      wake.sourceId !== attempt.windowId ||
      wake.actorIds.length !== 2 ||
      wake.actorIds[0] !== attempt.participantActorIds[0] ||
      wake.actorIds[1] !== attempt.participantActorIds[1]
    ) {
      throw new RunError(`wake cannot open ambient speech: ${attempt.request.wakeId}`, "wake_not_supported");
    }
    // Claim before any provider await. This wake can now finish only through
    // this signature-bound attempt, including stale/failure outcomes.
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
      participantEvidenceKeys: {
        [firstActorId]: this.conversationEvidenceKey(run, this.requireActor(run, firstActorId)),
        [secondActorId]: this.conversationEvidenceKey(run, this.requireActor(run, secondActorId)),
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
      ) ||
      attempt.participantActorIds.some(
        actorId =>
          this.conversationEvidenceKey(run, this.requireActor(run, actorId)) !==
          attempt.observation?.participantEvidenceKeys[actorId],
      )
    ) {
      return this.finishAmbientAttempt(run, attempt, "stale");
    }

    const committed = this.commitResolvedConversationTurns(run, {
      wakeId: attempt.request.wakeId,
      conversationId: attempt.conversationId,
      observedWorldRevision: attempt.request.observedWorldRevision,
      turns: attempt.resolvedTurns,
      resolveAudibility: turn => {
        const freshMeeting = this.currentAmbientMeeting(run, attempt);
        if (!freshMeeting || freshMeeting.volume.volumeId !== attempt.observation?.audibilityVolumeId) {
          return null;
        }
        const speakerPosition = this.actorPosition(run, turn.speakerActorId);
        const listenerActorIds = this.currentNpcListeners(
          run,
          turn.speakerActorId,
          freshMeeting.volume,
          speakerPosition,
        );
        return listenerActorIds.includes(turn.targetActorId)
          ? { volume: freshMeeting.volume, speakerPosition, listenerActorIds }
          : null;
      },
    });
    if (!committed) return this.finishAmbientAttempt(run, attempt, "stale");
    this.rememberPostCommitParticipantGoals(run, attempt.participantActorIds);
    const memoryChangedActorIds = new Set(
      committed.flatMap(event => [event.speakerActorId, ...event.listenerActorIds]),
    );

    attempt.actorReadinessDeltas = [];
    for (const actorId of memoryChangedActorIds) {
      this.reconcileConversationOpening(
        run,
        this.requireActor(run, actorId),
        attempt.actorReadinessDeltas,
      );
    }

    attempt.state = "completed";
    finishRunWake(run.scheduler, attempt.request.wakeId, "completed");
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
      const schedulerActor = run.scheduler.actors.get(actorId);
      if (schedulerActor?.pendingMovement) return null;
      const anchorRef = schedulerActor?.confirmedAnchorRef;
      const expectedAnchorRef = window.participantAnchorRefs[actorId];
      const position = anchorRef
        ? (run.spatialFacts?.actors.get(actorId)?.position ?? this.layout.anchorPositions[anchorRef])
        : undefined;
      if (!anchorRef || anchorRef !== expectedAnchorRef || !position) return null;
      positions.push(position);
    }
    const firstPosition = positions[0];
    const secondPosition = positions[1];
    if (!firstPosition || !secondPosition) return null;
    if (run.spatialFacts) {
      const [firstActorId, secondActorId] = attempt.participantActorIds;
      const firstFacts = run.spatialFacts.actors.get(firstActorId);
      const secondFacts = run.spatialFacts.actors.get(secondActorId);
      if (
        !firstFacts ||
        !secondFacts ||
        !firstFacts.visibleActorIds.includes(secondActorId) ||
        !firstFacts.audibleActorIds.includes(secondActorId) ||
        !secondFacts.visibleActorIds.includes(firstActorId) ||
        !secondFacts.audibleActorIds.includes(firstActorId)
      ) {
        return null;
      }
    }
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
    const enginePosition = run.spatialFacts?.actors.get(actorId)?.position;
    if (enginePosition) return enginePosition;
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
    if (run.spatialFacts) {
      return this.spatialNpcListeners(run, speakerActorId, volume, speakerPosition);
    }
    const layoutListeners = this.layout.actors
      .map(actor => actor.actorId)
      .filter(actorId => {
        if (actorId === speakerActorId) return false;
        const position = this.actorPosition(run, actorId);
        return (
          volumeContains(volume, position) &&
          distanceBetween(speakerPosition, position) <= volume.maxSpeechDistanceM
        );
      });
    return layoutListeners;
  }

  private ambientObservePacket(
    run: RunState,
    speakerActorId: string,
    targetActorId: string,
  ): ObservePacket {
    const actor = this.requireActor(run, speakerActorId);
    const packet = this.runObservePacket(
      run,
      actor,
      [targetActorId],
      ["Speak directly with the resident who arrived with you and remember only what you actually hear."],
    );
    packet.audibleActorIds = [targetActorId];
    return packet;
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
    finishRunWake(run.scheduler, attempt.request.wakeId, "terminal");
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
      decisionKind: "ambient_conversation",
      wakeKind: "meeting_ready",
      actorIds: clone(attempt.participantActorIds),
      status,
      observedWorldRevision: attempt.request.observedWorldRevision,
      worldRevision: run.worldRevision,
      conversationId: attempt.conversationId,
      participantActorIds: clone(attempt.participantActorIds),
      speechEvents: clone(speechEvents),
      actorReadinessDeltas: clone(attempt.actorReadinessDeltas),
      actionDeltas: [
        ...speechEvents.map(event => ({ kind: "speech" as const, speechEvent: clone(event) })),
        ...attempt.actorReadinessDeltas.map(readinessDelta => ({
          kind: "readiness" as const,
          readinessDelta: clone(readinessDelta),
        })),
      ],
      movementDeltas: [],
      providerMetas: clone(attempt.providerMetas),
      socialView: this.publicSocialView(run),
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

  private publicSocialView(run: RunState): RunSocialView {
    return clone(run.socialView);
  }

  private hasReadRecordRevision(actor: RunActorState, recordId: string, revision: number): boolean {
    return actor.memories.some(
      memory =>
        memory.kind === "record_read" &&
        memory.recordId === recordId &&
        memory.recordRevision === revision,
    );
  }

  private sourceAlreadyAdministered(run: RunState, actorId: string, memoryId: string): boolean {
    return run.ledgerEvents.some(
      event =>
        event.actorId === actorId &&
        event.sourceMemoryId === memoryId &&
        (event.kind === "record_written" || event.kind === "record_updated"),
    );
  }

  private recordVisibility(
    run: RunState,
    authorActorId: string,
    kind: RecordKind,
  ): string[] {
    const visible = new Set<string>(["player", authorActorId]);
    const addRole = (role: RunActor["role"]) => {
      const actor = [...run.actors.values()].find(candidate => candidate.role === role);
      if (actor) visible.add(actor.actorId);
    };
    addRole("station_officer");
    const author = this.requireActor(run, authorActorId);
    if (author.role === "studio_receptionist" || author.role === "studio_manager") {
      addRole("studio_manager");
    }
    if (kind === "posting") {
      for (const actor of run.actors.values()) visible.add(actor.actorId);
    }
    return [...visible].sort();
  }

  private bumpSocialRevision(run: RunState): void {
    run.socialView.revision += 1;
  }

  private discloseResidentJudgment(
    run: RunState,
    actor: RunActorState,
    memory: RunPlayerConversationMemory,
  ): void {
    const provenance: RunSocialProvenance = {
      originKind: "speech",
      originActorId: "player",
      recipientKind: "listener",
      recipientActorId: actor.actorId,
      sourceMemoryId: memory.memoryId,
      recordId: null,
      recordRevision: null,
      ledgerEventId: null,
      whyLine: memory.whyLine,
    };
    const resident = {
      actorId: actor.actorId,
      stance: actor.stance,
      stanceRevision: run.worldRevision,
      whyLine: memory.whyLine,
      provenance,
    };
    const index = run.socialView.encounteredResidents.findIndex(
      entry => entry.actorId === actor.actorId,
    );
    if (index >= 0) run.socialView.encounteredResidents[index] = resident;
    else run.socialView.encounteredResidents.push(resident);
    if (memory.openQuestion) {
      run.socialView.openQuestions = run.socialView.openQuestions.filter(
        entry => entry.subjectActorId !== actor.actorId,
      );
      run.socialView.openQuestions.push({
        questionId: `question:${memory.memoryId}`,
        subjectActorId: actor.actorId,
        status: memory.openQuestion.status,
        text: memory.openQuestion.text,
        whyLine: memory.openQuestion.whyLine,
        provenance: { ...provenance, whyLine: memory.openQuestion.whyLine },
      });
    }
    this.bumpSocialRevision(run);
  }

  private discloseSpeech(run: RunState, event: RunAmbientSpeechEvent): void {
    // The exact audible event is now known to the player, but speech text is
    // not mechanically promoted into an open question. A model judgment or
    // administrative proposal must author that player-log content.
    if (run.encounteredSpeechEventIds.has(event.eventId)) return;
    run.encounteredSpeechEventIds.add(event.eventId);
  }

  private discloseRecord(run: RunState, record: RunRecord): void {
    const existing = run.socialView.encounteredRecords.find(
      entry => entry.recordId === record.recordId,
    );
    if (
      existing &&
      existing.recordRevision === record.recordRevision &&
      existing.lastLedgerEventId === record.lastLedgerEventId
    ) return;
    const event = run.ledgerEvents.find(candidate => candidate.eventId === record.lastLedgerEventId);
    if (!event) return;
    const provenance: RunSocialProvenance = {
      originKind: "record",
      originActorId: record.authorActorId,
      recipientKind: "reader",
      recipientActorId: event.kind === "record_read" ? event.actorId : "player",
      sourceMemoryId: event.sourceMemoryId,
      recordId: record.recordId,
      recordRevision: record.recordRevision,
      ledgerEventId: event.eventId,
      whyLine: event.whyLine,
    };
    const disclosed = {
      recordId: record.recordId,
      kind: record.kind,
      authorActorId: record.authorActorId,
      targetId: record.targetId,
      stateBody: record.stateBody,
      recordRevision: record.recordRevision,
      lastLedgerEventId: record.lastLedgerEventId,
      provenance,
    };
    const index = run.socialView.encounteredRecords.findIndex(
      entry => entry.recordId === record.recordId,
    );
    if (index >= 0) run.socialView.encounteredRecords[index] = disclosed;
    else run.socialView.encounteredRecords.push(disclosed);
    run.socialView.pressure.latestEncounteredWhyLine = event.whyLine;
    run.socialView.pressure.band = pressureBand(event.pressureAfter);
    if (event.openQuestion) {
      const questionId = `question:record:${record.recordId}`;
      const question = {
        questionId,
        subjectActorId: null,
        status: event.openQuestion.status,
        text: event.openQuestion.text,
        whyLine: event.openQuestion.whyLine,
        provenance: { ...provenance, whyLine: event.openQuestion.whyLine },
      };
      const questionIndex = run.socialView.openQuestions.findIndex(
        entry => entry.questionId === questionId,
      );
      if (questionIndex >= 0) run.socialView.openQuestions[questionIndex] = question;
      else run.socialView.openQuestions.push(question);
    }
    this.bumpSocialRevision(run);
  }

  private async executeConversationOpening(
    runId: string,
    attempt: ConversationOpeningAttempt,
  ): Promise<RunSessionPreloadResponse> {
    await this.acquireBackgroundProviderSlot(runId);
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
      this.releaseBackgroundProviderSlot(runId);
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

  private async acquireBackgroundProviderSlot(runId: string): Promise<void> {
    const gate = this.backgroundProviderGates.get(runId) ?? { active: 0, waiters: [] };
    this.backgroundProviderGates.set(runId, gate);
    if (gate.active < MAX_CONCURRENT_BACKGROUND_PROPOSALS) {
      gate.active += 1;
      return;
    }
    await new Promise<void>(resolve => gate.waiters.push(resolve));
  }

  private releaseBackgroundProviderSlot(runId: string): void {
    const gate = this.backgroundProviderGates.get(runId);
    if (!gate) return;
    const next = gate.waiters.shift();
    if (next) {
      next();
      return;
    }
    gate.active = Math.max(0, gate.active - 1);
    if (gate.active === 0) this.backgroundProviderGates.delete(runId);
  }

  private async withBackgroundProviderSlot<T>(runId: string, task: () => Promise<T>): Promise<T> {
    await this.acquireBackgroundProviderSlot(runId);
    try {
      return await task();
    } finally {
      this.releaseBackgroundProviderSlot(runId);
    }
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
      locale: run.locale,
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

  private actorGoalKey(
    run: RunState,
    actor: RunActorState,
    spatialSignature: string,
    elapsedSeconds = run.elapsedSeconds,
  ): string {
    const layoutActor = this.layout.actors.find(candidate => candidate.actorId === actor.actorId);
    const block = layoutActor?.scheduleBlocks.find(
      candidate => candidate.startSeconds <= elapsedSeconds && elapsedSeconds < candidate.endSeconds,
    );
    return `goal:${digest(JSON.stringify({
      actorId: actor.actorId,
      blockId: block?.blockId ?? "none",
      // An actor's own just-committed speech is not a new incoming goal.
      // Listener memories and direct player speech are; this prevents an
      // emergent self-echo from creating a provider wake every advance.
      incomingMemoryIds: actor.memories
        .filter(memory =>
          memory.kind === "player_conversation" ||
          memory.kind === "record_read" ||
          (memory.kind === "ambient_utterance" && memory.speakerActorId !== actor.actorId),
        )
        .map(memory => memory.memoryId),
      visibleRecordVersions: run.records
        .filter(record => record.visibleToActorIds.includes(actor.actorId))
        .map(record => `${record.recordId}@${record.recordRevision}`)
        .sort(),
      spatialSignature,
    }))}`;
  }

  private spatialPositionsChanged(
    prior: CanonicalSpatialFacts | null,
    incoming: Map<string, RunActorSpatialFacts>,
  ): boolean {
    if (!prior) return true;
    for (const [actorId, facts] of incoming) {
      const previous = prior.actors.get(actorId);
      if (!previous || previous.position.some((value, index) => value !== facts.position[index])) {
        return true;
      }
    }
    return false;
  }

  private runObservePacket(
    run: RunState,
    actor: RunActorState,
    visibleActorIds: string[],
    goals: string[],
    additionalSpeech: string[] = [],
    spatialFacts?: RunActorSpatialFacts,
  ): ObservePacket {
    const policy = DEFAULT_ROLE_POLICIES[actor.role];
    const visibleRecords = run.records
      .filter(record => record.visibleToActorIds.includes(actor.actorId))
      .map(record => ({
        recordId: record.recordId,
        kind: record.kind,
        stateBody: record.stateBody,
        recordRevision: record.recordRevision,
        authorActorId: record.authorActorId,
        sourceMemoryId: record.sourceRefs[0]?.sourceMemoryId,
        textSurfaceId: record.textSurfaceId,
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
      if (memory.kind === "ambient_utterance") {
        return memory.speakerActorId === actor.actorId
          ? `[self_utterance] ${memory.line}`
          : `[heard_from=${memory.speakerActorId}] ${memory.line}`;
      }
      return `[record_read=${memory.recordId}@${memory.recordRevision}] ${memory.stateBody}`;
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
          .filter(event => event.visibleToActorIds.includes(actor.actorId))
          .map(event => event.eventId),
      },
      visibleObjects: [],
      visibleRecords,
      visibleLedgerEvents: run.ledgerEvents
        .filter(event => event.visibleToActorIds.includes(actor.actorId))
        .map(event => ({
          eventId: event.eventId,
          kind: event.kind,
          actorId: event.actorId,
          recordId: event.recordId,
        })),
      visibleActors: [...new Set(visibleActorIds.filter(id => id !== actor.actorId))],
      audibleActorIds: spatialFacts ? [...spatialFacts.audibleActorIds] : [],
      reachableAnchorRefs: spatialFacts ? [...spatialFacts.reachableAnchorRefs] : [],
      heardSpeech: [...heardSpeech, ...additionalSpeech],
      toolCatalog: toolCatalogForRole(actor.role),
      administrativeSources: actor.memories
        .filter(memory => !this.sourceAlreadyAdministered(run, actor.actorId, memory.memoryId))
        .map(memory => {
        if (memory.kind === "player_conversation") {
          return {
            memoryId: memory.memoryId,
            kind: memory.kind,
            originActorId: "player",
            summary: memory.playerLine,
            whyLine: memory.whyLine,
            reportDelta: memory.reportDelta,
          };
        }
        if (memory.kind === "ambient_utterance") {
          return {
            memoryId: memory.memoryId,
            kind: memory.kind,
            originActorId: memory.speakerActorId,
            summary: memory.line,
            whyLine: memory.line,
            reportDelta: 0,
          };
        }
        if (memory.kind === "record_read") {
          return {
            memoryId: memory.memoryId,
            kind: memory.kind,
            originActorId: memory.sourceActorId,
            summary: memory.stateBody,
            whyLine: memory.whyLine,
            reportDelta: 0,
          };
        }
        return {
          memoryId: memory.memoryId,
          kind: memory.kind,
          originActorId: memory.sourceActorId,
          summary: memory.line,
          whyLine: memory.line,
          reportDelta: 0,
        };
        }),
      administrativeAuthority: {
        allowedRecordKinds: recordKindsForRole(actor.role),
        writableTextSurfaceIds: this.layout.recordSurfaces
          .filter(surface => surface.landmarkId === actor.locationId)
          .map(surface => surface.surfaceId),
      },
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
