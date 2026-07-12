// Zod schemas for the Session API. Every request and response validates
// against these on both ingress and egress (invariant #1). The client
// fixtures (`data/fixtures/session-api-examples.json`) validate against the
// same schemas so the wire contract cannot drift.

import { z } from "zod";
import { CONVERSATION_SUSPICION_SIGNALS, CONVERSATION_CHOICE_INTENTS } from "../contracts/types.js";
import { WORLD_ROLES } from "../runtime/world/index.js";
import { TOOL_NAMES } from "../agentloop/tools.js";

const roleEnum = z.enum(WORLD_ROLES);
const signalEnum = z.enum(CONVERSATION_SUSPICION_SIGNALS);
const intentEnum = z.enum(CONVERSATION_CHOICE_INTENTS);
const toolEnum = z.enum(TOOL_NAMES);
const routeIdEnum = z.enum(["clean_cover", "repair_recovery", "soft_report", "hard_inquest"]);
const stageEnum = z.enum(["routine", "probe", "reconciliation", "resolved"]);
const nonEmpty = z.string().min(1);

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

export const civicEconomySchema = z
  .object({
    accountCredit: z.number().int(),
    localTrust: z.number().int(),
    recordBurden: z.number().int(),
    stationAttention: z.number().int(),
    favor: z.number().int(),
  })
  .strict();

export const economyDeltaSchema = z
  .object({
    accountCredit: z.number().int().optional(),
    localTrust: z.number().int().optional(),
    recordBurden: z.number().int().optional(),
    stationAttention: z.number().int().optional(),
    favor: z.number().int().optional(),
  })
  .strict();

export const ledgerEventSchema = z
  .object({
    eventId: nonEmpty,
    seq: z.number().int().nonnegative(),
    kind: nonEmpty,
    actorId: nonEmpty,
    actorRole: roleEnum,
    objectId: z.string().optional(),
    recordId: z.string().optional(),
    citedLedgerEventId: z.string().optional(),
    economyDelta: economyDeltaSchema,
    visibleTo: z.array(roleEnum),
    whyLine: nonEmpty,
  })
  .strict();

const recordPropSchema = z
  .object({
    objectId: nonEmpty,
    label: nonEmpty,
    state: nonEmpty,
    visibleTo: z.array(roleEnum),
    recordId: z.string().optional(),
  })
  .strict();

const hudStateSchema = z
  .object({
    suspicion: z.number().int().nonnegative(),
    reportPressure: z.number().int().nonnegative(),
    stage: stageEnum,
    projectedRoute: routeIdEnum,
    ledgerCount: z.number().int().nonnegative(),
    activePromptId: z.string().nullable(),
    providerProfile: nonEmpty,
    providerTransport: z.enum(["live", "fallback", "scripted"]),
    providerFallbackReason: z.string().optional(),
  })
  .strict();

export const worldSnapshotSchema = z
  .object({
    landmarks: z.array(z.object({ landmarkId: nonEmpty, label: nonEmpty }).strict()),
    actors: z.array(
      z.object({ actorId: nonEmpty, role: roleEnum, name: nonEmpty, landmarkId: nonEmpty }).strict(),
    ),
    recordProps: z.array(recordPropSchema),
    civicEconomy: civicEconomySchema,
    hudState: hudStateSchema,
  })
  .strict();

const nextTurnSchema = z
  .object({
    turnId: nonEmpty,
    beatId: nonEmpty,
    promptId: nonEmpty,
    choiceSetId: nonEmpty,
    speakerId: nonEmpty,
    prompt: nonEmpty,
    acceptsFreeInput: z.boolean(),
    continueConversation: z.boolean(),
    choices: z.array(
      z.object({ choiceId: nonEmpty, intent: intentEnum, line: nonEmpty }).strict(),
    ),
    proposalMeta: proposalMetaSchema,
    /** Station interrogation only; omit on ordinary conversation turns. */
    hesitationMs: z.number().int().positive().optional(),
  })
  .strict();

