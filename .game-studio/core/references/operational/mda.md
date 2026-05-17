# MDA Operational Guide

Use this guide when a concept, pillar, feature, or milestone claims that a rule
will create a player experience.

## Source Claim

MDA separates a game into mechanics, dynamics, and aesthetics: the implemented
rules, the behavior those rules create during play, and the experience the
player is meant to have. A review should check the chain, not only the nouns in
the pitch.

## Operating Moves

### 1. Name the mechanic as a player-action rule

Do not accept a feature name as a mechanic. State what the player can do and
what state changes because of it.

Worked example:

```text
Weak: The game has shifting rooms.
Mechanic: The player can spend one charge to rotate the exits of the current
room. The old exit closes and one new exit opens.
```

### 2. Name the dynamic as repeated player behavior

The dynamic is what the player starts doing because the mechanic exists. It
should be observable in a capture or playtest note.

Worked example:

```text
Mechanic: Spend one charge to rotate room exits.
Target dynamic: The player pauses at each room, predicts which exit will close,
then accepts a temporary block to open a safer route.
Observable sign: The player checks exits before shifting and can explain why a
blocked path is recoverable.
```

### 3. Name the intended experience as a testable player state

Avoid mood words alone. Pair the intended experience with the player behavior
that would show it.

Worked example:

```text
Weak: The experience is mysterious.
Testable: The player feels cautious curiosity because each shift creates both a
loss and a discovery. A playtest note should show the player choosing to inspect
before acting, not only walking to the exit.
```

### 4. Check the chain backward

Ask whether the experience could happen without the mechanic. If yes, the
mechanic may be decorative. Ask whether the mechanic produces a different
dynamic. If yes, the player experience claim is unsupported.

Worked failure:

```text
Mechanic: The player can rotate room exits.
Actual dynamic: The optimal move is to shift every room immediately without
inspection.
Actual experience: Busywork, not cautious curiosity.
Review decision: `CONCERNS` until the build creates a reason to observe before
shifting.
```

## Decision Template

```text
Mechanic:
Player-facing rule:
Expected dynamic:
Observable player behavior:
Intended player experience:
Build, capture, or playtest note checked:
Chain verdict: intact | weak | broken
Required change:
Next build or retest:
```

## Failure Modes This Guide Catches

- A pitch names a theme but no player-action rule.
- A mechanic exists but produces the wrong repeated behavior.
- A pillar describes mood without observable player behavior.
- A milestone expands content before the core mechanic-dynamic-experience chain
  is visible in play.

## Anti-Pattern

Do not approve a concept because the theme, art direction, or role fantasy is
strong. Approve it only when the player-action rule can plausibly create the
target behavior and the target behavior can be checked in a playable build.
