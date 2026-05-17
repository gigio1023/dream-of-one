import type {
  AgentRole,
  AvailableEnvironmentAction,
  CivicEconomyState,
  EnvironmentAffordance,
  LedgerEventKind,
  SameOrderObjectId,
} from "./agentic-environment.js";
import type { SameOrderAgenticRouteId } from "./same-order-agentic-routes.js";
import {
  buildSameOrderProviderActionComparison,
  SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION,
  type SameOrderProviderActionComparison,
  type SameOrderProviderActionTrace,
  type SameOrderProviderActionRouteProof,
} from "./same-order-provider-action-comparison.js";

export const SAME_ORDER_PROVIDER_SCHEDULING_VERSION =
  "same-order-provider-scheduling-v1" as const;

const ALLOWED_PROVIDER_FIELDS = [
  "affordance",
  "objectId",
  "recordId",
  "citedLedgerEventId",
  "whyLine",
  "npcLineCandidate",
  "selectionReason",
] as const;

const FORBIDDEN_AUTHORITY_FIELDS = [
  "riskTag",
  "suspicionDelta",
  "reportDelta",
  "exposureDelta",
  "economyDelta",
  "ledgerEventKind",
  "ledgerEventId",
  "objectState",
  "verdict",
  "sessionOutcome",
  "sessionTermination",
] as const;

export interface SameOrderProviderScheduledAction {
  affordance: EnvironmentAffordance;
  objectId: SameOrderObjectId;
  ledgerEventId: string;
  ledgerEventKind: LedgerEventKind;
  recordId?: string;
  citedLedgerEventId?: string;
  economyAfter: CivicEconomyState;
  validation: "accepted";
  whyLine: string;
  selectionReason: string;
}

export interface SameOrderProviderVisibleAction extends AvailableEnvironmentAction {}

export interface SameOrderProviderScheduledJob {
  jobId: string;
  routeId: SameOrderAgenticRouteId;
  stepId: string;
  turnIndex: number;
  actorId: string;
  actorRole: AgentRole;
  purpose: "npc_reaction_line" | "station_intake_line";
  dispatchPhase: "role_agent_tick";
  providerMode: "scheduled-action-proposal";
  playerLineKind: SameOrderProviderActionRouteProof["playerLineKind"];
  playerLine: string;
  socialLoopStage: "store_routine" | "store_repair" | "store_report" | "station_inquest";
  dramaTone: "routine" | "corrective" | "watchful" | "formal";
  preoccupations: string[];
  promptContext: {
    scenario: "same_order";
    socialReactionSummary: string;
    perceivedObjectIds: SameOrderObjectId[];
    availableActions: SameOrderProviderVisibleAction[];
    recentLedgerEventKinds: LedgerEventKind[];
    recentLedgerAffordances: EnvironmentAffordance[];
  };
  allowedProviderFields: typeof ALLOWED_PROVIDER_FIELDS;
  forbiddenAuthorityFields: typeof FORBIDDEN_AUTHORITY_FIELDS;
  fallbackLine: string;
  lockedAction: SameOrderProviderScheduledAction;
}

export interface SameOrderProviderSchedulingFailure {
  routeId?: SameOrderAgenticRouteId;
  jobId?: string;
  path: string;
  message: string;
}

export interface SameOrderProviderSchedulingReport {
  version: typeof SAME_ORDER_PROVIDER_SCHEDULING_VERSION;
  proofType: "provider-scheduling-contract";
  providerActionComparisonVersion: typeof SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION;
  providerMode: "scheduled-action-proposal";
  contractPass: boolean;
  liveGodotDispatchVerified: false;
  dispatchHost: "godot-runtime-pending";
  routeIds: SameOrderAgenticRouteId[];
  jobCount: number;
  jobs: SameOrderProviderScheduledJob[];
  failures: SameOrderProviderSchedulingFailure[];
  verdict: "SCHEDULING_CONTRACT_PASS_LIVE_GODOT_REQUIRED" | "SCHEDULING_CONTRACT_FAIL";
  remainingRequiredEvidence: string[];
}

