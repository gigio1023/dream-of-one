# Acceptance Session Protocol

## Required Commands

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

## Required Artifacts

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
- `data/evidence/godot/screenshots/main-shell.png`
- `data/evidence/godot/screenshots/playable-verdict.png`

## Acceptance Criteria

- Backend tests pass.
- Godot scene loads in headless smoke.
- Evidence Packs validate against Schema.
- Text-pressure surfaces include Dream Law and Cover Test ids.
- Rejected commands produce deterministic Fallback Path Evidence.
- Playable slice proves a player can read a rule, trigger a Cover Test, change Exposure, open Station states, and reach a visible defuse or verdict-ready state.
- Korean-first HUD and text surfaces can switch to English without losing Station, Cover Test, or why-line meaning.
- Visual capture proves opening and verdict states are readable, not just non-empty.
