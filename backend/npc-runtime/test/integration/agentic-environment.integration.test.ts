import assert from "node:assert/strict";
import test from "node:test";

import {
  createSameOrderAgenticEnvironment,
  getVisibleObjectIds,
  listAvailableEnvironmentActions,
  validateAndApplyEnvironmentAction,
  type AgentContext,
  type AgenticEnvironmentState,
  type CivicLedgerEvent,
} from "../../src/runtime/agentic-environment.js";

function actor(
  overrides: Partial<AgentContext> & Pick<AgentContext, "actorId" | "role">,
  environment: AgenticEnvironmentState = createSameOrderAgenticEnvironment(),
): AgentContext {
  return {
    perceivedObjectIds: getVisibleObjectIds(environment, overrides.role),
    knownLedgerEventIds: [],
    visibleEconomy: {
      accountCredit: true,
      localTrust: true,
      recordBurden: true,
      stationAttention: true,
    },
    ...overrides,
  };
}

function requireAccepted(result: ReturnType<typeof validateAndApplyEnvironmentAction>) {
  assert.equal(result.ok, true, result.ok ? "" : result.detail);
  return result;
}

function requireRejected(result: ReturnType<typeof validateAndApplyEnvironmentAction>) {
  assert.equal(result.ok, false, result.ok ? result.event.kind : "");
  return result;
}

test("Store Clerk can turn a clean Same Order line into a normal receipt ledger event", () => {
  const environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);

  const result = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "create_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player accepted the usual order, so the Store can close a normal receipt.",
  }));

  assert.equal(result.event.kind, "store_sale_normal");
  assert.equal(result.event.affordance, "create_receipt");
  assert.equal(result.event.recordId, "store_same_order_receipt");
  assert.deepEqual(result.event.economyDelta, { accountCredit: -1, localTrust: 5 });
  assert.equal(result.environment.economy.accountCredit, 2);
  assert.equal(result.environment.economy.localTrust, 55);
  assert.equal(result.environment.objects.find(item => item.objectId === "receipt_tray")?.state, "normal");
});

test("agent cannot use an affordance that the environment object does not expose", () => {
  const environment = createSameOrderAgenticEnvironment();
  const customer = actor({ actorId: "NPC_Waiting_Customer", role: "waiting_customer" }, environment);

  const result = requireRejected(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "create_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The waiting customer wants the queue to move.",
  }));

  assert.equal(result.reason, "object_not_perceived");
  assert.equal(result.environment.ledger.length, 0);
});

test("available action list is scoped by role perception and current object state", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);

  const initialActions = listAvailableEnvironmentActions(environment, clerk);
  const createReceipt = initialActions.find(action => action.affordance === "create_receipt" && action.objectId === "receipt_tray");
  assert.ok(createReceipt);
  assert.equal(createReceipt.actionId, "receipt_tray.create_receipt");
  assert.equal(createReceipt.validationRuleId, "same_order.receipt_tray.create_receipt");
  assert.deepEqual(createReceipt.eligibleRoles, ["store_clerk"]);
  assert.equal(createReceipt.visibleTo.includes("store_clerk"), true);
  assert.equal(createReceipt.failureReasons.includes("role_authority_exceeded"), true);
  assert.equal(
    initialActions.some(action => action.affordance === "forward_report" && action.objectId === "report_tray"),
    false,
  );

  const markedReceipt = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player broke the usual order, so the receipt is marked before any report is made.",
  }));
  environment = markedReceipt.environment;

  const followupActions = listAvailableEnvironmentActions(environment, actor({
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
  }, environment));
  assert.equal(
    followupActions.some(action => action.affordance === "create_receipt" && action.objectId === "receipt_tray"),
    false,
  );
  assert.equal(
    followupActions.some(action => action.affordance === "place_note" && action.objectId === "report_tray"),
    true,
  );
});

test("Store-side actor reacts to visible queue pressure without omniscient Station facts", () => {
  const environment = createSameOrderAgenticEnvironment();
  const queue = environment.objects.find(item => item.objectId === "store_queue_mark");
  assert.ok(queue);
  queue.state = "delayed";

  const customer = actor({ actorId: "NPC_Waiting_Customer", role: "waiting_customer" }, environment);
  const result = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    whyLine: "The service delay is visible in the queue, so the waiting customer reacts publicly.",
  }));

  assert.equal(result.event.kind, "queue_delay_noted");
  assert.equal(result.event.affordance, "complain_delay");
  assert.equal(result.event.objectId, "store_queue_mark");
  assert.equal(result.environment.economy.recordBurden, 5);
});

