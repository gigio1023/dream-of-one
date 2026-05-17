export const SAME_ORDER_COMPREHENSION_PROXY_VERSION =
  "same-order-comprehension-proxy-v2" as const;

export type SameOrderComprehensionCheckId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";

export interface SameOrderComprehensionProxyCheck {
  id: SameOrderComprehensionCheckId;
  label: string;
  proxyResult: "pass" | "fail";
  evidence: string[];
  missing: string[];
  externalRequired: boolean;
}

export interface SameOrderComprehensionProxyReport {
  version: typeof SAME_ORDER_COMPREHENSION_PROXY_VERSION;
  proofType: "proxy-dry-run";
  pass: boolean;
  externalBlockerClosed: false;
  artifactRunId: string;
  routeIds: string[];
  checks: SameOrderComprehensionProxyCheck[];
  verdict: "PROXY_PASS_EXTERNAL_REQUIRED" | "PROXY_FAIL";
  requiredExternalNextSteps: string[];
}

const REQUIRED_ROUTE_IDS = ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"];

export function buildSameOrderComprehensionProxyReport(input: unknown): SameOrderComprehensionProxyReport {
  const artifact = asRecord(input);
  const playability = asRecord(artifact.playability);
  const summary = asRecord(artifact.playableSummary);
  const routeProofs = readRecordArray(playability.routeProofs);
  const routeIds = routeProofs.map(route => readString(route.routeId));
  const routeEvents = routeProofs.flatMap(route => readRecordArray(route.events));
  const eventNames = new Set([
    ...readRecordArray(artifact.events).map(event => readString(event.eventName)),
    ...routeProofs.flatMap(route => readStringArray(route.eventNames)),
    ...routeEvents.map(event => readString(event.eventName)),
  ].filter(Boolean));
  const signals = new Set(routeProofs.flatMap(route => readStringArray(route.signals)));
  const recordObjects = asRecord(summary.recordObjects);
  const worldRecordProps = asRecord(summary.worldRecordProps);
  const civicLedger = readRecordArray(summary.civicLedger);
  const agentActionLog = readRecordArray(summary.agentActionLog);
  const agenticRouteProofs = readRecordArray(playability.agenticRouteProofs);
  const providerComparison = asRecord(playability.providerActionComparison);
  const providerScheduling = asRecord(playability.providerSchedulingPlan);
  const providerDispatch = asRecord(playability.providerDispatchContract);

  const checks: SameOrderComprehensionProxyCheck[] = [
    checkPlayerInvestigated(routeIds, eventNames, recordObjects, agentActionLog),
    checkTextDanger(routeProofs, eventNames, signals),
    checkRuleOwnedConsequence(playability, civicLedger, agentActionLog),
    checkVisibleConsequence(summary, worldRecordProps),
    checkSafeRiskyContrast(routeProofs),
    checkValidatedActionTrail(agenticRouteProofs, providerComparison, providerScheduling, providerDispatch),
    checkProviderBoundary(providerComparison, providerScheduling, providerDispatch),
  ];
  const pass = checks.every(check => check.proxyResult === "pass");

  return {
    version: SAME_ORDER_COMPREHENSION_PROXY_VERSION,
    proofType: "proxy-dry-run",
    pass,
    externalBlockerClosed: false,
    artifactRunId: readString(artifact.runId),
    routeIds,
    checks,
    verdict: pass ? "PROXY_PASS_EXTERNAL_REQUIRED" : "PROXY_FAIL",
    requiredExternalNextSteps: [
      "Run the 3-tester comprehension protocol with no design explanation before play.",
      "Record one safe or repair path and one risky or inquest path across the cohort.",
      "Keep this proxy report attached, but do not use it to close the external comprehension blocker.",
    ],
  };
}

