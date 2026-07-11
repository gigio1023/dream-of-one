# World and Social Simulation

> Note (2026-07-11, owner review + interview): in-room record props left
> normal play — records are read through inspect/menus, and the notice board
> is their successor. Where this doc says "session" for a whole play-through,
> read "run" (회차); see [`core-loop.md`](core-loop.md), "Run and session
> shape". Object lists below describe world data, not what is surfaced
> beside NPCs.

## The town block

v2's world is one administered town block, top-down 2D, four interior/exterior
locations plus connective street space:

| Location | Role | Key objects (record props) |
|---|---|---|
| **Store** (상점) | Where ordinary questioning happens | Counter, usual-order cue, receipt tray, correction slips, report tray, queue marker |
| **Station** (스테이션) | Authority: intake, citation, inquest | Intake desk, dossier, citation board |
| **Park** (공원) | Public propagation | Notice board (공개 게시), benches, witnesses |
| **Studio** (스튜디오) | Opportunity/stakes | Review queue, approval criteria board |

Layout is data-driven: semantic landmarks/zones/anchors live in
`godot/data/world_layout.json` (v1's format, positions re-expressed in tile
coordinates for 2D — see
[`../tech/godot-2d-client.md`](../tech/godot-2d-client.md)).

## Records and visibility

Records are the social medium (see [`glossary.md`](glossary.md)). Rules:

- Every record has: kind, author role, target, state body, visibility list
  (열람 — which roles can read it), and a ledger event.
- NPCs only know what they authored, observed, or read — visibility is
  enforced at context-assembly time, not by convention.
- The player can inspect any *visible* record prop and see: its state, the
  latest ledger event that touched it, and which roles can read it. Legibility
  of the record chain is a pillar-3 requirement, not a debug feature.

## Propagation (how suspicion travels)

The canonical chain, proven in v1 and kept:

```
player speech/hesitation
  → clerk suspicion signals
  → clerk note (record, ledger event)
  → manager reads note → pause_service / forward_report
  → park witness posts public notice        [soft report branch]
  → Station officer cites the record chain  [inquest branch]
  → other NPCs read citation → refuse_contact / block_review
```

v2 rule: this chain must emerge from the agent loop (tools + visibility +
policy priorities), not from scripted ordering. The specific sequence above is
the *test case*, not the implementation.

## Minimal civic economy

Five visible values, deliberately crude, each changing at least one role
decision:

| Value | Moves when | Changes |
|---|---|---|
| **Account credit** (계정 크레딧) | Purchases, fines | What the player can buy; Station fine option |
| **Local trust** (신뢰) | Clean interactions, repairs | Choice availability; clerk probe threshold |
| **Record burden** (기록 부담) | Open records against an actor | Manager's willingness to escalate |
| **Station attention** (주시) | Reports, citations | Officer patrol/priority; inquest speed |
| **Favor** (신세) | `request` handoffs between NPCs | Whether an NPC helps or refuses |

One economy hypothesis per increment: a change must alter one visible role
decision the player can notice and explain. No prices/wages/rent systems
until a playable loop needs them.

## Day segments and ambient life (M4)

- Three segments per run day (open, midday, close) — the segment clock
  itself lands in M3 as the run's time currency; NPC schedules move them
  between locations, giving natural conversation windows and witnesses.
- Ambient agent-loop behavior (restock, sweep, queue, chat) runs on the same
  tool catalog with low iteration budgets — the town must feel like it keeps
  existing when the player isn't talking to it.

## Save/load boundary (M4)

A run is the unit of persistence: world layout, records, ledger, economy
values, NPC memory snapshots. Mid-conversation state is not saved — saves
resume at beat boundaries.
