import { z } from "zod";
import {
  COARSE_STANCES,
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
} from "../contracts/types.js";

const nonEmpty = z.string().trim().min(1);
const proposalMetaSchema = z
  .object({
    profileId: nonEmpty,
    transport: z.enum(["live", "fallback", "scripted"]),
    usedFallback: z.boolean(),
    fallbackReason: z
      .enum([
        "missing_credentials",
        "unavailable",
        "timeout",
        "rate_limited",
        "invalid_envelope",
        "budget_exhausted",
        "transport_error",
      ])
      .optional(),
    usage: z
      .object({
        inputTokens: z.number().int().nonnegative(),
        outputTokens: z.number().int().nonnegative(),
        totalTokens: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const RUN_ACTOR_ROLES = [
  "studio_receptionist",
  "studio_manager",
  "office_worker",
  "park_caretaker",
  "station_officer",
  "roaming_liaison",
] as const;

const runActorRoleSchema = z.enum(RUN_ACTOR_ROLES);
const stanceSchema = z.enum(COARSE_STANCES);
const signalSchema = z.enum(CONVERSATION_SUSPICION_SIGNALS);
const intentSchema = z.enum(CONVERSATION_CHOICE_INTENTS);
const position3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const runAmbientAudibilitySchema = z
  .object({
    volumeId: nonEmpty,
    maxSpeechDistanceM: z.number().positive(),
    speakerPosition: position3Schema,
  })
  .strict();

export const runAmbientSpeechEventSchema = z
  .object({
    seq: z.number().int().positive(),
    eventId: nonEmpty,
    wakeId: nonEmpty,
    conversationId: nonEmpty,
    turnId: nonEmpty,
    speakerActorId: nonEmpty,
    targetActorId: nonEmpty,
    listenerActorIds: z.array(nonEmpty).min(1),
    line: nonEmpty,
    worldSeconds: z.number().nonnegative(),
    observedWorldRevision: z.number().int().nonnegative(),
    worldRevision: z.number().int().positive(),
    audibility: runAmbientAudibilitySchema,
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runAmbientUtteranceMemorySchema = runAmbientSpeechEventSchema
  .extend({
    memoryId: nonEmpty,
    kind: z.literal("ambient_utterance"),
  })
  .strict();

export const runNpcUtteranceMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("npc_utterance"),
    sourceActorId: nonEmpty,
    listenerActorIds: z.array(nonEmpty).min(1),
    conversationId: nonEmpty,
    turnId: nonEmpty,
    line: nonEmpty,
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runPlayerConversationMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("player_conversation"),
    sourceActorId: z.literal("player"),
    listenerActorId: nonEmpty,
    conversationId: nonEmpty,
    turnId: nonEmpty,
    playerLine: nonEmpty,
    npcLine: nonEmpty,
    signals: z.array(signalSchema),
    whyLine: nonEmpty,
    suspicionBefore: z.number().int().min(0).max(125),
    suspicionAfter: z.number().int().min(0).max(125),
    suspicionDelta: z.number().int(),
    reportPressureBefore: z.number().int().min(0).max(125),
    reportPressureAfter: z.number().int().min(0).max(125),
    /** Model-judged inclination; it is private until a validated report action applies it. */
    reportDelta: z.number().int(),
    institutionalPressureDelta: z.number().int(),
    proposedStance: stanceSchema,
    appliedStance: stanceSchema,
    meaningfulFirsthand: z.boolean(),
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runMemorySchema = z.discriminatedUnion("kind", [
  runNpcUtteranceMemorySchema,
  runPlayerConversationMemorySchema,
  runAmbientUtteranceMemorySchema,
]);

export const runActorSchema = z
  .object({
    actorId: nonEmpty,
    role: runActorRoleSchema,
    locationId: nonEmpty,
    stance: stanceSchema,
    suspicion: z.number().int().min(0).max(125),
    playerConversationReady: z.boolean(),
    hasMeaningfulFirsthandConversation: z.boolean(),
    memories: z.array(runMemorySchema),
  })
  .strict();

const runRecordSchema = z
  .object({
    recordId: nonEmpty,
    kind: nonEmpty,
    authorActorId: nonEmpty,
    stateBody: nonEmpty,
    visibleToActorIds: z.array(nonEmpty),
    lastLedgerEventId: nonEmpty.optional(),
  })
  .strict();

const runLedgerEventSchema = z
  .object({
    eventId: nonEmpty,
    seq: z.number().int().nonnegative(),
    kind: nonEmpty,
    actorId: nonEmpty,
    whyLine: nonEmpty,
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runScheduleBlockSnapshotSchema = z
  .object({
    blockId: nonEmpty,
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().positive(),
    activity: nonEmpty,
    targetKind: z.enum(["anchor", "route"]),
    targetId: nonEmpty,
  })
  .strict();

export const runPendingMovementSchema = z
  .object({
    movementId: nonEmpty,
    targetAnchorRef: nonEmpty,
    targetLocationId: nonEmpty,
    issuedAtSeconds: z.number().nonnegative(),
    scheduleBlockId: nonEmpty,
    routePointIndex: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const runScheduleWakeSchema = z
  .object({
    wakeId: nonEmpty,
    kind: z.enum([
      "actor_schedule",
      "meeting_window",
      "meeting_ready",
      "grace",
      "hearing",
    ]),
    phase: z.enum(["started", "ended", "due"]),
    sourceId: nonEmpty,
    actorIds: z.array(nonEmpty),
    scheduledAtSeconds: z.number().nonnegative(),
    observedWorldRevision: z.number().int().positive(),
    requiresDecision: z.boolean(),
    status: z.enum(["informational", "pending"]),
  })
  .strict();

export const runActorSchedulerSchema = z
  .object({
    actorId: nonEmpty,
    routeId: nonEmpty,
    currentBlock: runScheduleBlockSnapshotSchema.nullable(),
    confirmedAnchorRef: nonEmpty,
    desiredAnchorRef: nonEmpty.nullable(),
    routePointIndex: z.number().int().nonnegative().nullable(),
    routePointArrivedAtSeconds: z.number().nonnegative().nullable(),
    nextRouteMoveAtSeconds: z.number().nonnegative().nullable(),
    pendingMovement: runPendingMovementSchema.nullable(),
  })
  .strict();

export const runSchedulerSnapshotSchema = z
  .object({
    routeCadenceSeconds: z.number().positive(),
    activeMeetingWindowIds: z.array(nonEmpty),
    pendingWakes: z.array(runScheduleWakeSchema),
    actors: z.array(runActorSchedulerSchema).length(6),
  })
  .strict();

export const runAmbientConversationSchema = z
  .object({
    conversationId: nonEmpty,
    wakeId: nonEmpty,
    participantActorIds: z.tuple([nonEmpty, nonEmpty]),
    initiatorActorId: nonEmpty,
    currentSpeakerActorId: nonEmpty,
    observedWorldRevision: z.number().int().nonnegative(),
    status: z.enum(["resolving", "queued"]),
    turnLimit: z.number().int().min(2).max(4),
    audibilityVolumeId: nonEmpty,
  })
  .strict();

export const runAmbientSpeechSnapshotSchema = z
  .object({
    cursor: z.number().int().nonnegative(),
    events: z.array(runAmbientSpeechEventSchema),
    activeConversation: runAmbientConversationSchema.nullable(),
  })
  .strict();

export const runSnapshotSchema = z
  .object({
    runId: nonEmpty,
    worldId: nonEmpty,
    layoutRevision: nonEmpty,
    worldRevision: z.number().int().nonnegative(),
    locale: z.literal("ko-KR"),
    worldClock: z
      .object({
        elapsedSeconds: z.number().nonnegative(),
        graceEndsAtSeconds: z.number().nonnegative(),
        hearingAtSeconds: z.number().positive(),
        paused: z.boolean(),
      })
      .strict(),
    institutionalPressure: z.number().int().min(0).max(125),
    providerBudget: z
      .object({
        callLimit: z.number().int().positive(),
        tokenLimit: z.number().int().positive(),
        reservedCalls: z.number().int().nonnegative(),
        reservedTokens: z.number().int().nonnegative(),
        callsUsed: z.number().int().nonnegative(),
        tokensUsed: z.number().int().nonnegative(),
      })
      .strict(),
    lastProposalMeta: proposalMetaSchema.nullable(),
    activeConversationId: nonEmpty.nullable(),
    actors: z.array(runActorSchema).length(6),
    scheduler: runSchedulerSnapshotSchema,
    ambientSpeech: runAmbientSpeechSnapshotSchema,
    records: z.array(runRecordSchema),
    ledgerEvents: z.array(runLedgerEventSchema),
  })
  .strict();

const suggestedReplySchema = z
  .object({
    choiceId: nonEmpty,
    intent: intentSchema,
    line: nonEmpty,
  })
  .strict();

export const runNextTurnSchema = z
  .object({
    turnId: nonEmpty,
    beatId: nonEmpty,
    promptId: nonEmpty,
    choiceSetId: nonEmpty,
    speakerId: nonEmpty,
    prompt: nonEmpty,
    acceptsFreeInput: z.boolean(),
    continueConversation: z.boolean(),
    choices: z.tuple([suggestedReplySchema, suggestedReplySchema, suggestedReplySchema]),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runStartRequestSchema = z
  .object({
    startId: nonEmpty.max(128),
    locale: nonEmpty,
  })
  .strict();
export const runSnapshotRequestSchema = z.object({ runId: nonEmpty }).strict();

export const runArrivalObservationSchema = z
  .object({
    movementId: nonEmpty,
    actorId: nonEmpty,
    anchorRef: nonEmpty,
  })
  .strict();

export const runAdvanceRequestSchema = z
  .object({
    runId: nonEmpty,
    advanceId: nonEmpty.max(128),
    observedWorldRevision: z.number().int().nonnegative(),
    afterSpeechSeq: z.number().int().nonnegative().optional(),
    elapsedSeconds: z.number().min(0).max(10),
    arrivals: z.array(runArrivalObservationSchema).max(6),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.elapsedSeconds === 0 && request.arrivals.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["elapsedSeconds"],
        message: "advance requires elapsed time or at least one arrival",
      });
    }
    if (new Set(request.arrivals.map(arrival => arrival.actorId)).size !== request.arrivals.length) {
      context.addIssue({
        code: "custom",
        path: ["arrivals"],
        message: "arrival actorIds must be unique within one advance",
      });
    }
    if (new Set(request.arrivals.map(arrival => arrival.movementId)).size !== request.arrivals.length) {
      context.addIssue({
        code: "custom",
        path: ["arrivals"],
        message: "arrival movementIds must be unique within one advance",
      });
    }
  });

export const runArrivalAppliedSchema = z
  .object({
    movementId: nonEmpty,
    actorId: nonEmpty,
    anchorRef: nonEmpty,
    locationId: nonEmpty,
  })
  .strict();

export const runArrivalRejectedSchema = z
  .object({
    movementId: nonEmpty,
    actorId: nonEmpty,
    anchorRef: nonEmpty,
    reason: z.enum(["superseded", "not_current", "target_mismatch"]),
    currentMovementId: nonEmpty.optional(),
    currentTargetAnchorRef: nonEmpty.optional(),
  })
  .strict();

export const runMovementDeltaSchema = z
  .object({
    movementId: nonEmpty,
    actorId: nonEmpty,
    issuedAtSeconds: z.number().nonnegative(),
    fromAnchorRef: nonEmpty,
    targetAnchorRef: nonEmpty,
    targetLocationId: nonEmpty,
    scheduleBlockId: nonEmpty,
    activity: nonEmpty,
    routePointIndex: z.number().int().nonnegative().nullable(),
    supersedesMovementId: nonEmpty.optional(),
  })
  .strict();

export const runActorReadinessDeltaSchema = z
  .object({
    actorId: nonEmpty,
    playerConversationReady: z.boolean(),
    reason: z.enum(["schedule_departure", "arrival_at_interaction"]),
  })
  .strict();

export const runAdvanceResponseSchema = z
  .object({
    runId: nonEmpty,
    advanceId: nonEmpty,
    previousWorldRevision: z.number().int().nonnegative(),
    worldRevision: z.number().int().nonnegative(),
    clock: z
      .object({
        fromSeconds: z.number().nonnegative(),
        toSeconds: z.number().nonnegative(),
        requestedElapsedSeconds: z.number().nonnegative(),
        appliedElapsedSeconds: z.number().nonnegative(),
        graceEnded: z.boolean(),
        hearingDue: z.boolean(),
      })
      .strict(),
    arrivalsApplied: z.array(runArrivalAppliedSchema),
    arrivalsRejected: z.array(runArrivalRejectedSchema),
    scheduleWakes: z.array(runScheduleWakeSchema),
    movementDeltas: z.array(runMovementDeltaSchema),
    actorReadinessDeltas: z.array(runActorReadinessDeltaSchema),
    ambientSpeechEvents: z.array(runAmbientSpeechEventSchema),
    ambientSpeechCursor: z.number().int().nonnegative(),
    scheduler: runSchedulerSnapshotSchema,
  })
  .strict();

export const runNpcDecisionRequestSchema = z
  .object({
    runId: nonEmpty,
    wakeId: nonEmpty,
    observedWorldRevision: z.number().int().nonnegative(),
  })
  .strict();

export const runNpcDecisionResponseSchema = z
  .object({
    runId: nonEmpty,
    wakeId: nonEmpty,
    status: z.enum(["completed", "queued", "stale", "budget_reserved", "failed"]),
    observedWorldRevision: z.number().int().nonnegative(),
    worldRevision: z.number().int().nonnegative(),
    conversationId: nonEmpty,
    participantActorIds: z.tuple([nonEmpty, nonEmpty]),
    speechEvents: z.array(runAmbientSpeechEventSchema),
    providerMetas: z.array(proposalMetaSchema).max(2),
  })
  .strict();

export const runSessionStartRequestSchema = z
  .object({
    runId: nonEmpty,
    actorId: nonEmpty,
    interactionZoneId: nonEmpty,
    locale: z.literal("ko-KR"),
  })
  .strict();

export const runSessionStartResponseSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    worldRevision: z.number().int().positive(),
    actor: runActorSchema,
    nextTurn: runNextTurnSchema,
  })
  .strict();

export const runSessionAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), choiceId: nonEmpty }).strict(),
  z
    .object({ type: z.literal("free_input"), text: z.string().trim().min(1).max(120) })
    .strict(),
]);

export const runSessionAnswerRequestSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    turnId: nonEmpty,
    answer: runSessionAnswerSchema,
  })
  .strict();

