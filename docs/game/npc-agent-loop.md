# NPC Agent Loop

The permanent AI/NPC philosophy (inherited from v1's final direction lock,
now the build target instead of a doctrine): **NPCs are constrained agents
running a coding-agent-style loop inside the game world.** Do not extend NPCs
by authoring fixed social reaction chains ("if Station citation then Park
warning"). Author tools, visibility, and rules; let role agents iterate.

Search anchors for future agents: `AGENT_LOOP_RUNTIME`, `NPC_TOOL_LOOP`,
`NO_FIXED_SOCIAL_CHAINS`.

## The loop

```
loop (per NPC, per beat, budgeted):
  1. observe   — assemble the NPC's bounded context:
                 role, goals, policy, actor memory,
                 visible objects/records/actors, heard speech,
                 available tool catalog (from affordances)
  2. propose   — pick the next step:
                 provider proposal by default;
                 bounded deterministic fallback when provider work fails
                 (one tool call + optional utterance, schema-bound)
  3. validate  — runtime checks the tool call against the catalog,
                 role permissions, visibility, object state, budget
  4. apply     — valid → world mutation + civic ledger event
                 invalid/blocked → structured failure result
  5. read      — the NPC reads the result (success, blocked, busy, refused)
  6. update    — actor memory append; conversation state; goal priority shift
  7. iterate   — up to N steps per beat (default 3–6), then yield
```

The key property carried from v1's design: **a blocked or busy result must
change the NPC's next step.** An agent that retries the same tool against the
same blocked state is a bug.

### Event-driven wake-ups (2026-07-11, six-NPC continuous world)

All six NPCs run this same loop regardless of player distance, but "same
loop" never means "provider call every tick." A beat opens only on a wake
event: a schedule anchor (shift start, park break), an arrival (actor enters
the NPC's space), an observation (visible change worth reacting to), a goal
becoming actionable, or a conversation (incoming `talk_to`, or the NPC's own
planned approach). Between wake events an NPC follows policy-based movement
and idles — deterministic game AI, zero provider cost. Six actors iterating
3–6 provider steps per tick would waste calls and create queue pressure; the
scheduler exists to make that impossible.

Ambient proposals carry the `runId`, actor id, wake id, and world revision
they observed. Provider work may finish while the world keeps moving, but the
runtime validates the proposal again against the current revision before any
tool applies. If the player opens a modal conversation, finished ambient
results queue without mutating until the world resumes. A stale proposal gets
the structured current-state result and yields or replans; it never applies to
the world it imagined.

NPC-initiated player contact uses the same wake and tool path. After the grace
period, the runtime may expose `move_to(player)` to exactly one grounded
resident whose current zone, engine-reported sightline, and navmesh path make
an approach possible. The provider still decides whether that resident's role
and memories warrant approaching. A validated choice creates one short-lived
contact lease; it does not open a conversation, change a stance, or move
institutional pressure. Godot follows the moving player with ordinary
navigation until the safe distance is reached, then starts the existing
preloaded player conversation with the lease id. Walking away until the lease
expires leaves one attributed `not_engaged` fact in the initiator's memory.
That fact may inform a later provider judgment, but the runtime never turns it
into a scripted social consequence. Opportunity epochs and cooldowns are
measured in world time, so this remains event-driven rather than a provider
call per tick.

### Bounded NPC-to-NPC conversation

`talk_to` begins a real two-agent conversation, not a ledger-only notification.
The runtime stores participants, initiator, current speaker, wake/world
revision, an audibility snapshot, and a clean-end flag. The two agents
alternate their own provider-generated utterances for 2–4 total utterances;
after each validated utterance, only listeners present in that audibility
snapshot receive an attributed heard-speech memory. The exchange then ends
cleanly or earlier when either participant stops. One ambient NPC conversation
may be active at a time in M3R; the player-facing lane always has priority.
There is no model-generated transcript summary standing in for the exchange.

## Tool catalog (v2 baseline, ≤ 8 tools)

| Tool | Effect | Validation highlights |
|---|---|---|
| `move_to(place_or_actor)` | Pathfind toward a navpoint/actor; `player` may be offered to one runtime-selected contact candidate | Reachability, role area permissions, current contact lease/zone/cooldown |
| `look(target)` | Add a visible object/actor/record to context | Line of sight, visibility rules |
| `talk_to(actor, intent)` | Open/continue conversation; provider utterance, or a marked deterministic fallback utterance | Target availability (busy/refusing), social rules; scripted lines stay fixture/test-only |
| `wait(reason)` | Yield a beat, keep intent | Always valid; consumes iteration |
| `use_object(object, affordance)` | Trigger an object affordance (serve, mark queue, post notice, pause service) | Affordance exists for role, object state |
| `write_record(kind, source_memory, surface, prose, why, pressure_delta)` | Create/update a provider-authored record (note, correction, report, posting, citation) | Role authority, owned source memory, authored surface, immutable target/visibility, revision check, pressure clamp; exactly one ledger event |
| `read_record(record, why, pressure_delta)` | Load one visible record revision into factual memory | Visibility (열람 rules), first-read idempotency, pressure clamp; rereading the same revision is a no-op |
| `request(actor, action)` | Ask another NPC to act (handoff, confirmation) | Target role can perform the action |

Suspicion judgment of player speech is **not** a tool: it flows through
`judgeConversationTurn` on the proposal port, with rules clamping the delta
and keeping the deterministic classifier as fallback (see
[`../vision/design-pillars.md`](../vision/design-pillars.md)).

## Memory and context bounds

- **Actor memory** = the NPC's own validated actions + ledger events the NPC
  actually observed + attributed utterances the NPC was present to hear
  (visibility/audibility-checked). No omniscient NPCs.
- **Actor policy** = stable goals, priority shifts, action-selection policy,
  forbidden claims. Deterministic data, editable per role.
- Context assembly is a pure function of world state — the same packet shape
  feeds the live provider, deterministic fallback, scripted test adapter, and
  debug transcript.

## Provider involvement

The production loop always calls the selected provider profile first (see
[`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md)), step 2 sends
the observe-packet and receives a `ProposalEnvelope`: at most one tool call
from the offered catalog plus optional utterance text. Validation treats a
provider proposal exactly like a deterministic one — no trust distinction.
Provider unavailable, over budget, or invalid → deterministic fallback decides
and the transcript marks the fallback reason. Scripted proposal sequences are
test adapters only; they are never production storylet content.
Suspicion judgment is model-owned with rule-clamped deltas; authority
*procedure* (thresholds reaching an ending, verdict validity) stays
deterministic. Different models may attempt different valid tools and therefore create
different records; that variation is intended as long as every mutation
passes the same world rules.

The scheduled hearing uses the same port boundary through `judgeHearing`, not
an authored ending table. The model receives the player's final defense and a
normalized view of the six residents' actual memories plus run records and
ledger events. It owns testimony wording, memory-grounded reassessment, and
the verdict after the runtime validates actor/citation identity and the
four-evidenced-vouch eligibility floor. Provider failure produces a marked,
terminal fallback result; it never leaves the run suspended.

## Transcript (player/agent-readable)

Every NPC keeps a rolling transcript of loop iterations: observed context
summary, chosen/proposed tool, validation result, world effect, next-step
change. Exposed two ways:

- **Debug overlay** (dev builds): full transcript per NPC.
- **In-world legibility** (all builds): reaction markers, `보는 단서` (what
  the NPC can see), `들은 말`/`오간 말` (what was heard/exchanged), influence
  cues from source actor to reacting actor, and direction-aware subtitles for
  audible in-world speech. v1 proved these HUD patterns in 3D; the converted
  first-person client re-implements them per
  [`../tech/godot-3d-client.md`](../tech/godot-3d-client.md).

## Spatial validation in 3D

Tool names and semantics are unchanged by the first-person conversion. Their
validators now consume revision-bound 3D facts from the client: `move_to`
reachability resolves through navmesh paths, `look` line of sight through
actor-height physics rays, and `talk_to` audibility through authored shared
volumes and distance. The active milestone owns those exact anchors and
volumes ([`../plan/m3-first-person-town.md`](../plan/m3-first-person-town.md));
the authority split — runtime validates, model proposes — does not move.

## Milestone mapping

- **M1** retained the 2D client and deterministic scenario harness.
- **M2** shipped provider dialogue and next-step proposals together (2 NPCs,
  a blocked result visibly changing a plan, transcript overlay):
  [`../plan/m2-provider-ports.md`](../plan/m2-provider-ports.md).
- **M3 (agent-loop society, 2D frame)** was killed at the 2026-07-11
  boundary; its completed opening slices (merged judgment+reply call,
  thinking state, timer removal) carry forward.
- **The active milestone** scales the proven loop to six event-driven NPCs
  inside the first-person town:
  [`../plan/m3-first-person-town.md`](../plan/m3-first-person-town.md).
