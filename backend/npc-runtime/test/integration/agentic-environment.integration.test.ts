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
