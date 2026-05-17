import {
  ACTION_TYPES,
  CONVERSATION_SUSPICION_SIGNALS,
  PLAYER_SPEECH_ACTS,
  SOCIAL_LOOP_STAGES,
  type ActionType,
  type ConversationSuspicionSignal,
  type PlayerSpeechAct,
  type SocialLoopStage,
} from "../contracts/types.js";
import {
  CONVERSATION_SUSPICION_MAX_SCORE,
  resolveConversationNpcStage,
} from "../runtime/conversation-suspicion.js";

export const GODOT_SCHEMA_VERSION = "godot-runtime-v1" as const;

export const GODOT_COORDINATE_SPACE = {
  name: "Godot 3D world",
  unit: "meter",
  axes: {
    x: "right",
    y: "up",
    z: "forward/back",
  },
} as const;

export const GODOT_TIME_UNITS = {
  timestampMs: "Unix epoch milliseconds",
  deltaMs: "milliseconds",
  timeoutMs: "milliseconds",
} as const;

export const GODOT_WORLD_ID_SEMANTICS =
  "worldId identifies one loaded Godot world instance; worldRevision changes when deterministic topology, landmark, text surface, or domain rule data changes.";

export const GODOT_REASON_CODES = [
  "schema_invalid_payload",
  "schema_session_mismatch",
  "schema_world_mismatch",
  "schema_world_revision_mismatch",
  "schema_unknown_actor",
  "schema_actor_busy",
  "schema_unknown_landmark",
  "schema_unknown_zone",
  "schema_unknown_text_surface",
  "schema_unknown_action_type",
  "schema_invalid_action_target",
  "schema_invalid_player_speech_act",
  "schema_invalid_social_loop_stage",
  "schema_invalid_end_state",
  "schema_invalid_evidence_pack",
  "schema_duplicate_command",
  "schema_timeout_invalid",
  "schema_observation_incompatible",
] as const;

export type GodotReasonCode = (typeof GODOT_REASON_CODES)[number];

export const GODOT_END_STATES = ["running", "cleared", "warning", "detained", "lucid_identified", "case_closed"] as const;
export type GodotEndState = (typeof GODOT_END_STATES)[number];

export interface GodotVector3 {
  x: number;
  y: number;
  z: number;
}

export interface GodotTextSurfaceObservation {
  id: string;
  landmarkId: string;
  text: string;
  dreamLawIds: string[];
  coverTestIds: string[];
}

export interface GodotEvidenceArtifact {
  id: string;
  type: "complaint" | "ticket" | "memo" | "witness_reference" | "intake_dossier" | "procedural_speech_log" | "verdict" | "why_line";
  stage: SocialLoopStage;
  summary: string;
}

export type GodotEvidenceEventFamily =
  | "session"
  | "observation"
  | "ai"
  | "command"
  | "fallback"
  | "domain"
  | "evidence_export";

export interface GodotEvidenceEvent {
  schemaVersion: typeof GODOT_SCHEMA_VERSION;
  eventId: string;
  eventName: string;
  eventFamily: GodotEvidenceEventFamily;
  adapter: "godot";
  sessionId: string;
  worldId: string;
  worldRevision: string;
  timestampMs: number;
  socialLoopStage?: SocialLoopStage;
  actorId?: string;
  commandId?: string;
  reasonCode?: string;
  reasonCategory?: "none" | "policy" | "schema" | "timeout" | "cancelled" | "parse" | "tool" | "runtime" | "unknown";
  warningTier?: "blocking" | "attention" | "reference";
  transport?: "codex" | "codex-reply" | "fallback";
  threadId?: string;
  usedFallback?: boolean;
  artifactPath?: string;
  conversationId?: string;
  turnId?: string;
  promptId?: string;
  choiceSetId?: string;
  speakerId?: string;
  selectedChoiceId?: string;
  freeInputHash?: string;
  displayedPlayerLine?: string;
  priorTurnIds?: string[];
  suspicionSignals?: ConversationSuspicionSignal[];
  suspicionBefore?: number;
  suspicionAfter?: number;
  suspicionDelta?: number;
  reportWeightBefore?: number;
  reportWeightAfter?: number;
  reportDelta?: number;
  whyLine?: string;
  whyLineKey?: string;
  conversationStage?: SocialLoopStage;
  outcome?: string;
  summary: string;
}

export interface GodotEvidencePack {
  schemaVersion: typeof GODOT_SCHEMA_VERSION;
  runId: string;
  adapter: "godot";
  sessionId: string;
  worldId: string;
  worldRevision: string;
  createdAtMs: number;
  events: GodotEvidenceEvent[];
  summaries: {
    runSignature: string;
    actorSignatures: Record<string, string>;
    fallbackCounters: Record<string, number>;
    commandOutcomeCounts: Record<string, number>;
    domainTriggerCounts: Record<string, number>;
    verdictEndStateTrace: string;
    blockedChecks: string[];
  };
}

export interface GodotEvidencePackTrajectoryDiversityRun {
  index: number;
  runId: string;
  sessionId: string;
  eventCount: number;
  socialEventCount: number;
  behaviorSignature: string;
}

export interface GodotEvidencePackTrajectoryDiversityReport {
  requiredRuns: number;
  minDistinctTrajectories: number;
  runCount: number;
  distinctTrajectories: number;
  pass: boolean;
  runs: GodotEvidencePackTrajectoryDiversityRun[];
}

export interface GodotEvidencePackTrajectoryDiversityOptions {
  requiredRuns?: number;
  minDistinctTrajectories?: number;
}

export interface GodotConversationSuspicionProofReport {
  runId: string;
  conversationId: string;
  chainEventNames: string[];
  turnIds: string[];
  finalConversationStage: SocialLoopStage;
  finalSuspicion: number;
  finalReportWeight: number;
}

export interface GodotSameOrderRouteProofEvent {
  eventId: string;
  eventName: string;
  conversationStage?: SocialLoopStage;
  socialLoopStage?: SocialLoopStage;
  suspicionAfter?: number;
  reportWeightAfter?: number;
  suspicionSignals?: string[];
  outcome?: string;
  routeOutcome?: string;
}

export interface GodotSameOrderRouteProof {
  routeId: string;
  sessionOutcome: string;
  routeOutcome: string;
  stage: SocialLoopStage;
  suspicion: number;
  reportWeight: number;
  eventNames: string[];
  signals: string[];
  events: GodotSameOrderRouteProofEvent[];
}

export interface GodotSameOrderRouteProofsReport {
  runId: string;
  routeIds: string[];
  sessionOutcomes: string[];
  routeOutcomes: string[];
  proofs: GodotSameOrderRouteProof[];
}

export interface GodotExposureState {
  score: number;
  thresholds: {
    stationInterest: number;
    inquest: number;
    verdict: number;
  };
}

export interface GodotStationState {
  intakeOpen: boolean;
  inquestOpen: boolean;
  verdictReady: boolean;
  sessionTerminationAllowed: boolean;
}

export interface GodotObservationFrame {
  schemaVersion: typeof GODOT_SCHEMA_VERSION;
  sessionId: string;
  worldId: string;
  worldRevision: string;
  frameId: string;
  timestampMs: number;
  deltaMs: number;
  npcId: string;
  playerId: string;
  landmarkId: string;
  zoneId?: string;
  position: GodotVector3;
  velocity?: GodotVector3;
  nearbyActors: string[];
  visibleLandmarks: string[];
  visibleTextSurfaces: GodotTextSurfaceObservation[];
  recentEvents: string[];
  organizationContext: Record<string, unknown>;
  playerSignals: {
    speechAct?: PlayerSpeechAct;
    rawText?: string;
    exposureDelta?: number;
  };
  socialLoopStage: SocialLoopStage;
  exposure: GodotExposureState;
  station: GodotStationState;
  evidence: GodotEvidenceArtifact[];
}

export interface GodotActionTarget {
  actorId?: string;
  landmarkId?: string;
  zoneId?: string;
  textSurfaceId?: string;
  position?: GodotVector3;
}

export interface GodotNpcCommandEnvelope {
  schemaVersion: typeof GODOT_SCHEMA_VERSION;
  commandId: string;
  sessionId: string;
  worldId: string;
  worldRevision: string;
  npcId: string;
  issuedAtMs: number;
  timeoutMs: number;
  actionType: ActionType;
  target: GodotActionTarget;
  utterance?: string;
  reasonCodes: string[];
  expectedStage: SocialLoopStage;
  source: "codex" | "fallback" | "test-fixture";
}

export interface GodotRuntimeContext {
  activeSessionId: string;
  activeWorldId: string;
  worldRevision: string;
  actorIds: readonly string[];
  landmarkIds: readonly string[];
  zoneIds: readonly string[];
  textSurfaceIds: readonly string[];
  completedCommandIds?: readonly string[];
  inFlightActorIds?: readonly string[];
}

