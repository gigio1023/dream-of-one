---
name: beads-scope-split
description: Split a large/ambiguous request into an internal Beads Epic + Tasks (with acceptance criteria and dependencies) to implement safely. Use when asked to “쪼개줘”, “작업 분해”, “epic/task로 나눠줘”, or when a change is too large to implement in one shot.
---

# Beads Scope Split (Epic → Tasks)

## Workflow

1. Identify the “Epic” outcome (single sentence).
2. List tasks that are individually testable and small (aim: 15–90 minutes each).
3. For each task:
   - Define acceptance criteria (checklist)
   - Define scope (paths/scenes/systems)
   - Define verification steps
4. Create issues:
   - Epic: `bd create "EPIC: ..." --type epic --labels "agent:codex"`
   - Tasks: `bd create "..." --type task --parent <epic-id> --labels "agent:codex"`
5. Add dependencies:
   - `bd dep add <task> --blocked-by <prereq> --type blocks`
   - Use `--type discovered-from` when a task is created mid-implementation as follow-up work.

## Guardrails

- If a task requires Unity scene/prefab/asset authoring, add `needs:unity-mcp`.
- Never schedule Unity MCP work in parallel; treat it as WIP=1 and use `lock:unity-mcp`.
