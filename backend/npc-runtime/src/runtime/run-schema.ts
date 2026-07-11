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
]);

export const runActorSchema = z
  .object({
    actorId: nonEmpty,
    role: runActorRoleSchema,
    locationId: nonEmpty,
    stance: stanceSchema,
    suspicion: z.number().int().min(0).max(125),
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

export const runStartRequestSchema = z.object({ locale: z.literal("ko-KR") }).strict();
export const runSnapshotRequestSchema = z.object({ runId: nonEmpty }).strict();

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
export type RunNextTurn = z.infer<typeof runNextTurnSchema>;
export type RunSessionAnswer = z.infer<typeof runSessionAnswerSchema>;
export type RunJudgment = z.infer<typeof runJudgmentSchema>;
export type RunSessionStartResponse = z.infer<typeof runSessionStartResponseSchema>;
export type RunSessionAnswerResponse = z.infer<typeof runSessionAnswerResponseSchema>;
export type RunSessionEndResponse = z.infer<typeof runSessionEndResponseSchema>;
export type RunSessionSnapshotResponse = z.infer<typeof runSessionSnapshotResponseSchema>;

export { proposalMetaSchema as runProposalMetaSchema };
