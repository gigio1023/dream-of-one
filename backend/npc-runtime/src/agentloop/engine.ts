// Provider-driven NPC loop: observe -> propose -> validate -> apply -> read -> iterate.
// The provider owns the attempt. Deterministic runtime code owns every result.

import { applyMutation, type LedgerEvent, type WorldState } from "../runtime/world/index.js";
import type {
  AgentToolResult,
  NpcProposalPort,
  ProposalMeta,
} from "../providers/ports.js";
import {
  assembleObservePacket,
  summarizeObservePacket,
  type ActorMemory,
  type ActorPolicy,
} from "./context.js";
import { validateToolCall, type ActorContextLite, type ToolCall } from "./tools.js";
import { TranscriptStore, type TranscriptEntry } from "./transcript.js";

export const MIN_BEAT_BUDGET = 3;
export const MAX_BEAT_BUDGET = 6;
export const DEFAULT_BEAT_BUDGET = 5;

export interface NpcAction {
  actorId: string;
  tool: ToolCall["tool"];
  args: Record<string, unknown>;
  utterance?: string;
  validationResult: { ok: boolean; reason?: string; detail?: string; note: string };
  ledgerEventId?: string;
  proposalMeta: ProposalMeta;
}

export interface BeatResult {
  world: WorldState;
  actions: NpcAction[];
  events: LedgerEvent[];
  transcriptDeltas: TranscriptEntry[];
  memory: ActorMemory;
}

export interface RunBeatInput {
  sessionId: string;
  world: WorldState;
  actor: ActorContextLite;
  policy: ActorPolicy;
  memory: ActorMemory;
  heardSpeech?: string[];
  goal: string;
  proposalPort: NpcProposalPort;
  transcript: TranscriptStore;
  budget?: number;
}

function clampBudget(value: number | undefined): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_BEAT_BUDGET;
  return Math.max(MIN_BEAT_BUDGET, Math.min(MAX_BEAT_BUDGET, n));
}

function signatureOf(call: ToolCall): string {
  return `${call.tool}:${JSON.stringify(call.args)}`;
}

export async function runBeat(input: RunBeatInput): Promise<BeatResult> {
  const budget = clampBudget(input.budget);
  const transcript = input.transcript;
  const heardSpeech = input.heardSpeech ?? [];

  let world = input.world;
  const events: LedgerEvent[] = [];
  const actions: NpcAction[] = [];
  const deltas: TranscriptEntry[] = [];
  const blockedSignatures = new Set<string>();
  const memory: ActorMemory = {
    actorId: input.memory.actorId,
    ownActionNotes: [...input.memory.ownActionNotes],
    observedLedgerEventIds: [...input.memory.observedLedgerEventIds],
  };
  let previousResult: AgentToolResult | undefined;

  for (let iteration = 0; iteration < budget; iteration += 1) {
    const packet = assembleObservePacket(world, {
      actor: input.actor,
      goals: [input.goal],
      policy: input.policy,
      memory,
      heardSpeech,
    });
    const observedSummary = summarizeObservePacket(packet);
    const resolved = await input.proposalPort.proposeNextStep({
      sessionId: input.sessionId,
      iteration,
      goal: input.goal,
      observePacket: packet,
      previousResult,
      blockedSignatures: [...blockedSignatures],
    });
    const proposal = resolved.proposal;
    if (proposal.done || !proposal.toolCall) {
      memory.ownActionNotes.push(`goal stopped: ${proposal.rationale}`);
      break;
    }

    const call = proposal.toolCall;
    const step = transcript.nextStep(input.actor.actorId);
    const sig = signatureOf(call);

    if (blockedSignatures.has(sig)) {
      previousResult = {
        tool: call.tool,
        args: call.args,
        ok: false,
        reason: "retry_suppressed",
        detail: "identical call already blocked against unchanged state",
        note: "retry suppressed",
      };
      const entry: TranscriptEntry = {
        actorId: input.actor.actorId,
        step,
        observedSummary,
        tool: call.tool,
        args: call.args,
        utterance: proposal.utterance,
        rationale: proposal.rationale,
        proposalMeta: resolved.meta,
        validation: { ok: false, reason: "retry_suppressed", note: "would retry a blocked step" },
        nextStepChange: "provider must choose a different tool after the blocked result",
      };
      transcript.append(entry);
      deltas.push(entry);
      continue;
    }

    const validation = validateToolCall(world, input.actor, call);
    let ledgerEventId: string | undefined;
    let nextStepChange: string;

    if (validation.ok) {
      if (validation.mutation) {
        const applied = applyMutation(world, validation.mutation);
        world = applied.world;
        events.push(applied.event);
        ledgerEventId = applied.event.eventId;
        memory.observedLedgerEventIds.push(applied.event.eventId);
        nextStepChange = "world changed; provider receives the fresh observation";
      } else {
        nextStepChange = "observation succeeded; provider chooses the next attempt";
      }
      memory.ownActionNotes.push(validation.note);
      previousResult = {
        tool: call.tool,
        args: call.args,
        ok: true,
        note: validation.note,
      };
      actions.push({
        actorId: input.actor.actorId,
        tool: call.tool,
        args: call.args,
        utterance: proposal.utterance,
        validationResult: { ok: true, note: validation.note },
        ledgerEventId,
        proposalMeta: resolved.meta,
      });
    } else {
      blockedSignatures.add(sig);
      nextStepChange = `blocked (${validation.reason}); provider receives the failure and must re-plan`;
      previousResult = {
        tool: call.tool,
        args: call.args,
        ok: false,
        reason: validation.reason,
        detail: validation.detail,
        note: validation.detail,
      };
      actions.push({
        actorId: input.actor.actorId,
        tool: call.tool,
        args: call.args,
        utterance: proposal.utterance,
        validationResult: {
          ok: false,
          reason: validation.reason,
          detail: validation.detail,
          note: validation.detail,
        },
        proposalMeta: resolved.meta,
      });
    }

    const entry: TranscriptEntry = {
      actorId: input.actor.actorId,
      step,
      observedSummary,
      tool: call.tool,
      args: call.args,
      utterance: proposal.utterance,
      rationale: proposal.rationale,
      proposalMeta: resolved.meta,
      validation: validation.ok
        ? { ok: true, note: validation.note }
        : {
            ok: false,
            reason: validation.reason,
            detail: validation.detail,
            note: validation.detail,
          },
      ledgerEventId,
      nextStepChange,
    };
    transcript.append(entry);
    deltas.push(entry);
  }

  return { world, actions, events, transcriptDeltas: deltas, memory };
}
