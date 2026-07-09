# Linear Issue Breakdown

Dream of One migration work is project-scoped and tracked through Linear. Do not put these issue bodies in reusable agent skills.

Every migration issue must be executable by one agent without hidden context.

## Required Issue Shape

````markdown
## Goal
[One observable outcome.]

## Source Docs
- project.md
- docs/runtime/godot/overlay.md
- docs/runtime/godot/validation-gates.md
- [one relevant design doc or Godot doc]

## Scope
- [exact files, directories, scenes, schemas, or systems]

## Do Not
- [explicit non-goals and authority boundaries]

## Acceptance Criteria
- [measurable behavior]
- [artifact path]
- [pass/fail threshold]

## Verification
```bash
[commands]
````

## Handoff Artifacts
- [Evidence Packs, screenshots, logs, fixture paths, residual risks]
```

## Executor-Ready Issues

### 1. Godot Shell Gate

Goal: keep the Godot 3D shell loadable, inspectable, and visually evidenced.

Scope:

- `godot/project.godot`
- `godot/scenes/main.tscn`
- `godot/data/world_layout.json`
- `godot/scripts/world/*`
- `godot/scripts/tools/shell_inspector.gd`
- `godot/tools/scene_load_smoke.gd`
- `godot/tools/visual_capture.gd`

Do Not:

- move Exposure, Station intake/Inquest, verdict, or session termination into Godot scene scripts.
- hand-place generated content outside `world_layout.json` and generator code.

Acceptance Criteria:

- scene loads.
- player and `Camera3D` exist.
- semantic landmark, route, zone, actor, and text-surface counts match `ShellSchema`.
- `generation_failures` is empty.
- screenshot artifact exists at `data/evidence/godot/screenshots/main-shell.png` and is non-empty.

Verification:

```bash
$GODOT_BIN --headless --import --path godot
GODOT_PATH="$GODOT_BIN" bash "$GODOT_BEST_PRACTICE_SKILL/scripts/check_gd_syntax.sh" godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
$GODOT_BIN --path godot --script res://tools/visual_capture.gd
```

Handoff Artifacts:

- scene smoke JSON output.
- screenshot path.
- changed layout/generator files.

### 2. Runtime Schema And Command Gate

Goal: preserve backend Schema authority while allowing Godot to reject unsafe commands before world mutation.

Scope:

- `backend/npc-runtime/src/godot/runtime-schema.ts`
- `backend/npc-runtime/test/integration/godot-runtime-schema.integration.test.ts`
- `godot/scripts/runtime/runtime_slice.gd`
- `godot/tools/runtime_slice_smoke.gd`

Do Not:

- let Godot accept commands the backend rejects.
- bypass `CharacterBody3D` movement for NPC command execution.
- allow AI/LLM output to mutate Godot state directly.

Acceptance Criteria:

- valid command executes.
- invalid actor rejects.
- duplicate command rejects.
- unknown zone rejects.
- rejected commands produce Reason Codes and deterministic fallback.
- runtime Evidence Pack validates against backend Schema.

Verification:

```bash
npm run check --prefix backend/npc-runtime
${GODOT:-godot} --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

Handoff Artifacts:

- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- backend test output.
- Godot smoke output.

### 3. Social Closure Slice

Goal: implement the first complete deterministic report-intake-Inquest-verdict slice after the shell and runtime command gates are stable.

Scope:

- deterministic product-rule controller.
- backend Evidence export.
- Godot ObservationFrame inputs.
- Dream Law and Cover Test mappings.

Do Not:

- use LLM judgment for Exposure thresholds, verdict, or session termination.
- hide Dream Law/Cover Test pressure in prose-only design docs.

Acceptance Criteria:

- Dream Law text surfaces are visible/readable.
- Cover Test detector triggers are derived from ObservationFrame data.
- escalation ladder is deterministic.
- generated artifacts include dossier, why-line, and verdict sample.
- defuse/recovery options preserve bounded player input.
- Evidence explains why the outcome occurred.

Verification:

```bash
npm run check --prefix backend/npc-runtime
${GODOT:-godot} --headless --path godot --script res://tools/evidence_run.gd
${GODOT:-godot} --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

Handoff Artifacts:

- Evidence Pack.
- screenshot or recording.
- generated artifact samples.
- residual risks.
