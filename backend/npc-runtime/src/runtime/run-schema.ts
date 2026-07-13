import { z } from "zod";
import {
  COARSE_STANCES,
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
  HEARING_CONTACT_BASES,
} from "../contracts/types.js";
import { gameplayLocaleSchema } from "../localization/supported-locales.js";
import { RECORD_KINDS } from "./world/types.js";

const nonEmpty = z.string().trim().min(1);
const socialSourceExcerptSchema = z
  .string()
  .trim()
  .min(1)
  .refine(value => [...value].length <= 160, {
    message: "social source excerpts must contain at most 160 Unicode code points",
  });
const providerFailureReasonSchema = z.enum([
  "missing_credentials",
  "unavailable",
  "timeout",
  "rate_limited",
  "invalid_envelope",
  "budget_exhausted",
  "transport_error",
]);
const proposalMetaSchema = z
  .object({
    profileId: nonEmpty,
    transport: z.enum(["live", "fallback", "scripted"]),
    usedFallback: z.boolean(),
    fallbackReason: providerFailureReasonSchema.optional(),
    usage: z
      .object({
        inputTokens: z.number().int().nonnegative(),
        outputTokens: z.number().int().nonnegative(),
        totalTokens: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((meta, context) => {
    if (meta.usedFallback !== (meta.transport === "fallback")) {
      context.addIssue({
        code: "custom",
        path: ["usedFallback"],
        message: "only fallback transport may set usedFallback",
      });
    }
    if (meta.transport !== "fallback" && meta.fallbackReason !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["fallbackReason"],
        message: "live and scripted proposal metadata cannot carry a fallback reason",
      });
    }
  });

const providerCallPurposeSchema = z.enum([
  "conversation",
  "conversation_turn",
  "agent_step",
  "ambient_reply",
  "hearing_verdict",
  "repair",
]);
const providerResolutionPurposeSchema = z.enum([
  "conversation",
  "conversation_turn",
  "agent_step",
  "ambient_reply",
  "hearing_verdict",
]);
const providerCallAuditSchema = z
  .object({
    seq: z.number().int().positive(),
    purpose: providerCallPurposeSchema,
    profileId: nonEmpty,
    transport: z.literal("live"),
    usedFallback: z.literal(false),
    outcome: z.enum(["success", "error"]),
    failureReason: providerFailureReasonSchema.nullable(),
    chargedTokens: z.number().int().nonnegative(),
  })
  .strict();
const providerResolutionAuditSchema = z
  .object({
    seq: z.number().int().positive(),
    purpose: providerResolutionPurposeSchema,
    profileId: nonEmpty,
    transport: z.enum(["live", "fallback", "scripted"]),
    usedFallback: z.boolean(),
    fallbackReason: providerFailureReasonSchema.nullable(),
    callSeqs: z.array(z.number().int().positive()),
  })
  .strict();

export const providerAuditSnapshotSchema = z
  .object({
    callsUsed: z.number().int().nonnegative(),
    tokensUsed: z.number().int().nonnegative(),
    inFlightCalls: z.number().int().nonnegative(),
    inFlightTokens: z.number().int().nonnegative(),
    complete: z.boolean(),
    truncated: z.boolean(),
    droppedCount: z.number().int().nonnegative(),
    calls: z.array(providerCallAuditSchema),
    resolutions: z.array(providerResolutionAuditSchema).max(256),
  })
  .strict()
  .superRefine((audit, context) => {
    const callSeqs = new Set(audit.calls.map(call => call.seq));
    const resolutionSeqs = new Set(audit.resolutions.map(resolution => resolution.seq));
    if (callSeqs.size !== audit.calls.length) {
      context.addIssue({ code: "custom", path: ["calls"], message: "call seq values must be unique" });
    }
    if (resolutionSeqs.size !== audit.resolutions.length) {
      context.addIssue({
        code: "custom",
        path: ["resolutions"],
        message: "resolution seq values must be unique",
      });
    }
    if (audit.callsUsed !== audit.calls.length + audit.inFlightCalls) {
      context.addIssue({
        code: "custom",
        path: ["callsUsed"],
        message: "callsUsed must equal completed plus in-flight calls",
      });
    }
    const chargedTokens = audit.calls.reduce((total, call) => total + call.chargedTokens, 0);
    if (audit.tokensUsed !== chargedTokens + audit.inFlightTokens) {
      context.addIssue({
        code: "custom",
        path: ["tokensUsed"],
        message: "tokensUsed must equal charged plus in-flight tokens",
      });
    }
    if ((audit.inFlightCalls === 0) !== (audit.inFlightTokens === 0)) {
      context.addIssue({
        code: "custom",
        path: ["inFlightTokens"],
        message: "in-flight calls and token reservations must agree",
      });
    }
    const resolutionCallSeqs = audit.resolutions.flatMap(resolution => resolution.callSeqs);
    const linkedCallSeqs = new Set(resolutionCallSeqs);
    if (resolutionCallSeqs.length !== linkedCallSeqs.size) {
      context.addIssue({
        code: "custom",
        path: ["resolutions"],
        message: "one provider call cannot belong to multiple resolutions",
      });
    }
    const allCallsLinked = audit.calls.every(call => linkedCallSeqs.has(call.seq));
    if (
      audit.complete !==
        (audit.droppedCount === 0 && audit.inFlightCalls === 0 && allCallsLinked)
    ) {
      context.addIssue({
        code: "custom",
        path: ["complete"],
        message: "complete requires no dropped, in-flight, or unresolved calls",
      });
    }
    if (audit.truncated !== (audit.droppedCount > 0)) {
      context.addIssue({
        code: "custom",
        path: ["truncated"],
        message: "truncated must reflect droppedCount",
      });
    }
    for (const [index, call] of audit.calls.entries()) {
      if ((call.outcome === "success") !== (call.failureReason === null)) {
        context.addIssue({
          code: "custom",
          path: ["calls", index, "failureReason"],
          message: "only failed calls carry a failure reason",
        });
      }
    }
    for (const [index, resolution] of audit.resolutions.entries()) {
      if (new Set(resolution.callSeqs).size !== resolution.callSeqs.length) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs"],
          message: "resolution callSeqs must be unique",
        });
      }
      if (resolution.callSeqs.some(seq => !callSeqs.has(seq))) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs"],
          message: "resolution callSeqs must reference retained calls",
        });
      }
      if (resolution.transport === "live" && resolution.callSeqs.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs"],
          message: "a live resolution must reference at least one transport call",
        });
      }
      const referencedCalls = resolution.callSeqs
        .map(seq => audit.calls.find(call => call.seq === seq))
        .filter((call): call is z.infer<typeof providerCallAuditSchema> => call !== undefined);
      if (resolution.callSeqs.some((seq, callIndex) =>
        callIndex > 0 && seq <= (resolution.callSeqs[callIndex - 1] ?? 0)
      )) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs"],
          message: "resolution callSeqs must be strictly ascending",
        });
      }
      if (
        referencedCalls[0] &&
        referencedCalls[0].purpose !== resolution.purpose
      ) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs", 0],
          message: "the first call purpose must match its resolution purpose",
        });
      }
      if (referencedCalls.slice(1).some(call => call.purpose !== "repair")) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "callSeqs"],
          message: "only repair calls may follow a resolution's first call",
        });
      }
      if (resolution.usedFallback !== (resolution.transport === "fallback")) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "usedFallback"],
          message: "fallback transport and usedFallback must agree",
        });
      }
      if (resolution.usedFallback !== (resolution.fallbackReason !== null)) {
        context.addIssue({
          code: "custom",
          path: ["resolutions", index, "fallbackReason"],
          message: "only fallback resolutions carry a fallback reason",
        });
      }
    }
    if (audit.complete && linkedCallSeqs.size !== audit.calls.length) {
      context.addIssue({
        code: "custom",
        path: ["complete"],
        message: "a complete audit references every completed call exactly once",
      });
    }
  });