export interface GodotValidationFailure {
  reasonCode: GodotReasonCode;
  path: string;
  message: string;
}

export type GodotValidationResult<T> =
  | { ok: true; value: T; failures: [] }
  | { ok: false; failures: GodotValidationFailure[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushFailure(
  failures: GodotValidationFailure[],
  reasonCode: GodotReasonCode,
  path: string,
  message: string,
): void {
  failures.push({ reasonCode, path, message });
}

function readString(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): string | undefined {
  const value = obj[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be a non-empty string");
    return undefined;
  }
  return value;
}

function readNumber(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
): number | undefined {
  const value = obj[key];
  const invalidNumber = typeof value !== "number" || !Number.isFinite(value);
  const invalidInteger = options.integer === true && !Number.isInteger(value);
  const invalidMin = typeof options.min === "number" && typeof value === "number" && value < options.min;
  const invalidMax = typeof options.max === "number" && typeof value === "number" && value > options.max;
  if (invalidNumber || invalidInteger || invalidMin || invalidMax) {
    pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be a finite number with the expected bounds");
    return undefined;
  }
  return value;
}

function readStringArray(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): string[] | undefined {
  const value = obj[key];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || item.trim().length === 0)) {
    pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be a non-empty string[]");
    return undefined;
  }
  return [...value];
}

function readRecord(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): Record<string, unknown> | undefined {
  const value = obj[key];
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be an object");
    return undefined;
  }
  return value;
}

function readOptionalString(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): string | undefined {
  if (obj[key] === undefined) {
    return undefined;
  }
  return readString(obj, key, failures, path);
}

function readOptionalNumber(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
  options: { integer?: boolean; min?: number; max?: number } = { min: 0 },
): number | undefined {
  if (obj[key] === undefined) {
    return undefined;
  }
  return readNumber(obj, key, failures, path, options);
}

function readOptionalStringArray(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): string[] | undefined {
  if (obj[key] === undefined) {
    return undefined;
  }
  return readStringArray(obj, key, failures, path);
}

function readOptionalBoolean(
  obj: Record<string, unknown>,
  key: string,
  failures: GodotValidationFailure[],
  path: string,
): boolean | undefined {
  const value = obj[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be boolean when present");
    return undefined;
  }
  return value;
}

function readNumberRecord(
  value: unknown,
  failures: GodotValidationFailure[],
  path: string,
): Record<string, number> | undefined {
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_payload", path, "must be a number map");
    return undefined;
  }
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0) {
      pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be a non-negative finite number");
      continue;
    }
    result[key] = item;
  }
  return result;
}

function readStringRecord(
  value: unknown,
  failures: GodotValidationFailure[],
  path: string,
): Record<string, string> | undefined {
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_payload", path, "must be a string map");
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string" || item.trim().length === 0) {
      pushFailure(failures, "schema_invalid_payload", `${path}.${key}`, "must be a non-empty string");
      continue;
    }
    result[key] = item;
  }
  return result;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function serializeNumberRecord(record: Record<string, number>): string {
  return Object.entries(record)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join(",");
}

function buildEvidencePackBehaviorSignature(pack: GodotEvidencePack): {
  behaviorSignature: string;
  socialEventCount: number;
} {
  const socialEvents = pack.events.filter(event => event.eventFamily !== "session" && event.eventFamily !== "evidence_export");
  const eventSignature = socialEvents
    .map(event =>
      [
        event.eventFamily,
        event.eventName,
        event.socialLoopStage ?? "none",
        event.actorId ?? "none",
        event.reasonCode ?? "none",
        event.reasonCategory ?? "none",
        event.warningTier ?? "none",
        event.transport ?? "none",
        event.usedFallback === undefined ? "none" : event.usedFallback ? "true" : "false",
      ].join("|"),
    )
    .join(">");

  return {
    socialEventCount: socialEvents.length,
    behaviorSignature: [
      `events=${eventSignature}`,
      `actors=${Object.keys(pack.summaries.actorSignatures).sort((left, right) => left.localeCompare(right)).join(",")}`,
      `fallback=${serializeNumberRecord(pack.summaries.fallbackCounters)}`,
      `commands=${serializeNumberRecord(pack.summaries.commandOutcomeCounts)}`,
      `domain=${serializeNumberRecord(pack.summaries.domainTriggerCounts)}`,
      `trace=${pack.summaries.verdictEndStateTrace}`,
    ].join("\n"),
  };
}

const CONVERSATION_EVENT_NAMES = [
  "conversation_started",
  "dialogue_choice_selected",
  "free_input_submitted",
  "response_hesitation_noted",
  "conversation_anomaly_detected",
  "npc_suspicion_changed",
  "suspicion_shared",
  "station_report_created",
  "station_inquest_opened",
] as const;

const CONVERSATION_SIGNAL_TRACE_EVENT_NAMES = [
  "response_hesitation_noted",
  "conversation_anomaly_detected",
  "npc_suspicion_changed",
  "suspicion_shared",
  "station_report_created",
  "station_inquest_opened",
] as const;

const SAME_ORDER_PROOF_EVENT_NAMES = [
  "conversation_started",
  "dialogue_choice_selected",
  "conversation_anomaly_detected",
  "npc_suspicion_changed",
  "response_hesitation_noted",
  "free_input_submitted",
  "suspicion_shared",
  "station_report_created",
  "station_inquest_opened",
] as const;

function isConversationEventName(eventName: string): boolean {
  return CONVERSATION_EVENT_NAMES.includes(eventName as (typeof CONVERSATION_EVENT_NAMES)[number]);
}

function requiresConversationSignalTrace(eventName: string): boolean {
  return CONVERSATION_SIGNAL_TRACE_EVENT_NAMES.includes(eventName as (typeof CONVERSATION_SIGNAL_TRACE_EVENT_NAMES)[number]);
}

function hasConversationSuspicionState(fields: {
  suspicionBefore?: number;
  suspicionAfter?: number;
  suspicionDelta?: number;
  reportWeightBefore?: number;
  reportWeightAfter?: number;
  reportDelta?: number;
}): boolean {
  return (
    fields.suspicionBefore !== undefined
    || fields.suspicionAfter !== undefined
    || fields.suspicionDelta !== undefined
    || fields.reportWeightBefore !== undefined
    || fields.reportWeightAfter !== undefined
    || fields.reportDelta !== undefined
  );
}

function resolveExpectedConversationStage(eventName: string, suspicionAfter: number, reportWeightAfter: number): SocialLoopStage {
  if (eventName === "station_inquest_opened") {
    return "inquest";
  }
  if (eventName === "suspicion_shared" && reportWeightAfter >= 50 && reportWeightAfter < 70) {
    return "shared";
  }
  return resolveConversationNpcStage(suspicionAfter, reportWeightAfter);
}

function validateCompleteConversationSuspicionState(
  fields: {
    eventName: string;
    socialLoopStage?: SocialLoopStage;
    conversationStage?: SocialLoopStage;
    suspicionSignals?: readonly ConversationSuspicionSignal[];
    suspicionBefore?: number;
    suspicionAfter?: number;
    suspicionDelta?: number;
    reportWeightBefore?: number;
    reportWeightAfter?: number;
    reportDelta?: number;
    whyLineKey?: string;
  },
  failures: GodotValidationFailure[],
): void {
  if (fields.whyLineKey !== undefined && !(fields.suspicionSignals ?? []).includes(fields.whyLineKey as ConversationSuspicionSignal)) {
    pushFailure(failures, "schema_invalid_evidence_pack", "whyLineKey", "must reference one of suspicionSignals");
  }

  const stateFieldEntries = [
    ["suspicionBefore", fields.suspicionBefore],
    ["suspicionAfter", fields.suspicionAfter],
    ["suspicionDelta", fields.suspicionDelta],
    ["reportWeightBefore", fields.reportWeightBefore],
    ["reportWeightAfter", fields.reportWeightAfter],
    ["reportDelta", fields.reportDelta],
  ] as const;
  const anyStateField = stateFieldEntries.some(([, value]) => value !== undefined);
  if (!anyStateField) {
    return;
  }

  for (const [path, value] of stateFieldEntries) {
    if (value === undefined) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "conversation suspicion state must include before, after, and delta fields together");
    }
  }

  const {
    suspicionBefore,
    suspicionAfter,
    suspicionDelta,
    reportWeightBefore,
    reportWeightAfter,
    reportDelta,
  } = fields;
  if (
    suspicionBefore === undefined
    || suspicionAfter === undefined
    || suspicionDelta === undefined
    || reportWeightBefore === undefined
    || reportWeightAfter === undefined
    || reportDelta === undefined
  ) {
    return;
  }

  if (suspicionAfter < suspicionBefore) {
    pushFailure(failures, "schema_invalid_evidence_pack", "suspicionAfter", "conversation suspicion cannot decrease in one deterministic event");
  }
  if (suspicionDelta !== suspicionAfter - suspicionBefore) {
    pushFailure(failures, "schema_invalid_evidence_pack", "suspicionDelta", "must equal suspicionAfter - suspicionBefore");
  }
  if (reportWeightAfter < reportWeightBefore) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightAfter", "conversation report weight cannot decrease in one deterministic event");
  }
  if (reportDelta !== reportWeightAfter - reportWeightBefore) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reportDelta", "must equal reportWeightAfter - reportWeightBefore");
  }

  if (fields.eventName === "suspicion_shared" && reportWeightAfter < 50) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightAfter", "suspicion_shared requires report weight at least 50");
  }
  if (fields.eventName === "station_report_created" && reportWeightAfter < 70) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightAfter", "station_report_created requires report weight at least 70");
  }
  if (fields.eventName === "station_inquest_opened" && reportWeightAfter < 100) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightAfter", "station_inquest_opened requires report weight at least 100");
  }

  const expectedStage = resolveExpectedConversationStage(fields.eventName, suspicionAfter, reportWeightAfter);
  if (fields.conversationStage !== undefined && fields.conversationStage !== expectedStage) {
    pushFailure(failures, "schema_invalid_evidence_pack", "conversationStage", `must be ${expectedStage} for the conversation suspicion state`);
  }
  if (fields.socialLoopStage !== undefined && fields.conversationStage !== undefined && fields.socialLoopStage !== fields.conversationStage) {
    pushFailure(failures, "schema_invalid_evidence_pack", "socialLoopStage", "must match conversationStage for conversation evidence events");
  }
}

