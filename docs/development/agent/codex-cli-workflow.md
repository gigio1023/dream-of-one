# Codex CLI Workflow

Use Linear as Work SoT and Beads as the local execution graph.

## Classification

| Class | Scope | Verification |
|---|---|---|
| Godot local | `godot/**`, runtime scenes/scripts/data | Godot headless import/smoke/evidence scripts |
| Backend local | `backend/npc-runtime/**` | `npm run check --prefix backend/npc-runtime` |
| Docs/planning | Markdown and issue text | Link checks plus relevant backend/Godot command when behavior is described |

Do not add legacy engine work back into the active tree.
