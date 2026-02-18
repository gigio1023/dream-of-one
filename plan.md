---
doc: plan.md
project: Dream of One
revision: 2026-02-18
status: Complete (v4 Gap Closure Plan delivered)
owner: You
---

# Dream of One - Execution Plan (Gap Closure v4)

## 0) Status Snapshot
- Date: 2026-02-18
- Planning source: repository feasibility review findings (2026-02-18)
- Product target: playable v0.1 slice with deterministic social-stealth pressure loop
- Runtime Path: Mineflayer Bot + TypeScript backend
- Legacy runtime: Unity deprecated path retained for rollback/reference
- Work Source of Truth: Linear issues
- Local execution graph: Beads (`bd`)

## 1) Intent
Close the documented gap between current runtime readiness and the design-complete v0.1 gameplay promise by aligning scope language, making Dream Law/Cover Test behavior executable, enforcing runtime gates in CI, clarifying Specification authority, and institutionalizing end-to-end Acceptance Criteria verification.

## 2) Background
Current repository state is strong on runtime hardening and Evidence operations (Schema, Fallback Path, queue control, telemetry endpoints, Gate H artifacts). The remaining gap is not baseline runtime safety; the gap is design-to-runtime closure and release governance automation.

Key baseline strengths already present:
- Deterministic runtime guardrails and bounded execution.
- Evidence Pack pipeline and migration artifacts.
- Clear primary Runtime Path and deprecated Unity policy.

Key gap themes from the feasibility review:
1. Scope narrative can be misread as full-game complete when target is v0.1 slice.
2. Dream Law/Cover Test design breadth exceeds executable runtime enforcement breadth.
3. Runtime quality gates are local-first and not enforced by CI.
4. Some active Specification text still references deprecated Unity implementation as alignment anchor.
5. End-to-end Acceptance Criteria verification is not yet systematized as a repeatable release routine.

## 3) Goals
- Goal 1: Make v0.1 scope boundary explicit and non-ambiguous across core docs and execution governance.
- Goal 2: Convert design-defined social pressure rules into executable and verifiable runtime behavior.
- Goal 3: Enforce runtime verification and release Evidence gates in CI and release workflow.
- Goal 4: Resolve Specification authority ambiguity between active Runtime Path and deprecated Unity references.
- Goal 5: Establish repeatable end-to-end acceptance validation for the 10-12 minute session loop.

## 4) Scope
### In Scope
- Planning, governance, and sequencing needed to close the five audit findings.
- Runtime-facing behavior closure for Dream Laws, Cover Tests, and report/intake/verdict causality.
- CI/release gate planning for check automation and Evidence artifact verification.
- Documentation authority realignment and deprecated-reference hygiene.
- End-to-end acceptance validation process design (automated + human-in-loop protocol).

### Out of Scope
- New gameplay systems outside `project.md` v0.1 boundary.
- Stack migration away from current TypeScript backend.
- Expansion to economy/combat/progression systems.
- Deletion of deprecated Unity assets.

## 5) Non-Negotiable Constraints
- Keep `project.md` as primary product definition.
- Keep Linear as execution Source of Truth.
- Keep Mineflayer Runtime Path as release authority.
- Keep Fallback Path deterministic and Evidence-traceable.
- Keep bounded NPC actions and player speech acts.
- Keep deprecated Unity path retained, not deleted.
- Keep terminology aligned with `terminology.md` canonical vocabulary.

## 6) Workstream Overview
| Workstream | Purpose | Primary gap addressed |
|---|---|---|
| WS1 Scope Alignment | Remove ambiguity between v0.1 slice and full-game interpretation | Finding 1 |
| WS2 Design Executability Closure | Align Dream Laws/Cover Tests with executable runtime Specification | Finding 2 |
| WS3 CI and Release Gates | Enforce runtime checks and Evidence gates in automation | Finding 3 |
| WS4 Specification Authority Cleanup | Remove active dependency on deprecated Unity alignment anchors | Finding 4 |
| WS5 End-to-End Acceptance System | Standardize run-level verification for session loop and social outcomes | Finding 5 |
| WS6 Governance and Tracking | Keep execution traceable and auditable across cycles | Cross-cutting |