function isSameOrderEvent(event: GodotEvidenceEvent): boolean {
  return [event.conversationId, event.promptId, event.choiceSetId]
    .filter((value): value is string => typeof value === "string")
    .some(value => /same[-_. ]order/i.test(value));
}

function readVector3(
  value: unknown,
  failures: GodotValidationFailure[],
  path: string,
  required: boolean,
): GodotVector3 | undefined {
  if (value === undefined && !required) {
    return undefined;
  }
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_payload", path, "must be a Godot Vector3 object in meter units");
    return undefined;
  }
  const x = readNumber(value, "x", failures, path);
  const y = readNumber(value, "y", failures, path);
  const z = readNumber(value, "z", failures, path);
  if (x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { x, y, z };
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  failures: GodotValidationFailure[],
  path: string,
  reasonCode: GodotReasonCode,
): T | undefined {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    pushFailure(failures, reasonCode, path, `must be one of: ${allowed.join(", ")}`);
    return undefined;
  }
  return value as T;
}

function validateContextIds(
  envelope: Pick<GodotNpcCommandEnvelope, "sessionId" | "worldId" | "worldRevision" | "npcId" | "commandId">,
  context: GodotRuntimeContext,
  failures: GodotValidationFailure[],
): void {
  if (envelope.sessionId !== context.activeSessionId) {
    pushFailure(failures, "schema_session_mismatch", "sessionId", "must match the active runtime session");
  }
  if (envelope.worldId !== context.activeWorldId) {
    pushFailure(failures, "schema_world_mismatch", "worldId", "must match the loaded Godot world instance");
  }
  if (envelope.worldRevision !== context.worldRevision) {
    pushFailure(failures, "schema_world_revision_mismatch", "worldRevision", "must match the loaded deterministic topology revision");
  }
  if (!context.actorIds.includes(envelope.npcId)) {
    pushFailure(failures, "schema_unknown_actor", "npcId", "must reference a known actor in the active world");
  }
  if (context.inFlightActorIds?.includes(envelope.npcId)) {
    pushFailure(failures, "schema_actor_busy", "npcId", "actor already has an in-flight command");
  }
  if (context.completedCommandIds?.includes(envelope.commandId)) {
    pushFailure(failures, "schema_duplicate_command", "commandId", "commandId must not be replayed");
  }
}

function validateTargetIds(
  target: GodotActionTarget,
  context: GodotRuntimeContext,
  failures: GodotValidationFailure[],
): void {
  if (target.actorId !== undefined && !context.actorIds.includes(target.actorId)) {
    pushFailure(failures, "schema_unknown_actor", "target.actorId", "must reference a known actor");
  }
  if (target.landmarkId !== undefined && !context.landmarkIds.includes(target.landmarkId)) {
    pushFailure(failures, "schema_unknown_landmark", "target.landmarkId", "must reference a known landmark");
  }
  if (target.zoneId !== undefined && !context.zoneIds.includes(target.zoneId)) {
    pushFailure(failures, "schema_unknown_zone", "target.zoneId", "must reference a known zone");
  }
  if (target.textSurfaceId !== undefined && !context.textSurfaceIds.includes(target.textSurfaceId)) {
    pushFailure(failures, "schema_unknown_text_surface", "target.textSurfaceId", "must reference a known text surface");
  }
}

function hasAnyTarget(target: GodotActionTarget, keys: readonly (keyof GodotActionTarget)[]): boolean {
  return keys.some(key => target[key] !== undefined);
}

