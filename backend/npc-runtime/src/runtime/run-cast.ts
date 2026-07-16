import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { RunLayout } from "./run-layout.js";

const nonEmpty = z.string().trim().min(1);

function uniqueNonEmptyList(minimum = 1) {
  return z.array(nonEmpty).min(minimum).superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", message: "values must be unique" });
    }
  });
}

const voiceSchema = z
  .object({
    register: nonEmpty,
    cadence: nonEmpty,
    avoid: uniqueNonEmptyList(),
  })
  .strict();

const knownRelationshipSchema = z
  .object({
    actor_id: nonEmpty,
    facts: uniqueNonEmptyList(),
  })
  .strict();

const castActorSchema = z
  .object({
    public_identity: nonEmpty,
    personality: uniqueNonEmptyList(),
    voice: voiceSchema,
    stable_goals: uniqueNonEmptyList(),
    self_only_pressures: uniqueNonEmptyList(),
    known_relationships: z.array(knownRelationshipSchema),
  })
  .strict();

const runCastFileSchema = z
  .object({
    world_id: nonEmpty,
    source_locale: z.literal("ko-KR"),
    player: z
      .object({
        resident_known_facts: uniqueNonEmptyList(0),
        brief_keys: z
          .object({
            identity_key: nonEmpty,
            arrival_key: nonEmpty,
            uncertainty_key: nonEmpty,
          })
          .strict(),
      })
      .strict(),
    actors: z.record(z.string(), castActorSchema),
  })
  .strict();

export interface RunCastVoice {
  register: string;
  cadence: string;
  avoid: string[];
}

export interface RunCastKnownRelationship {
  actorId: string;
  facts: string[];
}

export interface RunCastActor {
  publicIdentity: string;
  personality: string[];
  voice: RunCastVoice;
  stableGoals: string[];
  selfOnlyPressures: string[];
  knownRelationships: RunCastKnownRelationship[];
}

export interface RunPlayerBriefKeys {
  identityKey: string;
  arrivalKey: string;
  uncertaintyKey: string;
}

export interface RunCast {
  worldId: string;
  sourceLocale: "ko-KR";
  player: {
    residentKnownFacts: string[];
    briefKeys: RunPlayerBriefKeys;
  };
  actors: Record<string, RunCastActor>;
}

function defaultCastPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "data",
    "cast",
    "m3r-first-person-town.json",
  );
}

/** Enforce that private authored context is a one-to-one companion to the public layout. */
export function assertRunCastMatchesLayout(cast: RunCast, layout: RunLayout): void {
  if (cast.worldId !== layout.worldId) {
    throw new Error(`run cast world ${cast.worldId} does not match layout ${layout.worldId}`);
  }
  const layoutActorIds = layout.actors.map(actor => actor.actorId).sort();
  const castActorIds = Object.keys(cast.actors).sort();
  if (JSON.stringify(castActorIds) !== JSON.stringify(layoutActorIds)) {
    throw new Error("run cast must contain the exact layout actor id set");
  }
  const knownActorIds = new Set(layoutActorIds);
  for (const [holderActorId, actor] of Object.entries(cast.actors)) {
    const relationshipTargets = actor.knownRelationships.map(relationship => relationship.actorId);
    if (new Set(relationshipTargets).size !== relationshipTargets.length) {
      throw new Error(`run cast relationships must be unique for ${holderActorId}`);
    }
    for (const targetActorId of relationshipTargets) {
      if (targetActorId === holderActorId) {
        throw new Error(`run cast relationship cannot target its holder: ${holderActorId}`);
      }
      if (!knownActorIds.has(targetActorId)) {
        throw new Error(
          `run cast relationship ${holderActorId} -> ${targetActorId} references an unknown actor`,
        );
      }
    }
  }
}

/** Parse backend-only cast content and join it strictly to the shared spatial actor ids. */
export function parseRunCast(raw: unknown, layout: RunLayout): RunCast {
  const parsed = runCastFileSchema.parse(raw);
  const cast: RunCast = {
    worldId: parsed.world_id,
    sourceLocale: parsed.source_locale,
    player: {
      residentKnownFacts: [...parsed.player.resident_known_facts],
      briefKeys: {
        identityKey: parsed.player.brief_keys.identity_key,
        arrivalKey: parsed.player.brief_keys.arrival_key,
        uncertaintyKey: parsed.player.brief_keys.uncertainty_key,
      },
    },
    actors: Object.fromEntries(
      Object.entries(parsed.actors).map(([actorId, actor]) => [
        actorId,
        {
          publicIdentity: actor.public_identity,
          personality: [...actor.personality],
          voice: {
            register: actor.voice.register,
            cadence: actor.voice.cadence,
            avoid: [...actor.voice.avoid],
          },
          stableGoals: [...actor.stable_goals],
          selfOnlyPressures: [...actor.self_only_pressures],
          knownRelationships: actor.known_relationships.map(relationship => ({
            actorId: relationship.actor_id,
            facts: [...relationship.facts],
          })),
        },
      ]),
    ),
  };
  assertRunCastMatchesLayout(cast, layout);
  return cast;
}

export function loadRunCast(layout: RunLayout, path = defaultCastPath()): RunCast {
  return parseRunCast(JSON.parse(readFileSync(path, "utf-8")), layout);
}
