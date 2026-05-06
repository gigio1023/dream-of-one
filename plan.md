# Dream of One Product Completion Plan

## Current Direction

Dream of One is no longer scoped as a Godot migration alone. The release target is a small honest prologue/demo where the player is investigated by Station/NPC systems, text becomes danger, and deterministic backend/runtime authority owns Exposure, Evidence, Inquest, Verdict, and Session End.

The AI path is an API proposal provider. The provider may propose wording only: NPC line candidates, Station pressure wording, localized variants, and fallback text variants. It must not decide action type, risk tag, Evidence type, reason codes, why-line authority, Exposure delta, Inquest state, Verdict, or session termination.

## Branch Completion Target

`feat/prologue-demo-completion` is aimed at a small complete prologue/demo candidate, not just the M1 technical proof. M1 proof is the technical baseline: it says the protocol and Evidence contract can pass local checks. Demo completion is a higher product bar: it says a player can start, read, act, understand consequence, reach deterministic closure, and replay a meaningfully different path without misleading release claims.

The branch may advance toward demo completion only while these facts remain true:
- M1 technical checks stay green.
- product blockers are tracked as blockers, not release caveats.
- visual, UI, comprehension, provider, and exported-build gates have evidence in `.game-harness/verification-ledger.md`.
- public/demo copy can state the actual provider and fallback mode without guessing model availability.

## Milestone Ladder

| Order | Milestone | Gate to Advance |
|---|---|---|
| M0 | Release Truth Lock | One AI access premise is reflected across active docs: API proposal provider with runtime model availability checks and deterministic fallback. Public/release docs must not contradict `project.md`. |
| M1 | Protocol Proof | One Station intake surface proves text -> Evidence -> Exposure -> visible consequence. Gate requires backend check, valid Evidence Pack, Godot screenshot/capture, safe/risky contrast, Korean/English parity, provider preflight/fallback contract, and non-blocking role reviews. |
| M2 | Social Pressure Prototype | Player completes a short route with Station/NPC probe, escalation, defuse/repair, and soft verdict preview. Gate is player-facing: a tester/proxy can say "the Station is investigating me." |
| M3 | 3D Value Gate | 3D earns its cost. Require contact sheet, readable text at play distance, keyboard-only route, route/sightline review, camera/input proof, and visual capture showing surveillance pressure. |
| M4 | Complete Prologue Loop | One 15-30 minute Station Soft Inquest loop: Station -> Store -> Studio -> Park -> Station, with three deterministic outcomes, repair paths, why-lines, localization, and backend-owned intake/inquest/verdict. |
| M5 | Export And Setup Proof | Exported build launches outside editor, writes evidence to an appropriate user/app-data path, provider preflight/fallback failures are controlled, and screenshots/captures come from the exported build. |
| M6 | External Comprehension QA | Clean-machine setup, failure soak, keyboard-only run, Korean/English runs, no P0/P1 bugs, and at least 8/10 testers can explain why Exposure changed. |
| M7 | Honest Demo Release | itch/direct demo only after public claim map passes: store copy, screenshots, trailer/GIF, AI disclosure, limitations, credits, support path, and build truth all match. Steam remains later. |

## Game-Like Completion Bar

The small complete prologue/demo bar is not satisfied by command success alone. It requires:

1. A complete loop: start, Station framing, route movement, text response, Evidence classification, Exposure consequence, inquest or soft inquest, verdict or session end, and restart/replay.
2. A playable choice contrast: at least one safe/risky response pair and at least one repair or defuse path that changes the outcome.
3. Visual proof: current-build captures showing route readability, interactable text surfaces, surveillance pressure, HUD consequence, and verdict/session-end state.
4. UI proof: player-facing prompts, why-lines, Exposure/Evidence changes, fallback/live-provider status, localization state, and failure/recovery messaging are readable without debug framing.
5. Player comprehension proof: external testers can explain that Station/NPC systems are investigating them, that their text changed Evidence/Exposure, and why the session outcome happened.
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

Current `feat/prologue-demo-completion` progress:
- internal Station Soft Inquest smoke proves rule read, Cover Test focus, safe/risky contrast, why-line escalation, deterministic verdict/session end, locked post-verdict input, and restart/quit end controls.
- HUD and world presentation now have current-build visual evidence for Station framing, text surface readability, Cover Test prompt, Exposure/why-line consequence, and verdict/session-end readability. Automated capture records expected visual content for human review; it does not replace OCR/taste/readability review.
- these are internal proof gates only; they do not replace external comprehension, provider truth, exported build, or repair/replay proof.

Remaining blockers before the branch can claim a small complete prologue/demo:
- council/product review acceptance of the API proposal-provider wording-only boundary.
- live Godot/backend/provider integration or an explicit deterministic fallback-only demo decision.
- provider preflight UX and runtime model availability evidence.
- exported build setup and capture from the exported build.
- repair/replay outcome contrast beyond the current forced safe/risky Station smoke.
- provider/fallback UI proof for the selected live-provider or fallback-only demo mode.
- live backend/runtime authority proof before public demo authority claims; the current playable smoke identifies itself as `godot_local_smoke_runtime`.
- external player comprehension evidence.
- release-truth copy and asset review against actual build behavior.

## Required Checks

Do not call M1 product-complete until backend checks, Godot headless checks, playable Evidence Pack validation, trajectory diversity, bridge fallback smoke, visual/playable proof, release-truth search, council/product review, and external comprehension evidence all pass.

Do not call the small prologue/demo complete until the Game-Like Completion Bar has fresh verification evidence and every remaining blocker above is either passed or explicitly removed by a human product decision.
