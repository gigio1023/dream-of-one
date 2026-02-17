# plan.md

## Status Snapshot
- Date: 2026-02-17
- Plan revision: v3 (Minecraft system-aligned)
- Runtime Path target: Mineflayer + TypeScript backend
- Legacy Runtime Path: Unity (deprecated, retained)
- Mineflayer source baseline: `/Users/user/git/gigio1023/mineflayer`
- Canonical Mineflayer docs baseline: `docs/mineflayer/index.md`
- Project definition alignment: `project.md` v10 (Minecraft Intent-First)

## Execution Status
- Phase 0: completed (governance lock + exclusion/deprecation policy)
- Phase 1: completed (baseline implementation)
- Phase 2: completed (baseline implementation)
- Phase 3: completed (baseline implementation)
- Phase 4: completed (baseline implementation)
- Phase 5: completed (baseline implementation)
- Phase 6: completed (baseline implementation)
- Phase 7: completed (Unity relocation to deprecated namespace)
- Phase 8: completed (Gate H artifacts, rollback drill archive, migration decision record)

## WS8 Completion Criteria Status (artifact-gated)
| Criterion | Status | Artifact |
|---|---|---|
| Mineflayer-only Gate H workflow | complete | `docs/design/runtime-evidence.md` |
| Trajectory diversity verification procedure | complete | `docs/design/game-design.md` |
| Rollback drill procedure and log index | complete | `docs/design/runtime-evidence.md`, `docs/design/ws8-rollback-drill-log.md` |
| Final migration report with residual risk backlog | complete | `docs/design/ws8-final-migration-report.md` |
| Gate H run Evidence Pack set (`runCount >= 3`) | complete | `data/evidence/ws8/gate-h/run-a-evidence-pack.json`, `data/evidence/ws8/gate-h/run-b-evidence-pack.json`, `data/evidence/ws8/gate-h/run-c-evidence-pack.json` |
| Gate H events snapshot set | complete | `data/evidence/ws8/gate-h/run-a-events.json`, `data/evidence/ws8/gate-h/run-b-events.json`, `data/evidence/ws8/gate-h/run-c-events.json` |
| Rollback drill execution output archive | complete | `logs/ws8/rollback-drill/20260217-0949/rollback-drill-report.json` |
| Gate H final decision record | complete | `docs/design/ws8-final-migration-report.md` |

## Intent
- Complete migration execution so Mineflayer + TypeScript backend becomes the active Minecraft Runtime Path while preserving the same AI-native NPC world behavior (social pressure loop, deterministic adjudication, bounded actions/speech).
- Focus engineering on AI-native NPC society quality rather than Unity gameplay production overhead.
- Keep all Unity code and assets in repository history and working tree by moving them to a deprecated location instead of deleting them.

## Context
- Existing backend already enforces key guardrails: Schema validation, deterministic Fallback Path, session continuity tracking (`sessionId+npcId` + `threadId`), one in-flight action per bot (Single-flight), and global concurrency limit (Global Cap).
- Mineflayer documentation and source analysis are now available as canonical input under `docs/mineflayer/**`.
- Existing Unity runtime remains valuable as historical Evidence baseline and rollback safety path.
- NPC memory design is game-oriented (simulation continuity), not assistant-oriented (user secretary).

## Game Memory System Baseline
- Specification authority: `memory.md`.
- Storage scope: per-NPC Actor Workspace (`data/workspaces/<sessionId>/<npcId>/`).
- Layer model:
  - `MEMORY.md` for Long-term Facts,
  - `memory/YYYY-MM-DD.md` for append-only episodic logs.
- Behavior goal: preserve natural NPC action continuity while making player suspicion accumulation durable and traceable.
- Runtime guardrail: memory persistence does not prescribe a fixed cognition sequence and does not bypass Schema/Fallback safety.

## Source Baseline and Authority

### Canonical references for this plan
- Runtime Specification: `docs/mineflayer/spec/runtime.md`
- Action API Specification: `docs/mineflayer/spec/action-api.md`
- Event Lifecycle Specification: `docs/mineflayer/spec/event-lifecycle.md`
- API catalog: `docs/mineflayer/reference/api-catalog.md`
- Implementation guide: `docs/mineflayer/guides/implementation.md`
- Constraint context: `docs/mineflayer/foundation/context.md`, `docs/mineflayer/foundation/constraint-trace.md`

