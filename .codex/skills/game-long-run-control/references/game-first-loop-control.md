# Game-First Loop Control

Use this reference when an agent is expected to keep working across many slices.
The control goal is not "stay busy." The control goal is to keep returning to
playable game progress.

## First Question

Before changing files, answer:

```text
What is the smallest playable change or proof that makes the intended game more
real in the current build?
```

If the answer is a document, test, helper script, or research note, name the
playable claim it protects. If no such claim exists, choose a game slice instead
or stop with a blocker.

## Work Classification

| Type | Counts as material progress when |
| --- | --- |
| `playable` | The running game has a new or changed player/NPC-visible consequence. |
| `proof` | A launch, gameplay, provider, or evidence path now proves the active claim. |
| `support` | It directly unblocks the next playable proof and is followed by that proof. |
| `blocked` | It names the external action needed and prevents false continuation. |

## Support-Work Limit

After two support-only slices, the next slice must be one of:

- playable implementation;
- supported gameplay probe or play session;
- blocker report with the exact missing human, device, auth, budget, or outside
  player action.

## Resume Labels

- `resume`: continue the same slice.
- `partial_resume`: rerun discovery or proof before edits.
- `retry`: retry once because no durable handle or artifact exists.
- `manual_required`: inspect duplicate risk, stale state, spend, auth, or device
  state first.
- `done_waiting_on_human`: stop internal work; the next gate is outside the
  agent.

## Required Status Footer

```text
Status:
Work type: playable | proof | support | blocked
Player-visible change:
Files changed:
Proof run:
Material progress: yes | no
Support-only streak:
Blocker:
Resume mode:
Next slice:
Commit/push:
```

The footer is a claim. Verify it against the diff, state files, and proof
artifacts before advancing.
