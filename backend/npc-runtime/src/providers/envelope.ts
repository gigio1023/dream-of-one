import { z } from "zod";
import {
  COARSE_STANCES,
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
} from "../contracts/types.js";
import { TOOL_NAMES } from "../agentloop/tools.js";
import { RECORD_KINDS, WORLD_ROLES } from "../runtime/world/index.js";
import { supportedLocaleEntry } from "../localization/supported-locales.js";

const nonEmpty = z.string().trim().min(1);
const forbiddenPlayerVisibleScript = /[\p{Script=Latin}\p{Script=Han}]/u;
const intentSchema = z.enum(CONVERSATION_CHOICE_INTENTS);
const suggestedReplySchema = z.object({ text: nonEmpty, intent: intentSchema }).strict();

function isKoreanLocale(locale: string): boolean {
  return supportedLocaleEntry(locale).presentationId === "ko";
}

function addKoreanTextIssue(
  context: z.RefinementCtx,
  path: Array<string | number>,
  text: string | undefined,
): void {
  if (text && forbiddenPlayerVisibleScript.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible text must use modern Korean without Latin or Han characters",
    });
  }
}

export const conversationProposalSchema = z
  .object({
    utterance: nonEmpty,
    suggestedReplies: z.tuple([
      suggestedReplySchema,
      suggestedReplySchema,
      suggestedReplySchema,
    ]),
    continueConversation: z.boolean(),
  })
  .strict();

// Deltas are validated as integers only; the runtime clamps them to the
// per-turn validity caps so an over-eager model never dumps to fallback.
export const conversationJudgmentSchema = z
  .object({
    suspicionDelta: z.number().int(),
    reportDelta: z.number().int(),
    signals: z.array(z.enum(CONVERSATION_SUSPICION_SIGNALS)),
    whyLine: nonEmpty,
  })
  .strict();

export const mergedConversationTurnSchema = z
  .object({
    suspicionDelta: z.number().int(),
    reportDelta: z.number().int(),
    signals: z.array(z.enum(CONVERSATION_SUSPICION_SIGNALS)),
    whyLine: nonEmpty,
    stance: z.enum(COARSE_STANCES),
    meaningfulFirsthand: z.boolean(),
    openQuestion: z
      .object({
        status: z.enum(["open", "resolved"]),
        text: nonEmpty,
        whyLine: nonEmpty,
      })
      .strict()
      .nullable()
      .optional(),
    utterance: nonEmpty,
    suggestedReplies: z.tuple([
      suggestedReplySchema,
      suggestedReplySchema,
      suggestedReplySchema,
    ]),
    continueConversation: z.boolean(),
  })
  .strict();

export const ambientReplyJudgmentSchema = z
  .object({
    toolCall: z
      .object({
        tool: z.literal("talk_to"),
        args: z.object({ actorId: nonEmpty }).strict(),
      })
      .strict(),
    utterance: nonEmpty,
    rationale: nonEmpty,
    done: z.literal(true),
    suspicionDelta: z.number().int(),
    proposedStance: z.enum(COARSE_STANCES),
    whyLine: nonEmpty,
    openQuestion: z
      .object({
        status: z.enum(["open", "resolved"]),
        text: nonEmpty,
        whyLine: nonEmpty,
      })
      .strict()
      .nullable(),
  })
  .strict();

const uniqueIdListSchema = z.array(nonEmpty).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: "citation ids must be unique",
    });
  }
});

const hearingResidentAssessmentSchema = z
  .object({
    actorId: nonEmpty,
    proposedStance: z.enum(COARSE_STANCES),
    testimonyLine: nonEmpty,
    citedMemoryIds: uniqueIdListSchema,
  })
  .strict();

export const hearingJudgmentSchema = z
  .object({
    residentAssessments: z.tuple([
      hearingResidentAssessmentSchema,
      hearingResidentAssessmentSchema,
      hearingResidentAssessmentSchema,
      hearingResidentAssessmentSchema,
      hearingResidentAssessmentSchema,
      hearingResidentAssessmentSchema,
    ]),
    proposedVerdict: z.enum(["ordinary", "abnormal"]),
    verdictWhyLine: nonEmpty,
    officerLine: nonEmpty,
    citedRecordIds: uniqueIdListSchema,
    citedLedgerEventIds: uniqueIdListSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const actorIds = value.residentAssessments.map(assessment => assessment.actorId);
    if (new Set(actorIds).size !== actorIds.length) {
      context.addIssue({
        code: "custom",
        path: ["residentAssessments"],
        message: "hearing judgment requires six unique resident actor ids",
      });
    }
  });

