---

name: unity-scene-bootstrap
description: "Ensure scenes have baseline objects: camera, lights, UI root, systems root, and anchors."
---

# Unity Scene Bootstrap

## When to use
- Scene loads empty or missing required systems.
- Runtime bootstrap should fill gaps.

## Workflow
1. Ensure MainCamera exists with follow rig.
2. Ensure Directional Light and ambient settings.
3. Ensure UI root and event/log displays.
4. Ensure Systems root (log, shaper, gossip, etc.).
5. Verify anchors used by gameplay systems.

## Guardrails
- Only create missing objects; do not duplicate existing ones.
