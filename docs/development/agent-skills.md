# Agent Skills

Repo-local skills cover Linear, PR lifecycle, and planning workflows. Godot implementation should use the installed `godot-best-practice` skill from the user skill registry.

Active repo skills live under `.codex/skills/` and should not reintroduce legacy engine assumptions.

Recommended checks for Godot work:

```bash
npm run check --prefix backend/npc-runtime
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
```
