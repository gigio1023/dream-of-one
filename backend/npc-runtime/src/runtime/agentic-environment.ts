export const SAME_ORDER_OBJECT_IDS = [
  "store_queue_mark",
  "store_counter",
  "usual_order_cue",
  "receipt_tray",
  "correction_slip",
  "report_tray",
  "park_notice_board",
  "station_dossier",
  "civic_ledger",
] as const;

export type SameOrderObjectId = (typeof SAME_ORDER_OBJECT_IDS)[number];

export const AGENT_ROLES = [
  "store_clerk",
  "store_manager",
  "waiting_customer",
  "park_witness",
  "station_officer",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export const ENVIRONMENT_AFFORDANCES = [
  "wait",
  "observe_queue",
  "complain_delay",
  "accept_repair",
  "leave_queue",
  "speak",
  "serve",
  "pause_service",
  "resume_service",
  "inspect",
  "compare_statement",
  "cite_expected_order",
  "create_receipt",
  "mark_receipt",
  "offer_correction",
  "attach_correction",
  "place_note",
  "post_rumor",
  "forward_report",
  "open_intake",
  "cite_record",
  "request_correction",
  "close_intake",
] as const;

export type EnvironmentAffordance = (typeof ENVIRONMENT_AFFORDANCES)[number];

export const LEDGER_EVENT_KINDS = [
  "queue_state_observed",
  "queue_delay_noted",
  "queue_repair_accepted",
  "service_started",
  "service_paused",
  "service_resumed",
  "usual_order_read",
  "usual_order_cited",
  "store_receipt_marked",
  "correction_offered",
  "correction_attached",
  "correction_refused",
  "store_sale_normal",
  "store_sale_corrected",
  "store_exception_reported",
  "public_rumor_posted",
  "store_report_escalated",
  "station_record_cited",
  "station_correction_recorded",
] as const;

export type LedgerEventKind = (typeof LEDGER_EVENT_KINDS)[number];

export type EnvironmentObjectState =
  | "empty"
  | "player_waiting"
  | "delayed"
  | "disrupted"
  | "settled"
  | "idle"
  | "serving"
  | "paused"
  | "closed"
  | "unread"
  | "read"
  | "cited"
  | "blank"
  | "normal"
  | "marked"
  | "corrected"
  | "absent"
  | "offered"
  | "accepted"
  | "refused"
  | "attached"
  | "pending"
  | "clear"
  | "rumored"
  | "filed"
  | "forwarded"
  | "opened"
  | "append_only";

export interface EnvironmentObject {
  objectId: SameOrderObjectId;
  state: EnvironmentObjectState;
  visibleTo: AgentRole[];
  recordId?: string;
  citedLedgerEventId?: string;
}

export interface CivicEconomyState {
  accountCredit: number;
  localTrust: number;
  recordBurden: number;
  stationAttention: number;
}

export interface CivicLedgerEvent {
  eventId: string;
  kind: LedgerEventKind;
  affordance: EnvironmentAffordance;
  actorId: string;
  actorRole: AgentRole;
  objectId: SameOrderObjectId;
  recordId?: string;
  citedLedgerEventId?: string;
  economyDelta: Partial<CivicEconomyState>;
  validation: "accepted";
  whyLine: string;
}

export interface AgentContext {
  actorId: string;
  role: AgentRole;
  perceivedObjectIds: SameOrderObjectId[];
  knownLedgerEventIds: string[];
  visibleEconomy: Partial<Record<keyof CivicEconomyState, true>>;
}

export interface AgenticEnvironmentState {
  objects: EnvironmentObject[];
  economy: CivicEconomyState;
  ledger: CivicLedgerEvent[];
  nextEventSequence: number;
}

export interface ProposedEnvironmentAction {
  actorId: string;
  role: AgentRole;
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  recordId?: string;
  citedLedgerEventId?: string;
  whyLine: string;
}

export interface EnvironmentActionDescriptor {
  actionId: string;
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  objectState: EnvironmentObjectState;
  playerLabel: string;
  eligibleRoles: AgentRole[];
  preconditions: string[];
  visibleTo: AgentRole[];
  perceivedAs: string;
  priorityHints: string[];
  ledgerEventKind: LedgerEventKind;
  civicEconomyEffects: string[];
  validationRuleId: string;
  failureReasons: string[];
}

export interface AvailableEnvironmentAction extends EnvironmentActionDescriptor {
  toState: EnvironmentObjectState;
  recordId?: string;
  requiresLedgerEvent: boolean;
  requiresStoreLedgerEvent: boolean;
  citableLedgerEventIds: string[];
}

export interface EnvironmentValidationAccepted {
  ok: true;
  event: CivicLedgerEvent;
  environment: AgenticEnvironmentState;
}

export interface EnvironmentValidationRejected {
  ok: false;
  reason:
    | "agent_role_mismatch"
    | "object_unknown"
    | "object_not_perceived"
    | "affordance_unavailable"
    | "role_authority_exceeded"
    | "ledger_event_unknown"
    | "ledger_event_not_known"
    | "invalid_record_mutation"
    | "station_citation_requires_store_record"
    | "why_line_required";
  detail: string;
  environment: AgenticEnvironmentState;
}

export type EnvironmentValidationResult = EnvironmentValidationAccepted | EnvironmentValidationRejected;

interface AffordanceRule {
  objectId: SameOrderObjectId;
  affordance: EnvironmentAffordance;
  fromStates: EnvironmentObjectState[];
  toState: EnvironmentObjectState;
  eventKind: LedgerEventKind;
  allowedRoles: AgentRole[];
  economyDelta: Partial<CivicEconomyState>;
  requiresLedgerEvent?: boolean;
  requiresStoreLedgerEvent?: boolean;
}

const AFFORDANCE_RULES: AffordanceRule[] = [
  {
    objectId: "store_queue_mark",
    affordance: "observe_queue",
    fromStates: ["empty", "player_waiting", "delayed", "disrupted"],
    toState: "player_waiting",
    eventKind: "queue_state_observed",
    allowedRoles: ["store_clerk", "waiting_customer", "store_manager"],
    economyDelta: {},
  },
  {
    objectId: "store_queue_mark",
    affordance: "complain_delay",
    fromStates: ["player_waiting", "delayed", "disrupted"],
    toState: "disrupted",
    eventKind: "queue_delay_noted",
    allowedRoles: ["waiting_customer"],
    economyDelta: { recordBurden: 5 },
  },
  {
    objectId: "store_queue_mark",
    affordance: "accept_repair",
    fromStates: ["player_waiting", "delayed", "disrupted"],
    toState: "settled",
    eventKind: "queue_repair_accepted",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: 5, recordBurden: -5 },
    requiresLedgerEvent: true,
  },
  {
    objectId: "store_counter",
    affordance: "pause_service",
    fromStates: ["serving", "idle"],
    toState: "paused",
    eventKind: "service_paused",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: { recordBurden: 5 },
  },
  {
    objectId: "usual_order_cue",
    affordance: "inspect",
    fromStates: ["unread", "read", "cited"],
    toState: "read",
    eventKind: "usual_order_read",
    allowedRoles: ["store_clerk", "store_manager", "station_officer", "waiting_customer"],
    economyDelta: {},
  },
  {
    objectId: "usual_order_cue",
    affordance: "cite_expected_order",
    fromStates: ["read", "cited"],
    toState: "cited",
    eventKind: "usual_order_cited",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: {},
  },
  {
    objectId: "receipt_tray",
    affordance: "create_receipt",
    fromStates: ["blank"],
    toState: "normal",
    eventKind: "store_sale_normal",
    allowedRoles: ["store_clerk"],
    economyDelta: { accountCredit: -1, localTrust: 5 },
  },
  {
    objectId: "receipt_tray",
    affordance: "mark_receipt",
    fromStates: ["blank", "normal"],
    toState: "marked",
    eventKind: "store_receipt_marked",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: { localTrust: -5, recordBurden: 15 },
  },
  {
    objectId: "correction_slip",
    affordance: "offer_correction",
    fromStates: ["absent"],
    toState: "offered",
    eventKind: "correction_offered",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: { recordBurden: 5 },
  },
  {
    objectId: "correction_slip",
    affordance: "attach_correction",
    fromStates: ["offered", "accepted"],
    toState: "attached",
    eventKind: "store_sale_corrected",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: { accountCredit: -1, localTrust: -5, recordBurden: 15, stationAttention: 5 },
  },
  {
    objectId: "report_tray",
    affordance: "place_note",
    fromStates: ["empty", "pending"],
    toState: "pending",
    eventKind: "store_exception_reported",
    allowedRoles: ["store_clerk", "store_manager"],
    economyDelta: { localTrust: -20, recordBurden: 35, stationAttention: 30 },
  },
  {
    objectId: "report_tray",
    affordance: "forward_report",
    fromStates: ["pending", "filed"],
    toState: "forwarded",
    eventKind: "store_report_escalated",
    allowedRoles: ["store_manager"],
    economyDelta: { localTrust: -20, recordBurden: 25, stationAttention: 40 },
  },
  {
    objectId: "park_notice_board",
    affordance: "post_rumor",
    fromStates: ["clear", "rumored"],
    toState: "rumored",
    eventKind: "public_rumor_posted",
    allowedRoles: ["park_witness"],
    economyDelta: { recordBurden: 5 },
    requiresLedgerEvent: true,
  },
  {
    objectId: "station_dossier",
    affordance: "cite_record",
    fromStates: ["absent", "opened", "cited"],
    toState: "cited",
    eventKind: "station_record_cited",
    allowedRoles: ["station_officer"],
    economyDelta: {},
    requiresLedgerEvent: true,
    requiresStoreLedgerEvent: true,
  },
];

