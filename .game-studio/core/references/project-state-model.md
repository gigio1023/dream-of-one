# Project State Model

Game Studio keeps project state local to the target repository so agents can
continue work without guessing the creative, production, and review context.

## State Locations

Recommended target-project locations:

- `.game-studio/project-state.md`
- `.game-studio/project-intake.md`
- `.game-studio/concept-slate.md`
- `.game-studio/creative-brief.md`
- `.game-studio/proof-ledger.md`
- `.game-studio/review-log.md`
- `.game-studio/decision-ledger.md`
- `.game-studio/risk-register.md`
- `.game-studio/handoff.md`

JSON projects can mirror the same fields with
`core/schemas/project-state.schema.json`.

## Template Mapping

Some installed state files use shorter project-local names than the reusable
source templates:

- Create `.game-studio/concept-slate.md` from
  `core/templates/direction/concept-portfolio.md`.
- Create `.game-studio/creative-brief.md` from
  `core/templates/direction/one-page-creative-brief.md`.
- Create `.game-studio/constraint-ladder.md` from
  `core/templates/production/constraint-ladder.md`.
- Create `.game-studio/project-intake.md` from
  `core/templates/intake/project-intake.md`.

## Required Fields

Every project state file should expose:

- project name
- entry mode
- concept status
- direction source
- current stage
- selected engine profile
- selected scope profile
- selected genre profiles
- review mode
- decision mode
- game development fluency
- explanation mode
- current proof target
- next required decision
- last reviewed gate
- last gate verdict

## Entry Modes

- `direction-carry-in`
- `taste-to-game`
- `brownfield-unknown`

## Concept Statuses

- `UNROUTED`
- `TASTE_DISCOVERY`
- `CONCEPT_SLATE`
- `CREATIVE_BRIEF`
- `FIRST_PROOF_PLANNED`
- `DIRECTION_LOCKED`
- `PARKED`

## Stage Values

Project state uses SCREAMING_SNAKE values; the workflow catalog uses
kebab-case stage IDs. The two map as follows:

| Project state (`currentStage`) | Workflow catalog (`stages[].id`) |
| --- | --- |
| `DISCOVERY` | `creative-discovery` |
| `DIRECTION_LOCK` | `direction-lock` |
| `PROTOCOL_PROOF` | `protocol-proof` |
| `CORE_LOOP_PROTOTYPE` | `core-loop-prototype` |
| `PRE_PRODUCTION_EXIT` | `pre-production-exit` |
| `PRESENTATION_VALUE_GATE` | `presentation-value-gate` |
| `VERTICAL_SLICE` | `vertical-slice` |
| `PUBLIC_DEMO_CANDIDATE` | `demo-candidate` |
| `SMALL_RELEASE_CANDIDATE` | `release-candidate` |

## Ledger Rules

- Record direction, stage, scope, and public promise changes as decisions.
- Link every milestone to a proof target.
- Link every gate verdict to concrete proof or internal evidence artifacts.
- Mark stale internal artifacts instead of silently reusing them.
- Preserve parked and rejected concepts so agents do not rediscover them every
  session.

## Minimal State Template

```markdown
# Project State

## Project

-

## Entry Mode

`direction-carry-in | taste-to-game | brownfield-unknown`

## Concept Status

`UNROUTED | TASTE_DISCOVERY | CONCEPT_SLATE | CREATIVE_BRIEF | FIRST_PROOF_PLANNED | DIRECTION_LOCKED | PARKED`

## Direction Source

-

## Current Stage

`DISCOVERY`

## Profiles

- Engine:
- Scope:
- Genres:

## Review Mode

`full | lean | solo`

## Decision Mode

`consultative | agentic | audit`

## Game Development Fluency

`novice | intermediate | expert`

## Explanation Mode

`plain | standard | terse`

## Current Proof Target

-

## Next Required Decision

-

## Last Reviewed Gate

-

## Last Gate Verdict

-
```
