---
status: Godot migration active
runtime_path: Godot 4.x + TypeScript NPC backend
---

# Dream of One - Project Definition

Dream of One is a Godot 4.x 3D social-stealth game where NPC society pressures the player through text surfaces, Cover Tests, Station intake, inquest, verdict, and deterministic session end states.

## Product Rails

- Player is not an investigator. NPCs and Station systems investigate the player.
- Text is the danger surface. Dream Laws are exposed through diegetic text and Cover Tests.
- LLM-first NPC society proposes actions from role, memory, and organization context.
- Deterministic adjudication owns validation, fallback selection, Exposure thresholds, Station intake/inquest, verdict, and session termination.
- Godot owns world presentation, player/NPC movement, 3D collision/navigation observations, visuals, and scene-local interaction surfaces.

## Active Runtime Path

- Godot project root: `godot/`
- Main scene: `godot/scenes/main.tscn`
- World layout data: `godot/data/world_layout.json`
- Backend root: `backend/npc-runtime/`
- Godot runtime Schema: `backend/npc-runtime/src/godot/runtime-schema.ts`
- Evidence output: `data/evidence/godot/`

## Migration Acceptance

The branch is PR-ready only when:

1. Backend checks pass with no legacy engine dependency.
2. Godot import and scene smoke checks pass.
3. Godot Evidence Packs validate against backend Schema.
4. Repository search shows no active previous-engine/runtime references outside intentional historical git deletion records.
5. Follow-up issues for live Godot backend bridge, full playable report-intake-verdict controller, runtime selector removal, and trajectory diversity are explicit if not implemented in the same PR.

## Verification

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```