## 6.1) Completion status (2026-02-18)
| Workstream | Status | Delivered artifacts |
|---|---|---|
| WS1 Scope Alignment | complete | `project.md`, `README.md`, `docs/overview.md` scope/status label alignment |
| WS2 Design Executability Closure | complete | `docs/design/rule-runtime-trace-matrix.md`, `docs/design/social-causality-verification.md` |
| WS3 CI and Release Gates | complete | `.github/workflows/backend-runtime.yml`, `.github/workflows/backend-evidence-gate.yml` |
| WS4 Specification Authority Cleanup | complete | `docs/authority-map.md`, `docs/spec/org-npc-v1.md`, `docs/design/runtime-evidence.md` cleanup |
| WS5 End-to-End Acceptance System | complete | `docs/design/acceptance-session-protocol.md`, `docs/agent/templates/acceptance-review-template.md` |
| WS6 Governance and Tracking | complete | `docs/agent/decision-ledger.md`, `.github/ISSUE_TEMPLATE/*.md`, runbook/workflow ledger linkage |

## 7) Detailed Plan

## WS1 - Scope Alignment (v0.1 clarity)
### Phase WS1.1 - Canonical scope statement
- Define a single canonical statement describing v0.1 as a vertical slice, not full content-complete game.
- Place this statement in all top-level reader entry points.

Acceptance Criteria:
- Scope statement appears consistently in `project.md`, `README.md`, and `plan.md`.
- No conflicting wording implies full content-complete delivery in current cycle.

Validation Criteria:
- Documentation review confirms one consistent scope narrative across primary entry docs.

### Phase WS1.2 - Scope split model
- Create explicit split between:
  - v0.1 completion criteria,
  - post-v0.1 expansion backlog.
- Define what is “must-have now” versus “future expansion.”

Acceptance Criteria:
- Every major design requirement is tagged as either v0.1 mandatory or post-v0.1 backlog.

Validation Criteria:
- Linear roadmap reflects the same split without mixed-priority wording.

### Phase WS1.3 - Stakeholder-facing status model
- Define a simple release language for status reporting:
  - runtime-complete,
  - design-complete,
  - release-complete.

Acceptance Criteria:
- Status reports and release comments use the standardized labels.

Validation Criteria:
- Two consecutive reporting cycles show no label drift.

## WS2 - Design Executability Closure (Dream Laws/Cover Tests)
### Phase WS2.1 - Rule-to-runtime trace matrix
- Build a trace matrix linking Dream Law and Cover Test definitions to runtime-observable behavior and Evidence fields.
- Identify non-executable design clauses and classify them by criticality.

Acceptance Criteria:
- Matrix exists for all global and landmark rule groups.
- Non-executable clauses are classified as blocking or backlog.

Validation Criteria:
- Review confirms each mandatory v0.1 rule has a runtime-observable trace point.

### Phase WS2.2 - Social process causality closure
- Standardize report/intake/verdict causality requirements for runtime outputs and player-facing interpretation.
- Define minimum “why-line” and artifact linkage expectations.

Acceptance Criteria:
- Every escalation stage has deterministic causality requirements.
- Required artifact categories are defined for each stage.

Validation Criteria:
- Sample run reviews show readable “what triggered / who witnessed / what record was created” structure.

### Phase WS2.3 - Landmark scenario closure
- Define mandatory scenario coverage for `Store`, `Studio`, `Park`, `Station` within session target.
- Establish per-landmark minimum trigger and evidence expectations.

Acceptance Criteria:
- Each landmark has defined mandatory trigger and evidence conditions.
- Session choreography remains within 10-12 minute target boundaries.

