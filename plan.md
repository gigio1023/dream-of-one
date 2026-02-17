# plan.md

## Intent (의도)
- Deprecate the Unity runtime path and deliver a Mineflayer + TypeScript runtime path that preserves the original AI-native NPC world Intent: social pressure loop, deterministic adjudication, and Codex-driven NPC cognition.
- Do this now to concentrate engineering capacity on the core product question (AI-native NPC society behavior) instead of engine-specific game production overhead.

## Background (배경)
- Current Source of Truth defines Unity as the active client, but also treats platform detail as supporting to the primary Intent (`project.md`).
- The existing TypeScript backend already contains strong Runtime Path components (Schema validation, Thread Continuity, Single-flight, Global Cap, deterministic Fallback Path).
- Unity-side authoring and presentation systems add significant maintenance load for UI, scene tooling, and engine-specific diagnostics.
- Mineflayer is available locally at `/Users/user/git/gigio1023/mineflayer`, and local plus npm metadata confirm the latest baseline is `mineflayer@4.35.0` with Node.js `>=22`.
- The migration is cross-repo: core project runtime (`dream-of-one`) and agent runtime surface (`mineflayer`) must evolve together under one execution strategy.

## Goals (목표)
- Goal 1: Replace Unity runtime authority with a Mineflayer runtime authority while keeping the same product Intent and bounded action vocabulary.
- Goal 2: Preserve backend behavior guarantees: Schema conformance, deterministic Fallback Path, Thread Continuity, Single-flight, and Global Cap.
- Goal 3: Deprecate Unity in a controlled way that protects reproducibility, Evidence history, and rollback capability.
- Goal 4: Re-establish Acceptance Criteria and Validation Criteria on the Mineflayer runtime path.
- Goal 5: Keep operational complexity bounded by prioritizing text-first social simulation over visual feature parity.

## Expected Results (결과)
- A primary Runtime Path based on Mineflayer + TypeScript backend is used for all active development and verification.
- Unity is explicitly marked deprecated, frozen, and removed from release-critical workflows.
- AI-native NPC society loops run in Minecraft sessions with measurable causality, report/intake/verdict outcomes, and stable fallback behavior.
- Evidence generation, regression monitoring, and release gating continue with equivalent or better observability.

## Cross-Repo Impact Map
- `dream-of-one` repository:
  - Product definition alignment, runtime contracts, backend orchestration, migration governance, validation/evidence operations.
- `/Users/user/git/gigio1023/mineflayer` repository:
  - Runtime client event/action capabilities, bot lifecycle behavior, multi-bot operation model, plugin dependency posture.
- Integration boundary:
  - Perception/decision envelope contract, transport semantics, causal metadata surface, and runtime control-loop handoff.

## Scope
- In scope:
  - Unity runtime deprecation strategy and cutover governance.
  - Mineflayer runtime adoption as primary execution surface.
  - TypeScript backend continuity and adaptation for Minecraft event/action semantics.
  - Validation and Evidence Pack migration to new runtime path.
  - Operational readiness for multi-bot AI-native NPC sessions.
- Out of scope:
  - Visual parity with Unity scene/UI presentation.
  - Broad gameplay expansion beyond current bounded action and speech-act model.
  - New non-core systems (economy, progression, combat, large content expansion).
  - Rewriting Mineflayer internals as a fork strategy.

## Constraints
- Must preserve canonical product constraints: 10-12 minute loop, bounded NPC actions, bounded player speech acts, fixed landmark logic, deterministic outcomes.
- Must keep Codex direct orchestration on the critical path (no external agent SDK mediation in decision critical path).
- Must maintain backend guardrails: Schema, Reason Code and Reason Category, Fallback Path, Thread Continuity, Single-flight, Global Cap.
- Must execute with Node.js baseline compatible with latest Mineflayer (`>=22`).
- Work sequencing remains Source-of-Truth-driven in Linear for execution state, with this document serving as strategy and delivery contract.

## Success Criteria
- Intent continuity:
  - The migrated runtime demonstrates the same social-stealth pressure model where NPCs and institutions investigate the player.
- Runtime conformance:
  - All decision envelopes remain schema-valid across normal and fallback lanes.
  - Deterministic fallback prevents progression stalls under timeout, tool, parse, or runtime failures.
- Continuity and scaling:
  - `sessionId+npcId` Thread Continuity and Actor Workspace persistence are stable across repeated cycles.
  - Per-actor Single-flight and Global Cap remain enforced under multi-bot load.
- Product outcomes:
  - Session loop completes in target duration.
  - Report -> intake -> verdict causality remains readable and explainable.
  - Non-identical social trajectories are reproducible across repeated runs.
- Operational outcomes:
  - Validation gates pass on the new stack.
  - Release Candidate evidence artifacts are produced from Mineflayer-based runs.

## Workstreams
- WS1: Deprecation Governance and Cutover Policy
  - Owner: Product/Tech Lead
  - Output: Deprecation policy, cutoff dates, branch/support matrix, Unity freeze rules
  - Done signal: Unity is non-primary by policy and cannot receive new feature work
- WS2: Runtime Contract Preservation
  - Owner: Backend Lead
  - Output: Locked cross-runtime Specification for perception, decision envelope, and metadata semantics
  - Done signal: Contract accepted as authoritative for Mineflayer runtime and backend
- WS3: Mineflayer Runtime Authority Layer
  - Owner: Minecraft Runtime Lead
  - Output: Runtime authority model for event ingestion, intent execution, and outcome reporting in Minecraft
  - Done signal: End-to-end social loop runs without Unity dependency
