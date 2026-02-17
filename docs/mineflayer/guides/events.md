# Guide: Event Normalization

## Intent
- Show how to normalize Mineflayer events into a stable internal schema for AI orchestration.
- Keep procedure practical while aligning to lifecycle and action specifications.

## Scope
- Owns:
  - event normalization patterns
  - parser fallback patterns
  - event-to-decision envelope wiring examples
- Does not own:
  - lifecycle policy authority (see `../spec/event-lifecycle.md`)
  - action semantics policy (see `../spec/action-api.md`)

## Normalization Goals
- Convert heterogeneous runtime events into one internal `Schema`.
- Preserve correlation metadata (`sessionId`, `botId`, `eventType`, timestamp).
- Keep parse failures deterministic and reportable.

## Suggested Perception Schema
```ts
type PerceptionEvent = {
  sessionId: string
  botId: string
  eventType: string
  timestampMs: number
  payload: Record<string, unknown>
}
```

## Event Intake Pattern
1. Register lifecycle handlers first (`connect/login/spawn/end/error`).
2. Register domain handlers (chat, block, entity, physics).
3. Normalize payload into `PerceptionEvent`.
4. Push to decision pipeline with bounded queue semantics.

## Chat Normalization Pattern
- Primary path:
  - `addChatPattern`/`addChatPatternSet` for known formats.
- Fallback path:
  - direct `messagestr` parsing for custom server formats.

Example:
```ts
bot.addChatPattern('hello', /<(.+)> hello/i, { parse: true })
bot.on('chat:hello' as never, (matches: unknown) => {
  enqueue({
    sessionId,
    botId,
    eventType: 'chat.hello',
    timestampMs: Date.now(),
    payload: { matches }
  })
})
```

## Block/Entity Evidence Pattern
- Use world mutation events as confirmation channels:
  - `blockUpdate`
  - `diggingCompleted`
  - `entitySpawn`
- Do not rely only on local command dispatch.

## Error and Fallback Pattern
- Every parser or handler failure should emit deterministic metadata:
  - `reasonCode`
  - `reasonCategory`
  - source event class

## Listener Hygiene
- Keep detachable handler references for dynamic subscriptions.
- Remove temporary listeners after completion conditions.
- Cleanup timers/listeners on reconnect/shutdown flows.

## Example: Normalize lifecycle + chat
```ts
bot.on('spawn', () => emit('lifecycle.spawn', {}))
bot.on('end', (reason) => emit('lifecycle.end', { reason }))
bot.on('messagestr', (message) => emit('chat.raw', { message }))
```

## Validation Checklist
- [ ] lifecycle events normalized with consistent payload keys
- [ ] chat patterns produce deterministic parsed outputs
- [ ] fallback parser path exists for unknown formats
- [ ] error normalization includes reason metadata
- [ ] temporary listeners are removed after use
