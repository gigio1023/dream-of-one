# Environment Affordance Map

Status: active M1 design artifact
Date: 2026-05-15
Direction source: `docs/direction/15-agentic-social-simulation-model.md`
Prototype target: `docs/direction/16-agentic-prototype-target.md`

## Purpose

This map defines what the Store/Station environment makes possible.

It is not a branch script. It is the set of places, objects, records, visibility
rules, civic pressures, and validation rules that agents can use.

## Environment Cluster

```text
Store entrance / queue
-> Store counter
-> usual-order cue
-> receipt/correction area
-> report handoff area
-> Station intake desk
```

## Objects And Affordances

| Object | States | Affordances | Visible to | Ledger events |
|---|---|---|---|---|
| `store_queue_mark` | empty, player_waiting, delayed, disrupted | wait, observe delay, complain, leave | player, clerk, waiting customer | `queue_state_observed`, `queue_delay_noted` |
| `store_counter` | idle, serving, paused, closed | speak, serve, pause service, resume service, request correction | player, clerk, manager, waiting customer | `service_started`, `service_paused`, `service_resumed` |
| `usual_order_cue` | unread, read, cited | inspect, compare statement, cite expectation | player, clerk, manager | `usual_order_read`, `usual_order_cited` |
| `receipt_tray` | blank, normal, marked, corrected | create receipt, mark receipt, attach correction, inspect | player, clerk, manager | `store_sale_normal`, `store_sale_corrected` |
| `correction_slip` | absent, offered, accepted, refused, attached | offer correction, accept correction, refuse correction, inspect | player, clerk, manager | `correction_offered`, `correction_attached`, `correction_refused` |
| `report_tray` | empty, pending, filed, forwarded | place note, inspect pending report, forward report | clerk, manager, Station; player if visible | `store_exception_reported`, `store_report_escalated` |
| `station_dossier` | absent, opened, cited, corrected, closed | open intake, cite record, request correction, close intake | player, Station officer | `station_record_cited`, `station_correction_recorded` |
| `civic_ledger` | append-only | append validated event, read permitted event, cite event | runtime, permitted agents, evidence export | all ledger events |

## Action Descriptor Contract

Each object above must expose its affordances as action descriptors, not just as
design prose. The descriptor is the shared interface used by player prompts,
role-agent candidate lists, provider packets, validation, and evidence.

Required fields for M1:

| Field | Example | Use |
|---|---|---|
| `actionId` | `receipt_tray.mark_receipt` | stable reference for logs and provider packets. |
| `objectId` | `receipt_tray` | proves the action came from an environment object. |
| `objectState` | `blank`, `marked`, `forwarded` | prevents impossible actions. |
| `eligibleRoles` | `store_clerk`, `station_officer` | keeps role authority explicit. |
| `preconditions` | `player_line_classified:risky` | explains why the action is available. |
| `visibleTo` | `player`, `store_manager` | limits perception and later citation. |
| `ledgerEventKind` | `store_exception_reported` | makes the result replayable. |
| `validationRuleId` | `same_order.store.place_note` | keeps runtime authority inspectable. |
| `failureReasons` | `missing_forwarded_report` | gives useful blocked-action evidence. |

## Civic Economy Values

| Value | Starts | Changes when | Agent use |
|---|---:|---|---|
| `account_credit` | 1-3 | normal or corrected Store sale consumes credit | low credit makes service more formal. |
| `local_trust` | 50 | normal receipt raises; mismatch/report lowers | low trust makes agents rely on records. |
| `record_burden` | 0 | correction/report/inquest adds cleanup burden | high burden makes manager/Station prioritize action. |
| `station_attention` | 0 | forwarded report or hard contradiction raises | high attention opens Station citation/intake. |

These are not broad management stats. They are social pressure that agents can
observe through their role and environment.

## Agent Perception Rules

| Agent | Can perceive directly | Learns later through records | Cannot know |
|---|---|---|---|
| Store Clerk | player line at counter, queue state, receipt state, usual-order cue, local trust | manager action, Station acknowledgement | Station verdict, private player intent, offscreen events. |
| Waiting Customer | queue delay, public speech tone, service pause, clerk/manager visible action | gossip or public report summary if exposed | exact receipt text unless read aloud, Station dossier. |
| Store Manager | clerk note, receipt/correction/report tray, queue disruption, burden | Station request or report acknowledgement | player's private motive, uncited dream truth. |
| Station Officer | filed Store report, ledger citation, player Station answer | later corrections | uncited Store events, player private belief, provider reasoning. |

