import type { DecisionEnvelope } from "../contracts/types.js";
import { createFallbackIntent } from "./fallback.js";
import { parsePerceptionPacket, SchemaValidationError } from "./schema.js";
import type { CodexBroker } from "../broker/codex-broker.js";
import type { ReliabilityTelemetry } from "./reliability-telemetry.js";

export class DecisionService {
  constructor(
    private readonly broker: CodexBroker,
    private readonly telemetry?: ReliabilityTelemetry,
  ) {}

  async decide(payload: unknown): Promise<DecisionEnvelope> {
    this.telemetry?.recordDecisionRequest();
    try {
      const packet = parsePerceptionPacket(payload);
      const decision = await this.broker.decide(packet);
      if (decision.meta.usedFallback) {
        this.telemetry?.recordFallback();
      }
      return decision;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        this.telemetry?.recordFailure("invalid_perception_packet");
        this.telemetry?.recordFallback();
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
