# NPC Runtime (backend/npc-runtime)

TypeScript runtime owning all deterministic truth. This doc maps v1's ~12.7k
LOC onto the M3R target so an agent knows what to keep, trim, or build.

> **Implementation status (2026-07-13):** the additive M3R social slices are
> checked in alongside the retained M1 Session service. `RunService`
> hydrates `world_layout.json` into six persistent actor workspaces, owns clock,
> revisions, scheduler, and shared provider budget, and exposes idempotent run
> start/advance/snapshot. It also joins the layout's exact actor-id set to the
> backend-only M3R cast file. Every provider packet receives only that actor's
> authored identity, voice, goals, self-only pressure, and holder-local
> relationship knowledge. Those fields may motivate speech but are not
> observations, memories, stance evidence, record sources, provenance, or
> hearing citations. Public run snapshots expose only the player's three
> localization keys; Godot never receives the private cast. All six residents
> use deterministic local schedule
> routes with staggered dwell times between provider wake-ups;
> arrival-confirmed schedules feed real two-turn park meetings whose validated
> listeners receive attributed memories. The second turn now merges the
> listener's exact reply with a private model-owned stance judgment grounded
> in the first speaker's exact memory; neutral judgments remain diagnosable,
> hearsay never creates firsthand vouch provenance, and the result stays hidden
> from `socialView` until the player next starts a conversation with that
> listener. Every
> resident now has one actor/location-authored conversation zone and a
> meaningful-evidence opening cache. `POST /v1/session/preload` resolves through
> the existing provider port outside the serialized run lane; the later
> `session/start` consumes that opening with zero provider calls. Context is
> limited to the actor's role, location, goals, own memories/heard speech, and
> visible records. A clean end consumes that evidence until a material
> schedule, goal, memory, or record change and leaves the run alive.
> Six-resident goal dispatch is now grounded by one revision-bound engine
> spatial packet: each stable resident can `wait`, `look`, `move_to`, or begin
> a two-turn `talk_to` exchange through the same bounded proposal-loop core.
> Current facts and schedule policy are revalidated before any typed action
> delta commits. A post-grace goal may now offer `move_to(player)` to one
> engine-grounded resident at a time. The runtime owns the resulting expiring
> contact lease and cooldown; reaching its safe distance consumes the existing
> preloaded opening through `session/start`, while a missed approach records
> one factual `player_contact_outcome` without moving stance, suspicion, or
> pressure. Provider-authored administrative record proposals now pass
> through run-scoped role, source, visibility, revision, pressure-clamp, and
> exactly-one-ledger validation. The player receives a separate encountered-only
> `socialView`; hidden records and pressure changes remain hidden until a valid
> speech or record-surface encounter. The explicit run lifecycle now advances
> through `active`, `hearing_due`, `hearing_active`, `terminal`, and `closed`.
> A deterministic six-locale procedure prompt collects one free-text final
> defense without a provider wait, then `judgeHearing` reassesses exactly six
> residents from their real memories and
> cited run records. The runtime enforces citation ownership, structured
> contact-basis consistency, the four-evidenced-vouch floor, terminal
> fallback, and idempotent
> `/v1/run/hearing` and `/v1/run/end`. High-pressure ledger escalation may also
> produce one grounded, survivable Station interrogation with the game's only
> hesitation timer; it returns to the active run and cannot issue a verdict.

## Target module shape

```
src/
  contracts/        # shared types (kept)
  runtime/
    schema.ts             # packet schemas (kept, extended)
    run-service.ts         # M3R: run lifecycle, clock, revision, hearing
    run-schema.ts          # M3R: RunState + run-bound request schemas
    run-cast.ts            # strict backend-only cast/layout join
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
    proposal-loop.ts      # bounded attempts, retry suppression, transcript seam
    transcript.ts         # per-NPC loop transcript
  providers/        # ports, adapters, registry, budget, envelope, test adapters
  policy/           # reason taxonomy, hook policy (kept)
  memory/           # actor memory + run/session memory stores (kept, extended)
  api/http-server.ts# sidecar endpoints (kept, extended)
  godot/runtime-schema.ts # client-boundary schema (kept)
data/cast/          # M3R actor-private identity, voice, goals, pressures
data/storylets/     # compiled regression/source content from docs/scenario
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
   Adding a signal class requires phrasing fixtures for every currently
   supported gameplay locale.
4. World mutations happen only through validated tool application, and each
   emits exactly one civic ledger event.
5. NPC context assembly enforces visibility. A run packet may add only the
   exact actor's immutable, backend-held cast context to what that actor
   observed, remembered, heard, or read; no other resident's private context
   enters it. Static cast context cannot itself create run memory, stance,
   evidence, a record, provenance, or a hearing citation.
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
10. A run has one immutable gameplay locale selected from the shared supported
    registry. The same locale flows through player conversation, ambient agent
    calls, records, hearing/recap, and deterministic fallback; stable ids and
    world truth remain language-neutral. The landed run and run-bound session
    schemas accept exactly `ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and
    `ja-JP`; the retained Same Order regression storylet remains honestly
    `ko-KR`-only.
