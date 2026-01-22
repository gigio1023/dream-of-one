---
name: urp-material-fixer
description: Convert or fix materials for URP: detect error/legacy shaders, swap to URP Lit, preserve textures.
---

# URP Material Fixer

## When to use
- Materials appear pink/grey or use Legacy/Standard shaders.
- Upgrading assets to URP.

## Workflow
1. Scan materials under target asset root.
2. For Standard/Legacy/Error shaders, swap to URP/Lit.
3. Preserve base map/color/metallic/smoothness.
4. Save assets and refresh the database.

## Guardrails
- Never overwrite custom shaders without a backup list.
- Log all modified material paths.
