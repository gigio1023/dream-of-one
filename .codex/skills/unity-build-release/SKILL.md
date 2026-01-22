---
name: unity-build-release
description: Build/release workflow: player settings, versioning, build targets, and post-build smoke checks.
---

# Unity Build + Release

## When to use
- Creating a demo build or release candidate.

## Workflow
1. Verify player settings (company, product, version).
2. Confirm build target and scenes list.
3. Run preflight + playmode smoke tests.
4. Build to versioned output directory.
5. Record build metadata and errors.

## Guardrails
- Never ship with unresolved console errors.
