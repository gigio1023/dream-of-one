# Validation And Evidence

## Required Local Commands

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

## Required Artifacts

| Artifact | Owner | Purpose |
|---|---|---|
| `data/evidence/godot/shell/dre_171_shell_evidence.json` | Godot shell tools | Generated scene and text-surface evidence. |
| `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json` | Godot runtime slice | Schema, command, fallback, and Station intake evidence. |
| `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json` | Playable session smoke | HUD/gameplay loop, Cover Test, Exposure, and Station threshold evidence. |
| `data/evidence/godot/screenshots/main-shell.png` | Visual capture | Runtime screenshot proving the opening view is non-empty and guided. |
| `data/evidence/godot/screenshots/playable-verdict.png` | Visual capture | Runtime screenshot proving the playable loop reaches visible verdict feedback. |

## Pass Criteria

- Scene smoke passes with no `generation_failures`.
- Playable smoke reaches verdict-ready state through deterministic Cover Test inputs.
- HUD exists and exposes objective, focus prompt, Exposure, Station state, and Evidence feed.
- Visual capture produces non-empty `1280x720` opening and verdict screenshots.
- Backend checks pass.

## Failure Criteria

- Godot launches with no visible objective or feedback.
- Player can trigger Cover Test pressure without a why-line.
- Exposure, Station intake, Inquest, verdict, or session termination are described as physics-deterministic.
- Missing anchors or missing text surfaces are downgraded to warnings.
- Any generated Evidence Pack fails backend Schema validation.
