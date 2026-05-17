# M1 Same Order Four-Week Prototype Plan

Status: ready for issue split
Date: 2026-05-14
Stage: M1 Protocol Proof
Verdict: `READY_WITH_CONCERNS` for scoped execution

## Name

Same Order Team Prototype

## Direction Source

`direction-carry-in`

Primary design sources:

- `docs/direction/09-game-design-spine.md`
- `docs/direction/10-team-operating-brief.md`
- `docs/direction/11-simulator-benchmark-adoption-brief.md`
- `docs/direction/12-simulator-reference-map.md`
- `docs/scenario/content/social-simulation-cards.md`
- `docs/scenario/content/same-order-storylet-packet.md`

## Goal

Complete Same Order as a player-comprehensible M1 design cell by proving it
first as a mundane Store-to-Station procedure simulator.

## Proof Target

Can a fresh player understand that a Store conversation creates a record that
NPC and Station systems investigate?

Simulator adoption form:

```text
Store procedure
-> player line
-> clerk comparison
-> visible record
-> Station cites exact record
-> deterministic outcome
```

## Experience Hypothesis

If the player sees a Store premise, speaks under that premise, sees the clerk
socially read the line, sees a record form, and then sees Station cite that
record, the player will understand the game as pressured cover performance
instead of detective investigation.

## Proof Budget

| Constraint | Budget | Notes |
|---|---|---|
| Calendar time | 4 weeks | Stop for go/no-go at the end of week 4. |
| People | small core team | Game Director, Producer, Narrative, Systems, Godot UX, Backend, QA; Art/Audio advisory only. |
| Build target | local Godot playable route | Export proof happens week 4 only after readability/comprehension work. |
| Mechanics | dialogue choice, HUD typed recorded speech, report handoff, Station reconciliation | No new core verbs. |
| Content | Store Same Order plus Station reconciliation, receipt/correction/report record | No Studio/Park playable content. |
| Provider | fallback-only unless live provider is selected as explicit proof | No live AI public claim. |
| Capture and review | screenshots/contact sheet, optional video, human readability, comprehension notes | Captures must be from current build. |

## Deliverables

| Deliverable | Owner | Done means |
|---|---|---|
| Team operating brief | Game Director + Producer | Team scope, cuts, owners, proof, and blocked work are clear. |
| Same Order storylet packet | Narrative + Systems | beats, routes, runtime IDs, artifacts, prompt blocks, and provider fixtures are defined. |
| Store procedure guide | Godot UX + Narrative | queue/order/receipt/report cues are readable before Station consequence. |
| Recorded-statement decision | Game Director + Systems + Godot UX | implemented and proven, or explicitly cut from the prototype promise. |
| Consequence readability pass | Godot UX + Narrative | utterance -> NPC reaction -> why-line -> report/Station pressure is readable. |
| Report handoff and Station reconciliation | Systems + Godot + Narrative | Station prompt cites exact Store record. |
| Human readability review | UX + QA | current capture has no critical ambiguity. |
| External comprehension dry run | QA + Producer | tester notes answer investigation, speech danger, record, and consequence questions. |
| Provider/fallback decision | Producer + Systems | selected mode is documented and UI/release truth is aligned. |
| Export/setup proof or blocker | Release Producer + Godot Runtime | tester-facing launch path works or remains explicitly blocked. |

## Non-Goals

- broad M2 social propagation.
- playable Studio/Park expansion.
- full 3D value gate.
- final art/audio pass.
- public demo/store copy.
- live AI claim without runtime/provider proof.
- fixed GPT model promise.

## Weekly Plan

