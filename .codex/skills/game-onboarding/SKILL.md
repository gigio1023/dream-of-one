---
name: game-onboarding
description: >
  Use at the start of Game Studio work, when game direction is missing or
  uncertain, when turning taste or references into a game direction, or when
  adopting an existing repo, notes, pitch, or prototype with unclear authority.
  Routes direction-carry-in, taste-to-game, and brownfield-unknown before
  Direction Lock.
version: 0.1.0
tags:
  - game-development
  - onboarding
  - direction
  - discovery
---

# Game Onboarding

## Purpose

Route the project before Direction Lock.

Use this skill before production, implementation, or milestone planning when
the current direction source is missing, weak, disputed, or unknown.

## Quick Start

1. Read the user request and any project-local `.game-studio/project-state.md`.
2. Ask or answer: are we adopting an existing game direction, turning taste or
   references into a game direction, or auditing an ambiguous existing project?
3. Read `references/entry-routing.md`.
4. Classify the entry mode as `direction-carry-in`, `taste-to-game`, or
   `brownfield-unknown`.
5. Name the authority owner for taste, concept selection, Direction Lock, stage
   movement, and public promises.
6. If the creator needs deeper philosophy, whole-game frame, or first playable
   proof clarification, route to `game-creator-interview`.
7. Return the route output and stop at `USER_DECISION_NEEDED` when the next step
   belongs to the human.

## Public Language

- Use `proof`, `playable proof`, `proof target`, `proof budget`, and
  `validation` in user-facing instructions.
- Use `evidence` only for internal artifact records such as builds, captures,
  playtest notes, QA results, telemetry, screenshots, videos, decision records,
  and public-claim checks.

## Authorship Rule

AI can ask taste questions, propose concepts, compare tradeoffs, recommend
rejection, draft a creative brief, and plan the first playable proof.

The human owns taste, selected concept, Direction Lock, stage advancement, and
public promises.

## Gotchas

- Preserve existing direction before improving it.
- Do not ask novice creators for a thesis, genre, core loop, engine, or
  monetization model before taste has been elicited.
- Do not generate large idea catalogs; use a small, comparable concept slate.
- Do not implement until the first prototype has one named proof question and a
  first prototype contract.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/entry-routing.md` | Every onboarding route | Entry modes, output shape, stop conditions |
| `skills/game-creator-interview/SKILL.md` | Deep creator intent interview | Philosophy, frame, non-goals, and first proof |
| `.game-studio/project-state.md` | When installed | Current project state and entry mode |
| `.game-studio/core/workflows/workflow-catalog.yaml` | Choosing next skill or gate | Stage and gate routing |
