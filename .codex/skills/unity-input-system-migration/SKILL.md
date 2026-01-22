---

name: unity-input-system-migration
description: "Migrate or guard input usage: detect legacy Input, switch to Input System, and add action map bindings."
---

# Unity Input System Migration

## When to use
- Project switches to Input System package.
- Legacy Input usage causes runtime exceptions.

## Workflow
1. Scan scripts for Input.* usage.
2. Add ENABLE_INPUT_SYSTEM guards or convert to actions.
3. Create/validate InputAction assets.
4. Update player/camera input bindings.

## Guardrails
- Do not mix unguarded legacy Input with Input System only mode.
