# Mineflayer TypeScript Tutorial Deep Dive (Source-Backed)

## Status Snapshot
- Date: 2026-02-17
- Mineflayer baseline path: `/Users/user/git/gigio1023/mineflayer`
- Mineflayer package version: `4.35.0` (`package.json`)
- Primary Intent: expand official tutorial guidance into a TypeScript-first, source-backed operational guide
- Scope guard: this document only uses the latest original Mineflayer clone above
- Explicit exclusion: `/Users/user/git/gigio1023/minecraft-llm-agent-community` is not considered

## Intent
- Convert official tutorial flow (`docs/tutorial.md`) into a TypeScript implementation guide that is defensible against runtime source behavior.
- Provide a practical Runtime Path for reliable bot development with strict async sequencing, event safety, and plugin isolation.

## Scope
- In Scope:
  - Official docs (`docs/tutorial.md`, `docs/api.md`, `docs/FAQ.md`, `docs/unstable_api.md`)
  - Runtime code (`lib/loader.js`, `lib/plugin_loader.js`, `lib/plugins/*`)
  - Public type definitions (`index.d.ts`)
  - Operational examples/tests (`examples/*`, `test/externalTests/*`)
- Out of Scope:
  - Legacy or third-party fork behavior
  - Non-TypeScript language wrappers

## Source Evidence Baseline
| Area | Source Evidence |
|---|---|
| Tutorial baseline | `/Users/user/git/gigio1023/mineflayer/docs/tutorial.md` |
| API behavior | `/Users/user/git/gigio1023/mineflayer/docs/api.md` |
| Runtime boot and defaults | `/Users/user/git/gigio1023/mineflayer/lib/loader.js` |
| Plugin injection and dedupe | `/Users/user/git/gigio1023/mineflayer/lib/plugin_loader.js` |
| Chat parsing internals | `/Users/user/git/gigio1023/mineflayer/lib/plugins/chat.js` |
| Spawn/respawn behavior | `/Users/user/git/gigio1023/mineflayer/lib/plugins/health.js` |
| Async tick wait behavior | `/Users/user/git/gigio1023/mineflayer/lib/plugins/physics.js` |
| Crafting async internals | `/Users/user/git/gigio1023/mineflayer/lib/plugins/craft.js` |
| TypeScript API types | `/Users/user/git/gigio1023/mineflayer/index.d.ts` |
| Version support gate | `/Users/user/git/gigio1023/mineflayer/lib/version.js` |
| Reference examples | `/Users/user/git/gigio1023/mineflayer/examples/*` |
| Behavior tests | `/Users/user/git/gigio1023/mineflayer/test/externalTests/*` |

## Official Tutorial Coverage Map (TypeScript Adaptation)
| Official Tutorial Section | TypeScript Expansion | Runtime Path Evidence |
|---|---|---|
| Installing Node | Use `Node >= 22` baseline for conformance with current package engines | `package.json`, `index.js` |
| NPM basics | Project scaffold with `tsconfig.json`, strict mode, compile scripts | `package.json`, `index.d.ts` |
| Creating a bot | `createBot` overload usage and typed `BotOptions` | `index.d.ts`, `lib/loader.js` |
| Logging in | Offline / account / session options and secure config handling | `docs/api.md`, `examples/session.js` |
| Passing functions | Typed event handlers and named listener cleanup | `index.d.ts`, `docs/tutorial.md` |
| Listening for events | Core lifecycle event ordering and race-safe registration | `lib/loader.js`, `lib/plugins/game.js`, `lib/plugins/health.js` |
| Promises | Sequential `await` policy for action APIs | `docs/tutorial.md`, `lib/plugins/craft.js`, `index.d.ts` |
| Correct/incorrect craft | Sequential `await bot.craft(...)` with explicit preconditions | `lib/plugins/craft.js`, `test/externalTests/crafting.js` |
| Chat custom events | `addChatPattern` / `addChatPatternSet` payload shape in TS | `lib/plugins/chat.js`, `test/externalTests/chat.js` |
| Custom chat parsing | Regex parse mode and dynamic event typing strategy | `examples/chat_parsing.js`, `index.d.ts` |
| FAQ operations | Timeout tuning, reconnection loops, custom server chat handling | `docs/FAQ.md`, `examples/reconnector.js` |

