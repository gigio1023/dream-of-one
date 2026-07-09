# Roadmap

Implementation cost is treated as ~0 (AI-built). Milestones are therefore
scoped by *design risk retired per step*, not by engineering effort. Each
milestone ends with the fun gate plus its own acceptance list; exactly one
milestone is active at a time. Direction changes happen only at milestone
boundaries (see anti-goals in
[`../vision/design-pillars.md`](../vision/design-pillars.md)).

## Ladder

| # | Milestone | One-line goal | Retires the risk that... | Status |
|---|---|---|---|---|
| M0 | Direction reset | This documentation tree; v1 process retired | ...agents rebuild the proof factory | **done (PR #98)** |
| M1 | [2D playable slice](m1-2d-playable-slice.md) | Same Order storylet fully playable in 2D with real art, four routes, deterministic | ...2D top-down doesn't carry the surveillance feeling; the game isn't fun even at its core | **next** |
| M2 | [Provider ports live](m2-provider-ports.md) | Port/adapter layer shipped; live NPC wording in-game via ModelScope profile, OpenAI profile, fallback proven | ...LLM texture adds nothing / costs too much / can't be tamed | queued |
| M3 | [Agent-loop NPCs](m3-agent-loop-npcs.md) | NPCs iterate observe→tool→result with visible transcripts; propagation emerges from tools, not scripts | ...the agent-loop concept (v1's unbuilt pivot) doesn't actually produce believable society | queued |
| M4 | [Town social sim](m4-town-social-sim.md) | Four locations, 6–8 NPCs, day segments, ambient life, save/load | ...the loop doesn't scale past one room | queued |
| M5 | [Prologue demo](m5-prologue-demo.md) | 15–30 min honest public demo, KO/EN, desktop exports, itch page | ...nothing shippable exists (v1's terminal state) | queued |

Post-M5 (not planned in detail, listed to aim high): additional storylet
packs from the social-cards canon, NPC cast growth, a second town block,
Steam page, modding surface for storylet data.

## Cross-cutting tracks

- **Content track:** each milestone pulls from `docs/scenario/` canon
  (M1: Same Order; M4: 2–3 more cards; M5: prologue arc). New canon requires
  the content-guide rules, not new process.
- **Art track:** committed CC0 base + local licensed tier per
  [`../art/asset-pipeline.md`](../art/asset-pipeline.md); M1 establishes the
  pipeline, M4 completes location theming, M5 does the polish pass.
- **Provider track:** M2 builds ports; M3 adds `proposeNextStep`; M4 adds
  per-role profiles (cheap ambient / better Station); M5 locks the demo's
  default profile + disclosure copy.

## Milestone rules

- A milestone is done when its acceptance list passes and the fun gate has an
  honest answer recorded. It may be **killed** at a boundary with one
  paragraph of why in this file's history — killing is cheaper than drifting.
- Scope may be *cut* mid-milestone; it may not be *added*. New ideas queue in
  the next milestone's doc.
- Every milestone doc has: goal, player-visible deliverables, technical
  deliverables, acceptance checks, explicit non-goals, and dependency notes.
