# Godot Migration Overlay

This overlay defines the active Godot Runtime Path after the repository cleanup.

## Authority

| Area | Owner |
|---|---|
| 3D scene, player/NPC placement, in-world text panels, routes, zones | Godot |
| ObservationFrame and NpcCommandEnvelope Schema | TypeScript backend; Godot may run a parity validator but must not loosen backend semantics |
| command execution outcome | Godot executor observes physics/navigation and reports bounded results |
| Exposure thresholds, Station intake, Inquest, verdict, session termination | deterministic product-rule controller |
| Evidence Pack validation | TypeScript backend |

Godot does not own end-state adjudication. It provides motion, physics,
perception, in-world text visibility, interaction zones, and command outcome
observations. The deterministic product-rule controller owns Exposure threshold
crossing, Station intake/Inquest transitions, verdict readiness, and session
termination.

## Current Evidence

- Shell: `data/evidence/godot/shell/dre_171_shell_evidence.json`
- Runtime slice: `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`

## Required Checks

```bash
npm run check --prefix backend/npc-runtime
/opt/homebrew/bin/godot-latest --headless --import --path godot
GODOT_PATH=/opt/homebrew/bin/godot-latest bash "$HOME/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh" godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd
/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```
