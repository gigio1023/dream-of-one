# Harness Tasks

This checklist is not the issue source of truth. Use Linear for issue ownership.

## Active

- [x] Define umbrella `feat/prologue-demo-completion` as a small complete prologue/demo target, not an M1 technical-proof synonym.
- [x] Define the game-like completion bar for a small complete prologue/demo.
- [x] Define visual/UI/player-comprehension gates in active docs.
- [x] Record remaining demo-completion blockers in active docs.
- [x] Mark previous Station/Cover Test visual captures as stale for the current conversation proof.
- [x] Prove internal Station Soft Inquest smoke path with safe/risky contrast, locked post-verdict input, and deterministic session end controls.
- [x] Accept conversation-first redesign as the new player-facing direction.
- [x] Rewrite M1 proof target around NPC prompt, three dialogue choices, typed free-input contract, deterministic suspicion signals, and social report consequence.
- [x] Add conversation prompt/choice/free-input schema and fixtures.
- [x] Build "Same Order" or equivalent conversation-first micro-scenario.
- [x] Replace player-facing abstract `SA_*` controls with diegetic dialogue choices.
- [x] Add first UI/visual readability pass: conversation-centered HUD, recorded-statement label, NPC reaction marker, and Store conversation staging cues.
- [x] Add Evidence Pack fields for conversation identity, selected line, free-input hash, suspicion signals, social report weight, and why-line.
- [x] Record typed free input as a player action and recorded statement as the Evidence artifact.
- [x] Prove manual typed free-input UI if free input remains in the demo promise.
- [x] Add HUD typed free-input field that submits manual text into the deterministic free-input Evidence path.
- [x] Add deterministic response-hesitation Evidence so delayed answers can become a visible record before typed speech.
- [x] Recapture renderer-backed Store conversation screenshots/contact sheet.
- [x] Run M1 council reviews.
- [ ] Run external player comprehension protocol and record evidence.
- [ ] Record M1/M2 go/no-go decision after product review and comprehension evidence.
- [ ] Decide whether umbrella `feat/prologue-demo-completion` continues toward demo completion or narrows to M1-only proof after the current `feat/ui-visual-readability-pass` lane lands.
- [x] Resolve GI-01 typed recorded speech: HUD typed free-input is proven in current Godot/HUD/packaged/Codex QA artifacts; legacy recorded-statement fallback remains internal only and is not tester-facing.
- [x] Execute GI-02 consequence readability pass and capture human readability notes.
- [x] Execute GI-03 NPC/Station investigation feedback pass.
- [ ] Create or link the Linear SoT issue for GI-04 external comprehension
  fresh-player sessions in the `Dream-of-one` (`DRE`) Linear team using
  `.game-harness/linear-issue-drafts/gi-04-external-comprehension-fresh-player.md`.
- [ ] Execute GI-04 external comprehension dry run or fresh-player session.
- [x] Execute GI-05 live authority vs fallback-only product decision and proof.
- [x] Execute GI-06 exported build/setup proof before tester-facing demo claims.
- [x] Add direct `openai-codex` backend provider auth using a per-device ignored
  auth profile, not `codex exec` and not generic `OPENAI_API_KEY`.
- [x] Prove backend live `openai-codex` text proposals with `gpt-5.4-mini`, low
  reasoning, no fallbacks, and recorded estimated/actual usage.
- [x] Add a tiny two-NPC backend live social probe with a total estimated budget
  cap before attempting live Godot provider dispatch.
- [x] Add a Godot live HTTP decision smoke that calls backend `/v1/npc/decision`
  with `openai-codex`, records usage, and does not mutate product state.
- [x] Wire one actual `PlayableSession` route provider job through live backend
  and prove fallback parity for route events, ledger, object state, and economy.
- [x] Improve live provider role-voice policy before exposing live wording as a
  player-visible HUD/Evidence mode.
- [x] Prove proof-only NPC-to-NPC live wording observation: Waiting Customer
  provider context observes Store Clerk live utterance before responding.
- [x] Prove same-session/same-NPC `openai-codex` continuity through actual
  Godot `PlayableSession` packets using backend-owned local workspace memory,
  fixed cheapest model, and recorded usage caps.