Validation Criteria:
- Scenario verification report demonstrates all landmarks are covered in planned run sets.

### Phase WS2.4 - Deterministic bounded-behavior consistency
- Reconcile design intent with bounded action/speech constraints.
- Explicitly prohibit design additions that violate current bounded model during v0.1.

Acceptance Criteria:
- Design docs and runtime constraints use the same bounded vocabulary.

Validation Criteria:
- Policy review confirms no v0.1 requirement requires unbounded behavior.

## WS3 - CI and Release Gates
### Phase WS3.1 - Runtime quality gate in CI
- Define required CI checks for build, integration tests, and essential runtime conformance.
- Mark these checks as release-blocking for Runtime Path changes.

Acceptance Criteria:
- CI policy defines blocking versus non-blocking checks.
- Runtime Path changes cannot merge without passing required gates.

Validation Criteria:
- Pull request checks demonstrate required gate enforcement in practice.

### Phase WS3.2 - Evidence gate automation
- Define automation that validates required Evidence Pack and trajectory artifacts for release decisions.
- Include deterministic pass/fail interpretation rules.

Acceptance Criteria:
- Release gate policy references only Mineflayer Runtime Path Evidence artifacts.
- Required artifact set is machine-verifiable.

Validation Criteria:
- Dry-run release gate produces pass/fail output with explicit reason summary.

### Phase WS3.3 - Failure escalation protocol
- Define action policy for gate failures (owner, SLA target, rollback decision path).
- Separate blocking failures from attention-level follow-up.

Acceptance Criteria:
- Gate failures produce deterministic issue routing and decision ownership.

Validation Criteria:
- Failure simulation run confirms escalation protocol is followed without ambiguity.

## WS4 - Specification Authority Cleanup
### Phase WS4.1 - Authority map publication
- Publish a clear authority map for each doc class:
  - product definition,
  - runtime Specification,
  - deprecated historical reference.

Acceptance Criteria:
- Every active doc declares authority type and scope.

Validation Criteria:
- Cross-doc review finds no unresolved authority conflicts.

### Phase WS4.2 - Deprecated reference isolation
- Remove or downgrade active alignment statements that depend on deprecated Unity implementation.
- Keep deprecated docs as archive/reference only.

Acceptance Criteria:
- Active Runtime Path docs no longer require deprecated Unity code as normative anchor.

Validation Criteria:
- Documentation lint/review confirms active docs point to Runtime Path authority sources.

### Phase WS4.3 - Terminology and naming consistency
- Align canonical terms across plan/design/runbook/release materials.
- Ensure terms like `Specification`, `Acceptance Criteria`, and `Validation Criteria` remain consistent.

Acceptance Criteria:
- Canonical terminology is used in updated docs without conflicting aliases.

Validation Criteria:
- Terminology review checklist passes for all modified planning/governance docs.

## WS5 - End-to-End Acceptance System
### Phase WS5.1 - Acceptance scenario specification
- Define standard acceptance run scenarios for v0.1 loop verification.
- Include expected session length, social pressure trajectory expectations, and fallback tolerance.

Acceptance Criteria:
- Scenario set covers core session loop and social causality outcomes.

Validation Criteria:
- Scenario pack review confirms alignment with `project.md` Section 7 criteria.

### Phase WS5.2 - Run orchestration and evidence capture protocol
- Define repeatable run procedure for collecting telemetry, Evidence Pack, and run summary artifacts.
- Standardize run identifiers and artifact indexing.

Acceptance Criteria:
- Run protocol yields reproducible artifacts for each acceptance scenario.

Validation Criteria:
- Three consecutive run sets produce complete artifact bundles without missing required fields.

### Phase WS5.3 - Human-in-loop review gate
- Add explicit human review step for player-facing readability criteria:
  - pressure legibility,
  - report/intake/verdict readability,
  - outcome fairness explanation.

Acceptance Criteria:
- Review template exists and is required before release decision finalization.

