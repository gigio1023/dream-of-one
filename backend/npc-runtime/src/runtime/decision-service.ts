import type { DecisionEnvelope } from "../contracts/types.js";
import { createFallbackIntent } from "./fallback.js";
import { parsePerceptionPacket, SchemaValidationError } from "./schema.js";
import type { CodexBroker } from "../broker/codex-broker.js";

export class DecisionService {
  constructor(private readonly broker: CodexBroker) {}

  async decide(payload: unknown): Promise<DecisionEnvelope> {
    try {
      const packet = parsePerceptionPacket(payload);
      return await this.broker.decide(packet);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        const fallback = createFallbackIntent({ npcId: "UNKNOWN_NPC" }, "invalid_perception_packet");
        return {
          intent: fallback,
          meta: {
            usedFallback: true,
            reason: error.message,
            transport: "fallback",
          },
        };
      }
      throw error;
    }
  }
}