function validateTargetForAction(
  command: Pick<GodotNpcCommandEnvelope, "actionType" | "target" | "utterance">,
  failures: GodotValidationFailure[],
): void {
  const target = command.target;
  switch (command.actionType) {
    case "Move":
      if (!hasAnyTarget(target, ["landmarkId", "zoneId", "position"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", "Move requires landmarkId, zoneId, or position");
      }
      break;
    case "Talk":
    case "Ask":
      if (!hasAnyTarget(target, ["actorId", "textSurfaceId"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", `${command.actionType} requires actorId or textSurfaceId`);
      }
      if (typeof command.utterance !== "string" || command.utterance.trim().length === 0) {
        pushFailure(failures, "schema_invalid_action_target", "utterance", `${command.actionType} requires a non-empty utterance`);
      }
      break;
    case "Observe":
      if (!hasAnyTarget(target, ["actorId", "landmarkId", "zoneId", "textSurfaceId", "position"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", "Observe requires a concrete actor, landmark, zone, text surface, or position");
      }
      break;
    case "Work":
      if (!hasAnyTarget(target, ["landmarkId", "zoneId", "textSurfaceId"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", "Work requires landmarkId, zoneId, or textSurfaceId");
      }
      break;
    case "Report":
      if (!hasAnyTarget(target, ["actorId", "landmarkId", "textSurfaceId"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", "Report requires actorId, landmarkId, or textSurfaceId");
      }
      break;
    case "Escort":
      if (!hasAnyTarget(target, ["actorId"])) {
        pushFailure(failures, "schema_invalid_action_target", "target.actorId", "Escort requires actorId");
      }
      if (!hasAnyTarget(target, ["landmarkId", "zoneId", "position"])) {
        pushFailure(failures, "schema_invalid_action_target", "target", "Escort requires a destination");
      }
      break;
    case "Idle":
      break;
  }
}

function parseTarget(input: unknown, failures: GodotValidationFailure[]): GodotActionTarget | undefined {
  if (!isObject(input)) {
    pushFailure(failures, "schema_invalid_payload", "target", "must be an object");
    return undefined;
  }

  const target: GodotActionTarget = {};
  for (const key of ["actorId", "landmarkId", "zoneId", "textSurfaceId"] as const) {
    if (input[key] !== undefined) {
      const value = readString(input, key, failures, "target");
      if (value !== undefined) {
        target[key] = value;
      }
    }
  }
  target.position = readVector3(input.position, failures, "target.position", false);
  return target;
}

function parseCommandCandidate(input: unknown): GodotValidationResult<GodotNpcCommandEnvelope> {
  const failures: GodotValidationFailure[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      failures: [{ reasonCode: "schema_invalid_payload", path: "$", message: "NpcCommandEnvelope must be an object" }],
    };
  }

  const schemaVersion = readEnum(input.schemaVersion, [GODOT_SCHEMA_VERSION], failures, "schemaVersion", "schema_invalid_payload");
  const commandId = readString(input, "commandId", failures, "$");
  const sessionId = readString(input, "sessionId", failures, "$");
  const worldId = readString(input, "worldId", failures, "$");
  const worldRevision = readString(input, "worldRevision", failures, "$");
  const npcId = readString(input, "npcId", failures, "$");
  const issuedAtMs = readNumber(input, "issuedAtMs", failures, "$", { integer: true, min: 0 });
  const timeoutMs = readNumber(input, "timeoutMs", failures, "$", { integer: true, min: 1 });
  const actionType = readEnum(input.actionType, ACTION_TYPES, failures, "actionType", "schema_unknown_action_type");
  const target = parseTarget(input.target, failures);
  const reasonCodes = readStringArray(input, "reasonCodes", failures, "$");
  const expectedStage = readEnum(
    input.expectedStage,
    SOCIAL_LOOP_STAGES,
    failures,
    "expectedStage",
    "schema_invalid_social_loop_stage",
  );
  const source = readEnum(input.source, ["codex", "fallback", "test-fixture"] as const, failures, "source", "schema_invalid_payload");

  const command: Partial<GodotNpcCommandEnvelope> = {
    schemaVersion,
    commandId,
    sessionId,
    worldId,
    worldRevision,
    npcId,
    issuedAtMs,
    timeoutMs,
    actionType,
    target,
    reasonCodes,
    expectedStage,
    source,
  };

  if (input.utterance !== undefined) {
    command.utterance = readString(input, "utterance", failures, "$");
  }

  if (reasonCodes !== undefined && reasonCodes.length === 0) {
    pushFailure(failures, "schema_invalid_payload", "reasonCodes", "must include at least one deterministic reason code");
  }

  if (target !== undefined && actionType !== undefined) {
    validateTargetForAction({ actionType, target, utterance: command.utterance }, failures);
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return { ok: true, value: command as GodotNpcCommandEnvelope, failures: [] };
}

export function validateGodotNpcCommandEnvelope(
  input: unknown,
  context: GodotRuntimeContext,
): GodotValidationResult<GodotNpcCommandEnvelope> {
  const parsed = parseCommandCandidate(input);
  if (!parsed.ok) {
    return parsed;
  }

  const failures: GodotValidationFailure[] = [];
  validateContextIds(parsed.value, context, failures);
  validateTargetIds(parsed.value.target, context, failures);

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return parsed;
}

function parseTextSurfaces(
  value: unknown,
  failures: GodotValidationFailure[],
): GodotTextSurfaceObservation[] | undefined {
  if (!Array.isArray(value)) {
    pushFailure(failures, "schema_invalid_payload", "visibleTextSurfaces", "must be an array");
    return undefined;
  }
  const surfaces: GodotTextSurfaceObservation[] = [];
  value.forEach((item, index) => {
    if (!isObject(item)) {
      pushFailure(failures, "schema_invalid_payload", `visibleTextSurfaces[${index}]`, "must be an object");
      return;
    }
    const id = readString(item, "id", failures, `visibleTextSurfaces[${index}]`);
    const landmarkId = readString(item, "landmarkId", failures, `visibleTextSurfaces[${index}]`);
    const text = readString(item, "text", failures, `visibleTextSurfaces[${index}]`);
    const dreamLawIds = readStringArray(item, "dreamLawIds", failures, `visibleTextSurfaces[${index}]`);
    const coverTestIds = readStringArray(item, "coverTestIds", failures, `visibleTextSurfaces[${index}]`);
    if (id && landmarkId && text && dreamLawIds && coverTestIds) {
      surfaces.push({ id, landmarkId, text, dreamLawIds, coverTestIds });
    }
  });
  return surfaces;
}

function parseEvidence(value: unknown, failures: GodotValidationFailure[]): GodotEvidenceArtifact[] | undefined {
  if (!Array.isArray(value)) {
    pushFailure(failures, "schema_invalid_payload", "evidence", "must be an array");
    return undefined;
  }
  const artifacts: GodotEvidenceArtifact[] = [];
  value.forEach((item, index) => {
    if (!isObject(item)) {
      pushFailure(failures, "schema_invalid_payload", `evidence[${index}]`, "must be an object");
      return;
    }
    const id = readString(item, "id", failures, `evidence[${index}]`);
    const type = readEnum(
      item.type,
      ["complaint", "ticket", "memo", "witness_reference", "intake_dossier", "procedural_speech_log", "verdict", "why_line"] as const,
      failures,
      `evidence[${index}].type`,
      "schema_invalid_payload",
    );
    const stage = readEnum(item.stage, SOCIAL_LOOP_STAGES, failures, `evidence[${index}].stage`, "schema_invalid_social_loop_stage");
    const summary = readString(item, "summary", failures, `evidence[${index}]`);
    if (id && type && stage && summary) {
      artifacts.push({ id, type, stage, summary });
    }
  });
  return artifacts;
}

export function validateGodotObservationFrame(input: unknown): GodotValidationResult<GodotObservationFrame> {
  const failures: GodotValidationFailure[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      failures: [{ reasonCode: "schema_invalid_payload", path: "$", message: "ObservationFrame must be an object" }],
    };
  }

  const schemaVersion = readEnum(input.schemaVersion, [GODOT_SCHEMA_VERSION], failures, "schemaVersion", "schema_invalid_payload");
  const sessionId = readString(input, "sessionId", failures, "$");
  const worldId = readString(input, "worldId", failures, "$");
  const worldRevision = readString(input, "worldRevision", failures, "$");
  const frameId = readString(input, "frameId", failures, "$");
  const timestampMs = readNumber(input, "timestampMs", failures, "$", { integer: true, min: 0 });
  const deltaMs = readNumber(input, "deltaMs", failures, "$", { integer: true, min: 0 });
  const npcId = readString(input, "npcId", failures, "$");
  const playerId = readString(input, "playerId", failures, "$");
  const landmarkId = readString(input, "landmarkId", failures, "$");
  const position = readVector3(input.position, failures, "position", true);
  const velocity = readVector3(input.velocity, failures, "velocity", false);
  const nearbyActors = readStringArray(input, "nearbyActors", failures, "$");
  const visibleLandmarks = readStringArray(input, "visibleLandmarks", failures, "$");
  const visibleTextSurfaces = parseTextSurfaces(input.visibleTextSurfaces, failures);
  const recentEvents = readStringArray(input, "recentEvents", failures, "$");
  const organizationContext = readRecord(input, "organizationContext", failures, "$");
  const playerSignals = readRecord(input, "playerSignals", failures, "$");
  const socialLoopStage = readEnum(
    input.socialLoopStage,
    SOCIAL_LOOP_STAGES,
    failures,
    "socialLoopStage",
    "schema_invalid_social_loop_stage",
  );
  const exposure = readRecord(input, "exposure", failures, "$");
  const station = readRecord(input, "station", failures, "$");
  const evidence = parseEvidence(input.evidence, failures);

  let speechAct: PlayerSpeechAct | undefined;
  if (playerSignals?.speechAct !== undefined) {
    speechAct = readEnum(
      playerSignals.speechAct,
      PLAYER_SPEECH_ACTS,
      failures,
      "playerSignals.speechAct",
      "schema_invalid_player_speech_act",
    );
  }

  const exposureScore = exposure ? readNumber(exposure, "score", failures, "exposure", { min: 0 }) : undefined;
  const thresholds = exposure ? readRecord(exposure, "thresholds", failures, "exposure") : undefined;
  const stationInterest = thresholds ? readNumber(thresholds, "stationInterest", failures, "exposure.thresholds", { min: 0 }) : undefined;
  const inquest = thresholds ? readNumber(thresholds, "inquest", failures, "exposure.thresholds", { min: 0 }) : undefined;
  const verdict = thresholds ? readNumber(thresholds, "verdict", failures, "exposure.thresholds", { min: 0 }) : undefined;
  const intakeOpen = station?.intakeOpen;
  const inquestOpen = station?.inquestOpen;
  const verdictReady = station?.verdictReady;
  const sessionTerminationAllowed = station?.sessionTerminationAllowed;

  for (const [key, value] of Object.entries({ intakeOpen, inquestOpen, verdictReady, sessionTerminationAllowed })) {
    if (typeof value !== "boolean") {
      pushFailure(failures, "schema_invalid_payload", `station.${key}`, "must be boolean");
    }
  }

  if (socialLoopStage === "intake" && visibleTextSurfaces?.length === 0) {
    pushFailure(failures, "schema_observation_incompatible", "visibleTextSurfaces", "intake frames must expose at least one text pressure surface");
  }
  if (socialLoopStage === "verdict" && !evidence?.some(item => item.type === "verdict" || item.type === "why_line")) {
    pushFailure(failures, "schema_invalid_end_state", "evidence", "verdict frames require verdict or why_line evidence");
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  const frame: GodotObservationFrame = {
    schemaVersion: schemaVersion as typeof GODOT_SCHEMA_VERSION,
    sessionId: sessionId as string,
    worldId: worldId as string,
    worldRevision: worldRevision as string,
    frameId: frameId as string,
    timestampMs: timestampMs as number,
    deltaMs: deltaMs as number,
    npcId: npcId as string,
    playerId: playerId as string,
    landmarkId: landmarkId as string,
    position: position as GodotVector3,
    velocity,
    nearbyActors: nearbyActors as string[],
    visibleLandmarks: visibleLandmarks as string[],
    visibleTextSurfaces: visibleTextSurfaces as GodotTextSurfaceObservation[],
    recentEvents: recentEvents as string[],
    organizationContext: organizationContext as Record<string, unknown>,
    playerSignals: {
      speechAct,
      rawText: typeof playerSignals?.rawText === "string" ? playerSignals.rawText : undefined,
      exposureDelta: typeof playerSignals?.exposureDelta === "number" ? playerSignals.exposureDelta : undefined,
    },
    socialLoopStage: socialLoopStage as SocialLoopStage,
    exposure: {
      score: exposureScore as number,
      thresholds: {
        stationInterest: stationInterest as number,
        inquest: inquest as number,
        verdict: verdict as number,
      },
    },
    station: {
      intakeOpen: intakeOpen as boolean,
      inquestOpen: inquestOpen as boolean,
      verdictReady: verdictReady as boolean,
      sessionTerminationAllowed: sessionTerminationAllowed as boolean,
    },
    evidence: evidence as GodotEvidenceArtifact[],
  };

  if (typeof input.zoneId === "string" && input.zoneId.trim().length > 0) {
    frame.zoneId = input.zoneId;
  }

  return { ok: true, value: frame, failures: [] };
}

export function validateGodotEvidenceEvent(input: unknown): GodotValidationResult<GodotEvidenceEvent> {
  const failures: GodotValidationFailure[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      failures: [{ reasonCode: "schema_invalid_evidence_pack", path: "$", message: "GodotEvidenceEvent must be an object" }],
    };
  }

  const schemaVersion = readEnum(input.schemaVersion, [GODOT_SCHEMA_VERSION], failures, "schemaVersion", "schema_invalid_payload");
  const eventId = readString(input, "eventId", failures, "$");
  const eventName = readString(input, "eventName", failures, "$");
  const eventFamily = readEnum(
    input.eventFamily,
    ["session", "observation", "ai", "command", "fallback", "domain", "evidence_export"] as const,
    failures,
    "eventFamily",
    "schema_invalid_evidence_pack",
  );
  const adapter = readEnum(input.adapter, ["godot"] as const, failures, "adapter", "schema_invalid_evidence_pack");
  const sessionId = readString(input, "sessionId", failures, "$");
  const worldId = readString(input, "worldId", failures, "$");
  const worldRevision = readString(input, "worldRevision", failures, "$");
  const timestampMs = readNumber(input, "timestampMs", failures, "$", { integer: true, min: 0 });
  const summary = readString(input, "summary", failures, "$");
  const socialLoopStage =
    input.socialLoopStage === undefined
      ? undefined
      : readEnum(input.socialLoopStage, SOCIAL_LOOP_STAGES, failures, "socialLoopStage", "schema_invalid_social_loop_stage");
  const reasonCategory =
    input.reasonCategory === undefined
      ? undefined
      : readEnum(
          input.reasonCategory,
          ["none", "policy", "schema", "timeout", "cancelled", "parse", "tool", "runtime", "unknown"] as const,
          failures,
          "reasonCategory",
          "schema_invalid_payload",
        );
  const warningTier =
    input.warningTier === undefined
      ? undefined
      : readEnum(input.warningTier, ["blocking", "attention", "reference"] as const, failures, "warningTier", "schema_invalid_payload");
  const transport =
    input.transport === undefined
      ? undefined
      : readEnum(input.transport, ["codex", "codex-reply", "fallback"] as const, failures, "transport", "schema_invalid_payload");
  const usedFallback = readOptionalBoolean(input, "usedFallback", failures, "$");
  const reasonCode = readOptionalString(input, "reasonCode", failures, "$");
  const actorId = readOptionalString(input, "actorId", failures, "$");
  const commandId = readOptionalString(input, "commandId", failures, "$");
  const threadId = readOptionalString(input, "threadId", failures, "$");
  const artifactPath = readOptionalString(input, "artifactPath", failures, "$");
  const conversationId = readOptionalString(input, "conversationId", failures, "$");
  const turnId = readOptionalString(input, "turnId", failures, "$");
  const promptId = readOptionalString(input, "promptId", failures, "$");
  const choiceSetId = readOptionalString(input, "choiceSetId", failures, "$");
  const speakerId = readOptionalString(input, "speakerId", failures, "$");
  const selectedChoiceId = readOptionalString(input, "selectedChoiceId", failures, "$");
  const freeInputHash = readOptionalString(input, "freeInputHash", failures, "$");
  const displayedPlayerLine = readOptionalString(input, "displayedPlayerLine", failures, "$");
  const priorTurnIds = readOptionalStringArray(input, "priorTurnIds", failures, "$");
  const suspicionSignals = readOptionalStringArray(input, "suspicionSignals", failures, "$");
  const conversationScoreBounds = { min: 0, max: CONVERSATION_SUSPICION_MAX_SCORE };
  const suspicionBefore = readOptionalNumber(input, "suspicionBefore", failures, "$", conversationScoreBounds);
  const suspicionAfter = readOptionalNumber(input, "suspicionAfter", failures, "$", conversationScoreBounds);
  const suspicionDelta = readOptionalNumber(input, "suspicionDelta", failures, "$", conversationScoreBounds);
  const reportWeightBefore = readOptionalNumber(input, "reportWeightBefore", failures, "$", conversationScoreBounds);
  const reportWeightAfter = readOptionalNumber(input, "reportWeightAfter", failures, "$", conversationScoreBounds);
  const reportDelta = readOptionalNumber(input, "reportDelta", failures, "$", conversationScoreBounds);
  const whyLine = readOptionalString(input, "whyLine", failures, "$");
  const whyLineKey = readOptionalString(input, "whyLineKey", failures, "$");
  const conversationStage =
    input.conversationStage === undefined
      ? undefined
      : readEnum(input.conversationStage, SOCIAL_LOOP_STAGES, failures, "conversationStage", "schema_invalid_social_loop_stage");
  const outcome = readOptionalString(input, "outcome", failures, "$");

  for (const signal of suspicionSignals ?? []) {
    if (!CONVERSATION_SUSPICION_SIGNALS.includes(signal as ConversationSuspicionSignal)) {
      pushFailure(failures, "schema_invalid_evidence_pack", "suspicionSignals", `unsupported conversation signal: ${signal}`);
    }
  }

  if ((eventFamily === "fallback" || usedFallback === true) && (reasonCode === undefined || reasonCategory === undefined)) {
    pushFailure(failures, "schema_invalid_evidence_pack", "reasonCode", "fallback events require reasonCode and reasonCategory");
  }
  if (eventFamily === "ai" && (transport === undefined || usedFallback === undefined)) {
    pushFailure(failures, "schema_invalid_evidence_pack", "transport", "AI/LLM events require transport and usedFallback");
  }
  if (eventFamily === "command" && (actorId === undefined || commandId === undefined)) {
    pushFailure(failures, "schema_invalid_evidence_pack", "commandId", "command events require actorId and commandId");
  }
  if (eventFamily === "domain" && socialLoopStage === undefined) {
    pushFailure(failures, "schema_invalid_evidence_pack", "socialLoopStage", "domain events require socialLoopStage");
  }
  if (isConversationEventName(String(input.eventName))) {
    if (conversationId === undefined || turnId === undefined || promptId === undefined) {
      pushFailure(failures, "schema_invalid_evidence_pack", "conversationId", "conversation events require conversationId, turnId, and promptId");
    }
    if (
      ["dialogue_choice_selected", "free_input_submitted", "response_hesitation_noted", "conversation_anomaly_detected", "npc_suspicion_changed"].includes(String(input.eventName))
      && displayedPlayerLine === undefined
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "displayedPlayerLine", "turn-level conversation events require displayedPlayerLine");
    }
    if (String(input.eventName) === "dialogue_choice_selected" && selectedChoiceId === undefined) {
      pushFailure(failures, "schema_invalid_evidence_pack", "selectedChoiceId", "dialogue_choice_selected requires selectedChoiceId");
    }
    if (String(input.eventName) === "free_input_submitted" && freeInputHash === undefined) {
      pushFailure(failures, "schema_invalid_evidence_pack", "freeInputHash", "free_input_submitted requires freeInputHash");
    }
    if (
      requiresConversationSignalTrace(String(input.eventName))
      && (suspicionSignals === undefined || suspicionSignals.length === 0)
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "suspicionSignals", `${String(input.eventName)} requires deterministic suspicionSignals`);
    }
    if (
      ["response_hesitation_noted", "conversation_anomaly_detected", "npc_suspicion_changed", "suspicion_shared", "station_report_created", "station_inquest_opened"].includes(String(input.eventName))
      && whyLine === undefined
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "whyLine", `${String(input.eventName)} requires a deterministic whyLine`);
    }
    if (
      requiresConversationSignalTrace(String(input.eventName))
      && !hasConversationSuspicionState({
        suspicionBefore,
        suspicionAfter,
        suspicionDelta,
        reportWeightBefore,
        reportWeightAfter,
        reportDelta,
      })
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "suspicionBefore", `${String(input.eventName)} requires deterministic suspicion/report state`);
    }
    validateCompleteConversationSuspicionState(
      {
        eventName: String(input.eventName),
        socialLoopStage,
        conversationStage,
        suspicionSignals: suspicionSignals as ConversationSuspicionSignal[] | undefined,
        suspicionBefore,
        suspicionAfter,
        suspicionDelta,
        reportWeightBefore,
        reportWeightAfter,
        reportDelta,
        whyLineKey,
      },
      failures,
    );
    if (String(input.eventName) === "conversation_started" && conversationStage !== undefined && conversationStage !== "normal") {
      pushFailure(failures, "schema_invalid_evidence_pack", "conversationStage", "conversation_started must begin in normal stage");
    }
    if (socialLoopStage !== undefined && conversationStage !== undefined && socialLoopStage !== conversationStage) {
      pushFailure(failures, "schema_invalid_evidence_pack", "socialLoopStage", "must match conversationStage for conversation evidence events");
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return {
    ok: true,
    value: {
      schemaVersion: schemaVersion as typeof GODOT_SCHEMA_VERSION,
      eventId: eventId as string,
      eventName: eventName as string,
      eventFamily: eventFamily as GodotEvidenceEventFamily,
      adapter: adapter as "godot",
      sessionId: sessionId as string,
      worldId: worldId as string,
      worldRevision: worldRevision as string,
      timestampMs: timestampMs as number,
      socialLoopStage,
      actorId,
      commandId,
      reasonCode,
      reasonCategory,
      warningTier,
      transport,
      threadId,
      usedFallback,
      artifactPath,
      conversationId,
      turnId,
      promptId,
      choiceSetId,
      speakerId,
      selectedChoiceId,
      freeInputHash,
      displayedPlayerLine,
      priorTurnIds,
      suspicionSignals: suspicionSignals as ConversationSuspicionSignal[] | undefined,
      suspicionBefore,
      suspicionAfter,
      suspicionDelta,
      reportWeightBefore,
      reportWeightAfter,
      reportDelta,
      whyLine,
      whyLineKey,
      conversationStage,
      outcome,
      summary: summary as string,
    },
    failures: [],
  };
}

export function validateGodotEvidencePack(input: unknown): GodotValidationResult<GodotEvidencePack> {
  const failures: GodotValidationFailure[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      failures: [{ reasonCode: "schema_invalid_evidence_pack", path: "$", message: "GodotEvidencePack must be an object" }],
    };
  }

  const schemaVersion = readEnum(input.schemaVersion, [GODOT_SCHEMA_VERSION], failures, "schemaVersion", "schema_invalid_payload");
  const runId = readString(input, "runId", failures, "$");
  const adapter = readEnum(input.adapter, ["godot"] as const, failures, "adapter", "schema_invalid_evidence_pack");
  const sessionId = readString(input, "sessionId", failures, "$");
  const worldId = readString(input, "worldId", failures, "$");
  const worldRevision = readString(input, "worldRevision", failures, "$");
  const createdAtMs = readNumber(input, "createdAtMs", failures, "$", { integer: true, min: 0 });
  const rawEvents = Array.isArray(input.events) ? input.events : undefined;
  if (!rawEvents) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "must be an array");
  }
  const summaries = readRecord(input, "summaries", failures, "$");

  const events: GodotEvidenceEvent[] = [];
  rawEvents?.forEach((event, index) => {
    const result = validateGodotEvidenceEvent(event);
    if (result.ok) {
      events.push(result.value);
      return;
    }
    for (const failure of result.failures) {
      failures.push({ ...failure, path: `events[${index}].${failure.path}` });
    }
  });

  const runSignature = summaries ? readString(summaries, "runSignature", failures, "summaries") : undefined;
  const actorSignatures = summaries ? readStringRecord(summaries.actorSignatures, failures, "summaries.actorSignatures") : undefined;
  const fallbackCounters = summaries ? readNumberRecord(summaries.fallbackCounters, failures, "summaries.fallbackCounters") : undefined;
  const commandOutcomeCounts = summaries ? readNumberRecord(summaries.commandOutcomeCounts, failures, "summaries.commandOutcomeCounts") : undefined;
  const domainTriggerCounts = summaries ? readNumberRecord(summaries.domainTriggerCounts, failures, "summaries.domainTriggerCounts") : undefined;
  const verdictEndStateTrace = summaries ? readString(summaries, "verdictEndStateTrace", failures, "summaries") : undefined;
  const blockedChecks = summaries ? readStringArray(summaries, "blockedChecks", failures, "summaries") : undefined;

  if (events.length === 0) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "must include at least one evidence event");
  }
  if (!events.some(event => event.eventFamily === "domain")) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "must include at least one domain event");
  }
  if (!events.some(event => event.eventFamily === "evidence_export")) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "must include an evidence_export event");
  }

  for (const [index, event] of events.entries()) {
    if (event.sessionId !== sessionId) {
      pushFailure(failures, "schema_invalid_evidence_pack", `events[${index}].sessionId`, "must match pack sessionId");
    }
    if (event.worldId !== worldId || event.worldRevision !== worldRevision) {
      pushFailure(failures, "schema_invalid_evidence_pack", `events[${index}].worldId`, "must match pack world identity");
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return {
    ok: true,
    value: {
      schemaVersion: schemaVersion as typeof GODOT_SCHEMA_VERSION,
      runId: runId as string,
      adapter: adapter as "godot",
      sessionId: sessionId as string,
      worldId: worldId as string,
      worldRevision: worldRevision as string,
      createdAtMs: createdAtMs as number,
      events,
      summaries: {
        runSignature: runSignature as string,
        actorSignatures: actorSignatures as Record<string, string>,
        fallbackCounters: fallbackCounters as Record<string, number>,
        commandOutcomeCounts: commandOutcomeCounts as Record<string, number>,
        domainTriggerCounts: domainTriggerCounts as Record<string, number>,
        verdictEndStateTrace: verdictEndStateTrace as string,
        blockedChecks: blockedChecks as string[],
      },
    },
    failures: [],
  };
}

export function validateGodotEvidencePackConversationSuspicionProof(
  input: unknown,
): GodotValidationResult<GodotConversationSuspicionProofReport> {
  const parsed = validateGodotEvidencePack(input);
  if (!parsed.ok) {
    return { ok: false, failures: parsed.failures };
  }

  const failures: GodotValidationFailure[] = [];
  const pack = parsed.value;
  const sameOrderEvents = pack.events
    .map((event, index) => ({ event, index }))
    .filter(item => isConversationEventName(item.event.eventName) && isSameOrderEvent(item.event));

  if (sameOrderEvents.length === 0) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "must include Same Order conversation evidence events");
  }

  const sameOrderConversationIds = new Set(sameOrderEvents.map(item => item.event.conversationId).filter((value): value is string => value !== undefined));
  if (sameOrderConversationIds.size !== 1) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "Same Order conversation events must share one conversationId");
  }

  const chain: Array<{ event: GodotEvidenceEvent; index: number }> = [];
  let cursor = -1;
  for (const eventName of SAME_ORDER_PROOF_EVENT_NAMES) {
    const index = pack.events.findIndex((event, eventIndex) =>
      eventIndex > cursor
      && event.eventName === eventName
      && event.conversationId !== undefined
      && isSameOrderEvent(event),
    );
    if (index < 0) {
      pushFailure(failures, "schema_invalid_evidence_pack", "events", `Same Order proof chain is missing ordered event ${eventName}`);
      continue;
    }
    const event = pack.events[index];
    if (event !== undefined) {
      chain.push({ event, index });
      cursor = index;
    }
  }

  const chainConversationIds = new Set(chain.map(item => item.event.conversationId).filter((value): value is string => value !== undefined));
  if (chain.length === SAME_ORDER_PROOF_EVENT_NAMES.length && chainConversationIds.size !== 1) {
    pushFailure(failures, "schema_invalid_evidence_pack", "events", "Same Order proof chain must use one conversationId");
  }

  for (const item of chain) {
    if (
      item.event.eventName !== "conversation_started"
      && (
        item.event.suspicionBefore === undefined
        || item.event.suspicionAfter === undefined
        || item.event.suspicionDelta === undefined
        || item.event.reportWeightBefore === undefined
        || item.event.reportWeightAfter === undefined
        || item.event.reportDelta === undefined
        || item.event.conversationStage === undefined
      )
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", `events[${item.index}]`, "Same Order proof events must include deterministic suspicion/report state");
    }
  }

  const selectedChoice = chain.find(item => item.event.eventName === "dialogue_choice_selected")?.event;
  const responseHesitation = chain.find(item => item.event.eventName === "response_hesitation_noted")?.event;
  const freeInput = chain.find(item => item.event.eventName === "free_input_submitted")?.event;
  if (selectedChoice !== undefined && freeInput !== undefined) {
    const freeInputPredecessor = responseHesitation ?? selectedChoice;
    if (selectedChoice.turnId === freeInput.turnId) {
      pushFailure(failures, "schema_invalid_evidence_pack", "events", "Same Order proof must include a later free-input turn after the selected choice");
    }
    if (selectedChoice.turnId !== undefined && !(freeInput.priorTurnIds ?? []).includes(selectedChoice.turnId)) {
      pushFailure(failures, "schema_invalid_evidence_pack", "priorTurnIds", "free-input proof turn must reference the selected-choice turn");
    }
    if (
      freeInputPredecessor.suspicionAfter !== undefined
      && freeInput.suspicionBefore !== undefined
      && freeInputPredecessor.suspicionAfter !== freeInput.suspicionBefore
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "suspicionBefore", "free-input turn must continue from the latest prior suspicion state");
    }
    if (
      freeInputPredecessor.reportWeightAfter !== undefined
      && freeInput.reportWeightBefore !== undefined
      && freeInputPredecessor.reportWeightAfter !== freeInput.reportWeightBefore
    ) {
      pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightBefore", "free-input turn must continue from the latest prior report state");
    }
  }

  const finalInquest = chain.find(item => item.event.eventName === "station_inquest_opened")?.event;
  if (finalInquest !== undefined) {
    if (finalInquest.conversationStage !== "inquest" || finalInquest.socialLoopStage !== "inquest") {
      pushFailure(failures, "schema_invalid_evidence_pack", "conversationStage", "Same Order proof must end with an inquest conversation state");
    }
    if (finalInquest.reportWeightAfter === undefined || finalInquest.reportWeightAfter < 100) {
      pushFailure(failures, "schema_invalid_evidence_pack", "reportWeightAfter", "Same Order proof must end over the inquest report threshold");
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  const conversationId = chain[0]?.event.conversationId as string;
  const turnIds = [...new Set(chain.map(item => item.event.turnId).filter((value): value is string => value !== undefined))];
  return {
    ok: true,
    value: {
      runId: pack.runId,
      conversationId,
      chainEventNames: chain.map(item => item.event.eventName),
      turnIds,
      finalConversationStage: finalInquest?.conversationStage as SocialLoopStage,
      finalSuspicion: finalInquest?.suspicionAfter as number,
      finalReportWeight: finalInquest?.reportWeightAfter as number,
    },
    failures: [],
  };
}

function routeProofHasEvent(proof: GodotSameOrderRouteProof, eventName: string): boolean {
  return proof.events.some(event => event.eventName === eventName);
}

function routeProofHasSignal(proof: GodotSameOrderRouteProof, signal: string): boolean {
  return proof.signals.includes(signal);
}

function parseSameOrderRouteProofEvent(
  value: unknown,
  index: number,
  path: string,
  failures: GodotValidationFailure[],
): GodotSameOrderRouteProofEvent | undefined {
  const eventPath = `${path}[${index}]`;
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_evidence_pack", eventPath, "Same Order route proof event must be an object");
    return undefined;
  }

  const eventId = readString(value, "eventId", failures, eventPath);
  const eventName = readString(value, "eventName", failures, eventPath);
  const conversationStage = value.conversationStage === undefined
    ? undefined
    : readEnum(value.conversationStage, SOCIAL_LOOP_STAGES, failures, `${eventPath}.conversationStage`, "schema_invalid_social_loop_stage");
  const socialLoopStage = value.socialLoopStage === undefined
    ? undefined
    : readEnum(value.socialLoopStage, SOCIAL_LOOP_STAGES, failures, `${eventPath}.socialLoopStage`, "schema_invalid_social_loop_stage");
  const suspicionAfter = readOptionalNumber(value, "suspicionAfter", failures, eventPath, {
    integer: true,
    min: 0,
    max: CONVERSATION_SUSPICION_MAX_SCORE,
  });
  const reportWeightAfter = readOptionalNumber(value, "reportWeightAfter", failures, eventPath, {
    integer: true,
    min: 0,
    max: CONVERSATION_SUSPICION_MAX_SCORE,
  });
  const suspicionSignals = readOptionalStringArray(value, "suspicionSignals", failures, eventPath);
  const outcome = readOptionalString(value, "outcome", failures, eventPath);
  const routeOutcome = readOptionalString(value, "routeOutcome", failures, eventPath);

  if (eventId === undefined || eventName === undefined) {
    return undefined;
  }

  return {
    eventId,
    eventName,
    conversationStage,
    socialLoopStage,
    suspicionAfter,
    reportWeightAfter,
    suspicionSignals,
    outcome,
    routeOutcome,
  };
}

