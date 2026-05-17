# Council Review

Use the council when one role cannot safely decide readiness.

## Review Modes

- `full`: major stage transitions and public release.
- `lean`: solo indie and small-team default.
- `solo`: low-risk internal iteration.

## Default Lean Roles

- `game-director`
- `producer`
- `technical-director`
- `qa-lead`

## Output

```text
Review mode:
Roles activated:
Proof checked:
Internal evidence checked:
Playbooks used:
Role verdicts:
Dissent:
Final verdict:
Required fixes:
```

## Verdict Rule

The strictest role verdict is the final verdict.

Return `USER_DECISION_NEEDED` when the next step requires concept selection,
Direction Lock, stage movement, or a public promise from the human.
