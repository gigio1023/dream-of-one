# World and Social Simulation

> Rewritten 2026-07-11 for the approved first-person 3D conversion (owner
> direction block in
> [`../vision/design-pillars.md`](../vision/design-pillars.md)). The record
> and visibility rules are unchanged authority; the town, cast, and time
> model are new.

## The town

One seamless first-person 3D town block: a central park, three enterable
single-story buildings, and connective street space. The player walks between
outside and every interior with no loading screen. Every visible building is
enterable — the map is closed by vegetation, walls, terrain, and sightline
composition, never by fake facades — so the visible building count stays
minimal.

| Location | Role | Key anchors |
|---|---|---|
| **Park** (공원) | Shared public center: meetings, idling, overheard speech | Benches, crossing paths; a reserved site for M4's notice board |
| **Studio reception** (스튜디오) | Ordinary first procedure: reception and review/approval premise | Reception desk, waiting seats, review records |
| **Office** (사무실) | Second ordinary workplace; records and confirmations | Desks, filing, street door |
| **Station** (스테이션) | Authority: intake, citation, interrogation, and the run-ending hearing | Intake desk, dossier, hearing room |

The Store is retired: a studio reception needs only people, desks, doors, and
records — no products, prices, or inventory behavior. The Station stays a
formal escalation space, never the ordinary first interaction.

Layout stays data-driven: semantic landmarks, zones, and anchors live in
`godot/data/world_layout.json`, re-expressed in 3D coordinates for the
converted client ([`../tech/godot-3d-client.md`](../tech/godot-3d-client.md)).

## The six residents

Exactly six persistent NPCs, all running the same event-driven agent loop
([`npc-agent-loop.md`](npc-agent-loop.md)) regardless of player distance.
Working role split — exact identities, relationships, secrets, and voices are
authored in a content slice with owner approval:

| Role | Anchor | Social function |
|---|---|---|
| Studio receptionist | Studio desk | Ordinary questioning; first procedure |
| Studio manager | Studio back room | Turns exceptions into records; escalation threshold |
| Office worker | Office | Confirmations, workplace gossip node |
| Park regular / caretaker | Park | Public witness; soft warnings before escalation |
| Station officer | Station | Formalizes reports; runs interrogation and the hearing |
| Roaming liaison | Everywhere on schedule | Mobile social bridge; carries words between buildings |

Schedules move residents between locations, creating natural meeting windows
and witnesses. No NPC reads as furniture permanently locked behind a desk.

## Records and visibility (unchanged authority)

Records are the explicit administrative medium (see
[`glossary.md`](glossary.md)); interpersonal belief still moves through real
speech. Rules:

- Every record has: kind, author role, target, state body, visibility list
  (열람 — which roles can read it), and a ledger event.
- NPCs only know what they authored, observed, heard, or read — visibility is
  enforced at context-assembly time, not by convention.
- The player can inspect any visible record and see its state, the latest
  ledger event that touched it, and which roles can read it. Legibility of
  the record chain is a pillar-3 requirement, not a debug feature.

## Speech, hearing, and subtitles

NPC speech and monologue happen in the world. When audible to the player,
direction-aware subtitles reveal the words naturally; there is no separate
"eavesdrop" mode. The player may miss off-screen speech entirely — the
runtime preserves what each NPC actually heard without ever making the player
omniscient. When the player later encounters a change caused off-screen, it
must arrive with provenance (`speaker → listener → source memory → why`):
an NPC repeats it and cites who said it, or an explicit record shows its
author and source. The game need not notify the player of hidden events before
they encounter their consequences (legibility contract, pillar block
2026-07-11).

## Stances and the hearing

Each NPC holds a **stance** toward the player — a legible, vouch-relevant
state built from that NPC's real memories, judged by the model and clamped by
rules like every other judgment. It is the coarse player-facing form of the
existing per-NPC opinion (`oppose`, `uncertain`, `vouch`), not a third score.
Stances move only when a conversation changes what the NPC believes; contact
and record-reading alone move nothing. A `vouch` also requires a meaningful
first-hand conversation with the player. At the scheduled hearing, four of
six vouches are the eligibility floor; the model still judges the pooled
memories after the player's final defense, and the runtime only validates
provenance, counts the quorum, and validates procedure. If that live judgment
is unavailable, the hearing visibly interrupts without a verdict. The
open-questions/rumor-log surface shows the player which stances and open
doubts they have actually encountered — never hidden content.
Each judged follow-up receives the exact question tracked from the prior turn.
A direct answer or an honest statement of the player's knowledge limit resolves
that question; it may stay open only when the exchange leaves it materially
unanswered, and it may be replaced only by a different grounded question. A
vouch closes the conversation unless such a question still warrants an
immediate answer, so a stale doubt cannot force filler turns.

## Propagation (how information travels)

Interpersonal claims move only through real conversations: an NPC that
observed something chooses whom to tell, produces an actual utterance, and
the listener remembers the attributed words. There is no `inform` tool, no
scripted gossip chain, and no off-screen summary system that pretends speech
occurred. Administrative records are a separate explicit path: an authorized
NPC may write a record and another role may deliberately read it, which can
change factual memory and institutional pressure. Record-reading never stands
in for a personal conversation and cannot directly change stance. The
canonical escalation chain — observation → real exchange or explicit note →
validated report → Station procedure — survives as a regression case,
re-derived from tools, visibility, speech, and role goals rather than scripted
ordering.

## State kept deliberately small in M3R

The active game exposes only two social layers: each resident's coarse stance
and one institutional-pressure state built from validated reports. Numeric
per-NPC suspicion may remain an internal judgment input and F3 diagnostic, but
it is not a second public meter beside stance. The older local-trust,
record-burden, favor, and civic-economy hypotheses are deferred to M4 and land
one at a time only if a played social decision needs them. This keeps the LLM
context and the player's mental model centered on conversation.

## Continuous time and schedules

- World time is continuous during free exploration and fully paused while the
  player is inside a modal conversation, including its merged LLM wait
  (thinking and typing never cost anything). Ambient NPC provider work is
  asynchronous and never pauses free exploration; any returned proposal is
  revalidated against the current world revision, and its effect waits until
  the modal pause ends if necessary.
- NPC schedules define anchor blocks (workplace hours, park breaks, rounds)
  whose intersections are the meeting windows where NPC-to-NPC conversations
  — and therefore belief movement — happen. Interception windows, announced
  intentions ("금요일까지 정리하겠습니다"), and the hearing date are the
  pressure surface; there are no decay bars and no busywork timers.
- A short grace period opens each run before the first consequential NPC
  meeting, so the player is never already losing at spawn.

## Save/load boundary (next milestone)

A run is the unit of persistence: world layout, records, ledger, stances,
NPC memory snapshots. Mid-conversation state is not saved — saves resume at
beat boundaries. Pulled forward only if runs outgrow one sitting.