const STORE_LEDGER_EVENT_KINDS = new Set<LedgerEventKind>([
  "store_sale_normal",
  "store_sale_corrected",
  "store_exception_reported",
  "store_report_escalated",
  "store_receipt_marked",
  "correction_offered",
  "correction_attached",
]);

export function createSameOrderAgenticEnvironment(): AgenticEnvironmentState {
  return {
    objects: [
      { objectId: "store_queue_mark", state: "player_waiting", visibleTo: ["store_clerk", "waiting_customer"] },
      { objectId: "store_counter", state: "serving", visibleTo: ["store_clerk", "waiting_customer", "store_manager"] },
      { objectId: "usual_order_cue", state: "read", visibleTo: ["store_clerk", "store_manager", "waiting_customer"] },
      {
        objectId: "receipt_tray",
        state: "blank",
        visibleTo: ["store_clerk", "store_manager"],
        recordId: "store_same_order_receipt",
      },
      {
        objectId: "correction_slip",
        state: "absent",
        visibleTo: ["store_clerk", "store_manager"],
        recordId: "store_same_order_correction",
      },
      {
        objectId: "report_tray",
        state: "empty",
        visibleTo: ["store_clerk", "store_manager", "station_officer"],
        recordId: "store_same_order_clerk_statement",
      },
      {
        objectId: "park_notice_board",
        state: "clear",
        visibleTo: ["park_witness"],
        recordId: "park_public_rumor",
      },
      {
        objectId: "station_dossier",
        state: "absent",
        visibleTo: ["station_officer"],
        recordId: "station_same_order_dossier",
      },
      { objectId: "civic_ledger", state: "append_only", visibleTo: ["station_officer"] },
    ],
    economy: {
      accountCredit: 3,
      localTrust: 50,
      recordBurden: 0,
      stationAttention: 0,
    },
    ledger: [],
    nextEventSequence: 1,
  };
}

