# Long-Run Loop State

Use this file in a target game repo when an autonomous agent will continue
through multiple slices.

## Current State

- Active goal:
- Current phase: `intake | implement | probe | evidence | blocked | ready_for_external_play`
- Current slice:
- Work type: `playable | proof | support | blocked`
- Product-progress predicate hit: `yes | no`
- Support-only streak:
- Resume mode: `resume | partial_resume | retry | manual_required | done_waiting_on_human`

## Playable Claim

- Player or NPC-visible change:
- Environment affordance:
- Role action or authority change:
- Player-readable consequence:

## Proof

- Command or play path:
- Artifact:
- Result:
- Last successful proof:

## Blocker

- Code:
- Evidence:
- Smallest next action:
- Owner: `agent | human | external_player | device | provider`

## Next Slice

- One-sentence intent:
- Files or areas expected:
- Stop condition:
- Commit/push status:
