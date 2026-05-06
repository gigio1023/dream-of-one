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

This does not replace Linear or Beads:
- Linear remains work SoT.
- Beads remains internal execution graph.
- `.game-harness/` records game-development context, stage evidence, and drift.

## Research Basis

The current methodology comes from:
- [Harness methodology research](../research/harness-methodology/2026-04-30/README.md)

Key source-backed conclusions:
- `AGENTS.md` should be a short map, not a giant manual.
- scenario must become runtime contract, not stay prose.
- Godot checks are necessary but not sufficient for game quality.
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

## Minimum Evidence

Use the repo commands from `AGENTS.md`:

```bash
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

For visual/UI/game-feel changes, also require a screenshot or playable capture artifact.
