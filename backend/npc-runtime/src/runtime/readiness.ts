import type { SessionService } from "./session/service.js";
import { loadStorylet } from "./storylet.js";

export type ReadinessReason = "storylet_data_unavailable";

export async function evaluateRuntimeReadiness(service: SessionService, storyletId = "same-order") {
  let storyletOk = true;
  const reasons: ReadinessReason[] = [];
  try {
    loadStorylet(storyletId);
  } catch {
    storyletOk = false;
    reasons.push("storylet_data_unavailable");
  }
  const provider = await service.providerPreflight();
  return {
    status: storyletOk ? "ready" as const : "not_ready" as const,
    service: "npc-runtime" as const,
    mode: "provider-first" as const,
    reasons,
    checks: {
      storylet: storyletOk
        ? { ok: true, storyletId }
        : { ok: false, storyletId, reason: "storylet_data_unavailable" as const },
      provider: {
        ok: provider.available,
        profileId: service.providerProfile(),
        reason: provider.reason,
        fallbackAvailable: true,
      },
    },
  };
}
