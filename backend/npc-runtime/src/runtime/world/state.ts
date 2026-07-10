import {
  CIVIC_ECONOMY_KEYS,
  type CivicEconomy,
  type CivicEconomyDelta,
  type LedgerEvent,
  type WorldMutation,
  type WorldObject,
  type WorldRecord,
  type WorldRole,
  type WorldState,
} from "./types.js";

const ECONOMY_BOUNDS: Record<keyof CivicEconomy, { min: number; max: number }> = {
  accountCredit: { min: 0, max: 999 },
  localTrust: { min: 0, max: 100 },
  recordBurden: { min: 0, max: 100 },
  stationAttention: { min: 0, max: 100 },
  favor: { min: 0, max: 100 },
};

function clampEconomyValue(key: keyof CivicEconomy, value: number): number {
  const bounds = ECONOMY_BOUNDS[key];
  if (!Number.isFinite(value)) {
    return bounds.min;
  }
  return Math.max(bounds.min, Math.min(bounds.max, Math.floor(value)));
}

export function applyEconomyDelta(economy: CivicEconomy, delta: CivicEconomyDelta): CivicEconomy {
  const next: CivicEconomy = { ...economy };
  for (const key of CIVIC_ECONOMY_KEYS) {
    const change = delta[key];
    if (typeof change === "number") {
      next[key] = clampEconomyValue(key, economy[key] + change);
    }
  }
  return next;
}

export function cloneWorld(world: WorldState): WorldState {
  return {
    objects: world.objects.map(object => ({ ...object, visibleTo: [...object.visibleTo] })),
    records: world.records.map(record => ({ ...record, visibleTo: [...record.visibleTo] })),
    ledger: world.ledger.map(event => ({
      ...event,
      economyDelta: { ...event.economyDelta },
      visibleTo: [...event.visibleTo],
    })),
    economy: { ...world.economy },
    nextSeq: world.nextSeq,
  };
}

export interface MutationResult {
  world: WorldState;
  event: LedgerEvent;
}

/**
 * The single world-mutation entry point. Applies one validated mutation and
 * appends exactly one civic ledger event (invariant #4). Returns a NEW world;
 * the input is not mutated.
 */
export function applyMutation(world: WorldState, mutation: WorldMutation): MutationResult {
  const next = cloneWorld(world);

  let object: WorldObject | undefined;
  if (mutation.objectId) {
    object = next.objects.find(candidate => candidate.objectId === mutation.objectId);
    if (object && typeof mutation.toState === "string") {
      object.state = mutation.toState;
    }
  }

  let record: WorldRecord | undefined;
  if (mutation.record) {
    record = next.records.find(candidate => candidate.recordId === mutation.record!.recordId);
    if (record) {
      record.kind = mutation.record.kind;
      record.authorRole = mutation.actorRole;
      record.targetId = mutation.record.targetId;
      record.stateBody = mutation.record.stateBody;
      record.visibleTo = [...mutation.record.visibleTo];
      if (mutation.record.capturedLine !== undefined) {
        record.capturedLine = mutation.record.capturedLine;
      }
    } else {
      record = {
        recordId: mutation.record.recordId,
        kind: mutation.record.kind,
        authorRole: mutation.actorRole,
        targetId: mutation.record.targetId,
        stateBody: mutation.record.stateBody,
        visibleTo: [...mutation.record.visibleTo],
        capturedLine: mutation.record.capturedLine,
      };
      next.records.push(record);
    }
    if (object && !object.recordId) {
      object.recordId = record.recordId;
    }
  }

  const seq = next.nextSeq;
  const event: LedgerEvent = {
    eventId: `led-${seq}`,
    seq,
    kind: mutation.kind,
    actorId: mutation.actorId,
    actorRole: mutation.actorRole,
    objectId: mutation.objectId,
    recordId: mutation.record?.recordId ?? object?.recordId,
    citedLedgerEventId: mutation.citedLedgerEventId,
    economyDelta: { ...(mutation.economyDelta ?? {}) },
    visibleTo: [...(mutation.visibleTo ?? object?.visibleTo ?? ["player", mutation.actorRole])],
    whyLine: mutation.whyLine,
  };
  next.nextSeq = seq + 1;

  if (record) {
    record.lastLedgerEventId = event.eventId;
  }
  if (mutation.economyDelta) {
    next.economy = applyEconomyDelta(next.economy, mutation.economyDelta);
  }
  next.ledger.push(event);

  return { world: next, event };
}

// ---------------------------------------------------------------------------
// Visibility rules — enforced here, never by convention (invariant #5).
// ---------------------------------------------------------------------------

export function visibleObjects(world: WorldState, role: WorldRole): WorldObject[] {
  return world.objects.filter(object => object.visibleTo.includes(role));
}

export function visibleRecords(world: WorldState, role: WorldRole): WorldRecord[] {
  return world.records.filter(record => record.visibleTo.includes(role));
}

export function visibleLedger(world: WorldState, role: WorldRole): LedgerEvent[] {
  return world.ledger.filter(event => event.visibleTo.includes(role));
}

export function findObject(world: WorldState, objectId: string): WorldObject | undefined {
  return world.objects.find(object => object.objectId === objectId);
}

export function findRecord(world: WorldState, recordId: string): WorldRecord | undefined {
  return world.records.find(record => record.recordId === recordId);
}

export function findLedgerEvent(world: WorldState, eventId: string): LedgerEvent | undefined {
  return world.ledger.find(event => event.eventId === eventId);
}
