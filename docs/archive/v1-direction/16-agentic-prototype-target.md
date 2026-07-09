# Agentic Prototype Target

Status: active prototype target
Date: 2026-05-15
Build target: M1 playable proof, not vertical slice
Direction source:

- `docs/direction/13-operation-sim-quality-floor.md`
- `docs/direction/14-minimal-civic-economy-model.md`
- `docs/direction/15-agentic-social-simulation-model.md`
- `docs/direction/17-agent-loop-runtime-pivot.md`
- `docs/research/simulator-benchmarks/2026-05-17/00-environment-agent-interface-benchmarks.md`
- `docs/research/simulator-benchmarks/2026-05-17/01-broader-game-environment-agent-patterns.md`
- `docs/scenario/content/environment-affordance-map.md`

## Target

The next prototype should prove Dream of One as a conversation-centered
`NPC_TOOL_LOOP` simulation, not as a hand-authored conversation branch and not
as a longer list of fixed social consequences.

The player enters a small authored social environment. The current Store/Station
scene is only a tiny example cell, not the game premise. It should stay compact
enough to replace with another environment later. The real target is a reusable
pattern: procedures, objects, records, visibility, crude economy values, and
social pressure that NPCs can use according to role, memory, goals, and
perception. The runtime validates their tool calls and writes ledger events.
NPCs should observe, call tools, read results, and choose the next step over
multiple iterations.

The prototype should feel closer to the researched low-budget operation
simulators in density:

```text
walk into a workplace
-> read or notice a procedure
-> speak to a worker
-> see objects/records change
-> watch another social actor react
-> see the institution cite the result
```

But the fantasy is not store management or station procedure. The fantasy is
being a person whose speech becomes socially expensive inside an environment
where other people keep trying things, talking, waiting, refusing, requesting,
and adapting through tools.

## Player Promise

In the prototype, the player should be able to say:

```text
I was not solving a case.
I was trying to pass as normal in a working place.
My words changed a record.
Other people reacted because that record affected their work.
The Station later used the record against me.
```

## Core Loop

```text
Enter environment
-> perceive normal procedure
-> speak under expectation
-> environment records or rejects the speech
-> agent reacts through available affordance
-> tiny economy or ledger value changes
-> another agent notices the change
-> authority or social pressure cites the prior record
-> player repairs, complies, refuses, or escalates
```

Conversation remains the primary player action. Object and agent systems exist
to make speech, repair attempts, typed statements, and delayed answers socially
consequential.

## Architecture Target

Before adding another authored social chain, the prototype must prove
`agent_loop_probe_v0`:

```text
one NPC
one other NPC
one object or record
five or fewer tools
three to six observe/tool/result iterations
player/Codex-readable transcript
```

The important proof is that the NPC did not simply follow a route-specific
sequence. It used generic tools, saw a result such as busy/refused/blocked, and
chose a reasonable next step.

## Production Rule

Build this like a fast playable social-sim prototype, not a waterfall design
project. Each increment should add one small environment truth and prove it:

- one NPC tool loop with a visible result;
- one programmatic dialogue availability or busy-state result;
- one movement/look/talk/wait/request sequence that changes what the NPC does
  next;
- one player-readable transcript showing the loop.

Do not add a bigger Store management layer or deeper Station bureaucracy unless
it directly proves the reusable NPC social simulation. Prefer a tiny running
proof over a broad design plan.

Do not use "one more NPC reads a record and reacts" as the default increment.
That pattern has already proven enough for scaffolding. The next value is
iteration.

## Codex Gameplay QA Interface

Codex should be able to help finish the game by playing and inspecting the
running build, not by adding large test scaffolds. Each active proof cell should
expose a small gameplay probe that lets Codex:

- list bounded player actions it can execute;
- apply those actions in the real Godot scene;
- read HUD state, environment props, civic economy, ledger entries, and NPC
  role-action logs;
- check whether player speech or delay changed records that another NPC then
  used;
- write a JSON artifact that a developer can inspect before manual playtest.