const npcReactionSchema = z
  .object({
    actorId: nonEmpty,
    role: roleEnum,
    kind: z.enum(["speech", "action"]),
    utterance: z.string().optional(),
    tool: z.string().optional(),
    ledgerEventId: z.string().optional(),
    whyLine: z.string().optional(),
    influence: z.object({ from: nonEmpty, to: nonEmpty }).strict().optional(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

const routeStateSchema = z
  .object({
    stage: stageEnum,
    projectedRoute: routeIdEnum,
    terminal: z.boolean(),
    suspicion: z.number().int().nonnegative(),
    reportPressure: z.number().int().nonnegative(),
  })
  .strict();

const transcriptEntrySchema = z
  .object({
    actorId: nonEmpty,
    step: z.number().int().positive(),
    observedSummary: nonEmpty,
    tool: toolEnum,
    args: z.record(z.string(), z.unknown()),
    utterance: z.string().optional(),
    rationale: nonEmpty,
    proposalMeta: proposalMetaSchema,
    validation: z
      .object({
        ok: z.boolean(),
        reason: z.string().optional(),
        detail: z.string().optional(),
        note: z.string(),
      })
      .strict(),
    ledgerEventId: z.string().optional(),
    nextStepChange: nonEmpty,
  })
  .strict();

const npcActionSchema = z
  .object({
    actorId: nonEmpty,
    tool: toolEnum,
    args: z.record(z.string(), z.unknown()),
    utterance: z.string().optional(),
    validationResult: z
      .object({
        ok: z.boolean(),
        reason: z.string().optional(),
        detail: z.string().optional(),
        note: z.string(),
      })
      .strict(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

// -------------------------------------------------------------------------
// Requests
// -------------------------------------------------------------------------

export const startRequestSchema = z
  // The retained Same Order regression storylet is Korean-only. Six-locale
  // production support belongs to the run-bound M3R request schemas.
  .object({ storyletId: nonEmpty, locale: z.literal("ko-KR") })
  .strict();

export const answerRequestSchema = z
  .object({
    sessionId: nonEmpty,
    turnId: nonEmpty,
    answer: z
      .object({
        type: z.enum(["choice", "free_input", "hesitation"]),
        choiceId: z.string().optional(),
        text: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export const decisionRequestSchema = z
  .object({ sessionId: nonEmpty, beat: z.number().int().nonnegative() })
  .strict();

export const snapshotRequestSchema = z.object({ sessionId: nonEmpty }).strict();

export const endRequestSchema = z.object({ sessionId: nonEmpty }).strict();

// -------------------------------------------------------------------------
// Responses
// -------------------------------------------------------------------------

export const startResponseSchema = z
  .object({
    sessionId: nonEmpty,
    worldSnapshot: worldSnapshotSchema,
    ledgerEvents: z.array(ledgerEventSchema),
    nextTurn: nextTurnSchema,
  })
  .strict();

export const answerResponseSchema = z
  .object({
    signals: z.array(signalEnum),
    whyLines: z.array(nonEmpty),
    suspicionDelta: z.number().int(),
    reportPressure: z.number().int().nonnegative(),
    npcReactions: z.array(npcReactionSchema),
    ledgerEvents: z.array(ledgerEventSchema),
    transcriptDeltas: z.array(transcriptEntrySchema),
    routeState: routeStateSchema,
    nextTurn: nextTurnSchema.nullable(),
  })
  .strict();

export const decisionResponseSchema = z
  .object({
    npcActions: z.array(npcActionSchema),
    ledgerEvents: z.array(ledgerEventSchema),
    transcriptDeltas: z.array(transcriptEntrySchema),
  })
  .strict();

export const snapshotResponseSchema = z
  .object({
    sessionId: nonEmpty,
    storyletId: nonEmpty,
    worldSnapshot: worldSnapshotSchema,
    records: z.array(
      z
        .object({
          recordId: nonEmpty,
          kind: nonEmpty,
          authorRole: roleEnum,
          stateBody: nonEmpty,
          visibleTo: z.array(roleEnum),
          lastLedgerEventId: z.string().optional(),
        })
        .strict(),
    ),
    ledgerEvents: z.array(ledgerEventSchema),
    routeState: routeStateSchema,
    nextTurn: nextTurnSchema.nullable(),
    agentTranscript: z.array(transcriptEntrySchema),
  })
  .strict();

export const endResponseSchema = z
  .object({
    route: routeIdEnum,
    outcomePanel: z
      .object({ title: nonEmpty, body: nonEmpty, citedLedgerIds: z.array(nonEmpty) })
      .strict(),
    telemetrySummary: z
      .object({
        turns: z.number().int().nonnegative(),
        signalsSeen: z.array(signalEnum),
        finalSuspicion: z.number().int().nonnegative(),
        finalReportPressure: z.number().int().nonnegative(),
        ledgerEventCount: z.number().int().nonnegative(),
        route: routeIdEnum,
        providerProfile: nonEmpty,
        fallbackCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type StartRequest = z.infer<typeof startRequestSchema>;
export type AnswerRequest = z.infer<typeof answerRequestSchema>;
export type DecisionRequest = z.infer<typeof decisionRequestSchema>;
export type EndRequest = z.infer<typeof endRequestSchema>;