function parseSameOrderRouteProof(
  value: unknown,
  index: number,
  failures: GodotValidationFailure[],
): GodotSameOrderRouteProof | undefined {
  const path = `playability.routeProofs[${index}]`;
  if (!isObject(value)) {
    pushFailure(failures, "schema_invalid_evidence_pack", path, "Same Order route proof must be an object");
    return undefined;
  }

  const routeId = readString(value, "routeId", failures, path);
  const sessionOutcome = readString(value, "sessionOutcome", failures, path);
  const routeOutcome = readString(value, "routeOutcome", failures, path);
  const stage = readEnum(value.stage, SOCIAL_LOOP_STAGES, failures, `${path}.stage`, "schema_invalid_social_loop_stage");
  const suspicion = readNumber(value, "suspicion", failures, path, { integer: true, min: 0, max: CONVERSATION_SUSPICION_MAX_SCORE });
  const reportWeight = readNumber(value, "reportWeight", failures, path, { integer: true, min: 0, max: CONVERSATION_SUSPICION_MAX_SCORE });
  const eventNames = readStringArray(value, "eventNames", failures, path);
  const signals = readStringArray(value, "signals", failures, path);
  const eventPath = routeId === undefined ? `${path}.events` : `playability.routeProofs.${routeId}.events`;
  const rawEvents = value.events;
  const events: GodotSameOrderRouteProofEvent[] = [];
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    pushFailure(failures, "schema_invalid_evidence_pack", eventPath, "must include canonical Same Order route events");
  } else {
    rawEvents.forEach((event, eventIndex) => {
      const parsedEvent = parseSameOrderRouteProofEvent(event, eventIndex, eventPath, failures);
      if (parsedEvent !== undefined) {
        events.push(parsedEvent);
      }
    });
  }

  if (
    routeId === undefined
    || sessionOutcome === undefined
    || routeOutcome === undefined
    || stage === undefined
    || suspicion === undefined
    || reportWeight === undefined
    || eventNames === undefined
    || signals === undefined
    || events.length === 0
  ) {
    return undefined;
  }

  return {
    routeId,
    sessionOutcome,
    routeOutcome,
    stage,
    suspicion,
    reportWeight,
    eventNames,
    signals,
    events,
  };
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every(value => rightSet.has(value));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function findLastRouteEventValue<T>(
  events: readonly GodotSameOrderRouteProofEvent[],
  readValue: (event: GodotSameOrderRouteProofEvent) => T | undefined,
): T | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = readValue(events[index] as GodotSameOrderRouteProofEvent);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function validateSameOrderRouteProofEventEvidence(
  proof: GodotSameOrderRouteProof,
  failures: GodotValidationFailure[],
): void {
  const path = `playability.routeProofs.${proof.routeId}`;
  const canonicalEventNames = proof.events.map(event => event.eventName);
  if (!sameOrderedStrings(proof.eventNames, canonicalEventNames)) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.eventNames`, "must exactly match canonical route event names");
  }

  const eventIds = proof.events.map(event => event.eventId);
  if (uniqueStrings(eventIds).length !== eventIds.length) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.events`, "canonical route eventIds must be unique");
  }

  const canonicalSignals = uniqueStrings(proof.events.flatMap(event => event.suspicionSignals ?? []));
  if (!sameStringSet(proof.signals, canonicalSignals)) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.signals`, "must match canonical route event suspicion signals");
  }

  const finalStage = findLastRouteEventValue(proof.events, event => event.conversationStage ?? event.socialLoopStage);
  if (finalStage === undefined) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.events`, "canonical route events must include final stage");
  } else if (proof.stage !== finalStage) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.stage`, "must match canonical route event final stage");
  }

  const finalSuspicion = findLastRouteEventValue(proof.events, event => event.suspicionAfter);
  if (finalSuspicion === undefined) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.events`, "canonical route events must include final suspicion");
  } else if (proof.suspicion !== finalSuspicion) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.suspicion`, "must match canonical route event final suspicion");
  }

  const finalReportWeight = findLastRouteEventValue(proof.events, event => event.reportWeightAfter);
  if (finalReportWeight === undefined) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.events`, "canonical route events must include final report weight");
  } else if (proof.reportWeight !== finalReportWeight) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.reportWeight`, "must match canonical route event final report weight");
  }

  const finalOutcome = findLastRouteEventValue(proof.events, event => event.routeOutcome ?? event.outcome);
  if (finalOutcome === undefined) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.events`, "canonical route events must include final route outcome");
  } else if (proof.routeOutcome !== finalOutcome) {
    pushFailure(failures, "schema_invalid_evidence_pack", `${path}.routeOutcome`, "must match canonical route event final outcome");
  }
}

