// Deterministic world-state authority shared by live, fallback, and scripted proposals.
//
// Absorbs the generic core of the retired `runtime/agentic-environment.ts`
// proof file: records, an append-only civic ledger, the civic economy, and
// visibility rules. Storylet-specific seeding lives in the compiled storylet
// data (`data/storylets/*.json`), not here.
//
// Core invariant (docs/tech/npc-runtime.md #4): every world mutation happens
// through a validated tool application and emits exactly one civic ledger
// event. `applyMutation` in `state.ts` is the single enforcement point.

export const WORLD_ROLES = [
  "player",
  "store_clerk",
  "store_manager",
  "waiting_customer",
  "studio_receptionist",
  "studio_manager",
  "office_worker",
  "park_caretaker",
  "station_officer",
  "roaming_liaison",
] as const;

export type WorldRole = (typeof WORLD_ROLES)[number];

/** The five deliberately-crude civic economy values (docs/game/world-social-sim.md). */
export interface CivicEconomy {
  /** 계정 크레딧 — what the player can buy; Station fine option. */
  accountCredit: number;
  /** 신뢰 — choice availability; clerk probe threshold. */
  localTrust: number;
  /** 기록 부담 — manager's willingness to escalate. */
  recordBurden: number;
  /** 주시 — officer priority; inquest speed. */
  stationAttention: number;
  /** 신세 — whether an NPC helps or refuses a `request` handoff. */
  favor: number;
}

export type CivicEconomyDelta = Partial<CivicEconomy>;

export const CIVIC_ECONOMY_KEYS: readonly (keyof CivicEconomy)[] = [
  "accountCredit",
  "localTrust",
  "recordBurden",
  "stationAttention",
  "favor",
] as const;

/** Record kinds — the social medium (docs/game/glossary.md, world-social-sim.md). */
export const RECORD_KINDS = [
  "receipt",
  "clerk_statement",
  "correction",
  "report",
  "posting",
  "dossier",
  "citation",
] as const;

export type RecordKind = (typeof RECORD_KINDS)[number];

export interface WorldRecord {
  recordId: string;
  kind: RecordKind;
  /** Role that authored/last-authored the record. */
  authorRole: WorldRole;
  /** Who/what the record is about. */
  targetId: string;
  /** Human-readable state body (Korean, player-facing). */
  stateBody: string;
  /** Roles permitted to read the record (열람). */
  visibleTo: WorldRole[];
  /** Ledger event that last touched this record. */
  lastLedgerEventId?: string;
  /** Selected player line captured into the record, when applicable. */
  capturedLine?: string;
}

/** A record prop the player and NPCs can inspect and act on. */
export interface WorldObject {
  objectId: string;
  /** Player-facing Korean label. */
  label: string;
  state: string;
  visibleTo: WorldRole[];
  /** Associated record id, if this prop backs a record. */
  recordId?: string;
}

export interface LedgerEvent {
  eventId: string;
  seq: number;
  kind: string;
  actorId: string;
  actorRole: WorldRole;
  objectId?: string;
  recordId?: string;
  /** A prior ledger event this one cites (Station citation chain). */
  citedLedgerEventId?: string;
  economyDelta: CivicEconomyDelta;
  /** Roles that can observe this ledger event. */
  visibleTo: WorldRole[];
  /** Player-facing Korean explanation of the mutation. */
  whyLine: string;
}

export interface WorldState {
  objects: WorldObject[];
  records: WorldRecord[];
  ledger: LedgerEvent[];
  economy: CivicEconomy;
  nextSeq: number;
}

/**
 * A validated mutation ready to be applied. Tools produce these after their
 * validators pass; `applyMutation` turns one into exactly one ledger event.
 */
export interface WorldMutation {
  kind: string;
  actorId: string;
  actorRole: WorldRole;
  whyLine: string;
  /** Object to transition, and the state to transition it to. */
  objectId?: string;
  toState?: string;
  /** Record to create/update. */
  record?: {
    recordId: string;
    kind: RecordKind;
    targetId: string;
    stateBody: string;
    visibleTo: WorldRole[];
    capturedLine?: string;
  };
  citedLedgerEventId?: string;
  economyDelta?: CivicEconomyDelta;
  /** Ledger event visibility; defaults to the acting object's visibility. */
  visibleTo?: WorldRole[];
}