const toolCallSchema = z
  .object({
    tool: z.enum(TOOL_NAMES),
    args: z.record(z.string(), z.unknown()),
  })
  .strict();

export const agentStepProposalSchema = z
  .object({
    toolCall: toolCallSchema.nullable(),
    utterance: z.string().nullable(),
    rationale: nonEmpty,
    done: z.boolean(),
  })
  .strict()
  .transform(value => ({
    toolCall: value.toolCall ?? undefined,
    utterance: value.utterance?.trim() || undefined,
    rationale: value.rationale,
    done: value.done,
  }))
  .refine(value => value.done || value.toolCall !== undefined, {
    message: "an active agent step requires toolCall",
  });

export function conversationProposalSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return conversationProposalSchema.superRefine((value, context) => {
    if (!korean) return;
    addKoreanTextIssue(context, ["utterance"], value.utterance);
    value.suggestedReplies.forEach((reply, index) => {
      addKoreanTextIssue(context, ["suggestedReplies", index, "text"], reply.text);
    });
  });
}

export function conversationJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return conversationJudgmentSchema.superRefine((value, context) => {
    if (korean) addKoreanTextIssue(context, ["whyLine"], value.whyLine);
  });
}

export function mergedConversationTurnSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return mergedConversationTurnSchema.superRefine((value, context) => {
    if (!korean) return;
    addKoreanTextIssue(context, ["whyLine"], value.whyLine);
    addKoreanTextIssue(context, ["utterance"], value.utterance);
    addKoreanTextIssue(context, ["openQuestion", "text"], value.openQuestion?.text);
    addKoreanTextIssue(context, ["openQuestion", "whyLine"], value.openQuestion?.whyLine);
    value.suggestedReplies.forEach((reply, index) => {
      addKoreanTextIssue(context, ["suggestedReplies", index, "text"], reply.text);
    });
  });
}

export function ambientReplyJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return ambientReplyJudgmentSchema.superRefine((value, context) => {
    if (!korean) return;
    addKoreanTextIssue(context, ["utterance"], value.utterance);
    addKoreanTextIssue(context, ["rationale"], value.rationale);
    addKoreanTextIssue(context, ["whyLine"], value.whyLine);
    addKoreanTextIssue(context, ["openQuestion", "text"], value.openQuestion?.text);
    addKoreanTextIssue(
      context,
      ["openQuestion", "whyLine"],
      value.openQuestion?.whyLine,
    );
  });
}

export function hearingJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return hearingJudgmentSchema.superRefine((value, context) => {
    if (!korean) return;
    value.residentAssessments.forEach((assessment, index) => {
      addKoreanTextIssue(
        context,
        ["residentAssessments", index, "testimonyLine"],
        assessment.testimonyLine,
      );
    });
    addKoreanTextIssue(context, ["verdictWhyLine"], value.verdictWhyLine);
    addKoreanTextIssue(context, ["officerLine"], value.officerLine);
  });
}

export function agentStepProposalSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return agentStepProposalSchema
    .refine(
      value => !korean || !value.utterance || !forbiddenPlayerVisibleScript.test(value.utterance),
      {
        message: "player-visible utterance must use modern Korean without Latin or Han characters",
      },
    )
    .refine(value => {
      if (!korean) return true;
      const args = value.toolCall?.args;
      if (!args) return true;
      const whyLine = typeof args.whyLine === "string" ? args.whyLine : undefined;
      const record = args.record && typeof args.record === "object"
        ? args.record as Record<string, unknown>
        : undefined;
      const stateBody = typeof record?.stateBody === "string" ? record.stateBody : undefined;
      const directStateBody = typeof args.stateBody === "string" ? args.stateBody : undefined;
      const openQuestion = args.openQuestion && typeof args.openQuestion === "object"
        ? args.openQuestion as Record<string, unknown>
        : undefined;
      const openQuestionText = typeof openQuestion?.text === "string" ? openQuestion.text : undefined;
      const openQuestionWhyLine = typeof openQuestion?.whyLine === "string"
        ? openQuestion.whyLine
        : undefined;
      return [whyLine, stateBody, directStateBody, openQuestionText, openQuestionWhyLine].every(
        text => !text || !forbiddenPlayerVisibleScript.test(text),
      );
    }, {
      message: "player-visible tool text must use modern Korean without Latin or Han characters",
    });
}

