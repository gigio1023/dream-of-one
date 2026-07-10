import type { NpcIntent, PerceptionPacket } from "../contracts/types.js";

export function createFallbackIntent(packet: Pick<PerceptionPacket, "npcId">, reason: string): NpcIntent {
  return {
    npcId: packet.npcId,
    actionType: "Observe",
    reasonCodes: [`fallback:${reason}`],
    confidence: 0,
    utterance: "관찰하겠습니다.",
  };
}
