---
name: game-evidence-gate
description: >
  Use when verifying whether a game milestone, prototype, vertical slice, demo,
  or release claim is backed by playable proof and internal evidence artifacts.
  Trigger on "evidence", "proof", "validation gate", "prove this works",
  "playable artifact", and "release gate".
version: 0.1.0
tags:
  - game-development
  - verification
  - evidence
---

# Game Evidence Gate

## Quick Start

1. Read `references/evidence-review.md`.
2. Read `references/playable-evidence.md` when the claim is player-facing.
3. Read the proof target and internal evidence contract.
4. Check each required proof artifact.
5. Run listed verification commands when available.
6. Perform listed manual review checks.
7. Return `READY`, `CONCERNS`, or `NOT_READY`.

## Gotchas

- Screenshots do not prove gameplay by themselves.
- Passing tests do not prove game feel by themselves.
- Playtest notes without build identifiers are weak internal evidence.
- Use proof language in user-facing summaries; use evidence for internal
  artifact records.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/evidence-review.md` | Every proof review | Proof and internal evidence decision flow |
| `references/playable-evidence.md` | Player-facing milestone review | Playable proof categories |
| `.game-studio/core/templates/evidence/evidence-contract.md` | Writing evidence contracts | Contract template |
| `.game-studio/core/templates/evidence/playtest-report.md` | Playtest review | Playtest report template |
| `.game-studio/core/templates/evidence/playable-quality-capture.md` | Feel and presentation review | Capture template |
| `.game-studio/core/rubrics/playtest-rubric.md` | Reviewing playtests | Playtest rubric |
| `docs/framework/validation-gates.md` | Stage proof | Internal evidence artifact guide |
