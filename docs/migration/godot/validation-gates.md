# Godot Validation Gates

Use `${GODOT:-godot}` for the editor-capable Godot binary. Current baseline:
Godot `4.6.2.stable.official` with Forward+ rendering and Jolt Physics.

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
- `data/evidence/godot/screenshots/main-shell.png`

Commands:

```bash
${GODOT:-godot} --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
${GODOT:-godot} --headless --path godot --script res://tools/scene_load_smoke.gd
${GODOT:-godot} --path godot --script res://tools/visual_capture.gd
```

Pass criteria:

- scene loads without errors.
- all GDScript files parse.
- player and `Camera3D` exist independently of group-count checks.
- `world_id` and `world_revision` metadata are present.
- four landmarks, four text surfaces, four NPC placeholders, three routes, and four interaction zones exist by semantic id.
- `generation_failures` is empty, so missing anchors cannot collapse content to the origin.
- screenshot artifact is created and has non-zero dimensions.

## G3 Evidence Smoke

Owner: runtime evidence executor.

Artifacts:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`

Commands:

```bash
${GODOT:-godot} --headless --path godot --script res://tools/evidence_run.gd
${GODOT:-godot} --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

Pass criteria:

- shell and runtime slice Evidence Packs are written.
- valid command execution must succeed or the smoke exits non-zero.
- invalid command, duplicate command, and unknown-zone command reject before world mutation.
- every rejected command has a deterministic fallback or explicit blocked outcome.
- runtime Evidence validates against the backend Schema.

## G4 Social Closure Slice

Owner: domain systems executor.

Required next artifacts:

- Dream Law text-surface mapping.
- Cover Test detector-trigger mapping.
- Station intake/Inquest/verdict state trace.
- generated dossier, why-line, or verdict artifact samples.
- bounded defuse/recovery option samples, if available in the slice.

Pass criteria:

- text surfaces remain visible/readable and expose Dream Law or Cover Test pressure.
- detector triggers come from runtime ObservationFrame data.
- Exposure thresholds, Station intake/Inquest, verdict, and session termination remain deterministic product-rule outcomes.
- generated artifacts reference source events and explain why the outcome occurred.
- defuse/recovery options, when present, preserve bounded player input and produce Evidence.

## Pending Gates

- Live Godot backend bridge
- Full report-intake-inquest-verdict loop
- Multi-run trajectory diversity
- exported build smoke, once export presets exist