test("Waiting customer can keep a marked receipt locally wary without opening a report", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const marked = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player broke the usual routine, so the receipt gets marked without a report yet.",
  }));
  environment = marked.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [marked.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, customer)
    .find(candidate => candidate.affordance === "note_wary");

  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.deepEqual(action.citableLedgerEventIds, [marked.event.eventId]);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:-2", "recordBurden:+5"]);

  const wary = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "note_wary",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_wary",
    citedLedgerEventId: marked.event.eventId,
    whyLine: "The marked receipt is visible enough for the waiting customer to slow down without making a formal complaint.",
  }));

  assert.equal(wary.event.kind, "queue_wary_noted");
  assert.equal(wary.event.citedLedgerEventId, marked.event.eventId);
  assert.equal(wary.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "delayed");
  assert.equal(wary.environment.economy.localTrust, 43);
  assert.equal(wary.environment.economy.recordBurden, 20);
});

test("Park witness can post a public notice from a known Store record", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The player line creates a Store note that can move into public talk.",
  }));
  environment = report.environment;

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [report.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, witness)
    .find(candidate => candidate.affordance === "post_rumor");
  assert.ok(action);
  assert.equal(action.objectId, "park_notice_board");

  const rumor = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "post_rumor",
    objectId: "park_notice_board",
    recordId: "park_public_rumor",
    citedLedgerEventId: report.event.eventId,
    whyLine: "The Store note is becoming public talk, so the witness pins a small notice.",
  }));

  assert.equal(rumor.event.kind, "public_rumor_posted");
  assert.equal(rumor.event.citedLedgerEventId, report.event.eventId);
  assert.equal(rumor.environment.objects.find(item => item.objectId === "park_notice_board")?.state, "rumored");
  assert.equal(rumor.environment.economy.recordBurden, 40);
});

test("Store manager can pause counter service after a local report", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The unresolved line creates a Store note that makes normal service unsafe to continue.",
  }));
  environment = report.environment;

  const manager = actor({ actorId: "NPC_Store_Manager", role: "store_manager" }, environment);
  const action = listAvailableEnvironmentActions(environment, manager)
    .find(candidate => candidate.affordance === "pause_service");

  assert.ok(action);
  assert.equal(action.objectId, "store_counter");
  assert.deepEqual(action.civicEconomyEffects, ["recordBurden:+5"]);

  const paused = requireAccepted(validateAndApplyEnvironmentAction(environment, manager, {
    actorId: manager.actorId,
    role: manager.role,
    affordance: "pause_service",
    objectId: "store_counter",
    whyLine: "The report tray is pending, so the manager pauses counter service before taking more orders.",
  }));

  assert.equal(paused.event.kind, "service_paused");
  assert.equal(paused.event.affordance, "pause_service");
  assert.equal(paused.environment.objects.find(item => item.objectId === "store_counter")?.state, "paused");
  assert.equal(paused.environment.economy.recordBurden, 40);
});

test("Waiting customer can leave after paused service becomes visible", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The unresolved line creates a Store note that makes the line unstable.",
  }));
  environment = report.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [report.event.eventId],
  }, environment);
  const delayed = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_delay",
    citedLedgerEventId: report.event.eventId,
    whyLine: "The Store note slows the line, so the waiting customer complains.",
  }));
  environment = delayed.environment;

  const manager = actor({ actorId: "NPC_Store_Manager", role: "store_manager" }, environment);
  const paused = requireAccepted(validateAndApplyEnvironmentAction(environment, manager, {
    actorId: manager.actorId,
    role: manager.role,
    affordance: "pause_service",
    objectId: "store_counter",
    whyLine: "The pending report makes normal counter service unsafe to continue.",
  }));
  environment = paused.environment;

  const leavingCustomer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [paused.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, leavingCustomer)
    .find(candidate => candidate.affordance === "leave_queue");

  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.deepEqual(action.citableLedgerEventIds, [paused.event.eventId]);

  const left = requireAccepted(validateAndApplyEnvironmentAction(environment, leavingCustomer, {
    actorId: leavingCustomer.actorId,
    role: leavingCustomer.role,
    affordance: "leave_queue",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_left",
    citedLedgerEventId: paused.event.eventId,
    whyLine: "Counter service is paused, so the waiting customer leaves instead of waiting for the unresolved report.",
  }));

  assert.equal(left.event.kind, "queue_left");
  assert.equal(left.event.citedLedgerEventId, paused.event.eventId);
  assert.equal(left.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "empty");
  assert.equal(left.environment.economy.localTrust, 27);
  assert.equal(left.environment.economy.recordBurden, 50);
});

