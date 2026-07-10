import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMutation,
  createSameOrderWorld,
  visibleLedger,
  visibleRecords,
  type WorldMutation,
} from "../../src/runtime/world/index.js";

test("the seed world exposes the five civic economy values and no ledger", () => {
  const world = createSameOrderWorld();
  assert.deepEqual(Object.keys(world.economy).sort(), [
    "accountCredit",
    "favor",
    "localTrust",
    "recordBurden",
    "stationAttention",
  ]);
  assert.equal(world.ledger.length, 0);
});

test("every mutation emits exactly one ledger event and does not mutate the input", () => {
  const world = createSameOrderWorld();
  const mutation: WorldMutation = {
    kind: "store_sale_normal",
    actorId: "NPC_Store_Clerk",
    actorRole: "store_clerk",
    objectId: "receipt_tray",
    toState: "normal",
    economyDelta: { accountCredit: -1, localTrust: 5 },
    whyLine: "정상 판매 영수증을 발행했습니다.",
  };
  const result = applyMutation(world, mutation);

  assert.equal(result.world.ledger.length, 1);
  assert.equal(result.event.eventId, "led-1");
  assert.equal(result.event.seq, 1);
  assert.equal(result.world.economy.accountCredit, 2);
  assert.equal(result.world.economy.localTrust, 55);
  // input untouched (immutability)
  assert.equal(world.ledger.length, 0);
  assert.equal(world.economy.accountCredit, 3);
});

test("visibility rules hide records and ledger events from roles that cannot read them", () => {
  const world = createSameOrderWorld();
  const mutation: WorldMutation = {
    kind: "store_exception_reported",
    actorId: "NPC_Store_Clerk",
    actorRole: "store_clerk",
    objectId: "report_tray",
    toState: "pending",
    record: {
      recordId: "store_same_order_clerk_statement",
      kind: "clerk_statement",
      targetId: "player",
      stateBody: "상점 기록에 맞지 않아 보고 대기.",
      visibleTo: ["store_clerk", "store_manager", "station_officer"],
    },
    visibleTo: ["store_clerk", "store_manager", "station_officer"],
    whyLine: "정정표로 남기겠습니다.",
  };
  const { world: next } = applyMutation(world, mutation);

  const playerRecordIds = visibleRecords(next, "player").map(r => r.recordId);
  assert.ok(!playerRecordIds.includes("store_same_order_clerk_statement"));
  const officerRecordIds = visibleRecords(next, "station_officer").map(r => r.recordId);
  assert.ok(officerRecordIds.includes("store_same_order_clerk_statement"));

  const playerLedger = visibleLedger(next, "player").map(e => e.eventId);
  assert.ok(!playerLedger.includes("led-1"));
  const officerLedger = visibleLedger(next, "station_officer").map(e => e.eventId);
  assert.ok(officerLedger.includes("led-1"));
});

test("a citation carries the exact prior ledger event id", () => {
  const world = createSameOrderWorld();
  const storeEvent = applyMutation(world, {
    kind: "store_exception_reported",
    actorId: "NPC_Store_Clerk",
    actorRole: "store_clerk",
    objectId: "report_tray",
    toState: "pending",
    visibleTo: ["store_clerk", "store_manager", "station_officer"],
    whyLine: "보고 남김.",
  });
  const cite = applyMutation(storeEvent.world, {
    kind: "station_record_cited",
    actorId: "NPC_Station_Officer",
    actorRole: "station_officer",
    objectId: "station_dossier",
    toState: "cited",
    citedLedgerEventId: storeEvent.event.eventId,
    whyLine: "상점 기록을 기준으로 대조하겠습니다.",
  });
  assert.equal(cite.event.citedLedgerEventId, storeEvent.event.eventId);
  assert.equal(cite.event.citedLedgerEventId, "led-1");
});
