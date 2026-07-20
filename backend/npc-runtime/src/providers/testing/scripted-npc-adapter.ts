import { ruleJudgeConversationTurn } from "../../runtime/conversation-suspicion.js";
import { hearingContactBasisForMemories } from "../../runtime/run-hearing.js";
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

function priorPlayerLines(
  history: ReadonlyArray<{ speakerId: string; line: string }>,
): string[] {
  return history.filter(entry => entry.speakerId === "player").map(entry => entry.line);
}

const SCRIPTED_HESITATION_MARKERS: Readonly<Record<string, string>> = {
  "ko-KR": "(머뭇거림)",
  "en-US": "(hesitates)",
  "it-IT": "(esita)",
  "zh-CN": "（犹豫）",
  "fr-FR": "(hésite)",
  "ja-JP": "（ためらう）",
};

const SCRIPTED_LINES: Readonly<Record<string, {
  ambientReply: string;
  ambientWhy: string;
  meaningfulTestimony: string;
  limitedTestimony: string;
  neverMetTestimony: string;
  ordinaryWhy: string;
  abnormalWhy: string;
  ordinaryOfficer: string;
  abnormalOfficer: string;
}>> = {
  "ko-KR": {
    ambientReply: "그 말은 기억해 두겠습니다.",
    ambientWhy: "테스트 대화만으로는 판단을 바꾸지 않았습니다.",
    meaningfulTestimony: "직접 나눈 대화를 근거로 말씀드립니다.",
    limitedTestimony: "직접 만났지만 판단할 만큼 대화하지는 못했습니다.",
    neverMetTestimony: "직접 대화한 적이 없습니다.",
    ordinaryWhy: "직접 대화한 주민 네 명 이상이 보증했습니다.",
    abnormalWhy: "직접 대화에 근거한 보증이 충분하지 않았습니다.",
    ordinaryOfficer: "평범한 방문자로 판정합니다.",
    abnormalOfficer: "비정상 방문자로 판정합니다.",
  },
  "en-US": {
    ambientReply: "I will remember that.",
    ambientWhy: "The scripted exchange did not change this judgment.",
    meaningfulTestimony: "I can speak from our direct conversation.",
    limitedTestimony: "We met, but did not speak enough for a judgment.",
    neverMetTestimony: "We never spoke directly.",
    ordinaryWhy: "At least four residents vouched from direct conversation.",
    abnormalWhy: "There were not enough vouches grounded in direct conversation.",
    ordinaryOfficer: "You are classified as an ordinary visitor.",
    abnormalOfficer: "You are classified as an abnormal visitor.",
  },
  "it-IT": {
    ambientReply: "Lo terrò a mente.",
    ambientWhy: "Lo scambio preparato non ha cambiato questo giudizio.",
    meaningfulTestimony: "Posso parlare in base alla nostra conversazione diretta.",
    limitedTestimony: "Ci siamo incontrati, ma non abbiamo parlato abbastanza.",
    neverMetTestimony: "Non abbiamo mai parlato direttamente.",
    ordinaryWhy: "Almeno quattro residenti hanno garantito dopo un dialogo diretto.",
    abnormalWhy: "Non ci sono abbastanza garanzie fondate su dialoghi diretti.",
    ordinaryOfficer: "È classificato come visitatore ordinario.",
    abnormalOfficer: "È classificato come visitatore anomalo.",
  },
  "zh-CN": {
    ambientReply: "我会记住这句话。",
    ambientWhy: "这段脚本对话没有改变判断。",
    meaningfulTestimony: "我可以根据我们的直接交谈作证。",
    limitedTestimony: "我们见过面，但交谈不足以作出判断。",
    neverMetTestimony: "我们从未直接交谈。",
    ordinaryWhy: "至少四名居民根据直接交谈作出了担保。",
    abnormalWhy: "基于直接交谈的担保不足。",
    ordinaryOfficer: "你被判定为普通访客。",
    abnormalOfficer: "你被判定为异常访客。",
  },
  "fr-FR": {
    ambientReply: "Je m'en souviendrai.",
    ambientWhy: "L'échange scénarisé n'a pas changé ce jugement.",
    meaningfulTestimony: "Je peux témoigner de notre conversation directe.",
    limitedTestimony: "Nous nous sommes rencontrés, sans parler assez pour juger.",
    neverMetTestimony: "Nous n'avons jamais parlé directement.",
    ordinaryWhy: "Au moins quatre résidents se sont portés garants après un échange direct.",
    abnormalWhy: "Il manque des garanties fondées sur des échanges directs.",
    ordinaryOfficer: "Vous êtes classé comme visiteur ordinaire.",
    abnormalOfficer: "Vous êtes classé comme visiteur anormal.",
  },
  "ja-JP": {
    ambientReply: "その言葉は覚えておきます。",
    ambientWhy: "台本上の会話だけでは判断を変えませんでした。",
    meaningfulTestimony: "直接交わした会話を根拠に証言できます。",
    limitedTestimony: "会いましたが、判断できるほど話していません。",
    neverMetTestimony: "直接話したことはありません。",
    ordinaryWhy: "四人以上の住民が直接の会話に基づいて保証しました。",
    abnormalWhy: "直接の会話に基づく保証が足りませんでした。",
    ordinaryOfficer: "通常の訪問者と判定します。",
    abnormalOfficer: "異常な訪問者と判定します。",
  },
};

