import type { ObservePacket } from "./context.js";
import { summarizeObservePacket } from "./context.js";
import type { ToolCall } from "./tools.js";
import type {
  AgentStepProposal,
  AgentToolResult,
  NpcProposalPort,
  ProposalMeta,
  ResolvedProposal,
} from "../providers/ports.js";
import type { TranscriptEntry } from "./transcript.js";
import { TranscriptStore } from "./transcript.js";

export interface ProposalLoopEvaluation<T> {
  status: "accepted" | "blocked" | "stop";
  value?: T;
  validation: { ok: boolean; reason?: string; detail?: string; note: string };
  nextStepChange: string;
  ledgerEventId?: string;
  continueAfterAccept?: boolean;
  recordTranscript?: boolean;
}

export interface BoundedProposalLoopInput<T> {
  sessionId: string;
  locale: string;
  actorId: string;
  goal: string;
  maxAttempts: number;
  proposalPort: NpcProposalPort;
  transcript: TranscriptStore;
  observe: (iteration: number) => ObservePacket;
  evaluate: (
    proposal: AgentStepProposal,
    meta: ProposalMeta,
    packet: ObservePacket,
    iteration: number,
  ) => ProposalLoopEvaluation<T> | Promise<ProposalLoopEvaluation<T>>;
  invoke?: (
    request: Parameters<NpcProposalPort["proposeNextStep"]>[0],
  ) => Promise<ResolvedProposal<AgentStepProposal>>;
  onMeta?: (meta: ProposalMeta) => void | Promise<void>;
  allowedTalkActorIds?: readonly string[];
  budgetCeiling?: { maxCalls: number; maxTokens: number };
}

export interface BoundedProposalLoopResult<T> {
  accepted: T[];
  metas: ProposalMeta[];
  transcriptDeltas: TranscriptEntry[];
  exhausted: boolean;
}

export function toolCallSignature(call: ToolCall): string {
  return `${call.tool}:${JSON.stringify(call.args)}`;
}

/**
 * Shared provider-attempt core for both the retained WorldState loop and M3R
 * run-scoped goals. World observation, deterministic validation, and apply
 * remain injected by the owning runtime; retry suppression and transcript
 * semantics stay singular.
 */
export async function runBoundedProposalLoop<T>(
  input: BoundedProposalLoopInput<T>,
): Promise<BoundedProposalLoopResult<T>> {
  const blockedSignatures = new Set<string>();
  const accepted: T[] = [];
  const metas: ProposalMeta[] = [];
  const transcriptDeltas: TranscriptEntry[] = [];
  let previousResult: AgentToolResult | undefined;

  for (let iteration = 0; iteration < input.maxAttempts; iteration += 1) {
    const packet = input.observe(iteration);
    const request = {
      sessionId: input.sessionId,
      locale: input.locale,
      iteration,
      goal: input.goal,
      observePacket: packet,
      previousResult,
      blockedSignatures: [...blockedSignatures],
      ...(input.allowedTalkActorIds
        ? { allowedTalkActorIds: [...input.allowedTalkActorIds] }
        : {}),
      ...(input.budgetCeiling ? { budgetCeiling: input.budgetCeiling } : {}),
    };
    const resolved = input.invoke
      ? await input.invoke(request)
      : await input.proposalPort.proposeNextStep(request);
    metas.push(resolved.meta);
    await input.onMeta?.(resolved.meta);

    const proposal = resolved.proposal;
    const call = proposal.toolCall;
    const signature = call ? toolCallSignature(call) : null;
    const step = input.transcript.nextStep(input.actorId);
    const observedSummary = summarizeObservePacket(packet);

    if (call && signature && blockedSignatures.has(signature)) {
      const validation = {
        ok: false,
        reason: "retry_suppressed",
        detail: "identical call already completed or blocked in this beat",
        note: "would repeat a completed or blocked step",
      };
      previousResult = {
        tool: call.tool,
        args: call.args,
        ok: false,
        reason: validation.reason,
        detail: validation.detail,
        note: validation.note,
      };
      const entry: TranscriptEntry = {
        actorId: input.actorId,
        step,
        observedSummary,
        tool: call.tool,
        args: call.args,
        utterance: proposal.utterance,
        rationale: proposal.rationale,
        proposalMeta: resolved.meta,
        validation,
        nextStepChange: "provider must choose a different tool or stop after the prior result",
      };
      input.transcript.append(entry);
      transcriptDeltas.push(entry);
      continue;
    }

    const evaluation = await input.evaluate(proposal, resolved.meta, packet, iteration);
    if (call && signature) blockedSignatures.add(signature);
    if (evaluation.recordTranscript === false) {
      if (evaluation.status === "stop") {
        return { accepted, metas, transcriptDeltas, exhausted: false };
      }
      continue;
    }
    const transcriptCall = call ?? {
      tool: "wait" as const,
      args: { reason: "goal_stopped" },
    };
    const entry: TranscriptEntry = {
      actorId: input.actorId,
      step,
      observedSummary,
      tool: transcriptCall.tool,
      args: transcriptCall.args,
      utterance: proposal.utterance,
      rationale: proposal.rationale,
      proposalMeta: resolved.meta,
      validation: evaluation.validation,
      ledgerEventId: evaluation.ledgerEventId,
      nextStepChange: evaluation.nextStepChange,
    };
    input.transcript.append(entry);
    transcriptDeltas.push(entry);

    previousResult = {
      tool: transcriptCall.tool,
      args: transcriptCall.args,
      ok: evaluation.validation.ok,
      ...(evaluation.validation.reason ? { reason: evaluation.validation.reason } : {}),
      ...(evaluation.validation.detail ? { detail: evaluation.validation.detail } : {}),
      note: evaluation.validation.note,
    };
    if (evaluation.status === "accepted" && evaluation.value !== undefined) {
      accepted.push(evaluation.value);
    }
    if (evaluation.status === "stop") {
      return { accepted, metas, transcriptDeltas, exhausted: false };
    }
    if (evaluation.status === "accepted") {
      if (evaluation.continueAfterAccept) continue;
      return { accepted, metas, transcriptDeltas, exhausted: false };
    }
  }
  return { accepted, metas, transcriptDeltas, exhausted: true };
}
