import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const SAME_ORDER_VISUAL_EVIDENCE_PROXY_VERSION =
  "same-order-visual-evidence-proxy-v2" as const;

export interface SameOrderVisualEvidenceCaptureCheck {
  role: string;
  artifactPath: string;
  expectedWidth: number;
  expectedHeight: number;
  actualWidth: number;
  actualHeight: number;
  bytes: number;
  pass: boolean;
  requiresHumanReadabilityReview: boolean;
  expectedContent: string[];
  missing: string[];
}

export interface SameOrderVisualEvidenceProxyReport {
  version: typeof SAME_ORDER_VISUAL_EVIDENCE_PROXY_VERSION;
  proofType: "render-capture-verification";
  pass: boolean;
  freshCapture: boolean;
  ledgerAffordanceVisibility: {
    implementedInScripts: boolean;
    currentArtifactHasAffordance: boolean;
    freshGodotEvidence: boolean;
    evidencePath: string;
    requiredContent: string[];
  };
  typedInputEvidence: {
    implementedInScripts: boolean;
    currentArtifactUsesTypedInput: boolean;
    currentArtifactUsesInternalFallback: boolean;
    freshGodotEvidence: boolean;
    evidencePath: string;
    requiredContent: string[];
  };
  recordPropVisibility: {
    currentManifestHasRequiredProps: boolean;
    evidencePath: string;
    requiredPropIds: string[];
    missing: string[];
  };
  manifestPath: string;
  contactSheet: {
    artifactPath: string;
    expectedWidth: number;
    expectedHeight: number;
    actualWidth: number;
    actualHeight: number;
    bytes: number;
    pass: boolean;
    missing: string[];
  };
  requiredRoles: string[];
  captureChecks: SameOrderVisualEvidenceCaptureCheck[];
  blockedChecks: string[];
  humanReadabilityRequired: true;
  verdict: "FRESH_CAPTURE_VERIFIED_HUMAN_REVIEW_REQUIRED" | "VISUAL_PROXY_FAIL";
  remainingRequiredEvidence: string[];
}

const REQUIRED_CAPTURE_ROLES = [
  "opening-store-framing",
  "store-rule-guide-readable",
  "active-conversation-hud",
  "conversation-why-line",
  "store-record-props-closeup",
  "inquest-session-end",
  "station-record-props-closeup",
  "repair-correction-slip-closeup",
];

const REQUIRED_RECORD_PROP_IDS = [
  "receipt_tray",
  "correction_slip",
  "report_tray",
  "station_dossier",
  "civic_ledger",
  "civic_economy_panel",
];

const MIN_CAPTURE_BYTES = 32_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function buildSameOrderVisualEvidenceProxyReport(input: {
  repoRoot: string;
  manifestPath?: string;
}): SameOrderVisualEvidenceProxyReport {
  const manifestPath = input.manifestPath ?? "data/evidence/godot/visual-capture/manifest.json";
  const manifest = readJson(resolve(input.repoRoot, manifestPath));
  const captures = readRecordArray(manifest.captures);
  const captureChecks = captures.map(capture => checkCapture(input.repoRoot, capture));
  const blockedChecks = readStringArray(manifest.blockedChecks);
  const contactSheet = checkContactSheet(input.repoRoot, asRecord(manifest.contactSheet));
  const ledgerAffordanceVisibility = checkLedgerAffordanceVisibility(input.repoRoot);
  const typedInputEvidence = checkTypedInputEvidence(input.repoRoot);
  const recordPropVisibility = checkRecordPropVisibility(manifest);
  const freshCapture = ledgerAffordanceVisibility.freshGodotEvidence
    && typedInputEvidence.freshGodotEvidence
    && recordPropVisibility.currentManifestHasRequiredProps
    && manifestShowsFallbackOnlyProvider(manifest);
  const presentRoles = new Set(captureChecks.map(check => check.role));
  const missingRoles = REQUIRED_CAPTURE_ROLES.filter(role => !presentRoles.has(role));
  const pass = blockedChecks.length === 0
    && missingRoles.length === 0
    && contactSheet.pass
    && captureChecks.every(check => check.pass)
    && freshCapture;

  return {
    version: SAME_ORDER_VISUAL_EVIDENCE_PROXY_VERSION,
    proofType: "render-capture-verification",
    pass,
    freshCapture,
    ledgerAffordanceVisibility,
    typedInputEvidence,
    recordPropVisibility,
    manifestPath,
    contactSheet,
    requiredRoles: REQUIRED_CAPTURE_ROLES,
    captureChecks,
    blockedChecks,
    humanReadabilityRequired: true,
    verdict: pass ? "FRESH_CAPTURE_VERIFIED_HUMAN_REVIEW_REQUIRED" : "VISUAL_PROXY_FAIL",
    remainingRequiredEvidence: pass ? [
      "Run or preserve human readability review against the refreshed contact sheet.",
      "Use the Store, Station, and repair correction-slip closeups for prop-label review.",
      "Do not treat this proxy as external player comprehension.",
    ] : [
      "Re-run Godot playable_slice_smoke.gd and visual_capture.gd.",
      "Confirm typed free input, latest ledger actor/action, and fallback-only provider state are current.",
      "Confirm Store, Station, and repair correction-slip closeups plus manifest prop snapshots are current.",
      "Run human readability review against the refreshed contact sheet.",
    ],
  };
}

