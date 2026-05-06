# Dirty Worktree Scope

Recorded: 2026-04-30

## Summary

The worktree already contains many modified and untracked files from prior Godot migration/playable work. M1 implementation must treat them as existing user/project work and must not revert them.

## M1-Critical Dirty Paths

These paths overlap with likely M1 implementation:
- `godot/data/world_layout.json`
- `godot/scenes/main.tscn`
- `godot/scripts/runtime/runtime_slice.gd`
- `godot/scripts/world/text_surface.gd`
- `godot/scripts/ui/`
- `godot/scripts/runtime/playable_session.gd`
- `godot/tools/evidence_run.gd`
- `godot/tools/runtime_slice_smoke.gd`
- `godot/tools/playable_slice_smoke.gd`
- `godot/tools/visual_capture.gd`
- `data/evidence/godot/`

Backend runtime paths are currently not listed as dirty in `git status --short`, so backend M1 fixture/schema work is lower conflict risk.

## Implementation Rule

Before editing a dirty M1-critical file:
- inspect the current file.
- identify whether the existing change is needed by M1.
- edit forward without reverting.
- record touched paths in the handoff.

## Recommended First Implementation Slice

Start with backend fixture/test work:
- `backend/npc-runtime/test/integration/m1-protocol-proof.integration.test.ts`

Then wire Godot evidence output only after backend expected state is explicit.

## Current Readiness Effect

Dirty worktree is recorded. M1 implementation may start only with narrow file ownership and no unrelated cleanup.
