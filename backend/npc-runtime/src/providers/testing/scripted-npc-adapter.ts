import type {
  AgentStepProposal,
  AgentStepRequest,
  ConversationProposal,
  ConversationTurnRequest,
  NpcProposalPort,
  ResolvedProposal,
} from "../ports.js";

export interface ScriptedNpcHandlers {
  conversation(request: ConversationTurnRequest): ConversationProposal | Promise<ConversationProposal>;
  nextStep(request: AgentStepRequest): AgentStepProposal | Promise<AgentStepProposal>;
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
