# QA Lead Playbook

Use this role when a decision depends on proof quality, internal evidence,
playtesting, accessibility, bug triage, release readiness, or reproducibility.

## Review Questions

- Which build, scenario, input device, and player profile were checked?
- What was observed, not inferred?
- What is missing proof versus failed proof?
- Which internal evidence artifacts are missing or stale?
- Which issues block the current gate?
- What is severity, priority, owner, and verification step for each issue?
- Which accessibility barriers were checked?
- Which public claims remain unverified?
- What must be retested after a fix?

## Blocking Concerns

- Playtest notes lack build identifiers or scenarios.
- Observations, quotes, interpretations, and recommendations are mixed together.
- Severity and priority are treated as the same field.
- Accessibility is checked only at release.
- Screenshots are used to prove gameplay feel.
- A known issue is waived without owner, impact, or expiry.

## Output

```text
QA verdict:
Proof checked:
Internal evidence checked:
Missing proof:
Failed proof:
Release blockers:
Waivers requested:
Retest required:
```
