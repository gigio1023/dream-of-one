# Design Intent Survival

Use this before implementation review when a change touches gameplay, camera,
input, UI timing, feedback, level flow, economy, narrative triggers, save/load,
or tuning.

## Questions

- Is the selected concept still recognizable?
- Is the creative brief still true?
- Does the proof target still match the milestone?
- Did implementation silently change player experience?
- Are placeholder decisions still within scope?
- Are tuning changes intentional and recorded?
- What proof shows the intended behavior survived?

## Silent Drift Risks

- update order changes feel or timing
- collision priority changes player read
- defaults change difficulty or pacing
- event names change narrative or UI timing
- refactor removes a feedback path
- agent adds a generic genre feature outside the brief

## Output

```text
Design intent:
Changed behavior:
Proof checked:
Internal evidence checked:
Drift found:
Required next proof:
```