## 1) Toolchain Specification (TypeScript)

### 1.1 Runtime baseline
- Recommended: Node `>=22` for clean conformance with current Mineflayer package engines.
- `package.json` enforces `engines.node: ">=22"`.
- `index.js` currently hard-fails only when Node major `<18` but error text requests `>=22`; use `>=22` to avoid ambiguity.

### 1.2 Package scaffold
```bash
mkdir mf-ts-bot && cd mf-ts-bot
npm init -y
npm i mineflayer
npm i -D typescript tsx @types/node
npx tsc --init
```

### 1.3 `tsconfig.json` baseline
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
```

### 1.4 Runtime scripts
```json
{
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  }
}
```

## 2) Minimal Typed Bot (Official Tutorial → TypeScript)

### 2.1 Minimal creation
```ts
import mineflayer, { type Bot, type BotOptions } from 'mineflayer'

const options: BotOptions = {
  host: process.env.MC_HOST ?? '127.0.0.1',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.MC_USERNAME ?? 'Player',
  auth: (process.env.MC_AUTH as BotOptions['auth']) ?? 'offline'
}

const bot: Bot = mineflayer.createBot(options)
```

### 2.2 Default behavior from runtime source
`lib/loader.js` sets defaults if options are missing:
- `username = 'Player'`
- `version = false` (auto negotiate)
- `plugins = {}`
- `hideErrors = false`
- `logErrors = true`
- `loadInternalPlugins = true`
- `brand = 'vanilla'`
- `respawn = true`

### 2.3 Lifecycle Runtime Path
Observed event and setup flow from source:
1. `createBot()` allocates `EventEmitter` bot.
2. Plugin loader attaches `loadPlugin/loadPlugins/hasPlugin`.
3. Mineflayer picks internal + external plugins and queues injection.
4. Protocol client connects (`minecraft-protocol`).
5. `connect` / `error` / `end` get re-emitted by bot.
6. Version registry loaded and gated.
7. `inject_allowed` emitted.
8. Plugins inject.
9. `login`, `game`, then `spawn` (from health update) arrive.

Register listeners before gameplay actions:
```ts
bot.once('spawn', () => {
  bot.chat('ready')
})
bot.on('error', (err) => console.error('[bot:error]', err))
bot.on('end', (reason) => console.warn('[bot:end]', reason))
```

## 3) Configuration Schema and Input Safety

### 3.1 TypeScript configuration `Schema`
```ts
type BotConfig = {
  host: string
  port: number
  username: string
  password?: string
  auth?: 'offline' | 'mojang' | 'microsoft'
  version?: string | false
}
```

### 3.2 Command-line adaptation (tutorial parity)
```ts
const [host, port, username, password] = process.argv.slice(2)
const cfg: BotConfig = {
  host: host ?? '127.0.0.1',
  port: Number(port ?? 25565),
  username: username ?? 'Player',
  ...(password ? { password } : {})
}
```

### 3.3 Security baseline
- Do not hardcode credentials in source.
- Prefer environment variables or secure secret injection.
- For Microsoft auth, avoid plain password flow when possible.

## 4) Event Model in TypeScript

### 4.1 Core typed events
`index.d.ts` defines `BotEvents` with rich payload types:
- `chat`, `whisper`, `message`, `messagestr`
- `login`, `spawn`, `respawn`, `game`, `death`
- `entity*`, `blockUpdate`, `physicsTick`, etc.

Example:
```ts
bot.on('chat', (username, message) => {
  if (username === bot.username) return
  bot.chat(`echo:${message}`)
})
```

### 4.2 Listener lifecycle
- Use `once` for single-fire startup logic.
- Keep references to named handlers for `removeListener` / `off`.
- Avoid anonymous handler removal gaps in long-running processes.

### 4.3 Spawn and respawn semantics
From `lib/plugins/health.js`:
- `respawn` event emits on respawn packet.
- `spawn` emits after health transitions to alive (initial and post-death).
- Auto-respawn occurs when `options.respawn !== false`.

## 5) Chat Pattern System (Deep Detail)

### 5.1 API forms
- Deprecated: `bot.chatAddPattern(pattern, chatType, description)`
- Current:
  - `bot.addChatPattern(name, pattern, options?)`
  - `bot.addChatPatternSet(name, patterns, options?)`
  - `bot.removeChatPattern(nameOrId)`
  - `bot.awaitMessage(...)`

### 5.2 Event emission behavior
From `lib/plugins/chat.js`:
- Standard event name: `chat:<name>`
- `repeat` defaults `true`
- `parse` defaults `false`
- `parse: true` returns capture groups per regex, not raw messages
- Pattern set tracks ordered multi-message progression before emit

### 5.3 Type-safe wrapper for dynamic `chat:<name>` events
`index.d.ts` cannot predeclare arbitrary `chat:<name>` event keys. Use a typed adapter:
```ts
function onChatPattern<T>(
  bot: mineflayer.Bot,
  name: string,
  handler: (payload: T) => void
): void {
  bot.on(`chat:${name}` as never, handler as never)
}
```

### 5.4 Practical pattern examples
```ts
bot.addChatPattern('hello', /<(.+)> (?:hello|Hello)/, { parse: true })
onChatPattern<string[][]>(bot, 'hello', ([[sender]]) => {
  bot.chat(`Hi ${sender}`)
})
```

For multi-step chat flows:
```ts
bot.addChatPatternSet('rejoin', [/left the game/, /joined the game/], { repeat: true })
```

### 5.5 Drift note (tutorial vs runtime)
- Official tutorial text still describes an older positional description style in parts.
- Runtime source uses `options` object as third argument for `addChatPattern`.
- Follow `docs/api.md` + `lib/plugins/chat.js` as authority.

## 6) Promise and Async Specification

### 6.1 Promise-heavy action surface
`index.d.ts` marks many actions as `Promise`:
- `consume`, `fish`, `sleep`, `wake`
- `equip`, `craft`, `dig`, `placeBlock`
- `openContainer/openChest/openFurnace/openVillager`
- `waitForChunksToLoad`, `waitForTicks`

### 6.2 Sequential execution rule
- Never start dependent actions in parallel without explicit dependency control.
- Official craft example is valid only with `await` sequencing.
- `lib/plugins/craft.js` loops with `await craftOnce(...)`, confirming sequential model.

### 6.3 Timeout safety pattern
```ts
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout:${ms}`)), ms))
  ])
}
```

