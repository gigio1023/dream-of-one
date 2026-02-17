# Mineflayer AI Assistant Action API Specification (Dig/Place/Interact)

## Status Snapshot
- Date: 2026-02-17
- Source baseline: `/Users/user/git/gigio1023/mineflayer` (latest original local clone)
- Target audience: AI coding assistant runtime and toolchain authors
- Focus APIs:
  - `bot.canDigBlock(block): boolean`
  - `bot.dig(block, forceLook?, digFace?): Promise<void>`
  - `bot.stopDigging(): void`
  - `bot.digTime(block): number`
  - `bot.placeBlock(referenceBlock, faceVector): Promise<void>`
  - `bot.placeEntity(referenceBlock, faceVector): Promise<Entity>`
  - `bot.activateBlock(block, direction?, cursorPos?): Promise<void>`
  - `bot.updateSign(block, text, back?): void`
- Scope guard: this Specification only uses implemented Mineflayer source behavior
- Exclusion guard: `/Users/user/git/gigio1023/minecraft-llm-agent-community` is not considered

## Intent
- Define deterministic, implementation-backed behavior for high-risk world action APIs so an AI coding assistant can plan, execute, and recover safely.
- Convert runtime behavior into an explicit Runtime Path and Fallback Path with machine-friendly Reason Code patterns.

## Scope
- In Scope:
  - Mineflayer runtime implementation in `lib/plugins/*`
  - Type signatures in `index.d.ts`
  - API reference and event docs in `docs/api.md`
  - Behavioral Evidence from `examples/*` and `test/externalTests/*`
- Out of Scope:
  - Non-upstream forks
  - Unsupported plugin overrides that replace these APIs

## Source Evidence
| Area | Evidence |
|---|---|
| Dig runtime | `/Users/user/git/gigio1023/mineflayer/lib/plugins/digging.js` |
| Place block runtime | `/Users/user/git/gigio1023/mineflayer/lib/plugins/place_block.js` |
| Generic place transport | `/Users/user/git/gigio1023/mineflayer/lib/plugins/generic_place.js` |
| Place entity runtime | `/Users/user/git/gigio1023/mineflayer/lib/plugins/place_entity.js` |
| Activate block runtime | `/Users/user/git/gigio1023/mineflayer/lib/plugins/inventory.js` |
| Sign update runtime | `/Users/user/git/gigio1023/mineflayer/lib/plugins/blocks.js` |
| Event cleanup/timeouts | `/Users/user/git/gigio1023/mineflayer/lib/promise_utils.js` |
| API signatures | `/Users/user/git/gigio1023/mineflayer/index.d.ts` |
| API documentation | `/Users/user/git/gigio1023/mineflayer/docs/api.md` |
| Dig/Place usage Evidence | `/Users/user/git/gigio1023/mineflayer/examples/digger.js`, `/Users/user/git/gigio1023/mineflayer/examples/farmer.js`, `/Users/user/git/gigio1023/mineflayer/examples/place_entity.js`, `/Users/user/git/gigio1023/mineflayer/examples/graffiti.js` |
| Test Evidence | `/Users/user/git/gigio1023/mineflayer/test/externalTests/digAndBuild.js`, `/Users/user/git/gigio1023/mineflayer/test/externalTests/digEverything.js`, `/Users/user/git/gigio1023/mineflayer/test/externalTests/placeEntity.js`, `/Users/user/git/gigio1023/mineflayer/test/externalTests/sign.js`, `/Users/user/git/gigio1023/mineflayer/test/externalTests/nether.js` |

## Assistant-Oriented Global Specification

### 1) Shared Runtime assumptions
- Bot must be connected, spawned, and have chunk data available near the target.
- These APIs are mostly stateful and packet-driven; do not parallelize actions touching the same local world neighborhood.
- `Vec3` direction vectors are interpreted as cardinal face selectors; invalid vectors can trigger assertion failures.

### 2) Single-flight policy (mandatory)
- Maintain one in-flight high-impact world action per bot instance:
  - Digging is explicitly single-flight in runtime (`bot.targetDigBlock` state machine).
  - Placement and activation should be serialized for deterministic observation and error attribution.

### 3) Deterministic action envelope `Schema`
```ts
type ActionEnvelope = {
  actionId: string
  action: 'canDigBlock' | 'dig' | 'stopDigging' | 'digTime' | 'placeBlock' | 'placeEntity' | 'activateBlock' | 'updateSign'
  input: Record<string, unknown>
  startedAtMs: number
}

type ActionResult =
  | { ok: true; actionId: string; evidence?: Record<string, unknown> }
  | { ok: false; actionId: string; reasonCode: string; reasonCategory: 'precondition' | 'visibility' | 'timeout' | 'server-state' | 'type-mismatch' | 'unknown'; detail?: string }
```