export function getVisibleObjectIds(
  environment: AgenticEnvironmentState,
  role: AgentRole,
): SameOrderObjectId[] {
  return environment.objects
    .filter(object => object.visibleTo.includes(role))
    .map(object => object.objectId);
}

export function listAvailableEnvironmentActions(
  environment: AgenticEnvironmentState,
  actor: AgentContext,
): AvailableEnvironmentAction[] {
  const perceivedObjectIds = new Set(actor.perceivedObjectIds);

  return AFFORDANCE_RULES.flatMap(rule => {
    const object = environment.objects.find(candidate => candidate.objectId === rule.objectId);
    if (
      !object
      || !object.visibleTo.includes(actor.role)
      || !perceivedObjectIds.has(object.objectId)
      || !rule.allowedRoles.includes(actor.role)
      || !rule.fromStates.includes(object.state)
    ) {
      return [];
    }

    const citableLedgerEventIds = getCitableLedgerEventIds(environment, actor, rule);
    if (rule.requiresLedgerEvent && citableLedgerEventIds.length === 0) {
      return [];
    }

    return [{
      ...buildEnvironmentActionDescriptor(rule, object),
      affordance: rule.affordance,
      objectId: rule.objectId,
      objectState: object.state,
      toState: rule.toState,
      ledgerEventKind: rule.eventKind,
      recordId: object.recordId,
      requiresLedgerEvent: rule.requiresLedgerEvent === true,
      requiresStoreLedgerEvent: rule.requiresStoreLedgerEvent === true,
      citableLedgerEventIds,
    }];
  });
}

