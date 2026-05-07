# Repo Agent Notes

## Operating Model

- Work SoT: Linear issues.
- Internal execution graph: Beads (`bd`) for atomic local decomposition and dependencies.
- Writer: Codex CLI.
- Default execution: work one Linear issue to completion before moving to the next.

## Game Studio Overlay

- Project-local Game Studio guidance lives in `.game-studio/`.
- Current Game Studio routing and state live in `.game-studio/project-state.md`.
- Framework review and proof gates live in `docs/framework/`.
- GPT review policy lives in `docs/framework/gpt-code-review.md`; meaningful reviews use GPT-5.5 high/xhigh lanes and Game Studio proof gates.
- `.game-harness/` remains the current M1 execution harness; do not replace or migrate it without an explicit decision.

## Godot Runtime

- Active engine root: `godot/`
- Main scene: `godot/scenes/main.tscn`
- Runtime data: `godot/data/world_layout.json`
- Godot checks:
  - `godot --headless --import --path godot`
  - `godot --headless --path godot --script res://tools/scene_load_smoke.gd`
  - `godot --headless --path godot --script res://tools/evidence_run.gd`
  - `godot --headless --path godot --script res://tools/runtime_slice_smoke.gd`

## Backend Runtime

- Backend root: `backend/npc-runtime/`
- Runtime Schema: `backend/npc-runtime/src/godot/runtime-schema.ts`
- Required check: `npm run check --prefix backend/npc-runtime`
- Backend owns deterministic validation, fallback selection, scheduling, and Evidence semantics.

## Design Rails

- Player is not an investigator.
- NPCs and Station systems investigate the player.
- Text is the danger surface.
- Dream Law, Cover Test, Exposure, Station intake, inquest, verdict, and session termination remain deterministic product authority.

## Previous Runtime Policy

- Previous engine/runtime stacks are not active Runtime Paths.
- Do not add old engine/runtime docs, tools, or archive paths back to the active tree.
- If a task needs historical behavior, recover it from git history instead of adding archive files back to the active tree.

## Mermaid Validation

Any change that adds or edits Mermaid diagrams in docs must be render-validated with Mermaid CLI:

```bash
npx -y @mermaid-js/mermaid-cli -i <diagram>.mmd -o <diagram>.svg
```
