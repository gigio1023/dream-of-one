import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  loadProcedureContentBank,
  procedureContent,
} from "../../src/localization/procedure-content.js";
import {
  SUPPORTED_GAMEPLAY_LOCALES,
  SUPPORTED_LOCALE_REGISTRY,
  gameplayLocaleSchema,
} from "../../src/localization/supported-locales.js";
import { conversationJudgmentSchemaForLocale } from "../../src/providers/envelope.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import { RunError, RunService } from "../../src/runtime/run-service.js";
import { startRequestSchema as legacyStartRequestSchema } from "../../src/api/session-schemas.js";
import {
  runSessionStartRequestSchema,
  runSnapshotSchema,
  runStartRequestSchema,
} from "../../src/runtime/run-schema.js";

const EXACT_GAMEPLAY_LOCALES = [
  "ko-KR",
  "en-US",
  "it-IT",
  "zh-CN",
  "fr-FR",
  "ja-JP",
] as const;

test("the shared registry is the exact API locale source for run and conversation schemas", () => {
  assert.deepEqual(SUPPORTED_GAMEPLAY_LOCALES, EXACT_GAMEPLAY_LOCALES);
  assert.deepEqual(
    SUPPORTED_LOCALE_REGISTRY.locales.map(locale => locale.presentationId),
    ["ko", "en", "it", "zh", "fr", "ja"],
  );

  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    assert.equal(gameplayLocaleSchema.parse(locale), locale);
    assert.equal(runStartRequestSchema.parse({ startId: `start-${locale}`, locale }).locale, locale);
    assert.equal(
      runSessionStartRequestSchema.parse({
        runId: "run-locale",
        actorId: "NPC_Studio_Receptionist",
        interactionZoneId: "StudioReceptionConversation",
        locale,
      }).locale,
      locale,
    );
  }
  for (const unsupported of ["ko", "en", "zh-TW", "de-DE", "EN-us"]) {
    assert.equal(gameplayLocaleSchema.safeParse(unsupported).success, false);
  }
  assert.equal(
    legacyStartRequestSchema.safeParse({ storyletId: "same-order", locale: "ko-KR" }).success,
    true,
  );
  assert.equal(
    legacyStartRequestSchema.safeParse({ storyletId: "same-order", locale: "en-US" }).success,
    false,
    "the retained Korean-only regression storylet must not advertise six-locale content",
  );
});

test("a run accepts every supported locale once and keeps it immutable for child conversations", async () => {
  let runCount = 0;
  const service = new RunService({
    proposalPort: createStudioReceptionScriptedAdapter(),
    idFactory: prefix => `${prefix}-locale-${++runCount}`,
  });
  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    const snapshot = service.start(`start-${locale}`, locale);
    assert.equal(snapshot.locale, locale);
    assert.equal(runSnapshotSchema.parse(snapshot).locale, locale);
  }

  const english = service.start("immutable-English-run", "en-US");
  await assert.rejects(
    service.preloadConversation(
      english.runId,
      "NPC_Studio_Receptionist",
      "StudioReceptionConversation",
      "fr-FR",
    ),
    (error: unknown) => error instanceof RunError && error.code === "invalid_locale",
  );
  assert.equal(service.snapshot(english.runId).locale, "en-US");
  assert.throws(
    () => service.start("unsupported-run", "zh-TW"),
    (error: unknown) => error instanceof RunError && error.code === "invalid_locale",
  );
});

test("local hearing and hesitation procedure copy has exact six-locale parity", () => {
  const bank = loadProcedureContentBank();
  assert.deepEqual(Object.keys(bank), EXACT_GAMEPLAY_LOCALES);
  assert.equal(
    new Set(EXACT_GAMEPLAY_LOCALES.map(locale => bank[locale]?.hesitationMarker)).size,
    EXACT_GAMEPLAY_LOCALES.length,
  );
  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    const content = procedureContent(locale);
    assert.deepEqual(Object.keys(content).sort(), ["hearingOpening", "hesitationMarker"]);
    assert.ok(content.hearingOpening.trim().length > 0);
    assert.ok(content.hesitationMarker.trim().length > 0);
    assert.doesNotMatch(content.hearingOpening, /\{[^{}]+\}/);
  }
});

test("all locale envelopes enforce their writing system without language guessing", () => {
  const chineseJudgment = {
    suspicionDelta: 5,
    reportDelta: 0,
    signals: [],
    whyLine: "这个回答仍有需要核实之处。",
  };
  assert.equal(
    conversationJudgmentSchemaForLocale("zh-CN").safeParse(chineseJudgment).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("ko-KR").safeParse(chineseJudgment).success,
    false,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("en-US").safeParse({
      ...chineseJudgment,
      whyLine: "That answer leaves more to be checked.",
    }).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("fr-FR").safeParse({
      ...chineseJudgment,
      whyLine: "Cette réponse laisse encore des points à vérifier.",
    }).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("it-IT").safeParse({
      ...chineseJudgment,
      whyLine: "Questa risposta lascia ancora alcuni punti da verificare.",
    }).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("ja-JP").safeParse({
      ...chineseJudgment,
      whyLine: "この回答にはまだ確認すべき点があります。",
    }).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("ja-JP").safeParse({
      ...chineseJudgment,
      whyLine: "確認完了",
    }).success,
    true,
    "valid Japanese may be written entirely in kanji",
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("zh-CN").safeParse({
      ...chineseJudgment,
      whyLine: "방문 목적을 확인했습니다.",
    }).success,
    false,
    "Korean source prose must not leak unchanged into Simplified Chinese",
  );
});
