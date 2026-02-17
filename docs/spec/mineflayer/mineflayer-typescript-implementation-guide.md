# Mineflayer TypeScript Implementation Guide

## Intent
- Provide a detailed, implementation-ready guide for building Mineflayer bots in TypeScript.
- Align directly with Mineflayer upstream docs + source behavior, and with the Runtime Specification:
  - `docs/spec/mineflayer/mineflayer-typescript-runtime-spec.md`

## Scope
- This guide covers:
  - project bootstrap
  - strict TypeScript setup
  - typed bot lifecycle
  - plugin authoring with type augmentation
  - multi-bot manager pattern
  - backend decision adapter with deterministic fallback
- This guide does not modify Mineflayer upstream source.

## 1) Project Bootstrap (TypeScript)

### 1.1 Create project and install dependencies
```bash
mkdir mineflayer-ts-app
cd mineflayer-ts-app
npm init -y
npm install mineflayer vec3 zod
npm install -D typescript tsx @types/node
```

### 1.2 `tsconfig.json` (strict)
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
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

### 1.3 Package scripts
```json
{
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  }
}
```

## 2) Minimal Typed Bot (Production Baseline)

### 2.1 `src/main.ts`
```ts
import { createBot, type Bot, type BotOptions } from 'mineflayer'

const options: BotOptions = {
  host: process.env.MC_HOST ?? '127.0.0.1',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.MC_USERNAME ?? 'ts-bot',
  auth: (process.env.MC_AUTH as 'offline' | 'microsoft' | undefined) ?? 'offline',
  logErrors: true,
  hideErrors: false,
  respawn: true
}

const bot: Bot = createBot(options)

bot.once('spawn', () => {
  bot.chat('[ts] online')
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  if (message === 'ping') bot.chat('pong')
})

bot.on('kicked', (reason, loggedIn) => {
  console.error('kicked', { reason, loggedIn })
})

bot.on('end', (reason) => {
  console.error('end', { reason })
})

bot.on('error', (err) => {
  console.error('error', err)
})
```

### 2.2 Why this baseline
- Uses typed `BotOptions`.
- Starts logic from `spawn` (not `login`).
- Handles disconnect and error events explicitly.
- Uses minimal behavior that is robust across server variants.

## 3) Typed Runtime Configuration Layer

### 3.1 `src/config.ts`
```ts
import { z } from 'zod'

const envSchema = z.object({
  MC_HOST: z.string().default('127.0.0.1'),
  MC_PORT: z.coerce.number().int().positive().default(25565),
  MC_USERNAME: z.string().min(1).default('ts-bot'),
  MC_AUTH: z.enum(['offline', 'microsoft']).default('offline')
})

export type RuntimeConfig = z.infer<typeof envSchema>

export const runtimeConfig: RuntimeConfig = envSchema.parse(process.env)
```

### 3.2 Guidance
- Parse env once at process start.
- Fail fast on invalid config.
- Keep BotOptions assembly deterministic.

## 4) Event Ingestion and Normalization

### 4.1 Define normalized perception `Schema`
```ts
import { z } from 'zod'

export const perceptionSchema = z.object({
  sessionId: z.string(),
  npcId: z.string(),
  eventType: z.string(),
  ts: z.number(),
  payload: z.record(z.unknown())
})

export type PerceptionPacket = z.infer<typeof perceptionSchema>
```

### 4.2 Normalize Mineflayer events
```ts
import type { Bot } from 'mineflayer'

export function bindPerception(bot: Bot, sessionId: string, npcId: string, emit: (p: PerceptionPacket) => void) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    emit(perceptionSchema.parse({
      sessionId,
      npcId,
      eventType: 'chat',
      ts: Date.now(),
      payload: { username, message }
    }))
  })

  bot.on('entityMoved', (entity) => {
    emit(perceptionSchema.parse({
      sessionId,
      npcId,
      eventType: 'entityMoved',
      ts: Date.now(),
      payload: {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        x: entity.position.x,
        y: entity.position.y,
        z: entity.position.z
      }
    }))
  })
}
```

### 4.3 Guidance
- Normalize at adapter boundary.
- Never pass raw runtime objects directly into external decision lanes.
- Keep payload shape stable and versioned.

## 5) Decision Adapter and Deterministic Fallback

### 5.1 Decision envelope `Schema`
```ts
import { z } from 'zod'

export const decisionEnvelopeSchema = z.object({
  action: z.enum([
    'say',
    'look_at_nearest_player',
    'hold_position'
  ]),
  args: z.record(z.unknown()).default({}),
  meta: z.object({
    reasonCode: z.string().optional(),
    reasonCategory: z.string().optional()
  }).default({})
})

export type DecisionEnvelope = z.infer<typeof decisionEnvelopeSchema>
```

### 5.2 Safe execution
```ts
import type { Bot } from 'mineflayer'

const FALLBACK: DecisionEnvelope = {
  action: 'hold_position',
  args: {},
  meta: { reasonCode: 'PROC_RC_FALLBACK', reasonCategory: 'policy' }
}

export async function executeDecision(bot: Bot, envelopeInput: unknown): Promise<void> {
  const parsed = decisionEnvelopeSchema.safeParse(envelopeInput)
  const envelope = parsed.success ? parsed.data : FALLBACK

  switch (envelope.action) {
    case 'say': {
      const text = typeof envelope.args.text === 'string' ? envelope.args.text : '[fallback]'
      bot.chat(text.slice(0, 200))
      return
    }
    case 'look_at_nearest_player': {
      const nearest = bot.nearestEntity((e) => e.type === 'player')
      if (!nearest) return
      await bot.lookAt(nearest.position.offset(0, 1.6, 0), false)
      return
    }
    case 'hold_position':
    default:
      bot.clearControlStates()
  }
}
```

