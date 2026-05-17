# Evidence Contract

## M1 Evidence Bundle

All M1 implementation work must produce a bundle with these parts.

## Command Evidence

Required:

```bash
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Runtime Evidence

Required fields:
- run id.
- player response id.
- text risk tag.
- Evidence id.
- why-line.
- Exposure before.
- Exposure after.
- fallback used.
- provider mode.
- provider preflight result.
- checked model ids.
- selected model id when available.
- deterministic fallback reason when provider is unavailable.

## Visual Evidence

Required:
- screenshot showing Station prompt.
- screenshot or capture showing consequence.
- Korean text visible.
- English selectable path verified or noted as not part of M1.

## Playability Evidence

Required:
- input path.
- expected player interpretation.
- observed or proxy-observed confusion point.

## Pass/Fail Rule

M1 fails if:
- Evidence exists only in logs but not in player-facing UI.
- text appears but has no deterministic consequence.
- provider text changes outcome without backend validation.
- screenshot does not show the risk/consequence relation.
