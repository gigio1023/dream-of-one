# Godot 2D Client

Target: Godot 4.7.x stable (current stable series; keep `GODOT_BIN` per
device). The active project under `godot/` is the M2 provider-backed client.

## Project settings

- The pixel-art world renders in a fixed 640×360 `SubViewport`, centered and
  nearest-neighbor scaled at an integer factor. Output presets are 1280×720
  (2×), 1920×1080 (3×, default), 2560×1440 (4×), and 3840×2160 (6×); the
  minimum window is 1280×720.
- HUD controls render in the native window viewport and scale their typography
  and minimum control sizes from the selected output height. This keeps text
  crisp and lets containers reflow independently from the pixel-art world.
  Pixel snap remains on for 2D transforms and vertices.
- The display selector persists its output preset under `user://`. Automated
  visual checks may override it process-locally with
  `DREAM_OUTPUT_PRESET=720p|1080p|1440p|4k`.
- Input map: 4-direction move (WASD/arrows), `interact` (E/Space),
  `choice_1..3` (1/2/3), `open_ledger` (Tab), `cancel` (Esc). Full
  keyboard-only play is a standing requirement; mouse is optional everywhere.
  `toggle_debug` (F3) is the explicit boundary for raw actor ids and internal
  reaction state.

## Scene architecture

```
Main (Node)
├── WorldFrame (Control, integer-scaled and centered)
│   └── WorldContainer (SubViewportContainer)
│       └── WorldViewport (SubViewport, fixed 640×360)
│           └── World (Node2D)
│               ├── TileMapLayers: ground / walls / furniture / overhead
│               ├── Actors (YSort via Node2D y_sort_enabled)
│               │   ├── Player (CharacterBody2D + interaction ray)
│               │   └── NPC instances (sprite, role accent, reaction marker,
│               │       speech bubble anchor, attention/sightline cue)
│               ├── RecordProps (sprite, state label, inspect area)
│               └── InfluenceLinks (Line2D pool, observer → reactor)
├── HUD (CanvasLayer)
│   ├── ConversationPanel (generated prompt + suggestions, typed input field)
│   ├── PressureLine (suspicion/report meters, latest-ledger line, 열람/오간 말)
│   ├── InspectPanel (record/NPC inspection)
│   └── OutcomePanel (route result, cited ledger entries, restart)
├── Session (Node) — session state machine, beat scheduler
└── RuntimeBridge (Node) — HTTPRequest pool to the runtime sidecar
```

## Asset-backed startup

`PackAtlas` builds the tile set and character frames from the committed Kenney
atlas at runtime. After a fresh clone, engine upgrade, or branch switch, run the
documented headless `--import` command before judging the visuals. A field that
shows only role-accent rings means Canvas drawing is alive but imported
textures are not; verify the import and `check_assets.gd` before replacing any
scene or art code.

- Locations are separate scenes (`store.tscn`, `station.tscn`, `park.tscn`,
  `studio.tscn`, `street.tscn`) instanced by `World` from
  `world_layout.json`'s `tile` block; doorway `Area2D`s trigger location
  transitions (M4).
- Navigation: `NavigationRegion2D` baked per location; NPC `move_to` requests
  resolve through `NavigationAgent2D`.
- Interaction: player ray/area picks the nearest `Interactable` (NPC, record
  prop, influence link marker); `interact` opens conversation or inspection.
  One shared focus-highlight shader.

## HUD behavior rules

- Conversation is modal but the world stays live behind it (NPCs keep their
  loops running — being watched *while* answering is the point).
- Suggested replies and typed input submit the displayed text into the same
  judgment path — the NPC's model reads the content either way; a subtle
  "recorded" stamp animation lands on submit (recorded-statement fiction,
  pillar 1).
- Hesitation timer runs while the panel is open; crossing the threshold emits
  the hesitation event to the runtime — visible as the NPC's patience cue.
- Every consequence surfaced within 1s of its ledger event: pressure line
  update, reaction marker, influence link, or bubble. No silent state changes.
- Native actor cards follow NPC world positions and always show identity/role
  plus current social action. Judgment reasons, provider/action source, record
  detail, and recent causality stay in inspect/ledger views. Raw ids and state
  labels are hidden unless F3 debug mode is active.

## Localization

- All player-facing strings through Godot's translation system (`ko` primary,
  `en` parity by M5); keys map to content-data ids, not hardcoded text.
- Keep v1's localization smoke concept: headless script walks every key and
  asserts both locales resolve.

## Smokes (headless, thin)

`godot/tools/` keeps the v1 smoke pattern, rebuilt for 2D:
`scene_load_smoke.gd` (all scenes instance), `route_smoke.gd` (drive the four
Same Order routes via Session API, assert terminal states), `localization_smoke.gd`,
`check_assets.gd` (third-party manifest presence). That's the full list —
resist adding more without a regression that demands it.

Normal launch defaults to HTTP/provider mode. Fixture replay is selected only
for smoke tests with `DREAM_SESSION_MODE=fixture`.

## Salvage map from v1 (`godot/` current tree)

| v1 file | Fate |
|---|---|
| `scripts/world/world_generator.gd` (981 lines, Kenney 3D placement) | Replace with `world_builder_2d.gd` reading the same layout JSON |
| `scenes/actors/npc_placeholder.tscn`, `player.tscn` (3D primitives) | Replace with 2D scenes |
| HUD scripts (conversation panel, pressure line, inspect logic) | Port logic, rebuild layout — interaction contracts unchanged |
| `tools/*_smoke.gd` | Rewrite thin per list above |
| `data/world_layout.json` | Keep; add `tile` block |
| Runtime bridge script | Keep shape (HTTP + fallback), simplify |

Delete the remaining 3D-only code in the same PR that lands the 2D rebuild —
no parallel 3D/2D trees.
