# Gates

Gates are reusable review prompts with stable IDs.

Use the strictest verdict when multiple reviewers participate.

## Language

Use `proof`, `playable proof`, `proof target`, and `proof gate` when describing
why a game should advance. Use `evidence` only for internal artifact classes
such as captures, builds, playtest notes, QA results, telemetry, screenshots,
videos, decision records, and release claim checks.

Gate verdicts do not mutate project stage state. Stage movement requires an
explicit decision record.

## Verdicts

- `READY`: The work can advance.
- `CONCERNS`: The work can advance only if listed concerns are accepted or fixed.
- `NOT_READY`: The work must not advance.

## Gate Result Backbone

Every gate result should record:

- verdict
- confidence
- proof checked
- missing internal evidence artifacts
- required decision
- next proof
- next skill or gate

## Pre-Direction Gates

- `GS-ENTRY-ROUTE`: The project knows whether it is carrying direction,
  discovering from taste, or auditing ambiguous state.
- `GS-TASTE-CLARITY`: Taste, anti-taste, desired emotion, reference moments,
  and hard noes are separated.
- `GS-CONCEPT-SLATE`: A small concept slate is comparable, rejectable, and
  proofable.
- `GS-CREATIVE-BRIEF`: One selected or candidate concept is short, directional,
  and proof-ready.
- `GS-CONSTRAINT-LADDER`: Creative ambition has been bounded into capacity,
  taste, experience, mechanic, content, and release constraints.
- `GS-PROTOTYPE-QUESTION`: The first prototype tests one named risk.

## Production Gates

- `GS-PROTOCOL-PROOF`: The central rule loop works in the smallest useful form.
- `GS-CORE-LOOP`: The player can repeat the core loop with success, failure,
  readable feedback, and a reason to continue.
- `GS-PREPRODUCTION-EXIT`: The project can enter production with bounded scope
  and assigned risks.
- `GS-PRESENTATION-VALUE`: The chosen presentation format earns its production
  cost.
- `GS-VERTICAL-SLICE`: A short section reaches the intended shipped quality bar.

## Gate Files

- `direction.md`: entry routing, creative discovery, game identity, pillars,
  player experience, and AI authority.
- `production.md`: protocol proof, core loop proof, pre-production exit,
  presentation value, and vertical slice.
- `narrative.md`: story, scenario, dialogue, lore, and narrative AI boundaries.
- `release.md`: public promise and release readiness.
