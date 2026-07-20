import { z } from "zod";
import {
  COARSE_STANCES,
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
  HEARING_CONTACT_BASES,
} from "../contracts/types.js";
import type { ConversationChoiceIntent } from "../contracts/types.js";
import type { ObservePacket } from "../agentloop/context.js";
import { TOOL_NAMES, type ToolName } from "../agentloop/tools.js";
import { RECORD_KINDS, WORLD_ROLES } from "../runtime/world/index.js";
import {
  hearingContactBasisForMemories,
  validateHearingJudgment,
  type HearingJudgmentRequest,
} from "../runtime/run-hearing.js";
import {
  providerLanguageName,
  supportedLocaleEntry,
} from "../localization/supported-locales.js";
import type { RequiredAgentToolCall } from "./ports.js";

const nonEmpty = z.string().trim().min(1);
export const TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS = 64;
const transientWorldUtterance = nonEmpty.refine(
  value => [...value].length <= TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  {
    message:
      `transient world utterance must not exceed ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points`,
  },
);
const optionalTransientWorldUtterance = z.string().refine(
  value => [...value.trim()].length <= TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  {
    message:
      `transient world utterance must not exceed ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points`,
  },
);
const requiredPlayerVisibleHangul = /\p{Script=Hangul}/u;
const forbiddenKoreanPlayerVisibleKana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const forbiddenKoreanPlayerVisibleChineseFragments =
  /(?:为何|为什么|因为|所以|没有|不是|已经|可以|需要|如果|但是|这个|那个|他们|我们|你们)/u;
