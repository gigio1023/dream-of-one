import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CONVERSATION_SUSPICION_SIGNALS, CONVERSATION_CHOICE_INTENTS } from "../contracts/types.js";
import { RECORD_KINDS, WORLD_ROLES } from "./world/index.js";

const signalEnum = z.enum(CONVERSATION_SUSPICION_SIGNALS);
const intentEnum = z.enum(CONVERSATION_CHOICE_INTENTS);
const roleEnum = z.enum(WORLD_ROLES);
const recordKindEnum = z.enum(RECORD_KINDS);
const routeIdEnum = z.enum(["clean_cover", "repair_recovery", "soft_report", "hard_inquest"]);

const nonEmpty = z.string().min(1);

const economyDeltaSchema = z
  .object({
    accountCredit: z.number().int().optional(),
    localTrust: z.number().int().optional(),
    recordBurden: z.number().int().optional(),
    stationAttention: z.number().int().optional(),
    favor: z.number().int().optional(),
  })
  .strict();

const choiceSchema = z
  .object({
    choiceId: nonEmpty,
    intent: intentEnum,
    line: nonEmpty,
    signals: z.array(signalEnum),
    clerkResponse: nonEmpty,
  })
  .strict();

const beatSchema = z
  .object({
    beatId: nonEmpty,
    promptId: nonEmpty,
    choiceSetId: nonEmpty,
    speakerId: nonEmpty,
    landmarkId: nonEmpty,
    act: nonEmpty,
    onlyWhenRoute: z.array(routeIdEnum).optional(),
    prompt: nonEmpty,
    procedureCue: z.array(nonEmpty),
    acceptsFreeInput: z.boolean(),
    choices: z.array(choiceSchema).length(3),
    next: nonEmpty.nullable(),
  })
  .strict();

const consequenceRecordSchema = z
  .object({
    recordId: nonEmpty,
    kind: recordKindEnum,
    targetId: nonEmpty,
    stateBody: nonEmpty,
    visibleTo: z.array(roleEnum).min(1),
    captureSelectedLine: z.boolean().optional(),
  })
  .strict();

const consequenceSchema = z
  .object({
    actorId: nonEmpty,
    actorRole: roleEnum,
    objectId: nonEmpty,
    toState: nonEmpty,
    ledgerKind: nonEmpty,
    citeLedgerKind: nonEmpty.optional(),
    record: consequenceRecordSchema.optional(),
    economyDelta: economyDeltaSchema.optional(),
    whyLineKey: signalEnum.or(z.literal("none")).optional(),
    whyLine: nonEmpty,
  })
  .strict();

const routeSchema = z
  .object({
    outcome: nonEmpty,
    title: nonEmpty,
    body: nonEmpty,
    consequences: z.array(consequenceSchema),
  })
  .strict();

const freeInputPatternSchema = z
  .object({
    signal: signalEnum,
    patterns: z.array(nonEmpty).min(1),
  })
  .strict();

export const storyletSchema = z
  .object({
    storyletId: nonEmpty,
    title: nonEmpty,
    locale: nonEmpty,
    conversationId: nonEmpty,
    source: nonEmpty,
    primaryRecordId: nonEmpty,
    thresholds: z
      .object({
        softReport: z.number().int().positive(),
        inquest: z.number().int().positive(),
        suspicionProbe: z.number().int().positive(),
        hesitationMs: z.number().int().positive(),
      })
      .strict(),
    actors: z
      .array(
        z
          .object({ actorId: nonEmpty, role: roleEnum, name: nonEmpty, landmarkId: nonEmpty })
          .strict(),
      )
      .min(1),
    landmarks: z.array(z.object({ landmarkId: nonEmpty, label: nonEmpty }).strict()).min(1),
    whyLines: z.record(signalEnum.or(z.literal("none")), nonEmpty),
    beats: z.array(beatSchema).min(1),
    freeInputPatterns: z.array(freeInputPatternSchema).min(1),
    hesitation: z
      .object({ thresholdMs: z.number().int().positive(), signal: signalEnum, eventName: nonEmpty })
      .strict(),
    routes: z
      .object({
        clean_cover: routeSchema,
        repair_recovery: routeSchema,
        soft_report: routeSchema,
        hard_inquest: routeSchema,
      })
      .strict(),
    fallbackLines: z.partialRecord(roleEnum, z.array(nonEmpty).min(1)),
  })
  .strict();

