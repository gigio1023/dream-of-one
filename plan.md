---
doc: plan.md
project: Dream of One
revision: 2026-02-08
status: Active (Master Execution Plan v4, Platform-Locked)
source_of_truth: project.md
---

# Dream of One - Master Execution Plan (Codex-CLI-First v0.1)

This file is the active execution roadmap.
`project.md` defines what the product is and what is fixed.
This document defines how delivery is sequenced, validated, and governed.
Linear remains the issue tracking source of truth.

## 0) Planning objective
Deliver a stable, replayable 10-12 minute social-stealth session with Codex-driven NPC society, while preserving strict deterministic safety at runtime boundaries.

## 1) Locked execution premise (from project contract)
The following are fixed for v0.1 and are not open for redesign during implementation:
- Unity runtime authority for world execution.
- Backend platform lock: Node.js 24 LTS + Fastify 5.x + TypeScript 5.9.
- Codex tool path lock: `codex` and `codex-reply` with `sessionId+npcId` thread continuity.
- Strict schema-first contract validation before Unity action execution.
- Deterministic fallback as mandatory safety path.

## 2) v0.1 success scoreboard (measurable)
By completion:
- Session duration: 10-12 minutes.
- World coverage: 4 active landmarks (`Store`, `Studio`, `Park`, `Station`).
- Population: 8-12 NPCs with role-card distinctions.
- Social closure path: `Report -> Station Intake -> Verdict` is playable end-to-end.
- Behavior diversity: 3 consecutive runs produce non-identical social trajectories.
- Runtime resilience: Codex timeout/failure does not freeze progression.
- Explainability: survival/failure cause chain is visible to the player and logs.

## 3) Rules for execution
- No major system expansion beyond v0.1 scope.
- Prefer contract clarity and observability over feature count.
- Keep all LLM outputs schema-constrained before world execution.
- Keep fallback deterministic and always available.
- Keep backend as one service until v0.1 definition of done is met.
- Keep plan updates synchronized with any project contract changes.

## 4) Workstreams and outcomes
- **WS-A Backend Runtime Core**
  Outcome: a stable decision service that enforces contracts and fallback behavior.
- **WS-B Unity Bridge and Authority Gate**
  Outcome: Unity ingestion/execution path that accepts only validated intents.
- **WS-C NPC Society Baseline**
  Outcome: persistent role-consistent social behavior across cadence tiers.
- **WS-D Player Cover and Pressure Loop**
  Outcome: playable cover-task loop with legible suspicion/exposure feedback.
- **WS-E Escalation and Resolution Flow**
  Outcome: report/intake/verdict closure with readable causal evidence.
- **WS-F Reliability, Diagnostics, and Release Gates**
  Outcome: repeatable checks and quality signals that prevent regression.

## 5) Sequential phase plan

## Phase 0 - Contract and platform lock alignment (WS-A)
### Objective
Eliminate ambiguity in architecture and delivery constraints before implementation scale-up.

### Scope
- Normalize project contract and execution plan wording.
- Lock backend runtime platform assumptions.
- Define mandatory runtime signals and fallback semantics.

### Required outputs
- Contract-level document alignment (`project.md`, `plan.md`).
- Clear acceptance and out-of-scope lines for v0.1.
- Execution gate checklist for later phases.

### Exit criteria
- No conflicting statements between contract and plan.
- Platform lock and fallback policy are explicit and reviewable.

## Phase 1 - Codex runtime foundation (WS-A, WS-B)
### Objective
Establish a robust Codex-first NPC decision loop with deterministic safety.

### Scope
- Backend runtime service baseline and health visibility.
- Codex broker path (`codex`, `codex-reply`) and thread lifecycle continuity.
- Ingress/egress contract validation rules.
- Fallback reason mapping and telemetry tagging.

### Required outputs
- Versioned `PerceptionPacket`, `NpcIntent`, and decision envelope contract definitions.
- Decision endpoint that always returns a valid envelope shape.
- Thread continuity policy (`sessionId+npcId`) proven by tests.

### Validation evidence
- Runtime starts reliably and health endpoint is reachable.
- Malformed Codex outputs are rejected to deterministic fallback.
- Timeout and parse failure paths are observable in logs/telemetry.

### Exit criteria
- Two NPCs run for 5 minutes without freeze.
- Contract and fallback tests pass locally.

## Phase 2 - Unity bridge closure (WS-B)
### Objective
Ensure only safe, validated intents are executable in world runtime.

### Scope
- Observation packet emission completeness and consistency.
- Intent ingestion adapter and blocked-reason handling.
- Unity-side validator and fallback execution integration.

### Required outputs
- Stable observe/decide/act handshake between Unity and backend.
- Clear blocked-reason reporting for rejected actions.
- Telemetry links from request to action outcome.

### Validation evidence
- Replayable sample runs show request/response/action trace continuity.
- No direct world mutation from unvalidated LLM output.

### Exit criteria
- Unity can process backend fallback and continue session.
- Contract mismatch surfaces as readable runtime signal, not crash.

## Phase 3 - NPC society baseline (WS-C)
### Objective
Create a believable minimal society without adding new systems.

### Scope
- 8-12 NPC role cards across 4 organizations.
- Memory model operation (`Identity`, `Episodic`, `Social`).
- Active/background scheduler cadence behavior.
- Organization-specific instruction policy.

### Required outputs
- Role and instruction packs for all baseline NPC archetypes.
- Memory update and compaction policy.
- Scheduler telemetry for activity continuity.

### Validation evidence
- No-player-input 5-minute run shows continuous social actions.
- Report tendency appears naturally in run logs.