const koreanPlayerVisibleLatinWords = /\p{Script=Latin}+/gu;
const requiredPlayerVisibleScriptByPresentationId: Record<string, RegExp> = {
  en: /\p{Script=Latin}/u,
  it: /\p{Script=Latin}/u,
  zh: /\p{Script=Han}/u,
  fr: /\p{Script=Latin}/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
};
const MAX_REPORTED_INVALID_LATIN_TOKENS = 16;
const MAX_REPORTED_INVALID_LATIN_TOKEN_LENGTH = 80;
const forbiddenPlayerVisibleStableIds = [
  /\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/u,
  /\b(?:mem|sess|rec|led)-[A-Za-z0-9_.:-]+\b/u,
  /\b(?:record|ledger|wake|mov|contact|run|session|conversation|turn|beat|question|speech|event|goal|hearing)-(?=[A-Za-z0-9_.:-]*\d)[A-Za-z0-9_.:-]+\b/u,
  /\b(?:provider-smoke|mem|sess|rec|led|record|ledger|wake|mov|contact|run|session|conversation|turn|beat|question|speech|event|goal|hearing|ambient|spatial):[A-Za-z0-9_.:#-]+\b/u,
  /\b(?:Park|Studio|Office|Station)\.[A-Za-z0-9_.-]+\b/u,
] as const;
const forbiddenPlayerVisibleGlobalMeta =
  /\b(?:NPC|ChatGPT|Claude|OpenAI|Qwen|ModelScope)\b/iu;
const forbiddenPlayerVisibleUppercaseAi = /\bAI\b/u;
const forbiddenPlayerVisibleMetaByPresentationId: Record<string, RegExp> = {
  ko: /(?:플레이어|사용자|인공지능|언어\s*모델|프롬프트|시스템\s*메시지|비디오\s*게임)/u,
  en: /\b(?:player|user|artificial intelligence|language model|prompt|system message|video game)\b/iu,
  it: /\b(?:giocatore|giocatrice|utente|intelligenza artificiale|modello linguistico|prompt|messaggio di sistema|videogioco)\b/iu,
  zh: /(?:玩家|用户|人工智能|语言模型|提示词|系统提示|电子游戏)/u,
  fr: /\b(?:joueur|joueuse|utilisateur|utilisatrice|intelligence artificielle|modèle de langage|prompt|message système|jeu vidéo)\b/iu,
  ja: /(?:プレイヤー|ユーザー|人工知能|言語モデル|プロンプト|システムメッセージ|ビデオゲーム)/u,
};
const frenchInfinitiveUserContexts =
  /\b(?:à|de|pour|sans|peut|peuvent|pourrait|pourraient|doit|doivent|va|vont)\s+user\b/giu;
const intentSchema = z.enum(CONVERSATION_CHOICE_INTENTS);
const suggestedReplyEvidenceIdsSchema = z.array(nonEmpty).superRefine((ids, context) => {
  if (new Set(ids).size === ids.length) return;
  context.addIssue({
    code: "custom",
    message: "suggested reply evidence ids must be unique",
  });
});
const suggestedReplySchema = z
  .object({
    text: nonEmpty,
    intent: intentSchema,
    evidenceIds: suggestedReplyEvidenceIdsSchema,
    introducesNewClaim: z.boolean(),
  })
  .strict();
const mergedSuggestedReplySchema = z.preprocess(
  value => normalizeMergedSuggestedReplyIntents(value),
  z.tuple([
    suggestedReplySchema,
    suggestedReplySchema,
    suggestedReplySchema,
  ]),
);
const playerVisibleJsonString = {
  type: "string",
  minLength: 1,
  pattern: "\\S",
  description:
    "Player-visible natural-language prose only. Obey the request groundingContract when present; never invent a player or world fact. Stay entirely in fiction: never call anyone a player, user, or NPC, and never mention games, AI, language models, prompts, or system messages. Never include an internal stable id, identifier token, or underscore name.",
} as const;
const suggestedReplyJsonString = {
  ...playerVisibleJsonString,
  description:
    "Player-visible natural-language prose only. Stay entirely in fiction: never call anyone a player, user, or NPC, and never mention games, AI, language models, prompts, or system messages. Never include an internal stable id, identifier token, or underscore name. This is an uncommitted candidate utterance, not an established fact or a line the speaker has already chosen; it becomes evidence only if selected. The reply must be a complete, self-contained, in-character first-person utterance that can be spoken verbatim. Never narrate, summarize, or label the speaker. Explicitly preserve the person, object, source, or claim being answered whenever omission could make a noun phrase sound like the speaker's own identity or possession; never return a bare name, role, object, yes/no fragment, or context-dependent copular noun phrase.",
} as const;
const suggestedReplySetJsonDescription =
  "Return exactly one candidate for each intent in this fixed array order: safe/local first, uncertain/repair second, risky/weird third. Make their relative social risk clear from the wording. uncertain/repair must be non-assertive. safe/local must be non-assertive or cite request evidenceIds that support every factual claim. Only risky/weird may establish unsupported backstory, and it must disclose that choice with introducesNewClaim=true. All three remain uncommitted until selected, and intent never determines the NPC judgment.";
const nullablePlayerVisibleJsonString = {
  type: ["string", "null"],
  description:
    "Player-visible natural-language prose only when non-null. Obey the request groundingContract when present; never invent a player or world fact. Stay entirely in fiction: never call anyone a player, user, or NPC, and never mention games, AI, language models, prompts, or system messages. Never include an internal stable id, identifier token, or underscore name.",
} as const;
const transientWorldUtteranceJsonString = {
  ...playerVisibleJsonString,
  maxLength: TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  description:
    `${playerVisibleJsonString.description} This line appears as a transient in-world subtitle, so keep it to one concise sentence of at most ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points.`,
} as const;
const nullableTransientWorldUtteranceJsonString = {
  ...nullablePlayerVisibleJsonString,
  maxLength: TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  description:
    `${nullablePlayerVisibleJsonString.description} When non-null, this line appears as a transient in-world subtitle, so keep it to one concise sentence of at most ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points.`,
} as const;

function addSuggestedReplyIntentIssues(
  context: z.RefinementCtx,
  replies: readonly {
    intent: ConversationChoiceIntent;
    evidenceIds: readonly string[];
    introducesNewClaim: boolean;
  }[],
): void {
  const counts = new Map<ConversationChoiceIntent, number>();
  for (const reply of replies) {
    counts.set(reply.intent, (counts.get(reply.intent) ?? 0) + 1);
  }
  if (CONVERSATION_CHOICE_INTENTS.every(intent => counts.get(intent) === 1)) return;
  context.addIssue({
    code: "custom",
    path: ["suggestedReplies"],
    message:
      "suggested replies must contain exactly one safe/local, one uncertain/repair, and one risky/weird intent",
  });
}

function addSuggestedReplyClaimIssues(
  context: z.RefinementCtx,
  replies: readonly {
    intent: ConversationChoiceIntent;
    introducesNewClaim: boolean;
  }[],
): void {
  replies.forEach((reply, index) => {
    if (reply.intent !== "risky/weird" && reply.introducesNewClaim) {
      context.addIssue({
        code: "custom",
        path: ["suggestedReplies", index, "introducesNewClaim"],
        message: `${reply.intent} must not introduce a new claim`,
      });
    }
  });
}

function addSuggestedReplyEvidenceScopeIssues(
  context: z.RefinementCtx,
  replies: readonly { evidenceIds: readonly string[] }[],
  evidenceIds: readonly string[],
): void {
  const available = new Set(evidenceIds);
  replies.forEach((reply, replyIndex) => {
    reply.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      if (available.has(evidenceId)) return;
      context.addIssue({
        code: "custom",
        path: ["suggestedReplies", replyIndex, "evidenceIds", evidenceIndex],
        message: `suggested reply evidence ${evidenceId} is not in this request`,
      });
    });
  });
}

