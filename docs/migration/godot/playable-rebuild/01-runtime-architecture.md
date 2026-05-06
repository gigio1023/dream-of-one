# Runtime Architecture

## Goal

Make `godot --path godot` launch into a visibly playable 3D social-stealth slice instead of a static migration shell.

## Godot Shape

| Unit | Godot form | Responsibility |
|---|---|---|
| Main scene | `godot/scenes/main.tscn` | Compose world, player, HUD, and scene-local gameplay coordinator. |
| World shell | `godot/scripts/world/world_shell.gd` | Load semantic layout and generate landmarks, anchors, routes, zones, NPCs, and text surfaces. |
| Player | `CharacterBody3D` scene | Movement, camera, collision observations, and stable player group membership. |
| Text surface | `Area3D` scene | In-world Dream Law/Cover Test text plus metadata for observations and Evidence. |
| Playable session | `Node` script | Scene-local deterministic prototype loop: focus selection, readable surfaces, bounded speech acts, Exposure, Station flags, and HUD state. |
| HUD | `CanvasLayer` + `Control` scene | Objective, focus prompt, Exposure, Station state, speech choices, and Evidence feed. |
| Backend runtime | TypeScript | Authoritative Schema validation, command admission/rejection, fallback, Evidence Pack validation, and final domain authority. |

## Godot Best-Practice Decisions

- Keep reusable units as scenes, not one giant `main.tscn`.
- Keep gameplay behavior in scripts, not serialized scene data.
- Use groups for broad discovery: `player`, `text_surfaces`, `interaction_zones`, `npc_placeholders`.
- Use project input actions for player interaction: `interact`, `speech_comply`, `speech_inquire`, `speech_frame`, `speech_break`.
- Use scene-local coordinator before adding autoloads. The playable slice resets with the scene and does not need global lifetime yet.
- Use semantic layout data for world placement. Do not hand-place gameplay content from raw coordinates outside `world_layout.json`.

## Authority Boundary

The first playable slice includes a deterministic Godot-side prototype controller so the game is playable before the live bridge is complete. This controller is not final product authority.

Final authority remains:

- Backend/product rules: Schema validation, Exposure thresholds, Station intake/Inquest, verdict readiness, session termination, fallback selection, Evidence semantics.
- Godot: player input, 3D presentation, observed collision/navigation result, focus detection, HUD, and local command execution outcome.

## Event Flow

```text
Player moves in 3D
  -> PlayableSession finds nearest text surface or interaction zone
  -> HUD shows focus prompt and bounded speech choices
  -> Player reads text or selects a speech act
  -> PlayableSession updates prototype Exposure and Station flags
  -> HUD records why-line and Evidence summary
  -> Future bridge emits ObservationFrame to TypeScript backend
```

## Future Bridge Shape

The bridge should not let AI output mutate Godot state directly.

```text
Godot ObservationFrame
  -> TypeScript validateGodotObservationFrame
  -> deterministic domain controller
  -> bounded AI intent proposal
  -> TypeScript validateGodotNpcCommandEnvelope
  -> Godot command executor
  -> Evidence Pack
```