function checkPlayerInvestigated(
  routeIds: string[],
  eventNames: Set<string>,
  recordObjects: Record<string, unknown>,
  agentActionLog: Record<string, unknown>[],
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];

  if (routeIds.includes("inquest_opened")) {
    evidence.push("inquest_opened route exists");
  } else {
    missing.push("inquest_opened route");
  }
  if (eventNames.has("station_report_created") && eventNames.has("station_inquest_opened")) {
    evidence.push("Station report and inquest events exist");
  } else {
    missing.push("Station report and inquest events");
  }
  if (readString(recordObjects.station_dossier) === "cited") {
    evidence.push("Station dossier is cited");
  } else {
    missing.push("cited Station dossier state");
  }
  if (agentActionLog.some(action =>
    readString(action.actorRole) === "station_officer"
    && readString(action.affordance) === "cite_record"
  )) {
    evidence.push("Station Officer cites a record");
  } else {
    missing.push("Station Officer cite_record action");
  }

  return check("C1", "Player is investigated by NPC/Station systems", evidence, missing, false);
}

function checkTextDanger(
  routeProofs: Record<string, unknown>[],
  eventNames: Set<string>,
  signals: Set<string>,
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];
  const clean = routeProofs.find(route => readString(route.routeId) === "clean_cover");
  const inquest = routeProofs.find(route => readString(route.routeId) === "inquest_opened");

  if (clean && readStringArray(clean.signals).length === 0) {
    evidence.push("clean_cover route has no suspicion signals");
  } else {
    missing.push("clean route without suspicion signals");
  }
  if (inquest && readStringArray(inquest.signals).length > 0) {
    evidence.push("inquest route records risky speech signals");
  } else {
    missing.push("risky route with speech signals");
  }
  if (signals.has("dream_language_leak") || signals.has("local_routine_mismatch")) {
    evidence.push("text-specific suspicion signal is present");
  } else {
    missing.push("text-specific suspicion signal");
  }
  if (eventNames.has("dialogue_choice_selected") || eventNames.has("free_input_submitted")) {
    evidence.push("player answer event exists");
  } else {
    missing.push("player answer event");
  }

  return check("C2", "Text is where danger starts", evidence, missing, false);
}

function checkRuleOwnedConsequence(
  playability: Record<string, unknown>,
  civicLedger: Record<string, unknown>[],
  agentActionLog: Record<string, unknown>[],
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];

  if (readString(playability.visibleWhyLine).length > 0) {
    evidence.push("visible why-line exists");
  } else {
    missing.push("visible why-line");
  }
  if (civicLedger.length > 0 && civicLedger.every(event => readString(event.validation) === "accepted" && readString(event.whyLine).length > 0)) {
    evidence.push("civic ledger events are accepted and explain why");
  } else {
    missing.push("accepted civic ledger why-lines");
  }
  if (agentActionLog.length > 0 && agentActionLog.every(action => readBoolean(action.accepted) && readString(action.validation) === "accepted")) {
    evidence.push("agent actions pass deterministic validation");
  } else {
    missing.push("accepted deterministic agent actions");
  }
  if (readBoolean(asRecord(playability.providerActionComparison).pass)) {
    evidence.push("provider-shaped comparison preserves deterministic outcomes");
  } else {
    missing.push("provider-shaped comparison pass");
  }

  return check("C3", "Consequence is rule-owned", evidence, missing, false);
}

function checkVisibleConsequence(
  summary: Record<string, unknown>,
  worldRecordProps: Record<string, unknown>,
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];

  for (const propId of ["receipt_tray", "report_tray", "station_dossier", "civic_economy_panel"]) {
    const prop = asRecord(worldRecordProps[propId]);
    if (readBoolean(prop.visible) && readBoolean(prop.hasBody) && readString(prop.label).length > 0) {
      evidence.push(`${propId} is visible with label`);
    } else {
      missing.push(`${propId} visible labelled prop`);
    }
  }
  if (readBoolean(summary.outcomeVisible)) {
    evidence.push("outcome panel is visible");
  } else {
    missing.push("visible outcome panel");
  }
  if (readString(summary.outcomeTitle).length > 0 && readString(summary.outcomeBody).length > 0) {
    evidence.push("outcome title/body are present");
  } else {
    missing.push("outcome title/body");
  }

  return check("C4", "Visible consequence follows the answer", evidence, missing, false);
}

