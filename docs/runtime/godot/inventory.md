# Godot Migration Inventory

## Active Runtime Files

| Area | Path |
|---|---|
| Godot project | `godot/project.godot` |
| Main scene | `godot/scenes/main.tscn` |
| World data | `godot/data/world_layout.json` |
| Backend runtime | `backend/npc-runtime/` |
| Godot Schema | `backend/npc-runtime/src/godot/runtime-schema.ts` |
| Evidence | `data/evidence/godot/` |

## Active Scene Content

- Landmarks: Store, Studio, Park, Station
- NPC placeholders: Store Clerk, Studio PM, Park Witness, Station Officer
- Text surfaces: Store queue rules, Studio approval criteria, Park notice board, Station intake rules
- Runtime slice: Station intake ObservationFrame, bounded command execution, rejected command fallback, text-pressure domain event
