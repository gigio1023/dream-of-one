# Codex Review Practice

Use this when a project asks for readiness, quality, or game-direction review.

## What Scripts May Decide

Scripts may decide narrow invariants:

- Required files exist.
- JSON parses.
- A documented command exits successfully.
- A banned private term is absent.
- A build artifact can be opened.

Scripts must not decide whether the game is good, coherent, readable, playable,
or ready to promise publicly.

## What Codex Must Decide

Codex reviews the substance:

- The game thesis creates a specific playable promise.
- Mechanics produce dynamics that support the intended experience.
- The player can read goals, state, affordances, consequences, and failure.
- Narrative content is playable, scoped, testable, and connected to state.
- Art, audio, UI, camera, input, and level layout communicate the intended action.
- QA evidence separates observation, inference, severity, priority, and waiver.
- Release claims match the current build and known limitations.

## Review Order

1. Read the entry mode, current stage, milestone contract, and player experience
   target.
2. Inspect the playable proof before implementation notes when possible.
3. Name the central claim being reviewed.
4. Separate missing proof from missing internal evidence.
5. Apply active role playbooks.
6. Record tradeoffs, accepted risks, and reversal cost.
7. Return `READY`, `CONCERNS`, or `NOT_READY`.

## Findings Shape

```text
Verdict:
Central claim:
Proof checked:
Internal evidence checked:
What works:
Blocking concerns:
Advisory concerns:
Accepted risks:
Recommended cut:
Next proof:
```

## Review Bias

Prefer a smaller game with clear proof over a larger plan with vague confidence.