export const conversationProposalJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["utterance", "suggestedReplies", "continueConversation"],
  properties: {
    utterance: { type: "string", minLength: 1 },
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent"],
        properties: {
          text: { type: "string", minLength: 1 },
          intent: { type: "string", enum: [...CONVERSATION_CHOICE_INTENTS] },
        },
      },
    },
    continueConversation: { type: "boolean" },
  },
};

export const conversationJudgmentJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["suspicionDelta", "reportDelta", "signals", "whyLine"],
  properties: {
    suspicionDelta: { type: "integer" },
    reportDelta: { type: "integer" },
    signals: {
      type: "array",
      items: { type: "string", enum: [...CONVERSATION_SUSPICION_SIGNALS] },
    },
    whyLine: { type: "string", minLength: 1 },
  },
};

export const mergedConversationTurnJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "suspicionDelta",
    "reportDelta",
    "signals",
    "whyLine",
    "stance",
    "meaningfulFirsthand",
    "openQuestion",
    "utterance",
    "suggestedReplies",
    "continueConversation",
  ],
  properties: {
    suspicionDelta: { type: "integer" },
    reportDelta: { type: "integer" },
    signals: {
      type: "array",
      items: { type: "string", enum: [...CONVERSATION_SUSPICION_SIGNALS] },
    },
    whyLine: { type: "string", minLength: 1 },
    stance: { type: "string", enum: [...COARSE_STANCES] },
    meaningfulFirsthand: { type: "boolean" },
    openQuestion: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["status", "text", "whyLine"],
          properties: {
            status: { type: "string", enum: ["open", "resolved"] },
            text: { type: "string", minLength: 1 },
            whyLine: { type: "string", minLength: 1 },
          },
        },
      ],
    },
    utterance: { type: "string", minLength: 1 },
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent"],
        properties: {
          text: { type: "string", minLength: 1 },
          intent: { type: "string", enum: [...CONVERSATION_CHOICE_INTENTS] },
        },
      },
    },
    continueConversation: { type: "boolean" },
  },
};

export const ambientReplyJudgmentJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "toolCall",
    "utterance",
    "rationale",
    "done",
    "suspicionDelta",
    "proposedStance",
    "whyLine",
    "openQuestion",
  ],
  properties: {
    toolCall: {
      type: "object",
      additionalProperties: false,
      required: ["tool", "args"],
      properties: {
        tool: { type: "string", const: "talk_to" },
        args: {
          type: "object",
          additionalProperties: false,
          required: ["actorId"],
          properties: { actorId: { type: "string", minLength: 1 } },
        },
      },
    },
    utterance: { type: "string", minLength: 1 },
    rationale: { type: "string", minLength: 1 },
    done: { type: "boolean", const: true },
    suspicionDelta: { type: "integer" },
    proposedStance: { type: "string", enum: [...COARSE_STANCES] },
    whyLine: { type: "string", minLength: 1 },
    openQuestion: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["status", "text", "whyLine"],
          properties: {
            status: { type: "string", enum: ["open", "resolved"] },
            text: { type: "string", minLength: 1 },
            whyLine: { type: "string", minLength: 1 },
          },
        },
      ],
    },
  },
};

export const hearingJudgmentJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "residentAssessments",
    "proposedVerdict",
    "verdictWhyLine",
    "officerLine",
    "citedRecordIds",
    "citedLedgerEventIds",
  ],
  properties: {
    residentAssessments: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["actorId", "proposedStance", "testimonyLine", "citedMemoryIds"],
        properties: {
          actorId: { type: "string", minLength: 1 },
          proposedStance: { type: "string", enum: [...COARSE_STANCES] },
          testimonyLine: { type: "string", minLength: 1 },
          citedMemoryIds: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    proposedVerdict: { type: "string", enum: ["ordinary", "abnormal"] },
    verdictWhyLine: { type: "string", minLength: 1 },
    officerLine: { type: "string", minLength: 1 },
    citedRecordIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    citedLedgerEventIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
};

const administrativeOpenQuestionJsonSchema: Record<string, unknown> = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "text", "whyLine"],
      properties: {
        status: { type: "string", enum: ["open", "resolved"] },
        text: { type: "string", minLength: 1 },
        whyLine: { type: "string", minLength: 1 },
      },
    },
  ],
};

