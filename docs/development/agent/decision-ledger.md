---
doc: docs/development/agent/decision-ledger.md
project: Dream of One
revision: 2026-02-18
status: Active
---

# Decision Ledger Standard (WS6.3)

## 1) Intention
- Keep review, scope, and gate decisions reconstructable across release cycles.
- Ensure each decision includes date, owner, and linked Evidence.

## 2) Background
Codex review loops and release gates can produce many comments and follow-up commits. Without a structured ledger, the team cannot reliably answer:
- what decision was made,
- who approved it,
- what Evidence justified it,
- and whether it is still open.

This document standardizes the required ledger schema and operating routine.

## 3) Required schema
Each ledger row must include all fields below:

| Field | Description |
|---|---|
| `decision_date` | UTC date/time when decision was recorded |
| `owner` | Decision owner (person or agent handle) |
| `comment_id` | Review comment identifier or external decision reference |
| `source` | Origin (`codex-review`, `copilot-review`, `human-review`, `planning`) |
| `author` | Author of the source comment/decision |
| `severity` | `blocking|attention|reference` |
| `decision` | `valid|partial|invalid|defer` |
| `action` | Summary of implemented or planned action |
| `commit` | Commit SHA or `none` when not applicable |
| `status` | `open|in_progress|resolved|deferred` |
| `reason` | Deterministic rationale for decision |
| `evidence_links` | One or more runtime/doc/test artifact paths that justify the decision |

## 4) Ledger record template
Use this table row structure in issue comments or PR notes:

| decision_date | owner | comment_id | source | author | severity | decision | action | commit | status | reason | evidence_links |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-04-27T00:00:00Z | user | DRE-171 | codex-review | codex | blocking | valid | Added Godot intake policy guard and Evidence validation | local | resolved | `SA_BREAK` during intake violates Specification | `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json` |

## 5) Operating protocol
1. Open a ledger entry when a review/gate/scope decision is made.
2. Set `status=open` unless action was already completed in the same step.
3. When code or doc updates land, add `commit` and update `status`.
4. Mark `status=resolved` only when linked Evidence confirms closure.
5. Keep deferred items as `status=deferred` with explicit follow-up issue links.

## 6) Acceptance Criteria
- Every scope or gate decision has `decision_date`, `owner`, and `evidence_links`.
- Review comments with actionable findings are tracked to resolved or deferred state.
- Release posture changes are explainable from ledger history alone.

## 7) Validation Criteria
- Random sampling of recent decision entries finds no missing required fields.
- Every `resolved` row links to reproducible Evidence artifacts.
- Deferred rows link to an open issue and an explicit risk reason.

## 8) Related docs
- Operational runbook: `docs/development/agent/runbook.md`
- Codex workflow: `docs/development/agent/codex-cli-workflow.md`
- Acceptance protocol: `docs/design/acceptance-session-protocol.md`
- Authority map: `docs/design/authority-map.md`