- WS4: Backend Orchestration Continuity
  - Owner: Backend Lead
  - Output: Equivalent decision orchestration behavior on TypeScript backend for Minecraft runtime
  - Done signal: Existing reliability guarantees (Schema, fallback, caps, continuity) pass new validation gates
- WS5: Actor Workspace and Thread Continuity Migration
  - Owner: Runtime Platform Lead
  - Output: Durable state strategy for actor memory/thread artifacts aligned with Minecraft sessions
  - Done signal: Repeat cycles preserve expected continuity and actor memory semantics
- WS6: Action/Speech Constraint Mapping
  - Owner: Simulation Design Lead
  - Output: Mapping of bounded action vocabulary and speech acts to Minecraft-compatible interaction surfaces
  - Done signal: No drift outside approved action and speech boundaries
- WS7: Dream Laws and Cover Tests Portability
  - Owner: Narrative Systems Lead
  - Output: Runtime-agnostic Dream Law and Cover Test execution model for Minecraft sessions
  - Done signal: Core detectors, escalation ladders, and evidence outputs operate in new runtime
- WS8: Telemetry, Causality, and Evidence Pack Migration
  - Owner: Observability Lead
  - Output: Equivalent telemetry streams and Evidence Pack generation for RC decisions
  - Done signal: Release gating artifacts available without Unity pipeline dependence
- WS9: Validation Criteria and Test Gate Rebuild
  - Owner: QA/Automation Lead
  - Output: New-stack Validation Criteria, smoke/regression gates, and acceptance runbook
  - Done signal: Acceptance Criteria are objectively pass/fail on Mineflayer path
- WS10: Operational Readiness and Multi-Bot Reliability
  - Owner: Runtime Operations Lead
  - Output: Session operations model for bot lifecycle, load posture, incident handling, and runbook updates
  - Done signal: Stable multi-bot sessions meet readiness thresholds under planned operating envelope

## Dependency Graph
- WS2 blocked-by WS1
- WS3 blocked-by WS2
- WS4 blocked-by WS2
- WS5 blocked-by WS4
- WS6 blocked-by WS3
- WS7 blocked-by WS3 and WS6
- WS8 blocked-by WS4 and WS3
- WS9 blocked-by WS3, WS4, WS8
- WS10 blocked-by WS3, WS4, WS9
- Parallel Group A: WS3 and WS4 (after WS2)
- Parallel Group B: WS6 and WS8 (after WS3 and WS4 prerequisites)
- Parallel Group C: WS7 and WS9 can overlap once contract and telemetry baselines exist

## Validation Gates
- Gate A: Contract Gate
  - Cross-runtime Specification is frozen, reviewed, and versioned
- Gate B: Runtime Safety Gate
  - Schema conformance, deterministic fallback behavior, and continuity guarantees verified
- Gate C: Product Behavior Gate
  - Session pacing, social escalation, and causality readability validated in Minecraft runtime
- Gate D: Reliability Gate
  - Concurrency controls and multi-bot stability satisfy threshold targets
- Gate E: Release Gate
  - Evidence Pack and RC decision artifacts generated exclusively from new runtime path
- Gate F: Deprecation Gate
  - Unity removed from release-critical workflows and documented as deprecated runtime

## Risks and Mitigations
- Risk: Behavior drift from current social-stealth Intent during engine transition
  - Mitigation: Lock Intent and runtime contract first; reject scope that expands mechanics during migration
- Risk: Loss of deterministic safety signals in new runtime path
  - Mitigation: Preserve Reason Code/Reason Category and fallback semantics as hard migration gates
- Risk: Multi-bot instability and operational overload
  - Mitigation: Stage capacity by wave, enforce Global Cap/Single-flight, and adopt progressive load gates
- Risk: Tooling and evidence regression after Unity deprecation
  - Mitigation: Build telemetry/evidence workstream before cutover completion; require RC artifacts from new path
- Risk: Team focus dilution across two active runtimes
  - Mitigation: Enforce Unity freeze early and limit Unity work to containment, extraction, and rollback needs
- Risk: Version/platform mismatch with latest Mineflayer runtime requirements
  - Mitigation: Standardize Node/toolchain baseline early and gate all environments on compatibility checks

## Execution Waves / Order
- Wave 0: Direction Lock and Freeze
  - Finalize deprecation governance (WS1), lock contract baseline approach (WS2 kickoff)
- Wave 1: Runtime Foundation
  - Execute WS2, WS3, WS4 in parallel lanes where safe
- Wave 2: Behavioral Parity
  - Execute WS5, WS6, WS7 with priority on bounded actions, Dream Laws, and cover-test semantics
- Wave 3: Observability and Verification
  - Execute WS8 and WS9 to restore release-quality validation and evidence flows
- Wave 4: Operational Hardening and Cutover
  - Execute WS10, pass final gates, mark Unity runtime path as deprecated-complete

## Rollback / Containment Intent
- Keep Unity runtime in maintenance-only state until Gate E and Gate F are both passed.
- If migration assumptions fail, pause expansion work and revert to last validated wave boundary instead of partial feature carryover.
- Use dual-run checkpoints during transition waves to compare causality and fallback behavior before permanent cutover.
- If reliability or safety gates fail, contain blast radius by reducing active bot concurrency and limiting runtime to validation scenarios only.
- Do not retire Unity archive artifacts or historical Evidence Packs until the Mineflayer runtime has demonstrated sustained validation stability.