- [x] Defer four-week prototype plan issue splitting until fresh-player comprehension evidence and the M1/M2 decision are recorded.
- [x] Run parallel simulator benchmark research lanes and record source-backed md files.
- [x] Add simulator benchmark adoption brief and reference map to active direction docs.
- [x] Add low-budget operation sim benchmark research and active quality-floor direction.
- [x] Add simulator economy benchmark research and active minimal civic economy model.
- [x] Add small-loop game economy research and update economy work rules to avoid waterfall pressure modeling.
- [x] Expand game economy web research with source/sink, live-economy, operation-sim, and obligation examples; lock next economy work to the local repair sink.
- [x] Add environment-first agentic social simulation model for affordance-driven role agents.
- [x] Add active agentic prototype target and environment affordance map.
- [x] Clarify that Store/Station is the first proof cell, not the whole game premise.
- [x] Reset the active goal language so Store/Station is only a tiny disposable
  example for an open-environment NPC social simulation.
- [x] Add repo-level instruction to work in small playable social-sim increments instead of waterfall scope.
- [x] Add backend Same Order environment-action seed for role visibility, affordance validation, civic economy deltas, ledger events, and exact Station citation.
- [x] Add backend Same Order agentic route proof generator/validator for clean, repair, soft report, and inquest ledger paths.
- [x] Add `socialObservationTrace` to agentic route proofs so NPC-to-NPC record/economy reactions are explicit.
- [x] Add the smallest current-environment NPC-to-NPC reaction: Waiting Customer
  reads the Clerk note, uses `complain_delay`, disrupts the queue mark, and
  adds a toy `queue_delay_noted` burden before manager/Station actions.
- [x] Add the smallest repair-side NPC reaction: Waiting Customer reads the
  attached correction slip, uses `accept_repair`, settles the queue mark, adds
  `queue_repair_accepted`, raises local trust, and lowers record burden.
- [x] Add the next smallest repair-side public reaction: Park Witness reads the
  correction record, uses `post_repair_notice`, sets the notice board to
  `repaired`, adds `public_repair_noted`, raises local trust, and lowers
  record burden.
- [x] Add the smallest routine-side NPC reaction: Waiting Customer reads the
  normal receipt, uses `accept_routine`, settles the queue mark, adds
  `queue_routine_kept`, and gives the safe route a visible social response.
- [x] Add the next smallest routine-side public reaction: Park Witness reads the
  routine queue record, uses `vouch_routine`, posts a public routine vouch, and
  lets clean social trust travel beyond the queue.
- [x] Add the smallest trust-gated help reaction: Waiting Customer reads the
  public routine vouch, uses `share_local_tip` only when `localTrust >= 55`,
  changes the queue mark to `helped`, and proves a toy economy value can unlock
  an NPC help action.
- [x] Add the smallest report-side environment reaction: Store Manager reads
  the pending Store note, uses `pause_service`, changes the counter to
  `paused`, adds `service_paused`, and makes a soft report visibly interrupt
  local service without opening inquest.
- [x] Add the next smallest report-side NPC reaction: Waiting Customer reads
  the paused-service record, uses `leave_queue`, empties the queue mark, and
  makes the soft report affect a second role without adding a larger shop sim.
- [x] Add the next smallest formal-record social reaction: Waiting Customer
  reads the Station citation, uses `refuse_contact`, changes the queue/contact
  state to `refused`, and makes authority citation change local NPC behavior
  without deepening Store/Station scope.
- [x] Add the next smallest informal-warning reaction: Park Witness reads a
  wary queue note, uses `post_warning`, and posts a public warning without a
  formal report.
- [x] Add the smallest low-trust distancing reaction: Waiting Customer reads
  the public warning, uses `keep_distance` only after local trust drops, changes
  the queue mark to `distanced`, and proves the warning can alter NPC behavior
  without Station escalation.
- [x] Make public notices truly visible to the next NPC reaction: Waiting
  Customer now perceives `park_notice_board` before `share_local_tip` or
  `keep_distance`, and playable/Codex probes fail if those reactions happen
  without that public environment cue.
- [x] Make public-board reactions more readable in the running game: clean and
  suspicious terminal outcomes now state that the Waiting Customer acts after
  seeing the Park notice board's public vouch or warning.
- [x] Re-export the packaged macOS app after the public-board wording change
  and rerun packaged launch, packaged route smoke, backend schema validation,
  and comprehension preflight.
- [x] Let Codex/player inspect visible environment record props through
  `inspect.world_record_prop`, proving the Park notice board can be read as a
  public record in the running HUD notice instead of only existing in summary
  data.