### 4) Reason Code baseline
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

## API Specification (Detailed)

### `bot.canDigBlock(block): boolean`

#### Signature source
- `index.d.ts` declares `canDigBlock: (block: Block) => boolean`.

#### Runtime Path
1. Returns `false` when `block` is falsy.
2. Checks `block.diggable` must be truthy.
3. Computes distance from block center (`+0.5,+0.5,+0.5`) to bot eye position approximation (`+0,+1.65,+0`).
4. Returns `true` only when distance `<= 5.1`.

#### Preconditions
- `block` should be a valid `Block` from world state.

#### Postconditions
- No packets emitted.
- No events emitted.

#### Assistant usage rule
- Use as early precondition gate, not as final authority:
  - Server-side checks can still reject dig due to dynamic state/permissions.

#### Drift note
- Uses fixed `1.65` eye offset, not dynamic `bot.entity.eyeHeight`; keep this in mind for unusual entity states.

---

### `bot.dig(block, forceLook?, digFace?): Promise<void>`

#### Signature source
- `index.d.ts` overload:
  - `(block: Block, forceLook?: boolean | 'ignore') => Promise<void>`
  - `(block: Block, forceLook: boolean | 'ignore', digFace: 'auto' | Vec3 | 'raycast') => Promise<void>`

#### Runtime Path
1. Rejects if `block` is `null`/`undefined`.
2. Normalizes `digFace` to `'auto'` when absent or function-like.
3. Computes `waitTime = bot.digTime(block)`; rejects if `Infinity`.
4. Initializes default `targetDigFace = 1` (top).
5. Orientation stage (unless `forceLook === 'ignore'`):
   - `Vec3` digFace: maps axis sign to face enum and looks at face center.
   - `'raycast'`: raycasts candidate faces from eye position, selects closest valid face; may throw `Block not in view`.
   - `'auto'` or other: looks at block center.
6. If another dig is active (`bot.targetDigBlock`), calls `bot.stopDigging()` first.
7. Starts new dig task:
   - Sends `block_dig` start packet (`status: 0`) with selected face.
   - Sets timeout for `waitTime` to call finish stage.
   - Sets swing loop every `350ms`.
8. Finish stage timeout:
   - Sends `block_dig` finish packet (`status: 2`) for same face.
   - Clears state.
   - Calls `_updateBlockState(block.position, 0)` to local-air update.
9. Wait stage:
   - Subscribes to `blockUpdate:<pos>`.
   - Completes only when `newBlock?.type === 0`.
   - Emits `diggingCompleted`.
10. Promise resolves when dig task completes; rejects when aborted.

#### Preconditions
- Block must exist and be diggable in practice.
- Dig time must be finite.
- If using non-ignore look path, target face must be visible or reachable by path chosen.

#### Postconditions
- On success:
  - target dig state cleared
  - `lastDigTime` updated
  - `diggingCompleted` emitted
- On abort/failure:
  - abort packet may be sent
  - `diggingAborted` emitted
  - promise rejects

#### Events
- Emits:
  - `diggingCompleted` on success
  - `diggingAborted` on interruption
- Depends on:
  - `blockUpdate:<x,y,z>` to confirm air transition

#### Error and Fallback Path
- Throws/rejects with:
  - undefined block
  - infinite dig time
  - block not in view (raycast path)
  - digging aborted
- Recommended assistant mapping:
  - undefined block → `DIG_BLOCK_UNDEFINED` (`precondition`)
  - infinite dig time → `DIG_TIME_INFINITY` (`precondition`)
  - not in view → `DIG_BLOCK_NOT_IN_VIEW` (`visibility`)
  - aborted → `DIG_ABORTED` (`server-state`)

#### Concurrency rule
- Treat `dig` as single-flight.
- If issuing a new dig while one is running, expect previous `dig` promise rejection by design.

#### Practical Evidence
- `examples/digger.js` checks `canDigBlock` before `await bot.dig(...)`.
- `test/externalTests/digAndBuild.js` and `digEverything.js` validate real server execution.

---

### `bot.stopDigging(): void`

#### Signature source
- `index.d.ts` declares `stopDigging: () => void`.

#### Runtime Path
1. Before any dig starts, `stopDigging` is initialized as noop.
2. During active dig, `stopDigging` becomes closure-bound to current dig context.
3. If called while no active target, returns immediately.
4. If active:
   - Removes block update listener.
   - Clears swing interval and wait timeout.
   - Sends `block_dig` cancel packet (`status: 1`) with calculated cancellation face.
   - Clears target state and stamps `lastDigTime`.
   - Emits `diggingAborted`.
   - Cancels in-flight dig task with `Error('Digging aborted')`.

