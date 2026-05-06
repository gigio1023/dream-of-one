# Codex Work Contract

Note: the filename is historical. For Dream of One runtime/product work, the active AI boundary is API proposal-provider wording only; Codex CLI is not a release prerequisite.

## Purpose

Codex can do long game-development work only when the prompt is backed by repo artifacts. A broad request without this contract will drift.

## Required Prompt Shape

Every broad Codex task should include:

```text
Director objective:
Current milestone:
Relevant pillars:
Scope in:
Scope out:
Authority boundaries:
Owned files:
Required evidence:
Stop conditions:
Handoff artifact:
```

## Work Classes

| Class | Allowed Without Council? | Required Evidence |
|---|---:|---|
| mechanical docs edit | yes | markdown path check |
| runtime schema/rule change | no | backend check, fixtures, evidence JSON |
| Godot visual/playable change | no | Godot smoke, screenshot/playable capture |
| NPC/provider text behavior | no | preflight/model/fallback record, no authority drift |
| public release/pitch copy | no | build-truth comparison |

## Scope Ownership

Each worker must own a disjoint path set.

Examples:
- Narrative worker: `docs/scenario/`, text surface tables.
- Systems worker: `backend/npc-runtime/`, runtime fixtures.
- Godot worker: `godot/`, evidence scripts.
- QA worker: `.game-harness/verification-ledger.md`, evidence review.
- Director reducer: `docs/direction/03-director-decision-ledger.md`.

Do not let two workers write the same direction or runtime authority file in parallel.

## Stop Conditions

Stop and report instead of continuing when:
- the implementation needs a new pillar decision.
- the requested scope contradicts M1.
- generated text would imply verdict or guilt.
- Godot implementation requires bypassing backend authority.
- no fresh evidence can be produced.
- the same failure appears twice.

## Handoff Format

Each worker must finish with:
- files changed.
- evidence produced.
- checks run.
- authority touched.
- unresolved drift.
- next required decision.

## What Codex Must Not Do

- invent a new game identity.
- treat aesthetic polish as proof of gameplay.
- move deterministic rules into prose.
- hide the provider access mode, model availability limit, or fallback behavior.
- reintroduce old runtime/engine paths.
- mark work complete without evidence.