function checkRecordPropVisibility(manifest: Record<string, unknown>): SameOrderVisualEvidenceProxyReport["recordPropVisibility"] {
  const props = asRecord(asRecord(manifest.storeConversationEvidence).worldRecordProps);
  const missing: string[] = [];
  for (const propId of REQUIRED_RECORD_PROP_IDS) {
    const prop = asRecord(props[propId]);
    if (Object.keys(prop).length === 0) {
      missing.push(`${propId}:missing`);
      continue;
    }
    if (!readBoolean(prop.visible)) {
      missing.push(`${propId}:not visible`);
    }
    if (!readBoolean(prop.hasBody)) {
      missing.push(`${propId}:missing body`);
    }
    if (readString(prop.label).trim().length === 0) {
      missing.push(`${propId}:missing label`);
    }
  }
  return {
    currentManifestHasRequiredProps: missing.length === 0,
    evidencePath: "data/evidence/godot/visual-capture/manifest.json:storeConversationEvidence.worldRecordProps",
    requiredPropIds: REQUIRED_RECORD_PROP_IDS,
    missing,
  };
}

function checkLedgerAffordanceVisibility(repoRoot: string): SameOrderVisualEvidenceProxyReport["ledgerAffordanceVisibility"] {
  const evidencePath = "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json";
  const absoluteEvidencePath = resolve(repoRoot, evidencePath);
  const evidence = existsSync(absoluteEvidencePath) ? readJson(absoluteEvidencePath) : {};
  const playableSummary = asRecord(evidence.playableSummary);
  const latestLedger = lastRecord(readRecordArray(playableSummary.civicLedger));
  const worldRecordProps = asRecord(playableSummary.worldRecordProps);
  const civicLedgerProp = asRecord(worldRecordProps.civic_ledger);
  const civicLedgerLabel = readString(civicLedgerProp.label);
  const expectedAffordanceLabel = readString(latestLedger.affordance) === "refuse_contact"
    ? ["접촉 거부", "refuse contact"]
    : ["기록 인용", "cite record"];
  const requiredContent = ["affordance", "actorRole", "civic-ledger-", expectedAffordanceLabel[0]];
  const implementedInScripts = fileContains(resolve(repoRoot, "godot/scripts/runtime/playable_session.gd"), "\"affordance\": affordance")
    && fileContains(resolve(repoRoot, "godot/scripts/ui/social_stealth_hud.gd"), "_affordance_label");
  const currentArtifactHasAffordance = readString(latestLedger.affordance).length > 0
    && civicLedgerLabel.includes("civic-ledger-")
    && expectedAffordanceLabel.some(label => civicLedgerLabel.includes(label));

  return {
    implementedInScripts,
    currentArtifactHasAffordance,
    freshGodotEvidence: implementedInScripts && currentArtifactHasAffordance,
    evidencePath: `${evidencePath}:playableSummary.worldRecordProps.civic_ledger.label`,
    requiredContent,
  };
}

