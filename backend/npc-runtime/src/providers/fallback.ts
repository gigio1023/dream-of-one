import type {
  AgentStepRequest,
  ConversationTurnRequest,
  NpcProposalPort,
  ResolvedProposal,
  AgentStepProposal,
  ConversationProposal,
} from "./ports.js";

/** Minimal resilience policy. It is never selected as the production profile. */
export class RuleFallbackNpcAdapter implements NpcProposalPort {
  readonly profileId = "fallback/rules";

  async preflight(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>> {
    const subject = request.sceneFacts[0] ?? request.objective;
    return {
      proposal: {
        utterance: `${request.objective} ${subject}`.trim(),
        suggestedReplies: [
          { text: "네, 확인했습니다.", intent: "safe/local" },
          { text: "무슨 뜻인지 조금 더 설명해 주세요.", intent: "uncertain/repair" },
          { text: "저는 여기 사람이 아닙니다.", intent: "risky/weird" },
        ],
        continueConversation: true,
      },
      meta: {
        profileId: this.profileId,
        transport: "fallback",
        usedFallback: true,
      },
    };
  }

  async proposeNextStep(
    request: AgentStepRequest,
  ): Promise<ResolvedProposal<AgentStepProposal>> {
    const visibleTarget = request.observePacket.visibleObjects[0]?.objectId;
    const proposal: AgentStepProposal = request.previousResult
      ? {
          toolCall: { tool: "wait", args: { reason: "reconsider after tool result" } },
          rationale: "Yield after reading the previous result.",
          done: false,
        }
      : visibleTarget
        ? {
            toolCall: { tool: "look", args: { targetId: visibleTarget } },
            rationale: "Inspect one visible object before acting.",
            done: false,
          }
        : { rationale: "No visible affordance is available.", done: true };
    return {
      proposal,
      meta: {
        profileId: this.profileId,
        transport: "fallback",
        usedFallback: true,
      },
    };
  }
}
