import type { NpcIntent, PerceptionPacket } from "../contracts/types.js";
import type { WorldRole } from "./world/index.js";
import { loadStorylet } from "./storylet.js";

export function createFallbackIntent(packet: Pick<PerceptionPacket, "npcId">, reason: string): NpcIntent {
  return {
    npcId: packet.npcId,
    actionType: "Observe",
    reasonCodes: [`fallback:${reason}`],
    confidence: 0,
    utterance: "관찰하겠습니다.",
  };
}

/**
 * Deterministic fallback lines for an NPC role, sourced from the storylet's
 * dialogue line bank (docs/scenario/content/dialogue-line-bank.md). Used when
 * a tool provides no utterance; always present (docs/game/glossary.md).
 */
export function fallbackLinesForRole(storyletId: string, role: WorldRole): string[] {
  const storylet = loadStorylet(storyletId);
  return storylet.fallbackLines[role] ?? [];
}

/** Pick a stable fallback line for a role by deterministic index. */
export function fallbackLine(storyletId: string, role: WorldRole, index = 0): string | undefined {
  const lines = fallbackLinesForRole(storyletId, role);
  if (lines.length === 0) {
    return undefined;
  }
  return lines[Math.abs(index) % lines.length];
}