The first implementation is `godot/tools/codex_gameplay_probe.gd`. It drives the
Same Order scene through the stable `PlayableSession.debug_codex_gameplay_action`
and `PlayableSession.debug_codex_gameplay_snapshot` API: counter focus,
conversation start, delayed answer, risky line, and typed free input. It then
verifies that the Store Clerk records the line, the Store Manager forwards the
Store record, and the Station Officer cites the exact ledger entry. The same
probe also checks the live HUD consequence line that spells out
speech/delay -> Store record -> report handoff -> Station citation before the
result panel. This is not a replacement for human comprehension notes. It is
the lightweight interface Codex should use to keep development grounded in the
playable game.

## Environment Requirements

M1 requires one small environment cluster. Store/Station can satisfy this for
now, but the requirement is generic: each environment needs places, props,
records, role actions, and visible feedback.

| Area | Required affordances | Purpose |
|---|---|---|
| Store entrance/queue | wait, observe queue, notice delay, leave, complain | makes the conversation public. |
| Store counter | speak, serve, pause service, request correction | makes conversation a workplace operation. |
| usual-order cue | inspect, compare, cite expected order | makes normality readable before risk. |
| receipt/correction area | create receipt, mark receipt, attach correction, inspect | makes speech become a record object. |
| report handoff area | place note, forward report, inspect pending report | makes local mismatch travel. |
| Station intake | cite dossier, request correction, close or escalate intake | makes society formalize the prior record. |

The environment may be visually simple, even toy-like. It must not be
semantically empty.

Each required object must also expose the same action descriptor to UI, agents,
provider packets, validators, and evidence. A Store counter interaction that
only exists in dialogue text is not enough. The counter, receipt tray, report
tray, civic ledger, and Station dossier must each answer:

- what can be done here;
- which role may do it;
- what state makes it available;
- what record or civic economy value it changes;
- what validation rule accepts or rejects it;
- what visible feedback tells the player it happened.

Do not encode these answers as per-choice result labels. The current target is
an environment tool catalog: the player speaks, the Store/Station state changes,
the role agent chooses from available object tools, and the runtime validates
the proposal.

## Agent Requirements

The old M1 proof required three social agents:

| Agent | Role goal | Perception | Must prove |
|---|---|---|---|
| Store Clerk | keep service moving and receipts clean | counter, queue, usual-order cue, current receipt | can choose normal receipt, correction, pause, or note depending on player speech and burden. |
| Store-side actor: Manager or Waiting Customer | protect store liability or queue normality | queue pressure, visible note, clerk behavior, local trust/burden | reacts to unresolved burden without omniscient knowledge. |
| Station Officer | reconcile unresolved records | Station dossier, Store ledger entries, player statement | cites exact Store record and asks a constrained reconciliation question. |

Agents are not required to be live LLM in M1. Deterministic policies can prove
the environment-agent loop first. Provider-on behavior is a later comparison
unless it preserves provider-off outcomes.

The next agent-loop proof is smaller and more important than adding another
actor:

| Requirement | Meaning |
|---|---|
| one controlled agent | enough to prove iterative choice. |
| one counterpart NPC | enough to prove talk availability and response state. |
| one object or record | enough to prove tool use is grounded in the world. |
| blocked result | enough to prove the agent responds to feedback. |
| transcript | enough for player/Codex to inspect what happened. |

## State Model

The prototype needs these state families:

| State | Examples | Why it matters |
|---|---|---|
| environment object state | queue normal/delayed, receipt blank/normal/marked/corrected, report tray empty/pending/filed | lets agents discover affordances. |
| tiny economy | `account_credit`, `local_trust`, `record_burden`, `station_attention`, tokens, delay, or simple points | creates social pressure without broad economy. |
| actor memory | observed line, visible record, private note, trusted actor | prevents omniscience. |
| civic ledger | `store_sale_normal`, `store_sale_corrected`, `store_exception_reported`, `store_report_escalated`, `station_record_cited` | makes consequences replayable and citable. |
| validation result | accepted, rejected, fallback, reason | keeps runtime authority inspectable. |

## Runtime Seed

