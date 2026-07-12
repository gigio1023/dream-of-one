import { ruleJudgeConversationTurn } from "../../runtime/conversation-suspicion.js";
import { priorPlayerLines } from "../fallback.js";
import { fallbackContent } from "../../localization/fallback-content.js";
import { RuleFallbackNpcAdapter } from "../fallback.js";
import type {
  AmbientReplyJudgment,
  AmbientReplyRequest,
  AgentStepProposal,
  AgentStepRequest,
  ConversationJudgment,
  ConversationJudgmentRequest,
  ConversationProposal,
  ConversationTurnRequest,
  HearingJudgment,
  HearingJudgmentRequest,
  MergedConversationTurn,
  MergedConversationTurnRequest,
  NpcProposalPort,
  ProviderAuditSnapshot,
  ResolvedProposal,
} from "../ports.js";
import { emptyProviderAuditSnapshot } from "../ports.js";

function scriptedFallbackStance(
  suspicionAfter: number,
  signalCount: number,
): "oppose" | "uncertain" | "vouch" {
  if (suspicionAfter >= 55) return "oppose";
  return signalCount === 0 ? "vouch" : "uncertain";
}

export interface ScriptedNpcHandlers {
  conversation(request: ConversationTurnRequest): ConversationProposal | Promise<ConversationProposal>;
  nextStep(request: AgentStepRequest): AgentStepProposal | Promise<AgentStepProposal>;
  /** Defaults to the deterministic rule classifier for regression stability. */
  judgment?(request: ConversationJudgmentRequest): ConversationJudgment | Promise<ConversationJudgment>;
  /** Optional override for the merged player-turn operation. */
  mergedTurn?(
    request: MergedConversationTurnRequest,
  ): MergedConversationTurn | Promise<MergedConversationTurn>;
  /** Optional exact hearing result for a fixture or integration test. */
  hearing?(request: HearingJudgmentRequest): HearingJudgment | Promise<HearingJudgment>;
  /** Optional listener-owned ambient stance judgment; defaults to neutral no-change. */
  ambientReply?(
    request: AmbientReplyRequest,
  ): AmbientReplyJudgment | Promise<AmbientReplyJudgment>;
}

/** Fixed proposal sets live here, never in production storylet data. */
export class ScriptedNpcAdapter implements NpcProposalPort {
  readonly profileId = "scripted/test";

  constructor(private readonly handlers: ScriptedNpcHandlers) {}

  auditSnapshot(_scopeId: string): ProviderAuditSnapshot {
    return emptyProviderAuditSnapshot();
  }

  async preflight(): Promise<{ available: boolean }> {
    return { available: true };
  }

  async proposeConversationTurn(
    request: ConversationTurnRequest,
  ): Promise<ResolvedProposal<ConversationProposal>> {
    return {
      proposal: await this.handlers.conversation(request),
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  async judgeConversationTurn(
    request: ConversationJudgmentRequest,
  ): Promise<ResolvedProposal<ConversationJudgment>> {
    const proposal = this.handlers.judgment
      ? await this.handlers.judgment(request)
      : ruleJudgeConversationTurn({
          promptId: request.promptId,
          playerLine: request.playerLine,
          priorPlayerLines: priorPlayerLines(request.conversationHistory),
          suspicionBefore: request.suspicionBefore,
          reportPressureBefore: request.reportPressureBefore,
        });
    return {
      proposal,
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  async judgeAndProposeConversationTurn(
    request: MergedConversationTurnRequest,
  ): Promise<ResolvedProposal<MergedConversationTurn>> {
    if (this.handlers.mergedTurn) {
      return {
        proposal: await this.handlers.mergedTurn(request),
        meta: {
          profileId: this.profileId,
          transport: "scripted",
          usedFallback: false,
        },
      };
    }
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
        stance: scriptedFallbackStance(
          request.suspicionBefore + judged.proposal.suspicionDelta,
          judged.proposal.signals.length,
        ),
        meaningfulFirsthand:
          request.playerLine.trim().length > 1 &&
          request.playerLine !== fallbackContent(request.locale).hesitationMarker,
        utterance: proposed.proposal.utterance,
        suggestedReplies: proposed.proposal.suggestedReplies,
        continueConversation: proposed.proposal.continueConversation,
      },
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  async proposeNextStep(
    request: AgentStepRequest,
  ): Promise<ResolvedProposal<AgentStepProposal>> {
    return {
      proposal: await this.handlers.nextStep(request),
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  async judgeAndProposeAmbientReply(
    request: AmbientReplyRequest,
  ): Promise<ResolvedProposal<AmbientReplyJudgment>> {
    const proposal = this.handlers.ambientReply
      ? await this.handlers.ambientReply(request)
      : (await new RuleFallbackNpcAdapter().judgeAndProposeAmbientReply(request)).proposal;
    return {
      proposal,
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  async judgeHearing(
    request: HearingJudgmentRequest,
  ): Promise<ResolvedProposal<HearingJudgment>> {
    const proposal = this.handlers.hearing
      ? await this.handlers.hearing(request)
      : (await new RuleFallbackNpcAdapter().judgeHearing(request)).proposal;
    return {
      proposal,
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }
}
