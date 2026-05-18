# Dream of One Product Completion Plan

## Current Direction

Dream of One is no longer scoped as a Godot migration alone. The release target is a small honest prologue/demo where the player is investigated by Station/NPC systems, dialogue becomes danger, and deterministic backend/runtime authority owns suspicion signals, reports, Exposure, Evidence, Inquest, Verdict, and Session End.

The AI path is an API proposal provider. The provider may propose wording only:
NPC line candidates, Station pressure wording, localized variants, and fallback
text variants. It must not decide action type, risk tag, Evidence type, reason
codes, why-line authority, Exposure delta, Inquest state, Verdict, or session
termination. For all provider/auth work, route through
`docs/agent-search-index.md` and `docs/development/ai-provider-runtime.md`;
game-runtime Codex auth means the backend `openai-codex` provider profile, not
Codex CLI login.

The AI/NPC philosophy is stronger than wording variation. Dream of One should
move toward `AGENT_LOOP_RUNTIME`, defined in
`docs/direction/17-agent-loop-runtime-pivot.md`: NPCs receive context, goals,
memory, and validated tools, then observe, act, read tool results, and iterate.
Do not treat "add another fixed NPC reaction chain" as the default next game
improvement.

## Current Lane And Umbrella Target

`feat/ui-visual-readability-pass` is the current scoped lane. It sits under the broader `feat/prologue-demo-completion` umbrella, which is aimed at a small complete prologue/demo candidate, not just the M1 technical proof. M1 proof is the technical baseline: it says the protocol and Evidence contract can pass local checks. Demo completion is a higher product bar: it says a player can start, hold a short conversation, choose or enter a line, understand NPC suspicion and consequence, reach deterministic closure, and replay a meaningfully different path without misleading release claims.

The umbrella may advance toward demo completion only while these facts remain true:
- M1 technical checks stay green.
- product blockers are tracked as blockers, not release caveats.
- new NPC, location, storylet, provider, and UI work follows `docs/direction/09-game-design-spine.md` and `docs/scenario/content/social-simulation-cards.md`.
- the active team scope follows `docs/direction/10-team-operating-brief.md` and `.game-harness/milestones/M1-same-order-four-week-prototype-plan.md`.
- simulator-first planning follows `docs/direction/11-simulator-benchmark-adoption-brief.md` and `docs/direction/12-simulator-reference-map.md`.
- agentic prototype planning follows `docs/direction/15-agentic-social-simulation-model.md`,
  `docs/direction/16-agentic-prototype-target.md`,
  `docs/direction/17-agent-loop-runtime-pivot.md`,
  `docs/scenario/content/environment-affordance-map.md`, and
  `.game-harness/milestones/M1-agentic-social-sim-prototype-plan.md`.
- visual, UI, comprehension, provider, and exported-build gates have evidence in `.game-harness/verification-ledger.md`.
- public/demo copy can state the actual provider and fallback mode without guessing model availability.

## Milestone Ladder

| Order | Milestone | Gate to Advance |
|---|---|---|
| M0 | Release Truth Lock | One AI access premise is reflected across active docs: API proposal provider with runtime model availability checks and deterministic fallback. Public/release docs must not contradict `project.md`. |
| M1 | Conversation Protocol Proof | One NPC conversation proves prompt -> three choices plus typed-free-input contract -> deterministic suspicion signal -> Evidence/Exposure/report consequence. Gate requires backend check, valid Evidence Pack, renderer-backed Godot screenshot/capture, safe/uncertain/risky contrast, Korean/English parity, provider preflight/fallback contract, and non-blocking role reviews. |
| M1A | Agent Loop Prototype | One tiny environment exposes five or fewer validated tools; one NPC iterates through observe/tool/result steps with another NPC and one object or record. Gate requires a player/Codex-readable transcript, deterministic tool validation, and proof that a blocked or busy result changed the NPC's next step. |
| M2 | Social Propagation Prototype | Player completes a short route with NPC unease, probing, suspicion sharing, report, defuse/repair, and soft Station preview. Gate is player-facing: a tester/proxy can say "the NPCs are investigating my words through the environment and records." |
| M3 | 3D Value Gate | 3D earns its cost. Require contact sheet, readable text at play distance, keyboard-only route, route/sightline review, camera/input proof, and visual capture showing surveillance pressure. |
| M4 | Complete Conversation Prologue | One 15-30 minute conversation suspicion loop: ordinary NPC prompt -> social suspicion -> report -> Station intake/inquest, with three deterministic outcomes, repair paths, why-lines, localization, and backend-owned intake/inquest/verdict. |
| M5 | Export And Setup Proof | Exported build launches outside editor, writes evidence to an appropriate user/app-data path, provider preflight/fallback failures are controlled, and screenshots/captures come from the exported build. |
| M6 | External Comprehension QA | Clean-machine setup, failure soak, keyboard-only run, Korean/English runs, no P0/P1 bugs, and at least 8/10 testers can explain why Exposure changed. |
| M7 | Honest Demo Release | itch/direct demo only after public claim map passes: store copy, screenshots, trailer/GIF, AI disclosure, limitations, credits, support path, and build truth all match. Steam remains later. |