function normalizeMergedSuggestedReplyIntents(value: unknown): unknown {
  if (!Array.isArray(value) || value.length !== CONVERSATION_CHOICE_INTENTS.length) {
    return value;
  }
  if (!value.every(reply =>
    typeof reply === "object" &&
    reply !== null &&
    intentSchema.safeParse((reply as { intent?: unknown }).intent).success
  )) {
    return value;
  }
  const intents = value.map(reply =>
    (reply as { intent: ConversationChoiceIntent }).intent
  );
  if (CONVERSATION_CHOICE_INTENTS.every(intent =>
    intents.filter(candidate => candidate === intent).length === 1
  )) {
    return value;
  }
  return value.map((reply, index) => ({
    ...(reply as Record<string, unknown>),
    intent: CONVERSATION_CHOICE_INTENTS[index],
  }));
}

const KOREAN_PLAYER_VISIBLE_JSON_SCHEMA_SUFFIX =
  " This request uses Korean player-visible text. Write Hangul-dominant natural Korean. Do not copy lowercase Latin words from machine-readable context: translate public place and role labels into Korean, and transliterate non-acronym names when necessary.";

function isKoreanLocale(locale: string): boolean {
  return supportedLocaleEntry(locale).presentationId === "ko";
}

function exposesLocalizedMetaFraming(text: string, presentationId: string): boolean {
  return Object.entries(forbiddenPlayerVisibleMetaByPresentationId).some(
    ([sourcePresentationId, pattern]) => {
      if (presentationId !== "fr" || sourcePresentationId !== "en") {
        return pattern.test(text);
      }
      const withoutFrenchUserVerbs = text.replace(
        frenchInfinitiveUserContexts,
        match => match.replace(/user/iu, ""),
      );
      return pattern.test(withoutFrenchUserVerbs);
    },
  );
}

