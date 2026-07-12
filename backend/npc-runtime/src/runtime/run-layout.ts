import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { RUN_ACTOR_ROLES } from "./run-schema.js";

const nonEmpty = z.string().trim().min(1);
const scheduleBlockSchema = z
  .object({
    start: z.number().nonnegative(),
    end: z.number().positive(),
    activity: nonEmpty,
    anchor: nonEmpty.optional(),
    route_id: nonEmpty.optional(),
  })
  .strict()
  .refine(block => Number(block.anchor !== undefined) + Number(block.route_id !== undefined) === 1, {
    message: "schedule block requires exactly one anchor or route_id",
  })
  .refine(block => block.start < block.end, {
    message: "schedule block start must be before end",
  });

const layoutActorSchema = z.object({
  id: nonEmpty,
  role_placeholder: z.enum(RUN_ACTOR_ROLES),
  home_landmark: nonEmpty,
  spawn_anchor: nonEmpty,
  route_id: nonEmpty,
  schedule_blocks: z.array(scheduleBlockSchema).min(1),
});

const routeSchema = z.object({
  id: nonEmpty,
  kind: z.literal("schedule"),
  points: z.array(nonEmpty).min(1),
});

const meetingWindowSchema = z
  .object({
    id: nonEmpty,
    start_world_seconds: z.number().nonnegative(),
    end_world_seconds: z.number().positive(),
    anchor: nonEmpty,
    actor_ids: z.array(nonEmpty).length(2),
    participant_anchor_refs: z.record(z.string(), nonEmpty),
  })
  .strict()
  .refine(window => window.start_world_seconds < window.end_world_seconds, {
    message: "meeting window start must be before end",
  });

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const audibilityBoxSchema = z
  .object({
    center: vector3Schema,
    size: vector3Schema,
  })
  .strict();
const audibilityVolumeSchema = z
  .object({
    id: nonEmpty,
    zone_ids: z.array(nonEmpty).min(1),
    shape: z.enum(["box", "boxes"]),
    center: vector3Schema.optional(),
    size: vector3Schema.optional(),
    volumes: z.array(audibilityBoxSchema).optional(),
    max_speech_distance_m: z.number().positive(),
    portal_id: nonEmpty.optional(),
    occlusion_mode: nonEmpty,
  })
  .strict()
  .superRefine((volume, context) => {
    const hasSingleBox = volume.center !== undefined && volume.size !== undefined;
    const hasBoxes = volume.volumes !== undefined && volume.volumes.length > 0;
    if (volume.shape === "box" && !hasSingleBox) {
      context.addIssue({
        code: "custom",
        message: "box audibility volume requires center and size",
      });
    }
    if (volume.shape === "boxes" && !hasBoxes) {
      context.addIssue({
        code: "custom",
        message: "boxes audibility volume requires volumes",
      });
    }
  });

