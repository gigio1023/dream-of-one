import {
  createSameOrderAgenticEnvironment,
  getVisibleObjectIds,
  listAvailableEnvironmentActions,
  validateAndApplyEnvironmentAction,
  type AgentContext,
  type AgentRole,
  type AgenticEnvironmentState,
  type AvailableEnvironmentAction,
  type CivicEconomyState,
  type CivicLedgerEvent,
  type EnvironmentAffordance,
  type EnvironmentObjectState,
  type LedgerEventKind,
  type SameOrderObjectId,
} from "./agentic-environment.js";
import {
  buildSameOrderAgenticRouteProofs,
  type SameOrderAgenticRouteId,
  type SameOrderAgenticStationCitation,
} from "./same-order-agentic-routes.js";

export const SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION =
  "same-order-provider-action-comparison-v1" as const;

export interface SameOrderProviderActionProposal {
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  recordId?: string;
  citedLedgerEventId?: string;
  whyLine: string;
  npcLineCandidate?: string;
  selectionReason?: string;
}

export interface SameOrderProviderActionFrame {
  routeId: SameOrderAgenticRouteId;
  stepId: string;
  actorId: string;
  actorRole: AgentRole;
  playerLine: string;
  stepGoal: string;
  perceivedObjectIds: SameOrderObjectId[];
  knownLedgerEventIds: string[];
  availableActions: AvailableEnvironmentAction[];
  ledgerEventKindsSoFar: LedgerEventKind[];
  economy: CivicEconomyState;
}

export interface SameOrderProviderActionTrace {
  stepId: string;
  actorId: string;
  actorRole: AgentRole;
  perceivedObjectIds: SameOrderObjectId[];
  availableActions: AvailableEnvironmentAction[];
  providerProposal: SameOrderProviderActionProposal;
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  accepted: true;
  ledgerEventId: string;
  ledgerEventKind: LedgerEventKind;
  recordId?: string;
  citedLedgerEventId?: string;
  economyAfter: CivicEconomyState;
  whyLine: string;
  selectionReason: string;
  providerLine?: string;
}

export interface SameOrderProviderActionRouteProof {
  routeId: SameOrderAgenticRouteId;
  routeOutcome: SameOrderAgenticRouteId;
  sessionOutcome: "cover_held" | "soft_report" | "inquest_opened";
  providerMode: "provider-action-proposal";
  playerLineKind: "clean_cover_line" | "repair_line" | "soft_report_line" | "inquest_line";
  playerLine: string;
  socialReactionSummary: string;
  actionTrace: SameOrderProviderActionTrace[];
  ledgerEventKinds: LedgerEventKind[];
  ledgerAffordances: EnvironmentAffordance[];
  finalObjectStates: Partial<Record<SameOrderObjectId, EnvironmentObjectState>>;
  economyAfter: CivicEconomyState;
  stationCitation?: SameOrderAgenticStationCitation;
}

export interface SameOrderProviderActionComparisonFailure {
  routeId?: SameOrderAgenticRouteId;
  path: string;
  message: string;
}

export interface SameOrderProviderActionComparison {
  version: typeof SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION;
  providerMode: "provider-action-proposal";
  pass: boolean;
  baselineRouteIds: SameOrderAgenticRouteId[];
  providerRouteIds: SameOrderAgenticRouteId[];
  providerProofs: SameOrderProviderActionRouteProof[];
  failures: SameOrderProviderActionComparisonFailure[];
}

export type SameOrderProviderActionProposalSource = (
  frame: SameOrderProviderActionFrame,
) => SameOrderProviderActionProposal;

interface RouteSpec {
  routeId: SameOrderAgenticRouteId;
  sessionOutcome: SameOrderProviderActionRouteProof["sessionOutcome"];
  playerLineKind: SameOrderProviderActionRouteProof["playerLineKind"];
  playerLine: string;
  socialReactionSummary: string;
  steps: StepSpec[];
}

interface StepSpec {
  stepId: string;
  actorId: string;
  actorRole: AgentRole;
  stepGoal: string;
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  recordId?: string;
  citedLedgerEventFromStepId?: string;
  knownLedgerEventFromStepIds?: string[];
  whyLine: string;
  npcLineCandidate: string;
}

