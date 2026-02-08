import type { ReliabilitySnapshot } from "./reliability-telemetry.js";

export type ReliabilityRateMetric = "fallbackRate" | "timeoutRate" | "parseFailureRate";
export type ReliabilityGateStatus = "pass" | "fail" | "insufficient_sample";

export interface ReliabilityThresholds {
  minimumDecisions: number;
  fallbackRateMax: number;
  timeoutRateMax: number;
  parseFailureRateMax: number;
}

export interface ReliabilityThresholdViolation {
  metric: ReliabilityRateMetric;
  actual: number;
  max: number;
}

export interface ReliabilityThresholdResult {
  pass: boolean;
  status: ReliabilityGateStatus;
  reason?: "insufficient_sample";
  thresholds: ReliabilityThresholds;
  snapshot: ReliabilitySnapshot;
  violations: ReliabilityThresholdViolation[];
  summary: string;
}

export const DEFAULT_RELIABILITY_THRESHOLDS: ReliabilityThresholds = {
  minimumDecisions: 10,
  fallbackRateMax: 0.35,
  timeoutRateMax: 0.2,
  parseFailureRateMax: 0.2,
};

function formatMetric(metric: ReliabilityRateMetric, actual: number, max: number): string {
  return `${metric}=${actual.toFixed(4)}>${max.toFixed(4)}`;
}

export function evaluateReliabilityThresholdGate(
  snapshot: ReliabilitySnapshot,
  overrides: Partial<ReliabilityThresholds> = {},
): ReliabilityThresholdResult {
  const thresholds: ReliabilityThresholds = {
    ...DEFAULT_RELIABILITY_THRESHOLDS,
    ...overrides,
  };
  const counters = snapshot.counters;

  if (counters.decisionRequests < thresholds.minimumDecisions) {
    const summary = `[ReliabilityGate] INSUFFICIENT_SAMPLE decisions=${counters.decisionRequests}` +
      ` minimum=${thresholds.minimumDecisions}`;
    return {
      pass: false,
      status: "insufficient_sample",
      reason: "insufficient_sample",
      thresholds,
      snapshot,
      violations: [],
      summary,
    };
  }

  const checks: Array<{ metric: ReliabilityRateMetric; actual: number; max: number }> = [
    { metric: "fallbackRate", actual: snapshot.rates.fallbackRate, max: thresholds.fallbackRateMax },
    { metric: "timeoutRate", actual: snapshot.rates.timeoutRate, max: thresholds.timeoutRateMax },
    { metric: "parseFailureRate", actual: snapshot.rates.parseFailureRate, max: thresholds.parseFailureRateMax },
  ];

  const violations: ReliabilityThresholdViolation[] = checks
    .filter(check => check.actual > check.max)
    .map(check => ({
      metric: check.metric,
      actual: check.actual,
      max: check.max,
    }));

  const pass = violations.length === 0;
  const violationText = violations.length > 0
    ? ` violations=${violations.map(item => formatMetric(item.metric, item.actual, item.max)).join(",")}`
    : "";

  const summary = `[ReliabilityGate] ${pass ? "PASS" : "FAIL"} decisions=${counters.decisionRequests}` +
    ` fallback=${counters.fallbackResponses} timeout=${counters.timeoutFailures} parse=${counters.parseFailures}` +
    ` rates(fallback=${snapshot.rates.fallbackRate.toFixed(4)},timeout=${snapshot.rates.timeoutRate.toFixed(4)},parse=${snapshot.rates.parseFailureRate.toFixed(4)})` +
    violationText;

  return {
    pass,
    status: pass ? "pass" : "fail",
    thresholds,
    snapshot,
    violations,
    summary,
  };
}
