import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const localeEntrySchema = z
  .object({
    presentationId: nonEmpty,
    apiLocale: nonEmpty,
    labelKey: nonEmpty,
  })
  .strict();

const supportedLocaleRegistrySchema = z
  .object({
    defaultPresentationId: nonEmpty,
    locales: z.array(localeEntrySchema).min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    const presentationIds = registry.locales.map(locale => locale.presentationId);
    const apiLocales = registry.locales.map(locale => locale.apiLocale);
    const labelKeys = registry.locales.map(locale => locale.labelKey);
    for (const [values, path, label] of [
      [presentationIds, "presentationId", "presentation ids"],
      [apiLocales, "apiLocale", "API locales"],
      [labelKeys, "labelKey", "label keys"],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          path: ["locales", path],
          message: `${label} must be unique`,
        });
      }
    }
    if (!presentationIds.includes(registry.defaultPresentationId)) {
      context.addIssue({
        code: "custom",
        path: ["defaultPresentationId"],
        message: "default presentation id must identify a supported locale",
      });
    }
  });

export type SupportedLocaleRegistry = z.infer<typeof supportedLocaleRegistrySchema>;
export type SupportedLocaleEntry = SupportedLocaleRegistry["locales"][number];

declare const gameplayLocaleBrand: unique symbol;
/** An API locale that has passed the shared registry boundary. */
export type GameplayLocale = string & { readonly [gameplayLocaleBrand]: true };

function defaultRegistryPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
    "godot",
    "data",
    "supported_locales.json",
  );
}

/** Load the single locale registry shared with the Godot presentation layer. */
export function loadSupportedLocaleRegistry(path = defaultRegistryPath()): SupportedLocaleRegistry {
  return supportedLocaleRegistrySchema.parse(JSON.parse(readFileSync(path, "utf-8")));
}

export const SUPPORTED_LOCALE_REGISTRY = loadSupportedLocaleRegistry();
export const SUPPORTED_GAMEPLAY_LOCALES = SUPPORTED_LOCALE_REGISTRY.locales.map(
  locale => locale.apiLocale as GameplayLocale,
);
const defaultLocaleEntry = SUPPORTED_LOCALE_REGISTRY.locales.find(
  locale => locale.presentationId === SUPPORTED_LOCALE_REGISTRY.defaultPresentationId,
);
if (!defaultLocaleEntry) throw new Error("supported locale registry has no default locale entry");
export const DEFAULT_GAMEPLAY_LOCALE = defaultLocaleEntry.apiLocale as GameplayLocale;

const supportedGameplayLocaleSet = new Set<string>(SUPPORTED_GAMEPLAY_LOCALES);

export function isSupportedGameplayLocale(locale: string): locale is GameplayLocale {
  return supportedGameplayLocaleSet.has(locale);
}

export const gameplayLocaleSchema = z
  .string()
  .refine(isSupportedGameplayLocale, {
    message: `unsupported gameplay locale; expected one of ${SUPPORTED_GAMEPLAY_LOCALES.join(", ")}`,
  })
  .transform(locale => locale as GameplayLocale);

export function requireSupportedGameplayLocale(locale: string): GameplayLocale {
  return gameplayLocaleSchema.parse(locale);
}

export function supportedLocaleEntry(locale: string): SupportedLocaleEntry {
  const entry = SUPPORTED_LOCALE_REGISTRY.locales.find(candidate => candidate.apiLocale === locale);
  if (!entry) throw new Error(`unsupported gameplay locale: ${locale}`);
  return entry;
}

/** Provider-facing language name; membership still comes only from the shared registry. */
export function providerLanguageName(locale: string): string {
  const presentationId = supportedLocaleEntry(locale).presentationId;
  const names: Record<string, string> = {
    ko: "natural modern Korean",
    en: "natural American English",
    it: "natural Italian",
    zh: "natural Simplified Chinese",
    fr: "natural French",
    ja: "natural Japanese",
  };
  const name = names[presentationId];
  if (!name) throw new Error(`locale ${locale} has no provider language instruction`);
  return name;
}
