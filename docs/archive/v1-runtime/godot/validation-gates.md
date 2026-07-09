# Godot Validation Gates

Use `$GODOT_BIN` for the editor-capable Godot binary. Current proof baseline:
Godot `4.7.beta2.official.777579205` with Forward+ rendering and Jolt Physics.

## G1 Backend Schema

Owner: backend Schema executor.

Artifacts:

- `backend/npc-runtime/src/godot/runtime-schema.ts`
- Godot runtime Evidence Pack fixtures under `data/evidence/godot/`

Command:

```bash
npm run check --prefix backend/npc-runtime
```

Pass criteria:

- TypeScript build passes.
- Backend integration tests pass.
- valid Godot Evidence Packs validate against the backend Schema.
- invalid command semantics reject duplicate command IDs, unknown actors, unknown zones, and wrong world/session IDs with concrete Reason Codes.

## G2 Godot Import And Scene Smoke

Owner: Godot runtime executor.

Artifacts:

- `godot/project.godot`
- `godot/scenes/main.tscn`
- `godot/data/world_layout.json`
- `godot/assets/kenney/README.md`
- `data/evidence/godot/screenshots/main-shell.png`
- `data/evidence/godot/screenshots/playable-verdict.png`

Commands:

```bash
$GODOT_BIN --headless --import --path godot
GODOT_PATH="$GODOT_BIN" bash "$GODOT_BEST_PRACTICE_SKILL/scripts/check_gd_syntax.sh" godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/playable_slice_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/localization_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/keyboard_look_smoke.gd
$GODOT_BIN --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```

Visual capture must run with a renderer-capable Godot binary. It writes JSON to stdout with the expected `1280x720` viewport, artifact roles, and a pointer to `godot/assets/kenney/README.md` for free-asset source and license evidence.

Pass criteria:

- scene loads without errors.
- all GDScript files parse.
- HUD, objective, focus prompt, and playable session coordinator exist.
- HUD starts in Korean and can switch player-facing text to English.
- arrow-key look changes player yaw and camera pitch without a mouse.
- player and `Camera3D` exist independently of group-count checks.
- `world_id` and `world_revision` metadata are present.
- four landmarks, four text panels, four NPC placeholders, three routes, and four interaction zones exist by semantic id.
- at least one hundred free visual assets are loaded from `godot/assets/kenney/`.
- free visual assets are Kenney CC0 City Kit Roads, Commercial, and Suburban subsets documented in `godot/assets/kenney/README.md`; original license files remain preserved in each pack folder.
- `generation_failures` is empty, so missing anchors cannot collapse content to the origin.
- opening and verdict screenshot artifacts are created at `1280x720` and have non-zero image data.
- `main-shell.png` shows the opening shell with visible HUD guidance, readable text-panel pressure, and free-asset city dressing.
- `playable-verdict.png` shows the bounded speech-act loop reaching visible verdict feedback with Exposure, Station state, verdict, and why-line UI still legible.

## G3 Evidence Smoke

Owner: runtime evidence executor.

Artifacts:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`

Commands:

```bash
$GODOT_BIN --headless --path godot --script res://tools/evidence_run.gd
$GODOT_BIN --headless --path godot --script res://tools/runtime_slice_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/playable_slice_smoke.gd
```

Pass criteria:

- shell and runtime slice Evidence Packs are written.
- valid command execution must succeed or the smoke exits non-zero.
- invalid command, duplicate command, and unknown-zone command reject before world mutation.
- every rejected command has a deterministic fallback or explicit blocked outcome.
- runtime Evidence validates against the backend Schema.
- playable smoke reaches verdict-ready state through bounded speech-act inputs.
- playable smoke writes Cover Test, Exposure, Station threshold, and why-line Evidence.

## G4 Social Closure Slice

Owner: domain systems executor.

Required next artifacts:

- Dream Law text-panel mapping.
- Cover Test detector-trigger mapping.
- Station intake/Inquest/verdict state trace.
- generated dossier, why-line, or verdict artifact samples.
- bounded defuse/recovery option samples, if available in the slice.

Pass criteria:

- text panels remain visible/readable and expose Dream Law or Cover Test pressure.
- detector triggers come from runtime ObservationFrame data or the documented Godot playable prototype pending live bridge.
- Exposure thresholds, Station intake/Inquest, verdict, and session termination remain deterministic product-rule outcomes.
- generated artifacts reference source events and explain why the outcome occurred.
- defuse/recovery options, when present, preserve bounded player input and produce Evidence.

## Pending Gates

- Live Godot backend bridge
- Backend-authoritative report-intake-inquest-verdict loop
- Multi-run trajectory diversity
- exported build smoke, once export presets exist
