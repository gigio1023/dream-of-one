import {
  createSameOrderAgenticEnvironment,
  getVisibleObjectIds,
  validateAndApplyEnvironmentAction,
  type AgentContext,
  type AgentRole,
  type AgenticEnvironmentState,
  type CivicEconomyState,
  type CivicLedgerEvent,
  type EnvironmentAffordance,
  type EnvironmentObjectState,
  type LedgerEventKind,
  type SameOrderObjectId,
} from "./agentic-environment.js";

export const SAME_ORDER_AGENTIC_ROUTE_IDS = [
  "clean_cover",
  "repair_recovered",
  "soft_report",
  "inquest_opened",
] as const;

export type SameOrderAgenticRouteId = (typeof SAME_ORDER_AGENTIC_ROUTE_IDS)[number];

export interface SameOrderAgenticActionTrace {
  stepId: string;
  actorId: string;
  actorRole: AgentRole;
  perceivedObjectIds: SameOrderObjectId[];
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  accepted: true;
  ledgerEventId: string;
  ledgerEventKind: LedgerEventKind;
  recordId?: string;
  citedLedgerEventId?: string;
  economyAfter: CivicEconomyState;
  whyLine: string;
}

export interface SameOrderAgenticStationCitation {
  stationEventId: string;
  citedLedgerEventId: string;
  citedLedgerEventKind: LedgerEventKind;
  recordId: string;
  whyLine: string;
}

export interface SameOrderAgenticSocialObservation {
  observerActorId: string;
  observerRole: AgentRole;
  observedLedgerEventId: string;
  observedActorRole: AgentRole;
  observedAffordance: EnvironmentAffordance;
  observedObjectId: SameOrderObjectId;
  economyPressure: Pick<CivicEconomyState, "localTrust" | "recordBurden" | "stationAttention">;
  resultingStepId: string;
  resultingAffordance: EnvironmentAffordance;
  whyLine: string;
}

export interface SameOrderAgenticRouteProof {
  routeId: SameOrderAgenticRouteId;
  routeOutcome: SameOrderAgenticRouteId;
  sessionOutcome: "cover_held" | "soft_report" | "inquest_opened";
  playerLineKind: "clean_cover_line" | "repair_line" | "soft_report_line" | "inquest_line";
  playerLine: string;
  socialReactionSummary: string;
  actionTrace: SameOrderAgenticActionTrace[];
  ledgerEventKinds: LedgerEventKind[];
  ledgerAffordances: EnvironmentAffordance[];
  socialObservationTrace: SameOrderAgenticSocialObservation[];
  finalObjectStates: Partial<Record<SameOrderObjectId, EnvironmentObjectState>>;
  economyAfter: CivicEconomyState;
  stationCitation?: SameOrderAgenticStationCitation;
}

export interface SameOrderAgenticRouteProofFailure {
  routeId?: string;
  path: string;
  message: string;
}

export type SameOrderAgenticRouteProofValidationResult =
  | { ok: true; proofs: SameOrderAgenticRouteProof[]; failures: [] }
  | { ok: false; failures: SameOrderAgenticRouteProofFailure[] };

interface MutableRouteBuild {
  environment: AgenticEnvironmentState;
  traces: SameOrderAgenticActionTrace[];
}

interface ActionStepInput {
  stepId: string;
  actorId: string;
  role: AgentRole;
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  recordId?: string;
  citedLedgerEventId?: string;
  knownLedgerEventIds?: string[];
  whyLine: string;
}

export function buildSameOrderAgenticRouteProofs(): SameOrderAgenticRouteProof[] {
  return [
    buildCleanCoverProof(),
    buildRepairRecoveredProof(),
    buildSoftReportProof(),
    buildInquestOpenedProof(),
  ];
}

