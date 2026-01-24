---
name: beads-workflow
description: >
  Use Beads (bd) as an internal execution graph (epic/task/dep) for local work.
  Covers session start (bd prime/ready), create/update/close, dependencies/labels,
  and writing bodies with real newlines. Use when asked about beads/bd, internal
  task breakdown, or managing Unity MCP WIP.
---

# Beads Workflow (Internal Execution Graph)

## Session start

1. Load context:
   - `bd prime`
2. Find unblocked work:
   - `bd ready` (add `--pretty` if you want a tree view)
3. Pick one issue:
   - `bd show <id>`
4. Start:
   - `bd update <id> --status in_progress`

## During work

- If you discover follow-up work/bugs:
  - `bd create "..." --type task --labels "agent:codex"`
  - Link it: `bd dep add <new-id> --type discovered-from --blocked-by <current-id>`
- If there is a hard dependency:
  - `bd dep add <blocked-issue> --blocked-by <blocking-issue> --type blocks`

## Formatting (multi-line descriptions)

- Avoid putting literal `\n` in `--description` (it will stay as backslash+n).
- Use `--body-file -` with stdin/heredoc for any multi-line body:
  - `bd create "..." --body-file - <<'EOF'`
  - `...`
  - `EOF`

## Finish

- Close with a high-signal reason (what/why/paths/tests/next):
  - `bd close <id> --reason "..." --suggest-next`

## Labels (recommended in this repo)

- `agent:codex` / `agent:human`
- `needs:unity-mcp` (Unity Editor + MCP required)
- `lock:unity-mcp` (mutex: only one active issue may hold this while using Unity MCP)

## Guardrails

- Don’t manage execution steps via Markdown TODO lists — if you need structure, create internal Beads issues.
- Prefer WIP=1 when `needs:unity-mcp` is involved (single Unity Editor session).
- Keep Linear up-to-date manually (status + PR link) since Linear is the work SoT.