### 5.3 Guidance
- Always validate external decision payloads.
- Keep bounded action vocabulary.
- Provide deterministic fallback for every invalid/timeout lane.

## 6) Plugin Authoring with Type Augmentation

### 6.1 Declare extension API (`src/types/mineflayer-augment.d.ts`)
```ts
import 'mineflayer'

declare module 'mineflayer' {
  interface Bot {
    npc?: {
      sayOnce: (text: string) => void
    }
  }
}
```

### 6.2 Plugin implementation (`src/plugins/npcPlugin.ts`)
```ts
import type { Plugin } from 'mineflayer'

export const npcPlugin: Plugin = (bot) => {
  bot.npc = {
    sayOnce: (text: string) => bot.chat(text)
  }
}
```

### 6.3 Load plugin
```ts
import { createBot } from 'mineflayer'
import { npcPlugin } from './plugins/npcPlugin'

const bot = createBot({ host: '127.0.0.1', username: 'plugin-bot' })
bot.loadPlugin(npcPlugin)
```

### 6.4 Guidance
- Namespace plugin API (`bot.npc` style).
- Avoid side effects during inject that assume other plugin order.
- Keep plugin public surface typed via module augmentation.

## 7) Multi-Bot Manager Pattern

### 7.1 Manager skeleton
```ts
import { createBot, type Bot, type BotOptions } from 'mineflayer'

type BotId = string

export class BotManager {
  private readonly bots = new Map<BotId, Bot>()

  start(botId: BotId, options: BotOptions): Bot {
    if (this.bots.has(botId)) return this.bots.get(botId)!

    const bot = createBot(options)
    this.bots.set(botId, bot)

    bot.on('end', () => {
      this.bots.delete(botId)
    })
    bot.on('error', (err) => {
      console.error('bot-error', { botId, err })
    })

    return bot
  }

  get(botId: BotId): Bot | undefined {
    return this.bots.get(botId)
  }

  async stop(botId: BotId): Promise<void> {
    const bot = this.bots.get(botId)
    if (!bot) return
    bot.quit('manager-stop')
    this.bots.delete(botId)
  }
}
```

### 7.2 Guidance
- Keep one runtime owner for bot lifecycle.
- Add queueing and single-flight controls per bot for action/decision lanes.
- Add bounded reconnect policy rather than infinite immediate loops.

## 8) Chat Pattern Usage in TypeScript

### 8.1 Pattern registration
```ts
bot.addChatPattern('cmd_ping', /^!ping$/i)
bot.on('chat:cmd_ping', () => {
  bot.chat('pong')
})
```

### 8.2 Multi-step pattern set
```ts
bot.addChatPatternSet('registration_flow', [
  /^Enter email: (.+)$/i,
  /^Enter code: (.+)$/i
], { repeat: true, parse: true })

bot.on('chat:registration_flow', (matches) => {
  // parse=true => capture groups
  // matches shape comes from regex capture arrays
  console.log(matches)
})
```

### 8.3 Guidance
- Prefer `addChatPattern` / `addChatPatternSet` over deprecated `chatAddPattern`.
- Use explicit regex anchors for command-style parsing.
- Add timeout/cancel logic for multi-step sequences.

## 9) Known Type and Doc Drift to Account For
- Node baseline text drift in upstream docs vs runtime/package constraints.
- `title_times` and `title_clear` runtime events are documented and emitted, but not present in current `index.d.ts`.
- `unmatchedMessage` exists in `index.d.ts`, but current runtime does not emit it.
- `storageBuilder` is described in API/runtime path but not explicit in `BotOptions` type.

### 9.1 Practical mitigation
- Treat runtime source + current `index.d.ts` as dual authority, then patch app-side typings locally when needed.
- Keep a local compatibility layer for event names and bot extension APIs.

## 10) Validation Checklist

### Acceptance Criteria
- `npm run build` passes under strict TS settings.
- Bot connects and handles `spawn`, `chat`, `end`, `error` reliably.
- Decision adapter rejects invalid payloads and triggers deterministic fallback.
- Plugin augmentation compiles and runs without `any`.
- Multi-bot manager can start/stop multiple bots with clean teardown.

### Validation Criteria
- Local smoke:
  - connect -> spawn -> chat reply
- Failure checks:
  - simulated invalid decision envelope
  - reconnect after forced disconnect
- Load check:
  - start N bots and verify process health, no uncontrolled listener growth.

## 11) Recommended Repository Structure
```txt
src/
  main.ts
  config.ts
  manager/
    BotManager.ts
  adapter/
    perception.ts
    decision.ts
  plugins/
    npcPlugin.ts
  types/
    mineflayer-augment.d.ts
```

## 12) Final Notes
- Start with a narrow action surface, then expand only with deterministic safety gates.
- Keep Runtime Path evidence-driven: typed payloads, reproducible fallback, and explicit telemetry.
- Use this guide together with:
  - `docs/spec/mineflayer/mineflayer-typescript-runtime-spec.md`
  - `docs/spec/mineflayer/mineflayer-research-analysis.md`
