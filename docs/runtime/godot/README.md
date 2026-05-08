# Godot Runtime Path

This directory documents the active Godot 4.x runtime path for Dream of One.

The directory began as migration/cutover work. The Godot path is now active, so these files are runtime and validation references rather than a competing migration plan.

## Documents

| File | Use |
|---|---|
| [overlay.md](overlay.md) | Runtime overlay and authority map. |
| [target-godot-architecture.md](target-godot-architecture.md) | Godot ownership, deterministic boundary, and component responsibilities. |
| [schema-and-action-specification.md](schema-and-action-specification.md) | ObservationFrame and NpcCommandEnvelope Schema semantics. |
| [validation-gates.md](validation-gates.md) | Required verification gates, artifacts, owners, and pass/fail criteria. |
| [linear-issue-breakdown.md](linear-issue-breakdown.md) | Executor-ready issue plan for runtime work. |
| [parity-matrix.md](parity-matrix.md) | Runtime parity status. |
| [evidence-cutover.md](evidence-cutover.md) | Evidence artifact ownership and cutover requirements. |
| [inventory.md](inventory.md) | Runtime inventory. |
| [playable-rebuild](playable-rebuild/README.md) | Playable 3D social-stealth rebuild notes and validation plans. |

## Boundary

Godot owns scene presentation, dialogue UI, input capture, visual state, collision/navigation observations, and screenshot capture.

The TypeScript backend owns Schema validation, deterministic suspicion signals, reports, fallback selection, Evidence semantics, Station intake/inquest/verdict authority, and session termination.

AI/API providers may propose wording only after runtime preflight and model availability checks pass.