function scriptedLines(locale: string): (typeof SCRIPTED_LINES)[string] {
  return SCRIPTED_LINES[locale] ?? SCRIPTED_LINES["en-US"]!;
}

function scriptedStance(
  suspicionAfter: number,
  signalCount: number,
): "oppose" | "uncertain" | "vouch" {
  if (suspicionAfter >= 55) return "oppose";
  return signalCount === 0 ? "vouch" : "uncertain";
}

function normalizeScriptedConversationProposal<T extends ConversationProposal>(proposal: T): T {
  return {
    ...proposal,
    suggestedReplies: proposal.suggestedReplies.map(reply => ({
      ...reply,
      evidenceIds: [...reply.evidenceIds],
      introducesNewClaim: reply.introducesNewClaim,
    })) as T["suggestedReplies"],
  };
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
      proposal: normalizeScriptedConversationProposal(
        await this.handlers.conversation(request),
      ),
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
        proposal: normalizeScriptedConversationProposal(
          await this.handlers.mergedTurn(request),
        ),
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
        {
          speakerId: "player",
          line: request.playerLine,
          evidenceId: request.playerStatementEvidenceId,
        },
      ],
    });
    return {
      proposal: {
        ...judged.proposal,
        stance: scriptedStance(
          request.suspicionBefore + judged.proposal.suspicionDelta,
          judged.proposal.signals.length,
        ),
        meaningfulFirsthand:
          request.playerLine.trim().length > 1 &&
          request.playerLine !== SCRIPTED_HESITATION_MARKERS[request.locale],
        openQuestion: null,
        utterance: proposed.proposal.utterance,
        citedRecordIds: proposed.proposal.citedRecordIds ?? [],
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
      : {
          toolCall: { tool: "talk_to" as const, args: { actorId: request.targetActorId } },
          utterance: scriptedLines(request.locale).ambientReply,
          citedRecordIds: [],
          rationale: "scripted ambient fixture",
          done: true as const,
          suspicionDelta: 0,
          proposedStance: request.stanceBefore,
          whyLine: scriptedLines(request.locale).ambientWhy,
          openQuestion: request.currentOpenQuestion
            ? { ...request.currentOpenQuestion }
            : null,
        };
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
      : this.scriptedHearing(request);
    return {
      proposal,
      meta: {
        profileId: this.profileId,
        transport: "scripted",
        usedFallback: false,
      },
    };
  }

  private scriptedHearing(request: HearingJudgmentRequest): HearingJudgment {
    const lines = scriptedLines(request.locale);
    const residentAssessments = request.residents.map(resident => {
      const contactBasis = hearingContactBasisForMemories(resident.memories);
      const meaningfulMemory = resident.memories.find(memory =>
        memory.kind === "player_conversation" &&
        memory.sourceActorId === "player" &&
        memory.meaningfulFirsthand
      );
      return {
        actorId: resident.actorId,
        contactBasis,
        proposedStance: resident.stanceBefore,
        testimonyLine: contactBasis === "meaningful_firsthand"
          ? lines.meaningfulTestimony
          : contactBasis === "limited_firsthand"
            ? lines.limitedTestimony
            : lines.neverMetTestimony,
        citedMemoryIds: meaningfulMemory ? [meaningfulMemory.memoryId] : [],
      };
    }) as HearingJudgment["residentAssessments"];
    const evidencedVouches = request.residents.filter(resident =>
      resident.stanceBefore === "vouch" &&
      resident.memories.some(memory =>
        memory.kind === "player_conversation" &&
        memory.sourceActorId === "player" &&
        memory.meaningfulFirsthand
      )
    ).length;
    const proposedVerdict: HearingJudgment["proposedVerdict"] =
      evidencedVouches >= 4 ? "ordinary" : "abnormal";
    return {
      residentAssessments,
      proposedVerdict,
      verdictWhyLine: proposedVerdict === "ordinary" ? lines.ordinaryWhy : lines.abnormalWhy,
      officerLine: proposedVerdict === "ordinary" ? lines.ordinaryOfficer : lines.abnormalOfficer,
      citedRecordIds: [],
      citedLedgerEventIds: [],
    };
  }
}
