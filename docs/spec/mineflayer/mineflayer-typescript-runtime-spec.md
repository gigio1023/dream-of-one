# Mineflayer TypeScript Runtime Specification

## Status Snapshot
- Date: 2026-02-17
- Runtime target: `mineflayer@4.35.0`
- Source baseline: `/Users/user/git/gigio1023/mineflayer` @ `89686596c8de1091bf45104ba3230a5e87707a20`
- Scope boundary: this Specification is based only on the latest original Mineflayer repository.
- Explicit exclusion: `/Users/user/git/gigio1023/minecraft-llm-agent-community` is not considered.

## Intent
- Define a production-grade Specification for using Mineflayer from TypeScript.
- Provide source-backed rules for Runtime Path behavior, plugin composition, event handling, action safety, and scale-out operations.

## Scope
- In Scope:
  - TypeScript project/toolchain profiles for Mineflayer.
  - `createBot` option semantics, lifecycle, plugin model, event model, and action model.
  - Runtime safety and operational constraints for AI-driven NPC orchestration.
  - Conformance gaps between docs, runtime, and TypeScript definitions.
- Out of Scope:
  - Editing Mineflayer upstream source.
  - Non-TypeScript language bindings.
  - Full gameplay design for Dream of One.

## Source Evidence
- GitHub Pages docs shell and nav:
  - `mineflayer/docs/index.html`
  - `mineflayer/docs/_sidebar.md`
- Public docs:
  - `mineflayer/docs/README.md`
  - `mineflayer/docs/tutorial.md`
  - `mineflayer/docs/api.md`
  - `mineflayer/docs/unstable_api.md`
- Runtime source:
  - `mineflayer/index.js`
  - `mineflayer/lib/loader.js`
  - `mineflayer/lib/plugin_loader.js`
  - `mineflayer/lib/version.js`
  - `mineflayer/lib/plugins/*.js`
- Types:
  - `mineflayer/index.d.ts`
  - `mineflayer/tsconfig.json`
- Ops/test:
  - `mineflayer/package.json`
  - `mineflayer/.github/workflows/ci.yml`
  - `mineflayer/test/internalTest.js`
  - `mineflayer/test/externalTest.js`

## Toolchain Specification

### Runtime Baseline
- Node.js runtime baseline: `>=22` (`package.json` engines).
- CI baseline: Node 22 (`.github/workflows/ci.yml`).
- Java runtime required when executing Mineflayer external test matrix.

### TypeScript Baseline
- Mineflayer publishes definitions via `"types": "index.d.ts"` (`package.json`).
- Upstream Mineflayer type-checks `index.d.ts` with CommonJS module mode (`mineflayer/tsconfig.json`).

