// Observe-packet assembly — a pure function of world state (invariant #5).
//
// The same packet shape feeds live providers, fallback, scripted tests, and
// the debug transcript. No data an NPC could not know ever
// enters its packet: everything here is visibility-checked.

import {
  visibleLedger,
  visibleObjects,
  visibleRecords,
  type WorldRole,
  type WorldState,
} from "../runtime/world/index.js";
import {
  recordKindsForRole,
  toolCatalogForRole,
  type ActorContextLite,
  type ToolName,
} from "./tools.js";

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

/** Authored identity and voice for this exact actor, never another resident. */
export interface ObserveActorContext {
  sourceLocale: "ko-KR";
  publicIdentity: string;
  personality: string[];
  voice: {
    register: string;
    cadence: string;
    avoid: string[];
  };
}

/** Holder-only motivation and prior relationships; never evidence about the player. */
export interface ObserveSelfContext {
  selfOnlyPressures: string[];
  knownRelationships: Array<{
    actorId: string;
    facts: string[];
  }>;
  residentKnownFacts: string[];
}

export interface ObservePacket {
  actorId: string;
  role: WorldRole;
  landmarkId: string;
  goals: string[];
  actorPolicy: ActorPolicy;
  actorContext: ObserveActorContext | null;
  selfContext: ObserveSelfContext | null;
  actorMemory: ActorMemory;
  visibleObjects: Array<{ objectId: string; label: string; state: string }>;
  visibleRecords: Array<{
    recordId: string;
    kind: string;
    stateBody: string;
    recordRevision?: number;
    authorActorId?: string;
    sourceMemoryId?: string;
    textSurfaceId?: string;
  }>;
  visibleLedgerEvents: Array<{
    eventId: string;
    kind: string;
    actorId: string;
    recordId?: string;
  }>;
  visibleActors: string[];
  /** Engine-confirmed actors whose speech reaches this listener now. */
  audibleActorIds: string[];
  /** Engine-confirmed navigation targets available to this actor now. */
  reachableAnchorRefs: string[];
  /** One runtime-selected, engine-grounded opportunity to approach the player. */
  playerContact: null | {
    available: boolean;
    targetActorId: "player";
    interactionZoneId: string;
    playerLocationId: string;
    visible: boolean;
    audible: boolean;
    reachable: boolean;
    safeDistanceM: number;
  };
  heardSpeech: string[];
  toolCatalog: ToolName[];
  administrativeSources: Array<{
    memoryId: string;
    kind: string;
    originActorId: string;
    summary: string;
    whyLine: string;
    reportDelta: number;
  }>;
  administrativeAuthority: {
    allowedRecordKinds: string[];
    writableTextSurfaceIds: string[];
  };
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
    // The retained M1/M2 Session path has no M3R cast authority.
    actorContext: null,
    selfContext: null,
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
    visibleLedgerEvents: observedLedger.map(event => ({
      eventId: event.eventId,
      kind: event.kind,
      actorId: event.actorId,
      recordId: event.recordId,
    })),
    visibleActors: [...actor.knownActorIds],
    audibleActorIds: [],
    reachableAnchorRefs: [],
    playerContact: null,
    heardSpeech: [...input.heardSpeech],
    toolCatalog: toolCatalogForRole(actor.role),
    administrativeSources: [],
    administrativeAuthority: {
      allowedRecordKinds: recordKindsForRole(actor.role),
      writableTextSurfaceIds: [],
    },
  };
}

export function summarizeObservePacket(packet: ObservePacket): string {
  return [
    `role=${packet.role}`,
    `at=${packet.landmarkId}`,
    `objects=${packet.visibleObjects.length}`,
    `records=${packet.visibleRecords.length}`,
    `ledger=${packet.visibleLedgerEvents.length}`,
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
  studio_receptionist: {
    role: "studio_receptionist",
    stableGoals: ["understand why a visitor arrived", "keep the reception procedure clear"],
    priorityShifts: ["ask a narrower follow-up when the visitor's account is unclear"],
    forbiddenClaims: ["do not invent approval", "do not decide the hearing"],
  },
  studio_manager: {
    role: "studio_manager",
    stableGoals: ["keep studio review work orderly", "resolve exceptions through visible procedure"],
    priorityShifts: ["seek firsthand clarification before escalating an exception"],
    forbiddenClaims: ["do not decide the hearing"],
  },
  office_worker: {
    role: "office_worker",
    stableGoals: ["complete office confirmations", "separate known facts from hearsay"],
    priorityShifts: ["ask the source when a claim cannot be attributed"],
    forbiddenClaims: ["do not claim knowledge that was not heard or read"],
  },
  park_caretaker: {
    role: "park_caretaker",
    stableGoals: ["keep the park usable", "notice public activity without inventing motives"],
    priorityShifts: ["speak directly when a public concern needs clarification"],
    forbiddenClaims: ["do not turn observation into an unsupported verdict"],
  },
  station_officer: {
    role: "station_officer",
    stableGoals: ["reconcile records", "reduce contradiction"],
    priorityShifts: ["if attention rises, cite the exact ledger event and narrow answer shape"],
    forbiddenClaims: ["do not decide verdict through wording", "do not validate unsupported claims"],
  },
  roaming_liaison: {
    role: "roaming_liaison",
    stableGoals: ["carry only attributed information", "connect residents through real conversation"],
    priorityShifts: ["verify who said a claim before repeating it"],
    forbiddenClaims: ["do not summarize a conversation that never occurred"],
  },
};