function checkSafeRiskyContrast(routeProofs: Record<string, unknown>[]): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];
  const routeIds = new Set(routeProofs.map(route => readString(route.routeId)));
  const routeOutcomes = new Set(routeProofs.flatMap(route => [
    readString(route.routeOutcome),
    readString(route.sessionOutcome),
  ]).filter(Boolean));
  const clean = routeProofs.find(route => readString(route.routeId) === "clean_cover");
  const inquest = routeProofs.find(route => readString(route.routeId) === "inquest_opened");

  const missingRoutes = REQUIRED_ROUTE_IDS.filter(routeId => !routeIds.has(routeId));
  if (missingRoutes.length === 0) {
    evidence.push("clean, repair, soft report, and inquest routes exist");
  } else {
    missing.push(`missing routes: ${missingRoutes.join(", ")}`);
  }
  if (routeOutcomes.has("cover_held") && routeOutcomes.has("soft_report") && routeOutcomes.has("inquest_opened")) {
    evidence.push("route outcomes differ across safe, report, and inquest paths");
  } else {
    missing.push("distinct cover/report/inquest outcomes");
  }
  if (clean && !readStringArray(clean.eventNames).includes("station_inquest_opened")) {
    evidence.push("clean route avoids Station inquest");
  } else {
    missing.push("clean route without Station inquest");
  }
  if (inquest && readStringArray(inquest.eventNames).includes("station_inquest_opened")) {
    evidence.push("risky route reaches Station inquest");
  } else {
    missing.push("risky route with Station inquest");
  }

  return check("C5", "Safe/risky contrast is legible", evidence, missing, false);
}

function checkProviderBoundary(
  providerComparison: Record<string, unknown>,
  providerScheduling: Record<string, unknown>,
  providerDispatch: Record<string, unknown>,
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];

  if (readBoolean(providerComparison.pass)) {
    evidence.push("provider-shaped action comparison passes");
  } else {
    missing.push("provider-shaped action comparison pass");
  }
  const providerProofs = readRecordArray(providerComparison.providerProofs);
  if (providerProofs.length === REQUIRED_ROUTE_IDS.length && providerProofs.every(proof => readString(proof.providerMode) === "provider-action-proposal")) {
    evidence.push("provider route proofs are proposal-only");
  } else {
    missing.push("provider proposal-only route proofs");
  }
  if (readBoolean(providerScheduling.contractPass)) {
    evidence.push("provider scheduling contract passes");
  } else {
    missing.push("provider scheduling contract pass");
  }
  if ("liveGodotDispatchVerified" in providerScheduling && readBoolean(providerScheduling.liveGodotDispatchVerified) === false) {
    evidence.push("live Godot provider dispatch remains explicitly unverified");
  } else {
    missing.push("explicit live Godot provider dispatch blocker");
  }
  if (readBoolean(providerDispatch.contractPass)) {
    evidence.push("provider dispatch packet contract passes");
  } else {
    missing.push("provider dispatch packet contract pass");
  }
  if ("liveHttpDispatchVerified" in providerDispatch && readBoolean(providerDispatch.liveHttpDispatchVerified) === false) {
    evidence.push("live provider HTTP dispatch remains explicitly unverified");
  } else {
    missing.push("explicit live provider HTTP dispatch blocker");
  }

  return check("C7", "Provider wording is not outcome authority", evidence, missing, true);
}

