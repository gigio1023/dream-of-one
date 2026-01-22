---

name: city-pack-world-builder
description: "Build or rebuild a CITY package world: grid layout, anchor placement, scaling rules, and navmesh bake."
---

# City Pack World Builder

## When to use
- CITY package was imported or layout needs regeneration.
- Map scale or landmark placement needs adjustment.

## Workflow
1. Validate prefab paths and anchors list.
2. Expand the road/sidewalk grid for target map size.
3. Place landmarks and anchors with consistent naming.
4. Apply building scale multiplier and keep player scale fixed.
5. Bake NavMesh or trigger runtime bake.
6. Run material fixer to avoid error shaders.

## Outputs
- `CITY_Package` root with consistent anchors.

## Guardrails
- Preserve anchor names used by gameplay systems.
- Keep Y scale at 1 to avoid collider distortions.
