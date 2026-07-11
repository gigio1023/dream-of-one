# M3 — Agent-Loop Society

**Status: active (2026-07-11).** Activated at the M2 close, rewritten from
the owner playtest review ([`m2-provider-ports.md`](m2-provider-ports.md))
and the boundary interview (deltas in
[`../vision/design-pillars.md`](../vision/design-pillars.md), summary in
[`roadmap.md`](roadmap.md)).

## Goal

Scale one working provider-driven NPC loop into a small society the player
lives in for a whole run. Multiple NPCs pursue concurrent role goals, move,
and socialize; records propagate because actors can see and use them. The
player pursues a purpose under a deadline while records accumulate, and the
Station can be survived by argument — a persuasive defense lowers suspicion
and the run continues.

## Owner decisions shaping this milestone (2026-07-11)

1. **Merged-call turn.** Judgment, the NPC's reply, and the next suggestions
   come from **one** provider call; it is the only provider work the player
   ever blocks on. NPC agent actions and ambient beats run in the background
   or during the player's think/typing time — they may use the already-shown
   reply as input, and they never queue ahead of the next answer. This
   resolves the turn-semantics choice the playtest review left open.
2. **The run (회차).** Suspicion, records, and the ledger persist across
   conversations within a run and reset between runs. Interrogation is an
   in-run event. Technical consequence: run-scoped state lifts out of the
   conversation-session scope in the runtime.
3. **Purpose + deadline.** The player came to town for a reason and has
   limited time. The first purpose is drafted from `docs/scenario/` canon
   and owner-approved in a content slice.
4. **Pressure from fiction only.** No timer, auto-submit, or hesitation
   record in ordinary conversation. Station interrogation beats keep a
   generous timer (≥40 seconds) via the existing per-storylet
   `hesitationMs`; timeout still submits "(응답 지연)" for judgment.
5. **No structural waiting.** Typewriter reveal plus a diegetic "thinking"
   state cover the merged call; everything else is preloaded, overlapped, or
   deferred.
6. **Onboarding.** Controls get minimal hints; the rules are taught by the
   fiction (low-risk first-morning conversations plus why-lines). The first
   run softens suspicion growth.
7. **Audio lands here.** CC0 SFX and ambience — footsteps, door chime, store
   murmur, and the signature record-scribble when something about the player
   is written down. BGM waits for M5.
8. **Action-cost time.** The deadline is spent in day segments
   (morning/noon/evening): a meaningful conversation or incident consumes a
   segment, resting one slightly lowers suspicion, and the clock never
   moves while the player thinks or types. Deadline pressure is "chances
   left," never a running clock.
9. **Always-visible suspicion gauge.** Suspicion is two-layered — per-NPC
   opinion plus institutional report pressure — and the HUD shows a
   standing gauge (owner choice: legibility over diegetic subtlety).
   Why-lines stay per judgment; detail stays in inspect; in-world record
   props stay removed.
10. **Design defaults adopted at the owner's gap review** (owner may veto
    any of these at a boundary): the run purpose is achieved through
    conversation only — asking, probing, persuading, never fetch-quest
    mechanics — so approaching the goal and risking suspicion are the same
    act; ordinary play has a suspicion recovery path (consistent low-key
    behavior, resting a segment) so one slip is not a hidden death spiral;
    NPCs whose suspicion warrants it can initiate a conversation with the
    player; a run ends with a recap screen built from the ledger (what the
    town learned about you); the player's concrete secret is drafted from
    `docs/scenario/` canon for owner approval alongside the purpose; and
    the exterior shell carries simple sightline rules (who can see the
    counter, where talk can be overheard) — no other level design yet.

## Opening slices (folded in from the M2 closeout)

Small immersion repairs, first in line, with no ordering dependency on the
pipeline work: camera micro-jitter fix (Camera2D smoothing vs pixel snap),
the "생각 중" thinking state + typewriter reveal, larger default HUD scale,
timer removal outside interrogation, and removal of in-room record props
from normal play (inspect/menu at most).

## Deliverables

Player-visible:

- A turn that answers back from one merged call, with ambient life arriving
  during the player's own thinking time — never ahead of the reply.
- A run frame: visible purpose, a day-segment clock showing chances left,
  suspicion and records that carry across conversations, an always-visible
  two-layer suspicion gauge, and a Station interrogation the player can
  argue their way out of and return to the run.
- NPC-initiated conversations: an NPC whose suspicion warrants it walks up
  and questions the player unprompted.
- A run recap on ending: a ledger-built timeline of what the town learned
  about the player this run.
- 2–3 conversable NPCs in the Store block (manager and waiting customer stop
  being ambient-only).
- NPCs that move and socialize on policy-based game AI (schedules, utility
  rules — explicitly not LLM calls); the model keeps judgment and dialogue
  content. The cast reads as people doing social building the player joins,
  not fixtures waiting for the player.
- A minimal exterior town shell: the Store becomes a building on a small
  street or square, so the world reads as a place.
- SFX + ambience per decision 7.

Technical:

- Merged judgment+reply+suggestions schema on the proposal port, with the
  deterministic fallback still able to satisfy it.
- Run-scoped state (suspicion, records, ledger, deadline clock) above the
  conversation session; sessions keep their guaranteed ending.
- Background scheduling for agent actions and ambient beats that can use the
  delivered reply as context and never block an answer.
- Per-role provider profiles and fair scheduling across concurrent NPC loops.
- NPC-to-NPC conversations and requests through the same validated tools.
- Soft-report and inquest propagation re-derived from visibility, records,
  role authority, and model-proposed attempts.
- Player-facing transcript cues that answer who saw what, which tool
  succeeded or failed, and why the next NPC action changed.

## Acceptance

- [ ] The player-facing reply and suggestions arrive from a single provider
      call; no ambient or agent-action call ever delays an answer.
- [ ] A run spans at least two conversations with suspicion and records
      persisting between them, and resets cleanly on restart.
- [ ] Being reported leads to a Station interrogation the player can win by
      argument: suspicion visibly drops and the run continues.
- [ ] The run's purpose and deadline are visible in play, and both ending
      kinds (purpose achieved, definitive verdict) are reachable.
- [ ] Time advances only through segment-consuming actions; resting a
      segment visibly recovers some suspicion; the clock never moves while
      the player thinks or types.
- [ ] At least one NPC initiates a conversation with the player unprompted,
      driven by its suspicion state.
- [ ] A finished run shows a ledger-built recap of what the town learned.
- [ ] Two NPCs pursue different goals without a hardcoded action ordering.
- [ ] A blocked or busy result changes the proposing NPC's next attempt.
- [ ] A record becomes actionable only for roles that can actually observe
      it.
- [ ] NPCs visibly move and hold NPC-to-NPC beats, and the player can trace
      one emergent NPC-to-NPC consequence in the running scene.
- [ ] No timer exists outside Station interrogation; interrogation allows at
      least 40 seconds.
- [ ] Footsteps, door, murmur, and the record-scribble cue are audible; the
      camera no longer jitters; every wait on the model shows the thinking
      state.
- [ ] No route-specific social sequence exists in production storylet data
      or SessionService.

## Non-goals

Full four-location theming and segment-driven NPC schedules across the town
(M4) — the day-segment clock itself lands here as the run's time currency;
mid-run save/load — pulled
into M4 early only if runs outgrow one sitting; cross-run persistence
(roguelite record carryover — M4 discussion at the earliest); the NPC
bulletin board (M4 notice board, lowest priority); BGM (M5); long-horizon
memory across runs; provider ownership of suspicion, records, verdicts, or
session end.
