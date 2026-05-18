---
name: game-long-run-control
description: >
  Use when a game project needs multi-slice autonomous work, Ralph-like
  continuation discipline, support-work drift control, or resume/handoff
  state for long Codex or Claude Code sessions. Trigger on "long run",
  "autonomous loop", "Ralph", "keep working", "resume work", "work drift",
  and "too much testing/docs".
version: 0.1.0
tags:
  - game-development
  - execution
  - autonomous-agents
---

# Game Long-Run Control

## Quick Start

1. Read `references/game-first-loop-control.md`.
2. Read the target repo's active goal prompt, task queue, project state, and
   verification ledger.
3. Classify current work as `playable`, `proof`, `support`, or `blocked`.
4. If two recent slices were support work, redirect to a playable change, a real
   play check, or a blocker report.
5. Choose one reversible slice with one player-visible claim or one proof path.
6. Update loop state before changing streams.
7. Commit and push after the verified slice.

## Gotchas

- Long-run control is not creator interview. Interview only when the game frame
  is not buildable yet.
- File changes, tests, and reports are not product progress by themselves.
- Do not continue internal work when the next real gate is outside-player
  evidence, human taste, budget, auth, or a public promise.
- Do not retry spend-bearing or human-facing work until duplicate handles and
  artifacts are inspected.
- Do not let subagents create separate notes unless a leader integrates them
  into one project decision.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/game-first-loop-control.md` | Every long autonomous run | Product-progress predicate, circuit breakers, resume labels, and status footer |
| `core/templates/execution/long-run-loop-state.md` | Installing project state | Compact state template for continuation work |
| `docs/long-running-agent-control.md` | Policy review | Full operating model for long-running agent sessions |
