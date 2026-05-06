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
- `gpt-5.4-nano` is preferred only when runtime provider verification confirms availability for the configured provider.
- Deterministic fallback remains valid release truth when live provider access is unavailable.
- PR summaries must state product blockers separately from technical verification.

## Bot Feedback Ledger

No bot feedback recorded yet. Start the first real row at `PR-BOT-001`.

| ID | Source | Feedback | Status | Owner | Response / Evidence |
|---|---|---|---|---|---|

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
| `gpt-5.4-nano` availability | open | Runtime provider verification for the configured provider. |
| Exported build/setup path | open | Tested install or setup flow with truthful fallback mode. |