11. Godot reports physical observations but never decides their gameplay
    meaning. A spatial batch names all six residents exactly once at the same
    observed revision as its advance and carries position, reachable anchors,
    visible/audible actors, visible object ids, the player's position/location,
    and each resident's grounded player visibility, audibility, reachability,
    and conversation-zone binding. `RunService` rejects unknown ids and uses
    current facts to validate tools, listeners, and contact starts. An empty
    player location is a valid no-contact observation between authored zones,
    not a reason to halt the advance lane.
    Continuous position and sight changes refresh commit-time grounding. Goal
    admission uses a separate semantic key: incoming memory, visible record
    revision, a gained or renewed contact opportunity, and interrogation state
    bypass the cadence immediately. Deterministic schedule transitions remain
    local movement policy and do not spend a provider call by themselves.
    Losing contact candidacy likewise retires obsolete work and advances the
    baseline without opening a new goal. Spatial-only changes can wake a stable
    resident at most once per 600 world seconds and never stack a second
    pending or claimed goal for that resident. The window is stamped again when
    a delayed wake is actually claimed, so queued work cannot be followed by an
    immediate spatial refresh.
12. Player knowledge is a runtime-owned `socialView` with its own monotonic
    revision. Direct conversation judgments, actually presented audible speech,
    and explicitly inspected record surfaces are the only encounter inputs.
    Knowledge acknowledgement never changes `worldRevision`; hidden mutations
    never change the normal HUD's disclosed pressure or record state.

## Sidecar API (M3R target)

Keep the proven decision/session shapes while placing them under an explicit
run lifecycle. Exact JSON is schema-owned in code, but the minimum public
surface is:

| Endpoint | Purpose |
|---|---|
| `POST /v1/run/start` | Idempotently create one run from a client `startId`, six actor workspaces, clock, revision, budgets, and initial snapshot |
| `POST /v1/run/advance` | Submit a bounded unpaused-time delta plus validated physical/world observations; returns due wakes and deltas |
| `GET  /v1/run/snapshot` | Full run snapshot for HUD hydrate, reconnect, and debug inspection |
| `POST /v1/run/encounter` | Idempotently acknowledge one actually presented ambient speech event or explicitly inspected record surface; returns the encountered-only `socialView` without changing `worldRevision` |
| `POST /v1/session/preload` | Resolve and cache an opening from strict `{runId, actorId, interactionZoneId, locale}`; returns the ready actor plus `ProposalMeta` without starting or pausing a child conversation |
| `POST /v1/session/start` | Consume that opening from the same strict actor/zone/locale packet with zero provider calls; an optional `contactId` proves a validated NPC-initiated approach and returns the same modal conversation view |
| `POST /v1/session/answer` | Player choice/typed input/hesitation → signals, state delta, NPC reactions |
| `POST /v1/npc/decision` | Claim one pending two-actor `meeting_ready` or single-actor `goal` wake, carrying `runId`, `wakeId`, and observed `worldRevision` |
| `GET  /v1/session/snapshot` | Renderable child-session state; never a substitute for the run snapshot |
| `POST /v1/session/end` | End the conversation and return queued run deltas; the run continues |
| `POST /v1/run/hearing` | Idempotently open the scheduled hearing or submit its final defense; returns a guaranteed terminal verdict |
| `POST /v1/run/end` | Idempotently return the terminal result and provider accounting, then close the run |

Debug-capable responses retain `ProposalMeta`, transcript deltas, and raw
`ledgerEvents[]`. Normal player presentation reads only the sanitized
`socialView`, whose encountered residents, questions, records, provenance, and
qualitative pressure never reveal undisclosed state.