#### Preconditions
- None (safe to call repeatedly).

#### Postconditions
- Active dig state is canceled deterministically.

#### Assistant usage rule
- Use as explicit fallback when:
  - mission interruption
  - target invalidation
  - timeout supervision from orchestrator

---

### `bot.digTime(block): number`

#### Signature source
- `index.d.ts` declares `digTime: (block: Block) => number`.

#### Runtime Path
1. Reads current held item type and enchantments.
2. Adds helmet enchantments (Aqua Affinity effect).
3. Reads `creative` mode, water state, on-ground state, active effects.
4. Delegates to `block.digTime(...)`.
5. Returns milliseconds; can be `Infinity`.

#### Preconditions
- `block` should be valid.

#### Postconditions
- Pure computation only; no packets/events.

#### Assistant usage rule
- Always evaluate before dig planning.
- If `Infinity`, choose Fallback Path (tool switch, game mode change, or action skip).

---

### `bot.placeBlock(referenceBlock, faceVector): Promise<void>`

#### Signature source
- `index.d.ts` declares `placeBlock: (referenceBlock: Block, faceVector: Vec3) => Promise<void>`.

#### Runtime Path
1. Computes destination `dest = referenceBlock.position.plus(faceVector)`.
2. Reads current `oldBlock = bot.blockAt(dest)`.
3. Calls `_genericPlace(...)`:
   - validates held item (or offhand for optioned path)
   - computes cursor point
   - optional `lookAt`
   - sends version-specific `block_place` packet
4. Reads immediate `newBlock = bot.blockAt(dest)`.
5. If type unchanged, waits (up to `5000ms`) for `blockUpdate:<dest>` where type changes.
6. Handles world unload special case:
   - `(oldBlock,newBlock) === (null,null)` returns without throw.
7. If still unchanged, throws `No block has been placed`.
8. On change, emits `blockPlaced(oldBlock,newBlock)` and resolves.

#### Preconditions
- Valid `referenceBlock` and cardinal-compatible `faceVector`.
- Bot must hold a placeable item (enforced in `_genericPlace`).

#### Postconditions
- Promise resolves after observed block-state change or world unload short-path.

#### Events
- Emits:
  - `blockPlaced` on successful observed state change
- Depends on:
  - `blockUpdate:<x,y,z>` dynamic event pipeline

#### Error and Fallback Path
- Missing held/offhand item in generic place path.
- No observed state change within timeout window.
- Invalid direction vector assertion failures.

#### Assistant usage rule
- After resolve, validate `bot.blockAt(dest)` against expected block type.
- On timeout/no-change, re-fetch inventory and target block before retry.

---

### `bot.placeEntity(referenceBlock, faceVector): Promise<Entity>`

#### Signature source
- `index.d.ts` declares `placeEntity: (referenceBlock: Block, faceVector: Vec3) => Promise<Entity>`.

#### Runtime Path
1. Requires `bot.heldItem` or throws.
2. Normalizes held item type and asserts support:
   - `end_crystal`, `boat`, `spawn_egg`, `armor_stand`.
3. For spawn eggs, derives target mob name and suppresses hand animation visibility.
4. Uses `_genericPlace(...)` for look/packet baseline.
5. Boat branch sends additional packet (`use_item` or legacy `block_place`) by feature gate.
6. Waits for `entitySpawn` up to `5000ms`:
   - normalizes expected entity name by version feature flags
   - checks distance threshold (2/3/4 blocks by type)
7. Emits `entityPlaced(entity)` and resolves with spawned `Entity`.

#### Preconditions
- Supported held item type.
- Valid placement surface context.

#### Postconditions
- Returns spawned entity object when found.

#### Events
- Emits runtime event `entityPlaced` in implementation.

#### Type/document drift note
- `entityPlaced` is emitted in runtime code but not declared in `index.d.ts` and not documented in `docs/api.md`.

#### Error and Fallback Path
- Unsupported item assertion (`Unimplemented`).
- Spawn timeout (`Failed to place entity`).

#### Assistant usage rule
- Treat as high-variance action:
  - verify held item category before call
  - on timeout, query nearby entities before retry
  - enforce backoff and max attempts

#### Implementation caveat
- Listener currently unsubscribes after first `entitySpawn` callback path, which can amplify false negatives in noisy spawn environments; protect with retry policy.

---

### `bot.activateBlock(block, direction?: Vec3, cursorPos?: Vec3): Promise<void>`

#### Signature source
- `index.d.ts` declares `activateBlock: (block: Block, direction?: Vec3, cursorPos?: Vec3) => Promise<void>`.

