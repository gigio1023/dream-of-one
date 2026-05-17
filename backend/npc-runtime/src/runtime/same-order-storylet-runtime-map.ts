import type {
  EnvironmentAffordance,
  LedgerEventKind,
  SameOrderObjectId,
} from "./agentic-environment.js";
import {
  buildSameOrderAgenticRouteProofs,
  type SameOrderAgenticRouteId,
  type SameOrderAgenticRouteProof,
} from "./same-order-agentic-routes.js";
import {
  buildSameOrderProviderSchedulingReport,
  type SameOrderProviderSchedulingReport,
} from "./same-order-provider-scheduling.js";

export const SAME_ORDER_STORYLET_RUNTIME_MAP_VERSION =
  "same-order-storylet-runtime-map-v1" as const;

type StoryletBeatId =
  | "routine_assumption"
  | "soft_probe"
  | "social_handoff"
  | "station_reconciliation";

interface SameOrderStoryletRuntimeBeat {
  beatId: StoryletBeatId;
  storyletName: string;
  promptId?: string;
  choiceSetId?: string;
  routeIds: SameOrderAgenticRouteId[];
  requiredVisibleObjects: SameOrderObjectId[];
  actionStepIds: string[];
  providerJobIds: string[];
  ledgerEventKinds: LedgerEventKind[];
  affordances: EnvironmentAffordance[];
  evidenceEvents: string[];
  providerPurpose: "npc_reaction_line" | "station_intake_line" | "mixed";
  runtimeProof: string;
}

interface SameOrderStoryletRuntimeMapFailure {
  beatId?: StoryletBeatId;
  path: string;
  message: string;
}

export interface SameOrderStoryletRuntimeMapReport {
  version: typeof SAME_ORDER_STORYLET_RUNTIME_MAP_VERSION;
  proofType: "storylet-runtime-map";
  contractPass: boolean;
  routeIds: SameOrderAgenticRouteId[];
  beatCount: number;
  beats: SameOrderStoryletRuntimeBeat[];
  failures: SameOrderStoryletRuntimeMapFailure[];
  verdict: "STORYLET_RUNTIME_MAP_PASS" | "STORYLET_RUNTIME_MAP_FAIL";
  stillRequired: string[];
}

export function buildSameOrderStoryletRuntimeMapReport(input?: {
  routeProofs?: SameOrderAgenticRouteProof[];
  providerScheduling?: SameOrderProviderSchedulingReport;
}): SameOrderStoryletRuntimeMapReport {
  const routeProofs = input?.routeProofs ?? buildSameOrderAgenticRouteProofs();
  const providerScheduling = input?.providerScheduling ?? buildSameOrderProviderSchedulingReport();
  const beats = buildBeats();
  const failures: SameOrderStoryletRuntimeMapFailure[] = [];

  validateBeatReferences(beats, routeProofs, providerScheduling, failures);

  const contractPass = failures.length === 0;

  return {
    version: SAME_ORDER_STORYLET_RUNTIME_MAP_VERSION,
    proofType: "storylet-runtime-map",
    contractPass,
    routeIds: routeProofs.map(proof => proof.routeId),
    beatCount: beats.length,
    beats,
    failures,
    verdict: contractPass ? "STORYLET_RUNTIME_MAP_PASS" : "STORYLET_RUNTIME_MAP_FAIL",
    stillRequired: [
      "Keep this map updated when Same Order prompt ids, action step ids, or provider job ids change.",
      "Do not use this map as external comprehension evidence; fresh tester notes remain required.",
    ],
  };
}