function addPlayerVisibleTextIssues(
  context: z.RefinementCtx,
  path: Array<string | number>,
  text: string | undefined,
  locale: string,
): void {
  if (!text) return;
  const presentationId = supportedLocaleEntry(locale).presentationId;
  const requireHangul = presentationId === "ko";
  if (forbiddenPlayerVisibleStableIds.some(pattern => pattern.test(text))) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible text must not expose an internal stable id",
    });
  }
  const exposesMetaFraming =
    forbiddenPlayerVisibleGlobalMeta.test(text) ||
    forbiddenPlayerVisibleUppercaseAi.test(text) ||
    exposesLocalizedMetaFraming(text, presentationId);
  if (exposesMetaFraming) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible text must remain in fiction and must not expose game or model framing",
    });
  }
  if (requireHangul && !requiredPlayerVisibleHangul.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible Korean text must contain at least one Hangul code point",
    });
  }
  const requiredScript = requiredPlayerVisibleScriptByPresentationId[presentationId];
  if (!requireHangul && requiredScript && !requiredScript.test(text)) {
    context.addIssue({
      code: "custom",
      path,
      message: "player-visible text must use the requested locale's natural writing system",
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
  const invalidLatinTokens = requireHangul
    ? [...new Set(
      [...text.matchAll(koreanPlayerVisibleLatinWords)]
        .map(match => match[0])
        .filter(token =>
          token.length > 1 &&
          !/^[A-Z][a-z]+$/u.test(token) &&
          !/^[A-Z0-9]{2,6}$/u.test(token)
        )
        .map(token => [...token].slice(0, MAX_REPORTED_INVALID_LATIN_TOKEN_LENGTH).join("")),
    )].slice(0, MAX_REPORTED_INVALID_LATIN_TOKENS)
    : [];
  if (invalidLatinTokens.length > 0) {
    context.addIssue({
      code: "custom",
      path,
      message:
        "player-visible Korean text may use Latin script only for title-case names or short uppercase acronyms",
      params: { offendingLatinTokens: invalidLatinTokens },
    });
  }
}

function addUniqueIdListIssues(
  ids: readonly string[],
  context: z.RefinementCtx,
): void {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: "citation ids must be unique",
    });
  }
}

const uniqueIdListSchema = z.array(nonEmpty).superRefine(addUniqueIdListIssues);

export const MAX_SPEECH_RECORD_CITATIONS = 8;
const speechRecordCitationIdsSchema = z
  .array(nonEmpty)
  .max(MAX_SPEECH_RECORD_CITATIONS)
  .superRefine(addUniqueIdListIssues);

export const conversationProposalSchema = z
  .object({
    utterance: nonEmpty,
    citedRecordIds: speechRecordCitationIdsSchema.default([]),
    suggestedReplies: z.tuple([
      suggestedReplySchema,
      suggestedReplySchema,
      suggestedReplySchema,
    ]),
    continueConversation: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    addSuggestedReplyIntentIssues(context, value.suggestedReplies);
    addSuggestedReplyClaimIssues(context, value.suggestedReplies);
  });

// Deltas are validated as integers only; the runtime clamps them to the
// per-turn validity caps so an over-eager model cannot escape runtime validity.
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
      .nullable(),
    utterance: nonEmpty,
    citedRecordIds: speechRecordCitationIdsSchema.default([]),
    suggestedReplies: mergedSuggestedReplySchema,
    continueConversation: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    addSuggestedReplyIntentIssues(context, value.suggestedReplies);
    addSuggestedReplyClaimIssues(context, value.suggestedReplies);
  });

export const ambientReplyJudgmentSchema = z
  .object({
    toolCall: z
      .object({
        tool: z.literal("talk_to"),
        args: z.object({ actorId: nonEmpty }).strict(),
      })
      .strict(),
    utterance: transientWorldUtterance,
    citedRecordIds: speechRecordCitationIdsSchema.default([]),
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
    utterance: optionalTransientWorldUtterance.nullable(),
    citedRecordIds: speechRecordCitationIdsSchema.default([]),
    rationale: nonEmpty,
    done: z.boolean(),
  })
  .strict()
  .transform(value => ({
    toolCall: value.toolCall ?? undefined,
    utterance: value.utterance?.trim() || undefined,
    citedRecordIds: [...value.citedRecordIds],
    rationale: value.rationale,
    done: value.done,
  }))
  .refine(value => value.done || value.toolCall !== undefined, {
    path: ["toolCall"],
    message: "an active agent step requires toolCall",
  });

export function conversationProposalSchemaForLocale(locale: string) {
  return conversationProposalSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, locale);
    value.suggestedReplies.forEach((reply, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["suggestedReplies", index, "text"],
        reply.text,
        locale,
      );
    });
  });
}

