import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CONVERSATION_SUSPICION_SIGNALS } from "../contracts/types.js";
import { WORLD_ROLES } from "./world/index.js";

const signalEnum = z.enum(CONVERSATION_SUSPICION_SIGNALS);
const roleEnum = z.enum(WORLD_ROLES);
const routeIdEnum = z.enum(["clean_cover", "repair_recovery", "soft_report", "hard_inquest"]);
const nonEmpty = z.string().min(1);

const beatSchema = z
  .object({
    beatId: nonEmpty,
    promptId: nonEmpty,
    speakerId: nonEmpty,
    landmarkId: nonEmpty,
    act: nonEmpty,
    onlyWhenRoute: z.array(routeIdEnum).optional(),
    objective: nonEmpty,
    sceneFacts: z.array(nonEmpty).min(1),
    procedureCue: z.array(nonEmpty),
    acceptsFreeInput: z.boolean(),
    next: nonEmpty.nullable(),
  })
  .strict();

const routeSchema = z
  .object({
    outcome: nonEmpty,
    title: nonEmpty,
    body: nonEmpty,
    /** Honest variant shown when the session produced no citable ledger event. */
    bodyNoRecord: nonEmpty.optional(),
  })
  .strict();

export const storyletSchema = z
  .object({
    storyletId: nonEmpty,
    title: nonEmpty,
    locale: nonEmpty,
    conversationId: nonEmpty,
    scenePremise: nonEmpty,
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
        z.object({ actorId: nonEmpty, role: roleEnum, name: nonEmpty, landmarkId: nonEmpty }).strict(),
      )
      .min(1),
    landmarks: z.array(z.object({ landmarkId: nonEmpty, label: nonEmpty }).strict()).min(1),
    whyLines: z.record(signalEnum.or(z.literal("none")), nonEmpty),
    beats: z.array(beatSchema).min(1),
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
  })
  .strict();

export type Storylet = z.infer<typeof storyletSchema>;
export type StoryletBeat = z.infer<typeof beatSchema>;
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
  return resolve(moduleDir(), "..", "..", "data", "storylets");
}

export function assertStoryletIntegrity(storylet: Storylet): void {
  const problems: string[] = [];
  const actorIds = new Set(storylet.actors.map(actor => actor.actorId));
  const beatIds = new Set(storylet.beats.map(beat => beat.beatId));

  for (const beat of storylet.beats) {
    if (!actorIds.has(beat.speakerId)) problems.push(`unknown speaker in ${beat.beatId}: ${beat.speakerId}`);
    if (beat.next && !beatIds.has(beat.next)) problems.push(`unknown next beat in ${beat.beatId}: ${beat.next}`);
  }
  if (!storylet.whyLines.none) problems.push("missing Korean why-line for none");
  const koreanFields = [
    storylet.title,
    storylet.scenePremise,
    ...Object.values(storylet.whyLines),
    ...storylet.beats.flatMap(beat => [beat.objective, ...beat.sceneFacts]),
  ];
  for (const value of koreanFields) {
    if (!/[가-힣]/.test(value)) problems.push(`expected Korean content: ${value}`);
  }
  if (problems.length > 0) throw new Error(`storylet integrity failed:\n- ${problems.join("\n- ")}`);
}

export function parseStorylet(raw: unknown): Storylet {
  const storylet = storyletSchema.parse(raw);
  assertStoryletIntegrity(storylet);
  return storylet;
}

export function loadStorylet(storyletId: string): Storylet {
  const path = resolve(storyletDataDir(), `${storyletId}.json`);
  return parseStorylet(JSON.parse(readFileSync(path, "utf-8")));
}
