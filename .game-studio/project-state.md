# Game Studio Project State

Last updated: 2026-05-18

This file records how Game Studio guidance is applied to Dream of One. It does not replace `.game-harness/`, which remains the current execution harness for M1 handoffs, reviews, evidence, and drift.

Long-running Codex work now uses `.game-harness/goal-loop-state.md` as the
compact resume checkpoint. This borrows the useful Ralph pattern of prompt,
task list, state, proof, and exit gate without adding a separate `.ralph/`
runtime or changing the Game Studio operating model.

## Routing

- **Entry mode**: `direction-carry-in`.
- **Reason**: `docs/direction/` already defines the thesis, pillars, roadmap, council, player targets, release strategy, and role model.
- **Direction authority**: The human owns taste, Direction Lock, stage movement, and public promises.
- **Install decision**: Preserve the existing direction and audit proof gaps instead of starting a new concept slate.

## Selected Profiles

| Profile | Selection | Project alignment |
|---|---|---|
| Engine | `godot` | Active Runtime Path is Godot 4.x with a TypeScript NPC backend. |
| Scope | `solo-indie` primary | Codex acts as a force multiplier, and lean written verdicts replace meetings. |
| Scope overlay | `small-team` role model | Work still names Game Director, Systems, Godot, Narrative, QA, and Producer lanes. |
| Genre | `social-stealth` | NPCs, local institutions, and authority systems watch the player through dialogue, suspicion signals, reports, Exposure, and verdict pressure. |
| Genre method | `simulation` overlay | Current planning borrows simulator grammar: procedure cues, watcher, record, repair, and formal citation. |
| Genre overlay | `narrative-ai` | API proposal providers may generate bounded wording only, while deterministic rules own actions and consequences. |
| Review mode | `lean` | Require focused role verdicts at gates, not large process artifacts. |
| Decision mode | `agentic` with human authority | Agents may execute scoped work, but cannot lock direction, move stages, or make public promises. |

## Runtime Carry-In

- **Godot root**: `godot/`.
- **Main scene**: `godot/scenes/main.tscn`.
- **Runtime data**: `godot/data/world_layout.json`.
- **Backend root**: `backend/npc-runtime/`.
- **Runtime Schema**: `backend/npc-runtime/src/godot/runtime-schema.ts`.
- **Evidence output**: `data/evidence/godot/`.

Godot owns scene presentation, player and NPC movement, 3D collision or navigation observations, visual hierarchy, dialogue UI, and player input capture. Backend/runtime owns deterministic validation, conversation memory, suspicion signals, social reports, fallback selection, Exposure thresholds, Station intake, Inquest, verdict, and session termination.

Production priority is game-first. When a session finds a missing piece, choose
the smallest playable implementation that makes Dream of One more coherent:
clearer social role behavior, environment use, record transformation, visible
consequence, or player-facing pressure. Tests, AI-play probes, and Evidence
records should be attached to that implementation, not treated as the
implementation itself.

Direction reset: Dream of One should be treated as an open social environment,
not as a Store/Station game. Store/Station and `Same Order` remain useful only
as ultra-small samples for proving the wider loop: an NPC notices, uses an
affordance, creates or changes a record, another actor reacts, and the player
can read the consequence. Keep the sample thin enough to throw away or replace.
A crude economy is acceptable when it makes one social choice visible. Default
future work should ask which small open-environment affordance or social
reaction is missing, not how to deepen Store operations, Station procedure, or
business-sim systems.

Because this game is being built by AI coding agents, the active proof cell also
needs an AI-play QA surface. Codex must be able to run the scene, list callable
player actions, perform bounded player actions, submit typed text when the slice
supports it, inspect player-visible HUD/world/ledger/NPC state, and write a
readable run artifact from the actual play session. Treat that as production
infrastructure for the game, not as replacement player research. For
player-view questions, prefer a fast Codex gameplay probe over adding more test
code; keep tests for deterministic authority, schema compatibility, provider
boundaries, route evidence, and regressions. If an AI-play interface gap and a
gameplay gap compete, implement the smallest gameplay slice first, then expose
only the public action/snapshot data needed to verify it.

## Current Stage

Dream of One is before a trustworthy vertical slice. The active director-level target is M1 Conversation Protocol Proof.

