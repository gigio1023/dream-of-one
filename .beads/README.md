# Beads (Internal Execution Graph)

This repo keeps **Linear** as the single source of truth for work items and status.\
Beads (`bd`) is used **internally by agents** as a local execution graph (epic/tasks/dependencies) to keep multi-step work stable across sessions.

Beads is **not** mirrored to Linear, and it does **not** need to map 1:1 to Linear issues.

## Quick Start (agent/internal)

```bash
# Load context
bd prime

# Create internal work items
bd create "EPIC: <topic>" --type epic --labels "agent:codex"
bd create "Implement X" --type task --parent <epic-id> --labels "agent:codex"

# Link dependencies
bd dep add <task-id> --blocked-by <prereq-id> --type blocks

# Pick ready work
bd ready --pretty
bd show <id>

# Update status / close
bd update <id> --status in_progress
bd close <id> --reason "what/why/paths/tests" --suggest-next
```

## Git tracking

`.beads/` should be tracked in git. Local runtime artifacts (SQLite DB, daemon files, logs) are ignored by `.beads/.gitignore`.

## References

- Repo runbook: `docs/agent/runbook.md`
- Beads docs: https://github.com/steveyegge/beads
