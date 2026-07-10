import { ruleJudgeConversationTurn } from "../../runtime/conversation-suspicion.js";
import { priorPlayerLines } from "../fallback.js";
import type {
  AgentStepProposal,
  AgentStepRequest,
  ConversationJudgment,
  ConversationJudgmentRequest,
  ConversationProposal,
  ConversationTurnRequest,
  NpcProposalPort,
  ResolvedProposal,
} from "../ports.js";

export interface ScriptedNpcHandlers {
  conversation(request: ConversationTurnRequest): ConversationProposal | Promise<ConversationProposal>;
  nextStep(request: AgentStepRequest): AgentStepProposal | Promise<AgentStepProposal>;
  /** Defaults to the deterministic rule classifier for regression stability. */
  judgment?(request: ConversationJudgmentRequest): ConversationJudgment | Promise<ConversationJudgment>;
}

/** Fixed proposal sets live here, never in production storylet data. */
export class ScriptedNpcAdapter implements NpcProposalPort {
  readonly profileId = "scripted/test";

  constructor(private readonly handlers: ScriptedNpcHandlers) {}

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
}