export const agentStepProposalJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["toolCall", "utterance", "rationale", "done"],
  properties: {
    toolCall: {
      anyOf: [
        { type: "null" },
        ...[
          ["move_to", { targetId: { type: "string" } }],
          ["look", { targetId: { type: "string" } }],
          ["talk_to", { actorId: { type: "string" } }],
          ["wait", { reason: { type: "string" } }],
          [
            "use_object",
            {
              objectId: { type: "string" },
              toState: { type: "string" },
              ledgerKind: { type: "string" },
              whyLine: { type: "string" },
            },
          ],
          [
            "write_record",
            {
              objectId: { type: ["string", "null"] },
              toState: { type: ["string", "null"] },
              ledgerKind: { type: "string" },
              record: {
                type: "object",
                additionalProperties: false,
                required: ["recordId", "kind", "targetId", "stateBody", "visibleTo"],
                properties: {
                  recordId: { type: "string" },
                  kind: { type: "string", enum: [...RECORD_KINDS] },
                  targetId: { type: "string" },
                  stateBody: { type: "string" },
                  visibleTo: {
                    type: "array",
                    items: { type: "string", enum: [...WORLD_ROLES] },
                  },
                },
              },
              citedLedgerEventId: { type: ["string", "null"] },
              whyLine: { type: "string" },
            },
            ["objectId", "toState", "ledgerKind", "record", "citedLedgerEventId", "whyLine"],
          ],
          [
            "write_record",
            {
              recordKind: { type: "string", enum: [...RECORD_KINDS] },
              sourceMemoryId: { type: "string" },
              stateBody: { type: "string" },
              whyLine: { type: "string" },
              institutionalPressureDelta: { type: "integer" },
              textSurfaceId: { type: "string" },
              openQuestion: administrativeOpenQuestionJsonSchema,
            },
            [
              "recordKind",
              "sourceMemoryId",
              "stateBody",
              "whyLine",
              "institutionalPressureDelta",
              "textSurfaceId",
              "openQuestion",
            ],
          ],
          [
            "write_record",
            {
              recordKind: { type: "string", enum: [...RECORD_KINDS] },
              sourceMemoryId: { type: "string" },
              stateBody: { type: "string" },
              whyLine: { type: "string" },
              institutionalPressureDelta: { type: "integer" },
              textSurfaceId: { type: "string" },
              recordId: { type: "string" },
              openQuestion: administrativeOpenQuestionJsonSchema,
            },
            [
              "recordKind",
              "sourceMemoryId",
              "stateBody",
              "whyLine",
              "institutionalPressureDelta",
              "textSurfaceId",
              "recordId",
              "openQuestion",
            ],
          ],
          ["read_record", { recordId: { type: "string" } }],
          [
            "read_record",
            {
              recordId: { type: "string" },
              whyLine: { type: "string" },
              institutionalPressureDelta: { type: "integer" },
              openQuestion: administrativeOpenQuestionJsonSchema,
            },
            ["recordId", "whyLine", "institutionalPressureDelta", "openQuestion"],
          ],
          [
            "request",
            {
              targetActorId: { type: "string" },
              action: { type: "string" },
              whyLine: { type: "string" },
            },
          ],
        ].map(([tool, properties, requiredArgs]) => ({
          type: "object",
          additionalProperties: false,
          required: ["tool", "args"],
          properties: {
            tool: { type: "string", const: tool },
            args: {
              type: "object",
              additionalProperties: false,
              required: requiredArgs ?? Object.keys(properties as Record<string, unknown>),
              properties,
            },
          },
        })),
      ],
    },
    utterance: { type: ["string", "null"] },
    rationale: { type: "string", minLength: 1 },
    done: { type: "boolean" },
  },
};
