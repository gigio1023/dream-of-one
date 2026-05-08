# Playable Rebuild Execution Plan

## Goal

Build the first playable Godot 4.x 3D social-stealth technical proof on top of the current runtime shell.

## Architecture

Use Godot-native composition: `main.tscn` owns scene instances, `WorldShell` owns generated semantic world content, `PlayableSession` owns scene-local prototype gameplay state, and `SocialStealthHud` owns player-facing status. Backend authority remains TypeScript; Godot prototype logic exists to make the first slice playable before the live bridge.

## Tech Stack

- Godot `4.6.2`
- GDScript
- `CharacterBody3D`, `Area3D`, `CanvasLayer`, `Control`
- TypeScript backend Schema validation

## Task 1: Visible Launch State

Files:

- Modify: `godot/project.godot`
- Modify: `godot/scenes/main.tscn`
- Create: `godot/scenes/ui/social_stealth_hud.tscn`
- Create: `godot/scripts/ui/social_stealth_hud.gd`

Acceptance:

- Running the project shows HUD, objective, Exposure, Station state, focus prompt, and Evidence feed.
- Running the visual capture shows both opening state and verdict outcome state.
- Input actions exist for `interact` and four speech acts.
- HUD uses `Control` containers rather than manual absolute layout.

Verification:

```bash
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

## Task 2: Playable Text And Cover Test Loop

Files:

- Create: `godot/scripts/runtime/playable_session.gd`
- Modify: `godot/scenes/main.tscn`
- Modify: `godot/scripts/world/text_surface.gd`

Acceptance:

- Player can focus nearest text surface or interaction zone.
- `interact` records a read Evidence event for text surfaces.
- Speech choices evaluate the active Cover Test.
- HUD reports active rule text, NPC/Station pressure, why-lines, Exposure deltas, and verdict outcome.

Verification:

```bash
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
```

## Task 3: Station Prototype End-State

Files:

- Modify: `godot/scripts/runtime/playable_session.gd`
- Create: `godot/tools/playable_slice_smoke.gd`
- Modify: `docs/runtime/godot/validation-gates.md`

Acceptance:

- Exposure threshold `60` opens Station intake.
- Threshold `80` opens Inquest.
- Threshold `100` marks verdict ready and session termination allowed.
- `CT_STATION_SOFT_INQUEST` with `SA_BREAK` emits deterministic policy rejection why-line.
- Verdict-ready state shows a centered outcome panel and is captured at `data/evidence/godot/screenshots/playable-verdict.png`.

Verification:

```bash
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Task 4: Evidence And Docs

Files:

- Modify: `README.md`
- Modify: `plan.md`
- Modify: `docs/runtime/godot/README.md`
- Modify: `docs/runtime/godot/validation-gates.md`

Acceptance:

- README explains how to run the playable slice.
- Migration docs link to this rebuild plan.
- Validation gates include playable smoke and visual capture.

Verification:

```bash
rg -n "playable|Playable|playable_slice_smoke|SocialStealthHud" README.md plan.md docs/runtime/godot godot
```
