import { z } from "zod";
import {
  COARSE_STANCES,
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
  HEARING_CONTACT_BASES,
} from "../contracts/types.js";
import type { ObservePacket } from "../agentloop/context.js";
import { TOOL_NAMES, type ToolName } from "../agentloop/tools.js";
import { RECORD_KINDS, WORLD_ROLES } from "../runtime/world/index.js";
import {
  hearingContactBasisForMemories,
  validateHearingJudgment,
  type HearingJudgmentRequest,
} from "../runtime/run-hearing.js";
import { supportedLocaleEntry } from "../localization/supported-locales.js";
import type { RequiredAgentToolCall } from "./ports.js";

const nonEmpty = z.string().trim().min(1);
const requiredPlayerVisibleHangul = /\p{Script=Hangul}/u;
const forbiddenKoreanPlayerVisibleKana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const forbiddenKoreanPlayerVisibleChineseFragments =
  /(?:为何|为什么|因为|所以|没有|不是|已经|可以|需要|如果|但是|这个|那个|他们|我们|你们)/u;
const koreanPlayerVisibleLatinWords = /\p{Script=Latin}+/gu;
const forbiddenPlayerVisibleStableIds = [
  /\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/u,
  /\b(?:mem|sess|rec|led)-[A-Za-z0-9_.:-]+\b/u,
  /\b(?:record|ledger|wake|mov|contact|run|session|conversation|turn|beat|question|speech|event|goal|hearing)-(?=[A-Za-z0-9_.:-]*\d)[A-Za-z0-9_.:-]+\b/u,
  /\b(?:provider-smoke|mem|sess|rec|led|record|ledger|wake|mov|contact|run|session|conversation|turn|beat|question|speech|event|goal|hearing|ambient|spatial):[A-Za-z0-9_.:#-]+\b/u,
  /\b(?:Park|Studio|Office|Station)\.[A-Za-z0-9_.-]+\b/u,
] as const;
const intentSchema = z.enum(CONVERSATION_CHOICE_INTENTS);
const suggestedReplySchema = z.object({ text: nonEmpty, intent: intentSchema }).strict();
const playerVisibleJsonString = {
  type: "string",
  minLength: 1,
  description:
    "Player-visible natural-language prose only. Obey the request groundingContract when present; never invent a player or world fact. Never include an internal stable id, identifier token, or underscore name.",
} as const;
const suggestedReplyJsonString = {
  ...playerVisibleJsonString,
  description:
    `${playerVisibleJsonString.description} The reply must be a complete, self-contained player utterance. Explicitly preserve the person, object, source, or claim being answered whenever omission could make a noun phrase sound like the player's own identity or possession; never return a bare name, role, object, yes/no fragment, or context-dependent copular noun phrase.`,
} as const;
const nullablePlayerVisibleJsonString = {
  type: ["string", "null"],
  description:
    "Player-visible natural-language prose only when non-null. Obey the request groundingContract when present; never invent a player or world fact. Never include an internal stable id, identifier token, or underscore name.",
} as const;

function isKoreanLocale(locale: string): boolean {
  return supportedLocaleEntry(locale).presentationId === "ko";
}

function addPlayerVisibleTextIssues(
  context: z.RefinementCtx,
  path: Array<string | number>,
  text: string | undefined,
  requireHangul: boolean,
): void {
  if (!text) return;
  if (forbiddenPlayerVisibleStableIds.some(pattern => pattern.test(text))) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible text must not expose an internal stable id",
    });
  }
  if (requireHangul && !requiredPlayerVisibleHangul.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible Korean text must contain at least one Hangul code point",
    });
  }
  if (requireHangul && forbiddenKoreanPlayerVisibleKana.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible Korean text must not contain Japanese kana",
    });
  }
  if (requireHangul && forbiddenKoreanPlayerVisibleChineseFragments.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible Korean text must not contain Chinese function words or clauses",
    });
  }
  if (
    requireHangul &&
    [...text.matchAll(koreanPlayerVisibleLatinWords)].some(match => {
      const token = match[0];
      return token.length > 1 &&
        !/^[A-Z][a-z]+$/u.test(token) &&
        !/^[A-Z0-9]{2,6}$/u.test(token);
    })
  ) {
    context.addIssue({
      code: "custom",
      path,
      message:
        "player-visible Korean text may use Latin script only for title-case names or short uppercase acronyms",
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
    contactBasis: z.enum(HEARING_CONTACT_BASES),
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
    path: ["toolCall"],
    message: "an active agent step requires toolCall",
  });

export function conversationProposalSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return conversationProposalSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, korean);
    value.suggestedReplies.forEach((reply, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["suggestedReplies", index, "text"],
        reply.text,
        korean,
      );
    });
  });
}

