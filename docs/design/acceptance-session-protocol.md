# Acceptance Session Protocol

## Required Commands

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

## Required Artifacts

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`

## Acceptance Criteria

- Backend tests pass.
- Godot scene loads in headless smoke.
- Evidence Packs validate against Schema.
- Text-pressure surfaces include Dream Law and Cover Test ids.
- Rejected commands produce deterministic Fallback Path Evidence.
