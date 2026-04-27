# Overview

Dream of One now targets a Godot 4.x 3D Runtime Path with a TypeScript NPC backend.

## Active Areas

- `godot/`: 3D scene, runtime slice scripts, world layout data, smoke/evidence tools.
- `backend/npc-runtime/`: NPC decision service, scheduling, bounded behavior, Godot runtime Schema, Evidence validation.
- `docs/design/`: product and social-stealth design rails.
- `docs/migration/godot/`: migration validation gates and evidence cutover notes.
- `data/evidence/godot/`: generated Godot Evidence Packs.

## Runtime Authority

- Godot owns world presentation, collision/navigation observation, scene state, and visual/text surfaces.
- Backend owns deterministic validation, Fallback Path, action bounding, Evidence semantics, and end-state adjudication.
- Product authority for Dream Law, Cover Test, Exposure, Station intake, inquest, verdict, and session termination remains deterministic.