- [x] Let Codex/player read a visible environment record prop through actual
  focus plus interact: `focus.world_record_prop` on the Park notice board
  followed by `player.interact.focused` now opens the same HUD notice, and
  normal focus scanning treats operation record props as readable targets when
  no conversation zone is closer.
- [x] Spawn the Waiting Customer as an actual Store NPC and make playable/Codex
  probes require player-readable visible NPC reaction state for acting roles.
- [x] Add the smallest non-Store/non-Station public-record reaction: Studio PM
  reads the Park public routine vouch, uses `invite_review`, changes
  `studio_review_queue` to `invited`, and proves a public social record can
  open a tiny opportunity in another place.
- [x] Make the Studio review invitation player/Codex-readable through actual
  focus plus interact: `focus.world_record_prop` on `studio_review_queue`
  followed by `player.interact.focused` now opens the invited review queue in
  the HUD notice on the clean route.
- [x] Make the Studio PM invitation visible as NPC state: clean route now marks
  `NPC_Studio_PM` as `invited`, shows a review-open reaction label/marker, and
  keeps Codex route probes scoped to the correct live scene.
- [x] Add the matching warning-side cross-place reaction: Studio PM reads the
  Park public warning, uses `defer_review`, changes `studio_review_queue` to
  `deferred`, and shows a visible `리뷰 보류` reaction so a public record can
  close a tiny opportunity outside Store/Station.
- [x] Add the matching formal-citation cross-place reaction: Studio PM reads
  the Station citation, uses `block_review`, changes `studio_review_queue` to
  `blocked`, shows `리뷰 차단`, and Codex/player can inspect the blocked queue
  and PM basis before the Waiting Customer refuses contact.
- [x] Make Park Witness public notices visible as NPC state: clean, repair, and
  suspicious-cover routes now show `NPC_Park_Witness` reaction markers for
  public vouch, repair notice, and public warning instead of leaving those
  actions as ledger-only state.
- [x] Make Waiting Customer social decisions visible as NPC state: clean help,
  repair acceptance, public-warning distance, soft-report queue exit, and
  inquest contact refusal now show reaction markers instead of line-only state.
- [x] Let player/Codex inspect a visible NPC reaction through focus plus
  interact: the inquest path can read the Waiting Customer's `접촉 거부` state in
  the HUD notice and Codex report.
- [x] Show the record basis inside NPC inspection: the Waiting Customer HUD
  notice now names `civic-ledger-8`, its cited `civic-ledger-6`, the
  `refuse_contact` affordance, and the queue-mark record object so the player
  can read why the refusal happened.
- [x] Make NPC reaction inspection name ledger actors and validated actions:
  Studio PM and Waiting Customer inspection now show both the current reaction
  record and cited Station record as `ledger / role -> action` lines.
- [x] Make NPC reaction inspection show action gates and economy effects:
  Studio PM and Waiting Customer inspection now show the object state, cited
  ledger requirement, and tiny value change that made the visible social action
  valid.
- [x] Make Park Witness public rumor visible as NPC state: soft-report and
  inquest paths now show `NPC_Park_Witness` as `rumored` with `소문 게시`, and
  the soft-report outcome chain names `공원 소문 게시`.
- [x] Make Store Manager intermediary actions visible as distinct NPC state:
  soft-report `pause_service` now shows `paused` / `응대 중단`, and inquest
  `forward_report` now shows `forwarded` / `보고 전달`.
- [x] Extend the soft-report HUD consequence chain through local social
  reactions: soft report now shows `플레이어 발화 -> 상점 기록 -> 공원 게시 ->
  응대 중단 -> 줄 이탈 -> 보고 접수` instead of stopping at generic report
  filing.
- [x] Make repair recovery leave a readable public environment record: repair
  now sets `park_notice_board=repaired`, the live HUD names `기억 공백 발화 ->
  정정표 -> 대기줄 수습 -> 공개 수습 게시`, and Codex inspects the Park notice
  board as a repaired public notice.
- [x] Add the next smallest repair-side cross-place reaction: Studio PM reads
  the public repair notice, uses `offer_conditional_review`, changes
  `studio_review_queue` to `conditional`, and Codex inspects the conditional
  review queue as a player-readable consequence.
- [x] Show the role/action map inside world-record prop inspection: the blocked
  Studio review queue HUD notice now names who can read it, which actions that
  record supports, and the latest ledger event that changed it.
