import {
  ACTION_TYPES,
  PLAYER_SPEECH_ACTS,
  SOCIAL_LOOP_STAGES,
  type ActionType,
  type PlayerSpeechAct,
  type SocialLoopStage,
} from "../contracts/types.js";

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
  options: { integer?: boolean; min?: number } = {},
): number | undefined {
  const value = obj[key];
  const invalidNumber = typeof value !== "number" || !Number.isFinite(value);
  const invalidInteger = options.integer === true && !Number.isInteger(value);
  const invalidMin = typeof options.min === "number" && typeof value === "number" && value < options.min;
  if (invalidNumber || invalidInteger || invalidMin) {
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