export function validateAndApplyEnvironmentAction(
  environment: AgenticEnvironmentState,
  actor: AgentContext,
  action: ProposedEnvironmentAction,
): EnvironmentValidationResult {
  const cloned = cloneEnvironment(environment);

  if (action.actorId !== actor.actorId || action.role !== actor.role) {
    return reject(cloned, "agent_role_mismatch", "action actor identity does not match actor context");
  }
  if (action.whyLine.trim().length === 0) {
    return reject(cloned, "why_line_required", "accepted environment actions must explain why");
  }

  const object = cloned.objects.find(candidate => candidate.objectId === action.objectId);
  if (!object) {
    return reject(cloned, "object_unknown", `unknown environment object: ${action.objectId}`);
  }
  if (!actor.perceivedObjectIds.includes(action.objectId) || !object.visibleTo.includes(actor.role)) {
    return reject(cloned, "object_not_perceived", `${actor.role} cannot currently perceive ${action.objectId}`);
  }

  const rule = AFFORDANCE_RULES.find(candidate =>
    candidate.objectId === action.objectId && candidate.affordance === action.affordance
  );
  if (!rule || !rule.fromStates.includes(object.state)) {
    return reject(
      cloned,
      "affordance_unavailable",
      `${action.affordance} is unavailable on ${action.objectId} while state is ${object.state}`,
    );
  }
  if (!rule.allowedRoles.includes(actor.role)) {
    return reject(
      cloned,
      "role_authority_exceeded",
      `${actor.role} cannot apply ${action.affordance} to ${action.objectId}`,
    );
  }

  const citedEvent = action.citedLedgerEventId
    ? cloned.ledger.find(event => event.eventId === action.citedLedgerEventId)
    : undefined;
  if (rule.requiresLedgerEvent && !action.citedLedgerEventId) {
    return reject(cloned, "ledger_event_unknown", `${action.affordance} requires a cited ledger event`);
  }
  if (action.citedLedgerEventId && !citedEvent) {
    return reject(cloned, "ledger_event_unknown", `unknown ledger event: ${action.citedLedgerEventId}`);
  }
  if (action.citedLedgerEventId && !actor.knownLedgerEventIds.includes(action.citedLedgerEventId)) {
    return reject(cloned, "ledger_event_not_known", `${actor.role} cannot cite an unobserved ledger event`);
  }
  if (rule.requiresStoreLedgerEvent && citedEvent && !STORE_LEDGER_EVENT_KINDS.has(citedEvent.kind)) {
    return reject(cloned, "station_citation_requires_store_record", "Station citation must cite a Store ledger event");
  }

  if (["create_receipt", "mark_receipt", "attach_correction", "place_note", "post_rumor", "forward_report", "cite_record"].includes(action.affordance)) {
    const recordId = action.recordId ?? object.recordId;
    if (!recordId || recordId.trim().length === 0) {
      return reject(cloned, "invalid_record_mutation", `${action.affordance} requires a record id`);
    }
    object.recordId = recordId;
  }

  object.state = rule.toState;
  if (action.citedLedgerEventId) {
    object.citedLedgerEventId = action.citedLedgerEventId;
  }

  const event: CivicLedgerEvent = {
    eventId: `civic-ledger-${cloned.nextEventSequence}`,
    kind: rule.eventKind,
    affordance: action.affordance,
    actorId: actor.actorId,
    actorRole: actor.role,
    objectId: action.objectId,
    recordId: action.recordId ?? object.recordId,
    citedLedgerEventId: action.citedLedgerEventId,
    economyDelta: { ...rule.economyDelta },
    validation: "accepted",
    whyLine: action.whyLine,
  };
  cloned.nextEventSequence += 1;
  cloned.economy = applyEconomyDelta(cloned.economy, rule.economyDelta);
  cloned.ledger.push(event);

  return {
    ok: true,
    event,
    environment: cloned,
  };
}

function getCitableLedgerEventIds(
  environment: AgenticEnvironmentState,
  actor: AgentContext,
  rule: AffordanceRule,
): string[] {
  if (!rule.requiresLedgerEvent) {
    return [];
  }

  const knownLedgerEventIds = new Set(actor.knownLedgerEventIds);
  return environment.ledger
    .filter(event => knownLedgerEventIds.has(event.eventId))
    .filter(event => !rule.requiresStoreLedgerEvent || STORE_LEDGER_EVENT_KINDS.has(event.kind))
    .map(event => event.eventId);
}

