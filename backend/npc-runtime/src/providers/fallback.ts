import {
  calculateConversationReportWeight,
  calculateConversationSuspicionWeight,
  clampConversationScore,
  ruleJudgeConversationTurn,
} from "../runtime/conversation-suspicion.js";
import {
  exactFallbackSuggestedReplyIntent,
  fallbackContent,
} from "../localization/fallback-content.js";
import type {
  ConversationChoiceIntent,
  ConversationSuspicionSignal,
} from "../contracts/types.js";
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

function localizedFallbackWhyLine(
  locale: string,
  signals: readonly ConversationSuspicionSignal[],
): string {
  const lines = fallbackContent(locale).whyLines;
  const first = signals[0];
  return first
    ? (lines[first] ?? lines.defaultSignal)
    : lines.none;
}

function fallbackStance(
  suspicionAfter: number,
  signals: readonly ConversationSuspicionSignal[],
  exactFallbackIntent?: ConversationChoiceIntent,
): "oppose" | "uncertain" | "vouch" {
  if (suspicionAfter >= 55) return "oppose";
  if (exactFallbackIntent === "uncertain/repair") return "uncertain";
  if (exactFallbackIntent === "risky/weird") return "uncertain";
  if (signals.length === 0) return "vouch";
  return "uncertain";
}

function applyExactFallbackReplyJudgment(
  request: ConversationJudgmentRequest,
  proposal: ConversationJudgment,
): ConversationJudgment {
  const intent = exactFallbackSuggestedReplyIntent(request.locale, request.playerLine);
  if (intent !== "risky/weird") return proposal;

  // This is not a general language classifier and never trusts a provider's
  // intent label. It recognizes only exact text owned by the fallback bank.
  const signals: ConversationSuspicionSignal[] = [
    "role_script_break",
    ...proposal.signals.filter(signal => signal !== "role_script_break"),
  ];
  const suspicionAfter = clampConversationScore(
    request.suspicionBefore + calculateConversationSuspicionWeight(signals),
  );
  const reportAfter = clampConversationScore(
    request.reportPressureBefore + calculateConversationReportWeight(signals),
  );
  return {
    ...proposal,
    signals,
    suspicionDelta: suspicionAfter - request.suspicionBefore,
    reportDelta: reportAfter - request.reportPressureBefore,
  };
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
    const content = fallbackContent(request.locale).conversation[
      isStudioReception ? "studioReception" : "generic"
    ];
    return {
      proposal: {
        utterance: isFollowUp ? content.followUp : content.opening,
        suggestedReplies: content.suggestedReplies,
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
    const ruleProposal = ruleJudgeConversationTurn({
      promptId: request.promptId,
      playerLine: request.playerLine,
      priorPlayerLines: priorPlayerLines(request.conversationHistory),
      suspicionBefore: request.suspicionBefore,
      reportPressureBefore: request.reportPressureBefore,
    });
    const proposal = applyExactFallbackReplyJudgment(request, ruleProposal);
    return {
      proposal: {
        ...proposal,
        whyLine: localizedFallbackWhyLine(request.locale, proposal.signals),
      },
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
    const exactFallbackIntent = exactFallbackSuggestedReplyIntent(
      request.locale,
      request.playerLine,
    );
    const hesitationMarker = fallbackContent(request.locale).hesitationMarker;
    const meaningfulFirsthand =
      request.playerLine.trim().length > 1 && request.playerLine !== hesitationMarker;
    return {
      proposal: {
        ...judged.proposal,
        stance: fallbackStance(
          suspicionAfter,
          judged.proposal.signals,
          exactFallbackIntent,
        ),
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
    const content = fallbackContent(request.locale).agent;
    const canLook = request.observePacket.toolCatalog.includes("look");
    const canTalk = request.observePacket.toolCatalog.includes("talk_to");
    const requiredTalkTarget = request.requiredToolCall?.actorId;
    const visibleTarget = canLook && !requiredTalkTarget
      ? request.observePacket.visibleObjects[0]?.objectId
      : undefined;
    const visibleActor = requiredTalkTarget
      ? canTalk &&
        request.observePacket.visibleActors.includes(requiredTalkTarget) &&
        request.observePacket.audibleActorIds.includes(requiredTalkTarget)
        ? requiredTalkTarget
        : undefined
      : canTalk
        ? request.observePacket.visibleActors.find(actorId =>
            request.observePacket.audibleActorIds.includes(actorId),
          )
        : undefined;
    const proposal: AgentStepProposal = request.previousResult
      ? {
          toolCall: { tool: "wait", args: { reason: content.previousResultWaitReason } },
          rationale: content.previousResultRationale,
          done: false,
        }
      : visibleActor
        ? {
            toolCall: { tool: "talk_to", args: { actorId: visibleActor } },
            utterance:
              request.observePacket.heardSpeech.length > 0
                ? content.heardUtterance
                : content.talkUtterance,
            rationale: content.talkRationale,
            done: true,
          }
      : visibleTarget
        ? {
            toolCall: { tool: "look", args: { targetId: visibleTarget } },
            rationale: content.lookRationale,
            done: false,
          }
        : { rationale: content.doneRationale, done: true };
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