export function conversationJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return conversationJudgmentSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, korean);
  });
}

export function mergedConversationTurnSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return mergedConversationTurnSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, korean);
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, korean);
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "text"],
      value.openQuestion?.text,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "whyLine"],
      value.openQuestion?.whyLine,
      korean,
    );
    value.suggestedReplies.forEach((reply, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["suggestedReplies", index, "text"],
        reply.text,
        korean,
      );
    });
  });
}

export function ambientReplyJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return ambientReplyJudgmentSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, korean);
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, korean);
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "text"],
      value.openQuestion?.text,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "whyLine"],
      value.openQuestion?.whyLine,
      korean,
    );
  });
}

export function ambientReplyJudgmentSchemaForRequest(
  locale: string,
  targetActorId: string,
) {
  return ambientReplyJudgmentSchemaForLocale(locale).superRefine((value, context) => {
    if (value.toolCall.args.actorId !== targetActorId) {
      context.addIssue({
        code: "custom",
        path: ["toolCall", "args", "actorId"],
        message: `ambient reply actorId must equal ${targetActorId}`,
      });
    }
  });
}

export function hearingJudgmentSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return hearingJudgmentSchema.superRefine((value, context) => {
    value.residentAssessments.forEach((assessment, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["residentAssessments", index, "testimonyLine"],
        assessment.testimonyLine,
        korean,
      );
    });
    addPlayerVisibleTextIssues(
      context,
      ["verdictWhyLine"],
      value.verdictWhyLine,
      korean,
    );
    addPlayerVisibleTextIssues(context, ["officerLine"], value.officerLine, korean);
  });
}

/**
 * Provider-bound hearing validation against the exact run evidence packet.
 * RunService remains the final authority and repeats this validation at
 * commit time; doing it here gives the provider's one repair attempt a chance
 * to fix request-semantic mistakes instead of turning a successful transport
 * call directly into runtime fallback.
 */
export function hearingJudgmentSchemaForRequest(request: HearingJudgmentRequest) {
  return hearingJudgmentSchemaForLocale(request.locale).superRefine((value, context) => {
    const validated = validateHearingJudgment(request, value);
    if (!validated.ok) {
      context.addIssue({
        code: "custom",
        message: validated.reason,
      });
      return;
    }
    if (
      value.proposedVerdict === "ordinary" &&
      validated.value.evidencedVouchCount < 4
    ) {
      context.addIssue({
        code: "custom",
        path: ["proposedVerdict"],
        message: "ordinary verdict requires at least four evidenced vouches",
      });
    }
  });
}

export function agentStepProposalSchemaForLocale(locale: string) {
  const korean = isKoreanLocale(locale);
  return agentStepProposalSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, korean);
    const args = value.toolCall?.args;
    if (!args) return;
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
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "whyLine"],
      whyLine,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "record", "stateBody"],
      stateBody,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "stateBody"],
      directStateBody,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "openQuestion", "text"],
      openQuestionText,
      korean,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "openQuestion", "whyLine"],
      openQuestionWhyLine,
      korean,
    );
  });
}

export type AgentStepRecordContract = "legacy" | "m3r";

export interface AgentStepRecordContracts {
  write_record?: AgentStepRecordContract;
  read_record?: AgentStepRecordContract;
}

export interface AgentStepRequestSchemaConstraints {
  effectiveTools: readonly ToolName[];
  observePacket: ObservePacket;
  recordContracts: AgentStepRecordContracts;
  allowedTalkActorIds?: readonly string[];
  requiredToolCall?: RequiredAgentToolCall;
  requireUtterance?: boolean;
}

