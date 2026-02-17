# Guide: Implementation

## Intent
- Provide practical implementation steps for a Mineflayer + TypeScript runtime.
- Keep procedures detailed, while delegating normative policy to `../spec/*`.

## Scope
- Owns:
  - project bootstrap sequence
  - implementation structure and adapter wiring
  - execution checklist for local validation
- Does not own:
  - normative runtime rules (see `../spec/runtime.md`)
  - deep action fallback policy (see `../spec/action-api.md`)
  - complete signature catalog (see `../reference/api-catalog.md`)

## Step 1: Bootstrap project
```bash
mkdir mineflayer-runtime
cd mineflayer-runtime
npm init -y
npm i mineflayer vec3 zod
npm i -D typescript tsx @types/node
npx tsc --init
```

## Step 2: Configure TypeScript
Use strict mode and one module profile.

Example baseline:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"]
}
```

## Step 3: Define runtime config schema
```ts
import { z } from 'zod'

export const RuntimeConfigSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.coerce.number().default(25565),
  username: z.string().default('Player'),
  auth: z.enum(['offline', 'microsoft', 'mojang']).default('offline')
})
```

## Step 4: Build minimal typed bot entry
```ts
import mineflayer, { type BotOptions } from 'mineflayer'

const options: BotOptions = {
  host: process.env.MC_HOST ?? '127.0.0.1',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.MC_USER ?? 'Player',
  auth: (process.env.MC_AUTH as BotOptions['auth']) ?? 'offline'
}

const bot = mineflayer.createBot(options)
bot.on('error', (e) => console.error(e))
bot.on('end', (r) => console.warn(r))
```

## Step 5: Add lifecycle gate wrapper
- Create a readiness gate utility:
  - waits for required lifecycle events before action dispatch.
- Gate output should include:
  - `ready: boolean`
  - failure `reasonCode` and `reasonCategory` on failure.

## Step 6: Add action runner with deterministic failure mapping
- Wrap each high-risk action with:
  - precondition checks
  - bounded timeout
  - Reason Code mapping
  - evidence capture

For policy details, use:
- `../spec/action-api.md`

## Step 7: Add plugin extension layer
- Use declaration merging (`*.d.ts`) for plugin-owned bot extensions.
- Keep plugin API namespaced to avoid collisions.

## Step 8: Add event normalization module
- Normalize raw runtime events into internal schema for assistant decision loop.
- Keep parse failures explicit with deterministic failure outputs.

For lifecycle/event policy, use:
- `../spec/event-lifecycle.md`

## Step 9: Multi-bot manager pattern
- Maintain one state container per bot.
- Enforce single-flight per bot for critical actions.
- Apply global concurrency cap across all bots.

## Step 10: Local validation checklist
- [ ] boot path reaches `spawn` gate
- [ ] action runner emits Reason Code on known failure paths
- [ ] dig/place/interact calls produce expected evidence
- [ ] reconnect path cleans up listeners/timers
- [ ] multi-bot run obeys single-flight + global cap

## Step 11: Apply runtime blueprint
### 11.1 Structure baseline
```text
src/
  main.ts
  config/
    schema.ts
  runtime/
    lifecycle-gates.ts
    event-normalizer.ts
    action-runner.ts
  plugins/
    npc-plugin.ts
  types/
    mineflayer-augment.d.ts
```

### 11.2 Runtime Path and Fallback Path split
- Runtime Path:
  - connect -> inject -> spawn -> event ingest -> action execution
- Fallback Path:
  - timeout/rejection classification per action
  - deterministic Reason Code and reason category output
  - loop continuation without process crash

### 11.3 Minimal failure envelope schema
```ts
type ActionFailure = {
  reasonCode: string
  reasonCategory: 'connection' | 'precondition' | 'timeout' | 'server' | 'unknown'
  detail?: string
}
```

## Common Pitfalls
- Dispatching actions before readiness gates.
- Assuming Promise resolution equals world-state mutation in all APIs.
- Missing `error/end` listeners causing opaque failures.
- Duplicating runtime policy in guides instead of linking spec owners.