### Explicit exclusion
- This plan does **not** use `/Users/user/git/gigio1023/minecraft-llm-agent-community` as input or dependency.

## Goals
- Goal 1: Establish Mineflayer as primary Runtime Path for active development and release validation.
- Goal 2: Preserve product Intent and social-stealth logic without expanding game scope.
- Goal 3: Port bounded action/speech behavior using Mineflayer event/action semantics.
- Goal 4: Maintain deterministic safety behavior (Reason Code, Reason Category, Fallback Path).
- Goal 5: Move Unity runtime to deprecated location while retaining full rollback capability.

## Scope

### In Scope
- Mineflayer runtime foundation and backend integration.
- Event normalization and decision loop bridging.
- High-risk action orchestration using documented Action API semantics.
- Validation Criteria and Evidence Pack migration to Mineflayer runtime.
- Unity deprecation process (move to deprecated path, no deletion).

### Out of Scope
- Rewriting Mineflayer upstream internals as a long-term fork.
- Visual parity effort with Unity presentation quality.
- New gameplay systems (economy, progression, combat expansion).
- Any dependency on old community repos.

## Non-Negotiable Constraints
- Node runtime baseline for Mineflayer services: `>=22` (operational target `22.x`).
- Action dispatch starts only after lifecycle readiness gates (`connect/login/game/spawn/inject_allowed` path).
- Critical world mutations (dig/place/interact) enforce per-bot one in-flight action and global concurrency limit.
- Action success requires Evidence (event/state confirmation), not packet-send completion only.
- All fallback outputs must include deterministic Reason Code and Reason Category.
- Unity code must be retained and moved to deprecated path; deletion is prohibited in migration scope.

## Minecraft-Native Observation Model
- Prioritize nearby-NPC observability using Minecraft-native signals:
  - block/entity updates around active NPCs,
  - entity and block events (`entitySpawn`, `blockUpdate`, `diggingCompleted`, `blockPlaced`, `windowOpen`),
  - structured runtime evidence fields (`transport`, `threadId`, `usedFallback`, `reasonCategory`, `warningTier`).
- Treat this observation model as primary over Unity-specific telemetry assumptions.
- Require perception and validation logic to operate from runtime events near each active NPC context window.

## Target Runtime Architecture (Migration Outcome)

### Runtime Path (new primary)
- Mineflayer bot layer (event ingestion, action execution).
- Runtime adapter layer (typed wrappers, lifecycle gates, action runner).
- Decision bridge layer (perception schema -> backend decision payload -> executable `bot.*` commands).
- Backend orchestration layer (Schema, session continuity, per-bot action queue limits, global concurrency limits, Fallback Path).
- Evidence layer (telemetry, regression metrics, Release Candidate Evidence Pack).

### Deprecated Path (legacy retained)
- Unity runtime is now under `deprecated/unity/draem-of-one/`.
- Unity scripts are now under `deprecated/unity/scripts/`.
- Deprecated namespace is maintenance-only and retained for rollback.

## Workstream Matrix

| ID | Workstream | Primary outputs | Depends on |
|---|---|---|---|
| WS0 | Governance lock | migration policy, scope lock, deprecation policy | - |
| WS1 | Mineflayer runtime foundation | typed bot bootstrap, lifecycle gate layer | WS0 |
| WS2 | Decision bridge integration | event normalization, decision payload mapping | WS1 |
| WS3 | Action execution safety | dig/place/interact runner + deterministic fallback | WS1 |
| WS4 | NPC society parity | social loop mapping, bounded speech/action mapping | WS2, WS3 |
| WS5 | Observability migration | Mineflayer telemetry + Evidence Pack pipeline | WS2, WS3 |
| WS6 | Reliability hardening | multi-bot scheduler, backpressure, incident handling | WS3, WS5 |
| WS7 | Unity deprecation move | path relocation to deprecated, docs/CI updates | WS4, WS5 |
| WS8 | Cutover and release gating | final cutover, release checklist, rollback gate | WS6, WS7 |