test("Waiting customer can accept a correction record and settle queue pressure", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const offered = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "offer_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The mismatch can still be repaired locally through a correction slip.",
  }));
  environment = offered.environment;

  const attached = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "attach_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The player accepts the correction, so the Store records a corrected sale instead of a report.",
  }));
  environment = attached.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [attached.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, customer)
    .find(candidate => candidate.affordance === "accept_repair");
  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:+5", "recordBurden:-5"]);

  const settled = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "accept_repair",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_repair",
    citedLedgerEventId: attached.event.eventId,
    whyLine: "The correction is visible enough for the queue to keep moving.",
  }));

  assert.equal(settled.event.kind, "queue_repair_accepted");
  assert.equal(settled.event.citedLedgerEventId, attached.event.eventId);
  assert.equal(settled.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "settled");
  assert.equal(settled.environment.economy.localTrust, 50);
  assert.equal(settled.environment.economy.recordBurden, 15);
});

test("Park witness can turn a correction record into public repair notice", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const offered = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "offer_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The mismatch can still be repaired locally through a correction slip.",
  }));
  environment = offered.environment;

  const attached = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "attach_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The player accepts the correction, so the Store records a corrected sale instead of a report.",
  }));
  environment = attached.environment;

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [attached.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, witness)
    .find(candidate => candidate.affordance === "post_repair_notice");

  assert.ok(action);
  assert.equal(action.objectId, "park_notice_board");
  assert.deepEqual(action.citableLedgerEventIds, [attached.event.eventId]);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:+3", "recordBurden:-5"]);

  const repairNotice = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "post_repair_notice",
    objectId: "park_notice_board",
    recordId: "park_public_repair_notice",
    citedLedgerEventId: attached.event.eventId,
    whyLine: "The correction record is public enough for the witness to note that it was repaired, not rumored.",
  }));

  assert.equal(repairNotice.event.kind, "public_repair_noted");
  assert.equal(repairNotice.event.citedLedgerEventId, attached.event.eventId);
  assert.equal(repairNotice.environment.objects.find(item => item.objectId === "park_notice_board")?.state, "clear");
  assert.equal(repairNotice.environment.economy.localTrust, 48);
  assert.equal(repairNotice.environment.economy.recordBurden, 15);
});

test("Park witness can publicly vouch for a kept routine record", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const receipt = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "create_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The accepted line matches the Store routine and creates a normal receipt.",
  }));
  environment = receipt.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [receipt.event.eventId],
  }, environment);
  const routine = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "accept_routine",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_routine",
    citedLedgerEventId: receipt.event.eventId,
    whyLine: "The waiting customer sees the normal receipt and keeps the queue routine intact.",
  }));
  environment = routine.environment;

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [routine.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, witness)
    .find(candidate => candidate.affordance === "vouch_routine");

  assert.ok(action);
  assert.equal(action.objectId, "park_notice_board");
  assert.deepEqual(action.citableLedgerEventIds, [routine.event.eventId]);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:+1"]);

  const vouched = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "vouch_routine",
    objectId: "park_notice_board",
    recordId: "park_public_routine_vouch",
    citedLedgerEventId: routine.event.eventId,
    whyLine: "The kept queue routine is visible enough for the witness to vouch for the player in public.",
  }));

  assert.equal(vouched.event.kind, "public_routine_vouched");
  assert.equal(vouched.event.citedLedgerEventId, routine.event.eventId);
  assert.equal(vouched.environment.objects.find(item => item.objectId === "park_notice_board")?.state, "vouched");
  assert.equal(vouched.environment.economy.localTrust, 58);
  assert.equal(vouched.environment.economy.recordBurden, 0);
});

