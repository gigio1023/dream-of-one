---
name: dreamofone-linear-issue
description: Create a high-signal Linear issue for Dream of One with goal, AC, scope, constraints, verification, and correct routing labels.
---

# Dream of One Linear Issue

Include:

- Goal
- Scope
- Do-not list
- Acceptance Criteria
- Verification commands
- Handoff artifacts

Prefer these verification commands for Godot migration work:

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```
