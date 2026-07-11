import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { RUN_ACTOR_ROLES } from "./run-schema.js";

const layoutActorSchema = z.object({
  id: z.string().min(1),
  role_placeholder: z.enum(RUN_ACTOR_ROLES),
  spawn_anchor: z.string().min(1),
});

const townLayoutSchema = z
  .object({
    world_id: z.string().min(1),
    world_revision: z.string().min(1),
    schedule: z.object({
      grace_period_world_seconds: z.number().nonnegative(),
      hearing_world_seconds: z.number().positive(),
    }),
    actors: z.array(layoutActorSchema).length(6),
    interaction_zones: z.array(
      z.object({
        id: z.string().min(1),
        kind: z.string().min(1),
        landmark: z.string().min(1),
        actor_id: z.string().min(1).optional(),
      }),
    ),
  })
  .refine(value => new Set(value.actors.map(actor => actor.id)).size === value.actors.length, {
    message: "town layout actor ids must be unique",
    path: ["actors"],
  })
  .refine(
    value => new Set(value.actors.map(actor => actor.role_placeholder)).size === RUN_ACTOR_ROLES.length,
    {
      message: "town layout must contain each M3R actor role exactly once",
      path: ["actors"],
    },
  );

export interface RunLayout {
  worldId: string;
  layoutRevision: string;
  graceEndsAtSeconds: number;
  hearingAtSeconds: number;
  studioReceptionInteractionZoneId: string;
  actors: Array<{
    actorId: string;
    role: (typeof RUN_ACTOR_ROLES)[number];
    locationId: string;
  }>;
}

function defaultLayoutPath(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
    "godot",
    "data",
    "world_layout.json",
  );
}

/** Load the single shared town layout; the runtime never carries a second actor roster. */
export function loadRunLayout(path = defaultLayoutPath()): RunLayout {
  const parsed = townLayoutSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  const studioReception = parsed.interaction_zones.find(
    zone => zone.id === "StudioReceptionConversation",
  );
  if (
    !studioReception ||
    studioReception.kind !== "conversation" ||
    studioReception.landmark !== "Studio" ||
    studioReception.actor_id !== "NPC_Studio_Receptionist"
  ) {
    throw new Error("world layout has no valid Studio receptionist conversation zone");
  }
  return {
    worldId: parsed.world_id,
    layoutRevision: parsed.world_revision,
    graceEndsAtSeconds: parsed.schedule.grace_period_world_seconds,
    hearingAtSeconds: parsed.schedule.hearing_world_seconds,
    studioReceptionInteractionZoneId: studioReception.id,
    actors: parsed.actors.map(actor => {
      const locationId = actor.spawn_anchor.split(".", 1)[0];
      if (!locationId) throw new Error(`actor spawn anchor has no landmark: ${actor.spawn_anchor}`);
      return {
        actorId: actor.id,
        role: actor.role_placeholder,
        locationId,
      };
    }),
  };
}
