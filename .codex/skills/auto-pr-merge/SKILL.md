---
name: auto-pr-merge
description: "Automatically drive PR flow: open PR, request Codex review, validate, wait for checks, merge via GitHub MCP, update Linear, and continue. Use when asked to proceed without human approval or to auto-merge PRs."
---

# Auto PR Merge

## Purpose
Automate the PR lifecycle with GitHub MCP (no gh CLI): request Codex review, track bot feedback, validate and apply fixes, ensure checks pass, merge, and continue to the next issue.

## Workflow
1) Locate or open PR
- If no PR exists for the current branch, create one via `mcp__github__create_pull_request`.
- Immediately post `@codex review` using `mcp__github__add_issue_comment`.
- Link PR URL to Linear issue (comment + state transition).

2) Track review bots explicitly
- Poll PR review comments via `mcp__github__pull_request_read` (`get_review_comments`) and issue comments via `get_comments`.
- Track at least these bot sources:
  - `chatgpt-codex-connector`
  - `codex` / `codex[bot]`
- For each unresolved actionable comment, run the `validate-ai-review` workflow:
  - verify against code context
  - classify `valid / partial / invalid`
  - apply only valid (or approved partial) fixes
  - rerun relevant tests/diagnostics
  - push and comment with fix summary + commit link

3) Enforce merge gates
- Poll checks via `mcp__github__pull_request_read` (`get_status`).
- Merge only when:
  - PR is open
  - no unresolved high/medium bot findings remain
  - checks are green (`state=success`), or no required checks exist
- If checks fail or new review appears, return to step 2.

4) Merge via MCP
- Merge with `mcp__github__merge_pull_request`.
- Prefer repo policy merge method (use `squash` if merge commits are disabled).

5) Post-merge finalize
- Update Linear issue to `Done` and add merged PR link + verification summary.
- Sync local branch:
  - switch to `main`
  - pull latest
- Continue with next ready Linear/Beads issue without waiting for user prompt.

6) Failure loop
- If merge is blocked by conflicts/outdated branch:
  - update PR branch (`mcp__github__update_pull_request_branch`) or rebase locally
  - rerun tests
  - resume from step 2
- Never force-merge on red checks.

## Guardrails
- Do not use gh CLI.
- Never merge if checks are failing or review feedback is unresolved.
- Keep deterministic boundaries intact (no LLM truth transitions).
- Use GitHub MCP for all PR lifecycle operations.

## Examples
- “PR opened → @codex review requested → bot feedback validated/fixed → checks green → auto-merge → Linear Done → next issue.”
