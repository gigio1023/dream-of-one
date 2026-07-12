import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  CONVERSATION_CHOICE_INTENTS,
  CONVERSATION_SUSPICION_SIGNALS,
  type ConversationChoiceIntent,
} from "../contracts/types.js";
import {
  SUPPORTED_GAMEPLAY_LOCALES,
  requireSupportedGameplayLocale,
  type GameplayLocale,
} from "./supported-locales.js";

const nonEmpty = z.string().trim().min(1);
const replySchema = z
  .object({
    text: nonEmpty,
    intent: z.enum(CONVERSATION_CHOICE_INTENTS),
  })
  .strict();
const replyTupleSchema = z.tuple([replySchema, replySchema, replySchema]);
const conversationVariantSchema = z
  .object({
    opening: nonEmpty,
    followUp: nonEmpty,
    suggestedReplies: replyTupleSchema,
  })
  .strict()
  .superRefine((variant, context) => {
    const actual = new Set(variant.suggestedReplies.map(reply => reply.intent));
    for (const intent of CONVERSATION_CHOICE_INTENTS) {
      if (!actual.has(intent)) {
        context.addIssue({
          code: "custom",
          path: ["suggestedReplies"],
          message: `fallback suggestions require exactly one ${intent} reply`,
        });
      }
    }
  });

const hearingFallbackSchema = z
  .object({
    opening: nonEmpty,
    memoryGroundedTestimony: nonEmpty,
    neverMetTestimony: nonEmpty,
    missingEvidenceTestimony: nonEmpty,
    ordinaryVerdictWhy: nonEmpty,
    abnormalVerdictWhy: nonEmpty,
    ordinaryOfficerLine: nonEmpty,
    abnormalOfficerLine: nonEmpty,
  })
  .strict()
  .superRefine((hearing, context) => {
    const placeholders = hearing.memoryGroundedTestimony.match(/\{[^{}]+\}/g) ?? [];
    if (placeholders.length !== 1 || placeholders[0] !== "{memory}") {
      context.addIssue({
        code: "custom",
        path: ["memoryGroundedTestimony"],
        message: "hearing memory testimony requires exactly the {memory} placeholder",
      });
    }
  });

const whyLineShape = Object.fromEntries(
  CONVERSATION_SUSPICION_SIGNALS.map(signal => [signal, nonEmpty]),
) as Record<(typeof CONVERSATION_SUSPICION_SIGNALS)[number], typeof nonEmpty>;

const localizedFallbackContentSchema = z
  .object({
    hesitationMarker: nonEmpty,
    whyLines: z
      .object({
        ...whyLineShape,
        defaultSignal: nonEmpty,
        none: nonEmpty,
      })
      .strict(),
    conversation: z
      .object({
        studioReception: conversationVariantSchema,
        generic: conversationVariantSchema,
      })
      .strict(),
    hearing: hearingFallbackSchema,
    agent: z
      .object({
        previousResultWaitReason: nonEmpty,
        previousResultRationale: nonEmpty,
        heardUtterance: nonEmpty,
        talkUtterance: nonEmpty,
        talkRationale: nonEmpty,
        lookRationale: nonEmpty,
        doneRationale: nonEmpty,
        observeUtterance: nonEmpty,
      })
      .strict(),
  })
  .strict()
  .superRefine((content, context) => {
    const intentByText = new Map<string, ConversationChoiceIntent>();
    for (const [variantName, variant] of Object.entries(content.conversation)) {
      for (const reply of variant.suggestedReplies) {
        const existing = intentByText.get(reply.text);
        if (existing && existing !== reply.intent) {
          context.addIssue({
            code: "custom",
            path: ["conversation", variantName, "suggestedReplies"],
            message: `fallback reply text maps to conflicting intents: ${reply.text}`,
          });
        }
        intentByText.set(reply.text, reply.intent);
      }
    }
  });

const fallbackContentBankSchema = z
  .record(z.string(), localizedFallbackContentSchema)
  .superRefine((bank, context) => {
    const actual = Object.keys(bank).sort();
    const expected = [...SUPPORTED_GAMEPLAY_LOCALES].sort();
    if (actual.length !== expected.length || actual.some((locale, index) => locale !== expected[index])) {
      context.addIssue({
        code: "custom",
        message: `fallback locales must exactly match the shared registry: ${expected.join(", ")}`,
      });
    }
  });

export type LocalizedFallbackContent = z.infer<typeof localizedFallbackContentSchema>;

function defaultFallbackContentPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "data",
    "localization",
    "fallback-lines.json",
  );
}

export function loadFallbackContentBank(path = defaultFallbackContentPath()): Record<string, LocalizedFallbackContent> {
  return fallbackContentBankSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

const FALLBACK_CONTENT_BANK = loadFallbackContentBank();

export function fallbackContent(locale: string): LocalizedFallbackContent {
  const supportedLocale: GameplayLocale = requireSupportedGameplayLocale(locale);
  const content = FALLBACK_CONTENT_BANK[supportedLocale];
  if (!content) throw new Error(`missing fallback content for ${supportedLocale}`);
  return content;
}

/**
 * Resolve only an exact line authored by the bounded fallback bank. Live
 * provider suggestions never enter this lookup and their intent is not
 * trusted by deterministic judgment.
 */
export function exactFallbackSuggestedReplyIntent(
  locale: string,
  playerLine: string,
): ConversationChoiceIntent | undefined {
  const content = fallbackContent(locale);
  const matches = Object.values(content.conversation).flatMap(
    variant => variant.suggestedReplies.filter(reply => reply.text === playerLine),
  );
  return matches[0]?.intent;
}
