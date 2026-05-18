---
name: game-studio
description: >
  Use when planning game milestones, production stages, release scope, demo
  readiness, vertical slice gates, playable validation, or operating cadence.
  Trigger on "milestone", "production plan", "roadmap", "demo candidate", and
  "release candidate". If direction is missing or ambiguous, use
  game-onboarding first.
version: 0.1.0
tags:
  - game-development
  - production
  - milestones
---

# Game Studio

## Quick Start

1. If direction is missing or ambiguous, route through `game-onboarding` before
   milestone planning.
2. Read `references/milestone-planning.md`.
3. Read `references/production-judgment.md`.
4. Read `.game-studio/core/workflows/workflow-catalog.yaml`.
5. Identify the current stage.
6. Check whether the milestone has a contract.
7. Require playable proof before stage advancement and record internal evidence
   artifacts for that proof.
8. If the request is a long autonomous run, route to `game-long-run-control`
   after the milestone/proof target is known.

## Gotchas

- A milestone is a proof, not a task list.
- Public promises must match the current build.
- Do not call a prototype a vertical slice.
- AI can recommend the next proof, but the human owns Direction Lock, stage
  movement, and public promises.
- Long-running agent activity is not progress unless the active playable claim
  changes or the real play path is unblocked.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/milestone-planning.md` | Every milestone or roadmap task | Stage and milestone flow |
| `references/production-judgment.md` | Milestone approval | Producer-level proof and cut review |
| `skills/game-long-run-control/SKILL.md` | Multi-slice autonomous work | Product-progress guard, support-work limits, and resume labels |
| `skills/game-onboarding/SKILL.md` | Missing or ambiguous direction | Entry routing before Direction Lock |
| `.game-studio/core/workflows/stage-model.md` | Stage classification | Stage definitions |
| `.game-studio/core/templates/production/milestone-contract.md` | Creating a milestone | Contract template |
| `.game-studio/core/rubrics/milestone-readiness-rubric.md` | Reviewing a milestone | Readiness rubric |
