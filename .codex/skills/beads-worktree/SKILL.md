---
name: beads-worktree
description: Create and manage git worktrees using Beads’ built-in worktree commands (bd worktree) so all worktrees share the same .beads database safely. Use when asked for “병렬 작업”, “워크트리”, “다른 브랜치에서 동시에”, or when running multiple local Codex sessions.
---

# Beads Worktrees

Beads can manage worktrees safely by creating a redirect so all worktrees share the same `.beads` database.

## Workflow

1. Create a worktree:
   - `bd worktree create <name> --branch <branch-name>`
2. Work in the new directory (run Codex CLI there).
3. List worktrees:
   - `bd worktree list`
4. Remove when done:
   - `bd worktree remove <name>`

## Guardrails

- Avoid running multiple Unity Editor instances across multiple worktrees (Unity caches + asset safety).
- If Unity MCP is involved, treat it as WIP=1 and use `lock:unity-mcp`.