export const runJudgmentSchema = z
  .object({
    signals: z.array(signalSchema),
    whyLine: nonEmpty,
    suspicionDelta: z.number().int(),
    reportDelta: z.number().int(),
    institutionalPressureDelta: z.number().int(),
    suspicionAfter: z.number().int().min(0).max(125),
    reportPressureAfter: z.number().int().min(0).max(125),
    stanceBefore: stanceSchema,
    stanceAfter: stanceSchema,
    meaningfulFirsthand: z.boolean(),
  })
  .strict();

export const runSessionAnswerResponseSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    worldRevision: z.number().int().positive(),
    judgment: runJudgmentSchema,
    memoryDelta: runPlayerConversationMemorySchema,
    actor: runActorSchema,
    nextTurn: runNextTurnSchema.nullable(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runSessionEndRequestSchema = z
  .object({ runId: nonEmpty, sessionId: nonEmpty })
  .strict();

export const runSessionEndResponseSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    ended: z.literal(true),
    worldRevision: z.number().int().positive(),
    actor: runActorSchema,
    queuedRunDeltas: z.tuple([]),
  })
  .strict();

export const runSessionSnapshotRequestSchema = z
  .object({ runId: nonEmpty, sessionId: nonEmpty })
  .strict();

export const runSessionSnapshotResponseSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    actorId: nonEmpty,
    worldRevision: z.number().int().nonnegative(),
    status: z.enum(["active", "awaiting_end", "ended"]),
    actor: runActorSchema,
    nextTurn: runNextTurnSchema.nullable(),
    lastJudgment: runJudgmentSchema.nullable(),
    lastMemory: runMemorySchema.nullable(),
    lastProposalMeta: proposalMetaSchema.nullable(),
  })
  .strict();