| Item | Current state |
|---|---|
| M0 Thesis Lock | Mostly established; future director decisions still need ledger entries. |
| M1 Conversation Protocol Proof | Local technical proof passing; product closure pending. |
| M1 goal | Prove NPC prompt -> three choices plus typed-free-input contract -> deterministic suspicion signal -> record/social consequence in a tiny open-environment example. |
| M1 current handoff | `.game-harness/milestones/M1-implementation-handoff.md`. |
| M1 harness source | `.game-harness/milestones/M1-protocol-proof.md`. |
| Broad vertical slice | Blocked until M1 product closure. |

Current M1 carry-in:

- evidence contract is defined.
- M1 implementation handoff is drafted.
- M1 content/runtime contract is drafted.
- initial council review is completed with conditions.
- dirty worktree scope is recorded.
- role reviews have reached a conditional product-gate pass for fallback-only
  M1; QA/Producer remain conditional on external fresh-player comprehension.
- current Store/Station proof remains a sample implementation, not the desired
  long-term content focus. Future work should extract reusable
  environment-agent patterns instead of deepening Store operations or Station
  procedure.
- Station Soft Inquest smoke is internal authority/Evidence harness evidence, not the target player-facing conversation loop.
- `Same Order` playable smoke now proves clean cover, repair recovery, soft
  report, and hard inquest routes. The hard route includes response hesitation,
  authored risky dialogue, and typed free input through the current HUD/player
  action path before deterministic suspicion/report -> Station inquest ->
  session end.
- backend tests preserve conversation Evidence fields and prevent same-NPC conversation turn coalescing.
- backend seed `backend/npc-runtime/src/runtime/agentic-environment.ts`
  now proves the first Same Order environment-action contract: role visibility,
  available action candidates, affordance validation, civic economy deltas,
  ledger events, and exact Store record citation by Station.
- backend route proof seed
  `backend/npc-runtime/src/runtime/same-order-agentic-routes.ts` now generates
  clean, repair, soft report, and inquest agentic route proofs and verifies
  they can be attached to the existing Godot Evidence Pack shape.
- backend provider comparison seed
  `backend/npc-runtime/src/runtime/same-order-provider-action-comparison.ts`
  now proves provider-shaped action proposals must choose available actions,
  reject unsupported state/authority fields, and preserve provider-off ledger,
  object-state, and civic economy outcomes.
- backend provider scheduling seed
  `backend/npc-runtime/src/runtime/same-order-provider-scheduling.ts` now
  turns that comparison into 24 bounded Store Clerk, Waiting Customer, Park
  Witness, Store Manager, and Station Officer role-agent provider jobs. Each
  job carries available action context,
  allowed provider fields, forbidden authority fields, deterministic fallback
  wording, and the accepted locked action; live Godot dispatch remains
  unverified.
- backend provider dispatch seed
  `backend/npc-runtime/src/runtime/same-order-provider-dispatch-contract.ts`
  now turns scheduled jobs into `/v1/npc/decision` packets that parse as
  `PerceptionPacket`, pass bounded behavior, preserve conversation authority
  guards, and keep live HTTP dispatch unverified.
- Godot playable slice evidence now includes `playability.agenticRouteProofs`
  in `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`,
  and `godot/tools/playable_slice_smoke.gd` writes the same field on future
  smoke runs.
- The current playable slice artifact also includes
  `playability.providerActionComparison`; this is a backend contract proof, not
  live provider availability inside Godot.
- The current playable slice artifact also includes
  `playability.providerSchedulingPlan`, and the harness note lives at
  `.game-harness/provider/same-order-provider-scheduling-contract-2026-05-16.md`;
  this is scheduling contract evidence, not live Godot provider dispatch.
- The current playable slice artifact also includes
  `playability.providerDispatchContract`, and the harness note lives at
  `.game-harness/provider/same-order-provider-dispatch-contract-2026-05-16.md`;
  this is backend dispatch packet evidence, not live Godot HTTP dispatch.
- The current playable slice artifact also includes
  `playability.storyletRuntimeMap`; this binds the Same Order storylet beats to
  prompt ids, route ids, visible objects, runtime action step ids, scheduled
  provider job ids, ledger event kinds, affordances, and Evidence event names.
  This is internal storylet/runtime alignment proof, not player comprehension.
- The current playable slice artifact includes `playability.comprehensionProxy`
  and the harness note
  `.game-harness/comprehension/same-order-comprehension-proxy-2026-05-16.md`;
  this proves pre-playtest readability of the cause chain, not external player
  comprehension.
