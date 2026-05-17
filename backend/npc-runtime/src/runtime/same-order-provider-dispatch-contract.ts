import type { ActionType, DecisionEnvelope, PerceptionPacket, SocialLoopStage } from "../contracts/types.js";
import { annotateDecisionMeta } from "../policy/reason-taxonomy.js";
import { enforceBoundedBehavior } from "./bounded-behavior.js";
import { parsePerceptionPacket } from "./schema.js";
import {
  buildSameOrderProviderSchedulingReport,
  SAME_ORDER_PROVIDER_SCHEDULING_VERSION,
  type SameOrderProviderScheduledJob,
  type SameOrderProviderSchedulingReport,
} from "./same-order-provider-scheduling.js";

export const SAME_ORDER_PROVIDER_DISPATCH_CONTRACT_VERSION =
  "same-order-provider-dispatch-contract-v1" as const;

export interface SameOrderProviderDispatchProof {
  jobId: string;
  routeId: string;
  stepId: string;
  endpoint: "/v1/npc/decision";
  method: "POST";
  npcId: string;
  actorRole: string;
  packet: PerceptionPacket;
  schemaPass: boolean;
  boundedBehaviorPass: boolean;
  socialLoopStage: SocialLoopStage;
  actionType: ActionType;
  utterance: string;
  fallbackLine: string;
  failures: string[];
}

export interface SameOrderProviderDispatchContractFailure {
  jobId?: string;
  path: string;
  message: string;
}

export interface SameOrderProviderDispatchContractReport {
  version: typeof SAME_ORDER_PROVIDER_DISPATCH_CONTRACT_VERSION;
  proofType: "provider-dispatch-packet-contract";
  schedulingVersion: typeof SAME_ORDER_PROVIDER_SCHEDULING_VERSION;
  contractPass: boolean;
  liveHttpDispatchVerified: false;
  endpoint: "/v1/npc/decision";
  dispatchHost: "godot-runtime-pending";
  jobCount: number;
  packetProofs: SameOrderProviderDispatchProof[];
  failures: SameOrderProviderDispatchContractFailure[];
  verdict: "DISPATCH_PACKET_CONTRACT_PASS_LIVE_HTTP_REQUIRED" | "DISPATCH_PACKET_CONTRACT_FAIL";
  remainingRequiredEvidence: string[];
}

export function buildSameOrderProviderDispatchContractReport(
  schedulingReport: SameOrderProviderSchedulingReport = buildSameOrderProviderSchedulingReport(),
): SameOrderProviderDispatchContractReport {
  const failures: SameOrderProviderDispatchContractFailure[] = schedulingReport.failures.map(failure => ({
    jobId: failure.jobId,
    path: `providerScheduling.${failure.path}`,
    message: failure.message,
  }));

  if (!schedulingReport.contractPass) {
    failures.push({
      path: "providerScheduling.contractPass",
      message: "provider dispatch requires a passing scheduling contract",
    });
  }

  const packetProofs = schedulingReport.jobs.map(job => buildDispatchProof(job));
  for (const proof of packetProofs) {
    for (const failure of proof.failures) {
      failures.push({
        jobId: proof.jobId,
        path: "packetProofs",
        message: failure,
      });
    }
  }

  const contractPass = failures.length === 0;

  return {
    version: SAME_ORDER_PROVIDER_DISPATCH_CONTRACT_VERSION,
    proofType: "provider-dispatch-packet-contract",
    schedulingVersion: SAME_ORDER_PROVIDER_SCHEDULING_VERSION,
    contractPass,
    liveHttpDispatchVerified: false,
    endpoint: "/v1/npc/decision",
    dispatchHost: "godot-runtime-pending",
    jobCount: packetProofs.length,
    packetProofs,
    failures,
    verdict: contractPass
      ? "DISPATCH_PACKET_CONTRACT_PASS_LIVE_HTTP_REQUIRED"
      : "DISPATCH_PACKET_CONTRACT_FAIL",
    remainingRequiredEvidence: [
      "Send these packets from Godot role-agent ticks through the live backend bridge.",
      "Capture HTTP decision responses for provider-on and fallback modes.",
      "Prove the returned wording never mutates ledger, object, civic economy, verdict, Exposure, or session termination authority.",
    ],
  };
}

