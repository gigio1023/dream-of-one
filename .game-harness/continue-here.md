# Continue Here

Last Updated: 2026-05-18

## Current State

2026-05-18 resume note:
- Current product blocker is external fresh-player comprehension: raw manual
  session notes remain `0 / 3`, and strict review remains
  `PENDING_TESTER_NOTES`.
- Do not reopen manual typed input, fallback-only provider mode, export setup,
  or broad role-review blockers unless new evidence regresses. Current proof
  already covers HUD typed input, packaged route evidence, fallback-only M1,
  current export/setup, and conditional product-gate council review.
- Codex gameplay QA is now part of the proof surface: session kits copy the
  Codex JSON and Markdown gameplay reports, verify the public action catalog,
  typed free-input execution, player-visible HUD/world/ledger/NPC role-action
  state, 5/5 route reports, and readable Markdown report content.
- The fastest correct next move is still an observed fresh-player session
  through the current packaged sample app. If a fresh tester is present, run
  `.game-harness/scripts/run-same-order-comprehension-session.sh` directly.
  Use `--recruitment`, `--session-kit-output <dir>`, and
  `--verify-session-kit <dir>` only when recruiting or handing off facilitator
  setup.
- Use `--status` as a short readiness check only. It now keeps the successful
  preflight and Codex QA details compressed so the next action remains obvious:
  run the live fresh-player session.
- The default live helper also keeps successful packaged-preflight details out
  of the pre-play terminal output. It should not leak facilitator-only setup
  terms to a fresh tester before first play.
- After play, the default live helper now asks for the tester's own explanation
  and direct quotes before route labels, safe/risky classification,
  facilitator intervention, or pass/fail scoring. Do not start fresh-player
  note capture with route bookkeeping.
- `.game-harness/comprehension/manual-sessions/README.md` now starts with the
  one-command live helper path. Treat recruitment, session-kit, worksheet,
  debrief, and Codex detail modes as optional setup, not the default way to run
  a tester.
- After a raw note is written, the live helper prints the current raw note
  count, minimum remaining sessions, review command, and status command. Do not
  add another internal tracker for this gate.
- Once raw note count reaches three, the live helper prints strict review and
  ledger-draft commands directly; run those before claiming any product-gate
  movement.
- A passing session kit is setup proof only. It cannot close the active goal
  without fresh tester notes and accepted quote review.
- If `--status` is already pass and no watched Godot/HUD/probe/session-helper
  source changed, do not rerun Codex probe or regenerate setup kits merely to
  show activity. The next useful move is human play, not more preparation.
- Latest implementation slice: suspicious-cover public warnings now reach the
  Studio PM. The PM reads the Park warning, defers `studio_review_queue`, shows
  `리뷰 보류`, and Codex route reports inspect the deferred queue through the
  same focus/interact path used by a player. Treat this as another tiny
  open-environment proof, not as permission to build a Studio subsystem.

2026-05-17 lightweight Ralph-style loop note:
- Use `.game-harness/goal-loop-state.md` as the compact resume state for
  long-running Codex goal work.
- This does not install or copy Ralph. The useful borrowed pattern is only:
  prompt -> task list -> state checkpoint -> narrow proof -> explicit exit
  gate.
- On each resume, read the goal prompt, loop state, continuation note, tasks,
  verification ledger, and Game Studio project state before changing code.
- Keep each pass small: one readable game improvement, one real proof run, one
  state update.
- The active completion gate is still external fresh-player comprehension.
  Internal proofs may keep the build ready, but they cannot close that gate.

2026-05-17 resume note:
- Goal state is `active` in the current Codex session.
- Latest-Godot playable smoke, packaged app export, packaged app launch, and
  packaged app Same Order route proof now pass.
- The packaged route proof was refreshed after the HUD wording pass and now
  validates `검사자`, `대상: 플레이어`, and Station Officer in the exported app HUD.
  That proof is now written into `playability.packagedRouteSmokeProof`, and
  tester preflight fails if it is missing.
- The same packaged proof now also stores and checks the inquest outcome body:
  player speech/response delay -> Store record -> report handoff -> Station
  citation -> inquest, plus Station Officer role action. Tester preflight fails
  if this outcome-chain proof is missing.
- The latest playable/PCK route proof now stores `outcomeBody` for clean cover,
  repair recovery, soft report, and inquest; each terminal result names the role
  action that closed or escalated the record.
