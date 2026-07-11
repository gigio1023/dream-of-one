import { z } from "zod";
import { CONVERSATION_CHOICE_INTENTS, CONVERSATION_SUSPICION_SIGNALS } from "../contracts/types.js";
import { TOOL_NAMES } from "../agentloop/tools.js";
import { RECORD_KINDS, WORLD_ROLES } from "../runtime/world/index.js";

const nonEmpty = z.string().trim().min(1);
const forbiddenPlayerVisibleScript = /[\p{Script=Latin}\p{Script=Han}]/u;
const modernKoreanText = nonEmpty.refine(value => !forbiddenPlayerVisibleScript.test(value), {
  message: "player-visible text must use modern Korean without Latin or Han characters",
});
const intentSchema = z.enum(CONVERSATION_CHOICE_INTENTS);
const suggestedReplySchema = z.object({ text: modernKoreanText, intent: intentSchema }).strict();

export const conversationProposalSchema = z
  .object({
    utterance: modernKoreanText,
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
    whyLine: modernKoreanText,
  })
  .strict();

export const mergedConversationTurnSchema = z
  .object({
    suspicionDelta: z.number().int(),
    reportDelta: z.number().int(),
    signals: z.array(z.enum(CONVERSATION_SUSPICION_SIGNALS)),
    whyLine: modernKoreanText,
    utterance: modernKoreanText,
    suggestedReplies: z.tuple([
      suggestedReplySchema,
      suggestedReplySchema,
      suggestedReplySchema,
    ]),
    continueConversation: z.boolean(),
  })
  .strict();

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
  })
  .refine(value => !value.utterance || !forbiddenPlayerVisibleScript.test(value.utterance), {
    message: "player-visible utterance must use modern Korean without Latin or Han characters",
  })
  .refine(value => {
    const args = value.toolCall?.args;
    if (!args) return true;
    const whyLine = typeof args.whyLine === "string" ? args.whyLine : undefined;
    const record = args.record && typeof args.record === "object" ? args.record as Record<string, unknown> : undefined;
    const stateBody = typeof record?.stateBody === "string" ? record.stateBody : undefined;
    return [whyLine, stateBody].every(text => !text || !forbiddenPlayerVisibleScript.test(text));
  }, {
    message: "player-visible tool text must use modern Korean without Latin or Han characters",
  });

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
              objectId: { type: "string" },
              toState: { type: "string" },
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
          ],
          ["read_record", { recordId: { type: "string" } }],
          [
            "request",
            {
              targetActorId: { type: "string" },
              action: { type: "string" },
              whyLine: { type: "string" },
            },
          ],
        ].map(([tool, properties]) => ({
          type: "object",
          additionalProperties: false,
          required: ["tool", "args"],
          properties: {
            tool: { type: "string", const: tool },
            args: {
              type: "object",
              additionalProperties: false,
              required: Object.keys(properties as Record<string, unknown>),
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