### 6.4 Tick synchronization
`bot.waitForTicks(ticks)` (`physics.js`):
- waits on `physicsTick`
- has built-in timeout (`ticks * 50 + 5000`)
- rejects on timeout

Use when chaining orientation + action steps:
```ts
await bot.lookAt(target.position, true)
await bot.waitForTicks(5)
bot.attack(target)
```

## 7) Plugin Architecture in TypeScript

### 7.1 Internal vs external plugins
From `lib/loader.js`:
- Internal plugin list is bundled under `lib/plugins/*`.
- `options.plugins` can disable internal keys (`false`) or override with function.
- `loadInternalPlugins` gates default loading globally.

### 7.2 Injection gate
From `lib/plugin_loader.js`:
- plugins queue before `inject_allowed`
- they inject only after runtime registry/version setup
- duplicate plugin functions are deduped by function identity

### 7.3 TypeScript plugin pattern
```ts
import type { Bot, BotOptions, Plugin } from 'mineflayer'

export const npcPlugin: Plugin = (bot: Bot, _options: BotOptions) => {
  ;(bot as Bot & { npc: { ping: () => void } }).npc = {
    ping: () => bot.chat('npc:ok')
  }
}
```

### 7.4 Declaration merging for plugin API
Create `src/types/mineflayer-augment.d.ts`:
```ts
import 'mineflayer'

declare module 'mineflayer' {
  interface Bot {
    npc: {
      ping(): void
    }
  }
}
```