- [x] Distinguish possible vs currently open world-record actions: inspected
  props now show `현재 열린 행동`, so blocked records do not look actionable and
  active public records show what a role can still do now.
- [x] Make the civic ledger player-readable as an NPC-to-NPC social chain:
  Codex/player can inspect `civic_ledger` and read `사회 연쇄` lines showing who
  saw whose ledger action and which action they chose next.
- [x] Make the live HUD social reaction cite the observed ledger record:
  `사회 반응` now includes the `civic-ledger-*` record an NPC read before
  acting, and Codex/playable smoke checks fail if that player-visible citation
  disappears.
- [x] Add a live HUD nearby-stance summary: `주변 태도` now names the active
  visible NPC reactions such as help, conditional review, distance, queue exit,
  review block, and contact refusal without requiring NPC-by-NPC inspection.
- [x] Add player-readable NPC spoken reaction lines: inspecting Studio PM or
  Waiting Customer now shows `들은 말` and exports `spokenLine` so Codex/player
  can read the actual social blocking/refusal line through focus plus interact.
- [x] Make the civic economy panel player-readable as a tiny social-pressure
  record: Codex/player can inspect current credit/trust/burden/attention values
  and recent ledger deltas that show which role action moved them.
- [x] Make the civic economy panel role-readable as shared environment context:
  conversation snapshots and Waiting Customer provider packets now expose it in
  `visibleEnvironmentObjects` so NPC agents can read the same tiny values the
  player inspects.
- [x] Make visible NPC inspection show current role perception: Studio PM and
  Waiting Customer HUD notices now include `보는 환경` plus
  `visibleEnvironmentObjectLabels`, so the player can read which props and
  shared values the NPC is currently acting from.
- [x] Make Store Clerk record-making readable through NPC inspection: Codex/player
  can inspect the Clerk after typed speech and read `메모 배치`, the report tray
  basis, visible environment objects, spoken handoff line, and tiny value
  changes before inspecting downstream NPC reactions.
- [x] Make Station Officer citation readable through NPC inspection: Codex/player
  can inspect the Officer after inquest and read the cited Store Manager ledger,
  Station document target, authority focus, visible environment context, and
  spoken intake line before inspecting downstream social consequences.
- [x] Make Park Witness public spread readable through NPC inspection:
  Codex/player can inspect the Witness after inquest and read that the Clerk's
  note became a public Park record other roles can use.
- [x] Make cross-place rule boards player-readable before speech: Codex/player
  can focus and read the Studio approval criteria and Park notice board as
  social rules that later ground public notice and review consequences.
- [x] Make active Store dialogue expose the environment tool catalog without
  hardcoding choice consequences: Store prompt choices remain diegetic speech
  lines while the prompt exposes current Store Clerk object tools such as
  receipt creation, receipt marking, correction, and report-note affordances.
- [x] Extend the live HUD consequence chain through post-citation social
  consequences: inquest now shows Station citation -> Studio review block ->
  Waiting Customer contact refusal before the player opens inspection detail.
