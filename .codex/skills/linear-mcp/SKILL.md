---
name: linear-mcp
description: >
  Use Linear via MCP as the single source of truth for issues in this repo:
  create/update issues, set status/labels, add PR links, and prepare cloud-safe
  work for Codex Cloud (@Codex). Use when asked to create/update Linear issues,
  route work (local vs cloud), or fix Linear issue formatting.
---

# Linear MCP (Work SoT)

## Workflow

1. Identify the target workspace/team/project (ask if ambiguous; don’t guess).
2. For a new work item:
   - Create a Linear issue with a high-signal description (Goal / AC / Scope / Do-Not / Verification).
   - Apply routing labels:
     - `agent:codex` (local Codex CLI execution)
     - `agent:codex-cloud` (delegate to Codex Cloud via Linear; must be cloud-safe)
     - `needs:unity-mcp` (Unity Editor/MCP required; local-only)
3. During execution:
   - Update status (e.g., In Progress / In Review / Done) and leave progress comments.
   - Add PR link(s) to the issue when a PR exists.
4. For Codex Cloud delegation:
   - Ensure constraints are explicit (no Unity serialized assets; no Unity MCP).
   - Assign to Codex or mention `@Codex` in a comment with any extra constraints.
5. Re-read after writes to confirm final state (title/state/labels/body formatting).

## Tooling assumptions

- Prefer a Linear MCP integration if available (tool names vary by environment; look for `mcp__linear__*`-style tools such as search/list/create/update/comment).
- If no Linear MCP tool exists, fall back to the Linear GraphQL API via `.codex/skills/linear-mcp/scripts/linear_graphql.sh` (requires `LINEAR_API_TOKEN`).

## Guardrails

- Never sync Linear → Beads.
- Never mass-edit issues without explicit confirmation (and a dry-run/list-first step).
- Don’t invent workflow states/labels/projects—query what exists or ask the user.
- Preserve formatting: write real newlines in `description`/comments (avoid literal `\\n`; if it appears in source text, normalize before writing).
- Avoid leaking secrets: never echo tokens, and redact them from logs/output.
- Linear is the work SoT: prefer operating on the active issue(s) the user is working from.

## Fallback reference

For the GraphQL fallback script and usage examples, see `references/graphql-fallback.md`.
