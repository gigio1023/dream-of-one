# Director Harness Engineering

## Purpose

This document turns the director research into an operating system. It is not another design essay.

The harness exists to prevent three failures:
- Codex implements plausible features that make a different game.
- visual/Godot work hides that the core loop still is not proven.
- broad autonomous work continues after the product authority has drifted.

## Operating Stack

| Layer | Owns | Active Files |
|---|---|---|
| Repo map | how agents enter the project | `AGENTS.md` |
| Director layer | what game is worth making | `docs/direction/` |
| Harness state | current milestone and gates | `.game-harness/` |
| Design/runtime source | rules, scenario, evidence | `docs/scenario/`, `docs/design/` |
| Execution graph | local task dependencies | Beads |
| Work source of truth | issue ownership | Linear |

## State Machine

Director work moves through these states:

1. `thesis_locked`
2. `milestone_selected`
3. `evidence_contract_defined`
4. `council_reviewed`
5. `execution_handoff_ready`
6. `implementation_running`
7. `evidence_collected`
8. `director_verdict_recorded`

Current state:
- `evidence_contract_defined` for M1 Protocol Proof.

Blocked transition:
- do not enter `implementation_running` for broad feature work until M1 council reviews are completed or explicitly waived in the decision ledger.

## Director Reducer Rule

Parallel agents can produce research, critiques, race candidates, and implementation options. They do not decide product direction.

The reducer must record:
- decision
- rejected alternatives
- affected pillars
- required evidence
- one-way or two-way nature
- review date

Record director decisions in:
- `docs/direction/03-director-decision-ledger.md`

## Milestone Gate Rule

A milestone is not a date and not a feature list. It is a product-risk proof.

Every milestone must define:
- product risk
- player experience target
- scope in/out
- evidence required
- council lanes required
- exit verdict

Active milestone:
- `.game-harness/milestones/M1-protocol-proof.md`

## Evidence First, Then Expansion

Do not expand content before the current risk is proven.

For Dream of One, the proof order is:
1. text creates Evidence.
2. Evidence changes Exposure.
3. Exposure creates visible pressure.
4. backend/runtime owns the consequence.
5. Godot shows the consequence in play.
6. player understands they are being investigated.

If any step fails, adding locations, NPCs, art assets, or more dialogue is scope drift.

## Harness Outputs Required Before Implementation

Before a broad Codex implementation request, these files must be current:
- `docs/direction/00-game-thesis.md`
- `docs/direction/01-creative-pillars.md`
- `.game-harness/director-state.md`
- `.game-harness/milestones/M1-protocol-proof.md`
- `.game-harness/contracts/codex-work-intake.md`
- `.game-harness/contracts/evidence-contract.md`
- `.game-harness/council/m1-required-reviews.md`

## Failure Modes to Block

Block work when:
- player becomes investigator.
- provider-generated prose decides state.
- 3D scene work lacks a playable consequence.
- text is lore but not a risk surface.
- Korean is not the source meaning.
- public promise hides the provider access mode, model availability limit, or fallback behavior.
- evidence cannot be reproduced from command output or artifact paths.

## Implementation Start Verdict

The project is not ready for broad vertical-slice implementation yet.

It is ready for M1 Protocol Proof implementation after:
- council reviews complete,
- intake/evidence contract is accepted,
- M1 handoff names exact files and checks.