export type Storylet = z.infer<typeof storyletSchema>;
export type StoryletBeat = z.infer<typeof beatSchema>;
export type StoryletChoice = z.infer<typeof choiceSchema>;
export type StoryletRoute = z.infer<typeof routeSchema>;
export type StoryletConsequence = z.infer<typeof consequenceSchema>;
export type RouteId = z.infer<typeof routeIdEnum>;

export const ROUTE_IDS: readonly RouteId[] = [
  "clean_cover",
  "repair_recovery",
  "soft_report",
  "hard_inquest",
] as const;

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

export function storyletDataDir(): string {
  // src/runtime/storylet.ts -> ../../data/storylets when run via tsx,
  // dist/runtime/storylet.js -> ../../data/storylets when built.
  return resolve(moduleDir(), "..", "..", "data", "storylets");
}

/** Structural checks beyond the zod shape — referential integrity + Korean strings. */
export function assertStoryletIntegrity(storylet: Storylet): void {
  const problems: string[] = [];

  // Every signal used by a choice must have a Korean why-line.
  const referencedSignals = new Set<string>();
  for (const beat of storylet.beats) {
    for (const choice of beat.choices) {
      for (const signal of choice.signals) {
        referencedSignals.add(signal);
      }
    }
  }
  referencedSignals.add(storylet.hesitation.signal);
  for (const signal of referencedSignals) {
    if (!storylet.whyLines[signal as keyof typeof storylet.whyLines]) {
      problems.push(`missing Korean why-line for signal: ${signal}`);
    }
  }
  if (!storylet.whyLines.none) {
    problems.push("missing Korean why-line for the clean (none) case");
  }

  // Every safety gradient must be present exactly once per beat choice set.
  for (const beat of storylet.beats) {
    const intents = beat.choices.map(choice => choice.intent).sort();
    const expected = [...CONVERSATION_CHOICE_INTENTS].sort();
    if (JSON.stringify(intents) !== JSON.stringify(expected)) {
      problems.push(`beat ${beat.beatId} must offer exactly one safe/uncertain/risky choice`);
    }
  }

  // Free-input patterns must compile as regexes.
  for (const entry of storylet.freeInputPatterns) {
    for (const pattern of entry.patterns) {
      try {
        void new RegExp(pattern);
      } catch {
        problems.push(`invalid free-input regex for ${entry.signal}: ${pattern}`);
      }
    }
  }

  // Route consequences that cite a ledger kind must reference a kind produced
  // earlier in the same route (Station cites an existing Store record).
  for (const routeId of ROUTE_IDS) {
    const route = storylet.routes[routeId];
    const produced: string[] = [];
    for (const consequence of route.consequences) {
      if (consequence.citeLedgerKind && !produced.includes(consequence.citeLedgerKind)) {
        problems.push(
          `route ${routeId} cites ${consequence.citeLedgerKind} before it is produced`,
        );
      }
      produced.push(consequence.ledgerKind);
    }
  }

  // The inquest route must cite the primary store record.
  const inquestCites = storylet.routes.hard_inquest.consequences.some(
    consequence => consequence.citeLedgerKind !== undefined,
  );
  if (!inquestCites) {
    problems.push("hard_inquest route must cite an exact Store ledger event");
  }

  // Every string that is player-facing Korean must be non-Latin-only.
  const koreanFields: string[] = [
    storylet.title,
    ...Object.values(storylet.whyLines),
    ...storylet.beats.flatMap(beat => [beat.prompt, ...beat.choices.map(c => c.line)]),
  ];
  const hasHangul = (value: string) => /[가-힣]/.test(value);
  for (const value of koreanFields) {
    if (!hasHangul(value)) {
      problems.push(`expected Korean text but found: ${value}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`storylet integrity failed:\n- ${problems.join("\n- ")}`);
  }
}

export function parseStorylet(raw: unknown): Storylet {
  const storylet = storyletSchema.parse(raw);
  assertStoryletIntegrity(storylet);
  return storylet;
}

export function loadStorylet(storyletId: string): Storylet {
  const path = resolve(storyletDataDir(), `${storyletId}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return parseStorylet(raw);
}
