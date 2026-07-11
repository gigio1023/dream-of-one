# Godot 2D Client

Target: Godot 4.7.x stable (current stable series; keep `GODOT_BIN` per
device). The active project under `godot/` is the M2 provider-backed client.

## Project settings

- The pixel-art world renders in a `SubViewport` whose logical view follows a
  window-height ladder (`main.gd` `WORLD_VIEW_LADDER`): 1280×720 → 320×180 at
  4×, 1920×1080 → 384×216 at 5×, 2560×1440 → 426×240 at 6× (2px side
  letterbox), 3840×2160 → 384×216 at 10×. The container applies the largest
  integer scale that fits, centered with letterboxing; output size and world
  magnification are separate domains. Locations draw a 7-tile pavement apron
  and the camera (zoom 1) clamps to it, so wide views never expose void. The
  minimum window is 1280×720.
- HUD controls render in the native window viewport. Typography scales from
  window height at regular PC density (body ≈19px at 1080p, ≈39px at 4K),
  multiplied by a user-selectable UI scale (80/100/125/150%) in the Esc
  settings sheet. This keeps text crisp and lets containers reflow
  independently from the pixel-art world. Pixel snap remains on for 2D
  transforms and vertices.
- Output preset and UI scale persist under `user://display.cfg`; the selectors
  live in the Esc settings sheet, not in permanent gameplay chrome. Automated
  visual checks may override the preset process-locally with
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
│       └── WorldViewport (SubViewport, ladder-selected logical view)
│           └── World (Node2D)
│               ├── TileMapLayers: ground / walls / furniture / overhead
│               ├── Actors (YSort via Node2D y_sort_enabled)
│               │   ├── Player (CharacterBody2D + interaction ray)
│               │   └── NPC instances (sprite, role accent, speech/reaction
│               │       presentation state, attention/sightline cue)
│               ├── RecordProps (sprite, state presentation, inspect area)
│               └── InfluenceLinks (Line2D pool, observer → reactor)
├── HUD (CanvasLayer)
│   ├── WorldTextOverlays (projected nameplate, speech/reaction/state chips)
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

- Conversation is a bottom sheet (~68% width, bottom ~36% height), not a
  modal wall: the speaker and surrounding room stay visible, while projected
  nameplates and reaction chips route around the sheet so other NPC state
  remains readable. The world stays live behind it (NPCs keep their loops
  running — being watched *while* answering is the point).
- Suggested replies and typed input submit the displayed text into the same
  judgment path — the NPC's model reads the content either way; a subtle
  "recorded" stamp animation lands on submit (recorded-statement fiction,
  pillar 1).
- Hesitation timer exists only in Station interrogation beats (≥40s, from
  the storylet's `hesitationMs`); ordinary conversation has no timer and no
  delay record (owner direction 2026-07-11). When it runs, crossing it emits
  the hesitation event — visible as the officer's patience cue.
- Every consequence surfaced within 1s of its ledger event: pressure line
  update, reaction marker, influence link, or bubble. No silent state changes.
- World-anchored native HUD overlays follow projected NPC and record-prop
  positions while remaining inside the visible room floor: quiet nameplates,
  truncated/auto-expiring speech chips, reaction chips, and focused or freshly
  changed prop-state chips. They avoid actor/prop bodies and visible HUD panels,
  so the pixel world never rasterizes Korean UI text. The social-action line
  appears for the conversation speaker, focused NPC, a recently changed action
  (~5s), and debug mode; full speech stays in inspect. Judgment reasons,
  provider/action source, record detail, and recent causality stay in
  inspect/ledger views. Provider status and fallback detail live in the Esc
  settings sheet; a small badge plus a transient line surface fallback
  honestly in normal play. Raw ids remain hidden unless F3 debug mode is active.

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
