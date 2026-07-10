// Observe-packet assembly — a pure function of world state (invariant #5).
//
// The same packet shape feeds the deterministic policy, the (M2) provider
// proposal, and the debug transcript. No data an NPC could not know ever
// enters its packet: everything here is visibility-checked.

import {
  visibleLedger,
  visibleObjects,
  visibleRecords,
  type WorldRole,
  type WorldState,
} from "../runtime/world/index.js";
import { toolCatalogForRole, type ActorContextLite, type ToolName } from "./tools.js";

/** Stable, editable role policy (docs/game/npc-agent-loop.md). */
export interface ActorPolicy {
  role: WorldRole;
  stableGoals: string[];
  priorityShifts: string[];
  forbiddenClaims: string[];
}

/** The NPC's own validated actions + ledger events it actually observed. */
export interface ActorMemory {
  actorId: string;
  ownActionNotes: string[];
  observedLedgerEventIds: string[];
}

export interface ObservePacket {
  actorId: string;
  role: WorldRole;
  landmarkId: string;
  goals: string[];
  actorPolicy: ActorPolicy;
  actorMemory: ActorMemory;
  visibleObjects: Array<{ objectId: string; label: string; state: string }>;
  visibleRecords: Array<{ recordId: string; kind: string; stateBody: string }>;
  visibleActors: string[];
  heardSpeech: string[];
  toolCatalog: ToolName[];
}

export interface AssembleObserveInput {
  actor: ActorContextLite;
  goals: string[];
  policy: ActorPolicy;
  memory: ActorMemory;
  heardSpeech: string[];
}

export function assembleObservePacket(world: WorldState, input: AssembleObserveInput): ObservePacket {
  const { actor } = input;
  const observedLedger = visibleLedger(world, actor.role);
  return {
    actorId: actor.actorId,
    role: actor.role,
    landmarkId: actor.landmarkId,
    goals: [...input.goals],
    actorPolicy: {
      role: input.policy.role,
      stableGoals: [...input.policy.stableGoals],
      priorityShifts: [...input.policy.priorityShifts],
      forbiddenClaims: [...input.policy.forbiddenClaims],
    },
    actorMemory: {
      actorId: input.memory.actorId,
      ownActionNotes: [...input.memory.ownActionNotes],
      // Fold in freshly observed ledger events (visibility already enforced).
      observedLedgerEventIds: [
        ...new Set([...input.memory.observedLedgerEventIds, ...observedLedger.map(e => e.eventId)]),
      ],
    },
    visibleObjects: visibleObjects(world, actor.role).map(o => ({
      objectId: o.objectId,
      label: o.label,
      state: o.state,
    })),
    visibleRecords: visibleRecords(world, actor.role).map(r => ({
      recordId: r.recordId,
      kind: r.kind,
      stateBody: r.stateBody,
    })),
    visibleActors: [...actor.knownActorIds],
    heardSpeech: [...input.heardSpeech],
    toolCatalog: toolCatalogForRole(actor.role),
  };
}

export function summarizeObservePacket(packet: ObservePacket): string {
  return [
    `role=${packet.role}`,
    `at=${packet.landmarkId}`,
    `objects=${packet.visibleObjects.length}`,
    `records=${packet.visibleRecords.length}`,
    `tools=${packet.toolCatalog.length}`,
    `goal=${packet.goals[0] ?? "none"}`,
  ].join(" ");
}

export const DEFAULT_ROLE_POLICIES: Record<WorldRole, ActorPolicy> = {
  player: { role: "player", stableGoals: [], priorityShifts: [], forbiddenClaims: [] },
  store_clerk: {
    role: "store_clerk",
    stableGoals: ["finish service", "keep receipt clean", "reduce queue delay"],
    priorityShifts: ["if record burden rises, correction or note becomes more attractive"],
    forbiddenClaims: ["do not explain Dream Law", "do not decide Station outcome"],
  },
  store_manager: {
    role: "store_manager",
    stableGoals: ["reduce store liability", "keep reports orderly"],
    priorityShifts: ["if burden or attention rises, file report becomes more attractive"],
    forbiddenClaims: ["do not decide verdict"],
  },
  waiting_customer: {
    role: "waiting_customer",
    stableGoals: ["keep queue moving", "avoid public disruption"],
    priorityShifts: ["if service pauses, complain/leave becomes more attractive"],
    forbiddenClaims: ["do not narrate the dream"],
  },
  station_officer: {
    role: "station_officer",
    stableGoals: ["reconcile records", "reduce contradiction"],
    priorityShifts: ["if attention rises, cite the exact ledger event and narrow answer shape"],
    forbiddenClaims: ["do not decide verdict through wording", "do not validate unsupported claims"],
  },
};
