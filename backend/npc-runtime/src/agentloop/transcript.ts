// Rolling per-NPC loop transcript (docs/game/npc-agent-loop.md).
// Records observe -> proposed tool -> validation result -> world effect ->
// next-step change for every loop iteration, per actor.

import type { ToolName } from "./tools.js";
import type { ProposalMeta } from "../providers/ports.js";

export interface TranscriptEntry {
  actorId: string;
  step: number;
  observedSummary: string;
  tool: ToolName;
  args: Record<string, unknown>;
  utterance?: string;
  rationale: string;
  proposalMeta: ProposalMeta;
  validation: { ok: boolean; reason?: string; detail?: string; note: string };
  ledgerEventId?: string;
  /** How this result changes the NPC's next step (blocked/busy must change it). */
  nextStepChange: string;
}

export class TranscriptStore {
  private readonly byActor = new Map<string, TranscriptEntry[]>();

  append(entry: TranscriptEntry): void {
    const entries = this.byActor.get(entry.actorId) ?? [];
    entries.push(entry);
    this.byActor.set(entry.actorId, entries);
  }

  nextStep(actorId: string): number {
    return (this.byActor.get(actorId)?.length ?? 0) + 1;
  }

  forActor(actorId: string): TranscriptEntry[] {
    return [...(this.byActor.get(actorId) ?? [])];
  }

  all(): TranscriptEntry[] {
    return [...this.byActor.values()].flat();
  }

  totalLength(): number {
    let total = 0;
    for (const entries of this.byActor.values()) {
      total += entries.length;
    }
    return total;
  }
}