## Detailed Phase Plan

## Phase 0 - Governance and baseline lock
### Objective
- Freeze migration Intent, Scope, and Safety constraints before implementation.

### Tasks
- P0-1: Publish migration governance note in `plan.md` and align terminology with `terminology.md`.
- P0-2: Define source authority order for Mineflayer behavior:
  1) runtime implementation,
  2) type declarations,
  3) docs.
- P0-3: Lock explicit repo exclusion (`minecraft-llm-agent-community`).
- P0-4: Define deprecation principle: Unity retained and moved, never deleted.
- P0-5: Audit `docs/mineflayer/migration/crosswalk.md` and `docs/mineflayer/migration/legacy-coverage-evidence.md` as baseline evidence sources for migration execution.

### Acceptance Criteria
- Governance rules are explicit, measurable, and versioned.
- Exclusion and deprecation principles are present in plan and referenced in execution tickets.

### Validation Criteria
- Review checklist confirms all new migration tickets include:
  - Mineflayer source baseline,
  - exclusion statement,
  - deprecation retention statement.

## Phase 1 - Mineflayer runtime foundation
### Objective
- Establish a production-safe TypeScript Mineflayer runtime skeleton.

### Tasks
- P1-1: Bootstrap runtime service structure (config, runtime, plugins, types).
- P1-2: Implement strict typed configuration schema and environment validation.
- P1-3: Implement lifecycle gate module according to Event Lifecycle Specification.
- P1-4: Register early `error/end` handling and readiness state transitions.
- P1-5: Add plugin composition layer (`loadPlugin/loadPlugins` strategy).
- P1-6: Enforce TypeScript runtime baseline from implementation guide (`strict`, `NodeNext`, stable output layout).
- P1-7: Materialize Runtime Path/Fallback Path split in code structure (`runtime/lifecycle-gates`, `runtime/action-runner`, `runtime/event-normalizer`).

### Acceptance Criteria
- Bot boot path reaches ready state only after lifecycle gates pass.
- Plugin injection behavior is deterministic and documented.

### Validation Criteria
- Automated checks verify lifecycle transitions under normal connect/login/spawn flow.
- Simulated failure runs verify fail-closed behavior on gate timeout.

## Phase 2 - Decision bridge integration
### Objective
- Connect Mineflayer event intake to backend decision orchestration without schema drift.

### Tasks
- P2-1: Implement event normalizer for world/entity/chat/action events.
- P2-2: Define perception payload schema and correlation identifiers.
- P2-3: Map backend decision payload to executable runtime actions (`bot.dig`, `bot.placeBlock`, `bot.activateBlock`, `bot.chat`).
- P2-4: Preserve `sessionId+npcId` session continuity metadata propagation with lifecycle event context (`login`, `spawn`, `respawn`, `end`).
- P2-5: Keep decision path bounded by per-bot action queue limits and global concurrency limits.
- P2-6: Add nearby-NPC perception windows so observation and decision inputs prioritize local entity/block change context around each active NPC.

### Acceptance Criteria
- Decision requests are schema-valid and fully correlated to runtime context.
- Backend responses can be executed or deterministically downgraded via Fallback Path.

### Validation Criteria
- Integration tests cover success, parse error, timeout, and broker failure lanes.
- Replay tests confirm `sessionId+npcId` continuity stability across repeated NPC turns.

## Phase 3 - Action execution safety (dig/place/interact focus)
### Objective
- Operationalize high-risk world mutation APIs with deterministic behavior.

### Tasks
- P3-1: Implement action runner wrappers for:
  - `canDigBlock`, `dig`, `stopDigging`, `digTime`,
  - `placeBlock`, `placeEntity`, `activateBlock`, `updateSign`.
- P3-2: Enforce precondition checks per API (block validity, reachability, direction vector, held item).
- P3-3: Enforce bounded timeout + retry policy with deterministic Reason Code mapping.
- P3-4: Require success Evidence per API:
  - `diggingCompleted` or air-state confirmation,
  - block state change / `blockPlaced`,
  - `entitySpawn` correlation,
  - `windowOpen` or state confirmation,
  - sign readback verification.
- P3-5: Add drift register for docs/type/runtime mismatches discovered during implementation.

