# Agent Runbook

## Loop

1. Pick or create one Linear issue.
2. Create Beads tasks for atomic local work.
3. Implement against the Godot Runtime Path.
4. Run backend and Godot checks.
5. Record Evidence paths and close the Beads task.

## Required Checks

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

## Routing

- Local Godot work: use Codex locally with Godot CLI checks.
- Backend/docs work: cloud-safe if it does not require local Godot import artifacts.
- Historical engine behavior: use git history, not active-tree archive files.
