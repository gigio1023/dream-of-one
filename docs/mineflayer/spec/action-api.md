# Specification: Action API (Dig/Place/Interact)

## Intent
- Provide normative, implementation-backed semantics for high-risk world mutation APIs.
- Enable deterministic orchestration for AI coding assistants using Mineflayer.

## Scope
- Owns:
  - action semantics for dig/place/interact/sign APIs
  - action-specific Runtime Path and Fallback Path
  - Reason Code and Reason Category mapping for these APIs
- Does not own:
  - broader lifecycle rules (see `event-lifecycle.md`)
  - complete API surface catalog (see `../reference/api-catalog.md`)
  - tutorial procedures (see `../guides/tutorial.md`)

## Covered APIs
- `bot.canDigBlock(block): boolean`
- `bot.dig(block, forceLook?, digFace?): Promise<void>`
- `bot.stopDigging(): void`
- `bot.digTime(block): number`
- `bot.placeBlock(referenceBlock, faceVector): Promise<void>`
- `bot.placeEntity(referenceBlock, faceVector): Promise<Entity>`
- `bot.activateBlock(block, direction?, cursorPos?): Promise<void>`
- `bot.updateSign(block, text, back?): void`

## Action Envelope Schema
```ts
type ActionResult =
  | { ok: true; actionId: string; evidence?: Record<string, unknown> }
  | {
      ok: false
      actionId: string
      reasonCode: string
      reasonCategory:
        | 'precondition'
        | 'visibility'
        | 'timeout'
        | 'server-state'
        | 'type-mismatch'
        | 'unknown'
      detail?: string
    }
```

## Reason Code Baseline
- `DIG_BLOCK_UNDEFINED`
- `DIG_TIME_INFINITY`
- `DIG_BLOCK_NOT_IN_VIEW`
- `DIG_ABORTED`
- `PLACE_MISSING_HELD_ITEM`
- `PLACE_OFFHAND_EMPTY`
- `PLACE_BLOCK_NO_STATE_CHANGE`
- `PLACE_ENTITY_UNSUPPORTED_ITEM`
- `PLACE_ENTITY_SPAWN_TIMEOUT`
- `ACTIVATE_DIRECTION_INVALID`
- `SIGN_TOO_MANY_LINES`
- `SIGN_LINE_TOO_LONG`

## API Semantics

### `bot.canDigBlock(block)`
- Runtime Path:
  - checks block presence, `diggable` flag, and reach distance.
- Fallback Path:
  - returns `false`; caller decides alternative route.
- Preconditions:
  - valid block reference from loaded world.
- Postconditions:
  - no packet emission.

### `bot.dig(block, forceLook?, digFace?)`
- Runtime Path:
  1. validate block input.
  2. normalize `digFace`.
  3. compute `digTime`; reject on `Infinity`.
  4. orient bot unless `forceLook === 'ignore'`.
  5. cancel prior active dig if needed.
  6. emit start packet and begin swing/update wait loop.
  7. resolve on air block update confirmation.
- Fallback Path:
  - visibility failure or abort triggers rejection with mapped Reason Code.
- Preconditions:
  - block visible/reachable under selected orientation mode.
- Postconditions:
  - success emits `diggingCompleted`; abort emits `diggingAborted`.

### `bot.stopDigging()`
- Runtime Path:
  - no-op if no active dig.
  - during active dig, sends cancel packet, clears timers/listeners, aborts task.
- Fallback Path:
  - safe repeated invocation.
- Preconditions:
  - none.
- Postconditions:
  - active dig state is cleared deterministically.

### `bot.digTime(block)`
- Runtime Path:
  - computes dig duration from held tool, enchantments, effects, and movement/water state.
- Fallback Path:
  - `Infinity` must be treated as no-action unless preconditions are changed.
- Preconditions:
  - block available.
- Postconditions:
  - no packets/events.

### `bot.placeBlock(referenceBlock, faceVector)`
- Runtime Path:
  1. compute destination.
  2. perform generic placement packet path.
  3. wait for state change (`blockUpdate`) when immediate state unchanged.
  4. emit `blockPlaced` on confirmed change.
- Fallback Path:
  - on no state change timeout, fail with `PLACE_BLOCK_NO_STATE_CHANGE`.
- Preconditions:
  - held item/offhand availability and valid direction vector.
- Postconditions:
  - world mutation confirmed or deterministic failure.

### `bot.placeEntity(referenceBlock, faceVector)`
- Runtime Path:
  1. validate held item class for supported entity placement.
  2. perform generic place operation.
  3. handle type-specific packet branch (for example boats).
  4. wait for matching `entitySpawn`.
  5. emit `entityPlaced` in runtime code path.
- Fallback Path:
  - unsupported item or spawn timeout yields deterministic failure.
- Preconditions:
  - supported held item and valid place surface.
- Postconditions:
  - returns spawned entity or classified failure.

### `bot.activateBlock(block, direction?, cursorPos?)`
- Runtime Path:
  - normalize defaults, orient, send interaction packet branch, swing arm.
- Fallback Path:
  - invalid direction vector is classification failure.
- Preconditions:
  - valid block and direction.
- Postconditions:
  - packet dispatch complete; caller should verify outcome via follow-up event evidence.

### `bot.updateSign(block, text, back?)`
- Runtime Path:
  - split lines, enforce max lines/length, encode text by feature mode, send `update_sign`.
- Fallback Path:
  - validation failures emit bot `error` event and return.
- Preconditions:
  - sign block target and valid line constraints.
- Postconditions:
  - sign update packet emitted when constraints pass.

## Required Action Orchestration Rules
1. Critical world actions MUST run single-flight per bot.
2. Action success MUST be evidence-backed (event or state re-check), not packet-send only.
3. Every failure MUST map to a deterministic Reason Code.
4. Retry MUST be bounded and precondition-aware.

## Evidence Requirements per Action
| API | Minimum Evidence on Success |
|---|---|
| `dig` | `diggingCompleted` and/or block becomes air |
| `placeBlock` | changed destination block state and `blockPlaced` event |
| `placeEntity` | matching spawned entity observed |
| `activateBlock` | expected follow-up event/state (for example `windowOpen`) |
| `updateSign` | sign readback reflects expected text |

## Known Drift Notes (Action Scope)
- Runtime may emit events not fully represented in type declarations.
- Docs wording can differ from implementation for some optional arguments.
- Outcome confirmation requirements are stronger than simple Promise completion in some APIs.

## Acceptance Criteria
- All listed APIs have explicit preconditions and deterministic failure mapping.
- Action execution can be orchestrated safely under single-flight constraints.
- Success paths are tied to observable evidence.

## Validation Criteria
- Validate each API with representative success/failure scenarios.
- Validate Reason Code mapping determinism.
- Validate no ambiguous retry loops under timeout/visibility errors.
