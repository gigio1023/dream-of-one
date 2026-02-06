---
name: auto-pr-merge
description: "Automatically run PR lifecycle with explicit bot-feedback ledger, deterministic merge gates, and post-merge sync via GitHub MCP."
---

# Auto PR Merge

## Purpose
Drive PRs to completion without human gating: request Codex review, track bot feedback with a strict ledger, validate findings, merge only when gates pass, then close Linear and continue.

## Required Inputs
- `owner`, `repo`, `head` branch, `base` branch
- Linear issue ID/identifier for status/comment updates

## Decision Ledger (mandatory)
Track every bot finding in a per-PR ledger entry with this exact schema:

| Field | Allowed values | Notes |
| --- | --- | --- |
| `comment_id` | integer/string | Source comment identifier |
| `source` | `review_comment` \| `issue_comment` | GitHub comment type |
| `author` | string | e.g. `chatgpt-codex-connector` |
| `severity` | `p0` \| `p1` \| `p2` \| `p3` \| `p4` \| `unknown` | Parse from body if present |
| `decision` | `valid` \| `partial` \| `invalid` | Validation outcome |
| `action` | `fix` \| `no-change` \| `defer` | What was done |
| `commit` | SHA or `n/a` | Fix commit when action is `fix` |
| `status` | `new` \| `actionable` \| `fixed` \| `dismissed` | Current lifecycle state |
| `reason` | short text | Why the decision was made |

Template:

```markdown
| comment_id | source | author | severity | decision | action | commit | status | reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 123456 | review_comment | chatgpt-codex-connector | p2 | valid | fix | abcdef1 | fixed | Reproduced and patched |
```

## Workflow
1. Prepare PR
- Use `mcp__github__create_pull_request` if no open PR for the branch.
- Request review with `mcp__github__add_issue_comment` body: `@codex review`.
- Post PR URL to Linear, set issue to `In Review` when appropriate.

2. Poll and collect bot feedback
- Poll `mcp__github__pull_request_read`:
  - `get_review_comments`
  - `get_comments`
  - `get_reviews`
- Track at least these authors:
  - `chatgpt-codex-connector`
  - `codex`
  - `codex[bot]`
  - `chatgpt-codex-connector[bot]`
- Update ledger entries for every new bot comment.

3. Validate actionable comments
- Apply `validate-ai-review` logic per entry and set `decision`.
- `valid` -> patch + tests -> `action=fix`, `status=fixed`, record `commit`.
- `partial` -> apply only if concrete risk exists and fix is safe; otherwise `defer` with reason.
- `invalid` -> `action=no-change`, `status=dismissed`, record reason.
- Never merge with unresolved actionable `p0/p1/p2` entries.

4. Enforce merge gates (deterministic)
- Poll `mcp__github__pull_request_read(method=get_status)` and PR details.
- Gate A: PR is `open` and mergeable.
- Gate B: ledger has no unresolved actionable findings.
- Gate C (checks):
  - If `status.total_count > 0`: require `status.state == success`.
  - If `status.total_count == 0`: treat as pass (no required checks configured).
- If any gate fails, continue polling/fixing; do not merge.

5. Merge via GitHub MCP
- Merge using `mcp__github__merge_pull_request`.
- Prefer repo policy merge method (`squash` unless repo requires otherwise).

6. Post-merge finalize
- Update Linear issue to `Done` with PR + merge SHA + verification summary.
- Sync local state:
  - `git checkout main`
  - `git pull origin main`
- Move to the next ready Linear issue and continue.

7. Failure loop
- If branch is outdated/conflicted:
  - use `mcp__github__update_pull_request_branch` when available, else rebase locally
  - rerun tests and return to step 2
- Never force merge when checks are red/pending.

## Guardrails
- Do not use gh CLI.
- Do not skip ledger updates for bot comments.
- Never merge with unresolved actionable medium-or-higher findings.
- Never merge if checks exist and are not green.
- Keep deterministic boundaries intact (no LLM truth transitions).
- Use GitHub MCP for all PR lifecycle operations.

## Examples
- `PR opened -> @codex review -> ledger built -> comments validated -> gates pass -> merged -> Linear Done -> main synced -> next issue`.
