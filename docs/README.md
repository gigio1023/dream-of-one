# Dream of One — Documentation Index

This is the single entry point for all active documentation. Every document
below is scoped so that one agent can read it plus its linked references and
start working. If a document is not reachable from this index, it is not
active.

Status: **M2 LLM-native agent loop active (2026-07-10).** M1 remains as the
2D deterministic scenario harness. v1 (3D prototype,
2025-10 → 2026-05) is archived under `docs/archive/` and summarized in the
postmortem.

## Reading Order for New Agents

1. [`vision/pitch.md`](vision/pitch.md) — what the game is.
2. [`vision/design-pillars.md`](vision/design-pillars.md) — what we optimize
   for, and the anti-goals that keep v1's failure from repeating.
3. [`plan/roadmap.md`](plan/roadmap.md) — milestone ladder and what is active
   right now.
4. The active milestone spec under `plan/`.
5. The `tech/` docs for whichever layer you are touching.

## Document Map

### Vision — why and what

| Doc | Scope |
|---|---|
| [`vision/pitch.md`](vision/pitch.md) | Game pitch, fantasy, references, target scope |
| [`vision/design-pillars.md`](vision/design-pillars.md) | Four pillars, anti-goals, decision rules |

### Game design — how it plays

| Doc | Scope |
|---|---|
| [`game/core-loop.md`](game/core-loop.md) | Conversation → suspicion → record → consequence loop; route contrast; session shape |
| [`game/npc-agent-loop.md`](game/npc-agent-loop.md) | NPC agent-loop model: observe → tool → result → iterate; tool catalog; validation |
| [`game/world-social-sim.md`](game/world-social-sim.md) | Locations, civic ledger, records, propagation, minimal economy |
| [`game/content-guide.md`](game/content-guide.md) | Reusing `docs/scenario/` canon; tone; Korean-first localization |
| [`game/glossary.md`](game/glossary.md) | Canonical terms (Station, record, suspicion signal, route, ...) |

### Art — how it looks

| Doc | Scope |
|---|---|
| [`art/art-direction.md`](art/art-direction.md) | 2D top-down direction, resolution, palette, readability rules |
| [`art/asset-pipeline.md`](art/asset-pipeline.md) | Asset sources, licenses, gitignore policy, import conventions |

### Tech — how it is built

| Doc | Scope |
|---|---|
| [`tech/architecture.md`](tech/architecture.md) | System map: Godot 2D client ↔ TS runtime ↔ provider ports |
| [`tech/godot-2d-client.md`](tech/godot-2d-client.md) | Scene/node structure, tilemaps, interaction, HUD, localization |
| [`tech/npc-runtime.md`](tech/npc-runtime.md) | Backend inventory: what carries over from v1, target module shape |
| [`tech/ai-provider-ports.md`](tech/ai-provider-ports.md) | Port-and-adapter provider layer: Chat Completions port, Responses port, registry, fallback |
| [`tech/verification.md`](tech/verification.md) | Commands, smoke policy, the fun gate |

### Plan — what to build, in order

| Doc | Scope | Status |
|---|---|---|
| [`plan/roadmap.md`](plan/roadmap.md) | Milestone ladder M0–M5, gates, tracks | — |
| [`plan/m1-2d-playable-slice.md`](plan/m1-2d-playable-slice.md) | 2D rebuild and deterministic regression harness | closed as harness |
| [`plan/m2-provider-ports.md`](plan/m2-provider-ports.md) | Provider-backed dialogue and next-step agent loop | **active** |
| [`plan/m3-agent-loop-npcs.md`](plan/m3-agent-loop-npcs.md) | Concurrent NPC society and emergent propagation | queued |
| [`plan/m4-town-social-sim.md`](plan/m4-town-social-sim.md) | Multi-location town, propagation, day segments, save/load | queued |
| [`plan/m5-prologue-demo.md`](plan/m5-prologue-demo.md) | 15–30 min prologue, KO/EN, exports, itch release | queued |

### History

| Doc | Scope |
|---|---|
| [`history/v1-postmortem.md`](history/v1-postmortem.md) | Why v1 was abandoned; what v2 keeps, changes, and forbids |

### Content canon (kept from v1, still active)

| Doc | Scope |
|---|---|
| [`scenario/`](scenario/) | Storylet packets, social simulation cards, dialogue line bank, affordance maps, Korean voice notes |

### Archive (frozen — do not build from)

`archive/v1-direction/`, `archive/v1-design/`, `archive/v1-development/`,
`archive/v1-runtime/`, `archive/v1-framework/`, `archive/v1-research/`, plus
older `archive/` material. Recover history from git, not by resurrecting these
into the active tree.

## Index Rules

- New active docs must be added to this index in the same commit.
- Prefer editing an existing doc over adding a new one. A new doc needs a new
  scope, not a new opinion on an existing scope.
- Plans live under `plan/`, one file per milestone, exactly one marked
  **next**/**active** at a time.