Perception limits are part of game fairness. Agents can be active without being
omniscient.

## Agent Goal Policies

These are tendencies, not branch scripts.

| Agent | Stable goals | Priority shifts |
|---|---|---|
| Store Clerk | finish service, keep receipt clean, reduce queue delay | if record burden rises, correction or note becomes more attractive. |
| Waiting Customer | keep queue moving, avoid public disruption | if service pauses, complain/leave/witness note becomes more attractive. |
| Store Manager | reduce store liability, keep reports orderly | if burden or attention rises, promote note or file report becomes more attractive. |
| Station Officer | reconcile records, reduce contradiction | if attention rises, cite exact ledger event and narrow answer shape. |

## Validation Rules

Runtime should reject proposed actions when:

- the object does not expose the affordance in its current state;
- the actor cannot perceive the required fact;
- the action exceeds the actor's authority;
- the action would mutate a record without a ledger event;
- the action would erase a prior record;
- the provider invents a new object, record, or authority;
- the action bypasses deterministic Exposure/report/inquest gates.

## Backend Runtime Seed

The current backend seed implements this map in
`backend/npc-runtime/src/runtime/agentic-environment.ts`.
Route-level proof generation lives in
`backend/npc-runtime/src/runtime/same-order-agentic-routes.ts`.

Implemented now:

- canonical Same Order object ids, agent roles, affordances, ledger event
  kinds, and civic economy values;
- environment state factory for the Store/Station cluster;
- role perception through object visibility;
- available action listing scoped by actor perception, object state, role
  authority, and known citable ledger events;
- validated action application with immutable result state;
- rejection for actor mismatch, unseen objects, unavailable affordances,
  over-authority actions, missing why-lines, invalid record mutations, unknown
  ledger citations, hidden citations, and non-Store Station citations;
- integration tests for clean receipt, unavailable affordance rejection,
  available-action scoping, visible queue pressure, exact Store ledger
  citation, Station citation availability, and invalid citation.
- generated agentic route proofs for `clean_cover`, `repair_recovered`,
  `soft_report`, and `inquest_opened`, including action trace, perceived
  objects, ledger events, final object states, civic economy, and exact Station
  citation where applicable.
- provider-shaped action comparison in
  `backend/npc-runtime/src/runtime/same-order-provider-action-comparison.ts`:
  scripted provider proposals must choose from current available actions, cannot
  smuggle authority/state fields, and must preserve the provider-off ledger,
  object-state, and economy outcomes.
- Godot playable slice evidence field `playability.agenticRouteProofs`, written
  by `godot/tools/playable_slice_smoke.gd` and present in
  `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`.
- current playable slice evidence field
  `playability.providerActionComparison`, generated from the backend comparison
  harness and validating the provider-shaped proposal boundary against the
  Same Order route set.
- current playable slice evidence field
  `playability.providerSchedulingPlan`, generated from
  `backend/npc-runtime/src/runtime/same-order-provider-scheduling.ts`, turning
  the provider-shaped route comparison into 12 bounded role-agent jobs with
  available action context, deterministic fallback wording, allowed provider
  fields, forbidden authority fields, and accepted locked actions. This is not
  live Godot dispatch evidence.
- current playable slice evidence field
  `playability.providerDispatchContract`, generated from
  `backend/npc-runtime/src/runtime/same-order-provider-dispatch-contract.ts`,
  turning scheduled jobs into `/v1/npc/decision` packets that pass backend
  schema and bounded behavior while preserving conversation authority guards.
  This is not live HTTP/Godot dispatch evidence.
- current playable slice evidence field `playability.storyletRuntimeMap`,
  generated from
  `backend/npc-runtime/src/runtime/same-order-storylet-runtime-map.ts`,
  binding Same Order beats to prompt ids, route ids, visible objects,
  validated runtime action step ids, scheduled provider job ids, ledger event
  kinds, affordances, and Evidence events. This proves internal storylet/runtime
  alignment, not external comprehension.
