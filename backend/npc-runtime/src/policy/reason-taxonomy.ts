import type { DecisionEnvelope } from "../contracts/types.js";

export type ReasonCategory =
  | "none"
  | "policy"
  | "schema"
  | "timeout"
  | "cancelled"
  | "parse"
  | "tool"
  | "runtime"
  | "unknown";

export type WarningTier = "blocking" | "attention" | "reference";

export const FALLBACK_REASON_CODES = {
  policyRejectNonCodexPath: "policy_reject_non_codex_path",
  policyRequiredFieldMissing: "policy_required_field_missing",
  invalidPerceptionPacket: "invalid_perception_packet",
  parseFailure: "parse_failure",
  codexTimeout: "codex_timeout",
  requestCancelled: "request_cancelled",
  decisionDeadlineExceeded: "decision_deadline_exceeded",
  toolFailure: "tool_failure",
  runtimeHttpError: "runtime_http_error",
  runtimeParseError: "runtime_parse_error",
} as const;

export type FallbackReasonCode = (typeof FALLBACK_REASON_CODES)[keyof typeof FALLBACK_REASON_CODES];

export function normalizeReasonCode(reason: string | undefined): string | undefined {
  if (typeof reason !== "string") {
    return undefined;
  }

  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const [head] = trimmed.split(":");
  const normalized = head?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function classifyReasonCategory(reason: string | undefined): ReasonCategory {
  const normalized = normalizeReasonCode(reason);
  if (!normalized) {
    return "none";
  }

  if (normalized.startsWith("policy_")) {
    return "policy";
  }
  if (normalized === FALLBACK_REASON_CODES.invalidPerceptionPacket) {
    return "schema";
  }
  if (normalized === FALLBACK_REASON_CODES.codexTimeout || normalized === FALLBACK_REASON_CODES.decisionDeadlineExceeded) {
    return "timeout";
  }
  if (normalized === FALLBACK_REASON_CODES.requestCancelled) {
    return "cancelled";
  }
  if (normalized === FALLBACK_REASON_CODES.parseFailure || normalized === FALLBACK_REASON_CODES.runtimeParseError) {
    return "parse";
  }
  if (normalized === FALLBACK_REASON_CODES.toolFailure) {
    return "tool";
  }
  if (normalized.startsWith("runtime_")) {
    return "runtime";
  }
  return "unknown";
}

export function classifyWarningTier(usedFallback: boolean, reason: string | undefined): WarningTier {
  if (!usedFallback) {
    return "reference";
  }

  const category = classifyReasonCategory(reason);
  if (category === "policy" || category === "schema") {
    return "blocking";
  }
  if (
    category === "timeout"
    || category === "cancelled"
    || category === "parse"
    || category === "tool"
    || category === "runtime"
    || category === "unknown"
  ) {
    return "attention";
  }

  return "reference";
}

export function annotateDecisionMeta(envelope: DecisionEnvelope): DecisionEnvelope {
  const normalizedReason = normalizeReasonCode(envelope.meta.reason);
  const reasonCategory = classifyReasonCategory(normalizedReason);
  const warningTier = classifyWarningTier(envelope.meta.usedFallback, normalizedReason);

  return {
    ...envelope,
    meta: {
      ...envelope.meta,
      reason: normalizedReason ?? envelope.meta.reason,
      reasonCategory,
      warningTier,
    },
  };
}
