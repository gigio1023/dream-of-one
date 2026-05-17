export const SAME_ORDER_OBJECT_IDS = [
  "store_queue_mark",
  "store_counter",
  "usual_order_cue",
  "receipt_tray",
  "correction_slip",
  "report_tray",
  "park_notice_board",
  "studio_review_queue",
  "station_dossier",
  "civic_ledger",
] as const;

export type SameOrderObjectId = (typeof SAME_ORDER_OBJECT_IDS)[number];

export const AGENT_ROLES = [
  "store_clerk",
  "store_manager",
  "waiting_customer",
  "park_witness",
  "studio_pm",
  "station_officer",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export const ENVIRONMENT_AFFORDANCES = [
  "wait",
  "observe_queue",
  "accept_routine",
  "note_wary",
  "complain_delay",
  "accept_repair",
  "leave_queue",
  "refuse_contact",
  "share_local_tip",
  "keep_distance",
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
  "vouch_routine",
  "post_warning",
  "post_repair_notice",
  "invite_review",
  "defer_review",
  "block_review",
  "forward_report",
  "open_intake",
  "cite_record",
  "request_correction",
  "close_intake",
] as const;

export type EnvironmentAffordance = (typeof ENVIRONMENT_AFFORDANCES)[number];

export const LEDGER_EVENT_KINDS = [
  "queue_state_observed",
  "queue_routine_kept",
  "queue_wary_noted",
  "queue_delay_noted",
  "queue_repair_accepted",
  "queue_left",
  "queue_contact_refused",
  "local_tip_shared",
  "queue_distance_kept",
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
  "public_routine_vouched",
  "public_warning_posted",
  "public_repair_noted",
  "studio_review_invited",
  "studio_review_deferred",
  "studio_review_blocked",
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
  | "helped"
  | "distanced"
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
  | "vouched"
  | "warned"
  | "repaired"
  | "rumored"
  | "open"
  | "invited"
  | "deferred"
  | "blocked"
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
    | "ledger_event_kind_unaccepted"
    | "invalid_record_mutation"
    | "station_citation_requires_store_record"
    | "economy_condition_unmet"
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
  requiresLedgerEventKinds?: LedgerEventKind[];
  minimumLocalTrust?: number;
  maximumLocalTrust?: number;
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
    affordance: "accept_routine",
    fromStates: ["player_waiting", "delayed"],
    toState: "settled",
    eventKind: "queue_routine_kept",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: 2 },
    requiresLedgerEvent: true,
    requiresStoreLedgerEvent: true,
  },
  {
    objectId: "store_queue_mark",
    affordance: "note_wary",
    fromStates: ["player_waiting", "delayed"],
    toState: "delayed",
    eventKind: "queue_wary_noted",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: -2, recordBurden: 5 },
    requiresLedgerEvent: true,
    requiresStoreLedgerEvent: true,
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
    objectId: "store_queue_mark",
    affordance: "leave_queue",
    fromStates: ["disrupted"],
    toState: "empty",
    eventKind: "queue_left",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: -3, recordBurden: 5 },
    requiresLedgerEvent: true,
    requiresStoreLedgerEvent: true,
  },
  {
    objectId: "store_queue_mark",
    affordance: "refuse_contact",
    fromStates: ["disrupted"],
    toState: "refused",
    eventKind: "queue_contact_refused",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: -8, recordBurden: 5 },
    requiresLedgerEvent: true,
  },
  {
    objectId: "store_queue_mark",
    affordance: "share_local_tip",
    fromStates: ["settled"],
    toState: "helped",
    eventKind: "local_tip_shared",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: 1, recordBurden: -1 },
    requiresLedgerEvent: true,
    requiresLedgerEventKinds: ["public_routine_vouched"],
    minimumLocalTrust: 55,
  },
  {
    objectId: "store_queue_mark",
    affordance: "keep_distance",
    fromStates: ["delayed"],
    toState: "distanced",
    eventKind: "queue_distance_kept",
    allowedRoles: ["waiting_customer"],
    economyDelta: { localTrust: -1, recordBurden: 2 },
    requiresLedgerEvent: true,
    requiresLedgerEventKinds: ["public_warning_posted"],
    maximumLocalTrust: 45,
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
    objectId: "park_notice_board",
    affordance: "vouch_routine",
    fromStates: ["clear", "vouched"],
    toState: "vouched",
    eventKind: "public_routine_vouched",
    allowedRoles: ["park_witness"],
    economyDelta: { localTrust: 1 },
    requiresLedgerEvent: true,
  },
  {
    objectId: "park_notice_board",
    affordance: "post_warning",
    fromStates: ["clear", "warned"],
    toState: "warned",
    eventKind: "public_warning_posted",
    allowedRoles: ["park_witness"],
    economyDelta: { localTrust: -1, recordBurden: 3 },
    requiresLedgerEvent: true,
  },
  {
    objectId: "park_notice_board",
    affordance: "post_repair_notice",
    fromStates: ["clear", "rumored"],
    toState: "repaired",
    eventKind: "public_repair_noted",
    allowedRoles: ["park_witness"],
    economyDelta: { localTrust: 3, recordBurden: -5 },
    requiresLedgerEvent: true,
    requiresStoreLedgerEvent: true,
  },
  {
    objectId: "studio_review_queue",
    affordance: "invite_review",
    fromStates: ["open"],
    toState: "invited",
    eventKind: "studio_review_invited",
    allowedRoles: ["studio_pm"],
    economyDelta: { localTrust: 1, recordBurden: -1 },
    requiresLedgerEvent: true,
    requiresLedgerEventKinds: ["public_routine_vouched"],
    minimumLocalTrust: 55,
  },
  {
    objectId: "studio_review_queue",
    affordance: "defer_review",
    fromStates: ["open"],
    toState: "deferred",
    eventKind: "studio_review_deferred",
    allowedRoles: ["studio_pm"],
    economyDelta: { localTrust: -1, recordBurden: 1 },
    requiresLedgerEvent: true,
    requiresLedgerEventKinds: ["public_warning_posted"],
    maximumLocalTrust: 45,
  },
  {
    objectId: "studio_review_queue",
    affordance: "block_review",
    fromStates: ["open"],
    toState: "blocked",
    eventKind: "studio_review_blocked",
    allowedRoles: ["studio_pm"],
    economyDelta: { localTrust: -2, recordBurden: 3 },
    requiresLedgerEvent: true,
    requiresLedgerEventKinds: ["station_record_cited"],
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
  "service_paused",
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
        visibleTo: ["park_witness", "waiting_customer", "studio_pm"],
        recordId: "park_public_rumor",
      },
      {
        objectId: "studio_review_queue",
        state: "open",
        visibleTo: ["studio_pm"],
        recordId: "studio_public_review_invite",
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
      || !economyConditionMet(environment.economy, rule)
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
  if (!economyConditionMet(cloned.economy, rule)) {
    return reject(
      cloned,
      "economy_condition_unmet",
      economyConditionFailure(rule),
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
  if (
    citedEvent
    && rule.requiresLedgerEventKinds !== undefined
    && !rule.requiresLedgerEventKinds.includes(citedEvent.kind)
  ) {
    return reject(
      cloned,
      "ledger_event_kind_unaccepted",
      `${action.affordance} cannot cite ${citedEvent.kind}`,
    );
  }
  if (rule.requiresStoreLedgerEvent && citedEvent && !STORE_LEDGER_EVENT_KINDS.has(citedEvent.kind)) {
    return reject(cloned, "station_citation_requires_store_record", "Station citation must cite a Store ledger event");
  }

  if (["create_receipt", "mark_receipt", "attach_correction", "place_note", "post_rumor", "vouch_routine", "post_warning", "post_repair_notice", "share_local_tip", "keep_distance", "invite_review", "defer_review", "block_review", "forward_report", "cite_record"].includes(action.affordance)) {
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
    .filter(event => rule.requiresLedgerEventKinds === undefined || rule.requiresLedgerEventKinds.includes(event.kind))
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
  if (rule.requiresLedgerEventKinds !== undefined) {
    preconditions.push(`ledger_event_kind:${rule.requiresLedgerEventKinds.join("|")}`);
  }
  if (typeof rule.minimumLocalTrust === "number") {
    preconditions.push(`localTrust>=${rule.minimumLocalTrust}`);
  }
  if (typeof rule.maximumLocalTrust === "number") {
    preconditions.push(`localTrust<=${rule.maximumLocalTrust}`);
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
  if (rule.requiresLedgerEventKinds !== undefined) {
    reasons.push("ledger_event_kind_unaccepted");
  }
  if (typeof rule.minimumLocalTrust === "number") {
    reasons.push("economy_condition_unmet");
  }
  if (typeof rule.maximumLocalTrust === "number") {
    reasons.push("economy_condition_unmet");
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
  if (rule.affordance === "accept_routine") {
    hints.push("pressure:routine_kept");
  }
  if (rule.affordance === "note_wary") {
    hints.push("pressure:wary_queue");
  }
  if (rule.affordance === "accept_repair") {
    hints.push("pressure:repair_accepted");
  }
  if (rule.affordance === "post_rumor") {
    hints.push("pressure:public_talk");
  }
  if (rule.affordance === "vouch_routine") {
    hints.push("pressure:routine_vouched_publicly");
  }
  if (rule.affordance === "post_warning") {
    hints.push("pressure:public_warning");
  }
  if (rule.affordance === "post_repair_notice") {
    hints.push("pressure:repair_seen_publicly");
  }
  if (rule.affordance === "invite_review") {
    hints.push("pressure:public_trust_opens_review");
  }
  if (rule.affordance === "defer_review") {
    hints.push("pressure:public_warning_blocks_review");
  }
  if (rule.affordance === "block_review") {
    hints.push("pressure:station_citation_blocks_review");
  }
  if (rule.affordance === "refuse_contact") {
    hints.push("pressure:authority_seen");
  }
  if (rule.affordance === "share_local_tip") {
    hints.push("pressure:local_trust_unlocks_help");
  }
  if (rule.affordance === "keep_distance") {
    hints.push("pressure:low_trust_creates_distance");
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
    case "accept_routine":
      return "routine queue acceptance";
    case "note_wary":
      return "local wary queue note";
    case "accept_repair":
      return "public repair acceptance";
    case "leave_queue":
      return "queue leaves paused service";
    case "refuse_contact":
      return "queue refuses contact after citation";
    case "share_local_tip":
      return "local trust opens a helpful tip";
    case "keep_distance":
      return "public warning makes the queue keep distance";
    case "post_rumor":
      return "public notice rumor";
    case "vouch_routine":
      return "public routine vouch";
    case "post_warning":
      return "public warning notice";
    case "post_repair_notice":
      return "public repair notice";
    case "invite_review":
      return "public trust opens another local review";
    case "defer_review":
      return "public warning defers another local review";
    case "block_review":
      return "formal citation blocks another local review";
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

function economyConditionMet(economy: CivicEconomyState, rule: AffordanceRule): boolean {
  if (typeof rule.minimumLocalTrust === "number" && economy.localTrust < rule.minimumLocalTrust) {
    return false;
  }
  if (typeof rule.maximumLocalTrust === "number" && economy.localTrust > rule.maximumLocalTrust) {
    return false;
  }
  return true;
}

function economyConditionFailure(rule: AffordanceRule): string {
  if (typeof rule.minimumLocalTrust === "number") {
    return `${rule.affordance} requires localTrust >= ${rule.minimumLocalTrust}`;
  }
  if (typeof rule.maximumLocalTrust === "number") {
    return `${rule.affordance} requires localTrust <= ${rule.maximumLocalTrust}`;
  }
  return `${rule.affordance} economy condition is unmet`;
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