- The current playable slice artifact includes
  `playability.playerComprehensionPlaytestPacket` and the harness note
  `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`;
  this defines the blind three-tester protocol, route assignments, questions,
  scoring anchors, and pass thresholds while keeping external comprehension
  open.
- The current playable slice artifact includes `playability.visualEvidenceProxy`
  and the harness note
  `.game-harness/visual/same-order-visual-evidence-proxy-2026-05-16.md`;
  this verifies existing renderer-capture artifacts, not fresh screenshot proof.
- The current playable slice artifact includes `playability.assetBillOfMaterials`
  and the harness note
  `.game-harness/assets/same-order-asset-bom-2026-05-16.md`; this verifies
  local CC0 Kenney source packs, project-authored procedural record props, UI
  files, and M1 audio scope while keeping fresh visual proof open.
- Godot session summary/evidence now carries `recordObjects`, `civicEconomy`,
  and `civicLedger`, and the HUD renders a compact Store record-state line for
  receipt/correction/report/dossier plus trust, burden, attention, and ledger
  count.
- Godot world generation now spawns Store/Station record prop slots for queue
  mark, counter, usual-order cue, receipt, correction, report tray, Station
  dossier, civic ledger, and civic economy; the playable session updates their
  labels, colors, and state metadata; playable slice smoke now validates the
  world prop snapshot.
- Godot Same Order state changes now pass through deterministic role-agent
  validation and export `agentActionLog`: Store Clerk mutates receipt,
  correction, and report records; a Waiting Customer can read a normal receipt
  and accept the routine so the queue settles, read a marked receipt and keep
  the queue locally wary without opening a report, react to a clerk note by
  adding toy queue pressure, read an attached correction slip and accept the
  repair, read a paused-service record and leave the queue, or read a Station
  citation and refuse contact with the player;
  a Park Witness can turn a routine queue record into public social trust, a
  Waiting Customer can read that public vouch and share a local tip only after
  `localTrust >= 55`, or read a public warning and keep distance only after
  local trust is low,
  a Park Witness can turn a Store note into public rumor, turn a correction
  record into a public repair notice, or turn a wary queue record into an
  informal public warning before any Station report; Store Manager follows up
  on a soft report, pauses
  counter service when the local report makes
  normal flow unsafe, or forwards the report on the inquest route; Station
  Officer cites the exact forwarded ledger event. Each log entry now includes the available action candidates and
  selection reason used before the mutation.
- Codex gameplay QA now runs the active proof cell through public
  `PlayableSession.debug_codex_gameplay_action` and
  `debug_codex_gameplay_snapshot` APIs. The probe can list callable player
  actions, execute hesitation, authored dialogue, typed free input, focus a
  visible world-record prop, press the focused interaction, inspect
  HUD/world/ledger/NPC role-action state, and write JSON plus Markdown gameplay
  reports. This is internal AI-play setup proof, not external player
  comprehension.

## M1 Proof Target

M1 must prove one NPC conversation with three dialogue choices, optional typed
free-input contract if available, one safe/local response, one uncertain/repair
response, one risky/weird response, one deterministic record/social
consequence, one why-line, and one Godot-visible result. The current smoke
proves this through the tiny Same Order sample; future work should preserve
the pattern without treating Store/Station as the game. The current
Godot/HUD/Codex QA path proves typed free input reaches the deterministic
record path; the remaining product proof is external player comprehension, not
manual text-entry wiring.

Required proof:

- backend fixture and check.
- Godot-visible conversation UI.
- simulator adoption proof: a fresh player can explain how a local situation,
  their line, a visible record, a role action, and a consequence connect. The
  current sample happens to use Store/Station, but the proof target is the
  reusable social chain.
- Evidence JSON with conversation identity, suspicion signals, why-line, and Exposure/report delta.
- renderer-backed screenshot showing NPC reaction and player-facing consequence. Current non-headless visual capture produces Store conversation PNGs and a contact sheet, and manual readability review has passed for the current Store/Station record-prop proof. External comprehension remains pending.
- API proposal-provider preflight, model availability, and fallback record.
- Korean source text with English consequence parity.

## API Migration Decision

Dream of One supersedes the Codex CLI player-prerequisite decision.

