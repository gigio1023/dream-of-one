# Deprecated Unity Runtime (Rollback Only)

Revision date: 2026-02-17

This document is for the deprecated Unity Runtime Path.
The active Runtime Path is Mineflayer + TypeScript backend.

For the current runtime, use:
- `docs/dev.md`

## Unity project location (deprecated)
- Unity project root: `deprecated/unity/draem-of-one/`
- Scene authority: `Assets/Scenes/Prototype.unity`
- Legacy scripts: `deprecated/unity/scripts/`

## Legacy quick start (manual)
1. Open Unity Hub and add `deprecated/unity/draem-of-one/`.
2. Open `Assets/Scenes/Prototype.unity`.
3. Press Play.

## Legacy verification scripts
- `deprecated/unity/scripts/run_editor_diagnostics.sh`
- `deprecated/unity/scripts/run_playmode_smoke.sh`
- `deprecated/unity/scripts/run_all_checks.sh`
- `deprecated/unity/scripts/run_stability_trend.sh`

## Unity authoring safety (legacy-only)
- Prefer Unity Editor/AssetDatabase authoring for `.unity`, `.prefab`, `.asset`, `.meta`.
- Avoid hand-editing serialized Unity files unless explicitly approved.
- If Unity MCP is unavailable, stop Unity authoring and reconnect MCP first.
