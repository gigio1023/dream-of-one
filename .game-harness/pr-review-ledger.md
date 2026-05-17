# PR Review Ledger

Last Updated: 2026-05-06

## Purpose

Track long-running PR bot feedback, review threads, and release-truth blockers without mixing them into implementation notes.

## Status Rules

- `open`: feedback still needs investigation or edits.
- `resolved`: fix landed and verification is recorded.
- `blocked`: cannot be resolved in this PR; blocker and owner are named.
- `deferred`: intentionally out of scope; follow-up target is named.

## Release Truth Guardrails

- M1 technical pass does not mean product closure.
- Live API-backed NPC proposals are not available until runtime provider preflight proves access.
- `gpt-5.4-mini` is preferred only when runtime provider verification confirms availability for the configured provider and the configured request budget.
- Deterministic fallback remains valid release truth when live provider access is unavailable.
- PR summaries must state product blockers separately from technical verification.

## Bot Feedback Ledger

PR #92 bot feedback recorded below.

| ID | Source | Feedback | Status | Owner | Response / Evidence |
|---|---|---|---|---|---|
| PR-BOT-001 | `chatgpt-codex-connector` review comment `PRRC_kwDOQLiFZs6-WQKd` | Post-verdict input lock did not stop player controller polling. | resolved | Codex | Valid P2. Fixed in `3313a5f`: player controller now checks `is_session_locked()` and playable smoke asserts controller lock. |
| PR-BOT-002 | `chatgpt-codex-connector` review comment `PRRC_kwDOQLiFZs6-WQKm` | Safe `SA_COMPLY` notice could be labeled as a WHY-LINE. | resolved | Codex | Valid P2. Fixed in `3313a5f`: HUD only derives fallback why-line from non-`SA_COMPLY` pressure notices. |

## PR #92 Decision Ledger

| comment_id | source | author | severity | decision | action | commit | status | reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PRRC_kwDOQLiFZs6-WQKd | review_comment | chatgpt-codex-connector | p2 | valid | fix | 3313a5f | fixed | Player controller also needed terminal lock. |
| PRRC_kwDOQLiFZs6-WQKm | review_comment | chatgpt-codex-connector | p2 | valid | fix | 3313a5f | fixed | Safe speech should not populate why-line. |

## Review Thread Template

| Field | Value |
|---|---|
| ID | PR-BOT-000 |
| Source | bot, reviewer, CI, or manual release-truth check |
| Link | PR comment or check URL |
| Claim / Concern | What the feedback says |
| Classification | technical, product, release truth, provider, docs, test |
| Required Response | edit, test, explanation, defer, or block |
| Status | open, resolved, blocked, or deferred |
| Evidence | command output, changed file, screenshot, or decision record |
| Notes | Keep short. Move implementation detail to the owning doc or code review thread. |

## Current Release-Truth Items

| Item | Status | Required Before Public Demo |
|---|---|---|
| M1 technical pass | resolved | Keep verification ledger current with fresh commands. |
| M1 product closure | open | Council/product review and player comprehension evidence. |
| Live Godot-to-backend bridge | open | Runtime evidence from Godot calling backend, not fixture-only smoke. |
| Provider preflight UX | open | Runtime check for config, model, schema shape, timeout, retry, and fallback. |
| `gpt-5.4-mini` availability | open | Runtime provider verification and budgeted live smoke for the configured provider. |
| Exported build/setup path | open | Tested install or setup flow with truthful fallback mode. |
