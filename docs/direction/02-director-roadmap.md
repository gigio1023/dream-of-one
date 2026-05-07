# Director Roadmap

## M0: Thesis Lock

Status: active draft

Goal:
- Ensure the project can reject wrong ideas before implementation.

Exit evidence:
- game thesis.
- creative pillars.
- anti-games.
- authority boundary.

Current verdict:
- Mostly established, but needs future decisions recorded in the ledger.

## M1: Conversation Protocol Proof

Status: technical conditional pass; product gate open

Goal:
- Prove NPC prompt -> dialogue choice/free input -> deterministic suspicion signal -> Evidence/Exposure/report consequence.

Scope:
- one NPC conversation prompt.
- three dialogue choices.
- optional free input if deterministic classification is ready.
- one safe/local response.
- one uncertain/repair response.
- one risky/weird response.
- one deterministic consequence.

Required evidence:
- backend fixture and check.
- Godot-visible conversation UI.
- Evidence JSON with why-line.
- screenshot showing player-facing NPC reaction and consequence.
- API proposal-provider preflight, model availability, and fallback record.
- Korean source text with English consequence parity.

Exit:
- API proposal provider can propose wording without owning state.

Current blocker:
- council/product reviews and external player comprehension evidence are pending.
- live backend/provider integration is not proven beyond the bridge fallback smoke.
- exported build provider UX is not proven.

## M2: Social Propagation Prototype

Status: blocked by M1

Goal:
- Make NPC/Station investigation readable in play.

Scope:
- NPC unease.
- probing follow-up.
- suspicion sharing/report.
- repair attempt.
- soft verdict preview.

Required evidence:
- playable route.
- screenshot/video.
- player action timeline.
- first playtest or proxy observation.

Exit:
- player understands they are being investigated.

Entry rule:
- M2 content work starts only after `M1_PRODUCT_GO`, or after an explicit reducer decision that the first M2 task is infrastructure proof rather than content expansion.

## M3: 3D Value Gate

Status: blocked by M2

Goal:
- Decide whether 3D is worth continued investment.

Required evidence:
- contact sheet: player view, Station view, text close-up, verdict state.
- route/sightline review.
- text readability capture.
- keyboard-only path.

Exit:
- 3D demonstrably increases surveillance pressure.

If failed:
- simplify presentation before expanding content.

## M4: Complete Conversation Prologue

Status: blocked by M1-M3

Goal:
- One near-final 15-30 minute loop.

Required evidence:
- ordinary prompt -> suspicion signal -> social report -> Station intake/inquest/verdict arc.
- art/audio/UI target.
- Korean/English localization proof.
- QA checks.
- pitch/demo capture.

Exit:
- team can estimate production cost and content pipeline.

## M5: Export And Setup Proof

Status: blocked by vertical slice

Goal:
- Prepare a truthful player-facing demo.

Required evidence:
- install/run guide.
- API provider access mode, model availability, and fallback disclosure.
- screenshots from actual build.
- known limitations.
- store/pitch copy matching build truth.

Exit:
- public promise matches playable reality.
