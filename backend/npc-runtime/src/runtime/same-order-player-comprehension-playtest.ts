export const SAME_ORDER_PLAYER_COMPREHENSION_PLAYTEST_VERSION =
  "same-order-player-comprehension-playtest-v6" as const;

const REQUIRED_ROUTES = ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"] as const;

type SameOrderRouteId = (typeof REQUIRED_ROUTES)[number];

export interface SameOrderPlayerComprehensionQuestion {
  id: "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";
  audience: "player" | "product-reviewer";
  prompt: string;
  passSignal: string;
}

export interface SameOrderPlayerComprehensionAssignment {
  testerId: "T1" | "T2" | "T3";
  routeOrder: SameOrderRouteId[];
  purpose: string;
}

export interface SameOrderPlayerComprehensionRouteCard {
  routeId: SameOrderRouteId;
  facilitatorUse: "after-free-attempt-or-scripted-alternate";
  playerActions: string[];
  expectedVisibleEvidence: string[];
  comprehensionSignal: string;
}

export interface SameOrderPlayerComprehensionObservation {
  id: "O1" | "O2" | "O3" | "O4" | "O5" | "O6" | "O7";
  check: string;
  passSignal: string;
}

export interface SameOrderPlayerComprehensionPlaytestPacket {
  version: typeof SAME_ORDER_PLAYER_COMPREHENSION_PLAYTEST_VERSION;
  proofType: "blind-player-comprehension-protocol";
  readyToRun: boolean;
  externalBlockerClosed: false;
  artifactRunId: string;
  languagePath: "ko-primary";
  requiredTesterCount: 3;
  routeCoverage: {
    requiredRouteIds: SameOrderRouteId[];
    evidenceRouteIds: string[];
    agenticRouteIds: string[];
  };
  startInstruction: string;
  facilitatorRules: string[];
  typedInputInstruction: string;
  assignments: SameOrderPlayerComprehensionAssignment[];
  routeRunCards: SameOrderPlayerComprehensionRouteCard[];
  observationChecklist: SameOrderPlayerComprehensionObservation[];
  questions: SameOrderPlayerComprehensionQuestion[];
  passThresholds: string[];
  sessionNoteTemplate: string[];
  stillRequired: string[];
  verdict: "PLAYTEST_PACKET_READY_EXTERNAL_REQUIRED" | "PLAYTEST_PACKET_NOT_READY";
}

const QUESTIONS: SameOrderPlayerComprehensionQuestion[] = [
  {
    id: "C1",
    audience: "player",
    prompt: "What did you think was happening to you in this scene?",
    passSignal: "The tester says NPCs or Station systems are checking, evaluating, interrogating, or building a case against the player.",
  },
  {
    id: "C2",
    audience: "player",
    prompt: "What made the situation more or less dangerous?",
    passSignal: "The tester connects danger to their answer, wording, contradiction, hesitation, or repair.",
  },
  {
    id: "C3",
    audience: "player",
    prompt: "Why did the result happen?",
    passSignal: "The tester points to a rule, why-line, record, ledger event, report pressure, or Station citation.",
  },
  {
    id: "C4",
    audience: "player",
    prompt: "What changed on the screen after your answer?",
    passSignal: "The tester points to a receipt, correction, report, dossier, ledger, trust, burden, attention, why-line, or outcome change.",
  },
  {
    id: "C5",
    audience: "player",
    prompt: "After seeing the alternate path, which answer was safer and which was riskier?",
    passSignal: "The tester distinguishes clean or repair from soft report or inquest and names the reason.",
  },
  {
    id: "C6",
    audience: "player",
    prompt: "Who made or cited the latest record you saw, and what validated action made that record?",
    passSignal: "The tester names Store Clerk, Store Manager, Station Officer, or an equivalent role plus a visible ledger action such as create receipt, mark receipt, place note, forward report, or cite record.",
  },
  {
    id: "C7",
    audience: "product-reviewer",
    prompt: "Can provider wording decide risk, Evidence, Exposure, verdict, or session end?",
    passSignal: "The reviewer confirms provider output is wording only and deterministic rules own outcomes.",
  },
];

