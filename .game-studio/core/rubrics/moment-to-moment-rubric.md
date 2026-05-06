# Moment-to-Moment Rubric

Use this rubric for gameplay feel, level readability, UI, camera, art, audio, and input.

## Review Fields

| Field | Question |
| --- | --- |
| Verb | What can the player do now? |
| Read | What tells the player the action is available or risky? |
| Risk | What can fail, cost the player, or force a choice? |
| Response | Does the game respond within the expected feel budget and show consequence? |
| Learning | What should the player understand after the response? |
| Camera | Does framing support action without stealing control? |
| Visual | Can the player separate objective, threat, interactable, and background? |
| Audio | Which sound has priority, and does it carry useful state? |
| Recovery | What happens after a mistake? |
| Internal Evidence | Which capture, playtest note, or metric preserves the proof? |

## Required Chain

Every critical moment should be reviewed as:

```text
Verb -> Read -> Risk -> Response -> Learning -> Internal Evidence
```

Score only when a concrete internal evidence artifact exists. If the capture,
playtest note, or metric is missing, mark the moment unproven.

## Verdicts

- `READY`: The moment is readable, responsive, and aligned with the target experience.
- `CONCERNS`: The moment works but has bounded feel, readability, or comfort risk.
- `NOT_READY`: The player cannot reliably read, act, receive feedback, or recover.