function checkTypedInputEvidence(repoRoot: string): SameOrderVisualEvidenceProxyReport["typedInputEvidence"] {
  const evidencePath = "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json";
  const absoluteEvidencePath = resolve(repoRoot, evidencePath);
  const evidence = existsSync(absoluteEvidencePath) ? readJson(absoluteEvidencePath) : {};
  const playableSummary = asRecord(evidence.playableSummary);
  const summaryConversation = asRecord(playableSummary.conversation);
  const events = [
    ...readRecordArray(playableSummary.events),
    ...readRecordArray(evidence.events),
  ];
  const freeInputEvents = events.filter(event => readString(event.eventName) === "free_input_submitted");
  const implementedInScripts =
    fileContains(resolve(repoRoot, "godot/scripts/runtime/playable_session.gd"), "func submit_free_input(line: String) -> void:")
    && fileContains(resolve(repoRoot, "godot/scripts/ui/social_stealth_hud.gd"), "signal free_input_submitted(line: String)")
    && fileContains(resolve(repoRoot, "godot/tools/playable_slice_smoke.gd"), "\"typed_free_input\"");
  const currentArtifactUsesTypedInput = freeInputEvents.some(event =>
    readString(event.inputMode) === "typed_free_input"
    && readString(event.recordedStatementScope).length === 0
    && readString(event.freeInputHash).length > 0
  );
  const currentArtifactUsesInternalFallback = freeInputEvents.some(event =>
    readString(event.inputMode) === "explicit_recorded_statement"
    || readString(event.recordedStatementScope).includes("key_4")
    || readString(event.recordedStatementScope).includes("legacy_explicit_recorded_statement")
  ) || readString(summaryConversation.recordedStatementScope).includes("key_4")
    || readString(summaryConversation.recordedStatementScope).includes("legacy_explicit_recorded_statement");

  return {
    implementedInScripts,
    currentArtifactUsesTypedInput,
    currentArtifactUsesInternalFallback,
    freshGodotEvidence: implementedInScripts && currentArtifactUsesTypedInput && !currentArtifactUsesInternalFallback,
    evidencePath: `${evidencePath}:playableSummary.events[free_input_submitted]`,
    requiredContent: ["free_input_submitted", "typed_free_input", "freeInputHash", "empty recordedStatementScope"],
  };
}

function manifestShowsFallbackOnlyProvider(manifest: Record<string, unknown>): boolean {
  const providerState = asRecord(asRecord(manifest.storeConversationEvidence).providerState);
  return readString(providerState.mode) === "fallback_only_m1"
    && readBoolean(providerState.liveVerified) === false;
}

function checkCapture(repoRoot: string, capture: Record<string, unknown>): SameOrderVisualEvidenceCaptureCheck {
  const artifactPath = readString(capture.artifactPath);
  const expectedWidth = readNumber(capture.width);
  const expectedHeight = readNumber(capture.height);
  const png = readPngInfo(resolve(repoRoot, artifactPath));
  const expectedContent = readStringArray(capture.expectedContent);
  const missing: string[] = [];

  if (!png.exists) {
    missing.push("file");
  }
  if (!png.isPng) {
    missing.push("png signature");
  }
  if (png.bytes < MIN_CAPTURE_BYTES) {
    missing.push("minimum byte size");
  }
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    missing.push("expected dimensions");
  }
  if (expectedContent.length === 0) {
    missing.push("expected content notes");
  }
  if (readBoolean(capture.requiresHumanReadabilityReview) !== true) {
    missing.push("human readability flag");
  }

  return {
    role: readString(capture.role),
    artifactPath,
    expectedWidth,
    expectedHeight,
    actualWidth: png.width,
    actualHeight: png.height,
    bytes: png.bytes,
    pass: missing.length === 0,
    requiresHumanReadabilityReview: readBoolean(capture.requiresHumanReadabilityReview),
    expectedContent,
    missing,
  };
}

function checkContactSheet(
  repoRoot: string,
  contactSheet: Record<string, unknown>,
): SameOrderVisualEvidenceProxyReport["contactSheet"] {
  const artifactPath = readString(contactSheet.artifactPath);
  const expectedWidth = readNumber(contactSheet.width);
  const expectedHeight = readNumber(contactSheet.height);
  const png = readPngInfo(resolve(repoRoot, artifactPath));
  const missing: string[] = [];

  if (!png.exists) {
    missing.push("file");
  }
  if (!png.isPng) {
    missing.push("png signature");
  }
  if (png.bytes < MIN_CAPTURE_BYTES) {
    missing.push("minimum byte size");
  }
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    missing.push("expected dimensions");
  }

  return {
    artifactPath,
    expectedWidth,
    expectedHeight,
    actualWidth: png.width,
    actualHeight: png.height,
    bytes: png.bytes,
    pass: missing.length === 0,
    missing,
  };
}

function readPngInfo(path: string): {
  exists: boolean;
  isPng: boolean;
  width: number;
  height: number;
  bytes: number;
} {
  if (!existsSync(path)) {
    return { exists: false, isPng: false, width: 0, height: 0, bytes: 0 };
  }
  const bytes = statSync(path).size;
  const buffer = readFileSync(path);
  const isPng = buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  const width = isPng && buffer.length >= 24 ? buffer.readUInt32BE(16) : 0;
  const height = isPng && buffer.length >= 24 ? buffer.readUInt32BE(20) : 0;
  return { exists: true, isPng, width, height, bytes };
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function fileContains(path: string, pattern: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8").includes(pattern);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function lastRecord(value: Record<string, unknown>[]): Record<string, unknown> {
  return value.length > 0 ? value[value.length - 1] : {};
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

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}
