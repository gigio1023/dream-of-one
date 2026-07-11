---
name: dream-godot-client
description: Use when changing, reviewing, or diagnosing dream-of-one's Godot client under godot/ — the first-person 3D town, actors, doors and props, HUD, subtitles, modal conversation, input, assets, or headless smokes. Triggers include "first person", "HUD", "conversation surface", "navmesh", "subtitle", "interaction ray", and "scene smoke". NOT for suspicion/record/run logic (dream-npc-runtime), Korean wording and tone (dream-content-authoring), or engine-generic Godot questions.
---

# Dream of One — Godot Client

Change the first-person 3D client under `godot/` while keeping it a pure
presentation layer. M3R is converting the still-runnable 2D tree in parallel;
the target contract and salvage boundary live in
`docs/tech/godot-3d-client.md`. Launch through `GODOT_BIN` with the pinned
Godot 4.7.x line. This skill carries repo contracts; engine technique belongs
to `godot-best-practice`.

## Presentation-Only Boundary

The client renders state, captures input, and forwards player actions to
the runtime sidecar over the run/session HTTP API. It never computes
suspicion, records, verdicts, or session/run end. If a change needs new truth,
it belongs in `backend/npc-runtime` (see the dream-npc-runtime skill); the
client renders what comes back.

## World and HUD domains

- World: one seamless `Node3D` town at 1 unit = 1 meter, with a
  `CharacterBody3D` player, `Camera3D`, authored greybox collision/navmesh,
  and semantic markers bound both ways to `godot/data/world_layout.json`.
- HUD: native-resolution `CanvasLayer`/`Control` hierarchy. Containers,
  anchors, and UI scale own layout; do not derive ordinary panel positions
  from world coordinates.
- Player conversation is modal: focus the interlocutor, lock movement/camera,
  release mouse capture, and pause world time, NPC simulation, and physics
  through the merged reply wait and clean end. Ambient provider work does not
  pause free exploration; the runtime owns stale-result validation.
- Generated conversation text grows to a capped height, then scrolls
  internally; it must not push response controls off-screen.

Exact metrics, interaction baseline, input map, pause behavior, construction
order, and 2D salvage map: `docs/tech/godot-3d-client.md`.

## Information Policy

Normal play shows attributed speech/subtitles, each encountered NPC's coarse
stance, institutional pressure, interaction prompts, and current social
action. Inspect/log shows allowed records, why-lines, open questions, and
encountered provenance. F3 alone shows raw ids, numeric suspicion, world
revisions, provider accounting, and full transcripts. No debug surface may be
required to understand a consequence. When the player first encounters an
off-screen change it must identify who spoke or wrote, who heard or read, its
allowed source, and why. Hidden content stays hidden until encountered.

## Assets

- Tiers and licensing: `docs/art/asset-pipeline.md`. M3R starts with authored
  greybox architecture, Kenney environment/props, and the validated
  Quaternius character family or its recorded fallback. Restricted packs stay
  under gitignored `godot/assets/third_party/`; the game must run without
  them.
- Run the scale/import/character/test-corner gates before dressing gameplay
  scenes. Source assets and adjacent import metadata are source; `.godot/` is
  cache. Never repair generated imports directly.

## Verification

```bash
$GODOT_BIN --headless --import --path godot
DREAM_SESSION_MODE=fixture $GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
```

Full smoke list, Qwen-only live-provider rule, and owner-set final play routing:
`docs/tech/verification.md`. Resist adding smokes without an escaped
regression. Sol may use headless checks and non-play editor snapshots, but
player-facing claims require the final bounded Terra-high Godot AI hands-on
run and its state capture. Model-free smokes never prove the LLM experience.

## Read Before Editing

| Doc | When |
|---|---|
| `docs/tech/godot-3d-client.md` | target scene architecture, metrics, interaction baseline, pause, salvage map |
| `docs/art/art-direction.md` | look rules, palette, readability |
| `docs/art/asset-pipeline.md` | asset sourcing, licensing, import conventions |
| `docs/plan/m3-first-person-town.md` | active scope, ordering, and acceptance |

## Gotchas

- The 2D tree is migration source, not current direction. Preserve it until a
  coherent 3D replacement lands; delete it only with the separately required
  owner confirmation and replacement proof.
- No machine-specific absolute paths; use `GODOT_BIN` and repo-relative paths.
  `godot/.godot/` is generated cache, never source.
- Player-facing strings go through the translation system with keys mapped
  to content data — never hardcoded text (wording rules:
  dream-content-authoring skill).
- Fixture replay is smoke-only (`DREAM_SESSION_MODE=fixture`); normal
  launch uses the HTTP/provider path.
- Do not restore 2D pixel-scaling, tilemap, or fixed-camera assumptions in new
  M3R work. Visual fidelity, custom shaders, and complex lighting are not
  gates; collision, navigation, comfort, and social legibility are.
