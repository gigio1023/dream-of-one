# Game Feel Operational Guide

Use this guide when a claim depends on input, timing, camera, animation,
physics, UI feedback, sound, or recovery after mistakes.

## Source Claim

Game feel is the real-time relationship between player input and the game's
response. A review should inspect the control loop as a sequence, not as a
general statement that a verb feels good.

## Operating Moves

### 1. Write the primary verb as a response chain

Break the verb into input, startup, motion or state change, confirmation,
consequence, and recovery.

Worked example:

```text
Verb: short dash
Input: press Shift
Startup: avatar leans for 3 frames
Motion: avatar moves 2 tiles in the aimed direction
Confirmation: trail flash and low click
Consequence: cross one hazard gap or collide with a wall
Recovery: 0.25 second pause before movement returns
```

### 2. Record the feel budget before tuning

The budget is not a universal rule; it is the project's current expectation.
Use it so reviewers can see whether the build changed the intended feel.

Worked example:

```text
Input response: visible within 100 ms
Camera response: no sudden snap during dash
Audio priority: dash confirmation must be audible over ambience
Recovery: mistake should be readable, not punitive
```

### 3. Check consequence, not only polish

Juice can hide that the action does not change play. For each feedback element,
state what gameplay fact it confirms.

Worked example:

```text
Trail flash confirms movement direction.
Wall bump sound confirms collision.
Cooldown icon confirms the dash cannot be reused yet.
Camera settle confirms control has returned.
```

### 4. Inspect failure and recovery

Every important verb needs a mistake path. If the player can fail, the build
must show what happened and how to continue.

Worked failure:

```text
The dash has strong particles and sound, but missing recovery. When the player
hits a wall, the avatar stops with no readable bump, cooldown, or next safe
input. The review should block polish expansion until the failure path is
visible.
```

## Decision Template

```text
Primary verb:
Input:
Expected response budget:
Confirmation:
Gameplay consequence:
Failure and recovery:
Capture checked:
Feel verdict: ready | readable but weak | blocked
Required change:
Next build or retest:
```

## Failure Modes This Guide Catches

- A verb looks polished but does not confirm success, failure, or danger.
- Camera movement makes the action harder to read.
- Audio and VFX confirm style instead of gameplay consequence.
- A failed input leaves the player without a readable recovery path.

## Anti-Pattern

Do not use a still screenshot to approve game feel. If the claim depends on
timing, control, camera, or audio, require direct play or a capture.
