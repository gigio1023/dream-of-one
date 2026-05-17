# Developer Guide

## Setup

```bash
npm install --prefix backend/npc-runtime
/opt/homebrew/bin/godot-latest --headless --version
```

Expected Godot proof baseline for this branch is the latest published Godot
available through `/opt/homebrew/bin/godot-latest`. On 2026-05-17 that is
Godot `4.7.beta2.official.777579205`.

## Backend Checks

```bash
npm run check --prefix backend/npc-runtime
```

## Test Discipline

Tests should stay small and behavior-first. Add or keep a test only when it protects a real runtime contract, game consequence, provider boundary, Evidence shape, or regression. Avoid mock-heavy tests that mainly prove the mocked setup.

Detroit-style rule: prefer one clear end-to-end or integration check over many implementation-coupled unit checks. If a dependency must be replaced, replace only the external boundary and keep the game logic real.

## Godot Checks

```bash
/opt/homebrew/bin/godot-latest --headless --import --path godot
GODOT_PATH=/opt/homebrew/bin/godot-latest bash "$HOME/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh" godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/playable_slice_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/localization_smoke.gd
/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```

## Evidence

Generated Godot Evidence Packs:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
- `data/evidence/godot/visual-capture/contact-sheet.png`

Before marking runtime work complete, validate the backend Schema, Godot runtime smoke output, playable Evidence Pack, and visual capture.