- After restoring the active goal, packaged tester preflight was rerun and
  still passes for fallback-only mode, delayed-answer Evidence, typed input,
  inquest outcome, latest ledger citation, and app/evidence freshness.
- Current product truth is `fallback_only_m1`; do not claim live GPT behavior
  unless a separate live preflight is run.
- The next blocker is external tester comprehension notes from the packaged
  app. Proxy packets, smoke hooks, and Codex interpretation cannot close it.
- Use `.game-harness/scripts/run-same-order-comprehension-session.sh` to launch
  the packaged app and write raw facilitator notes after actual tester play.
- Use `.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment`
  only for the tester-facing no-spoiler invite. In a generated session kit,
  only `tester-invite.md` should be sent to a fresh tester; the run pack,
  recruitment facilitator card, debrief, worksheet, status, and README are
  facilitator-only setup material.
- Use `.game-harness/scripts/review-same-order-comprehension-notes.sh` after
  collecting notes to find missing O1-O7 evidence before copying accepted
  findings into the external ledger.
- The raw-note review helper now also verifies packaged outcome-chain proof.
  A session cannot reach pass-candidate status if its referenced app/evidence
  no longer proves the speech/delay -> Store record -> Station role-action
  chain.

M1 technical proof now passes locally with the conversation-first playable path. Treat this as engineering evidence only:
- backend check: pass, including deterministic conversation suspicion fixtures, ordered same-NPC conversation turns, playable Evidence Pack schema validation, and trajectory diversity verification.
- Godot import/syntax/scene/evidence/runtime/playable/localization/keyboard smokes: pass.
- Godot live backend bridge smoke: pass for mock-ready, missing-key fallback, and live-unavailable fallback paths.
- shell/runtime/playable Evidence Packs validate with backend `validateGodotEvidencePack`.
- visual capture script now expects the Store conversation path. Headless capture still cannot read viewport pixels, but non-headless renderer capture produced current Store conversation screenshots and a contact sheet.

M1 is not product-closed until council/product review and player
comprehension evidence accept the provider boundary and product promise.
Exported-build setup is proven for local tester use; live provider work remains
optional unless it becomes part of the public promise.

Direction pivot:
- The intended player-facing game is now conversation-first suspicion, not abstract Cover Test button escalation.
- The intended production method is agile playable proof, not waterfall design
  expansion. Dream of One is now framed as open-environment social simulation.
  Store/Station is only an ultra-small sample for proving NPC-to-NPC social
  action, lightweight economy pressure, and player consequences; it should not
  become the content center or the default backlog.
- Planning now uses a simulator-first benchmark scaffold:
  `docs/direction/11-simulator-benchmark-adoption-brief.md`,
  `docs/direction/12-simulator-reference-map.md`, and
  `docs/research/simulator-benchmarks/2026-05-14/`.
- Planning now also uses the low-budget operation simulator quality floor:
  `docs/direction/13-operation-sim-quality-floor.md` and
  `docs/research/simulator-benchmarks/2026-05-15/`.
- Planning now uses the minimal civic economy model:
  `docs/direction/14-minimal-civic-economy-model.md`.
- Economy planning now also uses the small-loop game economy research:
  `docs/research/simulator-benchmarks/2026-05-17/02-small-game-economy-loop-research.md`.
  Economy work must start from one playable loop: source, visible pool, actor
  decision, sink/transform, and player-readable consequence. Do not define a
  broad pressure model before proving the smallest loop.
- Planning now uses the environment-first agentic social simulation model:
  `docs/direction/15-agentic-social-simulation-model.md`.
- Planning now uses the active agentic prototype target:
  `docs/direction/16-agentic-prototype-target.md` and
  `docs/scenario/content/environment-affordance-map.md`.
- Same Order should be treated as a disposable sample cell before dream
  fiction, broad society simulation, or provider wording claims are layered on
  top. Keep it cheap enough that the same pattern can move to another
  environment.
- Same Order only needs the operation-sim floor at sample size: visible props,
  stateful records, one role handoff, and one readable consequence.
- Same Order only needs one crude civic loop: a visible value such as trust,
  burden, attention, favor, or a shared counter that changes one role decision.
- Same Order should prove one authored environment whose affordances can be
  freely used by 2-3 role agents, rather than pre-authored reactions for every
  possible social branch.
- The next implementation split should not add a larger Store simulator or a
  deeper Station procedure. Prefer one small reusable open-environment
  increment: one NPC notices another NPC's record, one toy-simple economy value
  changes priorities, or one role uses a shared record through a validated
  affordance. Prove that in Godot/backend evidence before adding more locations
  or routes.
