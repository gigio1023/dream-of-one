---
name: auto-pr-merge
description: "Automate PR lifecycle with bot-review tracking, validate-ai-review triage, and merge only after green checks plus resolved actionable comments."
---

# Auto PR Merge

## Purpose
Automate PR flow with GitHub MCP: request Codex review, track bot feedback explicitly, validate findings via `validate-ai-review` logic, verify checks, merge, and close the Linear issue.

## Workflow
1) Prepare PR
- If no PR exists for the current branch, create one via `mcp__github__create_pull_request`.
- Immediately post `@codex review` using `mcp__github__add_issue_comment`.
- Link PR URL to Linear issue (comment + state transition).

2) Build review ledger (explicit bot tracking)
- Poll PR review comments via `mcp__github__pull_request_read` (`get_review_comments`) and issue comments via `get_comments`.
- Track bot authors at minimum:
  - `chatgpt-codex-connector`
  - `codex` / `codex[bot]`
- Maintain per-comment state: `new`, `actionable`, `non-actionable`, `fixed`, `dismissed`.
- Treat unresolved high/medium actionable findings as merge blockers.

3) Validate each actionable finding (`validate-ai-review` logic)
- Reproduce context in changed files and tests before deciding.
- Classify each finding as `valid`, `partial`, or `invalid`, with a short reason.
- Apply fixes only for `valid` and explicitly approved `partial` findings.
- After each fix: rerun relevant tests/diagnostics, push, and reply with `comment -> decision -> commit SHA`.
- Never patch code for unverified/invalid findings.

4) Enforce merge gates
- Poll checks via `mcp__github__pull_request_read` (`get_status`) until complete.
- Merge is allowed only when all are true:
  - PR is open and mergeable
  - no actionable bot findings remain unresolved
  - required checks are green (`state=success`) (or no required checks exist)
- If checks fail or new bot feedback appears, return to step 2.

5) Merge via MCP
- Merge with `mcp__github__merge_pull_request`.
- Prefer repo policy merge method (use `squash` if merge commits are disabled).

6) Post-merge finalize
- Update Linear issue to `Done` and add merged PR link + verification summary.
- Sync local branch:
  - switch to `main`
  - pull latest
- Continue with next ready Linear/Beads issue without waiting for user prompt.

7) Failure loop
- If merge is blocked by conflicts/outdated branch:
  - update PR branch (`mcp__github__update_pull_request_branch`) or rebase locally
  - rerun tests
  - resume from step 2
- Never force-merge on red checks.

## Guardrails
- Do not use gh CLI.
- Never merge if required checks are red/pending.
- Never merge while actionable bot review feedback is unresolved.
- Keep deterministic boundaries intact (no LLM truth transitions).
- Use GitHub MCP for all PR lifecycle operations.

## Examples
- "PR opened -> @codex review requested -> actionable bot findings validated/fixed with commit links -> checks green -> auto-merge -> Linear Done -> next issue."