### Exit criteria
- NPC behavior remains role-consistent under repeated runs.
- Memory growth remains bounded for session length target.

## Phase 4 - Player cover loop and escalation closure (WS-D, WS-E)
### Objective
Make player pressure loop and session resolution fully understandable.

### Scope
- Cover checklist completion flow.
- Speech act integration (`COMPLY`, `INQUIRE`, `FRAME`, `BREAK`).
- Pressure feedback readability (`suspicion`, `exposure`, reason hints).
- Report -> intake -> verdict pipeline and ending transition.

### Required outputs
- Playable route from session start to one of defined endings.
- Minimum escalation artifacts (witness statement, report memo, intake record).
- End summary with causal references.

### Validation evidence
- Risky speech reliably increases exposure pressure.
- Three ending outcomes are reproducible with visible cause chain.

### Exit criteria
- Players can explain why a run ended in survival or exposure.
- No hidden mechanics are required to complete baseline route.

## Phase 5 - Hardening and QA gates (WS-F)
### Objective
Lock reliability and prevent regressions before v0.1 sign-off.

### Scope
- Diagnostics rules for contract/content mismatches.
- Core PlayMode smoke coverage.
- Codex unavailable/timeout resilience checks.
- Session reliability counters and review cadence.

### Required outputs
- Automated baseline test suite and contract test suite.
- Reliability counters: timeout rate, fallback rate, parse failure rate.
- Operational runbook for local execution and triage.

### Validation evidence
- Diagnostics clean.
- Core tests green.
- Codex failure path remains playable.

### Exit criteria
- Release gate checklist passes without manual exception.
- Remaining risk items are documented with owners and mitigations.

## 6) Linear blueprint (execution mapping)

## Epic A - Codex cognition runtime
- A1: backend runtime bootstrap and health/operability baseline.
- A2: Codex broker with thread lifecycle continuity.
- A3: Claude hook policy layer enforcing Codex-only cognition path.
- A4: schema validation and deterministic fallback governance.

## Epic B - Unity runtime bridge
- B1: observation packet emission.
- B2: intent ingestion and validation.
- B3: action execution adapter and blocked-reason handling.
- B4: telemetry integration (`request`, `response`, `latency`, `fallback`).

## Epic C - NPC society content
- C1: role cards for 8-12 NPCs.
- C2: organization instruction templates.
- C3: memory update/compaction policy.
- C4: scheduler tuning and social activity verification.

## Epic D - Player and escalation loop
- D1: cover checklist and speech acts.
- D2: pressure UI readability.
- D3: report -> intake -> verdict pipeline.
- D4: ending summary and cause-line integration.

## Epic E - Reliability and release gates
- E1: diagnostics updates for Codex-first contracts.
- E2: PlayMode tests for core loop.
- E3: Codex-off/failure smoke path.
- E4: local runtime runbook and incident response notes.

## 7) Cadence and governance rhythm
- Day 1-2: contract/runtime integrity updates only.
- Day 3-5: feature integration and behavior tuning.
- Day 6-7: escalation loop closure and readability pass.
- Day 8-10: diagnostics/tests/fallback hardening.

At each cycle boundary:
- verify phase exit criteria before scope expansion,
- update Linear status and risk notes,
- sync `plan.md` if contract constraints changed.

## 8) Risk register and mitigations
- **R1 Codex latency spikes**
  - Mitigation: cadence tiering, timeout policy, deterministic fallback.
- **R2 Output drift from schema**
  - Mitigation: strict parser, single retry policy, safe default action.
- **R3 Context bloat in NPC memory**
  - Mitigation: bounded episodic memory and compaction intervals.
- **R4 Debug opacity**
  - Mitigation: reason codes, transport tagging, artifact links per escalation.
- **R5 Scope drift**
  - Mitigation: phase gate enforcement and explicit deferred list.
- **R6 Platform drift during v0.1**
  - Mitigation: backend platform lock; no framework migration before v0.1 done.

## 9) Definition of done (v0.1)
All must hold:
- Codex-driven NPC society operates throughout the session.
- Player loop and escalation closure are fully playable.
- Failure/survival is explainable with concrete causes.
- Fallback path keeps session alive when Codex fails.
- Backend contract tests and Unity diagnostics are green.
- Release gate evidence is documented and reproducible.

## 10) Document consolidation policy
- Active roadmap only in `plan.md`.
- Product/runtime contract only in `project.md`.
- Deprecated historical plan docs remain reference-only and are not updated.
- Any backend platform/contract change must update both docs in the same change.

## 11) Execution snapshot and next queue (2026-02-08)
### 11.1 Newly closed gates
- Phase 5 / Epic E1 completed baseline:
  - diagnostics now validate Codex-first runtime contract invariants.
- Phase 5 / Epic E2 completed baseline:
  - PlayMode gate verified green (`18/18`) with escalation and fallback paths.
- Active linear queue is empty after `DRE-120` closure.

### 11.2 Accepted immediate focus
- Resume from Phase 1 / Epic A1:
  - backend runtime operability and readiness visibility.
- This is the next mandatory gate before expanding gameplay scope.

### 11.3 Next Linear issue queue (ordered)
1. `A1-readiness-gate`: split health/readiness endpoints, expose deterministic not-ready reasons, verify integration behavior.
2. `A2-thread-continuity-stability`: prove `sessionId+npcId` continuity under repeated broker calls and restart scenarios.
3. `DoD-trajectory-diversity-gate`: add evidence/test gate for three consecutive non-identical social trajectories.

### 11.4 Sequencing rule for this queue
- Execute one Linear issue at a time.
- For each issue: implement -> verify -> close in Linear -> then pick the next item.