| Week | Proof target | Owners | Cut rule | Gate |
|---|---|---|---|---|
| 1 | Recorded-statement decision and cause-chain readability. Backend/Godot checks stay green; renderer capture plus human readability note exists. | Producer, Godot UX, Systems, Narrative, QA | Cut typed input by midweek if it cannot be proven. No new NPCs, locations, provider work, or polish. | M1 UI/readability gate. If unreadable, do not test externally. |
| 2 | Same Order design cell: Store procedure guide, safe/repair/risky/recorded lanes, visible record, Station exact-citation prompt. | Game Director, Narrative, Systems, Godot World, QA | No final art, multi-location expansion, broad social sim, or provider prose expansion. | Product review: player investigated, text danger, rule authority, visible consequence, Korean parity. |
| 3 | External comprehension: 3 fresh testers or a clearly marked proxy dry run; safe and risky paths observed. | QA Lead, Producer, UX/Narrative for fixes | Freeze features except P0/P1 legibility and comprehension fixes. No M2 content. | Comprehension gate: players understand investigation and text-as-Evidence; no role inversion. |
| 4 | Provider/fallback decision and export/setup proof. Evidence output path, provider state, and clean-machine or local launch note recorded. | Producer, Release Producer, Systems, Godot Runtime, QA | Cut live provider to fallback-only if unstable. Cut public demo claim if export/setup is weak. | M1/M2 go/no-go. `M1_PRODUCT_GO` only if product review and comprehension pass. |

## Quality Criteria

| Claim | Playable proof required | Pass condition |
|---|---|---|
| Player is investigated | blind run notes and capture | player says NPC/Station systems are evaluating them, not that they are investigating clues. |
| Speech creates record | visible selected/entered line, why-line, Store record, Evidence Pack | player can say which line caused the record. |
| Store procedure is legible | queue/order/receipt/report cues in current capture | player can state what normal behavior was before mismatch. |
| Repair matters | clean/repair route capture and Evidence | repair changes outcome without erasing records. |
| Social handoff exists | Store report and Station prompt | Station cites the exact Store record. |
| Provider boundary is honest | provider/fallback decision and UI/setup copy | no live AI or open chat overclaim. |

## Required Internal Evidence Artifacts

| Artifact | Owner | Path | What it proves |
|---|---|---|---|
| playable Evidence Pack | Backend + Godot | `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json` | route events and deterministic authority. |
| renderer capture/contact sheet | Godot UX | `data/evidence/godot/visual-capture/contact-sheet.png` | readable prompt, choices, consequence, and end state. |
| human readability note | UX + QA | `.game-harness/verification-ledger.md` or review log | current capture is readable by a human. |
| comprehension notes | QA | `.game-harness/verification-ledger.md` and review log | players understand investigation and consequence. |
| provider/fallback decision | Producer + Systems | `.game-harness/drift-log.md` if scope changes, otherwise verification ledger | selected authority mode and truth copy. |
| bug triage | QA | `.game-harness/review-log.md` or issue tracker | blockers, severity, owner, and retest status. |

## Review Roles

- Game Director
- Producer
- Narrative Director
- Systems Designer
- Backend Runtime Engineer
- Godot Runtime/UX
- Art/Audio Direction
- QA Lead
- Release Producer for week 4 only

## Required Verification

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
```

Renderer-backed visual capture:

```bash
godot --path godot --script res://tools/visual_capture.gd
```

If Godot is unavailable, record the blocker and do not claim Godot proof.

## Fallback Proof

If the plan breaks, prove a smaller claim:

- three authored choices only;
- no typed free input promise;
- deterministic fallback-only provider mode;
- visible Store record;
- Station prompt citing that record;
- one comprehension dry run.

## Must Keep

- player as investigated subject.
- dialogue as the main place where danger starts.
- deterministic authority over rules and consequences.
- Korean-first consequence parity.
- visible cause chain.

## Must Remain Blocked

- M2 content expansion.
- playable Studio/Park work.
- vertical slice label.
- public demo/release copy.
- live AI claims.
- fixed GPT model claims.
- final art/audio production.

## Risks

| Risk | Response |
|---|---|
| team treats cards as paperwork | every card must map to proof target, file scope, and verification. |
| UI remains debug-heavy | run readability gate before comprehension. |
| free input overpromises open chat | keep it framed as typed recorded speech, with deterministic classification and no open chatbot promise. |
| provider distracts from gameplay | fallback-only is acceptable for M1. |
| scope expands to locations | block Studio/Park until Same Order product gate passes. |

## Exit Decision

`READY`: M1 product review and comprehension pass, provider/export gaps are
proven or explicitly first M2 infrastructure, and human accepts movement.

`CONCERNS`: proof exists but one bounded risk remains; only targeted fix work
continues.

`NOT_READY`: comprehension, readability, provider truth, or route proof fails.

No stage movement happens without a human decision record.
