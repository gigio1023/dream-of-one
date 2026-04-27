# Godot Migration Plan

## Immediate PR Scope

- Keep Godot 4.x as the only engine runtime in the repository.
- Keep TypeScript NPC backend as the deterministic policy, scheduling, fallback, and Evidence layer.
- Remove legacy engine/runtime archives, tools, skills, CI gates, and documentation references.
- Validate the current Godot 3D shell and runtime slice with reproducible commands.

## Remaining Execution Slices

1. Live Godot backend bridge: connect Godot ObservationFrame emission and NpcCommandEnvelope execution to backend APIs.
2. Full domain controller: implement report, Station intake, inquest, verdict, and session termination in Godot runtime code.
3. Evidence cutover: produce release-comparable Godot Evidence Packs for multiple full runs.
4. Trajectory diversity: verify three non-identical but valid social trajectories.
5. Visual/playable pass: capture desktop/mobile screenshots or run artifacts for the 3D scene and text-pressure surfaces.

## Gate

Do not call the migration complete until backend checks, Godot headless checks, Evidence validation, repository legacy search, and playable domain-loop verification all pass.
