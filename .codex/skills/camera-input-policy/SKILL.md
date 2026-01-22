---

name: camera-input-policy
description: "Enforce camera and input behavior: fixed baseline, mouse/arrow rotation only, no auto-yaw on movement."
---

# Camera + Input Policy

## When to use
- Player reports camera drifting or auto-rotating.
- Need consistent third-person view controls.

## Workflow
1. Disable auto-yaw from movement.
2. Allow mouse (RMB) and arrow keys to rotate camera.
3. Clamp pitch and enforce distance limits.
4. Keep player rotation disabled unless explicitly needed.

## Guardrails
- Input must be guarded for Input System vs Legacy Input.
- Prompt UI should reflect current controls.
