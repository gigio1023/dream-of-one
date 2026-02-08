---
doc: plan.md
project: Dream of One
revision: 2026-02-08
status: Active (Master Execution Plan v5, Intent-First)
source_of_truth: project.md
---

# Dream of One - Master Execution Plan (Unity Intent-First v0.1)

This file is the active execution roadmap.
`project.md` defines product intent and acceptance priorities.
Linear is the issue tracking source of truth.

## 0) Planning objective
Prove in Unity play that Codex CLI-driven NPC society is the real gameplay driver, while deterministic safety keeps sessions stable and explainable.

## 1) Current state review (lightweight)
### 1.1 Confirmed strengths
- Unity social simulation loop exists and runs.
- Pressure/escalation systems exist (`Suspicion`, `Exposure`, report/verdict).
- TS `npc-runtime` backend is implemented with schema/fallback/thread policy.

### 1.2 Primary gap
- Unity default runtime path is not yet proven to consume `backend/npc-runtime` decision responses as the main cognition path.

### 1.3 Execution meaning
- Next work should prioritize bridge proof and runtime evidence over additional feature breadth.

## 2) Primary proof order (must stay in this order)
1. **Unity core loop proof**
   Show stable playable loop with social pressure and closure.
2. **Codex bridge proof**
   Show Unity decisions are actually supplied by `npc-runtime` Codex path in live runtime.
3. **Fallback continuity proof**
   Show timeout/parse/tool failures remain playable with deterministic outcomes.
4. **Causality readability proof**
   Show players can explain why a run ended (survival/exposure) using on-screen/WEL signals.
5. **Technical conformance proof (supporting)**
   Keep schema/readiness/thread continuity green.

## 3) Workstreams
- **WS-1 Unity Playable Core**
  Maintain and validate session loop, pressure loop, and closure flow.
- **WS-2 Unity <-> TS Runtime Bridge**
  Implement and harden decision ingestion from `/v1/npc/decision`.
- **WS-3 Deterministic Safety**
  Keep fallback, authority validation, and blocked-reason reporting deterministic.
- **WS-4 Intent Evidence Gates**
  Add reproducible evidence for codex-driven ratio, trajectory diversity, and readable causality.
- **WS-5 Supporting Platform Conformance**
  Keep readiness/health/thread/schema gates green without expanding scope.

## 4) Phase plan

## Phase A - Intent Baseline Confirmation
### Goal
Freeze the baseline understanding of what already works and what blocks intent proof.

### Deliverables
- Lightweight implementation review snapshot recorded in docs/Linear.
- Explicit top gap definition: Unity default path must prove backend Codex ingestion.

### Exit criteria
- Team agrees the top gap is bridge proof, not feature expansion.

## Phase B - Unity Decision Bridge (Highest Priority)
### Goal
Make Unity consume `npc-runtime` decision envelope in the active society loop.

### Deliverables
- Unity-side adapter for `/v1/npc/decision` request/response.
- Contract mapping for `PerceptionPacket` and `NpcIntent` envelope.
- Thread/session continuity plumbing in Unity runtime context.

### Exit criteria
- Live run evidence shows transport path (`codex`/`codex-reply`/`fallback`) from backend in Unity runtime outputs.

## Phase C - Deterministic Failure Continuity
### Goal
Guarantee no dead session under backend/Codex failure scenarios.

### Deliverables
- Stable fallback handling in Unity when backend returns fallback envelope.
- Readable blocked/fallback reasons in runtime diagnostics and logs.

### Exit criteria
- Injected failure scenarios still complete session without hangs/crashes.

## Phase D - Social Trajectory and Causality Proof
### Goal
Prove the simulation is alive and legible.

### Deliverables
- Three-run diversity evidence pack.
- Cause-chain evidence for report/intake/verdict outcomes.

### Exit criteria
- Reviewers can explain run outcomes from evidence without hidden assumptions.

## Phase E - Supporting Conformance Lock
### Goal
Keep technical contract quality stable while avoiding scope creep.

### Deliverables
- Readiness/health checks remain stable.
- Schema/thread continuity tests remain green.
- Unity diagnostics clean after runtime changes.

### Exit criteria
- No regressions in quality gates.

## 5) Linear execution queue (one issue at a time)
Queue policy:
- Always execute one Linear issue to completion before starting the next.
- Each issue must carry clear goal, AC, do-not, and verification evidence.

Priority queue:
1. `unity-ts-decision-bridge-proof`
2. `codex-transport-visibility-in-unity`
3. `three-run-trajectory-diversity-evidence`
4. `causality-readable-ending-evidence`
5. `backend-readiness-thread-conformance-maintenance`

## 6) Verification standard
For any issue that touches Unity runtime behavior:
- Run Unity diagnostics until console is clean.
- Validate report -> intake -> verdict closure still functions.
- Validate fallback continuity path under failure injection.

For any issue that touches backend runtime behavior:
- Run backend contract tests (decision/fallback/thread/readiness).
- Keep API envelope compatibility with Unity bridge contract.

## 7) Risk register (intent-focused)
- **R1 Bridge remains partial**
  - Mitigation: prioritize bridge issue before any new feature work.
- **R2 Codex instability causes play interruption**
  - Mitigation: strict fallback continuity and reason-coded diagnostics.
- **R3 Simulation appears scripted/repetitive**
  - Mitigation: trajectory diversity gate with repeatable evidence.
- **R4 Causality is unclear to player**
  - Mitigation: enforce readable reason/event chain in UI and WEL.

## 8) Definition of done (v0.1)
All conditions below are required:
- Unity session loop is playable end-to-end.
- Codex CLI path is proven as active NPC cognition source in Unity runtime.
- Failure path remains deterministic and non-blocking.
- Outcome causality is readable by non-author reviewers.
- Diagnostics and contract tests are green.

## 9) Document sync policy
- Intent/priority changes update both `project.md` and `plan.md` in the same change.
- Detailed engineering notes live in implementation docs/runbooks, not in top-level intent sections.

## 10) Execution snapshot (2026-02-08)
- Completed: intent refocus docs gate (`DRE-132`, merged).
- Current top priority: Unity <-> TS decision bridge proof.
- Immediate action: create and execute next Linear issue for bridge implementation.
