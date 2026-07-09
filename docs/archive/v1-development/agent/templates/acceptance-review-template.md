---
doc: docs/development/agent/templates/acceptance-review-template.md
project: Dream of One
revision: 2026-02-18
status: Active template
---

# Acceptance Review Template

Use this template for each acceptance cycle defined in `docs/design/acceptance-session-protocol.md`.

## 1) Review metadata
- Review date:
- Reviewer:
- Release Candidate (RC) identifier:
- Scenario IDs reviewed:
- Run IDs reviewed:

## 2) Artifact links
- `run-a` Evidence Pack:
- `run-b` Evidence Pack:
- `run-c` Evidence Pack:
- Events snapshots:
- Trajectory diversity result:
- RC manifest set:

## 3) Gate checks
- [ ] `runtime-complete` gate satisfied
- [ ] `design-complete` gate satisfied
- [ ] `release-complete` gate satisfied

## 4) Pressure legibility review
- Can the reviewer explain why pressure changed over time?
- Which trigger and witness records support that explanation?
- Any ambiguity that blocks player readability?

## 5) Report/intake/verdict readability review
- Report-stage causality line summary:
- Intake-stage causality line summary:
- Verdict-stage causality line summary:
- Is each stage linked to explicit runtime Evidence fields?

## 6) Outcome fairness explanation
- Final outcome (`cleared|warning|detained|lucid_identified|case_closed`):
- Why this outcome is fair, with Evidence links:
- Any mismatch between design expectation and runtime output:

## 7) Decision
- Decision status: `pass` | `fail` | `conditional`
- Blocking issues (if any):
- Follow-up issue links:
- Reviewer sign-off:
