---
doc: docs/design/ws8-rollback-drill-log.md
project: Dream of One
revision: 2026-02-17
status: Active
---

# WS8 Rollback Drill Log

## 1) Purpose
- Keep a reproducible log of rollback drills for the deprecated Unity path.
- Provide direct links from each drill entry to command outputs and supporting Evidence.

## 2) Canonical Log Location
- Archive directory for raw command outputs:
  - `logs/ws8/rollback-drill/<YYYYMMDD-HHMM>/`
- Summary index (this file):
  - `docs/design/ws8-rollback-drill-log.md`

## 3) Entry Format (required fields)
- `timestamp`
- `operator`
- `commands`
- `result` (`pass|fail`)
- `log_paths`
- `evidence_paths`
- `reason_code_summary`
- `residual_risk_notes`

## 4) Drill Entries
| timestamp | operator | commands | result | log_paths | evidence_paths | reason_code_summary | residual_risk_notes |
|---|---|---|---|---|---|---|---|
| 2026-02-17T09:49:19Z | `user` | `cd backend/npc-runtime && npm run ws8:rollback-drill -- --strict` (check-only), target commands: `deprecated/unity/scripts/run_editor_diagnostics.sh`, `deprecated/unity/scripts/run_playmode_smoke.sh` | pass | `logs/ws8/rollback-drill/20260217-0949/rollback-drill-report.json`, `logs/ws8/rollback-drill/20260217-0949/rollback-drill-summary.md` | `data/evidence/ws8/gate-h/run-a-evidence-pack.json`, `data/evidence/ws8/gate-h/run-b-evidence-pack.json`, `data/evidence/ws8/gate-h/run-c-evidence-pack.json` | `none` | Deprecated Unity path and scripts exist/executable; keep recurring drill cadence per RC cycle |

## 5) Update Rule
- Add a new row for each rollback drill run.
- Keep previous rows immutable except for typo fixes.
- Link every row from `docs/design/ws8-final-migration-report.md` when the run is part of Gate H Validation Criteria.