test("High local trust unlocks a helpful waiting-customer tip after a public routine vouch", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const receipt = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "create_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The accepted line matches the Store routine and creates a normal receipt.",
  }));
  environment = receipt.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [receipt.event.eventId],
  }, environment);
  const routine = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "accept_routine",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_routine",
    citedLedgerEventId: receipt.event.eventId,
    whyLine: "The waiting customer sees the normal receipt and keeps the queue routine intact.",
  }));
  environment = routine.environment;

  assert.equal(
    listAvailableEnvironmentActions(environment, actor({
      actorId: "NPC_Waiting_Customer",
      role: "waiting_customer",
      knownLedgerEventIds: [routine.event.eventId],
    }, environment)).some(candidate => candidate.affordance === "share_local_tip"),
    false,
  );

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [routine.event.eventId],
  }, environment);
  const vouch = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "vouch_routine",
    objectId: "park_notice_board",
    recordId: "park_public_routine_vouch",
    citedLedgerEventId: routine.event.eventId,
    whyLine: "The kept queue routine is visible enough for the witness to vouch for the player in public.",
  }));
  environment = vouch.environment;

  const helpfulCustomer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [vouch.event.eventId],
  }, environment);
  assert.equal(helpfulCustomer.perceivedObjectIds.includes("park_notice_board"), true);
  const action = listAvailableEnvironmentActions(environment, helpfulCustomer)
    .find(candidate => candidate.affordance === "share_local_tip");

  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.equal(action.toState, "helped");
  assert.deepEqual(action.citableLedgerEventIds, [vouch.event.eventId]);
  assert.equal(action.preconditions.includes("localTrust>=55"), true);
  assert.equal(action.preconditions.includes("ledger_event_kind:public_routine_vouched"), true);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:+1", "recordBurden:-1"]);

  const tip = requireAccepted(validateAndApplyEnvironmentAction(environment, helpfulCustomer, {
    actorId: helpfulCustomer.actorId,
    role: helpfulCustomer.role,
    affordance: "share_local_tip",
    objectId: "store_queue_mark",
    recordId: "store_same_order_local_tip",
    citedLedgerEventId: vouch.event.eventId,
    whyLine: "Public trust is high enough that the waiting customer shares a local tip.",
  }));

  assert.equal(tip.event.kind, "local_tip_shared");
  assert.equal(tip.event.citedLedgerEventId, vouch.event.eventId);
  assert.equal(tip.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "helped");
  assert.equal(tip.environment.economy.localTrust, 59);
  assert.equal(tip.environment.economy.recordBurden, 0);

  environment = tip.environment;
  const studioPm = actor({
    actorId: "NPC_Studio_PM",
    role: "studio_pm",
    knownLedgerEventIds: [vouch.event.eventId],
  }, environment);
  assert.equal(studioPm.perceivedObjectIds.includes("park_notice_board"), true);
  assert.equal(studioPm.perceivedObjectIds.includes("studio_review_queue"), true);
  const studioAction = listAvailableEnvironmentActions(environment, studioPm)
    .find(candidate => candidate.affordance === "invite_review");

  assert.ok(studioAction);
  assert.equal(studioAction.objectId, "studio_review_queue");
  assert.equal(studioAction.toState, "invited");
  assert.deepEqual(studioAction.citableLedgerEventIds, [vouch.event.eventId]);
  assert.equal(studioAction.preconditions.includes("localTrust>=55"), true);
  assert.equal(studioAction.preconditions.includes("ledger_event_kind:public_routine_vouched"), true);
  assert.deepEqual(studioAction.civicEconomyEffects, ["localTrust:+1", "recordBurden:-1"]);

  const invite = requireAccepted(validateAndApplyEnvironmentAction(environment, studioPm, {
    actorId: studioPm.actorId,
    role: studioPm.role,
    affordance: "invite_review",
    objectId: "studio_review_queue",
    recordId: "studio_public_review_invite",
    citedLedgerEventId: vouch.event.eventId,
    whyLine: "The Studio PM reads the public routine vouch and opens a tiny review invite.",
  }));

  assert.equal(invite.event.kind, "studio_review_invited");
  assert.equal(invite.event.citedLedgerEventId, vouch.event.eventId);
  assert.equal(invite.environment.objects.find(item => item.objectId === "studio_review_queue")?.state, "invited");
  assert.equal(invite.environment.economy.localTrust, 60);
  assert.equal(invite.environment.economy.recordBurden, 0);
});

