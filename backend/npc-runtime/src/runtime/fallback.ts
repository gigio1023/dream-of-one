import type { NpcIntent, PerceptionPacket } from "../contracts/types.js";
import { fallbackContent } from "../localization/fallback-content.js";
import { DEFAULT_GAMEPLAY_LOCALE } from "../localization/supported-locales.js";

export function createFallbackIntent(
  packet: Pick<PerceptionPacket, "npcId">,
  reason: string,
  locale = DEFAULT_GAMEPLAY_LOCALE,
): NpcIntent {
  return {
    npcId: packet.npcId,
    actionType: "Observe",
    reasonCodes: [`fallback:${reason}`],
    confidence: 0,
    utterance: fallbackContent(locale).agent.observeUtterance,
  };
}