export function buildSameOrderProviderDispatchPacket(job: SameOrderProviderScheduledJob): PerceptionPacket {
  return {
    sessionId: `same-order-provider-dispatch-${job.routeId}`,
    npcId: job.actorId,
    landmarkId: job.actorRole === "station_officer" ? "Station" : "Store",
    nearbyActors: nearbyActorsForJob(job),
    recentEvents: recentEventsForJob(job),
    organizationContext: {
      scenario: "same_order",
      routeId: job.routeId,
      stepId: job.stepId,
      jobId: job.jobId,
      actorRole: job.actorRole,
      purpose: job.purpose,
      dispatchPhase: job.dispatchPhase,
      providerMode: job.providerMode,
      socialLoopStage: job.socialLoopStage,
      dramaTone: job.dramaTone,
      preoccupations: job.preoccupations,
      perceivedObjectIds: job.promptContext.perceivedObjectIds,
      availableActions: job.promptContext.availableActions,
      recentLedgerEventKinds: job.promptContext.recentLedgerEventKinds,
      recentLedgerAffordances: job.promptContext.recentLedgerAffordances,
      allowedProviderFields: job.allowedProviderFields,
      forbiddenAuthorityFields: job.forbiddenAuthorityFields,
      fallbackLine: job.fallbackLine,
      lockedAction: job.lockedAction,
      authorityBoundary: "provider_writes_wording_only_runtime_locks_action",
    },
    playerSignals: {
      speechAct: speechActForJob(job),
      playerLineKind: job.playerLineKind,
      providerDispatchContract: true,
    },
    conversation: {
      conversationId: `same-order-provider-${job.routeId}`,
      turnId: `provider-${job.routeId}-${job.turnIndex + 1}`,
      promptId: job.stepId,
      choiceSetId: `${job.stepId}.provider-options`,
      speakerId: "player",
      selectedChoiceId: job.playerLineKind,
      displayedPlayerLine: job.playerLine,
      priorTurnIds: priorTurnIds(job),
    },
  };
}

function buildDispatchProof(job: SameOrderProviderScheduledJob): SameOrderProviderDispatchProof {
  const packet = buildSameOrderProviderDispatchPacket(job);
  const failures: string[] = [];
  let schemaPass = false;
  let boundedBehaviorPass = false;
  let socialLoopStage: SocialLoopStage = "ambient";

  try {
    const parsed = parsePerceptionPacket(packet);
    schemaPass = true;
    const decision = mockProviderDecision(job);
    const bounded = enforceBoundedBehavior(parsed, decision);
    boundedBehaviorPass = !bounded.appliedFallback;
    socialLoopStage = bounded.socialLoop.stage;
    if (bounded.appliedFallback) {
      failures.push(`bounded behavior fallback: ${bounded.decision.meta.reason ?? "unknown"}`);
    }
    if (bounded.decision.intent.utterance !== job.fallbackLine) {
      failures.push("bounded decision utterance must preserve deterministic fallback wording");
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  if (job.lockedAction.validation !== "accepted") {
    failures.push("locked action must be accepted before dispatch");
  }
  if (!job.forbiddenAuthorityFields.includes("verdict")) {
    failures.push("dispatch contract must forbid verdict authority");
  }
  if (!job.allowedProviderFields.includes("npcLineCandidate")) {
    failures.push("dispatch contract must allow wording candidate field");
  }

  return {
    jobId: job.jobId,
    routeId: job.routeId,
    stepId: job.stepId,
    endpoint: "/v1/npc/decision",
    method: "POST",
    npcId: job.actorId,
    actorRole: job.actorRole,
    packet,
    schemaPass,
    boundedBehaviorPass,
    socialLoopStage,
    actionType: actionTypeForJob(job),
    utterance: job.fallbackLine,
    fallbackLine: job.fallbackLine,
    failures,
  };
}

function mockProviderDecision(job: SameOrderProviderScheduledJob): DecisionEnvelope {
  return annotateDecisionMeta({
    intent: {
      npcId: job.actorId,
      actionType: actionTypeForJob(job),
      targetId: job.lockedAction.objectId,
      utterance: job.fallbackLine,
      reasonCodes: ["same_order_provider_dispatch_contract"],
      confidence: 1,
    },
    meta: {
      usedFallback: false,
      transport: "codex",
      threadId: `thread-${job.jobId}`,
    },
  });
}

function actionTypeForJob(job: SameOrderProviderScheduledJob): ActionType {
  return job.actorRole === "station_officer" ? "Ask" : "Talk";
}

function speechActForJob(job: SameOrderProviderScheduledJob): string {
  switch (job.playerLineKind) {
    case "clean_cover_line":
      return "SA_COMPLY";
    case "repair_line":
    case "soft_report_line":
      return "SA_INQUIRE";
    case "inquest_line":
      return job.actorRole === "station_officer" ? "SA_FRAME" : "SA_BREAK";
  }
}

function nearbyActorsForJob(job: SameOrderProviderScheduledJob): string[] {
  const storeActors = ["player", "NPC_Store_Clerk", "NPC_Store_Manager", "NPC_Waiting_Customer"];
  if (job.actorRole === "station_officer") {
    return ["player", "NPC_Station_Officer"];
  }
  return storeActors.filter(actorId => actorId !== job.actorId);
}

function recentEventsForJob(job: SameOrderProviderScheduledJob): string[] {
  const events: string[] = job.promptContext.recentLedgerEventKinds.map((kind, index) => {
    const affordance = job.promptContext.recentLedgerAffordances[index] ?? "unknown_affordance";
    return `${kind}:${affordance}`;
  });
  if (job.actorRole === "station_officer") {
    events.push("station_inquest_opened");
  } else if (job.socialLoopStage === "store_report") {
    events.push("store_report_pending");
  } else if (job.socialLoopStage === "store_repair") {
    events.push("store_correction_offered");
  } else {
    events.push("store_routine_active");
  }
  return events;
}

function priorTurnIds(job: SameOrderProviderScheduledJob): string[] {
  return Array.from({ length: job.turnIndex }, (_, index) => `provider-${job.routeId}-${index + 1}`);
}
