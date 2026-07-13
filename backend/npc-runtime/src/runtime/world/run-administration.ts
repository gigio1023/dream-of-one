import type { RecordKind, WorldRole } from "./types.js";
import type {
  RunAdministrationDelta,
  RunLedgerEvent,
  RunOpenQuestion,
  RunRecord,
  RunRecordReadMemory,
} from "../run-schema.js";

export const ADMIN_PRESSURE_DELTA_CAP = 25;

export interface ValidatedRecordWrite {
  tool: "write_record";
  recordKind: RecordKind;
  sourceMemoryId: string;
  /** Internal non-record evidence root used to prevent pressure echo loops. */
  rootSourceMemoryId: string;
  originActorId: string;
  stateBody: string;
  whyLine: string;
  institutionalPressureDelta: number;
  textSurfaceId: string;
  recordId?: string;
  visibleToActorIds: string[];
  openQuestion: RunOpenQuestion | null;
}

export interface ValidatedRecordRead {
  tool: "read_record";
  recordId: string;
  sourceMemoryId: string;
  /** Internal non-record evidence root used to prevent pressure echo loops. */
  rootSourceMemoryId: string;
  whyLine: string;
  institutionalPressureDelta: number;
  openQuestion: RunOpenQuestion | null;
}

export type ValidatedAdministrativeAction = ValidatedRecordWrite | ValidatedRecordRead;

export interface ApplyAdministrationInput {
  runId: string;
  actorId: string;
  actorRole: WorldRole;
  action: ValidatedAdministrativeAction;
  records: RunRecord[];
  ledgerEvents: RunLedgerEvent[];
  institutionalPressure: number;
  worldSeconds: number;
  worldRevision: number;
  memoryId?: string;
}

export interface ApplyAdministrationResult {
  records: RunRecord[];
  ledgerEvents: RunLedgerEvent[];
  institutionalPressure: number;
  delta: RunAdministrationDelta;
  recordReadMemory?: RunRecordReadMemory;
}

function clampPressureDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    -ADMIN_PRESSURE_DELTA_CAP,
    Math.min(ADMIN_PRESSURE_DELTA_CAP, Math.trunc(value)),
  );
}

function clampPressure(value: number): number {
  return Math.max(0, Math.min(125, Math.trunc(value)));
}

/** Apply one already-validated run administrative action atomically. */
export function applyRunAdministration(input: ApplyAdministrationInput): ApplyAdministrationResult {
  const records = structuredClone(input.records);
  const ledgerEvents = structuredClone(input.ledgerEvents);
  const seq = ledgerEvents.length + 1;
  const eventId = `ledger:${input.runId}:${seq}`;
  const requestedDelta = clampPressureDelta(input.action.institutionalPressureDelta);
  const pressureAfter = clampPressure(input.institutionalPressure + requestedDelta);
  const pressureDelta = pressureAfter - input.institutionalPressure;
  let record: RunRecord;
  let eventKind: RunLedgerEvent["kind"];
  let recordReadMemory: RunRecordReadMemory | undefined;

  if (input.action.tool === "write_record") {
    const existingIndex = input.action.recordId
      ? records.findIndex(candidate => candidate.recordId === input.action.recordId)
      : -1;
    const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
    const recordId = existing?.recordId ?? `record:${input.runId}:${seq}`;
    const recordRevision = (existing?.recordRevision ?? 0) + 1;
    record = {
      recordId,
      kind: input.action.recordKind,
      authorActorId: input.actorId,
      authorRole: input.actorRole as RunRecord["authorRole"],
      targetId: "player",
      stateBody: input.action.stateBody,
      visibleToActorIds: [...new Set(input.action.visibleToActorIds)].sort(),
      sourceRefs: [{
        sourceMemoryId: input.action.sourceMemoryId,
        originActorId: input.action.originActorId,
      }],
      textSurfaceId: input.action.textSurfaceId,
      createdWorldSeconds: existing?.createdWorldSeconds ?? input.worldSeconds,
      createdWorldRevision: existing?.createdWorldRevision ?? input.worldRevision,
      recordRevision,
      lastLedgerEventId: eventId,
    };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    eventKind = existing ? "record_updated" : "record_written";
  } else {
    const existingIndex = records.findIndex(candidate => candidate.recordId === input.action.recordId);
    const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
    if (!existing) throw new Error(`validated record disappeared: ${input.action.recordId}`);
    record = { ...existing, lastLedgerEventId: eventId };
    records[existingIndex] = record;
    eventKind = "record_read";
  }

  const event: RunLedgerEvent = {
    eventId,
    seq,
    kind: eventKind,
    actorId: input.actorId,
    actorRole: input.actorRole as RunLedgerEvent["actorRole"],
    recordId: record.recordId,
    sourceMemoryId: input.action.sourceMemoryId,
    recordRevision: record.recordRevision,
    pressureBefore: input.institutionalPressure,
    pressureDelta,
    pressureAfter,
    visibleToActorIds: [...record.visibleToActorIds],
    whyLine: input.action.whyLine,
    openQuestion: structuredClone(input.action.openQuestion),
    worldSeconds: input.worldSeconds,
    worldRevision: input.worldRevision,
  };
  ledgerEvents.push(event);

  if (input.action.tool === "read_record") {
    if (!input.memoryId) throw new Error("record read requires a memory id");
    recordReadMemory = {
      memoryId: input.memoryId,
      kind: "record_read",
      sourceActorId: record.authorActorId,
      listenerActorId: input.actorId,
      recordId: record.recordId,
      recordRevision: record.recordRevision,
      sourceMemoryId: input.action.sourceMemoryId,
      stateBody: record.stateBody,
      whyLine: input.action.whyLine,
      ledgerEventId: event.eventId,
      worldSeconds: input.worldSeconds,
      worldRevision: input.worldRevision,
    };
  }

  return {
    records,
    ledgerEvents,
    institutionalPressure: pressureAfter,
    delta: {
      kind: "administration",
      action: input.action.tool,
      record: structuredClone(record),
      ledgerEvent: structuredClone(event),
      pressureBefore: input.institutionalPressure,
      pressureAfter,
    },
    ...(recordReadMemory ? { recordReadMemory } : {}),
  };
}