export function buildSameOrderProviderSchedulingReport(
  comparison: SameOrderProviderActionComparison = buildSameOrderProviderActionComparison(),
): SameOrderProviderSchedulingReport {
  const failures: SameOrderProviderSchedulingFailure[] = comparison.failures.map(failure => ({
    routeId: failure.routeId,
    path: `providerActionComparison.${failure.path}`,
    message: failure.message,
  }));
  const jobs = comparison.providerProofs.flatMap(proof => proof.actionTrace.map((trace, index) =>
    scheduledJobFromTrace(proof, trace, index),
  ));

  if (!comparison.pass) {
    failures.push({
      path: "providerActionComparison.pass",
      message: "provider scheduling requires a passing provider action comparison",
    });
  }
  if (jobs.length === 0) {
    failures.push({
      path: "jobs",
      message: "provider scheduling requires at least one role-agent job",
    });
  }

  validateScheduledJobs(comparison.providerProofs, jobs, failures);

  const contractPass = failures.length === 0;

  return {
    version: SAME_ORDER_PROVIDER_SCHEDULING_VERSION,
    proofType: "provider-scheduling-contract",
    providerActionComparisonVersion: SAME_ORDER_PROVIDER_ACTION_COMPARISON_VERSION,
    providerMode: "scheduled-action-proposal",
    contractPass,
    liveGodotDispatchVerified: false,
    dispatchHost: "godot-runtime-pending",
    routeIds: comparison.providerRouteIds,
    jobCount: jobs.length,
    jobs,
    failures,
    verdict: contractPass
      ? "SCHEDULING_CONTRACT_PASS_LIVE_GODOT_REQUIRED"
      : "SCHEDULING_CONTRACT_FAIL",
    remainingRequiredEvidence: [
      "Wire Godot role-agent ticks to dispatch these scheduled provider jobs.",
      "Run the Godot live backend bridge with provider scheduling enabled.",
      "Capture fallback and provider-on evidence proving the same ledger, object, and economy outcomes.",
    ],
  };
}

function scheduledJobFromTrace(
  proof: SameOrderProviderActionRouteProof,
  trace: SameOrderProviderActionTrace,
  turnIndex: number,
): SameOrderProviderScheduledJob {
  return {
    jobId: `${proof.routeId}.${trace.stepId}.provider-action-proposal`,
    routeId: proof.routeId,
    stepId: trace.stepId,
    turnIndex,
    actorId: trace.actorId,
    actorRole: trace.actorRole,
    purpose: trace.actorRole === "station_officer" ? "station_intake_line" : "npc_reaction_line",
    dispatchPhase: "role_agent_tick",
    providerMode: "scheduled-action-proposal",
    playerLineKind: proof.playerLineKind,
    playerLine: proof.playerLine,
    socialLoopStage: socialLoopStage(proof.routeId, trace.actorRole),
    dramaTone: dramaTone(proof.routeId, trace.actorRole),
    preoccupations: preoccupations(trace.actorRole),
    promptContext: {
      scenario: "same_order",
      socialReactionSummary: proof.socialReactionSummary,
      perceivedObjectIds: trace.perceivedObjectIds,
      availableActions: trace.availableActions.map(action => ({ ...action })),
      recentLedgerEventKinds: proof.actionTrace
        .slice(0, turnIndex)
        .map(previous => previous.ledgerEventKind),
      recentLedgerAffordances: proof.actionTrace
        .slice(0, turnIndex)
        .map(previous => previous.affordance),
    },
    allowedProviderFields: ALLOWED_PROVIDER_FIELDS,
    forbiddenAuthorityFields: FORBIDDEN_AUTHORITY_FIELDS,
    fallbackLine: trace.providerLine ?? deterministicFallbackLine(trace.actorRole),
    lockedAction: {
      affordance: trace.affordance,
      objectId: trace.objectId,
      ledgerEventId: trace.ledgerEventId,
      ledgerEventKind: trace.ledgerEventKind,
      recordId: trace.recordId,
      citedLedgerEventId: trace.citedLedgerEventId,
      economyAfter: trace.economyAfter,
      validation: "accepted",
      whyLine: trace.whyLine,
      selectionReason: trace.selectionReason,
    },
  };
}

