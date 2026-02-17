# Specification: Event Lifecycle

## Intent
- Define lifecycle-phase event handling requirements for Mineflayer runtimes.
- Ensure event-driven logic is deterministic, testable, and safe for multi-bot orchestration.

## Scope
- Owns:
  - lifecycle phase model
  - event responsibilities per phase
  - lifecycle failure handling and fallback criteria
- Does not own:
  - complete method/event catalog (see `../reference/api-catalog.md`)
  - deep action method semantics (see `action-api.md`)

## Lifecycle Phase Model
1. **Boot**
   - configuration load
   - bot creation
   - plugin loader binding
2. **Handshake**
   - connect/error/end bridging
   - version/registry gate resolution
   - injection gate release
3. **Session Start**
   - login/game/spawn transition
   - initial state readiness checks
4. **Active Loop**
   - event ingest
   - decision dispatch
   - action execution and evidence capture
5. **Recovery**
   - disconnect, respawn, or recoverable failure handling
6. **Shutdown**
   - listener/timer cleanup
   - state persistence flush

## Event Responsibility Matrix
| Event Class | Owner Responsibility | Required Behavior |
|---|---|---|
| connect/login/game/spawn | runtime bootstrap layer | gate action pipeline until ready |
| end/error/kicked | recovery layer | classify failure and transition safely |
| block/world updates | action confirmation layer | use as evidence for mutation results |
| entity updates | perception layer | maintain coherent NPC/player state |
| chat/messagestr | parse layer | route through pattern parser and fallback |
| physicsTick | timing layer | bounded high-frequency logic only |

## Normative Rules
1. Action dispatch MUST NOT start before readiness gates are satisfied.
2. Handler registration SHOULD occur before session start transitions.
3. High-frequency events MUST use bounded processing to avoid backlog.
4. On lifecycle failure, dependent pipelines MUST fail closed, not open.
5. Recovery behavior MUST emit explicit Reason Code/Reason Category.

## Readiness Gate Specification
- Minimum gate set before entering Active Loop:
  - transport connected
  - version/registry resolved
  - plugin injection allowed
  - spawn/session state available for target workflow

## Recovery/Fallback Specification

### Recoverable failures
- transient disconnection
- spawn delay or world update delay
- parse mismatch on expected chat format

### Non-recoverable failures (for current run)
- persistent auth/session failure
- unsupported version gate failure
- repeated readiness timeout beyond retry budget

### Required fallback outputs
- Reason Code
- Reason Category
- phase at failure
- action/context correlation id

## Listener Hygiene Specification
- Named listeners SHOULD be used for removable handlers.
- Phase-specific listeners MUST be detached on phase exit where appropriate.
- Recovery and shutdown flows MUST clear intervals/timeouts created by active phases.

## Multi-Bot Lifecycle Coordination
- Each bot lifecycle state SHOULD be tracked independently.
- Global orchestration MUST avoid coupling one bot’s failure to all bots by default.
- Shared resources (decision service, queue) MUST enforce backpressure and Global Cap.

## Acceptance Criteria
- Lifecycle phases are explicit in runtime implementation docs/code.
- Readiness gates are validated before action dispatch.
- Recovery behavior is deterministic and reason-coded.

## Validation Criteria
- Simulate connect/login/spawn normal path and confirm gate transitions.
- Simulate disconnect/reconnect and confirm handler cleanup and re-entry.
- Simulate delayed world updates and confirm fallback classification.