const administrativeOpenQuestionValueSchema = z
  .object({
    status: z.enum(["open", "resolved"]),
    text: nonEmpty,
    whyLine: nonEmpty,
  })
  .strict()
  .nullable();

const legacyWriteRecordArgsSchema = z
  .object({
    objectId: z.string().nullable(),
    toState: z.string().nullable(),
    ledgerKind: z.string(),
    record: z
      .object({
        recordId: z.string(),
        kind: z.enum(RECORD_KINDS),
        targetId: z.string(),
        stateBody: z.string(),
        visibleTo: z.array(z.enum(WORLD_ROLES)),
      })
      .strict(),
    citedLedgerEventId: z.string().nullable(),
    whyLine: z.string(),
  })
  .strict();

const m3rWriteRecordArgsSchema = z
  .object({
    recordKind: z.enum(RECORD_KINDS),
    sourceMemoryId: z.string(),
    stateBody: z.string(),
    whyLine: z.string(),
    institutionalPressureDelta: z.number().int(),
    textSurfaceId: z.string(),
    recordId: z.string().optional(),
    openQuestion: administrativeOpenQuestionValueSchema,
  })
  .strict();

const legacyReadRecordArgsSchema = z.object({ recordId: z.string() }).strict();

const m3rReadRecordArgsSchema = z
  .object({
    recordId: z.string(),
    whyLine: z.string(),
    institutionalPressureDelta: z.number().int(),
    openQuestion: administrativeOpenQuestionValueSchema,
  })
  .strict();

const requestScopedArgsSchemas = {
  move_to: z.object({ targetId: nonEmpty }).strict(),
  look: z.object({ targetId: nonEmpty }).strict(),
  talk_to: z.object({ actorId: nonEmpty }).strict(),
  wait: z.object({ reason: z.string() }).strict(),
  use_object: z
    .object({
      objectId: nonEmpty,
      toState: z.string(),
      ledgerKind: z.string(),
      whyLine: z.string(),
    })
    .strict(),
  request: z
    .object({
      targetActorId: nonEmpty,
      action: z.string(),
      whyLine: z.string(),
    })
    .strict(),
} as const;

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter(value => value.length > 0))];
}

function visibleAndAudibleActorIds(packet: ObservePacket): string[] {
  const audible = new Set(packet.audibleActorIds);
  return uniqueStrings(packet.visibleActors.filter(actorId => audible.has(actorId)));
}

function scopedTalkActorIds(constraints: AgentStepRequestSchemaConstraints): string[] {
  const groundedActorIds = visibleAndAudibleActorIds(constraints.observePacket);
  if (
    constraints.requiredToolCall?.tool === "talk_to" ||
    constraints.allowedTalkActorIds === undefined
  ) {
    return groundedActorIds;
  }
  const grounded = new Set(groundedActorIds);
  return uniqueStrings(constraints.allowedTalkActorIds).filter(actorId => grounded.has(actorId));
}

function moveTargetIds(packet: ObservePacket): string[] {
  return uniqueStrings([
    ...packet.reachableAnchorRefs,
    ...(packet.playerContact?.available === true ? [packet.playerContact.targetActorId] : []),
  ]);
}

function lookTargetIds(packet: ObservePacket): string[] {
  return uniqueStrings([
    ...packet.visibleActors,
    ...packet.visibleObjects.map(object => object.objectId),
    ...packet.visibleRecords.map(record => record.recordId),
  ]);
}

function visibleRecordIds(
  packet: ObservePacket,
  contract: AgentStepRecordContract | undefined,
): string[] {
  return uniqueStrings(packet.visibleRecords
    .filter(record => contract !== "m3r" || Number.isInteger(record.recordRevision))
    .map(record => record.recordId));
}

function allowedRecordKinds(packet: ObservePacket): string[] {
  const knownKinds = new Set<string>(RECORD_KINDS);
  return uniqueStrings(packet.administrativeAuthority.allowedRecordKinds.filter(kind =>
    knownKinds.has(kind)
  ));
}

function ownedVisibleRecordIds(packet: ObservePacket): string[] {
  return uniqueStrings(packet.visibleRecords
    .filter(record => record.authorActorId === packet.actorId)
    .map(record => record.recordId));
}

