# NPC Runtime (backend/npc-runtime)

TypeScript runtime owning all deterministic truth. This doc maps v1's ~12.7k
LOC onto the M3R target so an agent knows what to keep, trim, or build.

> **Implementation status (2026-07-12):** the first two additive M3R run slices
> are checked in alongside the retained M1 Session service. `RunService` hydrates
> the one `world_layout.json` into six persistent actor workspaces, separates
> topology revision from monotonic run revision, owns the initial clock and
> shared provider budget, and exposes run start/snapshot plus a run-bound
> Studio receptionist conversation. A validated answer persists that actor's
> exact line, why-line, private report inclination, firsthand provenance, and
> model-judged coarse stance; speech alone cannot mutate institutional
> pressure. Child-session end is idempotent and leaves the run alive. The
> second slice adds idempotent run start/advance, unpaused clock batching, an
> arrival-confirmed six-actor scheduler, participant-specific meeting slots,
> and pending schedule/meeting/grace/hearing wakes without making a provider
> call. Ambient NPC decisions and conversation, records, and the hearing
> procedure remain target work below; schedule wakes are data, not evidence
> that those later surfaces already exist.

## Target module shape

```
src/
  contracts/        # shared types (kept)
  runtime/
    schema.ts             # packet schemas (kept, extended)
    run-service.ts         # M3R: run lifecycle, clock, revision, hearing
    run-schema.ts          # M3R: RunState + run-bound request schemas
    decision-service.ts   # ordered decision core (kept)
    conversation-suspicion.ts  # signal classification (kept)
    fallback.ts           # deterministic lines (kept, feeds from line bank data)
    readiness.ts          # boot/preflight state (kept, simplified)
    telemetry.ts          # run/session telemetry (kept, + provider usage)
    world/                # M3R: memories, stances, records, ledger, visibility
  agentloop/        # provider-driven loop:
    context.ts            # observe-packet assembly (pure fn of world state)
    tools.ts              # tool catalog + validators
    engine.ts             # iterate/validate/apply/budget
    transcript.ts         # per-NPC loop transcript
  providers/        # ports, adapters, registry, budget, envelope, test adapters
  policy/           # reason taxonomy, hook policy (kept)
  memory/           # actor memory + run/session memory stores (kept, extended)
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
3. The deterministic suspicion classifier stays pure and fixture-tested; it
   is the fallback for provider outages, never the product judgment path.
   Adding a signal class requires fixtures for KO and EN phrasing.
4. World mutations happen only through validated tool application, and each
   emits exactly one civic ledger event.
5. NPC context assembly enforces visibility — no data an NPC couldn't know
   ever enters its packet (this is both a fairness rule and the prompt-side
   information boundary).
6. The model judges what player speech means (suspicion movement, why-lines)
   within rule-enforced validity: clamped deltas, visibility-checked context,
   and a guaranteed session ending
   (see [`../vision/design-pillars.md`](../vision/design-pillars.md)).
   Providers may choose different valid attempts and wording; fallback keeps a
   session alive but is never the default production profile.
7. A `runId` owns the six NPC memories and stances, records, civic ledger,
   institutional pressure, unpaused world clock, hearing state, provider
   budget, and monotonically increasing `worldRevision`. Conversation
   sessions are children of a run; ending a conversation never resets or
   duplicates run state.
8. Background proposals carry `runId`, `wakeId`, and the world revision they
   observed. On arrival, the runtime revalidates them against current facts
   before applying anything. While a player conversation is modal, valid
   ambient effects queue and apply after the modal surface closes; an ambient
   provider wait never pauses the world.
9. A run reset clears every run-owned value together. Content, provider
   profile selection, and deterministic test fixtures are configuration, not
   remembered world state.

## Sidecar API (M3R target)

Keep the proven decision/session shapes while placing them under an explicit
run lifecycle. Exact JSON is schema-owned in code, but the minimum public
surface is:

| Endpoint | Purpose |
|---|---|
| `POST /v1/run/start` | Idempotently create one run from a client `startId`, six actor workspaces, clock, revision, budgets, and initial snapshot |
| `POST /v1/run/advance` | Submit a bounded unpaused-time delta plus validated physical/world observations; returns due wakes and deltas |
| `GET  /v1/run/snapshot` | Full run snapshot for HUD hydrate, reconnect, and debug inspection |
| `POST /v1/session/start` | Start a child conversation from `runId` + actor id; returns the modal conversation view |
| `POST /v1/session/answer` | Player choice/typed input/hesitation → signals, state delta, NPC reactions |
| `POST /v1/npc/decision` | Event wake for one scheduled actor, carrying `runId`, `wakeId`, and observed `worldRevision` |
| `GET  /v1/session/snapshot` | Renderable child-session state; never a substitute for the run snapshot |
| `POST /v1/session/end` | End the conversation and return queued run deltas; the run continues |
| `POST /v1/run/hearing` | Open the scheduled, run-ending hearing after its clock condition is met |
| `POST /v1/run/end` | Return terminal result, run telemetry, and provider accounting, then close the run |

Responses carry `ProposalMeta`, transcript deltas, and `ledgerEvents[]` so the
client can distinguish live/fallback/scripted behavior and animate validated
consequences incrementally.

The landed subset is `POST /v1/run/start`, `POST /v1/run/advance`,
`GET /v1/run/snapshot`, and the run-discriminated
start/answer/snapshot/end session routes. Legacy
`{storyletId, locale}` packets still dispatch to `SessionService`; strict
`{runId, ...}` packets dispatch to `RunService` on the same loopback server.
Fixture-only Studio scripts generate byte-identical backend and Godot replay
files covering all three issued choices and one bounded free-input path.
Production still resolves wording, suggestions, judgment, and stance through
the configured provider port.

`POST /v1/run/advance` is not a per-frame provider call. Godot batches elapsed
unpaused time and discrete scene observations; `RunService` clamps the delta,
advances the authoritative clock, and schedules only event-driven wakes. A
player-modal conversation pauses these advance requests. Background NPC
requests already in flight may finish, but their effects remain revision-
checked and queued until the modal closes.

Run creation and advance both have client-supplied idempotency keys. An exact
retry returns the cached byte-identical response before stale-revision or
modal checks; reusing a key for a different payload is a conflict. Each
advance carries the observed run revision, at most ten seconds of unpaused
time, and at most one exact arrival observation per actor. Arrivals apply
before clock boundaries. An issued movement changes only scheduler intent;
the actor's confirmed anchor and location change only after Godot reports the
matching `movementId`, actor, and semantic anchor. Route progress is likewise
arrival-gated: after a confirmed route point, the actor dwells for at least
15 world seconds before another route movement can issue, while a schedule
block transition may supersede an in-flight route movement.

Meeting windows retain one semantic center but map every participant to a
distinct physical standing-slot anchor. A `meeting_ready` wake becomes pending
only when both actors have confirmed their own slots during the open window;
the window boundary alone is informational. Grace and hearing wakes follow
the same deterministic scheduler surface. These wakes carry no authored
conversation and spend zero provider budget until a later `/v1/npc/decision`
slice consumes them.

## Run-scoped state and judgment

The normal player UI exposes only each NPC's coarse `oppose / uncertain /
vouch` stance and one institutional-pressure line. Numeric suspicion remains
internal/debug data. A stance may be judged only from that actor's validated
memories; `vouch` additionally requires a meaningful first-hand conversation
with the player. Reading an administrative record may update factual memory
or institutional pressure, but does not directly move personal stance.

The runtime verifies provenance and procedure; the selected live model judges
meaning. At the scheduled hearing it enforces four evidenced vouches out of
six as the eligibility floor, then asks the model to reassess the final
defense against pooled visible memories. No earlier interrogation can end an
M3R run.

## Checks

`bun run --cwd backend/npc-runtime check` = typecheck + unit/fixture tests +
storylet data validation. Keep it under ~60s. Provider live smokes are
separate opt-in scripts
([`ai-provider-ports.md`](ai-provider-ports.md)).