- [x] Show the latest NPC social reaction in the HUD record line, terminal outcome text, playable summary, and visual capture evidence.
- [x] Add `playability.agenticRouteProofs` to the playable slice Evidence Pack and export path.
- [x] Add HUD-visible `recordObjects`, `civicEconomy`, and `civicLedger` state line for Same Order record pressure.
- [x] Add Store/Station world prop slots and playable smoke expectations for receipt, correction slip, report tray, Station dossier, civic ledger, and civic economy.
- [x] Add deterministic Godot role-agent validation and `agentActionLog` for Store Clerk, Store Manager, and Station Officer Same Order mutations.
- [x] Add available-action candidate capture to backend/Godot agentic logs so selected actions prove perception, object-state, authority, and citation constraints.
- [x] Add backend provider-shaped action comparison for Same Order routes, preserving provider-off ledger/object/economy outcomes and rejecting unsupported authority fields.
- [x] Add Same Order provider scheduling contract for bounded role-agent jobs, deterministic fallback wording, exact Station citation, and live-Godot-dispatch blocker tracking.
- [x] Add Same Order provider dispatch packet contract for `/v1/npc/decision` schema safety, bounded behavior, and live-HTTP-dispatch blocker tracking.
- [x] Add Same Order comprehension proxy report and backend verifier for C1-C7 pre-playtest checks, including ordered validated-action trails.
- [x] Add Same Order player comprehension playtest packet with three-tester route assignments, blind facilitation rules, and scoring anchors.
- [x] Add Same Order playtest route cards, typed-input inquest instruction, observation checklist, and session-note template.
- [x] Add pending external comprehension notes ledger tied to the current local/PCK proof paths.
- [x] Add packaged-app comprehension session helper for raw facilitator notes.
- [x] Make packaged-app comprehension helper confirm fresh tester status before launching the app.
- [x] Add packaged-app comprehension session preflight for app/evidence freshness, fallback-only, typed-input, inquest, and exact Station citation readiness.
- [x] Bind raw comprehension notes to exact packaged app path, route evidence path, preflight result, and fallback-only provider state.
- [x] Make raw comprehension review verify referenced app/evidence paths and packaged route semantics instead of accepting provenance fields at face value.
- [x] Add strict raw-note review mode so pending or weak comprehension notes fail gate automation.
- [x] Add non-authoritative ledger draft output for human quote review after raw comprehension notes are collected.
- [x] Add raw comprehension note review helper for O1-O7 completeness.
- [x] Tighten raw comprehension note review helper so only explicit pass observations, Korean-comfortable sample coverage, safe/risky route coverage, complete notes, and no role inversion can reach pass-candidate status.
- [x] Add explicit dialogue-to-record-to-consequence-to-role-action capture and quote requirements to the raw comprehension helper path.
- [x] Reject checkbox placeholders as direct quotes in raw comprehension review.
- [x] Make raw comprehension review require three fresh testers before pass-candidate status.
- [x] Make raw comprehension review require distinct tester labels before pass-candidate status.
- [x] Make raw comprehension review verify packaged outcome-chain proof before pass-candidate status.
- [x] Align playtest packet and comprehension gate templates with packaged outcome-chain proof.
- [x] Bind raw comprehension notes to app/evidence SHA-256 so replaced files cannot pass provenance review.
- [x] Remove stale "rerun pending" handoff notes now that latest-Godot typed input, visual capture, packaged export, and fallback-only provider proof are current.
- [x] Add Same Order visual evidence proxy report and backend verifier for existing renderer capture artifacts.
- [x] Add Store/Station record-prop close-up captures and visual proxy checks for required labeled props.
- [x] Clarify HUD role wording from investigation-owner phrasing to examiner/subject phrasing.
- [x] Re-export latest packaged tester app after examiner/subject HUD wording and rerun packaged route/preflight.
- [x] Persist packaged HUD examiner/subject proof into route Evidence and make tester preflight require it.
- [x] Add outcome consequence-chain recap and make smoke/capture/packaged route/preflight require it.
- [x] Add role-action recap to clean, repair, soft-report, and inquest terminal outcomes and route proofs.
- [x] Add Same Order asset bill-of-materials report and backend verifier for Kenney CC0 source packs, procedural Store/Station props, UI, and audio scope.
- [x] Add active goal proof audit that maps the Store/Station agentic social-sim goal to current evidence and remaining blockers.
- [x] Re-run playable slice smoke with latest Godot CLI to regenerate agentic route proofs from the Godot harness.
- [x] Add lightweight Ralph-style goal loop state using `.game-harness/goal-loop-state.md`, without replacing the existing harness.
- [x] Promote Codex gameplay QA as a first-class goal: AI agents must be able to play, inspect, and explain the running proof cell through stable public interfaces.
- [x] Add `aiPlayerReport` to the Codex gameplay QA artifact so AI-play checks summarize action path, player-visible state, cause chain, role actions, and human-comprehension boundary.
- [x] Add a Markdown sidecar for the Codex gameplay QA report so AI-play proof is readable without opening the full JSON artifact.
- [x] Add Codex route reports for clean cover, repair recovery, suspicious cover, soft report, and inquest through public gameplay actions.
- [x] Show Codex route report summaries in facilitator pack, worksheet, and session kit setup materials.
- [x] Bundle facilitator-only Codex gameplay QA JSON and Markdown snapshots into generated session kits.
- [x] Add session kit manifest JSON for AI-readable build, route, Codex QA, and external-gate binding.
- [x] Add session kit verifier for AI-readable setup, copied Codex artifacts, route reports, and no-spoiler tester invite.
- [x] Re-state AI-play QA as a non-optional product goal in the active goal prompt, loop state, and repo agent instructions.
- [x] Add Codex action catalog binding to session kit manifests and status output so AI-play setup proves callable player actions.
- [x] Make session kit verification cross-check manifest action/route data against the copied Codex gameplay probe JSON.
- [x] Make session kit verification require both Codex dialogue action paths: `dialogue.choice.by_id` and `dialogue.choice.by_index`.
- [x] Make session kit verification require an accepted Codex typed free-input step with a real text payload and inquest result.
- [x] Make session kit verification require Codex-visible HUD, record prop, civic ledger, and NPC role-action state from the copied gameplay probe.
- [x] Make generated session kits run their own verifier and save `session-kit-self-check.txt`.
- [x] Remove pre-play "Station intake" wording from facilitator prompts so fresh testers get a more neutral first run.
- [x] Lock AI-play QA into the active goal, loop state, and repo instructions as a per-increment acceptance condition, not just a helper script.
- [x] Reconfirm AI-play QA as a core goal for an AI-built game: prefer Codex-run gameplay probes over extra test code for player-view checks, while keeping tests lean for deterministic contracts.
- [x] Recenter agent guidance on game-first implementation: tests, AI-play probes, and evidence support the smallest playable Dream of One improvement instead of replacing it.
- [x] Reset goal guidance to open-environment social simulation: Store/Station is a tiny disposable example, and economy may be deliberately simple if it changes one NPC choice.
- [x] Make session kit verification require neutral facilitator pre-play wording and reject stale "Station intake path" prompts.
- [x] Tighten tester-invite no-spoiler verification to reject Station/record/risk/examined-role terms before fresh play.
- [x] Make tester-invite no-spoiler verification case-insensitive for English leak terms.
- [x] Make standalone `--recruitment` self-check tester invite spoiler terms before printing.
- [x] Add guard coverage proving standalone `--recruitment` fails on broad/case-insensitive tester-invite leaks before any fresh-player invite is used.
- [x] Add guard coverage proving session-kit verification fails if the Codex action catalog loses `dialogue.choice.by_index`.
- [x] Add guard coverage proving session-kit verification fails if the copied Codex probe loses the accepted typed free-input execution.
- [x] Add guard coverage proving session-kit verification fails if copied Codex probe loses player-visible HUD record state or Station Officer citation state.
- [x] Make session kit verification require the copied Codex Markdown gameplay report to remain readable: action path, cause chain, route outcomes, final state, role actions, NPC observations, and product boundary.
- [x] Add guard coverage proving session-kit verification fails if the copied Codex Markdown report keeps a valid hash but loses readable gameplay content.
- [x] Make session kit generation require Codex gameplay QA probe JSON/Markdown artifacts to be newer than the active Godot proof-cell files, and expose that freshness in status and self-check output.
- [x] Make session kit verification recompute Codex copied-artifact freshness against the current proof-cell files, so old kits fail after Godot/HUD/probe source changes.
- [x] Simplify the gate-status next action so live fresh-player play is the default path and session-kit setup is explicitly optional facilitator support.
- [x] Make `--status` concise at 0/3 notes: suppress successful preflight detail, summarize Codex QA setup readiness, and point directly at live fresh-player play.
- [x] Make the default live helper suppress successful packaged-preflight detail and avoid spoiler terms before launching the fresh-player session.
- [x] Bind default live raw notes to the current Codex gameplay QA route summary, matching worksheet and session-kit setup provenance.
- [x] Add a post-play reminder in the default live helper so facilitators ask for own-word comprehension and direct quotes before explaining the design.
- [x] Reorder default live raw-note prompts so own-word comprehension and direct quotes are captured before route labels and pass/fail scoring.
- [x] Simplify the manual-session README so the live fresh-player helper is the default path and setup modes are optional.
- [x] Print concise progress review commands after the live helper writes a raw note.
- [x] Print raw note count and minimum remaining fresh-player sessions immediately after the live helper writes a note.
- [x] Make the live helper print strict review and ledger-draft commands once raw notes reach three.
- [x] Remove stale Game Studio project-state blockers for preset recorded-statement proof, pending manual typed input, pending role review, and unresolved provider/export decision now that current evidence proves typed input, fallback-only provider mode, export setup, and conditional council review.
- [x] Update the resume handoff so `.game-harness/continue-here.md` points directly to fresh-player sessions, current session-kit verification, and the true external-comprehension blocker.
- [x] Remove stale "Station intake path" pre-play wording from the external comprehension ledger and guard against it returning.
- [ ] Run simulator adoption comprehension fresh-player sessions: can three fresh players explain local situation -> line -> artifact -> role action -> consequence?
- [x] Add facilitator-card mode for external comprehension sessions and verify strict review stays pending at 0/3 raw notes.
- [x] Add after-play debrief card mode for C1-C7-style questions and direct quote prompts.
- [x] Add comprehension gate status mode that reports packaged preflight plus raw session count before launch.
- [x] Add raw-note worksheet mode for remote or paper comprehension sessions with current app/evidence hashes.
- [x] Add facilitator-only run pack output mode for external comprehension sessions.
- [x] Add facilitator-only session kit directory output for external comprehension sessions.
- [x] Split tester-safe invite from facilitator-only recruitment/setup files.
- [x] Add raw manual-session note quality guide for fresh tester evidence.
- [x] Add guard that proves placeholder/filler comprehension notes fail strict review.
- [x] Complete Same Order storylet packet runtime mapping and provider fixtures.
- [x] Prepare playable smoke and visual capture to drive the HUD typed free-input field on the inquest route.
- [x] Decide legacy recorded-statement fallback is internal only, not tester-facing HUD copy.
- [x] Rerun Godot smoke/capture for the HUD typed free-input field.
- [x] Rerun playable smoke after adding response-hesitation proof to the inquest route.
- [x] Add Godot bridge readiness fallback smoke before M2 content expansion.
- [x] Decide live Godot-to-backend provider integration requirement before M2 content expansion.
- [x] Add HUD and Evidence Pack fallback-only provider state for the next Same Order smoke/capture.
- [x] Record current export setup blocker and local-only run proof.
- [x] Add minimal Godot PCK export preset and prove `--main-pack` Same Order smoke.
- [x] Install latest published Godot 4.7-beta2 command and matching macOS export templates.
- [x] Export macOS packaged app zip and prove packaged app launch with latest Godot.
- [x] Prove packaged app route play/provider UX before tester-facing M2 gate.
- [x] Prove provider/fallback state in-game once live-provider or fallback-only demo mode is selected.
- [x] Prove internal Same Order route contrast for clean cover, repair recovery, soft report, and inquest through headless playable smoke and backend validation.
- [x] Prove backend canonical route event validation for the internal route-proof gate.
- [x] Prove live backend/runtime authority or record an explicit fallback-only product decision before public demo claims.
- [x] Draft M1 content/runtime contract.
- [x] Produce M1 implementation handoff with exact file ownership.
- [x] Validate M1 implementation handoff through initial council review.
- [x] Select exact backend fixture/test filenames.
- [x] Select expected screenshot artifact path.
- [x] Check dirty worktree and isolate implementation scope.
- [x] Create Korean-first intake UI text table with English consequence parity.
- [x] Define safe/risky backend fixture and expected Evidence output.
- [x] Define API proposal-provider preflight/model fallback contract for M1.
- [x] Capture backend/Godot evidence after implementation, including renderer-backed Store conversation visual recapture.

