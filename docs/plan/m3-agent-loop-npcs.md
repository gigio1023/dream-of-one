# M3 — Agent-Loop Society

**Status: queued.** Starts after the M2 provider-backed loop is playable.

## Goal

Scale one working provider-driven NPC loop into a small society. Multiple NPCs
pursue concurrent role goals; records propagate because actors can see and use
them, not because a route lists the next reaction.

## Owner playtest pulls (2026-07-11)

Queued from the owner's M2 playtest review (recorded in
[`m2-provider-ports.md`](m2-provider-ports.md)). These reshape this
milestone's scope; the acceptance list below is rewritten around them when M3
activates.

1. **Respond-first provider pipeline.** The player-facing reply and suggested
   choices are generated and shown first; suspicion judgment, agent-loop
   actions, and ambient beats run in parallel or during the player's
   think/typing time. Today's serialized chain (judge → agent beat → next
   turn, all before the player sees anything, with ambient calls able to
   block the next answer) does not survive a larger cast. This is the first
   technical slice of M3. Warning for that slice: this is not a pure
   scheduling change. Today the next turn's prompt and choices are generated
   *after* judgment updates suspicion and the agent beat mutates the world
   (`resolveAnswer` in `session/service.ts`), so respond-first must pick a
   turn semantic — speculative generation against pre-judgment state, an
   ack-then-react two-phase reply, or folding judgment into the propose
   call. The acceptance rewrite names the choice.
2. **2–3 conversable NPCs.** Manager and waiting customer stop being
   ambient-only; the player can be questioned by (and question) more than
   the clerk.
3. **NPCs that move and socialize.** Policy-based game AI (schedules,
   utility rules — explicitly not LLM calls) drives ambient locomotion and
   NPC-to-NPC interaction beats; the model keeps judgment and dialogue
   content. The cast must read as people doing social building the player
   joins, not fixtures waiting for the player.
4. **Minimal exterior town shell.** The Store becomes a building inside a
   very small outdoor space (street or square) so the world reads as a
   place. Full four-location theming and day segments stay M4.

## Deliverables

- Per-role provider profiles and fair scheduling across concurrent NPC loops.
- NPC-to-NPC conversations and requests through the same validated tools.
- Soft-report and inquest propagation re-derived from visibility, records, role
  authority, and model-proposed attempts.
- Player-facing transcript cues that answer who saw what, which tool succeeded
  or failed, and why the next NPC action changed.

## Acceptance

- [ ] Two NPCs pursue different goals without a hardcoded action ordering.
- [ ] A blocked or busy result changes the proposing NPC's next attempt.
- [ ] A record becomes actionable only for roles that can actually observe it.
- [ ] No route-specific social sequence exists in production storylet data or
      SessionService.
- [ ] The player can trace one emergent NPC-to-NPC consequence in the running
      scene.

## Non-goals

Additional themed town locations beyond the minimal exterior shell (owner
pull #4 above), long-horizon memory across sessions, and provider ownership
of suspicion, records, verdicts, or session end.
