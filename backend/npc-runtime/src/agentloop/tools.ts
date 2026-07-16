// The NPC agent-loop tool catalog (docs/game/npc-agent-loop.md, ≤ 8 tools).
//
// Tools are the ONLY way the world mutates. Each validator checks a proposed
// call against the world, role authority, visibility, and object state. A
// validated mutating tool yields exactly one `WorldMutation`; the engine
// applies it, producing exactly one civic ledger event (invariant #4).

import {
  findLedgerEvent,
  findObject,
  visibleObjects,
  visibleRecords,
  type CivicEconomyDelta,
  type RecordKind,
  type WorldRole,
  type WorldState,
  type WorldMutation,
} from "../runtime/world/index.js";

export const TOOL_NAMES = [
  "move_to",
  "look",
  "talk_to",
  "wait",
  "use_object",
  "write_record",
  "read_record",
  "request",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
  utterance?: string;
}

export interface ActorContextLite {
  actorId: string;
  role: WorldRole;
  landmarkId: string;
  knownActorIds: string[];
  knownLandmarkIds: string[];
}

export type ToolValidation =
  | { ok: true; mutation?: WorldMutation; note: string }
  | { ok: false; reason: ToolBlockReason; detail: string };

export type ToolBlockReason =
  | "unreachable"
  | "not_visible"
  | "target_unavailable"
  | "affordance_unavailable"
  | "role_authority_exceeded"
  | "record_visibility_denied"
  | "cited_event_unknown"
  | "cited_event_not_visible"
  | "invalid_args";

/** Which ledger-event kinds a role is allowed to author. */
export const ROLE_LEDGER_AUTHORITY: Record<WorldRole, ReadonlySet<string>> = {
  player: new Set<string>(),
  store_clerk: new Set([
    "usual_order_cited",
    "usual_order_read",
    "store_sale_normal",
    "store_receipt_marked",
    "correction_offered",
    "store_sale_corrected",
    "store_exception_reported",
    "service_paused",
    "service_resumed",
  ]),
  store_manager: new Set([
    "store_exception_reported",
    "store_report_escalated",
    "service_paused",
    "service_resumed",
    "correction_offered",
  ]),
  waiting_customer: new Set([
    "queue_state_observed",
    "queue_routine_kept",
    "queue_wary_noted",
    "queue_delay_noted",
  ]),
  studio_receptionist: new Set(["record_written", "record_updated", "record_read"]),
  studio_manager: new Set(["record_written", "record_updated", "record_read"]),
  office_worker: new Set(["record_written", "record_updated", "record_read"]),
  park_caretaker: new Set(["record_written", "record_updated", "record_read"]),
  station_officer: new Set([
    "record_written",
    "record_updated",
    "record_read",
    "station_record_cited",
    "station_correction_recorded",
  ]),
  roaming_liaison: new Set(["record_written", "record_updated", "record_read"]),
};

/** Object affordances are separate from administrative ledger authority. */
const ROLE_OBJECT_AUTHORITY: Record<WorldRole, boolean> = {
  player: false,
  store_clerk: true,
  store_manager: true,
  waiting_customer: true,
  studio_receptionist: false,
  studio_manager: false,
  office_worker: false,
  park_caretaker: false,
  station_officer: false,
  roaming_liaison: false,
};

/** Which record kinds a role may author. */
export const ROLE_RECORD_AUTHORITY: Record<WorldRole, ReadonlySet<RecordKind>> = {
  player: new Set<RecordKind>(),
  store_clerk: new Set<RecordKind>(["receipt", "clerk_statement", "correction"]),
  store_manager: new Set<RecordKind>(["clerk_statement", "report"]),
  waiting_customer: new Set<RecordKind>(["posting"]),
  studio_receptionist: new Set<RecordKind>(["note", "correction"]),
  studio_manager: new Set<RecordKind>(["note", "correction", "report"]),
  office_worker: new Set<RecordKind>(["note", "correction"]),
  park_caretaker: new Set<RecordKind>(["note", "posting", "report"]),
  station_officer: new Set<RecordKind>(["note", "correction", "report", "dossier", "citation"]),
  roaming_liaison: new Set<RecordKind>(["note"]),
};

