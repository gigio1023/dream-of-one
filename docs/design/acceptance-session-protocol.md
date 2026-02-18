---
doc: docs/design/acceptance-session-protocol.md
project: Dream of One
revision: 2026-02-18
status: Active
---

# Acceptance Session Protocol (WS5)

## 1) Goal
- Define a repeatable end-to-end acceptance routine for the v0.1 10-12 minute session loop.
- Standardize run orchestration, Evidence collection, and human review sign-off.

## 2) Scenario catalog (v0.1 mandatory)
| Scenario ID | Focus | Session target | Required social outcome |
|---|---|---|---|
| `AS-01` | Core cover-work loop across all landmarks | 10-12 minutes | At least one report->intake progression and one deterministic ending |
| `AS-02` | Station procedural pressure readability | 10-12 minutes | Intake-stage causality is readable and `SA_BREAK` rejection is observable |
| `AS-03` | Multi-run trajectory diversity | 3 consecutive runs under same setup | Non-identical trajectory signatures across run set |

Landmark coverage for each acceptance cycle is mandatory:
- `Store`
- `Studio`
- `Park`
- `Station`

## 3) Run identifier and artifact indexing
Run ID format:
- `rc-<yyyymmdd>-<scenario-id>-run-<a|b|c>`

Artifact directory conventions:
- Evidence Pack: `data/evidence/ws8/gate-h/run-<x>-evidence-pack.json`
- Events snapshot: `data/evidence/ws8/gate-h/run-<x>-events.json`
- Regression metrics: `data/evidence/ws8/gate-h/run-<x>-regression-metrics.json`
- Trajectory verification: `data/evidence/ws8/gate-h/trajectory-diversity.json`
- RC manifest: `logs/rc/rc-ws8-run-<x>/manifest.json`

## 4) Run orchestration procedure
1. Baseline conformance gate:
   - `npm run check --prefix backend/npc-runtime`
2. Execute run packaging for `run-a`, `run-b`, `run-c`:
   - `npm run ws8:release-gate:backend --prefix backend/npc-runtime -- --run-id rc-ws8-run-<x> --backend-log ../../logs/npc-runtime-real-evidence.log --evidence-out ../../data/evidence/ws8/gate-h/run-<x>-evidence-pack.json --metrics-out ../../data/evidence/ws8/gate-h/run-<x>-regression-metrics.json --out-dir ../../logs/rc --strict`
   - Use distinct per-run backend evidence logs or runtime sessions; do not clone all run artifacts from one identical log input.
3. Export per-run event snapshots:
   - `npm run ws8:events:snapshot --prefix backend/npc-runtime -- --backend-log ../../logs/npc-runtime-real-evidence.log --out ../../data/evidence/ws8/gate-h/run-<x>-events.json --limit 200`
4. Verify trajectory diversity:
   - `npm run ws8:trajectory:verify --prefix backend/npc-runtime -- --evidence ../../data/evidence/ws8/gate-h/run-a-evidence-pack.json --evidence ../../data/evidence/ws8/gate-h/run-b-evidence-pack.json --evidence ../../data/evidence/ws8/gate-h/run-c-evidence-pack.json --out ../../data/evidence/ws8/gate-h/trajectory-diversity.json --min-runs 3 --strict`
5. Record run bundle links and human review result using:
   - `docs/agent/templates/acceptance-review-template.md`

## 5) Human-in-loop review gate
A release decision cannot be finalized until a reviewer completes the template and signs off:
- Pressure legibility (player can explain why pressure increased/decreased).
- Report/intake/verdict readability (causality line is reconstructable).
- Fairness explanation (outcome rationale is understandable with linked Evidence).

## 6) Failure escalation protocol
| Failure type | Severity Tier | Owner | Required action |
|---|---|---|---|
| Missing required artifact path | `blocking` | runtime owner | Re-run failed stage and regenerate artifact bundle |
| Gate metric threshold breach | `blocking` | runtime owner + reviewer | Record reason and open remediation issue before release decision |
| Readability/fairness review rejection | `attention` | design owner + runtime owner | Update causality text path and rerun affected scenario |
| Non-critical optional note mismatch | `reference` | reviewer | Track as backlog improvement |

## 7) Acceptance Criteria
- Scenario set covers core loop, Station pressure readability, and multi-run diversity.
- Each cycle produces a complete and linkable artifact bundle.
- Human reviewer sign-off exists before release-final decision.

## 8) Validation Criteria
- Three consecutive run sets produce all required artifact files with no missing fields.
- Review template is completed with explicit Evidence links and outcome judgment.
- Release status advances to `release-complete` only when this protocol passes.

## 9) Authority links
- Product Definition: `project.md` Section 7
- Runtime gate operations: `docs/design/runtime-evidence.md`
- Rule coverage: `docs/design/rule-runtime-trace-matrix.md`
- Causality rules: `docs/design/social-causality-verification.md`
- Review template: `docs/agent/templates/acceptance-review-template.md`
