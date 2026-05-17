# Proof And Evidence Review

User-facing proof must be observable, reproducible, and tied to a milestone
claim. Internal evidence records preserve the concrete artifacts behind that
proof.

## Flow

1. List the proof target.
2. List required proof artifacts.
3. Check whether each artifact exists.
4. Classify internal evidence as implementation, design, player,
   accessibility, or release evidence.
5. Run deterministic checks when listed.
6. Record manual role checks.
7. Separate missing proof from failed proof.
8. Record missing internal evidence separately.

## Output

```text
Verdict:
Proof target:
Proof checked:
Internal evidence checked:
Missing proof:
Failed proof:
Missing internal evidence:
Manual review checked:
Residual risk:
Next gate:
```

## Decision Rule

Use `NOT_READY` when proof is missing for the central milestone claim.

Use `CONCERNS` when proof exists but leaves a bounded risk.