- **Accepted path**: Use an API proposal provider for live NPC/Station wording when configured and verified at runtime.
- **Rejected path**: Do not require player-installed Codex CLI as the release prerequisite. Do not let provider prose own gameplay rules.
- **Invocation model**: Backend/runtime performs provider preflight, checks configured model availability, validates structured wording proposals, and falls back deterministically.
- **Model rule**: `gpt-5.4-nano` may be tried as a configured preferred model, but it is not assumed. Runtime must fall back to configured available models such as `gpt-5-nano`.
- **Authority boundary**: Provider output is wording only: NPC line candidates, Station pressure wording, localized variants, and fallback text variants.
- **Deterministic owner**: Backend/runtime owns action choice, risk tag,
  suspicion signal, Evidence type, reason codes, why-line authority, fallback,
  Exposure, social reports, formal transitions, verdict, session termination,
  and Evidence semantics.
- **Failure rule**: Missing key, unavailable model, rate limit, timeout, invalid JSON, unsupported claims, or authority attempts fail closed with deterministic fallback and Evidence.

## Review And Evidence Rules

- Use `docs/framework/substantive-review.md` for role review shape.
- Use `docs/framework/evidence-gates.md` for internal artifact gates.
- Use proof-gate language in user-facing output. Reserve Evidence for concrete internal artifacts and captures.
- Passing scripts are necessary for repository health, but they do not prove game quality.
- A review that only asks for more tests, probes, packets, or ledgers is not
  enough. It should name the missing game consequence or say that the next
  correct action is external play.

## Local Artifacts

| Artifact | Purpose |
|---|---|
| `.game-studio/core/` | Project-local copy of Game Studio core guidance, roles, rubrics, schemas, workflows, and templates. |
| `.game-studio/project-state.md` | Current Game Studio routing and project state. |
| `docs/framework/evidence-gates.md` | Project-local internal artifact gate guidance. |
| `docs/framework/substantive-review.md` | Project-local Codex-led game-substance review guidance. |
| `.game-harness/` | Existing execution harness for M1 work. Do not replace it without an explicit migration decision. |
| `.game-harness/goal-loop-state.md` | Compact long-running goal state for resumes, blockers, next action, and exit gates. |

## Open Blockers

- M1 has fresh conversation-first Godot/backend proof artifacts, canonical route-event validation for the internal route-proof gate, renderer-backed Store conversation visual recapture, Same Order comprehension proxy, player comprehension playtest packet, visual evidence proxy, fallback-only provider decision, and current export/setup proof. Product closure still needs completed external comprehension notes and the final product/council decision from those notes.
- Manual typed free-input UI is proven through the current HUD path, packaged route evidence, and Codex gameplay QA; do not reopen it unless the implementation regresses.
- Live Godot backend bridge remains a follow-up path unless implemented in the same scoped issue.
- Broad vertical-slice implementation remains blocked until M1 product closure, not merely technical proof.

## Active Design Spine And Game Improvement Program

Game Studio council review on 2026-05-14 defined M1 improvement as player-facing
game improvement, not process completion. A change counts only when it
strengthens the player's understanding that NPC/Station systems investigate
their speech and that utterances create deterministic consequences.

Active artifacts:

- `docs/direction/09-game-design-spine.md`.
- `docs/direction/10-team-operating-brief.md`.
- `docs/direction/11-simulator-benchmark-adoption-brief.md`.
- `docs/direction/12-simulator-reference-map.md`.
- `docs/direction/13-operation-sim-quality-floor.md`.
- `docs/direction/14-minimal-civic-economy-model.md`.
- `docs/direction/15-agentic-social-simulation-model.md`.
- `docs/direction/16-agentic-prototype-target.md`.
- `docs/research/simulator-benchmarks/2026-05-14/`.
- `docs/research/simulator-benchmarks/2026-05-15/`.
- `docs/scenario/content/social-simulation-cards.md`.
- `docs/scenario/content/environment-affordance-map.md`.
- `docs/scenario/content/same-order-storylet-packet.md`.
- `.game-harness/council/m1-game-improvement-council-review-2026-05-14.md`.
- `.game-harness/council/m1-team-planning-council-review-2026-05-14.md`.
- `.game-harness/milestones/M1-game-improvement-program.md`.
- `.game-harness/milestones/M1-game-improvement-handoff.md`.
- `.game-harness/milestones/M1-same-order-four-week-prototype-plan.md`.

Design baseline:

