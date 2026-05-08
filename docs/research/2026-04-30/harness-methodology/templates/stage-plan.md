# Stage Plan

Stage:
Status:
Owner:
Last Updated:

## Goal

What this stage proves.

## Scope

In:
-

Out:
-

## Required Inputs

-

## Deliverables

-

## Role Reviews Required

| Role | Required | Result | Link |
|---|---:|---|---|
| Game Director | yes |  |  |
| Narrative Design | yes |  |  |
| Systems Design | yes |  |  |
| Level Design |  |  |  |
| Godot Runtime |  |  |  |
| QA / Playtest | yes |  |  |
| Art / Audio / Game Feel |  |  |  |
| Release Producer |  |  |  |

## Acceptance Criteria

-

## Verification Commands

```bash
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Evidence Artifacts

-

## Exit Gate

This stage can close only when:
- all required role reviews are not `BLOCK`.
- all required verification evidence exists.
- drift log has no unresolved seed contradiction.
