import { ruleJudgeConversationTurn } from "../runtime/conversation-suspicion.js";
import type {
  AgentStepRequest,
  ConversationJudgment,
  ConversationJudgmentRequest,
  ConversationTurnRequest,
  MergedConversationTurn,
  MergedConversationTurnRequest,
  NpcProposalPort,
  ResolvedProposal,
  AgentStepProposal,
  ConversationProposal,
} from "./ports.js";

/** Prior player lines, oldest first, extracted from a two-sided history. */
export function priorPlayerLines(
  history: ReadonlyArray<{ speakerId: string; line: string }>,
): string[] {
  return history.filter(entry => entry.speakerId === "player").map(entry => entry.line);
}

/** Minimal resilience policy. It is never selected as the production profile. */
export class RuleFallbackNpcAdapter implements NpcProposalPort {
  readonly profileId = "fallback/rules";

  async preflight(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>> {
    // The objective and scene facts are authoring text, not speech. When no
    // model is available the NPC stalls with an in-world line instead of
    // reading its own stage direction to the player.
    const isFollowUp = request.conversationHistory.length > 0;
    return {
      proposal: {
        utterance: isFollowUp
          ? "잠깐만요, 방금 하신 말을 한 번 더 확인할게요. 평소하고 같은 게 맞나요?"
          : "잠시만요, 오늘따라 정신이 없네요. 평소 하시던 대로 맞으실까요?",
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

  async judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>> {
    return {
      proposal: ruleJudgeConversationTurn({
        promptId: request.promptId,
        playerLine: request.playerLine,
        priorPlayerLines: priorPlayerLines(request.conversationHistory),
        suspicionBefore: request.suspicionBefore,
        reportPressureBefore: request.reportPressureBefore,
      }),
      meta: {
        profileId: this.profileId,
        transport: "fallback",
        usedFallback: true,
      },
    };
  }

  async judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>> {
    const judged = await this.judgeConversationTurn(request);
    const proposed = await this.proposeConversationTurn({
      sessionId: request.sessionId,
      locale: request.locale,
      beatId: request.beatId,
      actorId: request.actorId,
      objective: request.objective,
      sceneFacts: request.sceneFacts,
      observePacket: request.observePacket,
      conversationHistory: [
        ...request.conversationHistory,
        { speakerId: "player", line: request.playerLine },
      ],
    });
    return {
      proposal: {
        ...judged.proposal,
        utterance: proposed.proposal.utterance,
        suggestedReplies: proposed.proposal.suggestedReplies,
        continueConversation: proposed.proposal.continueConversation,
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
