---
doc: project.md
project: Dream of One
variant: Lucid Cover Social Stealth
revision: 2026-02-08
status: Locked v5 (v0.1 Complete + v0.2 Transition Contract)
owner: You
---

# Dream of One - Project Definition (Codex-CLI-First v5)

## 0) One-line definition
A 3D social-stealth simulation where NPC society is driven by Codex CLI reasoning, while the player survives by behaving procedurally normal and avoiding lucid identification.

## 1) Product goal (simple, fixed)
Ship a playable v0.1 prototype where:
- Unity controls the 3D world and action execution.
- NPC cognition is produced by Codex CLI (not hardcoded behavior trees).
- The player loop remains "cover work under social pressure, do not get identified as lucid."

This project is not a content-heavy RPG. It is a focused proof that an LLM-agent society can run as the core gameplay loop.

## 2) Platform and architecture decision
### 2.1 Chosen platform (locked for v0.1)
- Runtime client: Unity (required for 3D environment control).
- Backend runtime: Node.js 24 LTS.
- Backend framework: Fastify 5.x.
- Backend language: TypeScript 5.9.
- Backend validation model: strict JSON Schema validation (Ajv strict mode).
- Agent framework: Claude Agent SDK (TypeScript) for session/hook orchestration.
- NPC reasoning engine: Codex CLI via Codex MCP tools (`codex`, `codex-reply`).

### 2.2 Why this split
- Unity gives deterministic world execution, navigation, and authority.
- Fastify + TypeScript keeps the service small, explicit, and low-latency for NPC cadence.
- JSON Schema-first validation gives contract safety before Unity execution.
- Claude SDK provides orchestration and policy hooks around tool calls.
- Codex CLI provides high-agency, context-aware NPC intent generation.

### 2.3 Backend architecture commitments (v0.1)
- One backend service is authoritative for NPC decision brokerage (`backend/npc-runtime`).
- No microservice split during v0.1.
- Thread continuity key is fixed: `sessionId + npcId`.
- Every decision request must end in one of two outcomes only:
  - validated `NpcIntent`
  - deterministic fallback `NpcIntent`
- Backend returns data contracts only; Unity remains action execution authority.

### 2.4 Explicit non-adoptions for v0.1
- No GraphQL gateway.
- No event-bus-first runtime dependency.
- No persistence-heavy redesign before core loop stability is proven.
- No additional backend framework migration during v0.1 execution.

## 3) What this game is / is not
### 3.1 This game is
- A simulation-first social stealth game.
- A small society simulation across organizations and procedures.
- A game where NPC decision outputs are mostly LLM-generated.

### 3.2 This game is not
- A player-driven detective game solving external crimes.
- A combat/progression/economy RPG.
- A fully authored deterministic narrative.

## 4) Non-negotiable constraints
### 4.1 Simplicity constraints
- Session target: 10-12 minutes.
- Fixed landmarks in v0.1: `Store`, `Studio`, `Park`, `Station`.
- NPC action set fixed to 8:
  - `Move`, `Talk`, `Ask`, `Observe`, `Work`, `Report`, `Escort`, `Idle`.
- Player speech acts fixed to 4:
  - `SA_COMPLY`, `SA_INQUIRE`, `SA_FRAME`, `SA_BREAK`.

### 4.2 Runtime authority constraints
- Unity is authoritative for physics, navigation, and executable actions.
- Backend is authoritative for NPC intent generation and memory policy.
- Codex output is never executed directly without Unity validation.

### 4.3 Reliability constraints
- Codex timeout/failure must not deadlock session progress.
- Every NPC decision response must pass strict schema validation.
- Invalid decisions fail closed to deterministic fallback action.

### 4.4 Backend operational constraints
- `/v1/npc/decision` contract is request-response and deterministic under failure.
- Timeout budget for Codex call is bounded and configurable.
- Fallback shape is stable across all failure reasons.
- Health endpoint and runtime readiness visibility are mandatory.
- Decision telemetry must include transport path (`codex`, `codex-reply`, `fallback`) and reason trace.

## 5) Core fantasy and player promise
- The player is the only lucid dreamer.
- NPCs treat dream rules as normal social procedure.
- The player is the target of social scrutiny, not the investigator.
- If the player is identified as lucid, the session ends immediately.

