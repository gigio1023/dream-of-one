---
name: game-director
description: >
  Use when defining or reviewing a game's thesis, pillars, player experience,
  AI premise, presentation choice, Direction Lock, or release promise. Trigger
  on "game direction", "creative pillars", "is this game worth making",
  "director review", and "vertical slice readiness". If the user has taste or
  references but no stable direction, use game-onboarding before director
  review.
version: 0.1.0
tags:
  - game-development
  - direction
  - production
---

# Game Director

## Quick Start

1. If the project lacks accepted direction, route through `game-onboarding`
   before attempting Direction Lock.
2. Read the target project's direction docs.
3. Read `references/director-review.md`.
4. Read `references/design-foundations.md` when player experience, pillars, or presentation are in scope.
5. Select the relevant gate from `core/gates/`.
6. Return `READY`, `CONCERNS`, or `NOT_READY`.
7. Record assumptions, required proof, and internal evidence artifacts.

## Gotchas

- Do not approve a vertical slice before the core loop is proven.
- Do not let presentation quality replace player experience proof.
- Do not let AI-generated content own final game truth without a deterministic boundary.
- AI may propose and compare concepts, but the human owns taste and Direction
  Lock.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/director-review.md` | Every director review | Review flow and output shape |
| `references/design-foundations.md` | Direction or player-experience review | From the craft reference index design questions |
| `.game-studio/core/references/operational/mda.md` | Mechanic-dynamic-experience claim | MDA review moves |
| `.game-studio/core/references/operational/level-flow.md` | First-session route or teaching claim | Level-flow review moves |
| `skills/game-onboarding/SKILL.md` | Missing or ambiguous direction | Entry routing before Direction Lock |
| `.game-studio/core/gates/direction.md` | Thesis, pillars, player experience, AI authority | Direction gates |
| `.game-studio/core/gates/production.md` | Protocol proof, presentation value, vertical slice | Production gates |
| `.game-studio/core/gates/release.md` | Public promise checks | Release gates |
