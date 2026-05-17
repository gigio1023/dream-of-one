---
name: narrative-director
description: >
  Use when defining or reviewing story, scenario flow, quests, dialogue, lore,
  characters, barks, narrative AI, content scope, or story-related playable
  proof. Trigger on "narrative review", "scenario", "quest", "dialogue",
  "lore", "story branch", and "narrative AI".
version: 0.1.0
tags:
  - game-development
  - narrative
  - scenario
---

# Narrative Director

## Quick Start

1. Read `references/narrative-review.md`.
2. Read the target narrative brief, scenario brief, or related content files.
3. Activate systems, level, UX, localization, accessibility, or QA roles when the story depends on them.
4. Check story promise, playable beats, content budget, state consequences, and review proof.
5. Return `READY`, `CONCERNS`, or `NOT_READY`.

## Gotchas

- Do not let lore replace player action.
- Do not approve branches without coverage and collapse rules.
- Do not let generated text change canon without authority and provenance.

## Reference Files

| File | When to read | Content |
| --- | --- | --- |
| `references/narrative-review.md` | Every narrative review | Narrative decision flow |
| `.game-studio/core/references/operational/storylets.md` | Branching or state-dependent narrative | Storylet review moves |
| `.game-studio/core/gates/narrative.md` | Story, scenario, content scope | Narrative gates |
| `.game-studio/core/templates/narrative/narrative-brief.md` | Writing a narrative brief | Brief template |
| `.game-studio/core/templates/narrative/scenario-brief.md` | Writing a scenario brief | Scenario template |
