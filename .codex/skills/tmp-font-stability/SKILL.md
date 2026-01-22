---
name: tmp-font-stability
description: Stabilize TMP fonts: generate SDF assets, validate atlas textures, and enforce fallback chains (CJK-safe).
---

# TMP Font Stability

## When to use
- Hangul or CJK glyphs appear as boxes.
- TMP throws MissingReferenceException for atlas textures.

## Workflow
1. Ensure the source font file exists in Resources.
2. Generate TMP SDF asset if missing/invalid.
3. Validate atlas textures and material pointers.
4. Set TMP default and fallback list, remove invalid entries.
5. Apply font to all TMP_Text (min size enforced).

## Guardrails
- Avoid creating runtime fallback assets in edit mode.
- Treat missing atlas textures as hard errors.