## Game-Like Completion Bar

The small complete prologue/demo bar is not satisfied by command success alone. It requires:

1. A complete loop: start, NPC prompt, dialogue choice or typed free input, suspicion classification, Evidence/Exposure/report consequence, inquest or soft inquest, verdict or session end, and restart/replay.
2. A playable choice contrast: at least one safe/uncertain/risky response set and at least one repair or defuse path that changes the outcome.
3. Visual proof: current-build captures showing route readability, readable in-world text, surveillance pressure, HUD consequence, and verdict/session-end state.
4. UI proof: player-facing prompts, why-lines, Exposure/Evidence changes, fallback/live-provider status, localization state, and failure/recovery messaging are readable without debug framing.
5. Player comprehension proof: external testers can explain that Station/NPC systems are investigating them, that their dialogue changed suspicion/Evidence/Exposure, and why the session outcome happened.
6. Release truth proof: exported build/setup, provider preflight, fallback behavior, limitations, screenshots, and public copy all match the verified build.

## Current M1 State

Current implementation work has reached M1 technical proof pass. Product work must close M1 before expanding content:

1. Keep Godot 4.x as the only active engine runtime.
2. Keep TypeScript NPC backend as deterministic policy, scheduling, fallback, provider preflight, and Evidence layer.
3. Keep playable evidence backend-valid through `validateGodotEvidencePack`.
4. Prove API provider model availability checks without assuming `gpt-5.4-nano`.
5. Verify deterministic fallback when provider key, model, rate limit, timeout, or proposal validation fails.
6. Keep three-run trajectory diversity verification passing.
7. Close the M1 product/comprehension gate before M2 content expansion.
8. Record the exact pass/fail state in `.game-harness/verification-ledger.md`.
9. Reframe the next prototype as `agent_loop_probe_v0`, not another fixed
   Store/Station social chain.
10. Prove one role agent iterates through generic tools, observes results, and
   chooses the next step while conversation remains the central player action.

Current `feat/ui-visual-readability-pass` lane progress:
- benchmark research now reframes Same Order as a Store-to-Station procedure
  simulator first: normal Store procedure, player line, clerk comparison,
  visible record, Station citation, deterministic outcome.
- active prototype target now reframes Same Order as scaffolding for an
  agent-loop social simulation: conversation changes context, tools become
  available, a role agent should iterate over tool results, and deterministic
  authority validates the world changes.
- playable smoke now proves the new player-facing `Same Order` runtime path with four internal route outcomes: clean cover, repair recovery, soft report, and hard inquest.
- the hard inquest route still proves NPC prompt, three dialogue choices, risky line, preset recorded statement, deterministic suspicion signals, Station report/inquest, locked session end, and backend-valid Evidence Pack.
- backend validation now checks both the ordered Same Order inquest chain and the Same Order route-proof set.
- internal Station Soft Inquest smoke remains legacy authority evidence in runtime-slice tests only. It is no longer the player-facing playable smoke.
- HUD now exposes NPC prompt, three diegetic choices, free-input affordance, recorded-statement result, suspicion/report pressure, why-line, Evidence count, and deterministic end controls. Manual text-entry UI remains pending.
- visual capture expectations have been realigned to the Store conversation path; renderer-backed `godot --path godot --script res://tools/visual_capture.gd` now produces nonblank PNGs and a contact sheet. Human readability review remains pending.
- these are internal proof gates only; they do not replace manual replay/readability/comprehension validation, external comprehension, provider truth, or exported build proof.

Remaining blockers before the umbrella can claim a small complete prologue/demo:
- simulator adoption proof: fresh player can explain the Store procedure,
  captured line, record, and Station citation without reading docs.
- agent-loop proof: fresh player or Codex can explain which tool calls an NPC
  tried, which result blocked or changed the plan, and what the NPC did next.
- civic ledger proof: route evidence shows object state, economy delta, agent
  perception/action, validation result, and ledger event.
- manual typed free-input UI if free input remains in the demo promise.
- council/product review acceptance of the API proposal-provider wording-only boundary.
- live Godot/backend/provider integration or an explicit deterministic fallback-only demo decision.
- provider preflight UX and runtime model availability evidence.
- exported build setup and capture from the exported build.
- provider/fallback UI proof for the selected live-provider or fallback-only demo mode.
- live backend/runtime authority proof before public demo authority claims; the current playable smoke identifies itself as `godot_local_conversation_runtime`.
- external player comprehension evidence.
- manual replay/readability evidence for the internally proven route contrast.
- release-truth copy and asset review against actual build behavior.

## Required Checks

Do not call M1 product-complete until backend checks, Godot headless checks, playable Evidence Pack validation, trajectory diversity, bridge fallback smoke, renderer-backed visual/playable proof, release-truth search, council/product review, and external comprehension evidence all pass.

Do not call the small prologue/demo complete until the Game-Like Completion Bar has fresh verification evidence and every remaining blocker above is either passed or explicitly removed by a human product decision.
