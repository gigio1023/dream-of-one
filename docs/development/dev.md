# Developer Guide

## Setup

```bash
npm install --prefix backend/npc-runtime
$GODOT_BIN --headless --version
```

Expected Godot proof baseline for this branch is the latest published Godot
available through the current machine's `GODOT_BIN`. The latest published proof
used Godot `4.7.beta2.official.777579205` on 2026-05-17.

## Backend Checks

```bash
npm run check --prefix backend/npc-runtime
```

## AI Provider Runtime

The active game LLM path is documented in
[AI Provider Runtime](ai-provider-runtime.md). In this repo, "Codex auth" for
gameplay means the backend `openai-codex` provider profile, not Codex CLI login.
Check the provider auth store and backend smoke before starting any login flow.

## Test Discipline

Tests should stay small and behavior-first. Add or keep a test only when it protects a real runtime contract, game consequence, provider boundary, Evidence shape, or regression. Avoid mock-heavy tests that mainly prove the mocked setup.

Detroit-style rule: prefer one clear end-to-end or integration check over many implementation-coupled unit checks. If a dependency must be replaced, replace only the external boundary and keep the game logic real.

## Godot Checks

```bash
$GODOT_BIN --headless --import --path godot
GODOT_PATH="$GODOT_BIN" bash "$GODOT_BEST_PRACTICE_SKILL/scripts/check_gd_syntax.sh" godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/evidence_run.gd
$GODOT_BIN --headless --path godot --script res://tools/runtime_slice_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/playable_slice_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/localization_smoke.gd
$GODOT_BIN --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```

## Evidence

Generated Godot Evidence Packs:

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
- `data/evidence/godot/visual-capture/contact-sheet.png`

Before marking runtime work complete, validate the backend Schema, Godot runtime smoke output, playable Evidence Pack, and visual capture.