### Acceptance Criteria
- All covered APIs have explicit Runtime Path and Fallback Path behavior.
- No ambiguous action result is returned without reason classification.

### Validation Criteria
- Action conformance suite covers representative success/failure scenarios per API.
- Determinism checks verify Reason Code/Reason Category consistency across repeats.

## Phase 4 - NPC society parity and bounded behavior
### Objective
- Preserve AI-native NPC world pressure loop semantics on Minecraft runtime.

### Tasks
- P4-1: Map existing bounded NPC action whitelist into Mineflayer executable action set.
- P4-2: Map bounded player speech acts into chat/pattern pathways.
- P4-3: Preserve emergent social trajectory behavior without enforcing fixed stage order in policy rules.
- P4-4: Preserve Dream Law and Cover Test trigger surfaces using text-first interactions.
- P4-5: Define non-goals to prevent gameplay expansion during migration.

### Acceptance Criteria
- Session loop remains within target duration and bounded behavior limits.
- Causality remains legible in runtime logs and evidence outputs.

### Validation Criteria
- Scenario tests confirm escalation behavior and deterministic adjudication.
- Repeated runs show non-identical but bounded social trajectories.

## Phase 5 - Observability and Evidence migration
### Objective
- Replace Unity-dependent evidence flow with Mineflayer-native evidence flow.

### Tasks
- P5-1: Define Mineflayer telemetry schema for lifecycle, decisions, actions, fallback.
- P5-2: Add runtime evidence summarizers and regression metric calculators for nearby-NPC behavior deltas and action outcomes.
- P5-3: Build Release Candidate (RC) Evidence Pack pipeline for Mineflayer runs.
- P5-4: Add drift and failure taxonomy dashboards based on Reason Category.
- P5-5: Add structured observation logs that correlate NPC-local world changes with decision/action results in the same evidence record.

### Acceptance Criteria
- Release decision artifacts are generated from Mineflayer sessions.
- Failure lanes are observable with deterministic classification.

### Validation Criteria
- Evidence pipeline smoke tests produce complete artifacts on CI/local runs.
- Regression trends are comparable to existing baseline methodology.

## Phase 6 - Reliability hardening and multi-bot operations
### Objective
- Achieve stable multi-bot operation within bounded concurrency limits.

### Tasks
- P6-1: Implement per-bot action queue and global scheduler with explicit backpressure.
- P6-2: Add cancellation and deadline propagation across decision/action chain.
- P6-3: Stress-test bot counts and action concurrency under synthetic load.
- P6-4: Define operational runbook for incident response and safe degradation.

### Acceptance Criteria
- Multi-bot sessions sustain target load without uncontrolled backlog.
- System remains fail-safe when individual bot/session failures occur.

### Validation Criteria
- Load tests confirm global concurrency limit enforcement and stable throughput.
- Failure injection tests confirm loop continuation via Fallback Path.

## Phase 7 - Unity deprecation relocation (retain, do not delete)
### Objective
- Move Unity runtime and related tooling into an explicit deprecated namespace and mark it maintenance-only.

### Target relocation
- `draem-of-one/` -> `deprecated/unity/draem-of-one/`
- `scripts/unity/` -> `deprecated/unity/scripts/`

### Tasks
- P7-1: Relocate Unity directories using `git mv` to preserve history.
- P7-2: Add deprecation markers:
  - `deprecated/unity/README.md` (status, rationale, rollback guidance),
  - notices in root `README.md` and developer docs.
- P7-3: Update CI so Unity legacy checks are manual/opt-in (not release-critical).
- P7-4: Freeze Unity feature development policy (bugfix-only for archive integrity).
- P7-5: Keep legacy evidence scripts executable for historical comparison windows.

### Acceptance Criteria
- Unity code remains present and buildable in deprecated location.
- Primary docs and CI default paths point to Mineflayer runtime.

### Validation Criteria
- Path migration checks confirm no Unity file deletion.
- Legacy Unity smoke run can still execute via documented manual workflow.

## Phase 8 - Cutover and release governance
### Objective
- Complete cutover with explicit gates and rollback posture.