export function agentStepProposalSchemaForRequest(
  locale: string,
  constraints: AgentStepRequestSchemaConstraints,
) {
  return agentStepProposalSchemaForLocale(locale).superRefine((value, context) => {
    const requiredToolCall = constraints.requiredToolCall;
    if (requiredToolCall) {
      if (!value.toolCall) {
        context.addIssue({
          code: "custom",
          path: ["toolCall"],
          message: `required ${requiredToolCall.tool} toolCall must not be null`,
        });
      } else if (value.toolCall.tool !== requiredToolCall.tool) {
        context.addIssue({
          code: "custom",
          path: ["toolCall", "tool"],
          message: `required toolCall must use ${requiredToolCall.tool}`,
        });
      } else if (requiredToolCall.tool === "talk_to") {
        if (value.toolCall.args.actorId !== requiredToolCall.actorId) {
          context.addIssue({
            code: "custom",
            path: ["toolCall", "args", "actorId"],
            message: `required talk_to actorId must equal ${requiredToolCall.actorId}`,
          });
        }
      } else if (value.toolCall.args.targetId !== requiredToolCall.targetId) {
        context.addIssue({
          code: "custom",
          path: ["toolCall", "args", "targetId"],
          message: `required move_to targetId must equal ${requiredToolCall.targetId}`,
        });
      }
      if (!value.done) {
        context.addIssue({
          code: "custom",
          path: ["done"],
          message: `required ${requiredToolCall.tool} reply must finish with done=true`,
        });
      }
    }

    const toolIsOffered = !value.toolCall || constraints.effectiveTools.includes(value.toolCall.tool);
    if (!requiredToolCall && value.toolCall && !toolIsOffered) {
      context.addIssue({
        code: "custom",
        path: ["toolCall", "tool"],
        message: `tool ${value.toolCall.tool} is not offered in this request`,
      });
    }

    const call = value.toolCall;
    if (call && toolIsOffered) {
      const addMembershipIssue = (argumentName: string, message: string): void => {
        context.addIssue({
          code: "custom",
          path: ["toolCall", "args", argumentName],
          message,
        });
      };
      const addShapeIssue = (message: string): void => {
        context.addIssue({
          code: "custom",
          path: ["toolCall", "args"],
          message,
        });
      };

      switch (call.tool) {
        case "move_to": {
          const parsed = requestScopedArgsSchemas.move_to.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue("move_to args must match the request contract");
          } else if (!moveTargetIds(constraints.observePacket).includes(parsed.data.targetId)) {
            addMembershipIssue(
              "targetId",
              `move_to target ${parsed.data.targetId} is not reachable in this observation`,
            );
          }
          break;
        }
        case "look": {
          const parsed = requestScopedArgsSchemas.look.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue("look args must match the request contract");
          } else if (!lookTargetIds(constraints.observePacket).includes(parsed.data.targetId)) {
            addMembershipIssue(
              "targetId",
              `look target ${parsed.data.targetId} is not visible in this observation`,
            );
          }
          break;
        }
        case "talk_to": {
          const parsed = requestScopedArgsSchemas.talk_to.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue("talk_to args must match the request contract");
          } else if (!visibleAndAudibleActorIds(constraints.observePacket).includes(
            parsed.data.actorId,
          )) {
            addMembershipIssue(
              "actorId",
              `talk_to target ${parsed.data.actorId} is not both visible and audible`,
            );
          } else if (!scopedTalkActorIds(constraints).includes(parsed.data.actorId)) {
            addMembershipIssue(
              "actorId",
              `talk_to target ${parsed.data.actorId} is outside this request's allowed talk scope`,
            );
          }
          break;
        }
        case "wait": {
          if (!requestScopedArgsSchemas.wait.safeParse(call.args).success) {
            addShapeIssue("wait args must match the request contract");
          }
          break;
        }
        case "use_object": {
          const parsed = requestScopedArgsSchemas.use_object.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue("use_object args must match the request contract");
          } else if (
            !constraints.observePacket.visibleObjects.some(object =>
              object.objectId === parsed.data.objectId
            )
          ) {
            addMembershipIssue(
              "objectId",
              `use_object target ${parsed.data.objectId} is not visible`,
            );
          }
          break;
        }
        case "request": {
          const parsed = requestScopedArgsSchemas.request.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue("request args must match the request contract");
          } else if (!constraints.observePacket.visibleActors.includes(parsed.data.targetActorId)) {
            addMembershipIssue(
              "targetActorId",
              `request target ${parsed.data.targetActorId} is not visible`,
            );
          }
          break;
        }
        case "read_record": {
          const contract = constraints.recordContracts.read_record;
          const argsSchema = contract === "m3r"
            ? m3rReadRecordArgsSchema
            : legacyReadRecordArgsSchema;
          if (!contract) {
            addShapeIssue("read_record is missing its request record contract");
            break;
          }
          const parsed = argsSchema.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue(`read_record args must match the ${contract} contract`);
          } else if (
            !visibleRecordIds(constraints.observePacket, contract).includes(parsed.data.recordId)
          ) {
            addMembershipIssue(
              "recordId",
              `read_record target ${parsed.data.recordId} is not a visible record revision`,
            );
          }
          break;
        }
        case "write_record": {
          const contract = constraints.recordContracts.write_record;
          const argsSchema = contract === "m3r"
            ? m3rWriteRecordArgsSchema
            : legacyWriteRecordArgsSchema;
          if (!contract) {
            addShapeIssue("write_record is missing its request record contract");
            break;
          }
          const parsed = argsSchema.safeParse(call.args);
          if (!parsed.success) {
            addShapeIssue(`write_record args must match the ${contract} contract`);
            break;
          }
          if (contract === "legacy") {
            const args = parsed.data as z.infer<typeof legacyWriteRecordArgsSchema>;
            if (
              args.objectId !== null &&
              !constraints.observePacket.visibleObjects.some(object =>
                object.objectId === args.objectId
              )
            ) {
              addMembershipIssue("objectId", `write_record object ${args.objectId} is not visible`);
            }
            if (
              args.citedLedgerEventId !== null &&
              !constraints.observePacket.visibleLedgerEvents.some(event =>
                event.eventId === args.citedLedgerEventId
              )
            ) {
              addMembershipIssue(
                "citedLedgerEventId",
                `write_record citation ${args.citedLedgerEventId} is not visible`,
              );
            }
            break;
          }

          const args = parsed.data as z.infer<typeof m3rWriteRecordArgsSchema>;
          if (!allowedRecordKinds(constraints.observePacket).includes(args.recordKind)) {
            addMembershipIssue(
              "recordKind",
              `write_record kind ${args.recordKind} is not authorized`,
            );
          }
          if (!constraints.observePacket.administrativeSources.some(source =>
            source.memoryId === args.sourceMemoryId
          )) {
            addMembershipIssue(
              "sourceMemoryId",
              `write_record source ${args.sourceMemoryId} is not available`,
            );
          }
          if (!constraints.observePacket.administrativeAuthority.writableTextSurfaceIds.includes(
            args.textSurfaceId,
          )) {
            addMembershipIssue(
              "textSurfaceId",
              `write_record surface ${args.textSurfaceId} is not writable`,
            );
          }
          if (args.recordId !== undefined) {
            const existing = constraints.observePacket.visibleRecords.find(record =>
              record.recordId === args.recordId &&
              record.authorActorId === constraints.observePacket.actorId
            );
            if (!existing) {
              addMembershipIssue(
                "recordId",
                `write_record update ${args.recordId} is not an owned visible record`,
              );
            } else {
              if (existing.kind !== args.recordKind) {
                addMembershipIssue(
                  "recordKind",
                  `write_record update kind must remain ${existing.kind}`,
                );
              }
              if (existing.textSurfaceId !== args.textSurfaceId) {
                addMembershipIssue(
                  "textSurfaceId",
                  `write_record update surface must remain ${existing.textSurfaceId}`,
                );
              }
            }
          }
          break;
        }
      }
    }

    const requiresUtterance =
      requiredToolCall?.tool === "talk_to" || constraints.requireUtterance === true;
    if (requiresUtterance && !value.utterance) {
      context.addIssue({
        code: "custom",
        path: ["utterance"],
        message: "required utterance must be nonempty",
      });
    }
  });
}