The first backend seed now lives in
`backend/npc-runtime/src/runtime/agentic-environment.ts`, with integration
coverage in
`backend/npc-runtime/test/integration/agentic-environment.integration.test.ts`.
Route-level backend proof now lives in
`backend/npc-runtime/src/runtime/same-order-agentic-routes.ts`, with
integration coverage in
`backend/npc-runtime/test/integration/same-order-agentic-routes.integration.test.ts`.

It proves the smallest environment-action contract:

- Store Clerk can turn a clean Same Order line into a normal receipt ledger
  event.
- Waiting Customer can react to visible queue delay without knowing Station
  facts.
- Station Officer can cite an exact known Store ledger event.
- Station Officer cannot cite hidden or non-Store events.
- unavailable affordances are rejected before they mutate records.
- available actions can be listed from the current environment state, scoped by
  actor perception, role authority, object state, and known citable ledger
  events.
- available actions now carry descriptor fields such as `actionId`,
  `eligibleRoles`, `visibleTo`, `preconditions`, `validationRuleId`,
  `failureReasons`, and `civicEconomyEffects`, so the same environment tool
  catalog can feed UI, agents, provider packets, validation, and evidence.
- provider-shaped action proposals can be compared against the provider-off
  route baseline: proposals must choose from available actions, cannot include
  unsupported authority/state fields, and must preserve ledger, object-state,
  affordance provenance, and civic economy outcomes.
- clean, repair, soft report, and inquest route proofs can be generated from
  validated environment actions and attached to the existing Godot Evidence Pack
  shape without breaking current route proof validation.
- backend civic ledger events now retain the accepted `affordance` as part of
  the ledger event, so a replay can explain not only what record changed, but
  which validated action created that record.
- `godot/tools/playable_slice_smoke.gd` now writes `playability.agenticRouteProofs`
  alongside the existing Same Order `routeProofs`, and the current playable
  slice artifact includes those proofs with `ledgerEventKinds` and matching
  `ledgerAffordances`.
- Agentic route proofs now carry `socialObservationTrace` for the small
  society increment: Store Manager reacts to Store Clerk records and local
  burden before soft report/escalation, then Station Officer cites the forwarded
  Store record before inquest. This keeps the proof focused on NPCs using the
  environment, not on adding a larger Store simulator.
- The same trace is now visible in the Godot playable summary, HUD record line,
  terminal outcome copy, and visual capture manifest. The player-facing proof
  now shows who read whose record before acting; it is not just backend
  validation metadata.
- `godot/scripts/runtime/playable_session.gd` now carries `recordObjects`,
  `civicEconomy`, `civicLedger`, and `socialObservationTrace` in `build_summary()` and
  `build_evidence_pack()`.
- `godot/scripts/ui/social_stealth_hud.gd` now renders a compact Store record
  line for receipt, correction slip, report tray, Station dossier, local trust,
  record burden, Station attention, ledger count, latest ledger event, and
  responsible actor role/action.
- `godot/scripts/ui/social_stealth_hud.gd` now exposes a typed input field
  during conversation, and `godot/scripts/runtime/playable_session.gd` routes
  submitted text into the existing deterministic free-input Evidence path.
- `godot/scripts/runtime/playable_session.gd` now records response hesitation as
  deterministic `response_hesitation_noted` Evidence, so waiting too long in a
  routine prompt can become a Store uncertainty record without provider
  authority.
- `godot/tools/playable_slice_smoke.gd` and `godot/tools/visual_capture.gd`
  now drive the inquest route through that HUD typed input field. Current
  latest-Godot smoke/capture artifacts prove the typed free-input path, current
  record props, response-hesitation Evidence, latest ledger actor/action, and
  investigation trail.
- `godot/scripts/runtime/playable_session.gd` now shows the cited Store ledger
  ID in the Station inquest outcome panel, and `godot/tools/playable_slice_smoke.gd`
  checks that the player-facing outcome explains the citation.
- The legacy recorded-statement fallback remains internal only; active HUD copy
  and capture expectations now prioritize typed input for the player-facing
  route.
- `godot/scripts/world/world_generator.gd` now spawns Store/Station record prop
  slots for queue mark, counter, usual-order cue, receipt tray, correction
  slip, report tray, Station dossier, civic ledger, and civic economy.