- Game work should start from the design spine before implementation planning.
- Benchmark-first planning should make Dream of One a readable procedure
  simulator before adding dream fiction, broad society simulation, or
  provider-forward claims.
- Low-budget operation simulator benchmarking sets the M1 product floor:
  visible environment objects, usable procedure props, record state changes, NPC
  pressure, one authority/social citation, and comprehension proof. Store/Station
  is only a small sample for this grammar, not the work queue.
- The minimal civic economy defines society through account credit, local trust,
  record burden, Station attention, and ledger events, not broad business
  management.
- Economy work now uses source-backed loop discipline from Machinations,
  GameDesignSkills, Unity, Koster, Eco, RimWorld, Against the Storm, Old School
  RuneScape, EVE, Papers, Please, Supermarket Simulator, Internet Cafe
  Simulator 2, and lightweight economy-simulation research: add one source, one
  visible pool, one role decision, one sink/transform, and one player-readable
  consequence before adding a variable or system.
- Standard economy terms are allowed only as a small-loop checklist:
  source/tap, pool, sink/drain, converter, gate, and measurement must map to one
  visible interaction in the current example environment. One economy increment
  means one hypothesis, one role-action change, one Godot/backend proof, and one
  ledger update before the next value is considered.
- Do not predefine a broad pressure model. For the current build, a new economy
  value is valid only when it changes one visible NPC action in the current
  playable environment. It can be child-simple. Prefer local repair, report,
  warning, refusal, help, obstruction, gossip, or citation over pricing,
  inventory, wages, rent, taxes, shop expansion, or institution-management
  systems.
- Environment-first agentic social simulation is the long-term society model:
  places, records, affordances, visibility, and economy pressure are authored;
  role actors then choose validated actions inside that world.
- The active prototype target is one tiny affordance-rich example environment
  where conversation changes object state, ledger entries, and social agent
  behavior before another actor or authority cites the prior record.
- New content should be authored as location procedure, NPC pressure, and
  storylet cards before Godot/backend expansion.
- LLM/provider work should thicken social impression through bounded wording,
  shared context, drama tone, and NPC preoccupations while deterministic runtime
  authority remains unchanged.

Current improvement verdict:

- M1 product closure: `NOT_READY`.
- M2 content expansion: `NOT_READY`.
- simulator-first Same Order adoption: `READY_WITH_CONCERNS`.
- low-budget operation sim quality floor adoption: `READY_WITH_CONCERNS`.
- minimal civic economy adoption: `READY_WITH_CONCERNS`.
- environment-first agentic social simulation adoption: `READY_WITH_CONCERNS`.
- agentic prototype target: `READY_WITH_CONCERNS`.
- scoped M1 game improvement execution: `READY_WITH_CONCERNS`.
- backend environment-action and route-proof seed: `READY_WITH_CONCERNS`;
  authority tests pass and the playable slice artifact carries
  `agenticRouteProofs`; HUD, world record-state display, and deterministic
  Godot role-agent action logging plus provider scheduling/dispatch contracts,
  asset BOM, comprehension proxy, fresh Godot CLI smoke, renderer screenshots,
  packaged export/setup proof, fallback-only provider decision, and HUD typed
  free-input proof are current. External comprehension proof remains open.
  Live provider dispatch inside Godot remains future evidence, not an M1
  fallback-only blocker.

Priority order:

1. run the external comprehension dry run or fresh-player sessions through the
   current packaged sample app. If a fresh tester is present, use the live
   helper directly instead of building more internal setup checks.
2. review raw notes with strict helper output and human quote review.
3. record the M1/M2 go, conditional, or no-go decision from those notes and
   product/council review.
4. only after fresh-player evidence shows the current proof cell is understood,
   split the four-week and agentic social-sim prototype plans into focused
   Linear issues.
5. only after that, choose the next smallest reusable open-environment
   increment: procedure cue, record proof, object state, tiny economy value, or
   social affordance. Use Store/Station only if it remains the cheapest
   disposable sample.

Resolved current-lane items:

- manual typed free-input UI is proven through Godot/HUD/packaged/Codex QA;
  legacy recorded-statement fallback is internal only.
- consequence readability pass is current.
- Same Order visible report handoff and exact Station citation prompt are
  current in HUD/outcome/package evidence.
- live authority vs fallback-only product decision is resolved as
  `fallback_only_m1`.
- exported build/setup proof is current for local tester setup.