const ROUTE_RUN_CARDS: SameOrderPlayerComprehensionRouteCard[] = [
  {
    routeId: "clean_cover",
    facilitatorUse: "after-free-attempt-or-scripted-alternate",
    playerActions: ["Choose 1 at the Store routine prompt.", "Choose 1 at the probe prompt."],
    expectedVisibleEvidence: ["normal receipt", "stable trust", "Store Clerk create-receipt ledger action", "no Store report", "no Station dossier citation"],
    comprehensionSignal: "Tester can say the ordinary answer closed the sale without a report.",
  },
  {
    routeId: "repair_recovered",
    facilitatorUse: "after-free-attempt-or-scripted-alternate",
    playerActions: ["Choose 2 at the Store routine prompt.", "Choose 1 at the probe prompt."],
    expectedVisibleEvidence: ["marked receipt", "attached correction slip", "Store Clerk correction ledger action", "small burden", "no Station inquest"],
    comprehensionSignal: "Tester can say uncertainty created a record, but accepting the premise repaired it locally.",
  },
  {
    routeId: "soft_report",
    facilitatorUse: "after-free-attempt-or-scripted-alternate",
    playerActions: ["Choose 3 at the Store routine prompt.", "Choose 3 at the probe prompt."],
    expectedVisibleEvidence: ["marked receipt", "pending report tray", "Store Manager reaction", "Store Manager note/forward ledger action", "no formal inquest"],
    comprehensionSignal: "Tester can say the Store reacted and made a report without the Station ending the session.",
  },
  {
    routeId: "inquest_opened",
    facilitatorUse: "after-free-attempt-or-scripted-alternate",
    playerActions: [
      "Choose 3 at the Store routine prompt.",
      "After the probe prompt appears, wait about 12 seconds for the delayed-answer record.",
      "Type '저는 이 꿈에 방금 들어왔어요.' into the HUD input and press Enter.",
    ],
    expectedVisibleEvidence: ["delayed-answer record", "forwarded report tray", "cited Station dossier", "Station Officer cite-record ledger action", "Station attention", "locked inquest outcome"],
    comprehensionSignal: "Tester can say typed speech and delayed response became Store records that the Station used.",
  },
];

const OBSERVATION_CHECKLIST: SameOrderPlayerComprehensionObservation[] = [
  {
    id: "O1",
    check: "Before debrief, tester identifies that NPCs or Station systems are evaluating the player.",
    passSignal: "Uses checked, judged, reported, investigated, cited, or equivalent language about the player.",
  },
  {
    id: "O2",
    check: "Tester connects a spoken or typed answer to a changed Store record.",
    passSignal: "Names receipt, correction slip, report tray, typed line, or Store record.",
  },
  {
    id: "O3",
    check: "Tester notices at least one social actor reaction beyond the clerk's dialogue.",
    passSignal: "Names Store Manager, Station Officer, report handoff, dossier citation, or visible ledger pressure.",
  },
  {
    id: "O4",
    check: "Tester can explain why clean or repair is safer than soft report or inquest.",
    passSignal: "Mentions routine fit, correction, contradiction, dream wording, report, or Station citation.",
  },
  {
    id: "O5",
    check: "Tester can identify which role made or cited the latest ledger record and the validated action shown beside it.",
    passSignal: "Names Store Clerk, Store Manager, Station Officer, or an equivalent visible role label plus create receipt, mark receipt, place note, forward report, cite record, or equivalent action wording.",
  },
  {
    id: "O6",
    check: "Tester does not describe the core role as investigating other people.",
    passSignal: "Keeps the player as the person being evaluated, not the case owner.",
  },
  {
    id: "O7",
    check: "Tester connects a delayed answer or hesitation to a Store record or Station pressure.",
    passSignal: "Names hesitation, delayed answer, time taken, delayed-answer record, or equivalent record pressure.",
  },
];

