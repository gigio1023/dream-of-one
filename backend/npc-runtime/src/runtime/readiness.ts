// Boot/preflight readiness (kept from v1, simplified for M1).
//
// v1 probed the Codex provider + thread/workspace stores. M1 is
// deterministic-only with no provider, so readiness now confirms the
// deterministic core can load its content (the storylet data). Provider
// readiness returns in M2 with the provider ports.

import { loadStorylet } from "./storylet.js";

export type ReadinessReason = "storylet_data_unavailable";

export interface RuntimeReadinessReport {
  status: "ready" | "not_ready";
  service: "npc-runtime";
  mode: "deterministic";
  reasons: ReadinessReason[];
  checks: {
    storylet: { ok: boolean; storyletId: string; reason?: ReadinessReason };
  };
}

export function evaluateRuntimeReadiness(storyletId = "same-order"): RuntimeReadinessReport {
  let ok = true;
  const reasons: ReadinessReason[] = [];
  try {
    loadStorylet(storyletId);
  } catch {
    ok = false;
    reasons.push("storylet_data_unavailable");
  }
  return {
    status: ok ? "ready" : "not_ready",
    service: "npc-runtime",
    mode: "deterministic",
    reasons,
    checks: {
      storylet: ok ? { ok, storyletId } : { ok, storyletId, reason: "storylet_data_unavailable" },
    },
  };
}
