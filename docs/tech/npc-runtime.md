# NPC Runtime (backend/npc-runtime)

TypeScript runtime owning all deterministic truth. This doc maps v1's ~12.7k
LOC onto the v2 target so an agent knows what to keep, trim, or build.

## Target module shape

```
src/
  contracts/        # shared types (kept)
  runtime/
    schema.ts             # packet schemas (kept, extended)
    decision-service.ts   # ordered decision core (kept)
    conversation-suspicion.ts  # signal classification (kept)
    fallback.ts           # deterministic lines (kept, feeds from line bank data)
    readiness.ts          # boot/preflight state (kept, simplified)
    telemetry.ts          # session telemetry (kept, + provider usage)
    world/                # v2: records, civic ledger, economy values, visibility
  agentloop/        # v2 (M1 shape, M3 full):
    context.ts            # observe-packet assembly (pure fn of world state)
    tools.ts              # tool catalog + validators
    engine.ts             # iterate/validate/apply/budget
    transcript.ts         # per-NPC loop transcript
  providers/        # v2 (M2): ports, adapters, registry, budget, envelope
  policy/           # reason taxonomy, hook policy (kept)
  memory/           # actor memory / session memory stores (kept, trimmed)
  api/http-server.ts# sidecar endpoints (kept, extended)
  godot/runtime-schema.ts # client-boundary schema (kept)
data/storylets/     # compiled content from docs/scenario (v2)
```

## v1 inventory — keep / trim / retire

**Keep (proven, engine-agnostic):**
`runtime/schema.ts`, `runtime/decision-service.ts` (ordered same-NPC
conversation turns), `runtime/conversation-suspicion.ts` + fixtures,
`policy/reason-taxonomy.ts`, `runtime/fallback.ts`, `runtime/telemetry.ts`,
`memory/actor-workspace-store.ts`, `memory/session-memory.ts`,
`api/http-server.ts`, `godot/runtime-schema.ts`, `contracts/types.ts`.

**Trim/absorb (good ideas trapped in Same-Order-specific proof files):**
`runtime/agentic-environment.ts`, `runtime/same-order-agentic-routes.ts`,
`runtime/bounded-behavior.ts`, `runtime/same-order-storylet-runtime-map.ts`,
`runtime/same-order-provider-scheduling.ts`, `-dispatch-contract.ts`,
`-action-comparison.ts` → their generic cores become `agentloop/` and
`runtime/world/`; the storylet-specific data moves to `data/storylets/same-order.json`.
Do this absorption as part of M1/M3 work, not as a standalone refactor slice.

**Retire (proof-factory or dead auth):**
`runtime/same-order-visual-evidence-proxy.ts`,
`same-order-comprehension-proxy.ts`, `same-order-player-comprehension-playtest.ts`,
`same-order-asset-bill-of-materials.ts`, `runtime/lifecycle-gates.ts`,
`broker/codex-broker.ts`, `broker/codex-tool-gateway.ts`, `broker/thread-store.ts`,
`tools/openai-codex-*.ts`, `tools/report-openai-codex-live-usage.ts`.
Delete when the replacing module lands; don't leave both alive.

## Core invariants (do not renegotiate per slice)

1. Every packet crossing a process boundary validates against schema on both
   sides.
2. `DecisionService` preserves ordered turns per conversation
   (`conversation.turnId`) — no latest-wins coalescing.
3. Suspicion classification is pure and fixture-tested; adding a signal class
   requires fixtures for KO and EN phrasing.
4. World mutations happen only through validated tool application, and each
   emits exactly one civic ledger event.
5. NPC context assembly enforces visibility — no data an NPC couldn't know
   ever enters its packet (this is both a fairness rule and the prompt-side
   information boundary).
6. The runtime runs fully deterministic with providers off; provider on/off
   cannot change route outcomes (texture-not-truth, asserted by smoke in M2+).

## Sidecar API (v2 surface)

Keep the v1-proven `/v1/npc/decision` shape; add session lifecycle:

| Endpoint | Purpose |
|---|---|
| `POST /v1/session/start` | New session from storylet id; returns initial world snapshot |
| `POST /v1/session/answer` | Player choice/typed input/hesitation → signals, state delta, NPC reactions |
| `POST /v1/npc/decision` | Beat tick: NPC agent-loop steps for scheduled actors |
| `GET  /v1/session/snapshot` | Full renderable state (HUD hydrate, debugging) |
| `POST /v1/session/end` | Terminal route result + telemetry summary |

All responses carry `ledgerEvents[]` deltas so the client can animate
consequences incrementally.

## Checks

`bun run --cwd backend/npc-runtime check` = typecheck + unit/fixture tests +
storylet data validation. Keep it under ~60s. Provider live smokes are
separate opt-in scripts
([`ai-provider-ports.md`](ai-provider-ports.md)).