Each public provenance item carries a player-readable `sourceExcerpt` instead
of exposing an internal source id. The runtime derives that excerpt only from
the exact owned source memory (or the already visible record body), removes
terminal and bidirectional control characters, and limits it to 160 Unicode
code points. Missing, duplicated, or cross-owner sources fall back to visible
record text or remain undisclosed rather than guessing at provenance.

Run snapshots, successful conversation-preload responses, every typed
NPC-decision response (including queued/stale/budget/failed terminal states),
player-answer responses, both hearing responses, and run-end responses also
carry strict `providerAudit` metadata together with `providerRuntimeTrace`.
The provider-bearing response builders refresh exact accounting immediately
before cloning both cumulative structures; exact cached decision retries keep
the original response bytes. `/v1/run/advance` deliberately does not carry the
growing arrays. Actual provider calls are
captured inside `ProviderService` before a result can become stale or be
discarded by `RunService`; each final proposal resolution names the call
sequence numbers it used, including a two-call invalid-envelope repair. The
audit contains no prompt or generated text. Its call/token totals reconcile
with the shared provider budget, and terminal acceptance requires a complete,
untruncated audit with no calls left in flight.

The adjacent `providerRuntimeTrace` records every structurally resolved
proposal metadata packet the run consumes, including a conversation opening
whose transport completed but whose speculative semantic commit later became
stale, and deterministic replacements created after a live envelope fails
runtime semantic validation. Staleness still applies no opening or world
effect. Final live acceptance checks both records; transport success alone is
not enough to claim that the played run remained fallback-free.

A request-scoped background ceiling can reject a proposal before its first
transport call while preserving the run's foreground reserve. `RunService`
classifies the typed rejection as `budget_reserved` for ordinary goals, goal
replies, and ambient work. It adds no synthetic proposal metadata, provider
audit resolution, runtime-trace entry, speech, or world delta; an exact retry
returns the cached result without another attempt. Evidence from an earlier
successful turn is retained, and genuine provider hard-budget fallback remains
visible in both provider surfaces. The configured hard token cap must match the
run snapshot constant. `reservedTokens` is not extra spend: it is subtracted
from the autonomous-work ceiling, so increasing late player/hearing headroom
does not silently buy more background chatter.

The landed surface includes `POST /v1/run/start`, `POST /v1/run/advance`,
`GET /v1/run/snapshot`, `POST /v1/run/encounter`, `POST /v1/session/preload`,
the run-discriminated start/answer/snapshot/end session routes,
`POST /v1/npc/decision` for bounded ambient meetings and single-resident goal
decisions, and the terminal `POST /v1/run/hearing` plus `POST /v1/run/end`
transitions. Legacy
`{storyletId, locale}` packets still dispatch to `SessionService`; strict
`{runId, ...}` packets dispatch to `RunService` on the same loopback server.
Fixture-only scripts generate byte-identical backend and Godot replay files
with all six openings, all three issued receptionist choices, one bounded
free-input path, and the complete due/open/answer/end hearing sequence.
Production still resolves wording, suggestions, judgment, and stance through
the configured provider port.

`POST /v1/run/advance` is not a per-frame provider call. Godot batches elapsed
unpaused time and discrete scene observations; `RunService` clamps the delta,
advances the authoritative clock, and schedules only event-driven wakes. A
player-modal conversation pauses these advance requests. Background NPC
requests already in flight may finish, but their effects remain revision-
checked and queued until the modal closes.

The optional `spatialFacts` member of an advance is an all-or-nothing snapshot
of the player and six residents at that request's `observedWorldRevision`.
The player fact carries position and the current authored location (or an empty
location between zones). Each actor fact contains a 3D position plus bounded,
unique `reachableAnchorRefs`, `visibleActorIds`, `audibleActorIds`, and
`visibleObjectIds`, together with `playerVisible`, `playerAudible`,
`playerReachable`, and a nullable `playerInteractionZoneId`. The runtime
canonicalizes their order and requires known actors, anchors, and objects;
`visibleObjectIds` may name only one of the three ids in the layout's
`physical_props` registry. Changed reachability, actor/player visibility, or
audibility emits an informational observation but does not immediately spend a
provider call. After the initial admission, spatial-only changes are
latest-state-wins and may create one refresh wake per stable actor only after
600 world seconds. Incoming memories, visible record revisions, gained or
renewed contact opportunities, and interrogation state bypass that cadence;
schedule transitions only change deterministic movement. Contact loss updates
the admission baseline and retires an obsolete unclaimed wake without spending
a provider call.
Each actor has at most one pending or claimed goal; an obsolete unclaimed wake
is retired and remains retry-safe as a stale result. Object visibility remains
available in the next independently scheduled observe packet and in tool
validation, but cannot itself spend a provider call. `arrival`, `observation`,
and `actor_schedule` wakes remain informational; an admitted goal wake is the
provider-bearing event. Position drift alone never opens a provider wake.

