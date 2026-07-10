import type { CivicEconomy, WorldObject, WorldRecord, WorldState } from "./types.js";

export * from "./types.js";
export * from "./state.js";

export const SAME_ORDER_INITIAL_ECONOMY: CivicEconomy = {
  accountCredit: 3,
  localTrust: 50,
  recordBurden: 0,
  stationAttention: 0,
  favor: 0,
};

/**
 * Seed the Store/Station record-prop cluster for the Same Order storylet.
 * Objects and records carry Korean labels and role-scoped visibility. This is
 * the deterministic starting world before any conversation begins.
 */
export function createSameOrderWorld(): WorldState {
  const objects: WorldObject[] = [
    {
      objectId: "store_queue_mark",
      label: "줄 표식",
      state: "player_waiting",
      visibleTo: ["player", "store_clerk", "waiting_customer"],
    },
    {
      objectId: "store_counter",
      label: "상점 계산대",
      state: "serving",
      visibleTo: ["player", "store_clerk", "store_manager", "waiting_customer"],
    },
    {
      objectId: "usual_order_cue",
      label: "같은 주문 안내판",
      state: "read",
      visibleTo: ["player", "store_clerk", "store_manager"],
    },
    {
      objectId: "receipt_tray",
      label: "영수증 트레이",
      state: "blank",
      visibleTo: ["player", "store_clerk", "store_manager"],
      recordId: "store_same_order_receipt",
    },
    {
      objectId: "correction_slip",
      label: "정정표",
      state: "absent",
      visibleTo: ["player", "store_clerk", "store_manager"],
      recordId: "store_same_order_correction",
    },
    {
      objectId: "report_tray",
      label: "보고 트레이",
      state: "empty",
      visibleTo: ["store_clerk", "store_manager", "station_officer"],
      recordId: "store_same_order_clerk_statement",
    },
    {
      objectId: "station_dossier",
      label: "스테이션 조서",
      state: "absent",
      visibleTo: ["player", "station_officer"],
      recordId: "station_same_order_dossier",
    },
  ];

  const records: WorldRecord[] = [
    {
      recordId: "store_same_order_receipt",
      kind: "receipt",
      authorRole: "store_clerk",
      targetId: "player",
      stateBody: "영수증 없음.",
      visibleTo: ["player", "store_clerk", "store_manager"],
    },
    {
      recordId: "store_yesterday_same_order",
      kind: "receipt",
      authorRole: "store_clerk",
      targetId: "player",
      stateBody: "어제 기록: 같은 주문, 표식 하나.",
      visibleTo: ["player", "store_clerk", "store_manager", "station_officer"],
    },
  ];

  return {
    objects,
    records,
    ledger: [],
    economy: { ...SAME_ORDER_INITIAL_ECONOMY },
    nextSeq: 1,
  };
}