- `godot/scripts/runtime/playable_session.gd` now updates those prop labels,
  state metadata, colors, latest civic-ledger entry, responsible actor role, and
  validated action from `recordObjects`, `civicLedger`, and `civicEconomy`;
  `godot/tools/playable_slice_smoke.gd` now validates the world prop snapshot
  in addition to HUD state.
- `godot/scripts/runtime/playable_session.gd` now routes Same Order state
  changes through deterministic role-agent actions: actor role, perceived
  objects, affordance availability, role authority, record id, cited ledger
  event, and why-line are checked before object state or civic ledger mutation.
- `godot/data/world_layout.json` now includes a Store Manager actor, and
  `godot/tools/playable_slice_smoke.gd` expects `agentActionLog` to match
  `civicLedger`, with a Store Manager action on soft report and a Station
  Officer `cite_record` action on inquest.
- `agentActionLog` now includes the available action candidates and
  selection reason captured at the moment of each accepted action, so the proof
  can distinguish "this branch fired" from "this role chose a valid
  environment affordance." The next Godot smoke also requires
  `selectedActionDescriptor` plus `actionId`, `eligibleRoles`, `visibleTo`,
  `preconditions`, `validationRuleId`, and `failureReasons` on available
  actions, matching the backend/provider action descriptor contract.
- `backend/npc-runtime/src/runtime/same-order-provider-action-comparison.ts`
  now records a provider-shaped comparison lane for the Same Order routes, and
  the playable slice artifact carries `playability.providerActionComparison`.
- `backend/npc-runtime/src/runtime/same-order-provider-scheduling.ts` now
  records a provider scheduling contract for 27 bounded role-agent jobs, and
  the playable slice artifact carries `playability.providerSchedulingPlan`.
  The scheduled job prompt context carries action descriptors, recent ledger
  event kinds, and matching affordances, so provider wording sees the validated
  action trail without gaining state authority. This proves the job shape and
  authority boundary, not live Godot dispatch.
- `backend/npc-runtime/src/runtime/same-order-provider-dispatch-contract.ts`
  now records a provider dispatch packet contract for `/v1/npc/decision`, and
  the playable slice artifact carries `playability.providerDispatchContract`.
  Dispatch packets preserve the same recent affordance trail in
  `organizationContext` and `recentEvents`. This proves schema-safe backend
  packet shape, not live HTTP dispatch.
- `backend/npc-runtime/src/runtime/same-order-comprehension-proxy.ts` now
  records a proxy dry run for C1-C7 comprehension checks, including whether
  validated actions remain readable through route proofs, provider scheduling,
  and dispatch packets. The playable slice artifact carries
  `playability.comprehensionProxy`. This is pre-playtest readiness evidence,
  not external player proof.
- `backend/npc-runtime/src/runtime/same-order-player-comprehension-playtest.ts`
  now turns that readiness evidence into a blind three-tester comprehension
  packet, and the playable slice artifact carries
  `playability.playerComprehensionPlaytestPacket`. This defines route
  assignments, questions, latest-ledger actor-role/validated-action checks, scoring
  anchors, and thresholds; it is not completed external player proof.
- `backend/npc-runtime/src/runtime/same-order-visual-evidence-proxy.ts` now
  verifies existing renderer capture artifacts against the manifest, and the
  playable slice artifact carries `playability.visualEvidenceProxy`. This is
  existing-capture evidence, not fresh screenshot proof.
- `backend/npc-runtime/src/runtime/same-order-asset-bill-of-materials.ts` now
  verifies the Store/Station asset bill of materials, and the playable slice
  artifact carries `playability.assetBillOfMaterials`. This proves source and
  license discipline, not fresh visual readability.

This does not yet prove live provider dispatch inside Godot or completed
fresh-player comprehension. The deterministic Godot
role-agent path, backend provider-shaped comparison lane, provider scheduling
contract, provider dispatch packet contract, comprehension proxy, playtest
packet, and world prop pass are implemented in code, and the current evidence
JSON has been updated with the expected inquest, provider comparison, provider
scheduling, provider dispatch, proxy comprehension, playtest packet, visual
proxy, asset BOM, and social observation snapshots. Current proof uses
the per-device `GODOT_BIN` Godot CLI; do not hardcode a historical local
binary path as an active command.

