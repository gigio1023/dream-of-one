# Game Development Harness

This is the active entry point for running Dream of One as an agent-assisted game project.

## Use This When

- planning a large game feature.
- reviewing whether the game design is strong enough.
- turning scenario prose into runtime work.
- dispatching Codex subagents.
- deciding whether a Godot change is truly playable.
- preparing release, pitch, or QA evidence.

## Operating Rule

Do not treat an agent skill as the whole system. The active operating model has two levels.

Director level:
1. game thesis
2. creative pillars
3. milestone evidence
4. director council
5. director decision record

Execution level:

1. game seed
2. stage plan
3. role reviews
4. implementation handoff
5. fresh evidence
6. drift log
7. continuation note

The director level decides what is worth making. The execution level makes the approved work real.

## Harness Engineering Docs

- [Director harness engineering](01-director-harness-engineering.md)
- [Codex work contract](02-codex-work-contract.md)
- [Readiness gates](03-readiness-gates.md)
- [Milestone contract](contracts/milestone-contract.md)

## Active State

Current working state lives in:
- `.game-harness/`

This does not replace Linear:
- Linear remains work SoT.
- `.game-harness/` records game-development context, stage evidence, and drift.

For long-running Codex goal work, use
`.game-harness/goal-loop-state.md` as the compact resume checkpoint. It is a
small Ralph-inspired layer over the existing harness: prompt, task list, state,
proof, and exit gate. Do not create a separate `.ralph/` tree unless that is an
explicit project decision.

## Research Basis

The current methodology comes from:
- [Harness methodology research](../../research/2026-04-30/harness-methodology/README.md)

Key source-backed conclusions:
- `AGENTS.md` should be a short map, not a giant manual.
- scenario must become runtime contract, not stay prose.
- Godot checks are necessary but not sufficient for game quality.
- AI-built game work needs an AI-play interface: Codex should be able to run the
  current proof cell, take bounded player actions, inspect player-visible state,
  and write a gameplay artifact before human comprehension testing.
- role review is required because engineering correctness and game quality are different.
- API/provider-generated NPC text can propose wording, but backend/runtime owns actions, rules, Evidence, Exposure, and verdicts.

## Required Files for Major Work

Before implementation:
- `docs/direction/`
- `.game-harness/director-state.md`
- `.game-harness/milestones/<milestone>.md`
- `.game-harness/contracts/codex-work-intake.md` (historical name; active boundary is API proposal-provider wording only)
- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- role review entries in `.game-harness/review-log.md`
- implementation handoff

After implementation:
- `.game-harness/verification-ledger.md`
- `.game-harness/drift-log.md`
- `.game-harness/continue-here.md`
- `.game-harness/goal-loop-state.md`

## Minimum Evidence

Use the repo commands from `AGENTS.md`:

```bash
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

For visual/UI/game-feel changes, also require a screenshot or playable capture artifact.
For player-flow, comprehension, or social-simulation changes, prefer a
Codex-driven play probe against the running Godot scene over adding tests that
only inspect private implementation.