## 6) Design pillars
1. **Codex cognition first**: NPC decisions come from Codex CLI threads.
2. **Unity execution authority**: world state and action execution remain deterministic.
3. **Dream-cover pressure**: social suspicion and exposure drive tension.
4. **Readable causality**: every escalation is explainable.
5. **Small system, deep behavior**: fewer mechanics, stronger agent behavior.

## 7) System boundary
### 7.1 Unity responsibilities
- Observe world and produce `PerceptionPacket`.
- Validate intent against world and authority constraints.
- Execute approved actions and write `WorldEventLog`.
- Enforce end-state (`Lucid identified` => immediate end).

### 7.2 TypeScript backend responsibilities
- Manage NPC sessions, memory policy, and instruction context assembly.
- Build Codex prompts from role, organization, and recent event context.
- Call Codex MCP tools and parse structured outputs.
- Return normalized `NpcIntent` to Unity, or deterministic fallback.

### 7.3 Claude Agent SDK responsibilities
- Hook policy layer (`pre`, `tool`, `post`) for consistency and safety.
- Session orchestration and tool routing.
- Enforce that cognition path always goes through Codex tools.

### 7.4 Codex CLI responsibilities
- Generate NPC intent and optional utterance under strict output schema.
- Maintain per-NPC thread continuity (`threadId`).
- Use provided memory/context, not direct world mutation.

## 8) Runtime contract
### 8.1 Observe -> Decide -> Act
1. Unity sends `PerceptionPacket` for active NPCs.
2. Backend validates ingress schema before any tool call.
3. Backend maps NPC to Codex `threadId` (`sessionId+npcId`).
4. Backend calls `codex` (new thread) or `codex-reply` (existing thread).
5. Backend parses/normalizes tool output into `NpcIntent`.
6. If parse/tool failure occurs, backend emits deterministic fallback intent.
7. Unity validates and executes action or applies Unity-side safety fallback.
8. Unity writes outcomes to WEL; backend updates memory state.

### 8.2 Tick policy (v0.1)
- Active NPCs: 1-2 second cadence.
- Background NPCs: 4-8 second cadence.
- Max decision budget per frame to avoid frame spikes.

### 8.3 Deterministic fallback contract
- Fallback action must stay safe (`Observe`) unless explicitly revised by project contract.
- Fallback reason must be surfaced in `reasonCodes`.
- Fallback confidence is constrained to the minimum safe value.

### 8.4 Runtime observability requirements
- Every decision includes transport path and fallback usage flag.
- Every escalation-relevant decision carries non-empty `reasonCodes`.
- Failure counters (timeout, parse failure, tool failure) are tracked per session.

## 9) Data contracts (strict)
### 9.1 `PerceptionPacket` (Unity -> backend)
Required fields:
- `sessionId`
- `npcId`
- `landmarkId`
- `nearbyActors`
- `recentEvents`
- `organizationContext`
- `playerSignals`

Contract rules:
- No missing required fields.
- Unknown optional fields are ignored unless explicitly adopted in plan.

### 9.2 `NpcIntent` (backend -> Unity)
Required fields:
- `npcId`
- `actionType` (8-action whitelist)
- `reasonCodes` (non-empty array)
- `confidence` (0.0-1.0)

Optional fields:
- `targetId`
- `locationId`
- `utterance` (short)

Contract rules:
- `npcId` must match request target NPC.
- Out-of-whitelist action values are rejected to fallback.

### 9.3 `DecisionEnvelope` (backend internal response wrapper)
- `intent` (`NpcIntent`)
- `meta.usedFallback` (boolean)
- `meta.reason` (optional fallback reason)
- `meta.threadId` (optional when tool path succeeds)
- `meta.transport` (`codex` | `codex-reply` | `fallback`)

### 9.4 `ActionOutcome` (Unity -> backend)
- `success`
- `blockedReason` (optional)
- `effects`
- `eventRefs`

## 10) NPC memory and instruction model
### 10.1 Memory layers
- `IdentityMemory`: role, org, authority, tone.
- `EpisodicMemory`: rolling window of recent events.
- `SocialMemory`: trust/suspicion vectors for key actors.