test("Park witness can post a public warning from a wary queue record", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const marked = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player line does not match the local routine, so the clerk marks the receipt.",
  }));
  environment = marked.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [marked.event.eventId],
  }, environment);
  const wary = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "note_wary",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_wary",
    citedLedgerEventId: marked.event.eventId,
    whyLine: "The waiting customer sees the marked receipt and slows the queue without filing a report.",
  }));
  environment = wary.environment;

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [wary.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, witness)
    .find(candidate => candidate.affordance === "post_warning");

  assert.ok(action);
  assert.equal(action.objectId, "park_notice_board");
  assert.deepEqual(action.citableLedgerEventIds, [wary.event.eventId]);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:-1", "recordBurden:+3"]);

  const warning = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "post_warning",
    objectId: "park_notice_board",
    recordId: "park_public_warning",
    citedLedgerEventId: wary.event.eventId,
    whyLine: "The wary queue record is visible enough for the witness to warn the player without formal reporting.",
  }));

  assert.equal(warning.event.kind, "public_warning_posted");
  assert.equal(warning.event.citedLedgerEventId, wary.event.eventId);
  assert.equal(warning.environment.objects.find(item => item.objectId === "park_notice_board")?.state, "warned");
  assert.equal(warning.environment.economy.localTrust, 42);
  assert.equal(warning.environment.economy.recordBurden, 23);
});

test("Public warning and low local trust make a waiting customer keep distance", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const marked = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player line does not match the local routine, so the clerk marks the receipt.",
  }));
  environment = marked.environment;

  const customer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [marked.event.eventId],
  }, environment);
  const wary = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "note_wary",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_wary",
    citedLedgerEventId: marked.event.eventId,
    whyLine: "The marked receipt makes the waiting customer slow down without making a formal report.",
  }));
  environment = wary.environment;

  assert.equal(
    listAvailableEnvironmentActions(environment, actor({
      actorId: "NPC_Waiting_Customer",
      role: "waiting_customer",
      knownLedgerEventIds: [wary.event.eventId],
    }, environment)).some(candidate => candidate.affordance === "keep_distance"),
    false,
  );

  const witness = actor({
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    knownLedgerEventIds: [wary.event.eventId],
  }, environment);
  const warning = requireAccepted(validateAndApplyEnvironmentAction(environment, witness, {
    actorId: witness.actorId,
    role: witness.role,
    affordance: "post_warning",
    objectId: "park_notice_board",
    recordId: "park_public_warning",
    citedLedgerEventId: wary.event.eventId,
    whyLine: "The wary queue record is visible enough for the witness to warn the player without formal reporting.",
  }));
  environment = warning.environment;

  const distancingCustomer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [warning.event.eventId],
  }, environment);
  assert.equal(distancingCustomer.perceivedObjectIds.includes("park_notice_board"), true);
  const action = listAvailableEnvironmentActions(environment, distancingCustomer)
    .find(candidate => candidate.affordance === "keep_distance");

  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.equal(action.toState, "distanced");
  assert.deepEqual(action.citableLedgerEventIds, [warning.event.eventId]);
  assert.equal(action.preconditions.includes("localTrust<=45"), true);
  assert.equal(action.preconditions.includes("ledger_event_kind:public_warning_posted"), true);
  assert.deepEqual(action.civicEconomyEffects, ["localTrust:-1", "recordBurden:+2"]);

  const distanced = requireAccepted(validateAndApplyEnvironmentAction(environment, distancingCustomer, {
    actorId: distancingCustomer.actorId,
    role: distancingCustomer.role,
    affordance: "keep_distance",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_distance",
    citedLedgerEventId: warning.event.eventId,
    whyLine: "The public warning has lowered local trust enough that the waiting customer keeps distance.",
  }));

  assert.equal(distanced.event.kind, "queue_distance_kept");
  assert.equal(distanced.event.citedLedgerEventId, warning.event.eventId);
  assert.equal(distanced.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "distanced");
  assert.equal(distanced.environment.economy.localTrust, 41);
  assert.equal(distanced.environment.economy.recordBurden, 25);

  environment = distanced.environment;
  const studioPm = actor({
    actorId: "NPC_Studio_PM",
    role: "studio_pm",
    knownLedgerEventIds: [warning.event.eventId],
  }, environment);
  assert.equal(studioPm.perceivedObjectIds.includes("park_notice_board"), true);
  assert.equal(studioPm.perceivedObjectIds.includes("studio_review_queue"), true);
  const deferredAction = listAvailableEnvironmentActions(environment, studioPm)
    .find(candidate => candidate.affordance === "defer_review");

  assert.ok(deferredAction);
  assert.equal(deferredAction.objectId, "studio_review_queue");
  assert.equal(deferredAction.toState, "deferred");
  assert.deepEqual(deferredAction.citableLedgerEventIds, [warning.event.eventId]);
  assert.equal(deferredAction.preconditions.includes("localTrust<=45"), true);
  assert.equal(deferredAction.preconditions.includes("ledger_event_kind:public_warning_posted"), true);
  assert.deepEqual(deferredAction.civicEconomyEffects, ["localTrust:-1", "recordBurden:+1"]);

  const deferred = requireAccepted(validateAndApplyEnvironmentAction(environment, studioPm, {
    actorId: studioPm.actorId,
    role: studioPm.role,
    affordance: "defer_review",
    objectId: "studio_review_queue",
    recordId: "studio_public_review_deferred",
    citedLedgerEventId: warning.event.eventId,
    whyLine: "The Studio PM reads the public warning and keeps the review queue on hold.",
  }));

  assert.equal(deferred.event.kind, "studio_review_deferred");
  assert.equal(deferred.event.citedLedgerEventId, warning.event.eventId);
  assert.equal(deferred.environment.objects.find(item => item.objectId === "studio_review_queue")?.state, "deferred");
  assert.equal(deferred.environment.economy.localTrust, 40);
  assert.equal(deferred.environment.economy.recordBurden, 26);
});

