---

name: unity-performance-pass
description: "Performance pass: static flags, batching, LOD, occlusion, and basic profiler checks."
---

# Unity Performance Pass

## When to use
- Frame rate drops or scene grows significantly.
- Before demo or release builds.

## Workflow
1. Apply static flags to environment meshes.
2. Enable GPU instancing where appropriate.
3. Add/verify LOD groups for large meshes.
4. Check occlusion settings and bake if used.
5. Quick profiler sweep for draw calls and spikes.

## Guardrails
- Avoid over-occlusion that hides gameplay cues.