## Blocked Until Stage Contract Exists

- [ ] Larger content expansion.
- [ ] Pitch materials.
- [ ] Full release QA checklist.

## Blocked Until External Comprehension Evidence

- [ ] Create open-environment procedure-cue issue from simulator adoption proof.
- [ ] Create visible record-to-role-action issue from simulator adoption proof.
- [ ] Create object-state issue for one tiny reusable environment prop set.
- [ ] Create toy economy issue for one visible value that changes one NPC choice.
- [ ] Create environment-affordance issue for 2-3 role agents using shared records.
- [ ] Split `.game-harness/milestones/M1-agentic-social-sim-prototype-plan.md` into focused Linear issues.
- [ ] Create civic ledger schema issue from `docs/scenario/content/environment-affordance-map.md`.
- [ ] Create deterministic role-agent tick issue from `docs/direction/16-agentic-prototype-target.md`.
- [ ] Create reusable environment asset bill-of-materials issue with source/license proof.

## Done

- [x] Local harness research captured.
- [x] Web game design/production/QA/agent harness research captured.
- [x] Initial Dream of One game harness seed drafted.
- [x] Director harness research captured.
- [x] Director Pack drafted.
- [x] M1 Protocol Proof milestone contract created.
- [x] M1 product/comprehension gate and evidence format defined.