### Tasks
- P8-1: Run full release gate suite on Mineflayer Runtime Path.
- P8-2: Confirm Unity is no longer on release-critical path.
- P8-3: Execute rollback drill to confirm deprecated Unity path remains recoverable.
- P8-4: Finalize migration report with risks, known drift, and follow-up backlog.
- P8-5: Publish explicit Mineflayer-only Gate H workflow and artifact map.
- P8-6: Publish trajectory diversity verification procedure.
- P8-7: Publish rollback drill log index and reporting template.

### Acceptance Criteria
- Release Candidate decision can be made from Mineflayer Evidence Pack only.
- Trajectory diversity verification criteria are defined and tied to reproducible Evidence.
- Rollback to deprecated Unity path remains technically possible and drill-ready.

### Validation Criteria
- Gate checklist is recorded in `docs/design/ws8-final-migration-report.md` with reproducible artifact links.
- Rollback drill log is recorded in `docs/design/ws8-rollback-drill-log.md` and raw outputs are archived.
- Any criterion remains `pending` until the linked artifact path exists.

## Dependency and sequencing model
- Sequence spine: WS0 -> WS1 -> (WS2, WS3) -> WS4 -> WS5 -> WS6 -> WS7 -> WS8
- Parallel lanes:
  - WS2 and WS3 may run in parallel after WS1.
  - WS5 can start once WS2 and WS3 emit stable event/action telemetry.
- Hard blocks:
  - WS7 (Unity move) must not start before WS4 + WS5 baseline parity is confirmed.
  - WS8 requires WS6 and WS7 completion.

## Risk Register
- Risk R1: Behavior drift from original social loop.
  - Mitigation: lock bounded action/speech mapping and parity scenarios before cutover.
- Risk R2: Non-deterministic action outcomes in high-risk APIs.
  - Mitigation: enforce action Evidence requirements and deterministic Reason Codes.
- Risk R3: Multi-bot saturation and queue backlog.
  - Mitigation: explicit global concurrency limit, backpressure, and incident degradation policy.
- Risk R4: Loss of historical reproducibility after Unity deprecation.
  - Mitigation: retain Unity code/scripts in deprecated path and keep manual legacy smoke workflow.
- Risk R5: Hidden dependency on old community artifacts.
  - Mitigation: enforce explicit exclusion and source authority checks on all tickets.

## Gate Model (must pass in order)
- Gate A: Governance lock complete.
- Gate B: Runtime foundation and lifecycle conformance complete.
- Gate C: Action API conformance complete.
- Gate D: NPC behavior parity complete.
- Gate E: Mineflayer Evidence pipeline complete.
- Gate F: Multi-bot reliability hardening complete.
- Gate G: Unity relocated to deprecated path with no deletion.
- Gate H: Release Candidate decision from Mineflayer-only Evidence Pack.

## Execution Output Checklist
- Updated runtime docs and runbooks for Mineflayer primary path.
- Action conformance test suite and failure taxonomy report.
- Multi-bot reliability report with cap/backpressure evidence.
- Deprecated Unity namespace with preservation markers and manual validation path.
- Final migration report including rollback and residual-risk backlog.

## Definition of Done
- Mineflayer Runtime Path is primary for development, validation, and release decisions.
- Unity runtime is preserved under deprecated namespace and not part of default release pipeline.
- Safety and determinism guarantees (Schema, Reason Code/Reason Category, Fallback Path, `sessionId+npcId` continuity, one in-flight action per bot, global concurrency limit) are verified on Mineflayer runtime.
- Plan constraints are reflected in execution issues and validation artifacts.

