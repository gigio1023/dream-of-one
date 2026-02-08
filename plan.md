---
doc: plan.md
project: Dream of One
revision: 2026-02-08
status: Active (Master Execution Plan v5, Post-v0.1 Transition)
source_of_truth: project.md
---

# Dream of One - Master Execution Plan (Codex-CLI-First v0.1)

This file is the active execution roadmap.
`project.md` defines what the product is and what is fixed.
This document defines how delivery is sequenced, validated, and governed.
Linear remains the issue tracking source of truth.

## 0) Planning objective
Prove, in Unity play, that a Codex CLI-driven NPC society produces the core social-stealth experience while deterministic safeguards keep sessions stable.

## 1) Intent-first execution premise (from project contract)
Primary proof order for v0.1:
- Unity playable loop must show social pressure driven by NPC society behavior.
- NPC cognition must remain Codex-thread-driven (`codex` / `codex-reply`) with continuity by `sessionId+npcId`.
- Report -> intake -> verdict closure and ending causality must be readable in play/logs.
- Deterministic fallback must preserve session continuity under Codex/tool failure.

Supporting technical profile (secondary, but still required during v0.1):
- Backend implementation profile: Node.js 24 LTS + Fastify 5.x + TypeScript 5.9.
- Schema-first validation before Unity execution.
- Single backend service boundary until v0.1 definition of done.

## 2) v0.1 success scoreboard (measurable, intent-first)
Core intent proof:
- Session in Unity is playable for 10-12 minutes.
- NPC society behavior materially affects player cover work and escalation pressure.
- `Report -> Station Intake -> Verdict` closure path is playable end-to-end.
- Three consecutive runs produce non-identical social trajectories.
- Survival/failure cause chain is visible to player and logs.

Supporting stability proof:
- Codex timeout/failure does not freeze progression.
- Fallback/transport/reason telemetry is observable.
- Contract and diagnostics gates are reproducible.

## 3) Rules for execution
- If there is a tradeoff, prioritize proving the Unity social-simulation intent over low-impact technical refinement.
- No major system expansion beyond v0.1 scope.
- Keep LLM output schema-constrained before world execution.
- Keep fallback deterministic and always available.
- Keep `project.md` and `plan.md` synchronized whenever intent or gate language changes.

## 4) Workstreams and outcomes (priority order)
- **WS-1 Unity Core Playable Loop**
  Outcome: playable cover-pressure session loop with deterministic end conditions.
- **WS-2 Codex Society Runtime**
  Outcome: Codex-driven NPC decisions with thread continuity and safe Unity execution handoff.
- **WS-3 Escalation Readability**
  Outcome: report/intake/verdict chain is legible and explainable in run outputs.
- **WS-4 Reliability and Observability**
  Outcome: fallback, timeout, parse failure, and transport traces are visible and enforceable.
- **WS-5 Technical Conformance (supporting)**
  Outcome: implementation profile and contracts remain consistent with project governance.

## 5) Sequential phase plan (intent-first)

## Phase 1 - Unity playable proof
### Objective
Confirm that the social-stealth loop is genuinely playable in Unity.

### Exit criteria
- Session starts, progresses, and ends without deadlock.
- Player pressure loop and ending transitions are visible in runtime.

## Phase 2 - Codex society behavior proof
### Objective
Prove NPC cognition is Codex-thread-driven and materially drives social interactions.

### Exit criteria
- `codex`/`codex-reply` path and thread continuity are verifiable.
- Non-identical trajectories are reproduced across repeated runs.

## Phase 3 - Escalation closure proof
### Objective
Make report/intake/verdict flow operational and understandable.

### Exit criteria
- `Report -> Intake -> Verdict` path is replayable.
- Survival/failure explanations are readable in UI/log outputs.

## Phase 4 - Reliability hardening
### Objective
Guarantee deterministic continuity under runtime and tool failures.

### Exit criteria
- Timeout/parse/tool failures fail closed to deterministic fallback.
- Diagnostics and contract checks are green and repeatable.

## Phase 5 - DoD evidence pack
### Objective
Collect reproducible evidence that v0.1 intent criteria are met.

### Exit criteria
- Evidence covers session length, trajectory diversity, and closure readability.
- Evidence can be rerun without ad-hoc manual interpretation.

## Phase 6 - Technical conformance cleanup (supporting)
### Objective
Align implementation details with locked technical profile without overshadowing product intent.

### Exit criteria
- Stack/profile drift items are explicitly reconciled or reclassified in docs.
- No change in authority boundaries or core playable proof outcomes.

## 6) Linear blueprint (execution mapping)

## Epic A - Unity playable proof
- A1: session start/end integrity and deterministic end conditions.
- A2: cover-task loop and speech-act pressure integration.
- A3: in-play readability of suspicion/exposure/escalation signals.

## Epic B - Codex society runtime proof
- B1: Codex decision path continuity (`codex`/`codex-reply`, thread continuity).
- B2: safe Unity execution handoff and blocked-reason behavior.
- B3: non-idle behavior evidence that Codex cognition is materially active.

## Epic C - Escalation closure proof
- C1: report -> intake -> verdict pipeline stability.
- C2: evidence artifacts and causal end-summary visibility.
- C3: outcome reproducibility across repeated sessions.

## Epic D - Reliability and observability gates
- D1: deterministic fallback policy and failure continuity checks.
- D2: transport/reason/request correlation telemetry visibility.
- D3: diagnostics and PlayMode smoke gates for regression prevention.

## Epic E - Technical conformance (supporting)
- E1: implementation-profile drift review (stack/governance alignment).
- E2: contract/test/runbook updates that support intent proof.

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
- `DRE-124` correlation-id contract gate is completed and merged.
- `DRE-125` trajectory diversity gate is completed and merged.
- `DRE-126` reliability threshold gate is completed and merged.
- `DRE-127` runtime reliability summary endpoint gate is completed and merged.
- `DRE-128` reliability min-sample gate is completed and merged (`insufficient_sample` semantics added).
- `DRE-129` runtime operator runbook gate is completed and merged.
- `DRE-130` Unity correlation consumption gate is completed and merged.
- `DRE-131` project/plan execution snapshot synchronization gate is completed and merged.
- `DRE-132` intent-first project/plan refocus gate is completed and merged.

### 11.2 Accepted immediate focus
- Close the v0.1 DoD evidence-pack gate centered on Unity playable proof of Codex social simulation.
- Keep authority boundaries unchanged while resolving only high-impact technical conformance gaps.

### 11.3 Next Linear issue queue (ordered)
1. `DoD-release-evidence-pack` (next creation): capture reproducible Unity evidence for session length, social trajectory diversity, and readable ending causality.
2. `codex-society-proof-gate` (next creation): measure and report whether NPC non-idle behavior is materially Codex-driven in runtime.
3. `backend-platform-lock-conformance` (next creation): reconcile runtime stack/profile drift items that materially affect reliability/governance.

### 11.4 Sequencing rule for this queue
- Execute one Linear issue at a time.
- For each issue: implement -> verify -> close in Linear -> then pick the next item.