export function buildSameOrderPlayerComprehensionPlaytestPacket(input: unknown): SameOrderPlayerComprehensionPlaytestPacket {
  const artifact = asRecord(input);
  const playability = asRecord(artifact.playability);
  const evidenceRouteIds = routeIds(playability.routeProofs);
  const agenticRouteIds = routeIds(playability.agenticRouteProofs);
  const inquestRouteHasHesitationEvidence = routeProofHasSignal(playability.routeProofs, "inquest_opened", "response_hesitation")
    && routeProofHasEvent(playability.routeProofs, "inquest_opened", "response_hesitation_noted");
  const readyToRun = coversRequiredRoutes(evidenceRouteIds)
    && coversRequiredRoutes(agenticRouteIds)
    && inquestRouteHasHesitationEvidence
    && readBoolean(asRecord(playability.comprehensionProxy).pass);

  return {
    version: SAME_ORDER_PLAYER_COMPREHENSION_PLAYTEST_VERSION,
    proofType: "blind-player-comprehension-protocol",
    readyToRun,
    externalBlockerClosed: false,
    artifactRunId: readString(artifact.runId),
    languagePath: "ko-primary",
    requiredTesterCount: 3,
    routeCoverage: {
      requiredRouteIds: [...REQUIRED_ROUTES],
      evidenceRouteIds,
      agenticRouteIds,
    },
    startInstruction: "Play this short Station intake path until it stops or until 5 minutes pass.",
    facilitatorRules: [
      "Do not explain the player role before play.",
      "Do not label any answer as safe or risky before play.",
      "Ask the debrief questions before explaining Store records, Station citation, or provider boundaries.",
      "Use route cards only after the tester's free first attempt or for a scripted alternate run.",
    ],
    typedInputInstruction: "For the inquest alternate run, use the HUD input field and press Enter; do not use the internal recorded-statement fallback.",
    assignments: [
      {
        testerId: "T1",
        routeOrder: ["clean_cover", "inquest_opened"],
        purpose: "Contrast normal receipt closure with Station citation.",
      },
      {
        testerId: "T2",
        routeOrder: ["repair_recovered", "inquest_opened"],
        purpose: "Contrast local correction with formal escalation.",
      },
      {
        testerId: "T3",
        routeOrder: ["soft_report", "clean_cover"],
        purpose: "Contrast Store-side report pressure with a clean routine sale.",
      },
    ],
    routeRunCards: ROUTE_RUN_CARDS,
    observationChecklist: OBSERVATION_CHECKLIST,
    questions: QUESTIONS,
    passThresholds: [
      "3 of 3 testers must understand that NPCs or Station systems are evaluating the player.",
      "3 of 3 testers must understand that their answer can become evidence.",
      "At least 2 of 3 testers must connect visible consequence to their answer.",
      "At least 2 of 3 testers who see the inquest comparison must connect the delayed answer or hesitation to a record.",
      "At least 2 of 3 testers must identify the role and action behind the latest visible ledger record.",
      "No tester may leave primarily thinking they are investigating other people.",
      "C7 must pass as product review before M1 product closure.",
    ],
    sessionNoteTemplate: [
      "Build or artifact id:",
      "Tester language comfort:",
      "Free first attempt route and final state:",
      "Scripted alternate route:",
      "Observed O1-O7 pass/fail with quotes:",
      "C1-C7 answers:",
      "Delayed answer record noticed:",
      "Direct quote delay-to-record:",
      "Confusion points before facilitator explanation:",
      "Decision: pass, conditional, or fail for this tester:",
    ],
    stillRequired: [
      "Run the three-tester protocol with no design explanation before play.",
      "Record one session note per tester.",
      "Observe at least one safe or repair path and one inquest path across the cohort.",
      "Do not use this packet to close the external comprehension blocker.",
    ],
    verdict: readyToRun ? "PLAYTEST_PACKET_READY_EXTERNAL_REQUIRED" : "PLAYTEST_PACKET_NOT_READY",
  };
}

function routeIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(route => readString(asRecord(route).routeId)).filter(Boolean)
    : [];
}

function coversRequiredRoutes(routeIds: string[]): boolean {
  return REQUIRED_ROUTES.every(routeId => routeIds.includes(routeId));
}

function routeProofHasEvent(value: unknown, routeId: SameOrderRouteId, eventName: string): boolean {
  const proof = findRouteProof(value, routeId);
  return readStringArray(proof.eventNames).includes(eventName);
}

function routeProofHasSignal(value: unknown, routeId: SameOrderRouteId, signal: string): boolean {
  const proof = findRouteProof(value, routeId);
  return readStringArray(proof.signals).includes(signal);
}

function findRouteProof(value: unknown, routeId: SameOrderRouteId): Record<string, unknown> {
  if (!Array.isArray(value)) {
    return {};
  }
  const proof = value.find(route => readString(asRecord(route).routeId) === routeId);
  return asRecord(proof);
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return value === true;
}