function addVisibleConversationRecordCitationIssues(
  context: z.RefinementCtx,
  citedRecordIds: readonly string[],
  visibleIds: readonly string[],
): void {
  const visible = new Set(uniqueStrings(visibleIds));
  citedRecordIds.forEach((recordId, index) => {
    if (!visible.has(recordId)) {
      context.addIssue({
        code: "custom",
        path: ["citedRecordIds", index],
        message: `conversation citation ${recordId} is not visible to this resident`,
      });
    }
  });
}

export function conversationProposalSchemaForRequest(
  locale: string,
  visibleIds: readonly string[],
  evidenceIds: readonly string[],
) {
  return conversationProposalSchemaForLocale(locale).superRefine((value, context) => {
    addVisibleConversationRecordCitationIssues(context, value.citedRecordIds, visibleIds);
    addSuggestedReplyEvidenceScopeIssues(context, value.suggestedReplies, evidenceIds);
  });
}

export function conversationJudgmentSchemaForLocale(locale: string) {
  return conversationJudgmentSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, locale);
  });
}

export function mergedConversationTurnSchemaForLocale(locale: string) {
  return mergedConversationTurnSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, locale);
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, locale);
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "text"],
      value.openQuestion?.text,
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "whyLine"],
      value.openQuestion?.whyLine,
      locale,
    );
    value.suggestedReplies.forEach((reply, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["suggestedReplies", index, "text"],
        reply.text,
        locale,
      );
    });
  });
}

export function mergedConversationTurnSchemaForRequest(
  locale: string,
  visibleIds: readonly string[],
  evidenceIds: readonly string[],
) {
  return mergedConversationTurnSchemaForLocale(locale).superRefine((value, context) => {
    addVisibleConversationRecordCitationIssues(context, value.citedRecordIds, visibleIds);
    addSuggestedReplyEvidenceScopeIssues(context, value.suggestedReplies, evidenceIds);
  });
}

export function ambientReplyJudgmentSchemaForLocale(locale: string) {
  return ambientReplyJudgmentSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, locale);
    addPlayerVisibleTextIssues(context, ["whyLine"], value.whyLine, locale);
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "text"],
      value.openQuestion?.text,
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["openQuestion", "whyLine"],
      value.openQuestion?.whyLine,
      locale,
    );
  });
}

export function ambientReplyJudgmentSchemaForRequest(
  locale: string,
  targetActorId: string,
  visibleRecordIds: readonly string[] = [],
) {
  return ambientReplyJudgmentSchemaForLocale(locale).superRefine((value, context) => {
    if (value.toolCall.args.actorId !== targetActorId) {
      context.addIssue({
        code: "custom",
        path: ["toolCall", "args", "actorId"],
        message: `ambient reply actorId must equal ${targetActorId}`,
      });
    }
    const visible = new Set(visibleRecordIds);
    value.citedRecordIds.forEach((recordId, index) => {
      if (!visible.has(recordId)) {
        context.addIssue({
          code: "custom",
          path: ["citedRecordIds", index],
          message: `ambient reply citation ${recordId} is not visible to the speaker`,
        });
      }
    });
  });
}

export function hearingJudgmentSchemaForLocale(locale: string) {
  return hearingJudgmentSchema.superRefine((value, context) => {
    value.residentAssessments.forEach((assessment, index) => {
      addPlayerVisibleTextIssues(
        context,
        ["residentAssessments", index, "testimonyLine"],
        assessment.testimonyLine,
        locale,
      );
    });
    addPlayerVisibleTextIssues(
      context,
      ["verdictWhyLine"],
      value.verdictWhyLine,
      locale,
    );
    addPlayerVisibleTextIssues(context, ["officerLine"], value.officerLine, locale);
  });
}

