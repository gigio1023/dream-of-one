# Developer Guide

## Setup

```bash
npm install --prefix backend/npc-runtime
godot --headless --version
```

Expected Godot baseline for this branch is Godot 4.6.x.

## Backend Checks

```bash
npm run check --prefix backend/npc-runtime
```

## Godot Checks

```bash
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

## Evidence

Generated Godot Evidence Packs:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
- `data/evidence/godot/visual-capture/contact-sheet.png`

Before marking runtime work complete, validate the backend Schema, Godot runtime smoke output, playable Evidence Pack, and visual capture.