## Required Routes

The prototype should preserve the existing Same Order route contrast, but each
route must now include environment and agent evidence.

| Route | Player behavior | Required social reaction |
|---|---|---|
| `clean_cover` | accepts usual order and confirms record | Clerk creates normal receipt; no other actor escalates. |
| `repair_recovered` | admits uncertainty, then accepts correction | Clerk attaches correction; trust drops slightly; burden remains visible but does not require Station. |
| `soft_report` | breaks routine but avoids hard dream language | Store-side actor notices unresolved burden or delay; Store report exists without immediate inquest. |
| `inquest_opened` | contradicts record or uses dream/outside language | Store report escalates; Station cites exact ledger event. |

## Dialogue Design

Dialogue is the main interface, but dialogue should not carry the whole game
alone. A dialogue choice is a speech input, not a hardcoded NPC action.

Each player line must connect to:

- the environment object and tool catalog available around it;
- the observation, signal, record, or object state it changes;
- the actor that perceives the changed state;
- the economy value it affects;
- the validated tool call and ledger event an NPC may create or avoid;
- the Station citation it may enable.

This prevents "LLM chat" drift. The player is speaking inside a working
environment.

## Provider Strategy

M1 default: provider-off deterministic simulation.

Provider-on is allowed only as a comparison lane:

- same affordances;
- same validation rules;
- same ledger outcomes;
- varied wording, tone, preoccupations, and ambient chatter.

Provider must not:

- invent new records;
- create new affordances;
- change route thresholds;
- decide Station outcome;
- hide state changes outside the ledger.

## Prototype Quality Floor

To meet the low-budget operation sim benchmark, the prototype must have:

- a workplace players can navigate;
- interactable procedure cues;
- at least three meaningful record objects/states;
- visible agent reaction beyond one dialogue response;
- a compact status/record UI;
- route replay with different social outcomes;
- a ledger or evidence export;
- screenshots/contact sheet showing object and UI changes;
- a fresh-player comprehension note.

This is still small. It is not a full town, economy, staff system, or campaign.

## Proof Checklist

| Proof | Evidence required |
|---|---|
| Environment is readable | screenshot/contact sheet showing queue/counter/cue/receipt/report/Station elements. |
| Conversation drives state | route evidence showing selected line -> object state -> ledger event. |
| Agents use environment | log showing actor perception, available affordance, proposed action, validation result. |
| Society reacts without branch table | at least two routes where another actor reacts differently to the same environment objects and values. |
| Economy creates pressure | ledger shows trust/burden/attention changes and the player can explain why. |
| Authority or social pressure formalizes record | UI/capture cites the exact prior ledger event. |
| Provider boundary holds | provider-off route passes; provider-on if enabled preserves same ledger outcomes. |
| Player understands premise | fresh player or proxy explains normal procedure, changed record, social reaction, and later citation. |

## Implementation Order

1. Author the environment affordance map.
2. Add or update runtime schema for environment object states and ledger events.
3. Implement one deterministic agent tick for the current example role.
4. Add one other actor reaction to record burden, delay, trust, or a simple token.
5. Add one later citation from the ledger.
6. Update HUD/record panel to show object and ledger changes. `PARTIAL`:
   deterministic role-agent action log, compact record-state line, and
   Store/Station world prop slots exist; latest-Godot smoke and renderer
   capture are current, while external comprehension remains open.
7. Capture route proof and screenshots.
8. Run comprehension dry run.
9. Only then evaluate provider-on wording/action proposal.

## Cut Rules

Cut until M1 proof passes:

- more locations;
- full product inventory;
- dynamic prices;
- staff scheduling;
- full offscreen town;
- always-on LLM citizens;
- freeform provider state mutation;
- public AI/Codex marketing claim.

## Director Verdict

| Question | Verdict |
|---|---|
| Is this the correct prototype target for the active goal? | `READY` |
| Is the current build already there? | `NOT_READY` |
| Should implementation start from environment affordance map and ledger schema? | `READY` |
| Should broad social simulation wait? | `YES` |
