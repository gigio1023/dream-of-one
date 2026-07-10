// Agent-loop engine (docs/game/npc-agent-loop.md).
//
// Runs the deterministic loop for one NPC over a beat:
//   observe -> propose (deterministic policy) -> validate -> apply -> read
//   -> update memory -> iterate (budget 3-6).
//
// M1 is deterministic only: NO provider calls. The policy is a goal queue.
// The load-bearing property: a blocked/busy result MUST change the next step.
// The engine never re-proposes a tool call whose signature already blocked.

import { applyMutation, type LedgerEvent, type WorldState } from "../runtime/world/index.js";
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
}

export interface BeatResult {
  world: WorldState;
  actions: NpcAction[];
  events: LedgerEvent[];
  transcriptDeltas: TranscriptEntry[];
  memory: ActorMemory;
}

export interface RunBeatInput {
  world: WorldState;
  actor: ActorContextLite;
  policy: ActorPolicy;
  memory: ActorMemory;
  heardSpeech?: string[];
  /** Ordered candidate tool calls the NPC wants to attempt this beat. */
  goals: Array<{ call: ToolCall; goalLabel: string }>;
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

export function runBeat(input: RunBeatInput): BeatResult {
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

  let attempted = 0;
  for (const goal of input.goals) {
    if (attempted >= budget) {
      break;
    }

    // observe (fresh each iteration, reflecting prior mutations)
    const packet = assembleObservePacket(world, {
      actor: input.actor,
      goals: [goal.goalLabel],
      policy: input.policy,
      memory,
      heardSpeech,
    });
    const observedSummary = summarizeObservePacket(packet);
    const step = transcript.nextStep(input.actor.actorId);
    const sig = signatureOf(goal.call);

    // propose: refuse to re-propose an already-blocked step -> next step changes
    if (blockedSignatures.has(sig)) {
      const entry: TranscriptEntry = {
        actorId: input.actor.actorId,
        step,
        observedSummary,
        tool: goal.call.tool,
        args: goal.call.args,
        utterance: goal.call.utterance,
        validation: { ok: false, reason: "retry_suppressed", note: "would retry a blocked step" },
        nextStepChange: "skipped a blocked step; switching to a different tool",
      };
      transcript.append(entry);
      deltas.push(entry);
      continue;
    }

    // validate
    const validation = validateToolCall(world, input.actor, goal.call);
    attempted += 1;

    let ledgerEventId: string | undefined;
    let nextStepChange: string;

    if (validation.ok) {
      // apply
      if (validation.mutation) {
        const applied = applyMutation(world, validation.mutation);
        world = applied.world;
        events.push(applied.event);
        ledgerEventId = applied.event.eventId;
        memory.observedLedgerEventIds.push(applied.event.eventId);
        nextStepChange = "applied mutation; advancing to next goal";
      } else {
        nextStepChange = "observed without mutation; advancing to next goal";
      }
      // update memory (read result)
      memory.ownActionNotes.push(validation.note);
      actions.push({
        actorId: input.actor.actorId,
        tool: goal.call.tool,
        args: goal.call.args,
        utterance: goal.call.utterance,
        validationResult: { ok: true, note: validation.note },
        ledgerEventId,
      });
    } else {
      // blocked: record and ensure the next step differs
      blockedSignatures.add(sig);
      nextStepChange = `blocked (${validation.reason}); will not retry this tool`;
      actions.push({
        actorId: input.actor.actorId,
        tool: goal.call.tool,
        args: goal.call.args,
        utterance: goal.call.utterance,
        validationResult: { ok: false, reason: validation.reason, detail: validation.detail, note: validation.detail },
      });
    }

    const entry: TranscriptEntry = {
      actorId: input.actor.actorId,
      step,
      observedSummary,
      tool: goal.call.tool,
      args: goal.call.args,
      utterance: goal.call.utterance,
      validation: validation.ok
        ? { ok: true, note: validation.note }
        : { ok: false, reason: validation.reason, detail: validation.detail, note: validation.detail },
      ledgerEventId,
      nextStepChange,
    };
    transcript.append(entry);
    deltas.push(entry);
  }

  return { world, actions, events, transcriptDeltas: deltas, memory };
}