export function recordKindsForRole(role: WorldRole): RecordKind[] {
  return [...ROLE_RECORD_AUTHORITY[role]];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

/** The set of tool names offered to a role, derived from role authority. */
export function toolCatalogForRole(role: WorldRole): ToolName[] {
  const base: ToolName[] = ["move_to", "look", "talk_to", "wait", "read_record"];
  if (ROLE_OBJECT_AUTHORITY[role]) {
    base.push("use_object");
  }
  if (ROLE_RECORD_AUTHORITY[role].size > 0) {
    base.push("write_record");
  }
  if (role !== "player") {
    base.push("request");
  }
  return base;
}

export function validateToolCall(
  world: WorldState,
  actor: ActorContextLite,
  call: ToolCall,
): ToolValidation {
  switch (call.tool) {
    case "move_to":
      return validateMoveTo(actor, call);
    case "look":
      return validateLook(world, actor, call);
    case "talk_to":
      return validateTalkTo(actor, call);
    case "wait":
      return { ok: true, note: `${actor.role} waited: ${asString(call.args.reason) ?? "yield"}` };
    case "use_object":
      return validateUseObject(world, actor, call);
    case "write_record":
      return validateWriteRecord(world, actor, call);
    case "read_record":
      return validateReadRecord(world, actor, call);
    case "request":
      return validateRequest(actor, call);
    default:
      return { ok: false, reason: "invalid_args", detail: `unknown tool: ${String(call.tool)}` };
  }
}

function validateMoveTo(actor: ActorContextLite, call: ToolCall): ToolValidation {
  const targetId = asString(call.args.targetId);
  if (!targetId) {
    return { ok: false, reason: "invalid_args", detail: "move_to requires targetId" };
  }
  if (!actor.knownLandmarkIds.includes(targetId) && !actor.knownActorIds.includes(targetId)) {
    return { ok: false, reason: "unreachable", detail: `${targetId} is not reachable` };
  }
  return { ok: true, note: `${actor.role} moved toward ${targetId}` };
}

function validateLook(world: WorldState, actor: ActorContextLite, call: ToolCall): ToolValidation {
  const targetId = asString(call.args.targetId);
  if (!targetId) {
    return { ok: false, reason: "invalid_args", detail: "look requires targetId" };
  }
  const seesObject = visibleObjects(world, actor.role).some(o => o.objectId === targetId);
  const seesActor = actor.knownActorIds.includes(targetId);
  const seesRecord = visibleRecords(world, actor.role).some(r => r.recordId === targetId);
  if (!seesObject && !seesActor && !seesRecord) {
    return { ok: false, reason: "not_visible", detail: `${actor.role} cannot see ${targetId}` };
  }
  return { ok: true, note: `${actor.role} looked at ${targetId}` };
}

function validateTalkTo(actor: ActorContextLite, call: ToolCall): ToolValidation {
  const targetId = asString(call.args.actorId);
  if (!targetId) {
    return { ok: false, reason: "invalid_args", detail: "talk_to requires actorId" };
  }
  if (!actor.knownActorIds.includes(targetId)) {
    return { ok: false, reason: "target_unavailable", detail: `${targetId} is not present` };
  }
  return { ok: true, note: `${actor.role} spoke to ${targetId}` };
}

function validateUseObject(world: WorldState, actor: ActorContextLite, call: ToolCall): ToolValidation {
  const objectId = asString(call.args.objectId);
  const toState = asString(call.args.toState);
  const ledgerKind = asString(call.args.ledgerKind);
  if (!objectId || !toState || !ledgerKind) {
    return { ok: false, reason: "invalid_args", detail: "use_object requires objectId, toState, ledgerKind" };
  }
  const object = findObject(world, objectId);
  if (!object || !object.visibleTo.includes(actor.role)) {
    return { ok: false, reason: "not_visible", detail: `${actor.role} cannot use ${objectId}` };
  }
  if (!ROLE_LEDGER_AUTHORITY[actor.role].has(ledgerKind)) {
    return { ok: false, reason: "role_authority_exceeded", detail: `${actor.role} cannot author ${ledgerKind}` };
  }
  const mutation: WorldMutation = {
    kind: ledgerKind,
    actorId: actor.actorId,
    actorRole: actor.role,
    objectId,
    toState,
    economyDelta: call.args.economyDelta as CivicEconomyDelta | undefined,
    whyLine: asString(call.args.whyLine) ?? `${actor.role} used ${objectId}`,
  };
  return { ok: true, mutation, note: `${actor.role} used ${objectId} -> ${toState}` };
}

function validateWriteRecord(world: WorldState, actor: ActorContextLite, call: ToolCall): ToolValidation {
  const ledgerKind = asString(call.args.ledgerKind);
  const record = call.args.record as WorldMutation["record"] | undefined;
  if (!ledgerKind || !record || !asString(record.recordId)) {
    return { ok: false, reason: "invalid_args", detail: "write_record requires ledgerKind and a record" };
  }
  if (!ROLE_RECORD_AUTHORITY[actor.role].has(record.kind)) {
    return { ok: false, reason: "role_authority_exceeded", detail: `${actor.role} cannot author ${record.kind}` };
  }
  if (!ROLE_LEDGER_AUTHORITY[actor.role].has(ledgerKind)) {
    return { ok: false, reason: "role_authority_exceeded", detail: `${actor.role} cannot author ${ledgerKind}` };
  }
  const objectId = asString(call.args.objectId);
  if (objectId) {
    const object = findObject(world, objectId);
    if (!object || !object.visibleTo.includes(actor.role)) {
      return { ok: false, reason: "not_visible", detail: `${actor.role} cannot reach ${objectId}` };
    }
  }
  const citedLedgerEventId = asString(call.args.citedLedgerEventId);
  if (citedLedgerEventId) {
    const cited = findLedgerEvent(world, citedLedgerEventId);
    if (!cited) {
      return { ok: false, reason: "cited_event_unknown", detail: `unknown ledger event: ${citedLedgerEventId}` };
    }
    if (!cited.visibleTo.includes(actor.role)) {
      return { ok: false, reason: "cited_event_not_visible", detail: `${actor.role} cannot cite unobserved ${citedLedgerEventId}` };
    }
  }
  const mutation: WorldMutation = {
    kind: ledgerKind,
    actorId: actor.actorId,
    actorRole: actor.role,
    objectId,
    toState: asString(call.args.toState),
    record,
    citedLedgerEventId,
    economyDelta: call.args.economyDelta as CivicEconomyDelta | undefined,
    whyLine: asString(call.args.whyLine) ?? `${actor.role} wrote ${record.kind}`,
  };
  return { ok: true, mutation, note: `${actor.role} wrote ${record.kind} (${record.recordId})` };
}

function validateReadRecord(world: WorldState, actor: ActorContextLite, call: ToolCall): ToolValidation {
  const recordId = asString(call.args.recordId);
  if (!recordId) {
    return { ok: false, reason: "invalid_args", detail: "read_record requires recordId" };
  }
  const visible = visibleRecords(world, actor.role).some(r => r.recordId === recordId);
  if (!visible) {
    return { ok: false, reason: "record_visibility_denied", detail: `${actor.role} cannot read ${recordId}` };
  }
  return { ok: true, note: `${actor.role} read ${recordId}` };
}

function validateRequest(actor: ActorContextLite, call: ToolCall): ToolValidation {
  const targetActorId = asString(call.args.targetActorId);
  const action = asString(call.args.action);
  if (!targetActorId || !action) {
    return { ok: false, reason: "invalid_args", detail: "request requires targetActorId and action" };
  }
  if (!actor.knownActorIds.includes(targetActorId)) {
    return { ok: false, reason: "target_unavailable", detail: `${targetActorId} is not present` };
  }
  const mutation: WorldMutation = {
    kind: "handoff_requested",
    actorId: actor.actorId,
    actorRole: actor.role,
    economyDelta: { favor: 1 },
    visibleTo: ["player", actor.role],
    whyLine: asString(call.args.whyLine) ?? `${actor.role} requested ${action} from ${targetActorId}`,
  };
  return { ok: true, mutation, note: `${actor.role} requested ${action} from ${targetActorId}` };
}