function buildBeats(): SameOrderStoryletRuntimeBeat[] {
  return [
    {
      beatId: "routine_assumption",
      storyletName: "Beat 1: Routine Assumption",
      promptId: "store.same_order.routine",
      choiceSetId: "store.same_order.routine.choices",
      routeIds: ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"],
      requiredVisibleObjects: ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray"],
      actionStepIds: [
        "clean.clerk.cite_usual_order",
        "clean.clerk.create_receipt",
        "clean.waiting_customer.accept_routine",
        "clean.park_witness.vouch_routine",
        "repair.clerk.mark_receipt",
        "soft.clerk.mark_receipt",
        "inquest.clerk.mark_receipt",
      ],
      providerJobIds: [
        "clean_cover.clean.clerk.cite_usual_order.provider-action-proposal",
        "clean_cover.clean.clerk.create_receipt.provider-action-proposal",
        "clean_cover.clean.waiting_customer.accept_routine.provider-action-proposal",
        "clean_cover.clean.park_witness.vouch_routine.provider-action-proposal",
        "repair_recovered.repair.clerk.mark_receipt.provider-action-proposal",
        "soft_report.soft.clerk.mark_receipt.provider-action-proposal",
        "inquest_opened.inquest.clerk.mark_receipt.provider-action-proposal",
      ],
      ledgerEventKinds: ["usual_order_cited", "store_sale_normal", "queue_routine_kept", "public_routine_vouched", "store_receipt_marked"],
      affordances: ["cite_expected_order", "create_receipt", "accept_routine", "vouch_routine", "mark_receipt"],
      evidenceEvents: ["conversation_started", "dialogue_choice_selected", "conversation_anomaly_detected"],
      providerPurpose: "npc_reaction_line",
      runtimeProof: "The first Store prompt maps to visible routine cues and validated clerk actions, not a freeform branch.",
    },
    {
      beatId: "soft_probe",
      storyletName: "Beat 2: Soft Probe",
      promptId: "store.same_order.probe",
      choiceSetId: "store.same_order.probe.choices",
      routeIds: ["repair_recovered", "soft_report", "inquest_opened"],
      requiredVisibleObjects: ["store_queue_mark", "receipt_tray", "correction_slip", "report_tray", "park_notice_board"],
      actionStepIds: [
        "repair.clerk.offer_correction",
        "repair.clerk.attach_correction",
        "repair.waiting_customer.accept_repair",
        "repair.park_witness.post_repair_notice",
        "soft.clerk.place_note",
        "inquest.clerk.place_note",
      ],
      providerJobIds: [
        "repair_recovered.repair.clerk.offer_correction.provider-action-proposal",
        "repair_recovered.repair.clerk.attach_correction.provider-action-proposal",
        "repair_recovered.repair.waiting_customer.accept_repair.provider-action-proposal",
        "repair_recovered.repair.park_witness.post_repair_notice.provider-action-proposal",
        "soft_report.soft.clerk.place_note.provider-action-proposal",
        "inquest_opened.inquest.clerk.place_note.provider-action-proposal",
      ],
      ledgerEventKinds: ["correction_offered", "store_sale_corrected", "queue_repair_accepted", "public_repair_noted", "store_exception_reported"],
      affordances: ["offer_correction", "attach_correction", "accept_repair", "post_repair_notice", "place_note"],
      evidenceEvents: ["dialogue_choice_selected", "npc_suspicion_changed", "response_hesitation_noted", "free_input_submitted"],
      providerPurpose: "npc_reaction_line",
      runtimeProof: "The probe maps repair and mismatch to correction, queue settlement, or Store note actions with deterministic ledger events.",
    },
    {
      beatId: "social_handoff",
      storyletName: "Beat 3: Social Handoff",
      promptId: "store.same_order.handoff",
      routeIds: ["soft_report", "inquest_opened"],
      requiredVisibleObjects: ["store_queue_mark", "store_counter", "report_tray", "park_notice_board", "civic_ledger"],
      actionStepIds: [
        "soft.waiting_customer.complain_delay",
        "soft.park_witness.post_rumor",
        "soft.manager.place_followup_note",
        "soft.manager.pause_service",
        "soft.waiting_customer.leave_queue",
        "inquest.waiting_customer.complain_delay",
        "inquest.park_witness.post_rumor",
        "inquest.manager.forward_report",
      ],
      providerJobIds: [
        "soft_report.soft.waiting_customer.complain_delay.provider-action-proposal",
        "soft_report.soft.park_witness.post_rumor.provider-action-proposal",
        "soft_report.soft.manager.place_followup_note.provider-action-proposal",
        "soft_report.soft.manager.pause_service.provider-action-proposal",
        "soft_report.soft.waiting_customer.leave_queue.provider-action-proposal",
        "inquest_opened.inquest.waiting_customer.complain_delay.provider-action-proposal",
        "inquest_opened.inquest.park_witness.post_rumor.provider-action-proposal",
        "inquest_opened.inquest.manager.forward_report.provider-action-proposal",
      ],
      ledgerEventKinds: ["queue_delay_noted", "public_rumor_posted", "store_exception_reported", "service_paused", "queue_left", "store_report_escalated"],
      affordances: ["complain_delay", "post_rumor", "place_note", "pause_service", "leave_queue", "forward_report"],
      evidenceEvents: ["suspicion_shared", "station_report_created"],
      providerPurpose: "npc_reaction_line",
      runtimeProof: "The handoff maps Store-side social pressure into queue and Park public reactions before manager and Station actions.",
    },
    {
      beatId: "station_reconciliation",
      storyletName: "Beat 4: Station Reconciliation",
      promptId: "station.same_order.reconciliation",
      choiceSetId: "station.same_order.reconciliation.choices",
      routeIds: ["inquest_opened"],
      requiredVisibleObjects: ["station_dossier", "civic_ledger", "store_queue_mark"],
      actionStepIds: ["inquest.station.cite_store_report", "inquest.waiting_customer.refuse_contact"],
      providerJobIds: [
        "inquest_opened.inquest.station.cite_store_report.provider-action-proposal",
        "inquest_opened.inquest.waiting_customer.refuse_contact.provider-action-proposal",
      ],
      ledgerEventKinds: ["station_record_cited", "queue_contact_refused"],
      affordances: ["cite_record", "refuse_contact"],
      evidenceEvents: ["station_inquest_opened", "verdict_reached"],
      providerPurpose: "mixed",
      runtimeProof: "The Station beat maps to an exact cite-record action, then one local NPC reaction to that citation.",
    },
  ];
}

