# Storylets Operational Guide

Use this guide when a quest, dialogue beat, encounter, lore reveal, or
AI-assisted narrative system can appear in different orders or under different
state conditions.

## Source Claim

A storylet is a small story unit with conditions for when it can appear and
effects after it resolves. The structure keeps branching content testable by
making state, cost, and coverage explicit.

## Operating Moves

### 1. Define each beat as preconditions, play action, and effects

Do not review a beat only as prose. Name when it can happen, what the player
does, and what changes after it happens.

Worked example:

```text
Storylet: The locked garden gate
Preconditions: player has met the gardener; storm has started
Player action: choose whether to spend the brass key
Effects: key is consumed; garden route opens; gardener trust changes by -1
Consequence: later shelter scene has a colder greeting
```

### 2. Separate content branches from state branches

A content branch gives different text. A state branch changes future play. Both
can be valid, but only state branches should be sold as consequence.

Worked example:

```text
Flavor branch: the gardener comments on the rain differently.
State branch: the key is consumed and the garden route opens.
Review note: only the second branch changes the scenario graph.
```

### 3. Add a coverage rule before adding branches

Every branch needs a way to be reached, tested, localized, and reviewed. If the
team cannot cover it, collapse it.

Worked example:

```text
Coverage rule: each storylet must have one happy-path test, one blocked-state
test, and one localization note. If a branch cannot be reached in a 10-minute
walkthrough, mark it as cut or parked.
```

### 4. Check contradiction and repeat behavior

Storylets often fail when repeated, skipped, or triggered after the facts they
depend on have changed.

Worked failure:

```text
The gardener thanks the player for saving the greenhouse even if the player
never entered it. The storylet has no precondition tied to the greenhouse state.
Review decision: `NOT_READY` for narrative state until preconditions and test
coverage exist.
```

## Decision Template

```text
Storylet or beat:
Preconditions:
Player action:
Effects:
Future consequence:
Repeat, skip, or contradiction risk:
Coverage rule:
Content budget:
Narrative verdict:
Next build or retest:
```

## Failure Modes This Guide Catches

- Branch count grows faster than QA, localization, or writing capacity.
- Dialogue implies consequences that the game state does not track.
- AI-generated text changes canon without a state owner.
- A narrative beat can trigger after it no longer makes sense.

## Anti-Pattern

Do not approve a branch because the writing is strong. Approve it when the
state model, coverage rule, and future consequence are clear enough to test.