Discrete player handling arrives on the same endpoint as bounded
`propHandlingEvents`. Each event names one canonical prop, one of
`pick_up|carry|place|throw`, player/object positions, the observed world
revision, and exactly one visible/not-visible fact for each of the six
residents. `RunService` keeps the event receipt for the life of the run and
adds `prop_handling_observation` memory only to residents who actually saw it.
That memory is factual only: the event directly schedules no provider, stance,
suspicion, record, ledger, report, gossip, or goal mutation. The latest fact
per resident, prop, and action may appear as bounded context in a later,
independently triggered provider request; older repeats are compacted. It is
excluded from administrative sources and meaningful-firsthand hearing vouches.

Run creation and advance both have client-supplied idempotency keys. An exact
retry returns the cached byte-identical response before stale-revision or
modal checks; reusing a key for a different payload is a conflict. Each
advance carries the observed run revision, at most ten seconds of unpaused
time, and at most one exact arrival observation per actor. Arrivals apply
before clock boundaries. An issued movement changes only scheduler intent;
the actor's confirmed anchor and location change only after Godot reports the
matching `movementId`, actor, and semantic anchor. Route progress is likewise
arrival-gated: after a confirmed route point, a stable hash of actor, route,
and waypoint chooses a 45–60 world-second semantic dwell. Scene-local ambient
wander continues inside that anchor, so residents keep moving while a live
conversation opening has enough time to prepare. This staggers ordinary
patrols without randomness, persistence, or a provider call. `nextRouteMoveAtSeconds`,
automatic policy movement, and provider-proposed movement all honor the same
exact due time, while a schedule block transition may supersede an in-flight
route movement. If player contact holds a resident past that due time, the
scheduler issues the overdue route once at the first unheld advance rather than
leaving the actor locally frozen. A provider-backed conversation opening also
holds only that resident's ordinary route cadence while the proposal is in
flight and for 15 world seconds after it becomes ready. If current engine facts
still place the player inside that resident's valid visible, audible, reachable
5 m approach range, the route hold lasts until those facts change; the actual
conversation start remains independently limited to 2.85 m center distance.
Schedule transitions, meeting ownership, the world clock, and scene-local
ambient wander continue; the first advance after the grace or grounded
proximity ends issues any overdue route move once. Cyclic route selection also
skips semantic anchors that share the confirmed anchor's physical position and
preserves the first physically distinct point's semantic index; an
all-coincident route emits no meaningless movement. Meeting and hearing blocks
keep their exact authored anchors.

Meeting windows retain one semantic center but map every participant to a
distinct physical standing-slot anchor. A `meeting_ready` wake becomes pending
only when both actors have confirmed their own slots during the open window;
the window boundary alone is informational. While a participant's active
schedule block points at that window's standing slot—including its authored
lead-in before the window opens—the meeting owns that resident's social beat:
any older unclaimed goal is retired retry-safely and no duplicate goal
conversation is admitted. A grounded player contact that was already active
before meeting ownership began still outranks the schedule and holds that
participant in place; a newly available automatic contact opportunity does
not create parallel participant work. Later memory, record, contact, or
interrogation events can admit normal goals after the meeting block ends;
departing on schedule alone cannot. Run-discriminated
`POST /v1/npc/decision` claims that wake exactly once and resolves two
validated provider-backed utterances outside the run lock. The first uses an
ordinary agent-step proposal; the second uses one `ambient_reply` call that
returns the listener's exact reply and speech-grounded personal judgment
without adding a third call. The runtime then recomputes current listeners
from confirmed anchors and the shared audibility volume before atomically
committing both utterances and the listener judgment. Exact retries are cached; a result completed
during a player modal remains queued and commits on the same request after
resume without another provider call. Ambient work cannot enter the reserved
player/hearing budget. Grace and hearing wakes continue through the same
deterministic scheduler surface.