- Default interaction target is three diegetic dialogue choices plus optional
  typed free input. Delayed answers are also recordable: the current playable
  proof emits `response_hesitation_noted` on the inquest route before typed
  speech. The HUD typed input field submits into the same deterministic
  free-input Evidence path, and current latest-Godot smoke/capture artifacts
  prove that player-facing typed input path.
- NPC suspicion starts from conversation weirdness, then escalates through probing, sharing/report, Station intake, inquest, and verdict.
- The current Station Soft Inquest smoke remains internal authority/Evidence harness evidence only.

Current lane and umbrella target:
- current scoped lane: `feat/ui-visual-readability-pass`.
- umbrella target: `feat/prologue-demo-completion`.
- keep M1 technical proof green as the baseline.
- distinguish M1 proof from a small complete prologue/demo in all PR and planning updates.
- close or explicitly block conversation/UI/player-comprehension/provider/export gates before claiming the umbrella is demo-complete.
- treat broader route, inquest, verdict, and replay work as demo-completion work only after the conversation-first loop is proven.

Current lane progress:
- the playable smoke now proves `Same Order` route contrast with fresh scenes: clean cover, repair recovery, soft report, and hard inquest.
- the hard inquest route is now proven in smoke/capture as Store Clerk prompt
  -> risky line -> delayed-answer record -> HUD typed line -> deterministic
  suspicion signals -> Station report/inquest -> locked session end.
- the terminal outcome panels now name the role action behind the result:
  Store Clerk closes the clean/repaired records, Store Manager passes soft
  reports, and Station Officer cites Store records for inquest. The inquest
  panel also names the exact Store ledger entry that the Station cites, so the
  player sees how the Store report travels into formal questioning. Fresh Godot
  smoke/capture evidence is current, and packaged route/preflight proof
  requires this chain.
- player-facing controls are now `dialogue_choice_1/2/3` and a HUD typed input field that submits manual text into `submit_free_input`. The legacy recorded-statement fallback remains internal and is no longer foregrounded in the active HUD/capture expectations. Current evidence artifacts prove the HUD typed input path. `SA_COMPLY/SA_BREAK` remain only in legacy runtime-slice authority tests.
- backend Evidence validation now preserves conversation identity, selected line, free-input hash, suspicion signals, suspicion/report deltas, and why-line fields.
- backend Evidence validation now also checks Same Order route proofs through `validateGodotEvidencePackSameOrderRouteProofs`.
- DecisionService preserves ordered same-NPC conversation turns instead of latest-wins coalescing when `conversation.turnId` is present.
- HUD now shows NPC prompt, three diegetic choices, free-input affordance, typed-speech result, why-line, Evidence count, suspicion/report pressure, and end controls.
- HUD now exposes a real typed input field during conversation; submitted text follows the existing `free_input_submitted` event and `freeInputHash` contract.
- HUD record-state now shows the latest civic ledger event ID, actor role,
  validated action, and plain meaning, so the player can see the most recent
  social record rather than only a ledger count.
- HUD record-state and terminal outcome text now also expose the latest NPC
  social reaction: Store Manager reading a Clerk note before soft report or
  report forwarding, and Station Officer reading the forwarded Store record
  before citation. Fresh smoke and renderer capture prove this in
  `playableSummary.socialObservationTrace` and the visual manifest.
- UI/visual readability pass added a compact traversal HUD, larger conversation choice rows, explicit recorded-statement label, localized record summaries, Store Clerk reaction marker, and Store conversation staging cues. This improves presentation proof but does not close human readability or player comprehension.
- playable smoke declares `godot_local_conversation_runtime`, so public/demo authority still requires live backend/runtime integration or an explicit fallback-only product decision.
- backend Same Order environment-action seed now validates role visibility,
  affordance use, civic economy deltas, ledger events, and exact Store record
  citation by Station.
- backend Same Order agentic route proofs now cover clean, repair, soft report,
  and inquest paths and can be attached to the existing Godot Evidence Pack
  shape.
- backend/Godot Same Order agentic route proofs now include
  `socialObservationTrace`: the soft-report path proves Store Manager reacting
  to a Store Clerk note and local record burden; the inquest path proves Store
  Manager forwarding that record and Station Officer citing the forwarded
  record. The playable session summary now carries the same trace, so this is
  no longer only a backend artifact. This is the current smallest NPC-to-NPC
  social-sim increment.
