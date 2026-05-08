# Target Godot Architecture

## Runtime Boundary

Godot is the client/world runtime. It owns visible 3D scene state, player and NPC body placement, physics/collision observations, text-surface visibility, interaction zones, and command execution outcomes.

Godot does not own deterministic end-state adjudication. The TypeScript backend and deterministic product-rule controller own Schema validation, policy rejection, Exposure threshold crossing, Station intake/Inquest transitions, verdict readiness, and session termination.

## Runtime Path

```text
Godot ObservationFrame
  -> TypeScript backend Schema validation
  -> deterministic product-rule controller
  -> bounded AI/LLM intent proposal
  -> TypeScript backend NpcCommandEnvelope validation
  -> Godot bounded command executor
  -> Evidence Pack export and validation
```

AI/LLM output remains intent proposal only. No AI/LLM response may directly mutate Godot world state.

## Godot Components

| Component | Godot shape | Responsibility |
|---|---|---|
| Runtime shell | `scenes/main.tscn` and `WorldShell` | scene lifecycle, layout loading, world metadata |
| Player | `CharacterBody3D` | player movement, camera, safe spawn |
| NPC placeholder | `CharacterBody3D` | visible actor body and command execution target |
| World generator | GDScript from `world_layout.json` | semantic landmarks, anchors, routes, zones, text surfaces |
| Shell inspector | GDScript smoke tool | semantic group counts, player/camera/world metadata, generation failures |
| Runtime slice | GDScript smoke/runtime helper | Godot-side command parity guard and bounded movement execution |
| Backend Schema | TypeScript | authoritative ObservationFrame, command, and Evidence Pack validation |
| Domain controller | TypeScript/product rules | Exposure, Station intake/Inquest, verdict, session termination |

## Determinism Boundary

Do not promise deterministic physics. Godot 4.6 projects may use Jolt Physics, and physics/navigation outcomes should be treated as observed runtime results.

Deterministic:

- Schema validation.
- command admission and rejection.
- one-command-per-actor and duplicate command handling.
- fallback selection.
- Exposure threshold evaluation.
- Station intake/Inquest/verdict/session termination.
- Evidence event vocabulary and summary calculation.

Observed and bounded:

- collision checks.
- body movement.
- path detail.
- frame timing.
- renderer output.

## 3D Layout Rule

Do not hand-place the playable world from raw coordinates alone. `world_layout.json` must keep named landmarks, anchors, routes, zones, actors, and text surfaces. Missing semantic anchors fail shell validation through `generation_failures`; they must not silently place generated objects at the origin.