For a single-resident goal wake, the runtime derives a semantic key from
incoming memories, visible record revisions, and the current
contact/interrogation opportunity. A contact epoch may renew the same grounded
candidate, but candidate loss is non-actionable and creates no provider wake.
Spatial facts remain a separate
commit-time signature and a 600-world-second refresh trigger measured from the
latest admission and restamped when a delayed wake is claimed. They can
invalidate a stale action without turning ordinary movement into a provider
treadmill. Provider-facing observations retain the newest 12 memory-derived
own-action notes, eight historical heard-speech lines, and eight unadministered
administrative sources in chronological order; current-turn speech is appended
after that historical bound. Full actor memory remains in run state, snapshots,
and hearing requests, so this is prompt budgeting rather than memory loss.

The offered tool catalog is derived from current facts rather than role alone:
`wait` remains available; `move_to`, `look`, `talk_to`, `read_record`,
and `write_record` appear only when their packet prerequisites are present. A
visible record is a valid `look` target even when no actor or
physical prop is visible. An ordinary `talk_to` request carries the frozen
subset that passes the runtime's full reciprocal-audibility, cooldown,
movement, and authored-volume predicate, while commit still revalidates fresh
facts. An active player-contact actor or a resident owned by an authored
meeting cannot appear as the target. Both participants are checked again when
the reply obtains its background-provider slot and at final commit, so queued
work cannot spend or apply after ownership changes. `use_object` stays withheld
because M3R physical props do not yet expose a validated usable-affordance
transition. The generic v2 role catalog also retains `request`, but M3R
withholds it until a run-scoped request action and commit contract exist; a
provider is never offered a tool this lane would reject by construction. Each
goal has at most three proposal attempts. Goal decisions and
the retained `runBeat` path share `agentloop/proposal-loop.ts`, so structured
failure feedback, duplicate-call suppression, and transcript entries have one
implementation. A valid `talk_to` resolves the initiator's utterance and one
reply through the provider port as an atomic two-turn exchange; both turns are
revalidated against current participant evidence and engine audibility before
listener memories commit. The shared background gate allows at most two
provider proposals in flight, and only one ambient conversation may hold the
run lease.

When the hearing becomes due, that background lane closes before any new
transport may begin. Queued preload/goal work cancels as stale without a fake
fallback trace; already active background calls and their stale cleanup drain
before the one final hearing-verdict provider call starts. The localized
hearing opening commits immediately and never fabricates provider metadata.

After grace, a 75-world-second opportunity epoch may add one special
`move_to(player)` affordance. Candidate selection is deterministic (current
suspicion, relevant memories, then stable actor id), but the provider owns the
choice to approach. A committed choice exposes one nullable `activeContact`
on run, advance, NPC-decision, and run-bound session responses. It contains the
actor, interaction zone, origin anchor, safe distance, issue/expiry times, and
the provider's internal reason. The scheduler holds that actor without
inventing an arbitrary semantic anchor. `session/start` with the matching id
revalidates the latest distance, visibility, reachability, and zone before
consuming the normal opening. Expiry or loss clears the lease, starts the
75-second cooldown, and appends exactly one attributed `not_engaged` memory;
no judgment or institutional mutation is implied.

The high-pressure Station interrogation is the exception to the optional
approach choice: once its runtime conditions and fresh grounded contact facts
hold, `move_to(player)` is already the only action the validator can accept.
That goal therefore sends a request-scoped schema containing only the exact
player approach, with nullable utterance and `done=true`, instead of paying up
to three doomed alternatives before deterministic fallback. Opening wording,
the interrogation question, and the answer judgment remain provider-owned;
the runtime still revalidates contact facts before both claim and commit.
If the request-scoped background ceiling denies this mandatory approach before
a provider call, the runtime commits the grounded `move_to(player)` as explicit
interrogation policy without inventing provider metadata, an audit resolution,
or a runtime-trace entry. This is the only metadata-free goal commit: the fresh
Station candidate, pending pressure event, contact zone, visibility, and
reachability must still pass the normal claim- and commit-time checks. A real
provider fallback after transport remains visible instead of being relabeled as
policy.