- playable slice evidence now carries `playability.agenticRouteProofs`, and
  `godot/tools/playable_slice_smoke.gd` writes that field for future smoke runs.
- playable session summary/evidence now carries `recordObjects`,
  `civicEconomy`, `civicLedger`, and `socialObservationTrace`; HUD displays
  receipt, correction, report, dossier, trust, burden, attention, ledger count,
  and latest NPC social reaction.
- world generation now creates Store/Station record prop slots for receipt,
  correction, report tray, Station dossier, civic ledger, and civic economy;
  the playable session updates those labels, colors, latest ledger entry,
  actor role, validated action, and state metadata from the same route state,
  and the playable smoke validates the prop snapshot.

Small complete prologue/demo bar:
- player can start, understand they are being investigated, answer NPC prompts
  through three choices or optional typed free input, see delayed-answer and
  speech consequences, see NPC suspicion and Evidence/Exposure/report
  consequences, reach inquest/verdict/session end, and replay at least one
  meaningfully different outcome or repair path.
- UI clearly shows NPC prompt, three dialogue choices, optional typed-free-input risk, selected/entered text consequence, why-line, suspicion/report state, provider/fallback state, localization state, and verdict/session-end result.
- renderer-backed screenshots are conversation-aligned and current; manual readability review passes with Store/Station record-prop close-ups. External player comprehension remains pending.
- external tester notes prove comprehension; forced/proxy smokes do not close this blocker.

Long-running PR lifecycle:
- Keep bot feedback, review threads, and resolved/blocked status in `.game-harness/pr-review-ledger.md`.
- Separate M1 technical-pass evidence from product blockers in PR updates.
- Do not present live API/GPT availability as solved unless a fresh runtime preflight proves it.

Harness research and methodology were created under:
- `docs/research/2026-04-30/harness-methodology/`

Active harness entry:
- `docs/development/harness/README.md`

Active goal prompt:
- `.game-harness/active-goal-prompt.md`

Long-running goal loop state:
- `.game-harness/goal-loop-state.md`

Active goal proof audit:
- `.game-harness/active-goal-proof-audit-2026-05-17.md`

Current game-development state:
- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- `.game-harness/review-log.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/pr-review-ledger.md`
- `.game-harness/drift-log.md`

## Next Best Action

Advance the conversation-first proof from engineering evidence to product
evidence. If a fresh tester is available, stop preparing and run:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Then review the raw notes with:

```bash
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
```

Do not expand Store/Station content or add more setup checks before the current
small sample has external comprehension evidence. If implementation is needed,
choose a reusable open-environment interaction rather than a deeper Store or
Station system.

Already implemented:
- conversation prompt/choice/free-input schema
- deterministic suspicion signal taxonomy and fixtures
- one NPC `Same Order` micro-scenario with clean cover, repair recovery, soft report, and inquest paths
- HUD state path with three dialogue choices and typed free-input evidence;
  legacy recorded-statement fallback is internal only
- renderer-backed Store conversation screenshots and contact sheet
- Evidence Pack with conversation identity, selected line, free-input hash, signals, suspicion/report deltas, and why-line
- backend Same Order environment-action seed with role visibility, affordance
  validation, available action candidates, civic economy deltas, ledger events,
  accepted affordance provenance, and exact Station citation rules
- backend Same Order agentic route proof generator/validator for clean, repair,
  soft report, and inquest ledger paths, including ordered ledger affordances
  and `socialObservationTrace` for NPC reactions to prior records/economy
  pressure
- Godot playable summary/HUD/outcomes exposing the same NPC social reaction
  trace, with renderer capture expectations updated for the HUD/outcome copy
- backend provider-shaped action comparison proving scripted proposals must
  choose available affordances and preserve provider-off ledger outcomes plus
  affordance provenance
- backend provider scheduling contract proving 24 bounded role-agent provider
  jobs across clean, repair, soft report, and inquest routes, with deterministic
  fallback wording, recent ledger affordance context, and exact Station citation
  while keeping live Godot dispatch explicitly open
- backend provider dispatch packet contract proving those 12 scheduled jobs
  become `/v1/npc/decision` packets that pass schema, carry recent affordance
  context, and preserve bounded behavior while keeping live HTTP dispatch
  explicitly open