function buildEnvironmentActionDescriptor(
  rule: AffordanceRule,
  object: EnvironmentObject,
): EnvironmentActionDescriptor {
  return {
    actionId: `${rule.objectId}.${rule.affordance}`,
    affordance: rule.affordance,
    objectId: rule.objectId,
    objectState: object.state,
    playerLabel: playerLabel(rule.affordance),
    eligibleRoles: [...rule.allowedRoles],
    preconditions: preconditionsForRule(rule, object),
    visibleTo: [...object.visibleTo],
    perceivedAs: perceivedAs(rule),
    priorityHints: priorityHintsForRule(rule),
    ledgerEventKind: rule.eventKind,
    civicEconomyEffects: civicEconomyEffects(rule.economyDelta),
    validationRuleId: `same_order.${rule.objectId}.${rule.affordance}`,
    failureReasons: failureReasonsForRule(rule),
  };
}

function preconditionsForRule(rule: AffordanceRule, object: EnvironmentObject): string[] {
  const preconditions = [
    `object_state:${object.state}`,
    `role_allowed:${rule.allowedRoles.join("|")}`,
  ];

  if (rule.requiresLedgerEvent) {
    preconditions.push("known_ledger_event_required");
  }
  if (rule.requiresStoreLedgerEvent) {
    preconditions.push("known_store_ledger_event_required");
  }

  return preconditions;
}

function failureReasonsForRule(rule: AffordanceRule): string[] {
  const reasons = [
    "object_not_perceived",
    "affordance_unavailable",
    "role_authority_exceeded",
    "why_line_required",
  ];

  if (rule.requiresLedgerEvent) {
    reasons.push("ledger_event_unknown", "ledger_event_not_known");
  }
  if (rule.requiresStoreLedgerEvent) {
    reasons.push("station_citation_requires_store_record");
  }

  return reasons;
}

function civicEconomyEffects(delta: Partial<CivicEconomyState>): string[] {
  return Object.entries(delta)
    .filter((entry): entry is [keyof CivicEconomyState, number] => typeof entry[1] === "number")
    .map(([key, value]) => `${key}:${value >= 0 ? "+" : ""}${value}`);
}

function priorityHintsForRule(rule: AffordanceRule): string[] {
  const hints = Object.keys(rule.economyDelta).map(key => `economy:${key}`);

  if (rule.requiresStoreLedgerEvent) {
    hints.push("requires:store_record_citation");
  }
  if (rule.affordance === "complain_delay") {
    hints.push("pressure:queue_delay");
  }
  if (rule.affordance === "accept_repair") {
    hints.push("pressure:repair_accepted");
  }
  if (rule.affordance === "post_rumor") {
    hints.push("pressure:public_talk");
  }

  return hints;
}

function perceivedAs(rule: AffordanceRule): string {
  switch (rule.affordance) {
    case "create_receipt":
      return "normal sale record";
    case "mark_receipt":
      return "marked receipt";
    case "offer_correction":
    case "attach_correction":
      return "local correction path";
    case "place_note":
      return "Store report note";
    case "forward_report":
      return "forwarded Store report";
    case "cite_record":
      return "Station dossier citation";
    case "complain_delay":
      return "public queue pressure";
    case "accept_repair":
      return "public repair acceptance";
    case "post_rumor":
      return "public notice rumor";
    default:
      return `${rule.objectId} ${rule.affordance}`;
  }
}

function playerLabel(affordance: EnvironmentAffordance): string {
  return affordance
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function applyEconomyDelta(
  economy: CivicEconomyState,
  delta: Partial<CivicEconomyState>,
): CivicEconomyState {
  return {
    accountCredit: clamp(economy.accountCredit + (delta.accountCredit ?? 0), 0, 999),
    localTrust: clamp(economy.localTrust + (delta.localTrust ?? 0), 0, 100),
    recordBurden: clamp(economy.recordBurden + (delta.recordBurden ?? 0), 0, 100),
    stationAttention: clamp(economy.stationAttention + (delta.stationAttention ?? 0), 0, 100),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function cloneEnvironment(environment: AgenticEnvironmentState): AgenticEnvironmentState {
  return {
    objects: environment.objects.map(object => ({
      ...object,
      visibleTo: [...object.visibleTo],
    })),
    economy: { ...environment.economy },
    ledger: environment.ledger.map(event => ({
      ...event,
      economyDelta: { ...event.economyDelta },
    })),
    nextEventSequence: environment.nextEventSequence,
  };
}

function reject(
  environment: AgenticEnvironmentState,
  reason: EnvironmentValidationRejected["reason"],
  detail: string,
): EnvironmentValidationRejected {
  return {
    ok: false,
    reason,
    detail,
    environment,
  };
}
