# Stage Model

The framework uses stages to prevent the project from skipping proof.

## Stage Authority

The project state file is the authority for the current stage. It also records
`entryMode`, `conceptStatus`, and `directionSource` so resumed sessions know
whether the project is still discovering, carrying in, or producing.

Agents may recommend a stage transition, but they must not advance the stage
without an explicit decision record. A gate verdict can block, clear with
concerns, or recommend the next proof; it is not by itself a stage mutation.

Non-blocking concerns must be carried into the next milestone, risk register,
waiver record, or drift log.

## Pre-Direction Discovery

Direction Lock is not the first step for every project. If no stable direction
exists, route to Creative Discovery before asking for a thesis, pillars, or
release strategy.

Entry modes:

- `direction-carry-in`: existing team, company, project, prototype, pitch, or
  public direction exists and must be preserved before improvement.
- `taste-to-game`: the creator has taste, references, scenes, desired emotions,
  disliked friction, or constraints but no stable game direction.
- `brownfield-unknown`: an existing repo, notes, assets, or prototype exist, but
  authority and stage are unclear.

Concept statuses before and around Direction Lock:

- `UNROUTED`: entry mode has not been selected.
- `TASTE_DISCOVERY`: taste, anti-taste, desired emotion, reference moments, and
  hard noes are being separated.
- `CONCEPT_SLATE`: 3 to 5 concepts are being compared, rejected, parked, and
  proof-planned.
- `CREATIVE_BRIEF`: one selected or candidate concept has target player, core
  verb, intended emotion, distinctive bet, main risk, and first playable proof.
- `FIRST_PROOF_PLANNED`: the first prototype tests one named risk with a bounded
  proof budget.
- `DIRECTION_LOCKED`: Direction Lock has an explicit decision record and has
  cleared the required direction gates.
- `PARKED`: the concept is inactive until a new decision record revives it.

AI may propose concepts, compare concepts, and recommend a first proof. AI must
not claim the user's taste, lock direction, change project stage, or make public
promises without a decision record.

Prose-only Direction Lock is not enough. At minimum, a selected concept must
include target player, core verb, intended emotion, distinctive bet, main risk,
and first playable proof.

Before the first prototype question, the project must run the constraint ladder.
It turns capacity, taste, experience, mechanic, content, and release constraints
into a proof budget, cut rules, and a smallest viable proof path.

## Direction Lock

The game identity is fixed enough for production decisions. This does not mean
the design is final. It means the team has a stable target.

## Protocol Proof

The central rule loop works in the smallest possible playable form.

Examples:

- Talk produces a testable response path.
- Hit produces damage.
- Build produces resource pressure.
- Exploration produces a discovery and a consequence.

## Core Loop Prototype

The player can repeat the main loop with success, failure, feedback, and a reason
to continue. This stage clears through `GS-CORE-LOOP`; direction gates can
support it, but they do not replace playable proof.

## Pre-production Exit

The project has retired enough design, technical, content, QA, accessibility,
and release risk to enter production with a bounded scope.

## Presentation Value Gate

The project proves that its chosen presentation format is justified before
asking a vertical slice to carry target-quality production cost.

## Vertical Slice

A short section reaches the intended shipped quality bar.

## Public Demo Candidate

The game can be played by someone outside the team.

## Small Release Candidate

The game is small, honest, and complete enough to release.

## Terminal Outcomes

Stage and gate work should end with one of these outcomes:

- `DONE`
- `DONE_WITH_CONCERNS`
- `BLOCKED`
- `NEEDS_CONTEXT`
- `FAILED`
- `USER_DECISION_NEEDED`

Every terminal outcome records:

- proof checked
- missing internal evidence artifacts
- next proof
- owner or deciding role
- whether stage state changed
