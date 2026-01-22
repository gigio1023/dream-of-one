---
name: unity-ui-text-localization
description: UI text stability: TMP font fallback, min size, and CJK readiness for UI and debug overlays.
---

# Unity UI Text + Localization

## When to use
- UI text shows boxes for CJK languages.
- Text size is too small or inconsistent.

## Workflow
1. Ensure TMP default font asset is valid.
2. Add CJK fallback font asset (SDF).
3. Apply font and min size to all TMP_Text.
4. Rebuild meshes and verify glyph coverage.

## Guardrails
- Keep fallback list clean (no null or destroyed assets).