export type RunSnapshot = z.infer<typeof runSnapshotSchema>;
export type RunActor = z.infer<typeof runActorSchema>;
export type RunMemory = z.infer<typeof runMemorySchema>;
export type RunNpcUtteranceMemory = z.infer<typeof runNpcUtteranceMemorySchema>;
export type RunPlayerConversationMemory = z.infer<typeof runPlayerConversationMemorySchema>;
export type RunAmbientUtteranceMemory = z.infer<typeof runAmbientUtteranceMemorySchema>;
export type RunAmbientSpeechEvent = z.infer<typeof runAmbientSpeechEventSchema>;
export type RunAmbientConversation = z.infer<typeof runAmbientConversationSchema>;
export type RunNextTurn = z.infer<typeof runNextTurnSchema>;
export type RunSessionAnswer = z.infer<typeof runSessionAnswerSchema>;
export type RunJudgment = z.infer<typeof runJudgmentSchema>;
export type RunSessionStartResponse = z.infer<typeof runSessionStartResponseSchema>;
export type RunSessionAnswerResponse = z.infer<typeof runSessionAnswerResponseSchema>;
export type RunSessionEndResponse = z.infer<typeof runSessionEndResponseSchema>;
export type RunSessionSnapshotResponse = z.infer<typeof runSessionSnapshotResponseSchema>;
export type RunAdvanceRequest = z.infer<typeof runAdvanceRequestSchema>;
export type RunAdvanceResponse = z.infer<typeof runAdvanceResponseSchema>;
export type RunArrivalObservation = z.infer<typeof runArrivalObservationSchema>;
export type RunArrivalApplied = z.infer<typeof runArrivalAppliedSchema>;
export type RunArrivalRejected = z.infer<typeof runArrivalRejectedSchema>;
export type RunMovementDelta = z.infer<typeof runMovementDeltaSchema>;
export type RunScheduleWake = z.infer<typeof runScheduleWakeSchema>;
export type RunSchedulerSnapshot = z.infer<typeof runSchedulerSnapshotSchema>;
export type RunActorReadinessDelta = z.infer<typeof runActorReadinessDeltaSchema>;
export type RunNpcDecisionRequest = z.infer<typeof runNpcDecisionRequestSchema>;
export type RunNpcDecisionResponse = z.infer<typeof runNpcDecisionResponseSchema>;

export { proposalMetaSchema as runProposalMetaSchema };