function validateSameOrderRouteProofSemantics(
  proof: GodotSameOrderRouteProof,
  failures: GodotValidationFailure[],
): void {
  const path = `playability.routeProofs.${proof.routeId}`;
  if (!routeProofHasEvent(proof, "conversation_started") || !routeProofHasEvent(proof, "dialogue_choice_selected")) {
    pushFailure(failures, "schema_invalid_evidence_pack", path, "route proof must include started conversation and selected dialogue");
  }

  if (proof.routeId === "clean_cover") {
    if (proof.sessionOutcome !== "cover_held" || proof.routeOutcome !== "clean_cover" || proof.stage !== "normal") {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "clean cover must end as normal cover_held/clean_cover");
    }
    if (proof.suspicion !== 0 || proof.reportWeight !== 0 || proof.signals.length !== 0) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "clean cover must preserve zero suspicion/report and no anomaly signals");
    }
    for (const forbiddenEvent of ["conversation_anomaly_detected", "station_report_created", "station_inquest_opened"]) {
      if (routeProofHasEvent(proof, forbiddenEvent)) {
        pushFailure(failures, "schema_invalid_evidence_pack", path, `clean cover must not include ${forbiddenEvent}`);
      }
    }
    return;
  }

  if (proof.routeId === "repair_recovered") {
    if (proof.sessionOutcome !== "cover_held" || proof.routeOutcome !== "repair_recovered" || proof.stage !== "uneasy") {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "repair route must end as uneasy cover_held/repair_recovered");
    }
    if (proof.suspicion <= 0 || proof.reportWeight >= 50 || !routeProofHasSignal(proof, "memory_gap_admission")) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "repair route must keep a bounded memory-gap record below share threshold");
    }
    for (const forbiddenEvent of ["station_report_created", "station_inquest_opened"]) {
      if (routeProofHasEvent(proof, forbiddenEvent)) {
        pushFailure(failures, "schema_invalid_evidence_pack", path, `repair route must not include ${forbiddenEvent}`);
      }
    }
    return;
  }

  if (proof.routeId === "soft_report") {
    if (proof.sessionOutcome !== "soft_report" || proof.routeOutcome !== "soft_report" || proof.stage !== "reported") {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "soft report must end as reported soft_report");
    }
    if (proof.reportWeight < 70 || proof.reportWeight >= 100) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "soft report must cross report threshold without crossing inquest threshold");
    }
    for (const requiredEvent of ["conversation_anomaly_detected", "suspicion_shared", "station_report_created"]) {
      if (!routeProofHasEvent(proof, requiredEvent)) {
        pushFailure(failures, "schema_invalid_evidence_pack", path, `soft report must include ${requiredEvent}`);
      }
    }
    if (routeProofHasEvent(proof, "station_inquest_opened")) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "soft report must not include station_inquest_opened");
    }
    return;
  }

  if (proof.routeId === "inquest_opened") {
    if (proof.sessionOutcome !== "inquest_opened" || proof.routeOutcome !== "inquest_opened" || proof.stage !== "inquest") {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "inquest route must end as inquest_opened");
    }
    if (proof.reportWeight < 100) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "inquest route must cross the inquest report threshold");
    }
    for (const requiredEvent of ["free_input_submitted", "response_hesitation_noted", "conversation_anomaly_detected", "suspicion_shared", "station_report_created", "station_inquest_opened"]) {
      if (!routeProofHasEvent(proof, requiredEvent)) {
        pushFailure(failures, "schema_invalid_evidence_pack", path, `inquest route must include ${requiredEvent}`);
      }
    }
    if (!routeProofHasSignal(proof, "dream_language_leak")) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "inquest route must include dream_language_leak");
    }
    if (!routeProofHasSignal(proof, "response_hesitation")) {
      pushFailure(failures, "schema_invalid_evidence_pack", path, "inquest route must include response_hesitation");
    }
  }
}