#### Runtime Path
1. Defaults:
   - `direction = new Vec3(0,1,0)`
   - `cursorPos = new Vec3(0.5,0.5,0.5)`
2. Converts direction vector to numeric face.
3. Calls `lookAt(block center)`.
4. Sends version-specific `block_place` activation packet.
5. Swings main hand.
6. Promise resolves after local async flow; no explicit server confirmation wait.

#### Preconditions
- `direction` must map to valid face (non-zero cardinal vector).

#### Postconditions
- Interaction packet sent.

#### Error and Fallback Path
- Invalid direction vector triggers assertion failure path.

#### Assistant usage rule
- If outcome matters (for example inventory window or state change), wait for explicit follow-up Evidence:
  - `windowOpen`
  - `blockUpdate`
  - domain-specific packet/event

---

### `bot.updateSign(block, text, back = false): void`

#### Signature source
- `index.d.ts` declares `updateSign: (block: Block, text: string, back?: boolean) => void`.

#### Runtime Path
1. Splits `text` by newline.
2. Guardrails:
   - if >4 lines: emits `error` event and returns.
   - if any line >45 chars: emits `error` event and returns.
3. Payload encoding:
   - uses JSON-stringified line format when `sendStringifiedSignText` feature is active
   - otherwise uses raw string fields
4. Sends `update_sign` packet with:
   - `location`
   - `isFrontText: !back`
   - `text1..text4`

#### Preconditions
- Target block should be a sign-like block from world state.
- Caller must enforce line constraints.

#### Postconditions
- Packet sent, no return value.

#### Event/feedback model
- Error reporting is event-based (`bot.emit('error', ...)`) rather than throw/reject.
- Updated sign text becomes observable through subsequent world/tile updates.

#### Assistant usage rule
- Always attach `error` listener and map:
  - too many lines → `SIGN_TOO_MANY_LINES`
  - line too long → `SIGN_LINE_TOO_LONG`
- For validation, re-read sign block after short delay and compare normalized text.

## Known API/Runtime Drift Register (Relevant to Assistant)
1. `docs/api.md` describes `'raycast'` partially under `forceLook` wording; runtime treats `'raycast'` as `digFace` mode.
2. Runtime emits `entityPlaced`, but type/docs do not surface it.
3. `activateBlock` returns `Promise<void>` but runtime does not await server-side completion acknowledgement.
4. `updateSign` constraint failures emit `error` events instead of throwing.

## AI Coding Assistant Integration Pattern

### Recommended Runtime Path
1. Resolve target blocks/entities from current world snapshot.
2. Run preconditions (`canDigBlock`, held item checks, vector validity).
3. Execute action in single-flight mode.
4. Wait for domain Evidence (`diggingCompleted`, `blockPlaced`, entity observed, sign readback).
5. If no Evidence, classify failure by Reason Code and take bounded retry or alternate action.

### Recommended Fallback Path
- `dig` visibility failure:
  - reposition/rotate → retry once with `digFace: 'raycast'`
- placement timeout:
  - verify held item + dest occupancy + chunk loaded → retry with backoff
- sign validation mismatch:
  - re-read block entity once, then surface deterministic failure

### Minimal orchestration pseudocode
```ts
async function safeDig(bot: Bot, block: Block): Promise<ActionResult> {
  if (!block) return { ok: false, actionId: 'dig-1', reasonCode: 'DIG_BLOCK_UNDEFINED', reasonCategory: 'precondition' }
  if (!bot.canDigBlock(block)) return { ok: false, actionId: 'dig-1', reasonCode: 'DIG_BLOCK_NOT_IN_VIEW', reasonCategory: 'visibility' }
  try {
    await bot.dig(block, true, 'raycast')
    return { ok: true, actionId: 'dig-1' }
  } catch (error) {
    return { ok: false, actionId: 'dig-1', reasonCode: 'DIG_ABORTED', reasonCategory: 'server-state', detail: String(error) }
  }
}
```

## Acceptance Criteria
- Every target API has:
  - Signature
  - Runtime Path
  - Preconditions
  - Postconditions
  - Event/feedback behavior
  - Fallback mapping with Reason Code guidance
- Behavior statements are traceable to upstream implementation Evidence.

## Validation Criteria
- All API-specific claims can be traced to listed source files.
- Assistant integration logic can classify failures deterministically without free-form parsing.
- The Specification remains scoped to the original latest Mineflayer clone only.

## Cross-Document References
- `docs/spec/mineflayer/mineflayer-typescript-api-reference.md`
- `docs/spec/mineflayer/mineflayer-typescript-runtime-spec.md`
- `docs/spec/mineflayer/mineflayer-typescript-tutorial-deep-dive.md`
- `docs/spec/mineflayer/mineflayer-research-analysis.md`