test("Station citation only becomes available after the Station knows a Store ledger event", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The player line creates a Store note that may later be cited.",
  }));
  environment = report.environment;

  const stationWithoutKnowledge = actor({ actorId: "NPC_Station_Officer", role: "station_officer" }, environment);
  assert.equal(
    listAvailableEnvironmentActions(environment, stationWithoutKnowledge)
      .some(action => action.affordance === "cite_record"),
    false,
  );

  const stationWithKnowledge = actor({
    actorId: "NPC_Station_Officer",
    role: "station_officer",
    knownLedgerEventIds: [report.event.eventId],
  }, environment);
  const citationAction = listAvailableEnvironmentActions(environment, stationWithKnowledge)
    .find(action => action.affordance === "cite_record");

  assert.ok(citationAction);
  assert.deepEqual(citationAction.citableLedgerEventIds, [report.event.eventId]);
  assert.equal(citationAction.requiresStoreLedgerEvent, true);
});

test("Station Officer can cite an exact known Store ledger event", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The player line did not match the local routine, so the Store creates a reportable note.",
  }));
  environment = report.environment;

  const storeEvent: CivicLedgerEvent = report.event;
  const station = actor({
    actorId: "NPC_Station_Officer",
    role: "station_officer",
    knownLedgerEventIds: [storeEvent.eventId],
  }, environment);

  const citation = requireAccepted(validateAndApplyEnvironmentAction(environment, station, {
    actorId: station.actorId,
    role: station.role,
    affordance: "cite_record",
    objectId: "station_dossier",
    recordId: "station_same_order_dossier",
    citedLedgerEventId: storeEvent.eventId,
    whyLine: "The Station cites the Store report because unresolved burden must be reconciled.",
  }));

  assert.equal(citation.event.kind, "station_record_cited");
  assert.equal(citation.event.affordance, "cite_record");
  assert.equal(citation.event.citedLedgerEventId, storeEvent.eventId);
  assert.equal(citation.environment.objects.find(item => item.objectId === "station_dossier")?.state, "cited");
});

