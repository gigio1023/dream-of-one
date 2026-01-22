---
name: unity-asset-import-pipeline
description: Asset import workflow: validate scale, materials, missing scripts, and prefab integrity after imports.
---

# Unity Asset Import Pipeline

## When to use
- New asset package imported.
- Visual glitches or missing references appear.

## Workflow
1. Scan imported prefabs/materials/textures.
2. Validate scale and unit consistency.
3. Fix missing scripts and broken prefab references.
4. Convert materials to target pipeline (URP/HDRP).
5. Reimport and resave assets as needed.

## Guardrails
- Keep a list of modified assets for rollback.