## Progress Log
- 2026-02-17:
  - synchronized to `project.md` v10 (Minecraft Intent-First);
  - added Minecraft-native observation model and nearby-NPC evidence requirements;
  - expanded Phase 1/2/5 tasks for implementation-guide conformance and event-local observability;
  - preserved Unity relocation as deprecated (retained, not deleted).
  - implemented Mineflayer runtime foundation in `backend/npc-runtime`:
    - `runtime/lifecycle-gates.ts`, `runtime/plugin-composer.ts`, `runtime/event-normalizer.ts`, `runtime/mineflayer-runtime.ts`;
    - Node baseline updated to `>=22` and Mineflayer dependency added.
  - implemented decision/action bridge in `backend/npc-runtime`:
    - `runtime/action-runner.ts` with dig/place/interact/sign wrappers and deterministic failure outputs;
    - `runtime/decision-bridge.ts` for decision payload -> executable command dispatch;
    - optional dispatch hook wired into `api/http-server.ts`.
  - completed Unity relocation with history preserved:
    - `draem-of-one/` -> `deprecated/unity/draem-of-one/`
    - `scripts/unity/` -> `deprecated/unity/scripts/`
    - added `deprecated/unity/README.md` and updated docs path references.
  - implemented WS4 bounded NPC behavior policy in `backend/npc-runtime`:
    - `runtime/bounded-behavior.ts` for action/command whitelist enforcement;
    - context-hinted social-loop stage annotation without event-sequence hardcoding;
    - removed fixed-stage speech guard so NPC behavior remains simulation-driven within bounded safety rules.
  - implemented WS5 Mineflayer-native telemetry and Evidence Pack pipeline:
    - `runtime/telemetry.ts` for event/decision/scheduler record collection and summarization;
    - HTTP endpoints: `/v1/telemetry/events`, `/v1/telemetry/evidence-pack`, `/v1/telemetry/evidence-pack/export`;
    - scheduler snapshot ingestion into evidence output.
  - implemented WS6 scheduler hardening and queue visibility:
    - `runtime/multi-bot-scheduler.ts` and `DecisionService` admission gates;
    - deterministic backpressure fallback (`runtime_actor_queue_saturated`, `runtime_global_queue_saturated`);
    - `/health/queue` endpoint for mailbox + scheduler snapshot visibility.
  - added migration validation suite expansion:
    - `bounded-behavior.integration.test.ts`, `event-normalizer.integration.test.ts`, `telemetry.integration.test.ts`;
    - `decision-service.integration.test.ts` backpressure scenarios;
    - `http-server.integration.test.ts` queue/telemetry endpoint coverage.
  - completed WS8 documentation baseline artifacts:
    - explicit Mineflayer-only Gate H workflow and rollback drill procedure in `docs/design/runtime-evidence.md`;
    - trajectory diversity verification procedure in `docs/design/game-design.md`;
    - migration report and residual risk backlog in `docs/design/ws8-final-migration-report.md`;
    - rollback drill log index and template in `docs/design/ws8-rollback-drill-log.md`.
  - implemented WS8 Mineflayer-only gate tooling in `backend/npc-runtime/scripts`:
    - `analyze_ws8_backend_evidence.mjs`, `collect_ws8_regression_metrics.mjs`, `package_ws8_rc_artifacts.mjs`, `run_ws8_release_gate.mjs`;
    - `export_ws8_events_snapshot.mjs`, `verify_ws8_trajectory_diversity.mjs`, `run_ws8_rollback_drill.mjs`.
  - generated Gate H run artifacts and RC manifests:
    - `data/evidence/ws8/gate-h/run-a-evidence-pack.json`, `run-b-evidence-pack.json`, `run-c-evidence-pack.json`;
    - `data/evidence/ws8/gate-h/run-a-events.json`, `run-b-events.json`, `run-c-events.json`;
    - `data/evidence/ws8/gate-h/trajectory-diversity.json`;
    - `logs/rc/rc-ws8-run-a/manifest.json`, `logs/rc/rc-ws8-run-b/manifest.json`, `logs/rc/rc-ws8-run-c/manifest.json`.
  - executed rollback drill archive generation:
    - `logs/ws8/rollback-drill/20260217-0949/rollback-drill-report.json`;
    - `logs/ws8/rollback-drill/20260217-0949/rollback-drill-summary.md`.
  - completed WS8 decision recording with Mineflayer-only evidence references in `docs/design/ws8-final-migration-report.md`.

## Next-Run Focus
- Keep RC cadence by refreshing Gate H artifact trio (`run-a/b/c`) and `trajectory-diversity.json` for each release cycle.
- Keep rollback drill cadence by appending new entries to `docs/design/ws8-rollback-drill-log.md`.
- Close residual risk backlog entries only with linked Evidence in `docs/design/ws8-final-migration-report.md`.
