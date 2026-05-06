# Production Judgment Rubric

Use this rubric when reviewing milestones, roadmaps, phase transitions, or release plans.

## READY

- The milestone retires a named uncertainty.
- The scope is the smallest useful proof.
- The proof budget is explicit.
- Non-goals and cut candidates are explicit.
- Required internal evidence artifacts are tied to the proof target.
- Dependencies, owners, and review roles are named.
- QA, playtest, accessibility, localization, and release impacts are scoped.
- A fallback proof exists.
- Stage advancement depends on a review verdict and decision record.

## CONCERNS

- The milestone can begin, but one risk needs active tracking.
- Scope is probably feasible but lacks a clear cut line.
- Internal evidence artifacts exist but need stronger player-facing proof.
- Release impact is bounded but not fully mapped.

## NOT_READY

- The milestone is a task pile.
- The team cannot say what decision follows the milestone.
- The scope depends on unassigned content, technology, or review work.
- Playtest proof or QA evidence arrives after the stage decision.
- Public promises are ahead of build truth.
- Confidence language replaces a playable proof or review verdict.

## Producer Prompt

```text
What are we trying to prove?
What is the smallest proof?
What is the proof budget?
What gets cut first?
Who must review the proof?
What happens if the proof fails?
```
