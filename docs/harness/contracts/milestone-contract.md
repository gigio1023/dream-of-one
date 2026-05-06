# Milestone Contract

## Required Fields

Every milestone must include:
- ID and name.
- product risk.
- player experience target.
- scope in.
- scope out.
- required evidence.
- council lanes.
- execution handoff requirement.
- exit verdict.

## Verdicts

| Verdict | Meaning |
|---|---|
| `ADVANCE` | evidence proves the risk enough to move on |
| `CONDITIONAL` | move on only after listed corrections |
| `REPEAT` | rerun the milestone with narrower scope |
| `CUT` | remove or replace this strategy |
| `BLOCKED` | missing authority decision or evidence |

## Evidence Types

| Type | Examples |
|---|---|
| command | Godot smoke, backend check |
| runtime | Evidence JSON, why-lines, state transition log |
| visual | screenshot, contact sheet, video |
| playtest | observation, confusion point, action timeline |
| release | store copy vs build truth |

## Contract Rule

If a milestone cannot name the evidence that would prove it, it is not ready for implementation.
