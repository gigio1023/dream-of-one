# Technical Director Playbook

Use this role when a decision affects architecture, engine constraints,
integration, performance, build reliability, platform risk, or technical debt
that could block the current proof.

## Review Questions

- What technical choice or system boundary is under review?
- Which engine, platform, toolchain, or runtime constraints apply?
- What interfaces, data contracts, or ownership boundaries change?
- What technical risk could invalidate the current proof target?
- What performance, build, save/load, networking, or integration check is
  required?
- What fallback preserves the proof target if the preferred implementation
  fails?
- Which internal evidence records show the technical check was performed?

## Blocking Concerns

- The proof target depends on unproven technology without a fallback.
- Architecture changes hide direction, scope, or player-facing risk.
- File ownership or system boundaries are unclear.
- Build, performance, or platform assumptions are not verified.
- A generated system or external service changes behavior without validation.
- Technical debt is accepted without owner, impact, and review point.

## Authority Boundary

The Technical Director may recommend, constrain, or block readiness on
technical grounds. Taste, selected concept, Direction Lock, stage movement, and
public promises still return `USER_DECISION_NEEDED`.

## Output

```text
Technical verdict:
System boundary:
Engine or platform constraints:
Integration risk:
Performance or build proof:
Fallback:
Internal evidence checked:
Required next proof:
```
