---
doc: docs/authority-map.md
project: Dream of One
revision: 2026-02-18
status: Active
---

# Documentation Authority Map

## 1) Goal
- Publish the authority boundary for active product, runtime, planning, and archive documents.
- Remove ambiguity between active Runtime Path rules and deprecated reference material.

## 2) Authority Classes
| Document class | Authority type | Primary sources | Scope | Non-authority notes |
|---|---|---|---|---|
| Product definition | Product Definition | `project.md` | Intent, Goal, Scope, Acceptance Criteria, Validation Criteria | Cannot be overridden by design-only notes |
| Execution sequencing | Work Source of Truth | Linear issues | Workstream order, issue status, release progression | `plan.md` is planning guidance, not issue status authority |
| Runtime behavior | Specification | `backend/npc-runtime/src/contracts/types.ts`, `docs/mineflayer/spec/runtime.md`, `docs/mineflayer/spec/action-api.md` | Runtime payload Schema, command constraints, lifecycle/event semantics | Design docs may not redefine runtime Schema |
| Design semantics | Design intent | `docs/design/game-design.md`, `docs/design/dream-laws.md`, `docs/design/cover-tests.md` | Dream Law/Cover Test intent and player-facing readability | Must map to runtime-observable Evidence before release claims |
| Runtime verification | Validation operations | `docs/design/runtime-evidence.md`, `.github/workflows/backend-runtime.yml`, `.github/workflows/backend-evidence-gate.yml` | Evidence collection, gate execution, Release Candidate (RC) checks | Unity archive outputs are reference-only |
| Planning and gap closure | Workstream planning | `plan.md` | Workstream Intent/Background/Phase plan and dependency sequence | Does not replace product/runtime Specification |
| Codex operations | Process guidance | `docs/agent/runbook.md`, `docs/agent/codex-cli-workflow.md`, `docs/agent/decision-ledger.md` | Agent workflow, review/decision governance, ledger discipline | Must follow `AGENTS.md` and terminology rules |
| Deprecated archive | Historical reference | `docs/deprecated/unity/**`, `deprecated/unity/**` | Rollback drill, historical comparison, archive integrity | Never used as release pass/fail authority |

## 3) Conflict Resolution Rules
1. If Product Definition conflicts with a design note, `project.md` wins.
2. If runtime code-level Schema conflicts with design prose, Runtime Path Specification wins.
3. Release pass/fail decisions must use Mineflayer Runtime Path Evidence only.
4. Deprecated Unity references may support rollback context only and cannot define current runtime behavior.
5. Scope changes require synchronized updates to `project.md`, `plan.md`, and the active Linear issue.

## 4) Acceptance Criteria
- Active docs use this authority map when describing Source of Truth ownership.
- Deprecated Unity references are explicitly marked as archive/reference only.
- Runtime and release decisions cite Runtime Path Specification and Evidence artifacts.

## 5) Validation Criteria
- Cross-doc review finds no active doc requiring deprecated Unity implementation as a normative anchor.
- Planning and release comments consistently use `runtime-complete`, `design-complete`, and `release-complete` status labels.
- At least one acceptance cycle links its decision entries to `docs/agent/decision-ledger.md` and Mineflayer Evidence paths.
