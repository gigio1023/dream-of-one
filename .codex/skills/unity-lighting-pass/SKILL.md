---

name: unity-lighting-pass
description: "Lighting pass for clarity: directional light, ambient, reflection probes, and shadow distance tuning."
---

# Unity Lighting Pass

## When to use
- Scene visibility is flat/dark/overexposed.
- Assets appear unlit or hard to read.

## Workflow
1. Ensure a single key directional light.
2. Set ambient mode/color for readability.
3. Add reflection probe for metallic assets.
4. Tune shadow distance and softness.

## Guardrails
- Avoid multiple directional lights.
- Keep ambient within reasonable RGB range.