Validation Criteria:
- Acceptance cycle logs include reviewer sign-off and linked Evidence references.

## WS6 - Governance and Tracking
### Phase WS6.1 - Linear issue quality standard
- Standardize issue template requirements (Goal, Scope, Acceptance Criteria, Validation Criteria, constraints).
- Require alignment with current workstream/phase context.

Acceptance Criteria:
- New execution issues include all required planning fields.

Validation Criteria:
- Issue sampling across one cycle shows compliance with template requirements.

### Phase WS6.2 - Beads graph hygiene
- Keep atomic local execution decomposition aligned with Linear sequencing.
- Track discovered follow-up work explicitly with dependency links.

Acceptance Criteria:
- Each active Linear issue has corresponding atomic Beads coverage when local execution is ongoing.

Validation Criteria:
- Beads dependency graph shows no orphan high-priority local tasks.

### Phase WS6.3 - Decision ledger discipline
- Record planning decisions, deferrals, and risk posture changes with dated rationale.

Acceptance Criteria:
- Every scope or gate decision includes date, owner, and linked Evidence.

Validation Criteria:
- Decision review can reconstruct why release posture changed between cycles.

## 8) Dependency Sequence
1. WS1 scope alignment starts immediately and gates phrasing in all downstream work.
2. WS4 authority cleanup runs in parallel with WS1, and must complete before final WS2 sign-off.
3. WS2 design executability closure defines behavior targets for WS5 acceptance scenarios.
4. WS3 CI/gate automation must be ready before release-complete status can be claimed.
5. WS5 end-to-end acceptance system must pass at least one full cycle before milestone closure.
6. WS6 governance runs continuously across all phases.

## 9) Milestone Model
### Milestone A - Planning lock
- WS1 + WS4 baseline complete.
- Scope and authority ambiguity resolved.

### Milestone B - Executability lock
- WS2 matrix and causality closure complete.
- Mandatory v0.1 social process criteria are executable and verifiable.

### Milestone C - Automation lock
- WS3 CI/release gates active.
- WS5 acceptance protocol operational with reproducible artifacts.

### Milestone D - Release readiness lock
- All milestone criteria satisfied.
- Residual risk backlog explicitly categorized as non-blocking or blocking.

## 10) Risk Register
| Risk ID | Risk | Impact | Mitigation plan |
|---|---|---|---|
| R-01 | Scope re-expansion during v0.1 closure | schedule churn, acceptance instability | enforce WS1 scope split and change-control rule |
| R-02 | Design clauses remain non-executable | design/runtime divergence | complete WS2 trace matrix before release claims |
| R-03 | CI gates remain optional in practice | regression leakage | WS3 release-blocking gate policy |
| R-04 | Deprecated references re-enter active docs | authority ambiguity | WS4 authority map and review checklist |
| R-05 | End-to-end runs become ad-hoc | non-reproducible acceptance | WS5 standardized scenario and artifact protocol |

## 11) Completion Criteria for this Plan Cycle
This plan cycle is complete when:
- All five audit findings are mapped to completed Workstream outputs.
- v0.1 scope narrative is consistent across all top-level entry docs.
- Design-required social process behavior is executable and verifiable.
- CI and release gates enforce runtime quality and Evidence requirements.
- End-to-end acceptance verification runs as a repeatable process.

## 12) Execution Rule
- Execute one Linear issue at a time unless explicitly decomposed for parallel work.
- Use Beads for atomic local decomposition and dependency tracking.
- Any newly discovered blocking gap must be captured as a new issue with explicit dependency linkage.

## 13) Document Linkage
- Product definition: `project.md`
- Design details: `docs/design/game-design.md`, `docs/design/dream-laws.md`, `docs/design/cover-tests.md`
- Runtime Evidence operations: `docs/design/runtime-evidence.md`
- Migration and release record: `docs/design/ws8-final-migration-report.md`
- Terminology authority: `terminology.md`
- Execution Source of Truth: Linear issues