### TypeScript Module Profile A (Recommended for most apps)
`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

### TypeScript Module Profile B (CommonJS app runtime)
`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "types": ["node"]
  }
}
```

### Import Specification
- Preferred typed import:
```ts
import { createBot, type Bot, type BotOptions, type Plugin } from 'mineflayer'
```
- CommonJS fallback:
```ts
const mineflayer = require('mineflayer')
```

## Bot Creation Specification

### `createBot` Core Defaults (runtime source authority)
From `lib/loader.js`, default behavior is:
- `username = 'Player'`
- `version = false` (auto detect via server ping/protocol)
- `plugins = {}`
- `hideErrors = false`
- `logErrors = true`
- `loadInternalPlugins = true`
- `client = null` (create internal protocol client when null)
- `brand = 'vanilla'`
- `respawn = true`
- `validateChannelProtocol = false` (forced by loader before client creation)

### Notable Option Semantics
- `plugins` supports:
  - `false` => disable internal plugin by key
  - `true` => force-enable internal plugin by key even when `loadInternalPlugins=false`
  - `function` => external plugin injection function
- `client` option allows attaching Mineflayer to an externally created `minecraft-protocol` client.
- `physicsEnabled` option is consumed by physics plugin; default runtime behavior is effectively enabled.
- `chatLengthLimit` defaults dynamically in chat plugin based on protocol feature support.

### Version Gate Specification
- After protocol connect allowance, Mineflayer loads registry for negotiated server version.
- Runtime throws when server version is outside `[oldestSupportedVersion, latestSupportedVersion]` with compatibility checks from `lib/version.js`.

## Plugin System Specification

### Injection Lifecycle
- Plugin management functions are attached before connection:
  - `bot.loadPlugin(plugin)`
  - `bot.loadPlugins(plugin[])`
  - `bot.hasPlugin(plugin)`
- Actual injection runs when `inject_allowed` fires.
- If plugin is loaded after this point, injection occurs immediately.

### Plugin Identity and Dedupe
- Dedupe is identity-based (same function reference is considered already loaded).
- No plugin unload API exists; plugin lifecycle is additive for bot lifetime.

### Internal Plugin Authority
- Internal runtime capability is primarily distributed across plugins:
  - World/chunks: `blocks`
  - Entity/player state: `entities`
  - Motion controls and physics loop: `physics`
  - Text/chat patterns: `chat`
  - Inventory/windows/actions: `inventory`, `simple_inventory`, `creative`, `craft`
  - Dig/place/interact: `digging`, `generic_place`, `place_block`, `place_entity`, `block_actions`

### Plugin Authoring Rules
- Plugin signature:
```ts
type Plugin = (bot: Bot, options: BotOptions) => void
```
- Plugins SHOULD namespace extension APIs under a bot sub-object to avoid collisions.
- Plugins MUST avoid assuming order-dependent side effects from other plugins during inject.

## Event Model Specification

### Event Taxonomy
- Lifecycle:
  - `inject_allowed`, `login`, `spawn`, `respawn`, `end`, `kicked`, `error`
- Social/Text:
  - `message`, `messagestr`, `chat`, `whisper`, `actionBar`, `chat:<patternName>`
- Simulation:
  - `entitySpawn`, `entityMoved`, `entityUpdate`, `entityGone`
  - `blockUpdate`, `chunkColumnLoad`, `chunkColumnUnload`
  - `physicsTick`, `move`, `forcedMove`
- Systems:
  - `health`, `breath`, `time`, `rain`, `weatherUpdate`
  - `windowOpen`, `windowClose`
  - scoreboard/team/bossbar events

### Event Consumption Rules
- Game logic SHOULD begin from `spawn` (not `login`) because registry/world/player synchronization is more complete at `spawn`.
- Latency-sensitive actions SHOULD handle `forcedMove` (teleports/server corrections) as interrupt conditions.
- Chat parsing for custom server formats SHOULD use `messagestr` + explicit parser patterns.

## Action Model Specification

### Action Families
- Movement/control: `setControlState`, `look`, `lookAt`, `waitForTicks`
- World interaction: `dig`, `placeBlock`, `activateBlock`, `updateSign`
- Entity interaction: `attack`, `activateEntity`, `mount`, `dismount`
- Inventory/windows: `equip`, `toss`, `clickWindow`, `openContainer`, `craft`, `trade`
- Session ops: `quit`, `end`, `respawn`

### Preconditions and Failure Model
- Many action APIs are Promise-based and reject on timeout, invalid state, or server rejection.
- `dig` is single-target; concurrent dig attempts must be serialized or aborted explicitly.
- `waitForTicks` uses physics tick and includes timeout safeguards.
- Creative mode APIs are mode-sensitive and may reject if server packet behavior differs.

## Unstable API Specification
- `bot._client` is available but documented as unstable (`docs/unstable_api.md`).
- Direct packet reads/writes through `_client` SHOULD be isolated behind a narrow adapter layer.
- Runtime upgrades MUST assume unstable API behavior can change between Mineflayer releases.

## Conformance Gaps (Current Upstream Snapshot)
- Node version guidance drift:
  - Runtime/package/CI target Node 22.
  - `docs/README.md` install text still references Node 18.
  - `index.js` guard logic checks `<18` while message asks to upgrade to `>=22`.
- Event typing drift:
  - Runtime/docs expose `title_times` and `title_clear`.
  - `index.d.ts` does not currently declare those event names.
- Event declaration drift:
  - `index.d.ts` includes `unmatchedMessage`, but runtime emit for this event is not present in current source.
- Options typing drift:
  - `storageBuilder` behavior exists in runtime docs/source path but is not explicit in `BotOptions` type.

## TypeScript Augmentation Specification

### Bot Extension Augmentation
Use declaration merging for plugin-added bot surface:
```ts
declare module 'mineflayer' {
  interface Bot {
    npcRuntime?: {
      actorId: string
      stop: () => Promise<void>
    }
  }
}
```

### Internal Type Safety Rules
- Avoid `any` in application-level bot orchestration code.
- Normalize inbound Mineflayer events to explicit local `Schema` before backend transport.
- Encapsulate runtime-specific entity/block types at adapter boundary.

## Runtime Safety Specification for AI-Native NPC Orchestration

### Authority Split
- Mineflayer SHOULD remain execution substrate.
- Decision authority SHOULD remain backend-side, with policy and `Schema` validation before action.

### Deterministic Guardrails
- Map all model outcomes into bounded action vocabulary.
- Enforce deterministic `Fallback Path` on:
  - timeout
  - parse failure
  - policy rejection
  - unsupported action
- Emit explicit `Reason Code` and `Reason Category` for each fallback decision.

### Concurrency Guardrails
- Use per-actor `Single-flight` for decision lane.
- Use process-level `Global Cap` for total concurrent decision requests.
- Block repeated incompatible actions for same bot until prior action completion or cancellation.

## Multi-Bot Operational Specification
- One Mineflayer bot instance per NPC actor session.
- Required manager responsibilities:
  - bot lifecycle (start/reconnect/stop)
  - per-bot health status
  - mailbox/decision queue
  - action serialization
  - telemetry export
- Reconnect loops SHOULD use bounded backoff and circuit-breaker behavior.

## Acceptance Criteria
- TypeScript compile Strict mode passes for bot runtime package.
- Bot session can connect, spawn, react to at least one chat event, and execute one action in a typed path.
- Plugin extension points compile with declaration-merged types.
- Runtime emits structured telemetry with action result and fallback metadata.
- Multi-bot manager can run at least N bots concurrently with bounded queueing and no uncontrolled promise growth.

## Validation Criteria
- Unit checks:
  - adapter normalization and validation
  - fallback mapping
  - action allow-list enforcement
- Integration checks:
  - local server connect/spawn/chat/action smoke
  - reconnect scenario
  - forcedMove interruption behavior
- Load checks:
  - increasing bot count with `Global Cap` respected
  - no event-listener leak under repeated reconnect cycles

## Recommended Next Step
- Implement the runtime adapter from this Specification using the companion document:
  - `docs/spec/mineflayer/mineflayer-typescript-implementation-guide.md`
