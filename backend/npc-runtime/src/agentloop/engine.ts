// Provider-driven NPC loop: observe -> propose -> validate -> apply -> read -> iterate.
// The provider owns the attempt. Deterministic runtime code owns every result.

import { applyMutation, type LedgerEvent, type WorldState } from "../runtime/world/index.js";
import type {
  NpcProposalPort,
  ProposalMeta,
} from "../providers/ports.js";
import {
  assembleObservePacket,
  type ActorMemory,
  type ActorPolicy,
} from "./context.js";
import { validateToolCall, type ActorContextLite, type ToolCall } from "./tools.js";
import { TranscriptStore, type TranscriptEntry } from "./transcript.js";
import { runBoundedProposalLoop } from "./proposal-loop.js";

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
  locale: string;
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

export async function runBeat(input: RunBeatInput): Promise<BeatResult> {
  const budget = clampBudget(input.budget);
  const transcript = input.transcript;
  const heardSpeech = input.heardSpeech ?? [];

  let world = input.world;
  const events: LedgerEvent[] = [];
  const actions: NpcAction[] = [];
  const memory: ActorMemory = {
    actorId: input.memory.actorId,
    ownActionNotes: [...input.memory.ownActionNotes],
    observedLedgerEventIds: [...input.memory.observedLedgerEventIds],
  };
  const loop = await runBoundedProposalLoop<NpcAction>({
    sessionId: input.sessionId,
    locale: input.locale,
    actorId: input.actor.actorId,
    goal: input.goal,
    maxAttempts: budget,
    proposalPort: input.proposalPort,
    transcript,
    observe: () => assembleObservePacket(world, {
      actor: input.actor,
      goals: [input.goal],
      policy: input.policy,
      memory,
      heardSpeech,
    }),
    evaluate: (proposal, meta) => {
      if (proposal.done || !proposal.toolCall) {
        memory.ownActionNotes.push(`goal stopped: ${proposal.rationale}`);
        return {
          status: "stop",
          validation: { ok: true, note: "goal stopped" },
          nextStepChange: "goal yielded",
          recordTranscript: false,
        };
      }
      const call = proposal.toolCall;
      const validation = validateToolCall(world, input.actor, call);
      if (!validation.ok) {
        const action: NpcAction = {
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
          proposalMeta: meta,
        };
        actions.push(action);
        return {
          status: "blocked",
          validation: {
            ok: false,
            reason: validation.reason,
            detail: validation.detail,
            note: validation.detail,
          },
          nextStepChange: `blocked (${validation.reason}); provider receives the failure and must re-plan`,
        };
      }
      let ledgerEventId: string | undefined;
      let nextStepChange = "observation succeeded; provider chooses the next attempt";
      if (validation.mutation) {
        const applied = applyMutation(world, validation.mutation);
        world = applied.world;
        events.push(applied.event);
        ledgerEventId = applied.event.eventId;
        memory.observedLedgerEventIds.push(applied.event.eventId);
        nextStepChange = "world changed; provider receives the fresh observation";
      }
      memory.ownActionNotes.push(validation.note);
      const action: NpcAction = {
        actorId: input.actor.actorId,
        tool: call.tool,
        args: call.args,
        utterance: proposal.utterance,
        validationResult: { ok: true, note: validation.note },
        ledgerEventId,
        proposalMeta: meta,
      };
      actions.push(action);
      return {
        status: "accepted",
        value: action,
        validation: { ok: true, note: validation.note },
        ledgerEventId,
        nextStepChange,
        continueAfterAccept: true,
      };
    },
  });
  return { world, actions, events, transcriptDeltas: loop.transcriptDeltas, memory };
}
