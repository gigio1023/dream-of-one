# Guide: Tutorial Path (TypeScript)

## Intent
- Provide a learning-first path from official Mineflayer tutorial concepts to production TypeScript usage.
- Preserve tutorial coverage without duplicating policy/reference ownership.

## Scope
- Owns:
  - tutorial sequence and onboarding narrative
  - “what to do next” progression
  - TypeScript equivalents for official tutorial steps
- Does not own:
  - full API catalog (see `../reference/api-catalog.md`)
  - normative runtime policy (see `../spec/runtime.md`)

## Tutorial Progression

### Stage 1: Environment
- Install Node runtime (`>=22` recommended baseline).
- Initialize TypeScript project and scripts.
- Confirm `tsx` and `tsc` run.

### Stage 2: First bot
- Create bot with typed `BotOptions`.
- Add minimal handlers:
  - `error`
  - `end`
  - `spawn`
- Send one chat message on spawn for boot verification.

### Stage 3: Input and configuration
- Replace hardcoded host/user values with environment-backed config schema.
- Validate inputs before bot creation.

### Stage 4: Events and listeners
- Convert basic `on/once` usage into lifecycle-aware listener strategy.
- Use named listeners where removal is needed.

### Stage 5: Async action sequence
- Use `await` for dependent actions.
- Never chain dependent mutation actions without waiting for completion evidence.

### Stage 6: Chat pattern parsing
- Start with `addChatPattern`.
- Add `addChatPatternSet` for multi-step parse flows.
- Add fallback parser path for custom servers.

### Stage 7: Dig/place/interact
- Add wrapper functions around:
  - `dig`
  - `placeBlock`
  - `activateBlock`
  - `updateSign`
- Classify failures using deterministic reason mapping.

Action policy owner:
- `../spec/action-api.md`

### Stage 8: Multi-bot and reconnect
- Add reconnect loop with bounded backoff.
- Add multi-bot orchestrator with per-bot state and global cap.

### Stage 9: Validation and evidence
- Build simple evidence logs:
  - lifecycle transitions
  - action request/result
  - fallback reason data

## Operational FAQs (TypeScript)
### Custom server chat does not emit expected events
- Parse `messagestr` directly when chat formats diverge from vanilla.
- Use custom regex with `addChatPattern`/`addChatPatternSet`.
- See normalization strategy owner:
  - `../guides/events.md`

### Lag disconnect handling
- Increase keepalive tolerance using protocol timeout options.
- Pair timeout tuning with reconnect policy and bounded backoff.
- Ensure reconnect attempts emit explicit lifecycle evidence.

### Error logging control
- Treat `error`, `kicked`, and `end` as required listeners.
- Configure runtime logging behavior intentionally (`hideErrors`, `logErrors`) and avoid silent failures.
- Keep all runtime failures mapped into deterministic reason outputs.

### Android/Termux runtime
- Termux is operationally supported when Node runtime and package install prerequisites are satisfied.
- Keep the same TypeScript runtime structure once Node is available.
- Validate local filesystem path assumptions in script startup commands.

## Conformance and Drift Register
### Node version messaging drift
- Upstream docs and runtime guards may diverge across files, while current package baseline is `>=22`.
- Standardize deployment policy on Node `22.x` to avoid mixed-runtime behavior.

### Tutorial table-of-contents drift
- Tutorial entries can diverge from section body naming over time.
- Use reconstructed stage model in this guide as the operational onboarding baseline.

### Chat pattern API evolution
- Legacy naming patterns may remain for backward compatibility.
- New TypeScript code should use `addChatPattern` and `addChatPatternSet` only.

### Plugin options example/type mismatch
- Some historical snippets show plugin input forms that differ from current `index.d.ts`.
- Prefer object-map plugin options or explicit `bot.loadPlugin(...)` calls for strict TypeScript compatibility.

## Official Tutorial to TypeScript Mapping
| Official concept | TypeScript target in reconstructed docs |
|---|---|
| Create a bot | `../guides/implementation.md` Step 4 |
| Listen for events | `../spec/event-lifecycle.md` + this guide Stage 4 |
| Promises and async | this guide Stage 5 |
| Chat patterns | this guide Stage 6 |
| Correct vs incorrect sequencing | `../spec/action-api.md` + this guide Stage 5 |
| Command-line args | `../guides/implementation.md` Step 3 |

## Minimal tutorial sample
```ts
import mineflayer from 'mineflayer'

const bot = mineflayer.createBot({
  host: process.env.MC_HOST ?? '127.0.0.1',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.MC_USER ?? 'Player',
  auth: 'offline'
})

bot.once('spawn', () => bot.chat('ready'))
bot.on('error', console.error)
bot.on('end', (reason) => console.warn('ended', reason))
```

## Next Documents by Learning Need
- Need strict runtime policy:
  - `../spec/runtime.md`
- Need deep action semantics:
  - `../spec/action-api.md`
- Need API lookup:
  - `../reference/api-catalog.md`
- Need implementation sequence:
  - `../guides/implementation.md`