function validateScheduledJobs(
  proofs: SameOrderProviderActionRouteProof[],
  jobs: SameOrderProviderScheduledJob[],
  failures: SameOrderProviderSchedulingFailure[],
): void {
  const jobIds = new Set<string>();
  for (const job of jobs) {
    if (jobIds.has(job.jobId)) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.jobId", message: "job ids must be unique" });
    }
    jobIds.add(job.jobId);
    if (job.fallbackLine.trim().length === 0) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.fallbackLine", message: "scheduled provider job requires deterministic fallback wording" });
    }
    if (job.promptContext.availableActions.length === 0) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.promptContext.availableActions", message: "scheduled provider job requires visible available actions" });
    }
    if (job.promptContext.recentLedgerAffordances.length !== job.promptContext.recentLedgerEventKinds.length) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.promptContext.recentLedgerAffordances", message: "scheduled provider job must preserve one affordance per recent ledger event" });
    }
    if (job.lockedAction.validation !== "accepted") {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.lockedAction.validation", message: "scheduled provider job must lock only accepted deterministic actions" });
    }
    if (!job.allowedProviderFields.includes("npcLineCandidate")) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.allowedProviderFields", message: "scheduled provider job must allow wording candidate output" });
    }
    if (!job.forbiddenAuthorityFields.includes("verdict")) {
      failures.push({ routeId: job.routeId, jobId: job.jobId, path: "jobs.forbiddenAuthorityFields", message: "scheduled provider job must forbid verdict authority" });
    }
  }

  const inquest = proofs.find(proof => proof.routeId === "inquest_opened");
  const stationJob = jobs.find(job => job.routeId === "inquest_opened" && job.actorRole === "station_officer");
  if (!inquest?.stationCitation || inquest.stationCitation.citedLedgerEventKind !== "store_report_escalated") {
    failures.push({
      routeId: "inquest_opened",
      path: "providerProofs.inquest_opened.stationCitation",
      message: "provider scheduling requires Station to cite the exact escalated Store report",
    });
  }
  if (!stationJob?.lockedAction.citedLedgerEventId) {
    failures.push({
      routeId: "inquest_opened",
      jobId: stationJob?.jobId,
      path: "jobs.inquest_opened.station.lockedAction.citedLedgerEventId",
      message: "Station provider job must carry the cited Store ledger event id",
    });
  }
}

function socialLoopStage(
  routeId: SameOrderAgenticRouteId,
  actorRole: AgentRole,
): SameOrderProviderScheduledJob["socialLoopStage"] {
  if (actorRole === "station_officer") {
    return "station_inquest";
  }
  if (routeId === "repair_recovered") {
    return "store_repair";
  }
  if (routeId === "soft_report" || routeId === "inquest_opened") {
    return "store_report";
  }
  return "store_routine";
}

function dramaTone(
  routeId: SameOrderAgenticRouteId,
  actorRole: AgentRole,
): SameOrderProviderScheduledJob["dramaTone"] {
  if (actorRole === "station_officer") {
    return "formal";
  }
  if (routeId === "repair_recovered") {
    return "corrective";
  }
  if (routeId === "soft_report" || routeId === "inquest_opened") {
    return "watchful";
  }
  return "routine";
}

function preoccupations(actorRole: AgentRole): string[] {
  switch (actorRole) {
    case "store_clerk":
      return ["usual order", "receipt accuracy", "queue pressure"];
    case "store_manager":
      return ["report burden", "liability trail", "Station attention"];
    case "waiting_customer":
      return ["delay", "routine disruption", "being noticed"];
    case "park_witness":
      return ["public notice", "local talk", "who becomes visible"];
    case "studio_pm":
      return ["public trust", "review queue", "small opportunities"];
    case "station_officer":
      return ["exact citations", "record reconciliation", "bounded answers"];
  }
}

function deterministicFallbackLine(actorRole: AgentRole): string {
  switch (actorRole) {
    case "store_clerk":
      return "기록에 맞춰 처리하겠습니다.";
    case "store_manager":
      return "점포 기록으로 남겨두겠습니다.";
    case "waiting_customer":
      return "줄이 더 지연되고 있습니다.";
    case "park_witness":
      return "게시판에 작은 소문으로 남겨두겠습니다.";
    case "studio_pm":
      return "공개 기록을 보고 리뷰 줄을 열어두겠습니다.";
    case "station_officer":
      return "상점 기록을 기준으로 확인하겠습니다.";
  }
}