const townLayoutSchema = z
  .object({
    world_id: nonEmpty,
    world_revision: nonEmpty,
    landmarks: z.array(
      z.object({
        id: nonEmpty,
        anchors: z.record(z.string(), z.array(z.number()).length(3)),
      }),
    ),
    routes: z.array(routeSchema).length(6),
    schedule: z.object({
      grace_period_world_seconds: z.number().nonnegative(),
      hearing_world_seconds: z.number().positive(),
      meeting_windows: z.array(meetingWindowSchema),
    }),
    audibility_volumes: z.array(audibilityVolumeSchema).min(1),
    actors: z.array(layoutActorSchema).length(6),
    interaction_zones: z.array(
      z.object({
        id: nonEmpty,
        kind: nonEmpty,
        landmark: nonEmpty,
        anchor: nonEmpty,
        actor_id: nonEmpty.optional(),
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

export type RunScheduleTarget =
  | { kind: "anchor"; id: string }
  | { kind: "route"; id: string };

export interface RunScheduleBlock {
  blockId: string;
  startSeconds: number;
  endSeconds: number;
  activity: string;
  target: RunScheduleTarget;
}

export interface RunLayoutActor {
  actorId: string;
  role: (typeof RUN_ACTOR_ROLES)[number];
  homeLandmarkId: string;
  spawnAnchorRef: string;
  routeId: string;
  scheduleBlocks: RunScheduleBlock[];
}

export interface RunLayoutRoute {
  routeId: string;
  points: string[];
}

export interface RunMeetingWindow {
  windowId: string;
  startSeconds: number;
  endSeconds: number;
  anchorRef: string;
  actorIds: [string, string];
  participantAnchorRefs: Record<string, string>;
}

export interface RunAudibilityVolume {
  volumeId: string;
  maxSpeechDistanceM: number;
  boxes: Array<{
    center: readonly [number, number, number];
    size: readonly [number, number, number];
  }>;
}

export interface RunLayout {
  worldId: string;
  layoutRevision: string;
  graceEndsAtSeconds: number;
  hearingAtSeconds: number;
  studioReceptionInteractionZoneId: string;
  studioReceptionAnchorRef: string;
  anchorRefs: string[];
  anchorPositions: Record<string, readonly [number, number, number]>;
  routes: RunLayoutRoute[];
  meetingWindows: RunMeetingWindow[];
  audibilityVolumes: RunAudibilityVolume[];
  actors: RunLayoutActor[];
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

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`);
}

/** Load and cross-validate the single schedule/actor topology shared with Godot. */
export function loadRunLayout(path = defaultLayoutPath()): RunLayout {
  const parsed = townLayoutSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  const actorIds = new Set(parsed.actors.map(actor => actor.id));
  const landmarkIds = new Set(parsed.landmarks.map(landmark => landmark.id));
  const anchorRefs = parsed.landmarks.flatMap(landmark =>
    Object.keys(landmark.anchors).map(anchorId => `${landmark.id}.${anchorId}`),
  );
  const anchorPositions = Object.fromEntries(
    parsed.landmarks.flatMap(landmark =>
      Object.entries(landmark.anchors).map(([anchorId, position]) => [
        `${landmark.id}.${anchorId}`,
        position as [number, number, number],
      ]),
    ),
  );
  const anchorRefSet = new Set(anchorRefs);
  const routeIds = parsed.routes.map(route => route.id);
  const routeIdSet = new Set(routeIds);
  assertUnique(routeIds, "town layout route ids");
  assertUnique(parsed.schedule.meeting_windows.map(window => window.id), "meeting window ids");
  assertUnique(parsed.audibility_volumes.map(volume => volume.id), "audibility volume ids");

  for (const route of parsed.routes) {
    for (const anchorRef of route.points) {
      if (!anchorRefSet.has(anchorRef)) {
        throw new Error(`schedule route ${route.id} references unknown anchor ${anchorRef}`);
      }
    }
  }

  const actors: RunLayoutActor[] = parsed.actors.map(actor => {
    if (!landmarkIds.has(actor.home_landmark)) {
      throw new Error(`actor ${actor.id} has unknown home landmark ${actor.home_landmark}`);
    }
    if (!anchorRefSet.has(actor.spawn_anchor)) {
      throw new Error(`actor ${actor.id} has unknown spawn anchor ${actor.spawn_anchor}`);
    }
    if (!routeIdSet.has(actor.route_id)) {
      throw new Error(`actor ${actor.id} has unknown route ${actor.route_id}`);
    }
    const blocks: RunScheduleBlock[] = actor.schedule_blocks.map((block, index) => {
      const target: RunScheduleTarget = block.anchor
        ? { kind: "anchor", id: block.anchor }
        : { kind: "route", id: block.route_id as string };
      if (target.kind === "anchor" && !anchorRefSet.has(target.id)) {
        throw new Error(`actor ${actor.id} schedule references unknown anchor ${target.id}`);
      }
      if (target.kind === "route" && !routeIdSet.has(target.id)) {
        throw new Error(`actor ${actor.id} schedule references unknown route ${target.id}`);
      }
      return {
        blockId: `${actor.id}.schedule.${index}`,
        startSeconds: block.start,
        endSeconds: block.end,
        activity: block.activity,
        target,
      };
    });
    if (blocks[0]?.startSeconds !== 0) {
      throw new Error(`actor ${actor.id} schedule must start at world second 0`);
    }
    if (blocks.at(-1)?.endSeconds !== parsed.schedule.hearing_world_seconds) {
      throw new Error(`actor ${actor.id} schedule must end at the hearing boundary`);
    }
    for (let index = 1; index < blocks.length; index += 1) {
      if (blocks[index - 1].endSeconds !== blocks[index].startSeconds) {
        throw new Error(`actor ${actor.id} schedule blocks must be contiguous`);
      }
    }
    return {
      actorId: actor.id,
      role: actor.role_placeholder,
      homeLandmarkId: actor.home_landmark,
      spawnAnchorRef: actor.spawn_anchor,
      routeId: actor.route_id,
      scheduleBlocks: blocks,
    };
  });

  const meetingWindows: RunMeetingWindow[] = parsed.schedule.meeting_windows.map(window => {
    if (!anchorRefSet.has(window.anchor)) {
      throw new Error(`meeting window ${window.id} references unknown anchor ${window.anchor}`);
    }
    if (window.end_world_seconds > parsed.schedule.hearing_world_seconds) {
      throw new Error(`meeting window ${window.id} ends after the hearing boundary`);
    }
    const [first, second] = window.actor_ids;
    if (!first || !second || first === second || !actorIds.has(first) || !actorIds.has(second)) {
      throw new Error(`meeting window ${window.id} has invalid actors`);
    }
    const participantIds = Object.keys(window.participant_anchor_refs);
    if (
      participantIds.length !== 2 ||
      !window.actor_ids.every(actorId => participantIds.includes(actorId))
    ) {
      throw new Error(`meeting window ${window.id} participant slots must match actor_ids`);
    }
    for (const [actorId, anchorRef] of Object.entries(window.participant_anchor_refs)) {
      if (!anchorRefSet.has(anchorRef)) {
        throw new Error(`meeting window ${window.id} has unknown slot ${actorId}:${anchorRef}`);
      }
    }
    return {
      windowId: window.id,
      startSeconds: window.start_world_seconds,
      endSeconds: window.end_world_seconds,
      anchorRef: window.anchor,
      actorIds: [first, second],
      participantAnchorRefs: { ...window.participant_anchor_refs },
    };
  });

  for (const window of meetingWindows) {
    for (const actorId of window.actorIds) {
      const participantAnchorRef = window.participantAnchorRefs[actorId];
      const actor = actors.find(candidate => candidate.actorId === actorId);
      const coveringBlock = actor?.scheduleBlocks.find(
        block =>
          block.startSeconds <= window.startSeconds &&
          block.endSeconds >= window.endSeconds &&
          block.target.kind === "anchor" &&
          block.target.id === participantAnchorRef,
      );
      if (!participantAnchorRef || !coveringBlock) {
        throw new Error(
          `meeting window ${window.windowId} is not covered by ${actorId} at its participant slot`,
        );
      }
    }
  }

  const studioReception = parsed.interaction_zones.find(
    zone => zone.id === "StudioReceptionConversation",
  );
  if (
    !studioReception ||
    studioReception.kind !== "conversation" ||
    studioReception.landmark !== "Studio" ||
    studioReception.actor_id !== "NPC_Studio_Receptionist" ||
    !anchorRefSet.has(studioReception.anchor)
  ) {
    throw new Error("world layout has no valid Studio receptionist conversation zone");
  }

  return {
    worldId: parsed.world_id,
    layoutRevision: parsed.world_revision,
    graceEndsAtSeconds: parsed.schedule.grace_period_world_seconds,
    hearingAtSeconds: parsed.schedule.hearing_world_seconds,
    studioReceptionInteractionZoneId: studioReception.id,
    studioReceptionAnchorRef: studioReception.anchor,
    anchorRefs,
    anchorPositions,
    routes: parsed.routes.map(route => ({ routeId: route.id, points: [...route.points] })),
    meetingWindows,
    audibilityVolumes: parsed.audibility_volumes.map(volume => ({
      volumeId: volume.id,
      maxSpeechDistanceM: volume.max_speech_distance_m,
      boxes:
        volume.shape === "box"
          ? [{ center: volume.center as [number, number, number], size: volume.size as [number, number, number] }]
          : (volume.volumes as Array<{
              center: [number, number, number];
              size: [number, number, number];
            }>).map(box => ({ center: box.center, size: box.size })),
    })),
    actors,
  };
}