## 8) Reconnection and Multi-Bot Patterns

### 8.1 Reconnect loop
`examples/reconnector.js` shows direct recursion on `end`. Improve with jitter/backoff:
```ts
function reconnect(delayMs: number) {
  setTimeout(() => startBot(), delayMs)
}
```

### 8.2 Multi-bot bootstrap
`examples/multiple.js` and `examples/multiple_from_file.js` show staggered startup.
Recommended:
- stagger joins to avoid burst authentication failure
- isolate per-bot state object
- route each bot through independent error boundary

### 8.3 Per-bot Runtime Path isolation
- Do not share mutable live gameplay state across bots.
- Share only immutable config or explicit coordination messages.

## 9) FAQ-Driven TypeScript Operations

### 9.1 Custom server chat does not emit expected events
- Parse `messagestr` directly or use custom regex patterns.
- Reference: `docs/FAQ.md` + `examples/chat_parsing.js`.

### 9.2 Lag disconnect handling
- Increase `checkTimeoutInterval` via protocol options.
- Combine with reconnect policy.

### 9.3 Error logging control
- `hideErrors` and `logErrors` behavior comes from `lib/loader.js`.
- Add explicit listeners for `error`, `kicked`, and `end`.

### 9.4 Android/Termux runtime
- Official tutorial FAQ supports Termux + Node setup.
- TypeScript runtime remains the same once Node is available.

## 10) Conformance Gaps and Drift Register

### 10.1 Node version messaging drift
- `docs/README.md` still says install Node `>=18`.
- `package.json` now requires `>=22`.
- `index.js` guard condition checks `<18` but error text asks for `>=22`.
- Operational recommendation: standardize your bots on Node `>=22`.

### 10.2 Tutorial TOC drift
- Tutorial TOC includes `Asynchronousy` entry without matching section body.

### 10.3 Chat pattern API evolution
- Legacy `chatAddPattern` style remains for backward compatibility.
- New code should use `addChatPattern` / `addChatPatternSet` only.

### 10.4 Plugin options type mismatch in examples
- Some examples show array-like plugin input style.
- Current `index.d.ts` models plugin options as object map.
- Prefer object map or `bot.loadPlugin(...)` to keep TypeScript strict.

## 11) Recommended TypeScript Runtime Blueprint

### 11.1 Project structure
```txt
src/
  main.ts
  config.ts
  runtime/
    lifecycle.ts
    chat.ts
    actions.ts
  plugins/
    npc.ts
  types/
    mineflayer-augment.d.ts
```

### 11.2 Runtime Path / Fallback Path split
- Runtime Path:
  - connect → inject → spawn → event ingest → action execution
- Fallback Path:
  - per-action timeout/rejection handling
  - emit structured Reason Code / Reason Category
  - continue loop without process crash

### 11.3 Minimal failure envelope `Schema`
```ts
type ActionFailure = {
  reasonCode: string
  reasonCategory: 'connection' | 'precondition' | 'timeout' | 'server' | 'unknown'
  detail?: string
}
```

## Acceptance Criteria
- All official tutorial functional sections have TypeScript equivalents and source anchors.
- Lifecycle, chat parsing, async sequencing, and plugin behavior are documented with runtime evidence.
- Node/tooling baseline and known drift risks are explicit.

## Validation Criteria
- `tsc --noEmit` passes for provided snippets in a strict TypeScript project.
- Bot bootstrap flow validates: `connect`, `login`, `spawn`, `end` handlers fire as expected.
- Chat pattern flows validate against `examples/chat_parsing.js` behavior.
- Sequential craft flow follows `await`-based pattern and no dependent race is introduced.

## Cross-Document References
- Runtime spec: `docs/spec/mineflayer/mineflayer-typescript-runtime-spec.md`
- Implementation guide: `docs/spec/mineflayer/mineflayer-typescript-implementation-guide.md`
- API reference: `docs/spec/mineflayer/mineflayer-typescript-api-reference.md`
- Research baseline: `docs/spec/mineflayer/mineflayer-research-analysis.md`