const PROVIDER_PROPOSAL_KEYS = new Set([
  "affordance",
  "objectId",
  "recordId",
  "citedLedgerEventId",
  "whyLine",
  "npcLineCandidate",
  "selectionReason",
]);

const ROUTE_SPECS: RouteSpec[] = [
  {
    routeId: "clean_cover",
    sessionOutcome: "cover_held",
    playerLineKind: "clean_cover_line",
    playerLine: "네, 같은 걸로 주세요.",
    socialReactionSummary: "The provider-shaped proposal path closes a normal receipt and preserves cover.",
    steps: [
      {
        stepId: "clean.clerk.cite_usual_order",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "cite the visible usual-order cue before closing the sale",
        affordance: "cite_expected_order",
        objectId: "usual_order_cue",
        whyLine: "The player accepted the usual order, so the clerk cites the routine before closing the sale.",
        npcLineCandidate: "늘 드시던 걸로 적겠습니다.",
      },
      {
        stepId: "clean.clerk.create_receipt",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "create a normal receipt from the accepted Store routine",
        affordance: "create_receipt",
        objectId: "receipt_tray",
        recordId: "store_same_order_receipt",
        whyLine: "The accepted line matches the Store routine and creates a normal receipt.",
        npcLineCandidate: "영수증은 정상 처리로 남깁니다.",
      },
    ],
  },
  {
    routeId: "repair_recovered",
    sessionOutcome: "cover_held",
    playerLineKind: "repair_line",
    playerLine: "잠깐 헷갈렸어요. 정정해서 같은 걸로 할게요.",
    socialReactionSummary: "The provider-shaped proposal path keeps the mismatch local through a correction slip.",
    steps: [
      {
        stepId: "repair.clerk.mark_receipt",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "mark the receipt because the player admitted uncertainty",
        affordance: "mark_receipt",
        objectId: "receipt_tray",
        recordId: "store_same_order_receipt",
        whyLine: "The player admits uncertainty, so the clerk marks the receipt before offering repair.",
        npcLineCandidate: "잠깐 표시해둘게요. 정정하면 됩니다.",
      },
      {
        stepId: "repair.clerk.offer_correction",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "offer a correction slip while the mismatch is still local",
        affordance: "offer_correction",
        objectId: "correction_slip",
        recordId: "store_same_order_correction",
        whyLine: "The mismatch can still be repaired locally through a correction slip.",
        npcLineCandidate: "정정표로 처리하면 여기서 끝낼 수 있습니다.",
      },
      {
        stepId: "repair.clerk.attach_correction",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "attach the correction instead of escalating a report",
        affordance: "attach_correction",
        objectId: "correction_slip",
        recordId: "store_same_order_correction",
        whyLine: "The player accepts the correction, so the Store records a corrected sale instead of a report.",
        npcLineCandidate: "정정표 첨부했습니다. 다음엔 바로 말씀해주세요.",
      },
    ],
  },
  {
    routeId: "soft_report",
    sessionOutcome: "soft_report",
    playerLineKind: "soft_report_line",
    playerLine: "오늘은 그냥 지나가는 중인데, 늘 먹던 게 뭔지는 모르겠네요.",
    socialReactionSummary: "The provider-shaped proposal path creates a Store report, a queue reaction, a Park notice, and a manager follow-up without Station citation.",
    steps: [
      {
        stepId: "soft.clerk.mark_receipt",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "mark the receipt as unresolved because the routine broke",
        affordance: "mark_receipt",
        objectId: "receipt_tray",
        recordId: "store_same_order_receipt",
        whyLine: "The player breaks the expected routine, so the clerk marks the receipt as unresolved.",
        npcLineCandidate: "그 말이면 영수증에 표시가 남습니다.",
      },
      {
        stepId: "soft.clerk.place_note",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "place a local Store note without opening Station inquest",
        affordance: "place_note",
        objectId: "report_tray",
        recordId: "store_same_order_clerk_statement",
        whyLine: "The unresolved line creates a local Store note without opening Station inquest yet.",
        npcLineCandidate: "점포 기록으로만 남겨두겠습니다.",
      },
      {
        stepId: "soft.waiting_customer.complain_delay",
        actorId: "NPC_Waiting_Customer",
        actorRole: "waiting_customer",
        stepGoal: "react to the visible Store note by adding public queue pressure",
        affordance: "complain_delay",
        objectId: "store_queue_mark",
        recordId: "store_same_order_queue_delay",
        citedLedgerEventFromStepId: "soft.clerk.place_note",
        knownLedgerEventFromStepIds: ["soft.clerk.place_note"],
        whyLine: "A waiting customer sees the clerk note slow the line and adds public queue pressure.",
        npcLineCandidate: "줄이 멈췄어요. 저 사람 말 때문에 기록이 붙었대요.",
      },
      {
        stepId: "soft.park_witness.post_rumor",
        actorId: "NPC_Park_Witness",
        actorRole: "park_witness",
        stepGoal: "turn the Store note into a small public notice outside the queue",
        affordance: "post_rumor",
        objectId: "park_notice_board",
        recordId: "park_public_rumor",
        citedLedgerEventFromStepId: "soft.clerk.place_note",
        knownLedgerEventFromStepIds: ["soft.clerk.place_note"],
        whyLine: "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue.",
        npcLineCandidate: "공원 게시판에 적어둘게요. 같은 말이 동네를 돕니다.",
      },
      {
        stepId: "soft.manager.place_followup_note",
        actorId: "NPC_Store_Manager",
        actorRole: "store_manager",
        stepGoal: "add a manager follow-up note from visible Store burden",
        affordance: "place_note",
        objectId: "report_tray",
        recordId: "store_same_order_manager_followup",
        whyLine: "The manager can see the pending Store note and adds a liability note without citing private Station facts.",
        npcLineCandidate: "보고 트레이가 열린 이상 예외 기록을 하나 더 붙입니다.",
      },
    ],
  },
  {
    routeId: "inquest_opened",
    sessionOutcome: "inquest_opened",
    playerLineKind: "inquest_line",
    playerLine: "저는 이 꿈에 방금 들어왔어요.",
    socialReactionSummary: "The provider-shaped proposal path creates a queue reaction and public Park notice before the manager forwards the Store report and Station cites that exact ledger event.",
    steps: [
      {
        stepId: "inquest.clerk.mark_receipt",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "mark the receipt because the player contradicted the usual order",
        affordance: "mark_receipt",
        objectId: "receipt_tray",
        recordId: "store_same_order_receipt",
        whyLine: "The player contradicts the usual order, so the clerk marks the receipt.",
        npcLineCandidate: "그 답은 기존 주문과 맞지 않습니다. 표시해둘게요.",
      },
      {
        stepId: "inquest.clerk.place_note",
        actorId: "NPC_Store_Clerk",
        actorRole: "store_clerk",
        stepGoal: "create a Store reportable note from the contradiction",
        affordance: "place_note",
        objectId: "report_tray",
        recordId: "store_same_order_clerk_statement",
        whyLine: "The contradiction produces a Store reportable note.",
        npcLineCandidate: "이건 점포 보고로 넘겨야 합니다.",
      },
      {
        stepId: "inquest.waiting_customer.complain_delay",
        actorId: "NPC_Waiting_Customer",
        actorRole: "waiting_customer",
        stepGoal: "react to the Store report by turning the queue mark into public pressure",
        affordance: "complain_delay",
        objectId: "store_queue_mark",
        recordId: "store_same_order_queue_delay",
        citedLedgerEventFromStepId: "inquest.clerk.place_note",
        knownLedgerEventFromStepIds: ["inquest.clerk.place_note"],
        whyLine: "A waiting customer sees the clerk note slow the line and adds public queue pressure.",
        npcLineCandidate: "줄이 멈췄어요. 저 사람 말 때문에 기록이 붙었대요.",
      },
      {
        stepId: "inquest.park_witness.post_rumor",
        actorId: "NPC_Park_Witness",
        actorRole: "park_witness",
        stepGoal: "turn the Store note into a small public notice outside the queue",
        affordance: "post_rumor",
        objectId: "park_notice_board",
        recordId: "park_public_rumor",
        citedLedgerEventFromStepId: "inquest.clerk.place_note",
        knownLedgerEventFromStepIds: ["inquest.clerk.place_note"],
        whyLine: "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue.",
        npcLineCandidate: "공원 게시판에 적어둘게요. 같은 말이 동네를 돕니다.",
      },
      {
        stepId: "inquest.manager.forward_report",
        actorId: "NPC_Store_Manager",
        actorRole: "store_manager",
        stepGoal: "forward the visible Store report for Station reconciliation",
        affordance: "forward_report",
        objectId: "report_tray",
        recordId: "store_same_order_clerk_statement",
        whyLine: "The manager sees the report tray and forwards the Store record for Station reconciliation.",
        npcLineCandidate: "점포 기록을 스테이션 대조로 넘깁니다.",
      },
      {
        stepId: "inquest.station.cite_store_report",
        actorId: "NPC_Station_Officer",
        actorRole: "station_officer",
        stepGoal: "cite the forwarded Store ledger event before questioning",
        affordance: "cite_record",
        objectId: "station_dossier",
        recordId: "station_same_order_dossier",
        citedLedgerEventFromStepId: "inquest.manager.forward_report",
        knownLedgerEventFromStepIds: ["inquest.manager.forward_report"],
        whyLine: "The Station cites the exact forwarded Store ledger event before narrowing the player's answer.",
        npcLineCandidate: "상점에서 넘어온 기록 번호를 먼저 인용하겠습니다.",
      },
    ],
  },
];

