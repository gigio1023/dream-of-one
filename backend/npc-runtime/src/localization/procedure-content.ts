import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  SUPPORTED_GAMEPLAY_LOCALES,
  requireSupportedGameplayLocale,
  type GameplayLocale,
} from "./supported-locales.js";

const nonEmpty = z.string().trim().min(1);
const localizedProcedureContentSchema = z
  .object({
    hesitationMarker: nonEmpty,
    hearingOpening: nonEmpty,
  })
  .strict();

const procedureContentBankSchema = z
  .record(z.string(), localizedProcedureContentSchema)
  .superRefine((bank, context) => {
    const actual = Object.keys(bank).sort();
    const expected = [...SUPPORTED_GAMEPLAY_LOCALES].sort();
    if (
      actual.length !== expected.length ||
      actual.some((locale, index) => locale !== expected[index])
    ) {
      context.addIssue({
        code: "custom",
        message: `procedure locales must exactly match the shared registry: ${expected.join(", ")}`,
      });
    }
  });

export type LocalizedProcedureContent = z.infer<
  typeof localizedProcedureContentSchema
>;

function defaultProcedureContentPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "data",
    "localization",
    "procedure-lines.json",
  );
}

export function loadProcedureContentBank(
  path = defaultProcedureContentPath(),
): Record<string, LocalizedProcedureContent> {
  return procedureContentBankSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

const PROCEDURE_CONTENT_BANK = loadProcedureContentBank();

export function procedureContent(locale: string): LocalizedProcedureContent {
  const supportedLocale: GameplayLocale = requireSupportedGameplayLocale(locale);
  const content = PROCEDURE_CONTENT_BANK[supportedLocale];
  if (!content) throw new Error(`missing procedure content for ${supportedLocale}`);
  return content;
}
