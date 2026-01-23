# Project Status (2026-01-23)

_Archived snapshot. For current scope/roadmap, see `project.md`._

## Summary
- The playable scene is **Prototype** with a runnable core loop (suspicions, events, prompts) and runtime-generated interiors.
- NPC population is enforced at runtime to avoid empty streets, with basic patrol/police behavior and portal visits.
- UI layout is stabilized; extended/debug overlays are hidden by default.

## Playable Loop
- Session starts with a goal prompt and toast guidance.
- Session ends when any of these conditions are met:
  - Time limit (12 minutes).
  - Global suspicion (G) reaches 0.65.
  - Verdict event is recorded.
- On session end, player input and NPC AI stop, and a final prompt/toast is shown.

## World & Scene
- Playable scene: `draem-of-one/Assets/Scenes/Prototype.unity`.
- Rendering: URP asset at `draem-of-one/Assets/Settings/UniversalRP.asset` with renderer `draem-of-one/Assets/Settings/UniversalRenderer.asset`.
- Runtime helpers expected in scene:
  - `RuntimeNavMeshBaker` (builds NavMesh at play).
  - `UILayouter` (HUD layout at runtime).

## Interiors & Portals
- Interiors are generated at runtime by `InteriorBootstrap`.
- Each interior is a simple boxed room with a doorway opening; interiors are placed in a separate area (offset in world space).
- Exterior portal triggers are placed near `CITY_Anchors` for these buildings:
  - StoreBuilding
  - StudioBuilding_L1
  - Cafe
  - Station
  - Facility
- Portals are two-way; NPCs auto-return after a short delay.
- Inside portals disable NavMeshAgent and AI components, then restore on exit.

## NPC Population & Behavior
- Runtime population enforcement (`NpcPopulationBootstrap`):
  - Target minimums: 6 citizens, 1 police officer.
  - Existing NPCs are scaled down and warped onto NavMesh.
  - Missing NPCs are spawned as capsules with basic AI components.
- Spawn points are clustered around the player or `CITY_Anchors`.
- NPCs can enter interiors via portal routines.

## Player Scale & Colliders
- Player and NPCs are scaled down (0.8) in the scene to better match the city scale.
- Character and capsule colliders were resized to match the new scale.

## UI State
- Core HUD elements (G bar, event log, prompt, toast) are positioned consistently by `UILayouter`.
- Extended HUD blocks (controls, cover, case, blackboard) are hidden by default.
- Blackboard debug overlay is disabled by default.

## Diagnostics
- Use **Tools > DreamOfOne > Run Diagnostics** in Unity to validate runtime state.
- The expectation is a clean console after diagnostics.

## Known Gaps / Risks
- Interiors are placeholder geometry; no bespoke interior assets or lighting.
- Building exteriors do not have real door meshes; portal markers represent entry points.
- NPC spawns are procedural capsules when missing, not authored prefabs.
- Jump is not implemented for the player or NPCs.
- NavMesh accuracy depends on RuntimeNavMeshBaker and current city mesh state.

## Next Candidate Improvements
- Replace procedural interiors with authored assets and lighting.
- Add a true entry marker or doorway mesh per building.
- Replace procedural NPC capsules with proper prefabs/animations.
- Implement player jump and NPC step-up/obstacle logic if needed.
- Revisit HUD/UX to align with final game feel.
