---
name: auto-pr-merge
description: >
  Automatically drive PR flow: open PR, request Codex review, validate, wait for checks,
  merge via GitHub MCP, update Linear, and continue. Use when asked to proceed without
  human approval or to auto-merge PRs.
---

# Auto PR Merge

## Purpose
Automate the PR lifecycle with GitHub MCP (no gh CLI): request Codex review, validate feedback, ensure checks pass, merge, and update Linear.

## Workflow
1) Open or locate PR
- If no PR exists for the current branch, create one via GitHub MCP.
- Record the PR URL in the Linear issue.

2) Request automated review
- Add a PR comment: `@codex review`.
- If validate-ai-review is applicable, run it and apply fixes.

3) Run checks
- Execute relevant tests/diagnostics for the change.
- If no tests apply (docs-only), note in PR description.

4) Wait for checks
- Use GitHub MCP `pull_request_read` (get_status) to confirm checks are successful.
- If checks are pending, poll until success or failure.
- If checks fail, fix and re-run.

5) Merge
- Use `mcp__github__merge_pull_request` with `merge_method` set to the repo default (omit if unknown).

6) Post-merge
- Update Linear issue to Done and leave the merge/commit link.
- Move to the next Linear issue without asking.

## Guardrails
- Do not use gh CLI.
- Never merge if checks are failing.
- Keep deterministic boundaries intact (no LLM truth transitions).

## Examples
- “PR opened and Codex reviewed. Checks green → auto-merge → Linear Done.”
