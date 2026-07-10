# Dream of One

Dream of One is a 2D top-down conversation social-stealth game set in a
stateless administered district, built with Godot 4.x and a TypeScript NPC
runtime. NPCs and the Station investigate what the player says: dialogue is
the threat surface, records travel between NPCs, and deterministic rules —
not the LLM — decide consequences. NPC brains live in the TS runtime as
constrained agent loops; a port-and-adapter provider layer (ModelScope/Qwen,
OpenAI, or none) proposes their wording.

**Current state: v2 direction reset merged (M0 done); next milestone is M1,
the 2D playable slice.** v1 (2025-10 → 2026-05, 3D) proved the
conversation/suspicion protocol end to end and is archived; v2 keeps that
core and rebuilds the presentation in 2D with free-first art and a plan that
optimizes for playable fun instead of process gates.

## Where to Start

**Everything is indexed from [`docs/README.md`](docs/README.md).** Read it
first; every document is scoped so an AI agent (or human) can pick up one
document and start working.

| You want to... | Read |
|---|---|
| Understand the game | [`docs/vision/pitch.md`](docs/vision/pitch.md) |
| Know what to build next | [`docs/plan/roadmap.md`](docs/plan/roadmap.md) |
| Work on the Godot client | [`docs/tech/godot-2d-client.md`](docs/tech/godot-2d-client.md) |
| Work on the NPC runtime | [`docs/tech/npc-runtime.md`](docs/tech/npc-runtime.md) |
| Work on AI providers | [`docs/tech/ai-provider-ports.md`](docs/tech/ai-provider-ports.md) |
| Know why v1 died | [`docs/history/v1-postmortem.md`](docs/history/v1-postmortem.md) |

## Game Loop

1. NPC prompts assume the player belongs here.
2. The player answers through three diegetic dialogue choices or bounded typed
   free input. Typed input becomes a recorded statement, not open-ended chat.
3. Deterministic rules classify suspicious wording and hesitation.
4. NPC suspicion becomes social pressure: probing, gossip, reports, records
   that other NPCs read and act on.
5. Station intake, inquest, verdict, and session end remain deterministic
   runtime authority.
6. NPCs run an agent loop: observe → pick a validated tool → read the result →
   iterate. The LLM proposes wording and next tool calls; it never mutates the
   world directly.

## Quick Start

Prerequisites: Godot 4.7.x stable (set `GODOT_BIN` per device), Node.js and npm.

```bash
npm install --prefix backend/npc-runtime
npm run check --prefix backend/npc-runtime
${GODOT_BIN:?set GODOT_BIN to the local Godot CLI} --path godot
```

Note: `godot/` currently contains the v1 3D scene tree. It is scheduled to be
rebuilt as a 2D project in milestone M1 — see
[`docs/plan/m1-2d-playable-slice.md`](docs/plan/m1-2d-playable-slice.md).

## Repository Map

| Path | Purpose |
|---|---|
| `docs/` | v2 documentation, indexed by `docs/README.md`. |
| `docs/scenario/` | Scenario canon: storylets, dialogue banks, social cards (engine-agnostic, reused by v2). |
| `docs/archive/` | Frozen v1 documentation. Do not build from it. |
| `godot/` | Godot game project (v1 3D, rebuilt to 2D in M1). |
| `backend/npc-runtime/` | TypeScript NPC runtime: deterministic authority, schema, provider ports. |
| `data/evidence/` | Generated runtime artifacts from smoke runs. |

## License

Code: no top-level license declared yet. Third-party art is governed by
per-pack licenses — see [`docs/art/asset-pipeline.md`](docs/art/asset-pipeline.md).
Committed assets are CC0 or project-owned only; redistribution-restricted
packs (free or paid) are never committed to this public repository.