export const conversationProposalJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["utterance", "suggestedReplies", "continueConversation"],
  properties: {
    utterance: playerVisibleJsonString,
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent"],
        properties: {
          text: suggestedReplyJsonString,
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
    whyLine: playerVisibleJsonString,
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
    whyLine: playerVisibleJsonString,
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
            text: playerVisibleJsonString,
            whyLine: playerVisibleJsonString,
          },
        },
      ],
    },
    utterance: playerVisibleJsonString,
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent"],
        properties: {
          text: suggestedReplyJsonString,
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
    utterance: playerVisibleJsonString,
    rationale: { type: "string", minLength: 1 },
    done: { type: "boolean", const: true },
    suspicionDelta: { type: "integer" },
    proposedStance: { type: "string", enum: [...COARSE_STANCES] },
    whyLine: playerVisibleJsonString,
    openQuestion: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["status", "text", "whyLine"],
          properties: {
            status: { type: "string", enum: ["open", "resolved"] },
            text: playerVisibleJsonString,
            whyLine: playerVisibleJsonString,
          },
        },
      ],
    },
  },
};

export function ambientReplyJudgmentJsonSchemaForTarget(
  targetActorId: string,
): Record<string, unknown> {
  const schema = structuredClone(ambientReplyJudgmentJsonSchema);
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const toolCallProperties = properties.toolCall.properties as Record<
    string,
    Record<string, unknown>
  >;
  const argsProperties = toolCallProperties.args.properties as Record<
    string,
    Record<string, unknown>
  >;
  argsProperties.actorId.const = targetActorId;
  return schema;
}

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
        required: [
          "actorId",
          "contactBasis",
          "proposedStance",
          "testimonyLine",
          "citedMemoryIds",
        ],
        properties: {
          actorId: { type: "string", minLength: 1 },
          contactBasis: { type: "string", enum: [...HEARING_CONTACT_BASES] },
          proposedStance: { type: "string", enum: [...COARSE_STANCES] },
          testimonyLine: playerVisibleJsonString,
          citedMemoryIds: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    proposedVerdict: { type: "string", enum: ["ordinary", "abnormal"] },
    verdictWhyLine: playerVisibleJsonString,
    officerLine: playerVisibleJsonString,
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

/** Keep the generic export stable while narrowing impossible verdicts per run. */
export function hearingJudgmentJsonSchemaForRequest(
  request: HearingJudgmentRequest,
): Record<string, unknown> {
  const schema = structuredClone(hearingJudgmentJsonSchema);
  const possibleEvidenceBackedVouches = request.residents.filter(
    resident =>
      hearingContactBasisForMemories(resident.memories) === "meaningful_firsthand",
  ).length;
  if (possibleEvidenceBackedVouches < 4) {
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    properties.proposedVerdict.enum = ["abnormal"];
  }
  return schema;
}

const administrativeOpenQuestionJsonSchema: Record<string, unknown> = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "text", "whyLine"],
      properties: {
        status: { type: "string", enum: ["open", "resolved"] },
        text: playerVisibleJsonString,
        whyLine: playerVisibleJsonString,
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
              whyLine: playerVisibleJsonString,
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
                  stateBody: playerVisibleJsonString,
                  visibleTo: {
                    type: "array",
                    items: { type: "string", enum: [...WORLD_ROLES] },
                  },
                },
              },
              citedLedgerEventId: { type: ["string", "null"] },
              whyLine: playerVisibleJsonString,
            },
            ["objectId", "toState", "ledgerKind", "record", "citedLedgerEventId", "whyLine"],
          ],
          [
            "write_record",
            {
              recordKind: { type: "string", enum: [...RECORD_KINDS] },
              sourceMemoryId: { type: "string" },
              stateBody: playerVisibleJsonString,
              whyLine: playerVisibleJsonString,
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
              stateBody: playerVisibleJsonString,
              whyLine: playerVisibleJsonString,
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
              whyLine: playerVisibleJsonString,
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
              whyLine: playerVisibleJsonString,
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
    utterance: nullablePlayerVisibleJsonString,
    rationale: { type: "string", minLength: 1 },
    done: { type: "boolean" },
  },
};