/**
 * Provider-bound hearing validation against the exact run evidence packet.
 * RunService remains the final authority and repeats this validation at
 * commit time; doing it here gives the provider's one repair attempt a chance
 * to fix request-semantic mistakes instead of turning a successful transport
 * call into a fail-closed runtime path.
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
  return agentStepProposalSchema.superRefine((value, context) => {
    addPlayerVisibleTextIssues(context, ["utterance"], value.utterance, locale);
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
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "record", "stateBody"],
      stateBody,
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "stateBody"],
      directStateBody,
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "openQuestion", "text"],
      openQuestionText,
      locale,
    );
    addPlayerVisibleTextIssues(
      context,
      ["toolCall", "args", "openQuestion", "whyLine"],
      openQuestionWhyLine,
      locale,
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
  requireToolCall?: boolean;
  requireUtterance?: boolean;
  administrativeDecisionSpeech?: boolean;
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
    if (!requiredToolCall && constraints.requireToolCall && !value.toolCall) {
      context.addIssue({
        code: "custom",
        path: ["toolCall"],
        message: "this decision requires one explicit offered toolCall",
      });
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
    if (constraints.administrativeDecisionSpeech) {
      if (value.utterance) {
        context.addIssue({
          code: "custom",
          path: ["utterance"],
          message: "administrative decision speech must come from the selected tool field",
        });
      }
      const spokenField = value.toolCall?.tool === "wait"
        ? { path: ["toolCall", "args", "reason"] as (string | number)[], value: value.toolCall.args.reason }
        : value.toolCall?.tool === "write_record"
          ? { path: ["toolCall", "args", "whyLine"] as (string | number)[], value: value.toolCall.args.whyLine }
          : null;
      if (!spokenField || typeof spokenField.value !== "string") {
        context.addIssue({
          code: "custom",
          path: ["toolCall"],
          message: "administrative decision speech requires wait.reason or write_record.whyLine",
        });
      } else {
        const parsedSpeech = transientWorldUtterance.safeParse(spokenField.value);
        if (!parsedSpeech.success) {
          context.addIssue({
            code: "custom",
            path: spokenField.path,
            message: `administrative decision speech must be one nonempty sentence of at most ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points`,
          });
        } else {
          addPlayerVisibleTextIssues(
            context,
            spokenField.path,
            parsedSpeech.data,
            locale,
          );
        }
      }
    }
    if (
      !value.utterance &&
      !constraints.administrativeDecisionSpeech &&
      value.citedRecordIds.length > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["citedRecordIds"],
        message: "record citations require a spoken utterance",
      });
    }
    const visibleCitations = new Set(visibleRecordIds(constraints.observePacket, undefined));
    value.citedRecordIds.forEach((recordId, index) => {
      if (!visibleCitations.has(recordId)) {
        context.addIssue({
          code: "custom",
          path: ["citedRecordIds", index],
          message: `speech citation ${recordId} is not visible in this observation`,
        });
      }
    });
  });
}

export const conversationProposalJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["utterance", "citedRecordIds", "suggestedReplies", "continueConversation"],
  properties: {
    utterance: playerVisibleJsonString,
    citedRecordIds: {
      type: "array",
      maxItems: MAX_SPEECH_RECORD_CITATIONS,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      description: suggestedReplySetJsonDescription,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent", "evidenceIds", "introducesNewClaim"],
        properties: {
          text: suggestedReplyJsonString,
          intent: { type: "string", enum: [...CONVERSATION_CHOICE_INTENTS] },
          evidenceIds: {
            type: "array",
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
          introducesNewClaim: { type: "boolean" },
        },
      },
    },
    continueConversation: { type: "boolean" },
  },
};

export function conversationProposalJsonSchemaForLocale(
  locale: string,
): Record<string, unknown> {
  const schema = structuredClone(conversationProposalJsonSchema);
  annotatePlayerVisibleDescriptions(schema, locale);
  return schema;
}

function constrainConversationRecordCitations(
  schema: Record<string, unknown>,
  visibleIds: readonly string[],
): Record<string, unknown> {
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const citations = properties.citedRecordIds;
  const items = citations.items as Record<string, unknown>;
  const visible = uniqueStrings(visibleIds);
  if (visible.length === 0) citations.maxItems = 0;
  else items.enum = visible;
  return schema;
}

function constrainSuggestedReplyEvidenceIds(
  schema: Record<string, unknown>,
  evidenceIds: readonly string[],
): Record<string, unknown> {
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const suggestions = properties.suggestedReplies;
  const item = suggestions.items as Record<string, unknown>;
  const replyProperties = item.properties as Record<string, Record<string, unknown>>;
  const evidence = replyProperties.evidenceIds;
  const evidenceItems = evidence.items as Record<string, unknown>;
  const available = uniqueStrings(evidenceIds);
  if (available.length === 0) evidence.maxItems = 0;
  else evidenceItems.enum = available;
  return schema;
}

export function conversationProposalJsonSchemaForRequest(
  locale: string,
  visibleIds: readonly string[],
  evidenceIds: readonly string[],
): Record<string, unknown> {
  return constrainSuggestedReplyEvidenceIds(constrainConversationRecordCitations(
    conversationProposalJsonSchemaForLocale(locale),
    visibleIds,
  ), evidenceIds);
}

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

export function conversationJudgmentJsonSchemaForLocale(
  locale: string,
): Record<string, unknown> {
  const schema = structuredClone(conversationJudgmentJsonSchema);
  annotatePlayerVisibleDescriptions(schema, locale);
  return schema;
}

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
    "citedRecordIds",
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
      description:
        "Either null, or one complete in-world question. If an object is returned, status, text, and whyLine are all required; text and whyLine must each be a nonempty natural-language string. Use null for the whole field rather than null or empty required children.",
      anyOf: [
        {
          type: "null",
          description: "Use null when this exchange creates or resolves no concrete question.",
        },
        {
          type: "object",
          additionalProperties: false,
          description:
            "A complete question object. Never use null, an empty string, or whitespace for text or whyLine.",
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
    citedRecordIds: {
      type: "array",
      maxItems: MAX_SPEECH_RECORD_CITATIONS,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    suggestedReplies: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      description: suggestedReplySetJsonDescription,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "intent", "evidenceIds", "introducesNewClaim"],
        properties: {
          text: suggestedReplyJsonString,
          intent: { type: "string", enum: [...CONVERSATION_CHOICE_INTENTS] },
          evidenceIds: {
            type: "array",
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
          introducesNewClaim: { type: "boolean" },
        },
      },
    },
    continueConversation: { type: "boolean" },
  },
};

export function mergedConversationTurnJsonSchemaForLocale(
  locale: string,
): Record<string, unknown> {
  const schema = structuredClone(mergedConversationTurnJsonSchema);
  annotatePlayerVisibleDescriptions(schema, locale);
  return schema;
}

export function mergedConversationTurnJsonSchemaForRequest(
  locale: string,
  visibleIds: readonly string[],
  evidenceIds: readonly string[],
): Record<string, unknown> {
  return constrainSuggestedReplyEvidenceIds(constrainConversationRecordCitations(
    mergedConversationTurnJsonSchemaForLocale(locale),
    visibleIds,
  ), evidenceIds);
}

export const ambientReplyJudgmentJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "toolCall",
    "utterance",
    "citedRecordIds",
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
    utterance: transientWorldUtteranceJsonString,
    citedRecordIds: {
      type: "array",
      maxItems: MAX_SPEECH_RECORD_CITATIONS,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
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
  locale?: string,
  visibleRecordIds: readonly string[] = [],
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
  const citedRecordIds = properties.citedRecordIds;
  const citedItems = citedRecordIds.items as Record<string, unknown>;
  const visible = uniqueStrings(visibleRecordIds);
  if (visible.length === 0) citedRecordIds.maxItems = 0;
  else citedItems.enum = visible;
  if (locale) annotatePlayerVisibleDescriptions(schema, locale);
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

/** Keep the generic export stable while narrowing evidence provenance per run. */
export function hearingJudgmentJsonSchemaForRequest(
  request: HearingJudgmentRequest,
): Record<string, unknown> {
  const schema = structuredClone(hearingJudgmentJsonSchema);
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const residentAssessments = properties.residentAssessments;
  const genericAssessment = residentAssessments.items as Record<string, unknown>;
  residentAssessments.items = {
    anyOf: request.residents.map(resident => {
      const assessment = structuredClone(genericAssessment);
      const assessmentProperties = assessment.properties as Record<
        string,
        Record<string, unknown>
      >;
      assessmentProperties.actorId.const = resident.actorId;
      assessmentProperties.contactBasis.const = hearingContactBasisForMemories(
        resident.memories,
      );
      delete assessmentProperties.contactBasis.enum;
      const citedMemoryIds = assessmentProperties.citedMemoryIds;
      const memoryIds = uniqueStrings(resident.memories.map(memory => memory.memoryId));
      if (memoryIds.length === 0) citedMemoryIds.maxItems = 0;
      else (citedMemoryIds.items as Record<string, unknown>).enum = memoryIds;
      return assessment;
    }),
  };
  const possibleEvidenceBackedVouches = request.residents.filter(
    resident =>
      hearingContactBasisForMemories(resident.memories) === "meaningful_firsthand",
  ).length;
  if (possibleEvidenceBackedVouches < 4) {
    properties.proposedVerdict.enum = ["abnormal"];
  }
  annotatePlayerVisibleDescriptions(schema, request.locale);
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
  required: ["toolCall", "utterance", "citedRecordIds", "rationale", "done"],
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
    utterance: nullableTransientWorldUtteranceJsonString,
    citedRecordIds: {
      type: "array",
      maxItems: MAX_SPEECH_RECORD_CITATIONS,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    rationale: { type: "string", minLength: 1 },
    done: { type: "boolean" },
  },
};