### 10.2 Instruction layers
- Global policy (dream-cover rules).
- Organization policy (`Store/Studio/Park/Station`).
- Role card (job, limits, priorities).
- Immediate task context (current shift objective).

## 11) Player loop and endings
### 11.1 Loop
- Receive cover checklist.
- Execute procedural tasks.
- Respond to NPC pressure via 4 speech acts.
- Survive reporting/inquest pressure.

### 11.2 Win/Lose
- Win: session reaches end without `Lucid identified`.
- Lose: `Lucid identified` verdict/event fires.

### 11.3 Endings
- `Clean Pass`
- `Narrow Escape`
- `Exposed`

## 12) Exposure model
### 12.1 Signals
- `Suspicion`: social/procedural irregularity.
- `Exposure`: lucid reveal pressure.

### 12.2 Gate rule
- NPC behavior generation is LLM-driven.
- Terminal transition gates remain deterministic for testability.
- `Exposure >= 100` forces `Exposed`.

### 12.3 Why visibility
Each major pressure event must show:
- trigger source
- witness/source actor
- resulting record/report reference

## 13) Scope boundaries for v0.1
### 13.1 Required
- 4 landmarks operational.
- 8-12 NPCs with distinct role cards.
- 10-12 minute playable session.
- Report -> intake -> verdict closure path.

### 13.2 Deferred
- combat/economy/progression trees
- large authored quest chains
- multi-district streaming world
- long-term meta progression
- backend architecture expansion beyond single service

## 14) Acceptance criteria (prototype v0.1)
All must hold:
1. Most non-idle NPC actions are Codex-generated (target >= 70%).
2. Session completes in 10-12 minutes with one of 3 endings.
3. Three consecutive runs show non-identical social trajectories.
4. Failure/survival causes are readable in UI/logs.
5. Codex timeout/failure does not freeze simulation.
6. Backend always returns valid decision envelope shape.
7. Thread continuity holds for repeated `sessionId+npcId` requests.
8. Fallback path is deterministic and reason-traceable.
9. Unity diagnostics pass.
10. Runtime contract tests pass for schema validation and fallback policy.

## 15) Engineering quality gates
- `Tools/DreamOfOne/Run Diagnostics` clean.
- PlayMode baseline:
  - session start/end
  - Codex unavailable fallback
  - report -> intake -> verdict path
- Backend contract tests:
  - schema validation
  - thread continuity
  - fallback policy
  - transport-path telemetry tags
- Runtime operability checks:
  - health endpoint reachable
  - timeout path observable
  - parse failure path observable

## 16) Change governance for this contract
- Backend platform lock (Node/Fastify/TS) is fixed for v0.1.
- Any changes to contracts or authority boundaries require synchronized update to `plan.md` in the same change.
- New systems are prohibited unless existing v0.1 exit criteria are already green.

## 17) Document role map
- Product + architecture contract: `project.md` (this doc)
- Execution roadmap: `plan.md`
- Design details and examples: `docs/design/game-design.md`
- Rule packs: `docs/design/dream-laws.md`, `docs/design/cover-tests.md`

## 18) Implementation principle
Do not add new gameplay systems until Codex-driven NPC society is stable, observable, and replayable in the existing 4-landmark slice.

## 19) Execution snapshot (2026-02-08)
### 19.1 Confirmed completed gates
- Master vertical slice issue `DRE-111` is closed with all phase children complete.
- Unity diagnostics pass clean (`[Diagnostics] OK: no issues found.`).
- Backend runtime closure is complete:
  - readiness/health split and deterministic readiness reasons are implemented.
  - thread continuity fail-closed guard is implemented for invalid `codex-reply` thread IDs.
  - `backend/npc-runtime` check suite passes (`build + integration tests`).

### 19.2 Accepted next milestone
- Immediate milestone: v0.2 replayability and operational visibility hardening.
- Required outcomes:
  - decision-level correlation identity is returned and logged consistently.
  - acceptance criterion #3 evidence is automated (three non-identical trajectories).
  - reliability thresholds (timeout/fallback/parse-failure) are reviewable per run.

### 19.3 v0.2 execution guardrails
- Keep the current world/mechanics scope fixed while hardening observability and replayability.
- Prioritize measurable evidence and deterministic gates over new feature breadth.
- Continue one-issue-at-a-time execution with Linear as work source of truth.
