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

const FALLBACK_WHY_LINES: Record<string, string> = {
  local_routine_mismatch: "그 답은 이곳에서 확인하려던 절차와 맞지 않았습니다.",
  dream_language_leak: "그 말에는 이곳 바깥을 가리키는 낯선 표현이 섞였습니다.",
  memory_gap_admission: "기억이 비어 있다는 답이 확인할 점을 남겼습니다.",
  role_script_break: "이곳 사람이라면 하지 않을 답이라 의문이 남았습니다.",
  prior_statement_contradiction: "앞서 한 말과 지금 답이 서로 맞지 않았습니다.",
  authority_evasion: "확인하려는 질문을 피한 답이라 의문이 남았습니다.",
  over_explanation: "필요한 범위보다 길어진 설명이 오히려 의문을 남겼습니다.",
  response_hesitation: "바로 답하지 못한 점이 확인할 사항으로 남았습니다.",
};

function koreanFallbackWhyLine(signals: readonly string[]): string {
  const first = signals[0];
  return first
    ? (FALLBACK_WHY_LINES[first] ?? "그 답에는 더 확인할 점이 남았습니다.")
    : "그 답은 지금까지 확인한 정황과 자연스럽게 맞았습니다.";
}

function fallbackStance(
  suspicionAfter: number,
  signals: readonly string[],
): "oppose" | "uncertain" | "vouch" {
  if (suspicionAfter >= 55) return "oppose";
  if (signals.length === 0) return "vouch";
  return "uncertain";
}

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
    const isStudioReception = request.actorId === "NPC_Studio_Receptionist";
    const isFollowUp = request.conversationHistory.length > 0;
    return {
      proposal: {
        utterance: isStudioReception
          ? isFollowUp
            ? "말씀하신 이유를 접수 내용과 맞춰 보겠습니다. 한 가지만 더 확인해도 될까요?"
            : "접수를 도와드리겠습니다. 이곳에 오신 이유를 말씀해 주세요."
          : isFollowUp
            ? "잠깐만요, 방금 하신 말을 한 번 더 확인할게요. 평소하고 같은 게 맞나요?"
            : "잠시만요, 오늘따라 정신이 없네요. 평소 하시던 대로 맞으실까요?",
        suggestedReplies: isStudioReception
          ? [
              { text: "안내받은 절차를 확인하러 왔습니다.", intent: "safe/local" },
              { text: "먼저 어떤 접수인지 설명해 주세요.", intent: "uncertain/repair" },
              { text: "여기 사람이 아니라서 잘 모르겠습니다.", intent: "risky/weird" },
            ]
          : [
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
    const proposal = ruleJudgeConversationTurn({
      promptId: request.promptId,
      playerLine: request.playerLine,
      priorPlayerLines: priorPlayerLines(request.conversationHistory),
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
    });
    return {
      proposal: { ...proposal, whyLine: koreanFallbackWhyLine(proposal.signals) },
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
    const suspicionAfter = request.suspicionBefore + judged.proposal.suspicionDelta;
    const meaningfulFirsthand =
      request.playerLine.trim().length > 1 && request.playerLine !== "(응답 지연)";
    return {
      proposal: {
        ...judged.proposal,
        stance: fallbackStance(suspicionAfter, judged.proposal.signals),
        meaningfulFirsthand,
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
    const requiredTalkTarget = request.requiredToolCall?.actorId;
    const visibleActor =
      requiredTalkTarget && request.observePacket.visibleActors.includes(requiredTalkTarget)
        ? requiredTalkTarget
        : request.observePacket.visibleActors[0];
    const proposal: AgentStepProposal = request.previousResult
      ? {
          toolCall: { tool: "wait", args: { reason: "방금 결과를 다시 살핍니다" } },
          rationale: "방금 행동의 결과를 확인하고 잠시 기다립니다.",
          done: false,
        }
      : visibleActor
        ? {
            toolCall: { tool: "talk_to", args: { actorId: visibleActor } },
            utterance:
              request.observePacket.heardSpeech.length > 0
                ? "말씀하신 내용은 알겠습니다. 제가 확인한 것은 따로 기억해 두겠습니다."
                : "잠시 이야기 나눌 수 있을까요? 지금 확인한 내용을 서로 맞춰 보고 싶습니다.",
            rationale: "곁에 있는 주민과 직접 말을 나눕니다.",
            done: true,
          }
      : visibleTarget
        ? {
            toolCall: { tool: "look", args: { targetId: visibleTarget } },
            rationale: "보이는 물건을 먼저 살펴봅니다.",
            done: false,
          }
        : { rationale: "지금 할 수 있는 행동이 없어 멈춥니다.", done: true };
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