function validateBeatReferences(
  beats: SameOrderStoryletRuntimeBeat[],
  routeProofs: SameOrderAgenticRouteProof[],
  providerScheduling: SameOrderProviderSchedulingReport,
  failures: SameOrderStoryletRuntimeMapFailure[],
): void {
  const routeIds = new Set(routeProofs.map(proof => proof.routeId));
  const stepIds = new Set(routeProofs.flatMap(proof => proof.actionTrace.map(trace => trace.stepId)));
  const jobIds = new Set(providerScheduling.jobs.map(job => job.jobId));
  const providerPurposesByJobId = new Map(providerScheduling.jobs.map(job => [job.jobId, job.purpose]));
  const ledgerKinds = new Set(routeProofs.flatMap(proof => proof.ledgerEventKinds));
  const affordances = new Set(routeProofs.flatMap(proof => proof.ledgerAffordances));

  for (const beat of beats) {
    if (beat.routeIds.length === 0 || beat.actionStepIds.length === 0 || beat.providerJobIds.length === 0) {
      failures.push({ beatId: beat.beatId, path: "beats", message: "each storylet beat must map to routes, action steps, and provider jobs" });
    }
    for (const routeId of beat.routeIds) {
      if (!routeIds.has(routeId)) {
        failures.push({ beatId: beat.beatId, path: "beats.routeIds", message: `missing route proof for ${routeId}` });
      }
    }
    for (const stepId of beat.actionStepIds) {
      if (!stepIds.has(stepId)) {
        failures.push({ beatId: beat.beatId, path: "beats.actionStepIds", message: `missing runtime action step ${stepId}` });
      }
    }
    for (const jobId of beat.providerJobIds) {
      if (!jobIds.has(jobId)) {
        failures.push({ beatId: beat.beatId, path: "beats.providerJobIds", message: `missing provider job ${jobId}` });
        continue;
      }
      const purpose = providerPurposesByJobId.get(jobId);
      if (beat.providerPurpose !== "mixed" && purpose !== beat.providerPurpose) {
        failures.push({ beatId: beat.beatId, path: "beats.providerPurpose", message: `provider job ${jobId} has purpose ${purpose}` });
      }
    }
    for (const ledgerKind of beat.ledgerEventKinds) {
      if (!ledgerKinds.has(ledgerKind)) {
        failures.push({ beatId: beat.beatId, path: "beats.ledgerEventKinds", message: `missing ledger event kind ${ledgerKind}` });
      }
    }
    for (const affordance of beat.affordances) {
      if (!affordances.has(affordance)) {
        failures.push({ beatId: beat.beatId, path: "beats.affordances", message: `missing validated affordance ${affordance}` });
      }
    }
  }

  const stationBeat = beats.find(beat => beat.beatId === "station_reconciliation");
  if (!stationBeat?.actionStepIds.includes("inquest.station.cite_store_report")) {
    failures.push({ beatId: "station_reconciliation", path: "beats.station_reconciliation", message: "Station beat must cite the forwarded Store report" });
  }
}