test("Waiting customer can refuse contact after Station citation becomes visible", () => {
  let environment = createSameOrderAgenticEnvironment();
  const clerk = actor({ actorId: "NPC_Store_Clerk", role: "store_clerk" }, environment);
  const report = requireAccepted(validateAndApplyEnvironmentAction(environment, clerk, {
    actorId: clerk.actorId,
    role: clerk.role,
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The player line creates a Store note that unsettles the line.",
  }));
  environment = report.environment;

  const firstCustomer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [report.event.eventId],
  }, environment);
  const delayed = requireAccepted(validateAndApplyEnvironmentAction(environment, firstCustomer, {
    actorId: firstCustomer.actorId,
    role: firstCustomer.role,
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_delay",
    citedLedgerEventId: report.event.eventId,
    whyLine: "The waiting customer sees the Store note slow the line.",
  }));
  environment = delayed.environment;

  const station = actor({
    actorId: "NPC_Station_Officer",
    role: "station_officer",
    knownLedgerEventIds: [report.event.eventId],
  }, environment);
  const citation = requireAccepted(validateAndApplyEnvironmentAction(environment, station, {
    actorId: station.actorId,
    role: station.role,
    affordance: "cite_record",
    objectId: "station_dossier",
    recordId: "station_same_order_dossier",
    citedLedgerEventId: report.event.eventId,
    whyLine: "The Station cites the Store note before questioning the player.",
  }));
  environment = citation.environment;

  const reactingCustomer = actor({
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    knownLedgerEventIds: [citation.event.eventId],
  }, environment);
  const action = listAvailableEnvironmentActions(environment, reactingCustomer)
    .find(candidate => candidate.affordance === "refuse_contact");

  assert.ok(action);
  assert.equal(action.objectId, "store_queue_mark");
  assert.deepEqual(action.citableLedgerEventIds, [citation.event.eventId]);

  const refused = requireAccepted(validateAndApplyEnvironmentAction(environment, reactingCustomer, {
    actorId: reactingCustomer.actorId,
    role: reactingCustomer.role,
    affordance: "refuse_contact",
    objectId: "store_queue_mark",
    recordId: "store_same_order_contact_refused",
    citedLedgerEventId: citation.event.eventId,
    whyLine: "The waiting customer sees the Station citation and refuses casual contact with the examined player.",
  }));

  assert.equal(refused.event.kind, "queue_contact_refused");
  assert.equal(refused.event.citedLedgerEventId, citation.event.eventId);
  assert.equal(refused.environment.objects.find(item => item.objectId === "store_queue_mark")?.state, "refused");
  assert.equal(refused.environment.economy.localTrust, 22);
  assert.equal(refused.environment.economy.recordBurden, 45);
});

test("Station Officer cannot cite hidden or non-Store ledger events", () => {
  let environment = createSameOrderAgenticEnvironment();
  const customer = actor({ actorId: "NPC_Waiting_Customer", role: "waiting_customer" }, environment);
  const queue = environment.objects.find(item => item.objectId === "store_queue_mark");
  assert.ok(queue);
  queue.state = "delayed";

  const queueEvent = requireAccepted(validateAndApplyEnvironmentAction(environment, customer, {
    actorId: customer.actorId,
    role: customer.role,
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    whyLine: "The waiting customer reacts to visible queue delay.",
  }));
  environment = queueEvent.environment;

  const stationWithoutKnowledge = actor({ actorId: "NPC_Station_Officer", role: "station_officer" }, environment);
  const hiddenCitation = requireRejected(validateAndApplyEnvironmentAction(environment, stationWithoutKnowledge, {
    actorId: stationWithoutKnowledge.actorId,
    role: stationWithoutKnowledge.role,
    affordance: "cite_record",
    objectId: "station_dossier",
    recordId: "station_same_order_dossier",
    citedLedgerEventId: queueEvent.event.eventId,
    whyLine: "The Station tries to cite a queue event it has not received.",
  }));

  assert.equal(hiddenCitation.reason, "ledger_event_not_known");

  const stationWithKnowledge = actor({
    actorId: "NPC_Station_Officer",
    role: "station_officer",
    knownLedgerEventIds: [queueEvent.event.eventId],
  }, environment);
  const nonStoreCitation = requireRejected(validateAndApplyEnvironmentAction(environment, stationWithKnowledge, {
    actorId: stationWithKnowledge.actorId,
    role: stationWithKnowledge.role,
    affordance: "cite_record",
    objectId: "station_dossier",
    recordId: "station_same_order_dossier",
    citedLedgerEventId: queueEvent.event.eventId,
    whyLine: "The Station tries to cite public queue delay as if it were a Store record.",
  }));

  assert.equal(nonStoreCitation.reason, "station_citation_requires_store_record");
});