export function validateSameOrderAgenticRouteProofs(
  proofs: readonly SameOrderAgenticRouteProof[],
): SameOrderAgenticRouteProofValidationResult {
  const failures: SameOrderAgenticRouteProofFailure[] = [];
  const routeIds = new Set(proofs.map(proof => proof.routeId));

  for (const routeId of SAME_ORDER_AGENTIC_ROUTE_IDS) {
    if (!routeIds.has(routeId)) {
      failures.push({ routeId, path: "routeId", message: `missing agentic route proof: ${routeId}` });
    }
  }
  if (routeIds.size !== proofs.length) {
    failures.push({ path: "routeId", message: "agentic route proofs must have unique routeIds" });
  }

  for (const proof of proofs) {
    validateRouteProofCommon(proof, failures);
    switch (proof.routeId) {
      case "clean_cover":
        validateCleanCover(proof, failures);
        break;
      case "repair_recovered":
        validateRepairRecovered(proof, failures);
        break;
      case "soft_report":
        validateSoftReport(proof, failures);
        break;
      case "inquest_opened":
        validateInquestOpened(proof, failures);
        break;
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return { ok: true, proofs: [...proofs], failures: [] };
}

function buildCleanCoverProof(): SameOrderAgenticRouteProof {
  const build = createRouteBuild();
  applyAction(build, {
    stepId: "clean.clerk.cite_usual_order",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "cite_expected_order",
    objectId: "usual_order_cue",
    whyLine: "The player accepted the usual order, so the clerk can cite the routine before closing the sale.",
  });
  const receiptEvent = applyAction(build, {
    stepId: "clean.clerk.create_receipt",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "create_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The accepted line matches the Store routine and creates a normal receipt.",
  });
  applyAction(build, {
    stepId: "clean.waiting_customer.accept_routine",
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    affordance: "accept_routine",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_routine",
    citedLedgerEventId: receiptEvent.eventId,
    knownLedgerEventIds: [receiptEvent.eventId],
    whyLine: "A waiting customer sees the normal receipt and keeps the line moving instead of creating pressure.",
  });

  return routeProof({
    build,
    routeId: "clean_cover",
    sessionOutcome: "cover_held",
    playerLineKind: "clean_cover_line",
    playerLine: "네, 같은 걸로 주세요.",
    socialReactionSummary: "The clerk closes a normal receipt, and a waiting customer accepts the routine so the queue stays calm.",
  });
}

function buildRepairRecoveredProof(): SameOrderAgenticRouteProof {
  const build = createRouteBuild();
  applyAction(build, {
    stepId: "repair.clerk.mark_receipt",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player admits uncertainty, so the clerk marks the receipt before offering repair.",
  });
  applyAction(build, {
    stepId: "repair.clerk.offer_correction",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "offer_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The mismatch can still be repaired locally through a correction slip.",
  });
  const correctionEvent = applyAction(build, {
    stepId: "repair.clerk.attach_correction",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "attach_correction",
    objectId: "correction_slip",
    recordId: "store_same_order_correction",
    whyLine: "The player accepts the correction, so the Store records a corrected sale instead of a report.",
  });
  applyAction(build, {
    stepId: "repair.waiting_customer.accept_repair",
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    affordance: "accept_repair",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_repair",
    citedLedgerEventId: correctionEvent.eventId,
    knownLedgerEventIds: [correctionEvent.eventId],
    whyLine: "A waiting customer sees the correction slip attach and lets the line settle instead of turning it into a complaint.",
  });

  return routeProof({
    build,
    routeId: "repair_recovered",
    sessionOutcome: "cover_held",
    playerLineKind: "repair_line",
    playerLine: "잠깐 헷갈렸어요. 정정해서 같은 걸로 할게요.",
    socialReactionSummary: "The clerk contains the mismatch through a correction, and a waiting customer accepts the repair so the queue settles instead of becoming a report.",
  });
}

function buildSoftReportProof(): SameOrderAgenticRouteProof {
  const build = createRouteBuild();
  applyAction(build, {
    stepId: "soft.clerk.mark_receipt",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player breaks the expected routine, so the clerk marks the receipt as unresolved.",
  });
  const reportEvent = applyAction(build, {
    stepId: "soft.clerk.place_note",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The unresolved line creates a local Store note without opening Station inquest yet.",
  });
  applyAction(build, {
    stepId: "soft.waiting_customer.complain_delay",
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_delay",
    citedLedgerEventId: reportEvent.eventId,
    knownLedgerEventIds: [reportEvent.eventId],
    whyLine: "A waiting customer sees the clerk note slow the line and adds public queue pressure.",
  });
  applyAction(build, {
    stepId: "soft.park_witness.post_rumor",
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    affordance: "post_rumor",
    objectId: "park_notice_board",
    recordId: "park_public_rumor",
    citedLedgerEventId: reportEvent.eventId,
    knownLedgerEventIds: [reportEvent.eventId],
    whyLine: "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue.",
  });
  applyAction(build, {
    stepId: "soft.manager.place_followup_note",
    actorId: "NPC_Store_Manager",
    role: "store_manager",
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_manager_followup",
    whyLine: "The manager can see the pending Store note and adds a liability note without citing private Station facts.",
  });
  const servicePausedEvent = applyAction(build, {
    stepId: "soft.manager.pause_service",
    actorId: "NPC_Store_Manager",
    role: "store_manager",
    affordance: "pause_service",
    objectId: "store_counter",
    whyLine: "The manager pauses counter service because the pending Store note has made normal service unsafe to continue.",
  });
  applyAction(build, {
    stepId: "soft.waiting_customer.leave_queue",
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    affordance: "leave_queue",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_left",
    citedLedgerEventId: servicePausedEvent.eventId,
    knownLedgerEventIds: [servicePausedEvent.eventId],
    whyLine: "A waiting customer sees counter service pause and leaves the line instead of waiting for the unresolved report.",
  });

  return routeProof({
    build,
    routeId: "soft_report",
    sessionOutcome: "soft_report",
    playerLineKind: "soft_report_line",
    playerLine: "오늘은 그냥 지나가는 중인데, 늘 먹던 게 뭔지는 모르겠네요.",
    socialReactionSummary: "The clerk creates a note, the queue reacts, a Park witness posts a public rumor, the manager pauses service, and a waiting customer leaves the line; Station inquest is not opened.",
  });
}

function buildInquestOpenedProof(): SameOrderAgenticRouteProof {
  const build = createRouteBuild();
  applyAction(build, {
    stepId: "inquest.clerk.mark_receipt",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "mark_receipt",
    objectId: "receipt_tray",
    recordId: "store_same_order_receipt",
    whyLine: "The player contradicts the usual order, so the clerk marks the receipt.",
  });
  const reportEvent = applyAction(build, {
    stepId: "inquest.clerk.place_note",
    actorId: "NPC_Store_Clerk",
    role: "store_clerk",
    affordance: "place_note",
    objectId: "report_tray",
    recordId: "store_same_order_clerk_statement",
    whyLine: "The contradiction produces a Store reportable note.",
  });
  applyAction(build, {
    stepId: "inquest.waiting_customer.complain_delay",
    actorId: "NPC_Waiting_Customer",
    role: "waiting_customer",
    affordance: "complain_delay",
    objectId: "store_queue_mark",
    recordId: "store_same_order_queue_delay",
    citedLedgerEventId: reportEvent.eventId,
    knownLedgerEventIds: [reportEvent.eventId],
    whyLine: "A waiting customer sees the clerk note slow the line and adds public queue pressure.",
  });
  applyAction(build, {
    stepId: "inquest.park_witness.post_rumor",
    actorId: "NPC_Park_Witness",
    role: "park_witness",
    affordance: "post_rumor",
    objectId: "park_notice_board",
    recordId: "park_public_rumor",
    citedLedgerEventId: reportEvent.eventId,
    knownLedgerEventIds: [reportEvent.eventId],
    whyLine: "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue.",
  });
  const escalatedEvent = applyAction(build, {
    stepId: "inquest.manager.forward_report",
    actorId: "NPC_Store_Manager",
    role: "store_manager",
    affordance: "forward_report",
    objectId: "report_tray",
    recordId: reportEvent.recordId,
    whyLine: "The manager sees the report tray and forwards the Store record for Station reconciliation.",
  });
  const citationEvent = applyAction(build, {
    stepId: "inquest.station.cite_store_report",
    actorId: "NPC_Station_Officer",
    role: "station_officer",
    affordance: "cite_record",
    objectId: "station_dossier",
    recordId: "station_same_order_dossier",
    citedLedgerEventId: escalatedEvent.eventId,
    knownLedgerEventIds: [escalatedEvent.eventId],
    whyLine: "The Station cites the exact forwarded Store ledger event before narrowing the player's answer.",
  });

  return routeProof({
    build,
    routeId: "inquest_opened",
    sessionOutcome: "inquest_opened",
    playerLineKind: "inquest_line",
    playerLine: "저는 이 꿈에 방금 들어왔어요.",
    socialReactionSummary: "The Store report slows the queue, a public Park notice appears, then the manager forwards a record and the Station cites the exact ledger event instead of inventing suspicion.",
    stationCitation: {
      stationEventId: citationEvent.eventId,
      citedLedgerEventId: escalatedEvent.eventId,
      citedLedgerEventKind: escalatedEvent.kind,
      recordId: citationEvent.recordId ?? "station_same_order_dossier",
      whyLine: citationEvent.whyLine,
    },
  });
}

function createRouteBuild(): MutableRouteBuild {
  return {
    environment: createSameOrderAgenticEnvironment(),
    traces: [],
  };
}

function applyAction(build: MutableRouteBuild, input: ActionStepInput): CivicLedgerEvent {
  const actor: AgentContext = {
    actorId: input.actorId,
    role: input.role,
    perceivedObjectIds: getVisibleObjectIds(build.environment, input.role),
    knownLedgerEventIds: input.knownLedgerEventIds ?? [],
    visibleEconomy: {
      accountCredit: true,
      localTrust: true,
      recordBurden: true,
      stationAttention: true,
    },
  };
  const result = validateAndApplyEnvironmentAction(build.environment, actor, {
    actorId: input.actorId,
    role: input.role,
    affordance: input.affordance,
    objectId: input.objectId,
    recordId: input.recordId,
    citedLedgerEventId: input.citedLedgerEventId,
    whyLine: input.whyLine,
  });

  if (!result.ok) {
    throw new Error(`failed Same Order agentic route step ${input.stepId}: ${result.reason} ${result.detail}`);
  }

  build.environment = result.environment;
  build.traces.push({
    stepId: input.stepId,
    actorId: input.actorId,
    actorRole: input.role,
    perceivedObjectIds: actor.perceivedObjectIds,
    affordance: input.affordance,
    objectId: input.objectId,
    accepted: true,
    ledgerEventId: result.event.eventId,
    ledgerEventKind: result.event.kind,
    recordId: result.event.recordId,
    citedLedgerEventId: result.event.citedLedgerEventId,
    economyAfter: { ...result.environment.economy },
    whyLine: input.whyLine,
  });

  return result.event;
}

function routeProof(input: {
  build: MutableRouteBuild;
  routeId: SameOrderAgenticRouteId;
  sessionOutcome: SameOrderAgenticRouteProof["sessionOutcome"];
  playerLineKind: SameOrderAgenticRouteProof["playerLineKind"];
  playerLine: string;
  socialReactionSummary: string;
  stationCitation?: SameOrderAgenticStationCitation;
}): SameOrderAgenticRouteProof {
  return {
    routeId: input.routeId,
    routeOutcome: input.routeId,
    sessionOutcome: input.sessionOutcome,
    playerLineKind: input.playerLineKind,
    playerLine: input.playerLine,
    socialReactionSummary: input.socialReactionSummary,
    actionTrace: input.build.traces,
    ledgerEventKinds: input.build.environment.ledger.map(event => event.kind),
    ledgerAffordances: input.build.environment.ledger.map(event => event.affordance),
    socialObservationTrace: buildSocialObservationTrace(input.build.traces),
    finalObjectStates: Object.fromEntries(
      input.build.environment.objects.map(object => [object.objectId, object.state]),
    ) as Partial<Record<SameOrderObjectId, EnvironmentObjectState>>,
    economyAfter: { ...input.build.environment.economy },
    stationCitation: input.stationCitation,
  };
}

function buildSocialObservationTrace(
  traces: readonly SameOrderAgenticActionTrace[],
): SameOrderAgenticSocialObservation[] {
  const observations: SameOrderAgenticSocialObservation[] = [];
  for (let index = 1; index < traces.length; index += 1) {
    const trace = traces[index];
    if (trace.actorRole === "store_clerk") {
      continue;
    }
    const observedTrace = findObservedTraceForActor(trace, traces.slice(0, index));
    if (observedTrace === undefined) {
      continue;
    }
    observations.push({
      observerActorId: trace.actorId,
      observerRole: trace.actorRole,
      observedLedgerEventId: observedTrace.ledgerEventId,
      observedActorRole: observedTrace.actorRole,
      observedAffordance: observedTrace.affordance,
      observedObjectId: observedTrace.objectId,
      economyPressure: {
        localTrust: observedTrace.economyAfter.localTrust,
        recordBurden: observedTrace.economyAfter.recordBurden,
        stationAttention: observedTrace.economyAfter.stationAttention,
      },
      resultingStepId: trace.stepId,
      resultingAffordance: trace.affordance,
      whyLine: `${trace.actorRole} uses ${observedTrace.actorRole}'s ${observedTrace.affordance} record before choosing ${trace.affordance}.`,
    });
  }
  return observations;
}

function findObservedTraceForActor(
  trace: SameOrderAgenticActionTrace,
  previousTraces: readonly SameOrderAgenticActionTrace[],
): SameOrderAgenticActionTrace | undefined {
  if (trace.citedLedgerEventId !== undefined) {
    return previousTraces.find(previousTrace => previousTrace.ledgerEventId === trace.citedLedgerEventId);
  }
  return [...previousTraces].reverse().find(previousTrace =>
    previousTrace.objectId === trace.objectId
    || previousTrace.recordId !== undefined && previousTrace.recordId === trace.recordId
  );
}

function validateRouteProofCommon(
  proof: SameOrderAgenticRouteProof,
  failures: SameOrderAgenticRouteProofFailure[],
): void {
  if (proof.routeOutcome !== proof.routeId) {
    failures.push({ routeId: proof.routeId, path: "routeOutcome", message: "routeOutcome must match routeId" });
  }
  if (proof.playerLine.trim().length === 0 || !proof.playerLineKind.endsWith("_line")) {
    failures.push({ routeId: proof.routeId, path: "playerLine", message: "route proof must include the player line that drove the environment state" });
  }
  if (proof.actionTrace.length === 0) {
    failures.push({ routeId: proof.routeId, path: "actionTrace", message: "route proof must include validated environment actions" });
  }
  if (!sameOrderedStrings(proof.ledgerEventKinds, proof.actionTrace.map(trace => trace.ledgerEventKind))) {
    failures.push({ routeId: proof.routeId, path: "ledgerEventKinds", message: "ledgerEventKinds must match validated action trace order" });
  }
  if (!sameOrderedStrings(proof.ledgerAffordances, proof.actionTrace.map(trace => trace.affordance))) {
    failures.push({ routeId: proof.routeId, path: "ledgerAffordances", message: "ledgerAffordances must match validated action trace order" });
  }
  const socialObservationTrace = Array.isArray(proof.socialObservationTrace)
    ? proof.socialObservationTrace
    : [];
  if (!Array.isArray(proof.socialObservationTrace)) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "route proof must include social observation trace, even when empty" });
  }
  for (const [index, observation] of socialObservationTrace.entries()) {
    const observedTrace = proof.actionTrace.find(trace => trace.ledgerEventId === observation.observedLedgerEventId);
    const resultingTrace = proof.actionTrace.find(trace => trace.stepId === observation.resultingStepId);
    if (observedTrace === undefined) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}].observedLedgerEventId`, message: "social observation must point to an existing prior ledger event" });
      continue;
    }
    if (resultingTrace === undefined) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}].resultingStepId`, message: "social observation must point to the resulting validated action" });
      continue;
    }
    if (proof.actionTrace.indexOf(observedTrace) >= proof.actionTrace.indexOf(resultingTrace)) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}]`, message: "social observation must happen before the resulting action" });
    }
    if (observation.observerRole !== resultingTrace.actorRole || observation.resultingAffordance !== resultingTrace.affordance) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}].observerRole`, message: "social observation must match the resulting actor role and affordance" });
    }
    if (observation.observedActorRole !== observedTrace.actorRole || observation.observedAffordance !== observedTrace.affordance || observation.observedObjectId !== observedTrace.objectId) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}].observedAffordance`, message: "social observation must preserve the observed actor, affordance, and object" });
    }
    if (observation.whyLine.trim().length === 0) {
      failures.push({ routeId: proof.routeId, path: `socialObservationTrace[${index}].whyLine`, message: "social observation must explain why the next actor moved" });
    }
  }
  for (const [index, trace] of proof.actionTrace.entries()) {
    if (!trace.accepted) {
      failures.push({ routeId: proof.routeId, path: `actionTrace[${index}].accepted`, message: "all proof actions must be accepted by runtime validation" });
    }
    if (!trace.perceivedObjectIds.includes(trace.objectId)) {
      failures.push({ routeId: proof.routeId, path: `actionTrace[${index}].perceivedObjectIds`, message: "actor must perceive the acted-on object" });
    }
    if (trace.whyLine.trim().length === 0) {
      failures.push({ routeId: proof.routeId, path: `actionTrace[${index}].whyLine`, message: "validated action must retain a why-line" });
    }
  }
}

function validateCleanCover(
  proof: SameOrderAgenticRouteProof,
  failures: SameOrderAgenticRouteProofFailure[],
): void {
  if (proof.sessionOutcome !== "cover_held") {
    failures.push({ routeId: proof.routeId, path: "sessionOutcome", message: "clean cover must hold cover" });
  }
  if (!proof.ledgerEventKinds.includes("store_sale_normal") || proof.ledgerEventKinds.includes("store_exception_reported")) {
    failures.push({ routeId: proof.routeId, path: "ledgerEventKinds", message: "clean cover must close a normal sale without a Store report" });
  }
  if (proof.finalObjectStates.receipt_tray !== "normal" || proof.finalObjectStates.store_queue_mark !== "settled" || proof.economyAfter.recordBurden !== 0 || proof.stationCitation !== undefined) {
    failures.push({ routeId: proof.routeId, path: "finalObjectStates", message: "clean cover must leave a normal receipt and no citation burden" });
  }
  if (!proof.socialObservationTrace.some(observation =>
    observation.observerRole === "waiting_customer"
    && observation.observedActorRole === "store_clerk"
    && observation.observedAffordance === "create_receipt"
    && observation.resultingAffordance === "accept_routine"
  )) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "clean cover must prove another NPC accepted the routine record" });
  }
}

function validateRepairRecovered(
  proof: SameOrderAgenticRouteProof,
  failures: SameOrderAgenticRouteProofFailure[],
): void {
  if (proof.sessionOutcome !== "cover_held") {
    failures.push({ routeId: proof.routeId, path: "sessionOutcome", message: "repair route must still hold cover" });
  }
  for (const eventKind of ["correction_offered", "store_sale_corrected"] as const) {
    if (!proof.ledgerEventKinds.includes(eventKind)) {
      failures.push({ routeId: proof.routeId, path: "ledgerEventKinds", message: `repair route must include ${eventKind}` });
    }
  }
  if (proof.ledgerEventKinds.includes("store_report_escalated") || proof.stationCitation !== undefined) {
    failures.push({ routeId: proof.routeId, path: "stationCitation", message: "repair route must not create Station citation" });
  }
  if (!proof.socialObservationTrace.some(observation =>
    observation.observerRole === "waiting_customer"
    && observation.observedActorRole === "store_clerk"
    && observation.observedAffordance === "attach_correction"
    && observation.resultingAffordance === "accept_repair"
  )) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "repair route must prove another NPC accepted the correction record" });
  }
  if (proof.finalObjectStates.store_queue_mark !== "settled") {
    failures.push({ routeId: proof.routeId, path: "finalObjectStates.store_queue_mark", message: "repair route must visibly settle the queue after correction" });
  }
  if (proof.economyAfter.recordBurden <= 0 || proof.economyAfter.stationAttention >= 50) {
    failures.push({ routeId: proof.routeId, path: "economyAfter", message: "repair route must create bounded local burden below Station-report pressure" });
  }
}

function validateSoftReport(
  proof: SameOrderAgenticRouteProof,
  failures: SameOrderAgenticRouteProofFailure[],
): void {
  if (proof.sessionOutcome !== "soft_report") {
    failures.push({ routeId: proof.routeId, path: "sessionOutcome", message: "soft report must end as a report, not inquest" });
  }
  if (!proof.ledgerEventKinds.includes("store_exception_reported")) {
    failures.push({ routeId: proof.routeId, path: "ledgerEventKinds", message: "soft report must create a Store report" });
  }
  if (!proof.actionTrace.some(trace => trace.actorRole === "store_manager")) {
    failures.push({ routeId: proof.routeId, path: "actionTrace", message: "soft report must include a Store-side actor reaction beyond the clerk" });
  }
  if (!proof.actionTrace.some(trace => trace.actorRole === "store_manager" && trace.affordance === "pause_service")) {
    failures.push({ routeId: proof.routeId, path: "actionTrace", message: "soft report must pause local counter service before broader escalation" });
  }
  if (!proof.actionTrace.some(trace => trace.actorRole === "waiting_customer" && trace.affordance === "leave_queue")) {
    failures.push({ routeId: proof.routeId, path: "actionTrace", message: "soft report must show a waiting customer leaving paused service" });
  }
  if (!proof.socialObservationTrace.some(observation =>
    observation.observerRole === "store_manager"
    && observation.observedActorRole === "store_clerk"
    && observation.observedAffordance === "place_note"
    && observation.resultingAffordance === "place_note"
    && observation.economyPressure.recordBurden >= 50
  )) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "soft report must prove the manager acted from a visible clerk record and local burden" });
  }
  if (proof.ledgerEventKinds.includes("station_record_cited") || proof.stationCitation !== undefined) {
    failures.push({ routeId: proof.routeId, path: "stationCitation", message: "soft report must not include Station citation" });
  }
  if (proof.finalObjectStates.store_counter !== "paused") {
    failures.push({ routeId: proof.routeId, path: "finalObjectStates.store_counter", message: "soft report must visibly pause the local counter" });
  }
  if (proof.finalObjectStates.store_queue_mark !== "empty") {
    failures.push({ routeId: proof.routeId, path: "finalObjectStates.store_queue_mark", message: "soft report must visibly empty the queue after service pauses" });
  }
}

function validateInquestOpened(
  proof: SameOrderAgenticRouteProof,
  failures: SameOrderAgenticRouteProofFailure[],
): void {
  if (proof.sessionOutcome !== "inquest_opened") {
    failures.push({ routeId: proof.routeId, path: "sessionOutcome", message: "inquest route must open inquest" });
  }
  for (const eventKind of ["store_exception_reported", "store_report_escalated", "station_record_cited"] as const) {
    if (!proof.ledgerEventKinds.includes(eventKind)) {
      failures.push({ routeId: proof.routeId, path: "ledgerEventKinds", message: `inquest route must include ${eventKind}` });
    }
  }
  const stationCitation = proof.stationCitation;
  if (stationCitation === undefined) {
    failures.push({ routeId: proof.routeId, path: "stationCitation", message: "inquest route must cite an exact Store ledger event" });
    return;
  }
  if (stationCitation.citedLedgerEventKind !== "store_report_escalated") {
    failures.push({ routeId: proof.routeId, path: "stationCitation.citedLedgerEventKind", message: "Station must cite the forwarded Store report event" });
  }
  const stationTrace = proof.actionTrace.find(trace => trace.ledgerEventId === stationCitation.stationEventId);
  if (stationTrace?.actorRole !== "station_officer" || stationTrace.citedLedgerEventId !== stationCitation.citedLedgerEventId) {
    failures.push({ routeId: proof.routeId, path: "actionTrace", message: "Station citation must be backed by the station officer action trace" });
  }
  if (proof.finalObjectStates.station_dossier !== "cited") {
    failures.push({ routeId: proof.routeId, path: "finalObjectStates.station_dossier", message: "inquest route must leave the Station dossier cited" });
  }
  if (!proof.socialObservationTrace.some(observation =>
    observation.observerRole === "store_manager"
    && observation.observedActorRole === "store_clerk"
    && observation.resultingAffordance === "forward_report"
  )) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "inquest route must prove the manager forwarded a clerk-created record" });
  }
  if (!proof.socialObservationTrace.some(observation =>
    observation.observerRole === "station_officer"
    && observation.observedLedgerEventId === stationCitation.citedLedgerEventId
    && observation.resultingAffordance === "cite_record"
  )) {
    failures.push({ routeId: proof.routeId, path: "socialObservationTrace", message: "inquest route must prove the Station cited a forwarded social record" });
  }
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