export function validateGodotEvidencePackSameOrderRouteProofs(
  input: unknown,
): GodotValidationResult<GodotSameOrderRouteProofsReport> {
  const parsed = validateGodotEvidencePack(input);
  if (!parsed.ok) {
    return { ok: false, failures: parsed.failures };
  }
  const failures: GodotValidationFailure[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      failures: [{ reasonCode: "schema_invalid_evidence_pack", path: "$", message: "GodotEvidencePack must be an object" }],
    };
  }

  const playability = readRecord(input, "playability", failures, "$");
  const rawRouteProofs = playability?.routeProofs;
  if (!Array.isArray(rawRouteProofs)) {
    pushFailure(failures, "schema_invalid_evidence_pack", "playability.routeProofs", "must include Same Order route proofs");
  }

  const proofs: GodotSameOrderRouteProof[] = [];
  if (Array.isArray(rawRouteProofs)) {
    rawRouteProofs.forEach((proof, index) => {
      const parsedProof = parseSameOrderRouteProof(proof, index, failures);
      if (parsedProof !== undefined) {
        proofs.push(parsedProof);
      }
    });
  }

  const requiredRouteIds = ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"];
  const routeIds = new Set(proofs.map(proof => proof.routeId));
  for (const proof of proofs) {
    if (!requiredRouteIds.includes(proof.routeId)) {
      pushFailure(failures, "schema_invalid_evidence_pack", `playability.routeProofs.${proof.routeId}`, `unknown Same Order route proof: ${proof.routeId}`);
    }
  }
  for (const routeId of requiredRouteIds) {
    if (!routeIds.has(routeId)) {
      pushFailure(failures, "schema_invalid_evidence_pack", "playability.routeProofs", `missing Same Order route proof: ${routeId}`);
    }
  }
  if (routeIds.size !== proofs.length) {
    pushFailure(failures, "schema_invalid_evidence_pack", "playability.routeProofs", "route proofs must have unique routeIds");
  }

  for (const proof of proofs) {
    validateSameOrderRouteProofEventEvidence(proof, failures);
    validateSameOrderRouteProofSemantics(proof, failures);
  }

  const routeOutcomes = new Set(proofs.map(proof => proof.routeOutcome));
  const sessionOutcomes = new Set(proofs.map(proof => proof.sessionOutcome));
  if (routeOutcomes.size < 4 || sessionOutcomes.size < 3) {
    pushFailure(failures, "schema_invalid_evidence_pack", "playability.routeProofs", "Same Order proof must show four route outcomes and three session outcomes");
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return {
    ok: true,
    value: {
      runId: parsed.value.runId,
      routeIds: [...routeIds].sort((left, right) => left.localeCompare(right)),
      sessionOutcomes: [...sessionOutcomes].sort((left, right) => left.localeCompare(right)),
      routeOutcomes: [...routeOutcomes].sort((left, right) => left.localeCompare(right)),
      proofs,
    },
    failures: [],
  };
}