Current NPC decision responses use one typed `actionDeltas` stream: `speech`,
`readiness`, `look`, `movement`, or validated `administration`. If a player modal owns the run when an
ambient result resolves, the signature-bound attempt becomes queued without a
second provider call. `POST /v1/session/end` commits every still-valid queued
attempt and returns `queuedRunDeltas`; an idempotent session-end retry returns
the same batch, while the matching NPC-decision retry has its deltas cleared so
the client cannot apply one mutation twice.

## Run-scoped state and judgment

The normal player UI exposes only each encountered NPC's disclosed coarse
`oppose / uncertain / vouch` stance and one encountered institutional-pressure
line. Numeric suspicion and undisclosed current state remain internal/debug
data. A stance may be judged only from that actor's validated memories;
`vouch` additionally requires a meaningful first-hand conversation with the
player. Reading an administrative record may update factual memory or
institutional pressure, but does not directly move personal stance. One
successful record write, update, or first read produces exactly one ledger
event; retrying or rereading the same revision cannot duplicate it.
Record-read lineage is resolved back to one unique non-record source at both
proposal validation and serialized commit. That root may create positive
institutional pressure only once for the whole run; relaying, rereading, or
rewriting the same evidence still creates the legitimate record, ledger, and
provenance effects but clamps another requested positive delta to zero.

An `ambient_stance_judgment` memory links the source speech event, the exact
listener-owned `ambient_utterance` memory, speaker, listener, before/after
suspicion, proposed/applied stance, why-line, and provider metadata. It is
available in debug snapshots and hearing context but is not an administrative
record source. Only a later successful `session/start` with that resident may
copy the newest undisclosed material judgment into `socialView`, preserving
`speaker → listener → sourceMemory → why`; a pure no-change judgment remains
diagnostic memory, and preload or overhearing alone does not reveal another
resident's internal opinion.

Spoken records have one disclosure rule across free-world and modal speech.
The provider returns at most eight speaker-visible `citedRecordIds`; the
runtime freezes each exact record revision and ledger link against the
speaker's observation, then revalidates them before serialized commit. An
off-screen free-world line stores those citations without changing
`socialView`; only an idempotent player speech encounter inside the authored
audibility volume discloses the still-matching record. A preloaded modal
opening likewise discloses nothing until `session/start` actually presents the
line, while a merged answer discloses only when that answer commits. Both paths
use `speaker → player → spoken line` provenance and store the exact citations
on the corresponding speech or conversation memory. A later record update
cannot be exposed retroactively through an older line, and direct inspection
of the text surface upgrades speech provenance to full record/ledger
provenance, including its pressure band and authored question.

The runtime verifies provenance and procedure; the selected live model judges
meaning. At the scheduled hearing it enforces four evidenced vouches out of
six as the eligibility floor, then asks the model to reassess the final
defense against pooled visible memories. An uncited assessment cannot apply a
new proposed stance, and an uncited vouch is downgraded; a valid vouch must cite
that resident's meaningful first-hand conversation. `ProviderService` applies
the same request-semantic validator before accepting a hearing response as
live, and its one repair receives the original hearing evidence packet so it
can correct actor identity, citation ownership, contact basis, or a
below-quorum ordinary proposal. Failure after repair is explicit fallback;
`RunService` repeats the validation at commit and keeps final authority. Every assessment also
declares exactly one memory-derived contact basis: `meaningful_firsthand`,
`limited_firsthand`, or `never_conversed`. The runtime distinguishes a limited
direct exchange from no conversation at all and treats any mismatch as
semantic fallback. A resident without meaningful firsthand memory may still
cite remembered ambient speech to oppose or remain uncertain, but cannot
vouch. The terminal packet carries the validated basis separately so the
client can label a never-conversed assessment without rewriting or trying to
classify the provider's prose. Valid provider testimony wording is preserved
when the structured basis and citations agree. Four valid vouches make an
ordinary verdict possible but never mandatory. Invalid
citations or provider failure use a visibly marked deterministic judgment so
the run still terminates. The recap is assembled only from the submitted
defense, validated testimony, and actual cited record/ledger entries. No
earlier interrogation can end an M3R run.
If the provider proposes ordinary below the four-vouch floor, the runtime's
forced abnormal wording is itself marked fallback in the terminal proposal
metadata and runtime trace; a live transport cannot hide that replacement.

## Checks

`bun run --cwd backend/npc-runtime check` = typecheck + unit/fixture tests +
storylet data validation. Keep it under ~60s. Provider live smokes are
separate opt-in scripts
([`ai-provider-ports.md`](ai-provider-ports.md)).