- current playable slice evidence field `playability.comprehensionProxy`,
  generated from
  `backend/npc-runtime/src/runtime/same-order-comprehension-proxy.ts`, checking
  C1-C7 pre-playtest readiness while keeping external comprehension open.
- current playable slice evidence field
  `playability.playerComprehensionPlaytestPacket`, generated from
  `backend/npc-runtime/src/runtime/same-order-player-comprehension-playtest.ts`,
  assigning three blind tester routes, debrief questions, scoring anchors, and
  pass thresholds while keeping external comprehension open.
- current playable slice evidence field `playability.visualEvidenceProxy`,
  generated from
  `backend/npc-runtime/src/runtime/same-order-visual-evidence-proxy.ts`,
  checking existing renderer-capture files against the manifest while keeping
  fresh capture and human readability review open.
- current playable slice evidence field `playability.assetBillOfMaterials`,
  generated from
  `backend/npc-runtime/src/runtime/same-order-asset-bill-of-materials.ts`,
  verifying local Kenney CC0 source packs, local license files, procedural
  Store/Station record props, HUD files, and M1 audio scope while keeping fresh
  visual review open.
- Godot session fields `recordObjects`, `civicEconomy`, and `civicLedger`,
  included in playable summary/evidence pack output.
- HUD record-state line showing receipt, correction, report, Station dossier,
  trust, burden, attention, and ledger count.
- Store/Station world prop slots for queue mark, counter, usual-order cue,
  receipt tray, correction slip, report tray, Station dossier, civic ledger,
  and civic economy, with runtime-updated labels, colors, and state metadata.
- Playable slice smoke validation for the world prop snapshot, including
  expected receipt/report/dossier states and civic ledger/economy labels.
- Godot deterministic role-agent actions for Same Order state changes:
  Store Clerk marks receipts, offers/attaches correction, and places notes;
  Store Manager adds the soft-report follow-up or forwards the report; Station
  Officer cites the forwarded Store ledger event. The session exports
  `agentActionLog` with available action candidates, selected action
  descriptors, and selection reasons, and smoke validation requires it to match
  `civicLedger` and prove each selected action was actually available.

Not implemented yet:

- live provider-driven Store Clerk/Manager/Customer/Station dispatch against
  the Godot runtime;
- screenshot/contact-sheet proof;
- fresh-player comprehension proof.

Blocked verification:

- this environment does not expose a `godot` CLI binary, so
  `godot --headless --path godot --script res://tools/playable_slice_smoke.gd`
  still needs to be re-run when Godot is available.

## Same Order Route Mapping

| Route | Environment state | Agent behavior | Ledger |
|---|---|---|---|
| clean cover | queue normal, usual-order cue valid, receipt blank | clerk serves and creates normal receipt; waiting customer remains passive | `usual_order_cited`, `store_sale_normal` |
| repair recovered | receipt marked, correction slip offered/attached, burden small | clerk offers correction; manager does not escalate | `correction_offered`, `store_sale_corrected` |
| soft report | receipt marked, report tray pending, burden medium | manager or customer reacts to unresolved burden/delay | `store_exception_reported` |
| inquest opened | report forwarded, station dossier opened, attention high | Station cites Store ledger and requests correction | `store_report_escalated`, `station_record_cited` |

## Provider Context Shape

When provider-on action proposal is tested, the prompt should receive:

```text
Actor role:
Current location:
Visible objects and states:
Available affordances:
Recent perceived events:
Permitted ledger entries:
Civic economy values visible to the actor:
Stable goals:
Forbidden claims:
Return schema:
```

The provider may choose among available affordances and write wording. It cannot
create new affordances, invent state, or mutate the ledger directly.

## Proof Captures

Required captures for this map:

- Store queue/counter/usual-order cue before dialogue.
- receipt/correction/report objects after clean, repair, soft report, and
  inquest routes.
- agent action log showing perception -> affordance -> validation -> ledger.
- Station dossier citing exact Store ledger event.
- one comprehension note per assigned tester where a fresh player explains
  which object changed, which social actor reacted, and why the Station did or
  did not cite a Store record.