function checkValidatedActionTrail(
  agenticRouteProofs: Record<string, unknown>[],
  providerComparison: Record<string, unknown>,
  providerScheduling: Record<string, unknown>,
  providerDispatch: Record<string, unknown>,
): SameOrderComprehensionProxyCheck {
  const evidence: string[] = [];
  const missing: string[] = [];
  const providerProofs = readRecordArray(providerComparison.providerProofs);
  const scheduledJobs = readRecordArray(providerScheduling.jobs);
  const packetProofs = readRecordArray(providerDispatch.packetProofs);

  if (routeProofsCarryAffordanceTrail(agenticRouteProofs)) {
    evidence.push("agentic route proofs preserve ordered ledger affordances");
  } else {
    missing.push("agentic route ordered ledger affordances");
  }
  if (routeProofsCarryAffordanceTrail(providerProofs)) {
    evidence.push("provider route proofs preserve the same action trail");
  } else {
    missing.push("provider route ordered ledger affordances");
  }
  if (scheduledJobsCarryRecentAffordances(scheduledJobs)) {
    evidence.push("scheduled provider jobs receive recent ledger affordances");
  } else {
    missing.push("scheduled provider recent ledger affordances");
  }
  if (dispatchPacketsCarryRecentAffordances(packetProofs)) {
    evidence.push("dispatch packets carry recent ledger affordances into provider context");
  } else {
    missing.push("dispatch packet recent ledger affordances");
  }

  return check("C6", "Validated action trail remains readable", evidence, missing, false);
}

function check(
  id: SameOrderComprehensionCheckId,
  label: string,
  evidence: string[],
  missing: string[],
  externalRequired: boolean,
): SameOrderComprehensionProxyCheck {
  return {
    id,
    label,
    proxyResult: missing.length === 0 ? "pass" : "fail",
    evidence,
    missing,
    externalRequired,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(item => asRecord(item)).filter(item => Object.keys(item).length > 0)
    : [];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => readString(item)).filter(Boolean)
    : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function routeProofsCarryAffordanceTrail(proofs: Record<string, unknown>[]): boolean {
  const routeIds = new Set(proofs.map(proof => readString(proof.routeId)));

  return REQUIRED_ROUTE_IDS.every(routeId => routeIds.has(routeId))
    && proofs
      .filter(proof => REQUIRED_ROUTE_IDS.includes(readString(proof.routeId)))
      .every(proof => {
        const ledgerEventKinds = readStringArray(proof.ledgerEventKinds);
        const ledgerAffordances = readStringArray(proof.ledgerAffordances);
        const traceAffordances = readRecordArray(proof.actionTrace)
          .map(trace => readString(trace.affordance))
          .filter(Boolean);

        return ledgerEventKinds.length > 0
          && ledgerAffordances.length === ledgerEventKinds.length
          && sameOrderedStrings(ledgerAffordances, traceAffordances);
      });
}

function scheduledJobsCarryRecentAffordances(jobs: Record<string, unknown>[]): boolean {
  return jobs.length > 0
    && jobs.some(job => readStringArray(asRecord(job.promptContext).recentLedgerEventKinds).length > 0)
    && jobs.every(job => {
      const promptContext = asRecord(job.promptContext);
      const recentKinds = readStringArray(promptContext.recentLedgerEventKinds);
      const recentAffordances = readStringArray(promptContext.recentLedgerAffordances);

      return recentKinds.length === recentAffordances.length;
    });
}

function dispatchPacketsCarryRecentAffordances(packetProofs: Record<string, unknown>[]): boolean {
  return packetProofs.length > 0
    && packetProofs.some(proof => {
      const packet = asRecord(proof.packet);
      const organizationContext = asRecord(packet.organizationContext);

      return readStringArray(organizationContext.recentLedgerEventKinds).length > 0;
    })
    && packetProofs.every(proof => {
      const packet = asRecord(proof.packet);
      const organizationContext = asRecord(packet.organizationContext);
      const recentKinds = readStringArray(organizationContext.recentLedgerEventKinds);
      const recentAffordances = readStringArray(organizationContext.recentLedgerAffordances);
      const recentEvents = readStringArray(packet.recentEvents);

      return recentKinds.length === recentAffordances.length
        && recentKinds.every((kind, index) =>
          recentAffordances[index]
          && recentEvents.includes(`${kind}:${recentAffordances[index]}`)
        );
    });
}

function sameOrderedStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
