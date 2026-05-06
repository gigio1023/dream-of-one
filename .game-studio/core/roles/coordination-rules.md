# Coordination Rules

## Role activation

Do not run every role for every task. Activate roles based on profile, stage,
files touched, and risk.

## Strictest verdict wins

If one reviewer says `NOT_READY`, the milestone does not advance.

## No cross-domain silent edits

A role may review outside its domain, but should not edit another role's files
unless the work intake assigns that scope.

## Parallel work

Parallel agents should receive independent write scopes and a shared milestone
contract. Each agent must write a handoff before stopping.

## Conflict resolution

Roles resolve review conflicts by advising, blocking readiness, and naming the
proof needed next. They do not own human authority decisions.

Return `USER_DECISION_NEEDED` when the next step requires the human to decide
any of these:

- Taste
- Selected concept
- Direction Lock
- Stage movement
- Public promises

1. Game identity conflicts go to Game Director for recommendation.
2. Scope conflicts go to Producer for recommendation.
3. Architecture conflicts go to Technical Director for recommendation.
4. Player comprehension conflicts go to UX Designer or QA Lead for
   recommendation.
5. Public-promise readiness conflicts go to Release Manager for
   recommendation.

If a recommendation would change taste, choose or replace the selected concept,
lock direction, move the project stage, or make/change a public promise, stop
with `USER_DECISION_NEEDED`.

## Agentic assumptions

When the agent makes a decision without user input, it must record:

- Assumption
- Reason
- Affected files
- Reversal cost
- Gate that should review it
