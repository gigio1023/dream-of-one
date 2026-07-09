# M3 — Agent-Loop NPCs

**Status: queued.**

## Goal

Build the thing v1 specified on its last day and never wrote: NPCs that
iterate observe → tool → result → update, with provider-proposed next steps,
visible transcripts, and social propagation that *emerges* from tools +
visibility instead of scripted chains. Spec:
[`../game/npc-agent-loop.md`](../game/npc-agent-loop.md).

## Probe first (`agent_loop_probe`)

Before broad integration, land the narrow probe inherited from v1's spec, in
the running 2D scene: Store Clerk + Waiting Customer + one record object; ≤5
active tools (`move_to`, `look`, `talk_to`, `wait`, `write_record`); 3–6
iterations per beat. Required proof: a blocked/busy result (customer refuses
contact; counter occupied) **visibly changes the acting NPC's next step**,
and the debug transcript shows the full loop. If the probe feels dead, stop
and redesign at the boundary — do not scale a dead loop.

## Deliverables

- `agentloop/engine.ts` completed: iteration budgets, per-beat scheduling
  across NPCs, structured failure results, transcript capture.
- Full tool catalog (8 tools) validated + ledger-integrated; affordance data
  compiled from `scenario/content/environment-affordance-map.md`.
- `proposeNextStep` through the provider ports: observe-packet in,
  tool-call proposal out, validated identically to deterministic picks;
  deterministic policy remains the always-on baseline and fallback.
- **Propagation re-derived:** delete the M1 scripted reaction orderings;
  re-create the soft-report and inquest chains purely from NPC policies,
  tool access, and record visibility. The v1 chain
  (note → manager read → forward → citation → refusals) becomes the test
  expectation, reached emergently.
- Player-facing legibility: transcript-derived cues in normal builds
  (reaction markers with source tokens, influence links, `보는 단서`), full
  transcript overlay in debug builds.
- `route_smoke.gd` updated to assert the four routes still terminate
  correctly under emergent propagation (with mock and off profiles).

## Acceptance

- [ ] Probe proof: blocked result changes plan, transcript readable, in the
      running game.
- [ ] Soft-report and inquest chains reproduce without any scripted ordering
      (grep-level check: no route-specific reaction sequencing in code).
- [ ] An NPC never repeats an identical tool call against an unchanged
      blocked state.
- [ ] Provider-proposed steps and deterministic steps are indistinguishable
      to validation (same rejection rates enforced in tests).
- [ ] A fresh player can answer, by watching: "who saw what, and why did that
      NPC just do that?" (informal playtest, informs only).
- [ ] Fun gate recorded.

## Non-goals

More locations/NPCs (M4), NPC-to-NPC provider-worded conversations beyond the
probe's needs, long-horizon NPC goals spanning sessions, any new process
artifact to "track" agent behavior — the transcript is the observability.