const providerRuntimeTraceEntrySchema = z
  .object({
    seq: z.number().int().positive(),
    meta: proposalMetaSchema,
  })
  .strict();

export const providerRuntimeTraceSchema = z
  .object({
    complete: z.boolean(),
    truncated: z.boolean(),
    droppedCount: z.number().int().nonnegative(),
    entries: z.array(providerRuntimeTraceEntrySchema).max(512),
  })
  .strict()
  .superRefine((trace, context) => {
    if (trace.complete !== (trace.droppedCount === 0)) {
      context.addIssue({
        code: "custom",
        path: ["complete"],
        message: "complete requires no dropped runtime proposal metadata",
      });
    }
    if (trace.truncated !== (trace.droppedCount > 0)) {
      context.addIssue({
        code: "custom",
        path: ["truncated"],
        message: "truncated must reflect droppedCount",
      });
    }
    for (const [index, entry] of trace.entries.entries()) {
      if (entry.seq !== index + 1) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "seq"],
          message: "runtime trace retains one-based proposal order",
        });
      }
      if (entry.meta.usedFallback !== (entry.meta.transport === "fallback")) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "meta", "usedFallback"],
          message: "runtime fallback transport and usedFallback must agree",
        });
      }
    }
  });

export const runOpenQuestionSchema = z
  .object({
    status: z.enum(["open", "resolved"]),
    text: nonEmpty,
    whyLine: nonEmpty,
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

/** Listener-owned opinion change grounded in one exact ambient speech memory. */
export const runAmbientStanceJudgmentMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("ambient_stance_judgment"),
    sourceActorId: nonEmpty,
    listenerActorId: nonEmpty,
    sourceSpeechEventId: nonEmpty,
    sourceMemoryId: nonEmpty,
    wakeId: nonEmpty,
    conversationId: nonEmpty,
    suspicionBefore: z.number().int().min(0).max(125),
    suspicionDelta: z.number().int(),
    suspicionAfter: z.number().int().min(0).max(125),
    stanceBefore: stanceSchema,
    proposedStance: stanceSchema,
    appliedStance: stanceSchema,
    whyLine: nonEmpty,
    openQuestion: runOpenQuestionSchema.nullable(),
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
    proposalMeta: proposalMetaSchema,
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
    openQuestion: runOpenQuestionSchema.nullable(),
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runRecordReadMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("record_read"),
    sourceActorId: nonEmpty,
    listenerActorId: nonEmpty,
    recordId: nonEmpty,
    recordRevision: z.number().int().positive(),
    sourceMemoryId: nonEmpty,
    stateBody: nonEmpty,
    whyLine: nonEmpty,
    ledgerEventId: nonEmpty,
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runPlayerContactOutcomeMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("player_contact_outcome"),
    sourceActorId: z.literal("player"),
    listenerActorId: nonEmpty,
    contactId: nonEmpty,
    outcome: z.literal("not_engaged"),
    contactReason: nonEmpty,
    interactionZoneId: nonEmpty,
    originAnchorRef: nonEmpty,
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const RUN_PROP_HANDLING_ACTIONS = [
  "pick_up",
  "carry",
  "place",
  "throw",
] as const;

export const runPropHandlingActionSchema = z.enum(RUN_PROP_HANDLING_ACTIONS);

/** Engine-observed handling fact. It is memory only, never a social judgment. */
export const runPropHandlingObservationMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("prop_handling_observation"),
    sourceActorId: z.literal("player"),
    listenerActorId: nonEmpty,
    eventId: nonEmpty,
    propId: nonEmpty,
    action: runPropHandlingActionSchema,
    playerPosition: position3Schema,
    objectPosition: position3Schema,
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runInterrogationOutcomeMemorySchema = z
  .object({
    memoryId: nonEmpty,
    kind: z.literal("interrogation_outcome"),
    sourceActorId: z.literal("player"),
    listenerActorId: nonEmpty,
    sessionId: nonEmpty,
    ledgerSeq: z.number().int().positive(),
    whyLine: nonEmpty,
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runMemorySchema = z.discriminatedUnion("kind", [
  runNpcUtteranceMemorySchema,
  runPlayerConversationMemorySchema,
  runAmbientUtteranceMemorySchema,
  runAmbientStanceJudgmentMemorySchema,
  runRecordReadMemorySchema,
  runPlayerContactOutcomeMemorySchema,
  runPropHandlingObservationMemorySchema,
  runInterrogationOutcomeMemorySchema,
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

export const runRecordSchema = z
  .object({
    recordId: nonEmpty,
    kind: z.enum(RECORD_KINDS),
    authorActorId: nonEmpty,
    authorRole: runActorRoleSchema,
    targetId: z.literal("player"),
    stateBody: nonEmpty,
    visibleToActorIds: z.array(nonEmpty),
    sourceRefs: z.array(z.object({ sourceMemoryId: nonEmpty, originActorId: nonEmpty }).strict()).min(1),
    textSurfaceId: nonEmpty,
    createdWorldSeconds: z.number().nonnegative(),
    createdWorldRevision: z.number().int().positive(),
    recordRevision: z.number().int().positive(),
    lastLedgerEventId: nonEmpty,
  })
  .strict();

export const runLedgerEventSchema = z
  .object({
    eventId: nonEmpty,
    seq: z.number().int().positive(),
    kind: z.enum(["record_written", "record_updated", "record_read"]),
    actorId: nonEmpty,
    actorRole: runActorRoleSchema,
    recordId: nonEmpty,
    sourceMemoryId: nonEmpty,
    recordRevision: z.number().int().positive(),
    pressureBefore: z.number().int().min(0).max(125),
    pressureDelta: z.number().int(),
    pressureAfter: z.number().int().min(0).max(125),
    visibleToActorIds: z.array(nonEmpty),
    whyLine: nonEmpty,
    openQuestion: runOpenQuestionSchema.nullable(),
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runSocialProvenanceSchema = z
  .object({
    originKind: z.enum(["speech", "record"]),
    originActorId: nonEmpty,
    recipientKind: z.enum(["listener", "reader"]),
    recipientActorId: nonEmpty,
    sourceMemoryId: nonEmpty.nullable(),
    recordId: nonEmpty.nullable(),
    recordRevision: z.number().int().positive().nullable(),
    ledgerEventId: nonEmpty.nullable(),
    sourceExcerpt: socialSourceExcerptSchema,
    whyLine: nonEmpty,
  })
  .strict();

export const runSocialViewSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    hearing: z.object({ atSeconds: z.number().positive(), due: z.boolean() }).strict(),
    pressure: z
      .object({
        band: z.enum(["low", "raised", "high"]),
        latestEncounteredWhyLine: z.string().nullable(),
      })
      .strict(),
    encounteredResidents: z.array(z.object({
      actorId: nonEmpty,
      stance: stanceSchema,
      stanceRevision: z.number().int().nonnegative(),
      whyLine: z.string(),
      provenance: runSocialProvenanceSchema.nullable(),
    }).strict()),
    openQuestions: z.array(z.object({
      questionId: nonEmpty,
      subjectActorId: nonEmpty.nullable(),
      status: z.enum(["open", "resolved"]),
      text: nonEmpty,
      whyLine: nonEmpty,
      provenance: runSocialProvenanceSchema,
    }).strict()),
    encounteredRecords: z.array(z.object({
      recordId: nonEmpty,
      kind: z.enum(RECORD_KINDS),
      authorActorId: nonEmpty,
      targetId: z.literal("player"),
      stateBody: nonEmpty,
      recordRevision: z.number().int().positive(),
      lastLedgerEventId: nonEmpty,
      provenance: runSocialProvenanceSchema,
    }).strict()),
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
      "arrival",
      "observation",
      "goal",
      "grace",
      "hearing",
    ]),
    phase: z.enum(["started", "ended", "due"]),
    sourceId: nonEmpty,
    actorIds: z.array(nonEmpty),
    scheduledAtSeconds: z.number().nonnegative(),
    observedWorldRevision: z.number().int().positive(),
    requiresDecision: z.boolean(),
    status: z.enum(["informational", "pending", "claimed", "completed", "terminal"]),
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

export const runActiveContactSchema = z
  .object({
    contactId: nonEmpty,
    actorId: nonEmpty,
    interactionZoneId: nonEmpty,
    originAnchorRef: nonEmpty,
    safeDistanceM: z.number().positive(),
    issuedAtSeconds: z.number().nonnegative(),
    expiresAtSeconds: z.number().positive(),
    reason: nonEmpty,
    procedure: z.enum(["ordinary", "interrogation"]),
  })
  .strict();

export const runStatusSchema = z.enum([
  "active",
  "hearing_due",
  "hearing_active",
  "terminal",
  "closed",
]);

export const runHearingProcedureSchema = z
  .object({
    hearingId: nonEmpty,
    status: z.enum(["opening", "awaiting_defense", "resolved"]),
    turnId: nonEmpty.nullable(),
  })
  .strict();

export const runHearingAssessmentSchema = z
  .object({
    actorId: nonEmpty,
    contactBasis: z.enum(HEARING_CONTACT_BASES),
    proposedStance: stanceSchema,
    appliedStance: stanceSchema,
    testimonyLine: nonEmpty,
    citedMemoryIds: z.array(nonEmpty),
  })
  .strict();

export const runRecapEntrySchema = z
  .object({
    kind: z.enum(["defense", "testimony", "record", "ledger", "verdict"]),
    actorId: nonEmpty.nullable(),
    line: nonEmpty,
    sourceIds: z.array(nonEmpty),
  })
  .strict();

export const runTerminalResultSchema = z
  .object({
    hearingId: nonEmpty,
    verdict: z.enum(["ordinary", "abnormal"]),
    verdictWhyLine: nonEmpty,
    officerLine: nonEmpty,
    finalDefense: nonEmpty,
    evidencedVouchCount: z.number().int().min(0).max(6),
    residentAssessments: z.tuple([
      runHearingAssessmentSchema,
      runHearingAssessmentSchema,
      runHearingAssessmentSchema,
      runHearingAssessmentSchema,
      runHearingAssessmentSchema,
      runHearingAssessmentSchema,
    ]),
    citedRecordIds: z.array(nonEmpty),
    citedLedgerEventIds: z.array(nonEmpty),
    recap: z.array(runRecapEntrySchema).min(2),
    worldSeconds: z.number().nonnegative(),
    worldRevision: z.number().int().positive(),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runPlayerBriefSchema = z
  .object({
    identityKey: nonEmpty,
    arrivalKey: nonEmpty,
    uncertaintyKey: nonEmpty,
  })
  .strict();

export const runSnapshotSchema = z
  .object({
    runId: nonEmpty,
    worldId: nonEmpty,
    layoutRevision: nonEmpty,
    worldRevision: z.number().int().nonnegative(),
    runStatus: runStatusSchema,
    hearingProcedure: runHearingProcedureSchema.nullable(),
    terminalResult: runTerminalResultSchema.nullable(),
    locale: gameplayLocaleSchema,
    playerBrief: runPlayerBriefSchema,
    worldClock: z
      .object({
        elapsedSeconds: z.number().nonnegative(),
        graceEndsAtSeconds: z.number().nonnegative(),
        graceEnded: z.boolean(),
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
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    lastProposalMeta: proposalMetaSchema.nullable(),
    activeConversationId: nonEmpty.nullable(),
    actors: z.array(runActorSchema).length(6),
    scheduler: runSchedulerSnapshotSchema,
    ambientSpeech: runAmbientSpeechSnapshotSchema,
    activeContact: runActiveContactSchema.nullable(),
    records: z.array(runRecordSchema),
    ledgerEvents: z.array(runLedgerEventSchema),
    socialView: runSocialViewSchema,
  })
  .strict();

const suggestedReplySchema = z
  .object({
    choiceId: nonEmpty,
    intent: intentSchema,
    line: nonEmpty,
  })
  .strict();

export const runGeneratedNextTurnSchema = z
  .object({
    turnId: nonEmpty,
    beatId: nonEmpty,
    promptId: nonEmpty,
    choiceSetId: nonEmpty,
    speakerId: nonEmpty,
    prompt: nonEmpty,
    acceptsFreeInput: z.boolean(),
    continueConversation: z.boolean(),
    procedure: z.enum(["ordinary", "interrogation"]),
    hesitationMs: z.number().int().nonnegative(),
    choices: z.tuple([suggestedReplySchema, suggestedReplySchema, suggestedReplySchema]),
    proposalMeta: proposalMetaSchema,
  })
  .strict();

export const runHearingNextTurnSchema = z
  .object({
    turnId: nonEmpty,
    beatId: nonEmpty,
    promptId: nonEmpty,
    choiceSetId: nonEmpty,
    speakerId: nonEmpty,
    prompt: nonEmpty,
    acceptsFreeInput: z.literal(true),
    continueConversation: z.literal(false),
    procedure: z.literal("hearing"),
    hesitationMs: z.literal(0),
    choices: z.tuple([]),
    proposalMeta: z.null(),
  })
  .strict();

export const runNextTurnSchema = z.union([
  runGeneratedNextTurnSchema,
  runHearingNextTurnSchema,
]);

export const runStartRequestSchema = z
  .object({
    startId: nonEmpty.max(128),
    locale: gameplayLocaleSchema,
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

export const runPropObserverFactSchema = z
  .object({
    actorId: nonEmpty,
    visible: z.boolean(),
  })
  .strict();

export const runPropHandlingEventSchema = z
  .object({
    eventId: nonEmpty.max(128),
    propId: nonEmpty,
    action: runPropHandlingActionSchema,
    playerPosition: z.tuple([
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
    ]),
    objectPosition: z.tuple([
      z.number().finite(),
      z.number().finite(),
      z.number().finite(),
    ]),
    observedWorldRevision: z.number().int().nonnegative(),
    observers: z.array(runPropObserverFactSchema).length(6),
  })
  .strict()
  .superRefine((event, context) => {
    if (new Set(event.observers.map(observer => observer.actorId)).size !== 6) {
      context.addIssue({
        code: "custom",
        path: ["observers"],
        message: "prop observer actorIds must be unique",
      });
    }
  });

export const runActorSpatialFactsSchema = z
  .object({
    actorId: nonEmpty,
    position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
    reachableAnchorRefs: z.array(nonEmpty).max(64),
    visibleActorIds: z.array(nonEmpty).max(5),
    audibleActorIds: z.array(nonEmpty).max(5),
    visibleObjectIds: z.array(nonEmpty).max(32),
    playerVisible: z.boolean(),
    playerAudible: z.boolean(),
    playerReachable: z.boolean(),
    playerInteractionZoneId: nonEmpty.nullable(),
  })
  .strict()
  .superRefine((facts, context) => {
    for (const key of [
      "reachableAnchorRefs",
      "visibleActorIds",
      "audibleActorIds",
      "visibleObjectIds",
    ] as const) {
      if (new Set(facts[key]).size !== facts[key].length) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must contain unique ids`,
        });
      }
    }
  });

export const runPlayerSpatialFactsSchema = z
  .object({
    position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
    locationId: z.string(),
  })
  .strict();

export const runSpatialFactsBatchSchema = z
  .object({
    observedWorldRevision: z.number().int().nonnegative(),
    player: runPlayerSpatialFactsSchema,
    actors: z.array(runActorSpatialFactsSchema).length(6),
  })
  .strict()
  .superRefine((batch, context) => {
    if (new Set(batch.actors.map(actor => actor.actorId)).size !== batch.actors.length) {
      context.addIssue({
        code: "custom",
        path: ["actors"],
        message: "spatial fact actorIds must be unique",
      });
    }
  });

export const runAdvanceRequestSchema = z
  .object({
    runId: nonEmpty,
    advanceId: nonEmpty.max(128),
    observedWorldRevision: z.number().int().nonnegative(),
    afterSpeechSeq: z.number().int().nonnegative().optional(),
    elapsedSeconds: z.number().min(0).max(10),
    arrivals: z.array(runArrivalObservationSchema).max(6),
    spatialFacts: runSpatialFactsBatchSchema.optional(),
    propHandlingEvents: z.array(runPropHandlingEventSchema).max(8).optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.elapsedSeconds === 0 &&
      request.arrivals.length === 0 &&
      !request.spatialFacts &&
      (request.propHandlingEvents?.length ?? 0) === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["elapsedSeconds"],
        message: "advance requires elapsed time, an arrival, spatial facts, or a prop event",
      });
    }
    if (
      request.spatialFacts &&
      request.spatialFacts.observedWorldRevision !== request.observedWorldRevision
    ) {
      context.addIssue({
        code: "custom",
        path: ["spatialFacts", "observedWorldRevision"],
        message: "spatial facts must observe the same world revision as the advance",
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
    for (const [index, event] of (request.propHandlingEvents ?? []).entries()) {
      if (event.observedWorldRevision > request.observedWorldRevision) {
        context.addIssue({
          code: "custom",
          path: ["propHandlingEvents", index, "observedWorldRevision"],
          message: "prop events cannot observe a future world revision",
        });
      }
    }
    const propEventIds = (request.propHandlingEvents ?? []).map(event => event.eventId);
    if (new Set(propEventIds).size !== propEventIds.length) {
      context.addIssue({
        code: "custom",
        path: ["propHandlingEvents"],
        message: "prop eventIds must be unique within one advance",
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
    reason: z.enum([
      "schedule_departure",
      "arrival_at_interaction",
      "movement_started",
      "opening_ready",
      "preload_required",
    ]),
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
    acceptedPropEventIds: z.array(nonEmpty).optional(),
    propObservationMemories: z.array(runPropHandlingObservationMemorySchema).optional(),
    scheduler: runSchedulerSnapshotSchema,
    socialView: runSocialViewSchema,
    activeContact: runActiveContactSchema.nullable(),
  })
  .strict();

export const runNpcDecisionRequestSchema = z
  .object({
    runId: nonEmpty,
    wakeId: nonEmpty,
    observedWorldRevision: z.number().int().nonnegative(),
  })
  .strict();

export const runLookDeltaSchema = z
  .object({
    kind: z.literal("look"),
    actorId: nonEmpty,
    targetKind: z.enum(["actor", "object", "record"]),
    targetId: nonEmpty,
    worldRevision: z.number().int().positive(),
  })
  .strict();

export const runAdministrationDeltaSchema = z
  .object({
    kind: z.literal("administration"),
    action: z.enum(["write_record", "read_record"]),
    record: runRecordSchema,
    ledgerEvent: runLedgerEventSchema,
    pressureBefore: z.number().int().min(0).max(125),
    pressureAfter: z.number().int().min(0).max(125),
  })
  .strict();

export const runDecisionDeltaSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("speech"), speechEvent: runAmbientSpeechEventSchema }).strict(),
  z.object({ kind: z.literal("readiness"), readinessDelta: runActorReadinessDeltaSchema }).strict(),
  runLookDeltaSchema,
  runAdministrationDeltaSchema,
  z.object({ kind: z.literal("movement"), movementDelta: runMovementDeltaSchema }).strict(),
]);

export const runNpcDecisionResponseSchema = z
  .object({
    runId: nonEmpty,
    wakeId: nonEmpty,
    decisionKind: z.enum(["ambient_conversation", "actor_goal"]),
    wakeKind: z.enum(["meeting_ready", "goal"]),
    actorIds: z.array(nonEmpty).min(1).max(2),
    status: z.enum(["completed", "queued", "stale", "budget_reserved", "failed"]),
    observedWorldRevision: z.number().int().nonnegative(),
    worldRevision: z.number().int().nonnegative(),
    conversationId: nonEmpty.nullable(),
    participantActorIds: z.array(nonEmpty).max(2),
    speechEvents: z.array(runAmbientSpeechEventSchema),
    actorReadinessDeltas: z.array(runActorReadinessDeltaSchema),
    actionDeltas: z.array(runDecisionDeltaSchema),
    movementDeltas: z.array(runMovementDeltaSchema),
    providerMetas: z.array(proposalMetaSchema).max(3),
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    socialView: runSocialViewSchema,
    activeContact: runActiveContactSchema.nullable(),
  })
  .strict();

export const runSessionStartRequestSchema = z
  .object({
    runId: nonEmpty,
    actorId: nonEmpty,
    interactionZoneId: nonEmpty,
    locale: gameplayLocaleSchema,
    contactId: nonEmpty.optional(),
  })
  .strict();

export const runSessionStartResponseSchema = z
  .object({
    runId: nonEmpty,
    sessionId: nonEmpty,
    worldRevision: z.number().int().positive(),
    actor: runActorSchema,
    nextTurn: runGeneratedNextTurnSchema,
    socialView: runSocialViewSchema,
    activeContact: runActiveContactSchema.nullable(),
  })
  .strict();

export const runSessionPreloadResponseSchema = z
  .object({
    runId: nonEmpty,
    worldRevision: z.number().int().positive(),
    interactionZoneId: nonEmpty,
    actor: runActorSchema,
    proposalMeta: proposalMetaSchema,
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    activeContact: runActiveContactSchema.nullable(),
  })
  .strict();

const runFreeInputAnswerSchema = z
  .object({ type: z.literal("free_input"), text: z.string().trim().min(1).max(120) })
  .strict();

export const runSessionAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), choiceId: nonEmpty }).strict(),
  runFreeInputAnswerSchema,
  z.object({ type: z.literal("hesitation") }).strict(),
]);

export const runHearingRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"),
    runId: nonEmpty,
    hearingId: nonEmpty.max(128),
  }).strict(),
  z.object({
    action: z.literal("answer"),
    runId: nonEmpty,
    hearingId: nonEmpty.max(128),
    turnId: nonEmpty,
    answer: runFreeInputAnswerSchema,
  }).strict(),
]);

export const runHearingResponseSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"),
    runId: nonEmpty,
    hearingId: nonEmpty,
    worldRevision: z.number().int().positive(),
    runStatus: z.literal("hearing_active"),
    hearingProcedure: runHearingProcedureSchema,
    staging: z.object({
      playerAnchorRef: nonEmpty,
      focusAnchorRef: nonEmpty,
    }).strict(),
    nextTurn: runHearingNextTurnSchema,
    terminalResult: z.null(),
    proposalMeta: z.null(),
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    socialView: runSocialViewSchema,
  }).strict(),
  z.object({
    action: z.literal("answer"),
    runId: nonEmpty,
    hearingId: nonEmpty,
    worldRevision: z.number().int().positive(),
    runStatus: z.literal("terminal"),
    hearingProcedure: runHearingProcedureSchema,
    nextTurn: z.null(),
    terminalResult: runTerminalResultSchema,
    proposalMeta: proposalMetaSchema,
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    socialView: runSocialViewSchema,
  }).strict(),
]);

export const runEndRequestSchema = z
  .object({ runId: nonEmpty, endId: nonEmpty.max(128) })
  .strict();

export const runEndResponseSchema = z
  .object({
    runId: nonEmpty,
    endId: nonEmpty,
    runStatus: z.literal("closed"),
    terminalResult: runTerminalResultSchema,
    providerBudget: z.object({
      callLimit: z.number().int().positive(),
      tokenLimit: z.number().int().positive(),
      reservedCalls: z.number().int().nonnegative(),
      reservedTokens: z.number().int().nonnegative(),
      callsUsed: z.number().int().nonnegative(),
      tokensUsed: z.number().int().nonnegative(),
    }).strict(),
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    lastProposalMeta: proposalMetaSchema.nullable(),
  })
  .strict();

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
    nextTurn: runGeneratedNextTurnSchema.nullable(),
    proposalMeta: proposalMetaSchema,
    providerAudit: providerAuditSnapshotSchema,
    providerRuntimeTrace: providerRuntimeTraceSchema,
    socialView: runSocialViewSchema,
    activeContact: runActiveContactSchema.nullable(),
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
    queuedRunDeltas: z.array(runDecisionDeltaSchema),
    socialView: runSocialViewSchema,
    activeContact: runActiveContactSchema.nullable(),
  })
  .strict();

export const runEncounterRequestSchema = z
  .object({
    runId: nonEmpty,
    encounterId: nonEmpty.max(128),
    encounter: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("speech"),
        speechEventId: nonEmpty,
        playerPosition: position3Schema,
      }).strict(),
      z.object({
        kind: z.literal("record_surface"),
        textSurfaceId: nonEmpty,
        playerPosition: position3Schema,
      }).strict(),
    ]),
  })
  .strict();

export const runEncounterResponseSchema = z
  .object({
    runId: nonEmpty,
    encounterId: nonEmpty,
    socialView: runSocialViewSchema,
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
    nextTurn: runGeneratedNextTurnSchema.nullable(),
    lastJudgment: runJudgmentSchema.nullable(),
    lastMemory: runMemorySchema.nullable(),
    lastProposalMeta: proposalMetaSchema.nullable(),
  })
  .strict();

export type RunSnapshot = z.infer<typeof runSnapshotSchema>;
export type RunProviderAudit = z.infer<typeof providerAuditSnapshotSchema>;
export type RunProviderRuntimeTrace = z.infer<typeof providerRuntimeTraceSchema>;
export type RunActor = z.infer<typeof runActorSchema>;
export type RunMemory = z.infer<typeof runMemorySchema>;
export type RunRecordReadMemory = z.infer<typeof runRecordReadMemorySchema>;
export type RunPlayerContactOutcomeMemory = z.infer<typeof runPlayerContactOutcomeMemorySchema>;
export type RunPropHandlingAction = z.infer<typeof runPropHandlingActionSchema>;
export type RunPropHandlingEvent = z.infer<typeof runPropHandlingEventSchema>;
export type RunPropHandlingObservationMemory = z.infer<
  typeof runPropHandlingObservationMemorySchema
>;
export type RunInterrogationOutcomeMemory = z.infer<typeof runInterrogationOutcomeMemorySchema>;
export type RunOpenQuestion = z.infer<typeof runOpenQuestionSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
export type RunLedgerEvent = z.infer<typeof runLedgerEventSchema>;
export type RunSocialProvenance = z.infer<typeof runSocialProvenanceSchema>;
export type RunSocialView = z.infer<typeof runSocialViewSchema>;
export type RunNpcUtteranceMemory = z.infer<typeof runNpcUtteranceMemorySchema>;
export type RunPlayerConversationMemory = z.infer<typeof runPlayerConversationMemorySchema>;
export type RunAmbientUtteranceMemory = z.infer<typeof runAmbientUtteranceMemorySchema>;
export type RunAmbientStanceJudgmentMemory = z.infer<
  typeof runAmbientStanceJudgmentMemorySchema
>;
export type RunAmbientSpeechEvent = z.infer<typeof runAmbientSpeechEventSchema>;
export type RunAmbientConversation = z.infer<typeof runAmbientConversationSchema>;
export type RunActiveContact = z.infer<typeof runActiveContactSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunHearingProcedure = z.infer<typeof runHearingProcedureSchema>;
export type RunTerminalResult = z.infer<typeof runTerminalResultSchema>;
export type RunHearingRequest = z.infer<typeof runHearingRequestSchema>;
export type RunHearingResponse = z.infer<typeof runHearingResponseSchema>;
export type RunEndRequest = z.infer<typeof runEndRequestSchema>;
export type RunEndResponse = z.infer<typeof runEndResponseSchema>;
export type RunGeneratedNextTurn = z.infer<typeof runGeneratedNextTurnSchema>;
export type RunHearingNextTurn = z.infer<typeof runHearingNextTurnSchema>;
export type RunNextTurn = z.infer<typeof runNextTurnSchema>;
export type RunSessionAnswer = z.infer<typeof runSessionAnswerSchema>;
export type RunJudgment = z.infer<typeof runJudgmentSchema>;
export type RunSessionStartResponse = z.infer<typeof runSessionStartResponseSchema>;
export type RunSessionPreloadResponse = z.infer<typeof runSessionPreloadResponseSchema>;
export type RunSessionAnswerResponse = z.infer<typeof runSessionAnswerResponseSchema>;
export type RunSessionEndResponse = z.infer<typeof runSessionEndResponseSchema>;
export type RunSessionSnapshotResponse = z.infer<typeof runSessionSnapshotResponseSchema>;
export type RunAdvanceRequest = z.infer<typeof runAdvanceRequestSchema>;
export type RunAdvanceResponse = z.infer<typeof runAdvanceResponseSchema>;
export type RunArrivalObservation = z.infer<typeof runArrivalObservationSchema>;
export type RunActorSpatialFacts = z.infer<typeof runActorSpatialFactsSchema>;
export type RunPlayerSpatialFacts = z.infer<typeof runPlayerSpatialFactsSchema>;
export type RunSpatialFactsBatch = z.infer<typeof runSpatialFactsBatchSchema>;
export type RunArrivalApplied = z.infer<typeof runArrivalAppliedSchema>;
export type RunArrivalRejected = z.infer<typeof runArrivalRejectedSchema>;
export type RunMovementDelta = z.infer<typeof runMovementDeltaSchema>;
export type RunScheduleWake = z.infer<typeof runScheduleWakeSchema>;
export type RunSchedulerSnapshot = z.infer<typeof runSchedulerSnapshotSchema>;
export type RunActorReadinessDelta = z.infer<typeof runActorReadinessDeltaSchema>;
export type RunDecisionDelta = z.infer<typeof runDecisionDeltaSchema>;
export type RunAdministrationDelta = z.infer<typeof runAdministrationDeltaSchema>;
export type RunLookDelta = z.infer<typeof runLookDeltaSchema>;
export type RunNpcDecisionRequest = z.infer<typeof runNpcDecisionRequestSchema>;
export type RunNpcDecisionResponse = z.infer<typeof runNpcDecisionResponseSchema>;
export type RunEncounterRequest = z.infer<typeof runEncounterRequestSchema>;
export type RunEncounterResponse = z.infer<typeof runEncounterResponseSchema>;

export { proposalMetaSchema as runProposalMetaSchema };