- playable slice Evidence Pack with `playability.agenticRouteProofs`
- playable slice Evidence Pack with `playability.providerActionComparison`
- playable slice Evidence Pack with `playability.providerSchedulingPlan`
- playable slice Evidence Pack with `playability.providerDispatchContract`
- playable slice Evidence Pack with `playability.comprehensionProxy`
- playable slice Evidence Pack with
  `playability.playerComprehensionPlaytestPacket`
- playable slice Evidence Pack with `playability.visualEvidenceProxy`
- playable slice Evidence Pack with `playability.assetBillOfMaterials`
- Same Order asset BOM note:
  `.game-harness/assets/same-order-asset-bom-2026-05-16.md`
- Same Order provider scheduling note:
  `.game-harness/provider/same-order-provider-scheduling-contract-2026-05-16.md`
- Same Order provider dispatch note:
  `.game-harness/provider/same-order-provider-dispatch-contract-2026-05-16.md`
- Same Order comprehension proxy note:
  `.game-harness/comprehension/same-order-comprehension-proxy-2026-05-16.md`
- Same Order player comprehension playtest packet:
  `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`
- The playtest packet now includes route cards, typed-input and delayed-answer inquest operation,
  O1-O7 observation checks, latest-ledger actor-role/validated-action comprehension, and
  a session-note template. It is still setup evidence only until external
  tester notes are recorded.
- Raw comprehension review now rejects pass-candidate status unless each
  session is bound to a packaged build/evidence pair that also proves the
  outcome-chain recap in the exported app.
- Same Order visual evidence proxy note:
  `.game-harness/visual/same-order-visual-evidence-proxy-2026-05-16.md`
- The visual evidence proxy now records current renderer-backed capture proof
  for latest ledger actor/action visibility, HUD typed input, fallback-only
  provider state, and Store/Station outcome readability. It remains setup
  evidence only; external player comprehension is still required.
- playable summary/evidence `recordObjects`, `civicEconomy`, and `civicLedger`
- playable summary/evidence `agentActionLog` showing validated Store Clerk,
  Store Manager, and Station Officer affordance use, including available
  candidates, selected action descriptors, and selection reason for each
  accepted mutation
- compact HUD record-state line for operation-sim readability
- compact HUD latest-ledger line with actor role/action for operation-sim cause tracking
- HUD typed free-input field wired to the deterministic recorded speech path
- Store/Station world record props and `worldRecordProps` evidence snapshot
- civic ledger world prop now names the latest ledger event, actor role, and
  validated action, not only the count
- session kit verification for copied Codex QA JSON and readable Markdown
  gameplay reports, including action path, cause chain, route outcomes, final
  visible state, role actions, NPC observations, and product boundary

Remaining required outputs:
- external player comprehension notes from the packaged app. Proxy
  comprehension passes but does not close the external tester blocker; the blind
  three-tester packet is ready and requires completed session notes.
- simulator adoption product proof from human notes: a fresh player can explain
  readable local situation -> player line -> visible record artifact -> role
  action -> consequence. The current sample may use Store/Station, but the
  target is the reusable chain.
- operation-sim quality product proof from human notes: a fresh player can use
  the HUD and visible props to understand receipt/correction/report/dossier
  state without being taught the design intent.
- play by at least one fresh player through the packaged app, recorded
  through `.game-harness/scripts/run-same-order-comprehension-session.sh`.
- accepted external ledger update in
  `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`
  after quote review.
- PR bot-feedback ledger updates until all review feedback is closed or
  explicitly blocked.

## Do Not Skip

- Do not implement broader content before M1 Protocol Proof exists.
- Do not deepen Same Order until the local situation -> player line -> artifact
  -> role action -> consequence chain is readable.
- Do not keep abstract `SA_COMPLY`/`SA_BREAK` buttons as the player-facing primary loop.
- Do not call optional free input open-ended NPC chat.
- Do not reopen manual typed-input UI work unless current Godot/HUD/packaged or
  Codex gameplay QA evidence regresses.
- Do not let provider-generated NPC text own Exposure, verdict, or session termination.
- Prefer `gpt-5.4-mini` only after runtime provider verification confirms it for the configured provider and budgeted live smoke stays within the configured cap.
- Do not assume live API access, model availability, credentials, or provider hosting from local technical checks.
- Do not claim product-playable or demo-complete until Godot/backend evidence,
  renderer-backed visual evidence, readability review, and player comprehension
  evidence all exist. Current internal evidence is strong; external player
  comprehension remains missing.
- Do not claim small prologue/demo completion from M1 technical proof alone.
