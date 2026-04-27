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
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

## Evidence

Generated Godot Evidence Packs:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`

Before marking migration work complete, validate both the backend Schema and Godot runtime smoke output.