export function buildSameOrderProviderActionComparison(
  proposalSource: SameOrderProviderActionProposalSource = scriptedProviderProposalSource,
): SameOrderProviderActionComparison {
  const baselineProofs = buildSameOrderAgenticRouteProofs();
  const providerProofs: SameOrderProviderActionRouteProof[] = [];
  const failures: SameOrderProviderActionComparisonFailure[] = [];

  for (const spec of ROUTE_SPECS) {
    try {
      providerProofs.push(buildProviderRouteProof(spec.routeId, proposalSource));
    } catch (error) {
      failures.push({
        routeId: spec.routeId,
        path: "providerProofs",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  compareBaselineAndProviderProofs(baselineProofs, providerProofs, failures);

  return {
    version: SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION,
    providerMode: "provider-action-proposal",
    pass: failures.length === 0,
    baselineRouteIds: baselineProofs.map(proof => proof.routeId),
    providerRouteIds: providerProofs.map(proof => proof.routeId),
    providerProofs,
    failures,
  };
}

export function buildProviderRouteProof(
  routeId: SameOrderAgenticRouteId,
  proposalSource: SameOrderProviderActionProposalSource = scriptedProviderProposalSource,
): SameOrderProviderActionRouteProof {
  const spec = routeSpec(routeId);
  let environment = createSameOrderAgenticEnvironment();
  const traces: SameOrderProviderActionTrace[] = [];
  const eventsByStepId = new Map<string, CivicLedgerEvent>();

  for (const step of spec.steps) {
    const knownLedgerEventIds = (step.knownLedgerEventFromStepIds ?? [])
      .map(stepId => eventsByStepId.get(stepId)?.eventId)
      .filter((eventId): eventId is string => eventId !== undefined);
    const actor = createActorContext(environment, step.actorId, step.actorRole, knownLedgerEventIds);
    const availableActions = listAvailableEnvironmentActions(environment, actor);
    const proposal = proposalSource({
      routeId: spec.routeId,
      stepId: step.stepId,
      actorId: step.actorId,
      actorRole: step.actorRole,
      playerLine: spec.playerLine,
      stepGoal: step.stepGoal,
      perceivedObjectIds: actor.perceivedObjectIds,
      knownLedgerEventIds,
      availableActions,
      ledgerEventKindsSoFar: environment.ledger.map(event => event.kind),
      economy: { ...environment.economy },
    });
    assertProviderProposalShape(proposal);

    const citedLedgerEventId = step.citedLedgerEventFromStepId
      ? eventsByStepId.get(step.citedLedgerEventFromStepId)?.eventId
      : proposal.citedLedgerEventId;
    const actionProposal: SameOrderProviderActionProposal = {
      ...proposal,
      recordId: proposal.recordId ?? step.recordId,
      citedLedgerEventId,
    };
    assertProposalIsAvailable(actionProposal, availableActions, step.stepId);
    const result = validateAndApplyEnvironmentAction(environment, actor, {
      actorId: step.actorId,
      role: step.actorRole,
      affordance: actionProposal.affordance,
      objectId: actionProposal.objectId,
      recordId: actionProposal.recordId,
      citedLedgerEventId: actionProposal.citedLedgerEventId,
      whyLine: actionProposal.whyLine,
    });

    if (!result.ok) {
      throw new Error(`provider proposal failed validation at ${step.stepId}: ${result.reason} ${result.detail}`);
    }

    environment = result.environment;
    eventsByStepId.set(step.stepId, result.event);
    traces.push({
      stepId: step.stepId,
      actorId: step.actorId,
      actorRole: step.actorRole,
      perceivedObjectIds: actor.perceivedObjectIds,
      availableActions,
      providerProposal: actionProposal,
      affordance: actionProposal.affordance,
      objectId: actionProposal.objectId,
      accepted: true,
      ledgerEventId: result.event.eventId,
      ledgerEventKind: result.event.kind,
      recordId: result.event.recordId,
      citedLedgerEventId: result.event.citedLedgerEventId,
      economyAfter: { ...result.environment.economy },
      whyLine: actionProposal.whyLine,
      selectionReason: actionProposal.selectionReason ?? actionProposal.whyLine,
      providerLine: actionProposal.npcLineCandidate,
    });
  }

  return routeProofFromEnvironment(spec, environment, traces);
}

function scriptedProviderProposalSource(frame: SameOrderProviderActionFrame): SameOrderProviderActionProposal {
  const step = routeSpec(frame.routeId).steps.find(candidate => candidate.stepId === frame.stepId);
  if (!step) {
    throw new Error(`unknown provider action step: ${frame.stepId}`);
  }
  const available = frame.availableActions.find(action =>
    action.affordance === step.affordance && action.objectId === step.objectId
  );
  if (!available) {
    throw new Error(`scripted provider target is unavailable at ${frame.stepId}`);
  }

  return {
    affordance: available.affordance,
    objectId: available.objectId,
    recordId: step.recordId ?? available.recordId,
    citedLedgerEventId: available.citableLedgerEventIds[0],
    whyLine: step.whyLine,
    npcLineCandidate: step.npcLineCandidate,
    selectionReason: `${frame.actorRole} chooses ${available.affordance} because ${frame.stepGoal}.`,
  };
}

function createActorContext(
  environment: AgenticEnvironmentState,
  actorId: string,
  role: AgentRole,
  knownLedgerEventIds: string[],
): AgentContext {
  return {
    actorId,
    role,
    perceivedObjectIds: getVisibleObjectIds(environment, role),
    knownLedgerEventIds,
    visibleEconomy: {
      accountCredit: true,
      localTrust: true,
      recordBurden: true,
      stationAttention: true,
    },
  };
}

function routeProofFromEnvironment(
  spec: RouteSpec,
  environment: AgenticEnvironmentState,
  traces: SameOrderProviderActionTrace[],
): SameOrderProviderActionRouteProof {
  return {
    routeId: spec.routeId,
    routeOutcome: spec.routeId,
    sessionOutcome: spec.sessionOutcome,
    providerMode: "provider-action-proposal",
    playerLineKind: spec.playerLineKind,
    playerLine: spec.playerLine,
    socialReactionSummary: spec.socialReactionSummary,
    actionTrace: traces,
    ledgerEventKinds: environment.ledger.map(event => event.kind),
    ledgerAffordances: environment.ledger.map(event => event.affordance),
    finalObjectStates: Object.fromEntries(
      environment.objects.map(object => [object.objectId, object.state]),
    ) as Partial<Record<SameOrderObjectId, EnvironmentObjectState>>,
    economyAfter: { ...environment.economy },
    stationCitation: stationCitationFromTrace(traces),
  };
}

function stationCitationFromTrace(
  traces: SameOrderProviderActionTrace[],
): SameOrderAgenticStationCitation | undefined {
  const stationTrace = traces.find(trace => trace.ledgerEventKind === "station_record_cited");
  const citedTrace = stationTrace?.citedLedgerEventId
    ? traces.find(trace => trace.ledgerEventId === stationTrace.citedLedgerEventId)
    : undefined;
  if (!stationTrace || !stationTrace.citedLedgerEventId || !citedTrace) {
    return undefined;
  }

  return {
    stationEventId: stationTrace.ledgerEventId,
    citedLedgerEventId: stationTrace.citedLedgerEventId,
    citedLedgerEventKind: citedTrace.ledgerEventKind,
    recordId: stationTrace.recordId ?? "station_same_order_dossier",
    whyLine: stationTrace.whyLine,
  };
}

function assertProviderProposalShape(proposal: SameOrderProviderActionProposal): void {
  if (typeof proposal !== "object" || proposal === null) {
    throw new Error("provider proposal must be an object");
  }
  const unsupportedKeys = Object.keys(proposal as unknown as Record<string, unknown>)
    .filter(key => !PROVIDER_PROPOSAL_KEYS.has(key));
  if (unsupportedKeys.length > 0) {
    throw new Error(`provider proposal contains unsupported field: ${unsupportedKeys[0]}`);
  }
  if (typeof proposal.affordance !== "string" || typeof proposal.objectId !== "string") {
    throw new Error("provider proposal must select an affordance and objectId");
  }
  if (typeof proposal.whyLine !== "string" || proposal.whyLine.trim().length === 0) {
    throw new Error("provider proposal must include a whyLine");
  }
}

function assertProposalIsAvailable(
  proposal: SameOrderProviderActionProposal,
  availableActions: AvailableEnvironmentAction[],
  stepId: string,
): void {
  const available = availableActions.find(action =>
    action.affordance === proposal.affordance && action.objectId === proposal.objectId
  );
  if (!available) {
    throw new Error(`provider proposal selected unavailable action at ${stepId}: ${proposal.affordance} on ${proposal.objectId}`);
  }
  if (available.requiresLedgerEvent) {
    const citedLedgerEventId = proposal.citedLedgerEventId ?? "";
    if (!available.citableLedgerEventIds.includes(citedLedgerEventId)) {
      throw new Error(`provider proposal selected uncitable ledger event at ${stepId}: ${citedLedgerEventId}`);
    }
  }
}

function compareBaselineAndProviderProofs(
  baselineProofs: ReturnType<typeof buildSameOrderAgenticRouteProofs>,
  providerProofs: SameOrderProviderActionRouteProof[],
  failures: SameOrderProviderActionComparisonFailure[],
): void {
  for (const baseline of baselineProofs) {
    const provider = providerProofs.find(candidate => candidate.routeId === baseline.routeId);
    if (!provider) {
      failures.push({ routeId: baseline.routeId, path: "providerProofs", message: "missing provider comparison route" });
      continue;
    }
    if (!sameOrderedStrings(provider.ledgerEventKinds, baseline.ledgerEventKinds)) {
      failures.push({ routeId: baseline.routeId, path: "ledgerEventKinds", message: "provider proposal path must preserve provider-off ledger outcomes" });
    }
    if (!sameOrderedStrings(provider.ledgerAffordances, baseline.ledgerAffordances)) {
      failures.push({ routeId: baseline.routeId, path: "ledgerAffordances", message: "provider proposal path must preserve provider-off affordance provenance" });
    }
    if (JSON.stringify(provider.finalObjectStates) !== JSON.stringify(baseline.finalObjectStates)) {
      failures.push({ routeId: baseline.routeId, path: "finalObjectStates", message: "provider proposal path must preserve final object states" });
    }
    if (JSON.stringify(provider.economyAfter) !== JSON.stringify(baseline.economyAfter)) {
      failures.push({ routeId: baseline.routeId, path: "economyAfter", message: "provider proposal path must preserve civic economy outcome" });
    }
    for (const [index, trace] of provider.actionTrace.entries()) {
      if (!trace.availableActions.some(action =>
        action.affordance === trace.affordance
        && action.objectId === trace.objectId
        && (!action.requiresLedgerEvent || action.citableLedgerEventIds.includes(trace.citedLedgerEventId ?? ""))
      )) {
        failures.push({ routeId: baseline.routeId, path: `actionTrace[${index}].availableActions`, message: "provider-selected action must be available at proposal time" });
      }
    }
  }
}

function routeSpec(routeId: SameOrderAgenticRouteId): RouteSpec {
  const spec = ROUTE_SPECS.find(candidate => candidate.routeId === routeId);
  if (!spec) {
    throw new Error(`unknown Same Order provider route: ${routeId}`);
  }
  return spec;
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
