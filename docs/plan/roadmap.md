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
| M2 | [LLM-native agent loop](m2-provider-ports.md) | The model judges suspicion and writes records that another NPC visibly reads; rules keep validity only | ...the shipped architecture is a scripted storylet runner wearing agent-loop names | **done (closed 2026-07-11)** |
| M3 | [Agent-loop society](m3-agent-loop-npcs.md) | Station verdicts become model-judged (reversible by argument); multiple NPCs pursue concurrent goals inside a long-breath run | ...one working agent loop does not produce believable society | **killed 2026-07-11** (opening slices shipped; see history below) |
| M3R | [First-person town](m3-first-person-town.md) | Convert to one seamless first-person 3D town where six event-driven LLM NPCs live, talk, and remember; run frame = stances/vouches toward a scheduled Station hearing | ...the LLM society cannot carry an inhabitable world, and the game stays a cramped 2D test harness | **active** |
| M4 | [Town social sim](m4-town-social-sim.md) | Social depth on the proven town: rumor-diffusion clock, NPC-initiated incidents, notice board, save/load | ...belief movement doesn't scale into replayable social drama | queued (rescope at activation) |
| M5 | [Prologue demo](m5-prologue-demo.md) | 15–30 min honest public demo in KO/EN/IT/ZH-CN/FR/JA, desktop exports, itch page | ...nothing shippable exists (v1's terminal state) | queued |

Post-M5 (not planned in detail, listed to aim high): additional storylet
packs from the social-cards canon, NPC cast growth, a second town block,
Steam page, modding surface for storylet data.

**Owner amendment (2026-07-12):** the six-locale target was explicitly added
to active M3R and the public M5 target. This is the owner-directed exception
to the normal no-scope-addition rule below; it edits the existing milestone
and vision pages rather than creating a parallel direction document.

## Cross-cutting tracks

- **Content track:** each milestone pulls from `docs/scenario/` canon
  (M1: Same Order; M3R: player identity/secret and the six resident
  identities as owner-approved content slices; M5: prologue arc). New canon
  requires the content-guide rules, not new process.
- **Art track:** committed CC0 base + local licensed tier per
  [`../art/asset-pipeline.md`](../art/asset-pipeline.md); M3R uses greybox
  architecture, Kenney as the environment base, KayKit and other validated
  permissive CC0 supplements for dressing, and Quaternius characters. Those
  layers are validated in-engine as art enters the town; M5 does the polish
  pass.
- **Provider track:** M2 built ports and `proposeNextStep` together; M3R adds
  event-driven scheduling for six concurrent NPC loops and emergent
  propagation; M4 adds per-role profiles (cheap ambient / better Station);
  M5 locks the demo's default profile + disclosure copy.
- **Localization track:** Korean remains first-authored. M3R makes the single
  UI/run/provider/fallback path locale-driven for `ko-KR`, `en-US`, `it-IT`,
  `zh-CN`, `fr-FR`, and `ja-JP`; M5 ships content parity through that path
  instead of adding language-specific implementations.

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

## 2026-07-11 owner interview (M2→M3 boundary)

Interview at the M2 close, same day as the playtest review (deltas recorded
in [`../vision/design-pillars.md`](../vision/design-pillars.md)). M2 closes
with its acceptance passed and the fun gate honestly recorded as *no on
immersion*; the closeout slate above executes as M3's opening slices rather
than holding the milestone open. M3 activates rewritten around the owner
decisions: a merged judgment+reply provider call as the turn's only
player-blocking work; a long-breath run (회차) in which suspicion and records
persist across conversations and reset between runs; a purpose-plus-deadline
run frame; Station interrogation survivable by argument (the run continues);
timers only inside interrogation and generous (≥40s); controls-only
onboarding with rules taught by the fiction; SFX/ambience in M3, BGM in M5.

Second principle, beside the timer note: the player's only wait is the
minimum path to the content about to be shown — every other provider call is
preloaded, overlapped with the player's think/typing time, or deferred. Long
generation is tolerable; structural waiting is a defect.

Same-day gap review (owner-confirmed, defaults recorded in the M3 doc):
action-cost time in day segments, an always-visible two-layer suspicion
gauge, purpose achieved through conversation only, an in-run suspicion
recovery path, NPC-initiated conversations, a ledger-built run recap, and
sightline-only spatial rules for the exterior shell (no other level design
yet).

## 2026-07-11 direction conversion — M3 killed and replaced by M3R

Kill paragraph (required by the milestone rules): the owner played the
completed M2 build, rejected its immersion (one crammed 2D room, a static
cast), and after a full direction interview chose a complete conversion to a
first-person 3D town — the player physically inside the NPC society rather
than above it. M3's 2D exterior-shell frame therefore no longer described a
game anyone intended to ship. M3 was killed at this boundary with its
completed opening slices retained (merged judgment+reply call, diegetic
thinking state, HUD scale, timer removal, record-prop removal); its surviving
design decisions (run frame, survivable interrogation, merged-call turn,
no-structural-waiting) move into M3R unchanged. The interview also resolved
the open player-purpose question via a researched option map: the run
objective is now belief-editing toward a scheduled Station hearing (vouch
quorum first, rumor-diffusion clock in M4). Direction deltas are recorded in
[`../vision/design-pillars.md`](../vision/design-pillars.md) (2026-07-11 late
block); this consumed the one direction change budgeted for the boundary.

Time-model consequence: the action-cost day-segment clock from the same-day
gap review above is superseded by continuous world time. A player-modal
conversation, including its merged reply wait, pauses the world; ambient
NPC-to-NPC and scheduling calls remain asynchronous and their results are
revision-checked before application. "The clock never moves while the player
thinks or types" survives; the segment currency does not.