export function validateGodotEvidencePackTrajectoryDiversity(
  inputs: readonly unknown[],
  options: GodotEvidencePackTrajectoryDiversityOptions = {},
): GodotValidationResult<GodotEvidencePackTrajectoryDiversityReport> {
  const requiredRuns = normalizePositiveInteger(options.requiredRuns, 3);
  const minDistinctTrajectories = normalizePositiveInteger(options.minDistinctTrajectories, requiredRuns);
  const failures: GodotValidationFailure[] = [];

  if (inputs.length < requiredRuns) {
    pushFailure(
      failures,
      "schema_invalid_evidence_pack",
      "packs",
      `must include at least ${requiredRuns} Evidence Packs for trajectory diversity verification`,
    );
  }

  const packs: GodotEvidencePack[] = [];
  inputs.forEach((input, index) => {
    const result = validateGodotEvidencePack(input);
    if (result.ok) {
      packs.push(result.value);
      return;
    }
    for (const failure of result.failures) {
      failures.push({ ...failure, path: `packs[${index}].${failure.path}` });
    }
  });

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  const runs = packs.map((pack, index) => {
    const signature = buildEvidencePackBehaviorSignature(pack);
    return {
      index,
      runId: pack.runId,
      sessionId: pack.sessionId,
      eventCount: pack.events.length,
      socialEventCount: signature.socialEventCount,
      behaviorSignature: signature.behaviorSignature,
    };
  });
  const distinctTrajectories = new Set(runs.map(run => run.behaviorSignature)).size;
  const pass = distinctTrajectories >= minDistinctTrajectories;

  if (!pass) {
    pushFailure(
      failures,
      "schema_invalid_evidence_pack",
      "packs",
      `must include at least ${minDistinctTrajectories} behaviorally distinct social trajectories; got ${distinctTrajectories}`,
    );
    return { ok: false, failures };
  }

  return {
    ok: true,
    value: {
      requiredRuns,
      minDistinctTrajectories,
      runCount: runs.length,
      distinctTrajectories,
      pass,
      runs,
    },
    failures: [],
  };
}