export function agentStepProposalJsonSchemaForTools(
  constraints: AgentStepRequestSchemaConstraints,
): Record<string, unknown> {
  const schema = structuredClone(agentStepProposalJsonSchema);
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const toolCallSchema = properties.toolCall;
  const branches = toolCallSchema?.anyOf;
  if (!Array.isArray(branches)) {
    throw new Error("agent-step JSON schema is missing toolCall variants");
  }

  const toolNameForBranch = (branch: unknown): ToolName | null => {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
    const branchProperties = (branch as Record<string, unknown>).properties;
    if (!branchProperties || typeof branchProperties !== "object" || Array.isArray(branchProperties)) {
      return null;
    }
    const toolSchema = (branchProperties as Record<string, unknown>).tool;
    if (!toolSchema || typeof toolSchema !== "object" || Array.isArray(toolSchema)) return null;
    const tool = (toolSchema as Record<string, unknown>).const;
    return TOOL_NAMES.find(name => name === tool) ?? null;
  };

  const recordContractForBranch = (
    branch: unknown,
    tool: "write_record" | "read_record",
  ): AgentStepRecordContract | null => {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
    const branchProperties = (branch as Record<string, unknown>).properties;
    if (!branchProperties || typeof branchProperties !== "object" || Array.isArray(branchProperties)) {
      return null;
    }
    const argsSchema = (branchProperties as Record<string, unknown>).args;
    if (!argsSchema || typeof argsSchema !== "object" || Array.isArray(argsSchema)) return null;
    const argsProperties = (argsSchema as Record<string, unknown>).properties;
    if (!argsProperties || typeof argsProperties !== "object" || Array.isArray(argsProperties)) {
      return null;
    }
    const argumentNames = argsProperties as Record<string, unknown>;
    if (tool === "write_record") {
      if (Object.hasOwn(argumentNames, "record")) return "legacy";
      if (Object.hasOwn(argumentNames, "sourceMemoryId")) return "m3r";
      return null;
    }
    return Object.hasOwn(argumentNames, "institutionalPressureDelta") ? "m3r" : "legacy";
  };

  const allowedTools = new Set<ToolName>(
    constraints.requiredToolCall
      ? [constraints.requiredToolCall.tool]
      : constraints.effectiveTools,
  );
  for (const recordTool of ["write_record", "read_record"] as const) {
    if (allowedTools.has(recordTool) && !constraints.recordContracts[recordTool]) {
      throw new Error(`agent-step JSON schema requires a ${recordTool} contract`);
    }
  }

  const argsPropertiesForBranch = (
    branch: unknown,
  ): Record<string, Record<string, unknown>> | null => {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
    const branchProperties = (branch as Record<string, unknown>).properties;
    if (!branchProperties || typeof branchProperties !== "object" || Array.isArray(branchProperties)) {
      return null;
    }
    const argsSchema = (branchProperties as Record<string, unknown>).args;
    if (!argsSchema || typeof argsSchema !== "object" || Array.isArray(argsSchema)) return null;
    const argsProperties = (argsSchema as Record<string, unknown>).properties;
    return argsProperties && typeof argsProperties === "object" && !Array.isArray(argsProperties)
      ? argsProperties as Record<string, Record<string, unknown>>
      : null;
  };

  const constrainStringField = (
    argsProperties: Record<string, Record<string, unknown>>,
    field: string,
    values: readonly string[],
  ): boolean => {
    const fieldSchema = argsProperties[field];
    if (!fieldSchema) throw new Error(`agent-step JSON schema is missing ${field}`);
    const allowed = uniqueStrings(values);
    if (allowed.length === 0) return false;
    fieldSchema.enum = allowed;
    return true;
  };

  const constrainBranch = (branch: unknown, toolName: ToolName): boolean => {
    const argsProperties = argsPropertiesForBranch(branch);
    if (!argsProperties) return false;
    switch (toolName) {
      case "move_to":
        return constrainStringField(
          argsProperties,
          "targetId",
          moveTargetIds(constraints.observePacket),
        );
      case "look":
        return constrainStringField(
          argsProperties,
          "targetId",
          lookTargetIds(constraints.observePacket),
        );
      case "talk_to": {
        const actorIds = scopedTalkActorIds(constraints);
        if (
          constraints.requiredToolCall?.tool === "talk_to" &&
          !actorIds.includes(constraints.requiredToolCall.actorId)
        ) {
          // A required meeting reply should already be grounded by the runtime.
          // Keep an exact transport branch so local Zod can reject inconsistent
          // packets and deterministically invoke fallback instead of throwing.
          actorIds.push(constraints.requiredToolCall.actorId);
        }
        return constrainStringField(argsProperties, "actorId", actorIds);
      }
      case "use_object":
        return constrainStringField(
          argsProperties,
          "objectId",
          constraints.observePacket.visibleObjects.map(object => object.objectId),
        );
      case "request":
        return constrainStringField(
          argsProperties,
          "targetActorId",
          constraints.observePacket.visibleActors,
        );
      case "read_record":
        return constrainStringField(
          argsProperties,
          "recordId",
          visibleRecordIds(
            constraints.observePacket,
            constraints.recordContracts.read_record,
          ),
        );
      case "write_record": {
        const contract = constraints.recordContracts.write_record;
        if (contract === "legacy") {
          const objectIdSchema = argsProperties.objectId;
          const citedEventSchema = argsProperties.citedLedgerEventId;
          if (!objectIdSchema || !citedEventSchema) return false;
          objectIdSchema.enum = [
            null,
            ...uniqueStrings(
              constraints.observePacket.visibleObjects.map(object => object.objectId),
            ),
          ];
          citedEventSchema.enum = [
            null,
            ...uniqueStrings(
              constraints.observePacket.visibleLedgerEvents.map(event => event.eventId),
            ),
          ];
          return true;
        }
        if (contract !== "m3r") return false;
        const hasBaseAuthority =
          constrainStringField(
            argsProperties,
            "recordKind",
            allowedRecordKinds(constraints.observePacket),
          ) &&
          constrainStringField(
            argsProperties,
            "sourceMemoryId",
            constraints.observePacket.administrativeSources.map(source => source.memoryId),
          ) &&
          constrainStringField(
            argsProperties,
            "textSurfaceId",
            constraints.observePacket.administrativeAuthority.writableTextSurfaceIds,
          );
        if (!hasBaseAuthority) return false;
        return !Object.hasOwn(argsProperties, "recordId") || constrainStringField(
          argsProperties,
          "recordId",
          ownedVisibleRecordIds(constraints.observePacket),
        );
      }
      case "wait":
        return true;
    }
  };

  const narrowedBranches = branches.filter(branch => {
    if (
      branch &&
      typeof branch === "object" &&
      !Array.isArray(branch) &&
      (branch as Record<string, unknown>).type === "null"
    ) {
      return constraints.requiredToolCall === undefined;
    }
    const toolName = toolNameForBranch(branch);
    if (toolName === null || !allowedTools.has(toolName)) return false;
    if (toolName === "write_record" || toolName === "read_record") {
      if (
        recordContractForBranch(branch, toolName) !== constraints.recordContracts[toolName]
      ) return false;
    }
    return constrainBranch(branch, toolName);
  });

  if (constraints.requiredToolCall) {
    const requiredBranch = narrowedBranches.find(
      branch => toolNameForBranch(branch) === constraints.requiredToolCall?.tool,
    ) as Record<string, unknown> | undefined;
    const branchProperties = requiredBranch?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    const argsSchema = branchProperties?.args;
    const argsProperties = argsSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (constraints.requiredToolCall.tool === "talk_to") {
      const actorIdSchema = argsProperties?.actorId;
      if (!actorIdSchema) {
        throw new Error("required talk_to JSON schema is missing actorId");
      }
      actorIdSchema.const = constraints.requiredToolCall.actorId;
    } else {
      const targetIdSchema = argsProperties?.targetId;
      if (!targetIdSchema) {
        throw new Error("required move_to JSON schema is missing targetId");
      }
      targetIdSchema.const = constraints.requiredToolCall.targetId;
    }
    if (
      constraints.requiredToolCall.tool === "talk_to" ||
      constraints.requireUtterance === true
    ) {
      properties.utterance = playerVisibleJsonString;
    }
    properties.done = { type: "boolean", const: true };
  }

  toolCallSchema.anyOf = narrowedBranches;
  return schema;
}
