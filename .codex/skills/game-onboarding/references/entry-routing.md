# Entry Routing

Use entry routing before Direction Lock when the project may not yet have a
stable direction.

## Entry Modes

| Mode | Use when | First action | First output |
| --- | --- | --- | --- |
| `direction-carry-in` | The user brings a direction, mandate, task, pitch, prototype, release promise, or existing game thesis. | Preserve the existing direction and audit missing proof. | Direction source, authority owner, stage inference, missing proof. |
| `taste-to-game` | The user has taste, references, desired emotions, scenes, constraints, or dislikes, but no stable direction. | Elicit taste and create a small concept slate. | Taste profile, 3 to 5 comparable concepts, candidate creative brief. |
| `brownfield-unknown` | A repo, prototype, notes, or docs exist, but stage, authority, and current direction are unclear. | Audit the existing material before writing new direction docs. | Current-state classification, preserved decisions, next proof. |

## Routing Flow

1. Inventory available direction signals: request text, project state, direction
   docs, prototypes, release promises, milestone contracts, and review verdicts.
2. If existing direction is explicit, choose `direction-carry-in`; preserve it
   before improving it.
3. If only taste, references, emotions, scenes, or hard noes are present, choose
   `taste-to-game`; do not require formal game-design vocabulary first.
4. If project files exist but authority or stage is unclear, choose
   `brownfield-unknown`; audit before changing direction.
5. Name the first required artifact and the next skill or gate.
6. Stop when the next step requires human taste, concept selection, Direction
   Lock, stage movement, or a public promise.

## Output Shape

```markdown
## Entry Mode
## Direction Source
## Creator Fluency
## Authority Owner
## Current Concept Status
## First Required Artifact
## Next Skill Or Gate
## Stop Condition
```

## Route Details

### `direction-carry-in`

- Direction source: existing thesis, pitch, mandate, prototype, task, or public
  promise.
- First required artifact: direction carry-in audit or current project state.
- Next skill or gate: usually `game-director`, `game-studio`, or
  `GS-ENTRY-ROUTE`.
- Stop condition: `USER_DECISION_NEEDED` if the direction owner must accept a
  changed player promise, Direction Lock, stage movement, or public promise.

### `taste-to-game`

- Direction source: taste signals, reference moments, desired emotions,
  undesired friction, hard noes, session tolerance, complexity tolerance, and
  proof appetite.
- First required artifact: taste profile.
- Next skill or gate: concept slate, creative brief, then
  `GS-TASTE-CLARITY`, `GS-CONCEPT-SLATE`, and `GS-CREATIVE-BRIEF`.
- Stop condition: `USER_DECISION_NEEDED` for selected concept, Direction Lock,
  or replacement of the core player fantasy.

### `brownfield-unknown`

- Direction source: existing repo, notes, prototype, docs, or generated assets
  with unclear authority.
- First required artifact: adoption or state audit that separates preserved
  decisions from guesses.
- Next skill or gate: adoption audit, then route to `direction-carry-in` or
  `taste-to-game`.
- Stop condition: `USER_DECISION_NEEDED` if the human must confirm who owns
  direction, whether old docs still apply, or whether public promises remain
  active.

## Pre-Direction Proof Gates

- `GS-ENTRY-ROUTE`: entry mode is explicit.
- `GS-TASTE-CLARITY`: taste, anti-taste, desired emotion, reference moments,
  and hard noes are separated.
- `GS-CONCEPT-SLATE`: 3 to 5 concepts are comparable, rejectable, and proofable.
- `GS-CREATIVE-BRIEF`: one selected concept is short, directional, and
  proof-ready.
- `GS-CONSTRAINT-LADDER`: scope has been converted into a proof budget.
- `GS-PROTOTYPE-QUESTION`: the first prototype tests one named risk.

## AI Authorship Boundary

AI can propose and compare concepts, explain tradeoffs, recommend rejection,
draft candidate briefs, and plan proof targets.

AI must not own the creator's taste, silently select the final concept, lock
direction, move stages, make public promises, or turn parked ideas into active
scope without a decision record.

## Language Rule

In user-facing output, say `proof`, `playable proof`, `proof target`, `proof
budget`, and `validation`.

Use `evidence` only when naming internal artifacts: builds, captures, playtest
notes, QA results, telemetry, screenshots, videos, decision records, and
public-claim checks.
