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
| M1 | [2D scenario harness](m1-2d-playable-slice.md) | 2D client, Session API, world rules, and four deterministic regression scenarios | ...the presentation and deterministic authority boundary cannot be exercised end to end | **closed as harness (PR #100)** |
| M2 | [LLM-native agent loop](m2-provider-ports.md) | The model judges suspicion and writes records that another NPC visibly reads; rules keep validity only | ...the shipped architecture is a scripted storylet runner wearing agent-loop names | **active** |
| M3 | [Agent-loop society](m3-agent-loop-npcs.md) | Station verdicts become model-judged (reversible by argument); multiple NPCs pursue concurrent goals | ...one working agent loop does not produce believable society | queued |
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
- **Provider track:** M2 builds ports and `proposeNextStep` together; M3 adds
  concurrent scheduling and emergent propagation; M4 adds per-role profiles
  (cheap ambient / better Station); M5 locks the demo's
  default profile + disclosure copy.

## Milestone rules

- A milestone is done when its acceptance list passes and the fun gate has an
  honest answer recorded. It may be **killed** at a boundary with one
  paragraph of why in this file's history — killing is cheaper than drifting.
- Scope may be *cut* mid-milestone; it may not be *added*. New ideas queue in
  the next milestone's doc.
- Every milestone doc has: goal, player-visible deliverables, technical
  deliverables, acceptance checks, explicit non-goals, and dependency notes.

## 2026-07-10 milestone correction

M1 proved a useful deterministic scenario harness but not the intended game.
Its authored dialogue choices and route consequence lists are retained only as
test inputs while M2 replaces the production policy with provider-backed
proposals. This correction was explicitly directed by the owner at the M1
boundary; it does not authorize additional scripted routes.

Same day, after the owner interview and an independent audit: judgment
authority (suspicion, and later Station verdicts) moved from deterministic
rules to the model, visible NPC-to-NPC reaction moved from M3 into M2, and
the four canonical routes were demoted to regression tests. Recorded in
[`../vision/design-pillars.md`](../vision/design-pillars.md); M2's
acceptance list was rewritten accordingly.

## 2026-07-11 owner playtest correction

The owner played the completed M2 build and reviewed it (findings and root
causes recorded in [`m2-provider-ports.md`](m2-provider-ports.md), "Owner
playtest review"). The architecture holds; the fiction does not: one crammed
room, a static cast, unexplained generation stalls, artificial record props,
and a punishing answer timer break immersion before the judgment loop can be
felt. Consequences:

- **M2 closeout items (defects/cuts, no scope added):** camera micro-jitter
  fix, a diegetic "NPC is thinking" wait state, larger default HUD scale,
  removal of the auto-submitting hesitation timer (slow answers stop being
  problematized by default), and removal of in-room record props from normal
  play (owner overrides that point of the M2 information policy).
- **M3 reshaping (recorded in [`m3-agent-loop-npcs.md`](m3-agent-loop-npcs.md)):**
  respond-first provider pipeline (player-facing turn generated and shown
  first; judgment, agent actions, and ambient beats run in parallel or during
  player think-time), 2–3 conversable NPCs, policy-based (non-LLM) ambient
  movement and NPC-to-NPC socializing, and a minimal exterior town shell so
  the Store is a building in a place rather than the whole world. Full
  four-location theming stays M4.
- **Very low priority queue:** a bulletin board other NPCs read and write
  (subsumes the removed record props; maps to M4's notice board).

Timer note: the fiction's pressure should come from the NPCs' judged
reactions, not from a real-time countdown on the input box.