export function agentStepProposalJsonSchemaForTools(
  constraints: AgentStepRequestSchemaConstraints,
  locale?: string,
): Record<string, unknown> {
  const schema = structuredClone(agentStepProposalJsonSchema);
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const toolCallSchema = properties.toolCall;
  const citedRecordIds = properties.citedRecordIds;
  const citedItems = citedRecordIds.items as Record<string, unknown>;
  const visibleCitations = visibleRecordIds(constraints.observePacket, undefined);
  if (visibleCitations.length === 0) citedRecordIds.maxItems = 0;
  else citedItems.enum = visibleCitations;
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
          // packets and surface the inconsistency through fail-closed validation.
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
      return (
        constraints.requiredToolCall === undefined &&
        constraints.requireToolCall !== true
      );
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

  if (constraints.administrativeDecisionSpeech) {
    properties.utterance = { type: "null" };
    for (const branch of narrowedBranches) {
      const toolName = toolNameForBranch(branch);
      if (toolName !== "wait" && toolName !== "write_record") continue;
      const branchProperties = (branch as Record<string, unknown>).properties as
        | Record<string, Record<string, unknown>>
        | undefined;
      const argsSchema = branchProperties?.args;
      const argsProperties = argsSchema?.properties as
        | Record<string, Record<string, unknown>>
        | undefined;
      const spokenField = toolName === "wait" ? "reason" : "whyLine";
      if (!argsProperties?.[spokenField]) {
        throw new Error(`administrative ${toolName} JSON schema is missing ${spokenField}`);
      }
      argsProperties[spokenField] = structuredClone(transientWorldUtteranceJsonString);
    }
  }

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
    properties.done = { type: "boolean", const: true };
  }

  if (
    constraints.requiredToolCall?.tool === "talk_to" ||
    constraints.requireUtterance === true
  ) {
    properties.utterance = structuredClone(playerVisibleJsonString);
  }

  toolCallSchema.anyOf = narrowedBranches;
  if (locale) annotatePlayerVisibleDescriptions(schema, locale);
  return schema;
}

function annotatePlayerVisibleDescriptions(value: unknown, locale: string): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(item => annotatePlayerVisibleDescriptions(item, locale));
    return;
  }
  const record = value as Record<string, unknown>;
  const description = record.description;
  if (
    typeof description === "string" &&
    description.includes("Player-visible natural-language prose")
  ) {
    const localeSuffix =
      ` This request uses ${providerLanguageName(locale)} for every player-visible field. Do not copy source-language cast text when it differs from the run locale.`;
    record.description = description.includes(localeSuffix)
      ? description
      : description + localeSuffix + (isKoreanLocale(locale)
        ? KOREAN_PLAYER_VISIBLE_JSON_SCHEMA_SUFFIX
        : "");
  }
  Object.values(record).forEach(item => annotatePlayerVisibleDescriptions(item, locale));
}
