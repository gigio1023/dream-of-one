# Release Strategy

## Release Position

Dream of One should first ship as a small truthful demo/prologue, not a broad commercial release.

Primary purpose:
- prove one short Station Soft Inquest.
- prove text pressure and deterministic consequence visibility.
- recruit collaborators or supporters.
- collect player comprehension data.
- avoid overpromising AI behavior.

## M1 Proof vs Complete Demo

M1 technical proof and a small complete prologue/demo are different claims.

M1 technical proof means:
- local backend, Godot, Evidence, bridge fallback, localization, keyboard, trajectory diversity, and visual-capture checks can pass.
- the text -> Evidence -> Exposure -> consequence protocol is technically credible.
- product and release blockers can still stop demo movement.

A small complete prologue/demo means:
- the player can complete one short Station Soft Inquest route from start to inquest/verdict/session end.
- safe, risky, and repair/defuse choices have visible deterministic differences.
- UI and visual hierarchy let the player read objective, text risk, consequence, provider/fallback state, and end state without debug interpretation.
- external testers can explain that Station/NPC systems investigated them and that their text changed Evidence/Exposure.
- exported build/setup, provider mode, fallback behavior, screenshots, and public copy match the verified build.

`feat/prologue-demo-completion` targets the second claim. It may use M1 technical proof as a baseline, but it must not present that baseline as demo completion.

## API Proposal Provider Premise

Release direction no longer treats player-installed Codex CLI as a public prerequisite.

AI NPC text uses an API-based proposal provider only when the configured build verifies access at runtime.

The release copy must disclose the actual access mode:
- developer-hosted provider.
- player-configured provider credentials.
- deterministic fallback-only demo.
- no live AI mode.

Provider preflight must check:
- API configuration.
- model availability.
- structured output shape.
- timeout and retry behavior.
- deterministic fallback behavior.

GPT model names are not public promises. Do not assume `gpt-5.4-nano` or any fixed GPT model unless runtime verification proves it for the configured provider.

Model preference:
- `gpt-5.4-nano` is the preferred GPT model only for configured providers that pass runtime verification.
- If runtime verification fails, release truth must say live GPT access is unavailable or must name the verified fallback mode.
- Public copy must describe the access mode, not the aspirational model target.

## Fallback Policy

No-provider fallback:
- must allow the demo to remain truthful.
- uses deterministic fallback lines.
- clearly marks live AI text as unavailable.
- preserves Dream Law, Evidence, Exposure, inquest, verdict, and session termination.

## Current Build Truth

The current checked-in build may claim only what fresh evidence proves:
- Godot 3D shell and runtime slice load.
- backend Schema validation and deterministic fallback semantics exist.
- Evidence Packs can validate after the required checks pass.
- M1 technical proof can pass locally when the verification ledger commands pass.

The current checked-in build must not claim:
- live API-backed NPC proposal flow.
- full playable prologue.
- small complete prologue/demo.
- exported platform support.
- included AI hosting.
- fixed GPT model availability.
- product closure for M1.

M1 technical pass means:
- local checks prove the current protocol and Evidence contract.
- release/product blockers can still block public demo movement.
- PR copy must keep technical status and product status separate.

## Public Demo Truth

The public demo must not claim:
- open-ended NPC conversation.
- general AI storyteller.
- full campaign.
- final art/audio quality.
- live API provider access unless the build proves it.
- `gpt-5.4-nano` availability.

The public demo may claim only what the build proves:
- Station systems investigate player text.
- API proposal providers can propose bounded NPC text when configured and verified.
- backend/runtime owns deterministic consequence.
- Korean-first with English selectable.

Before any public demo claim, proof must include:
- current-build gameplay capture for route readability, interactable text surfaces, consequence UI, and verdict/session-end state.
- provider preflight or fallback-only disclosure in setup and in-game UI.
- external comprehension notes showing players understand the investigated-player role and text-to-consequence link.
- exported build/install evidence or an explicit decision that the artifact is not public-release ready.

Provider access must be disclosed in:
- install guide.
- demo page.
- in-game setup.
- known limitations.

## Steam/itch.io Stance

Initial target:
- itch.io or direct demo build for proof and team recruiting.

Steam page:
- wait until M3 3D Value Gate and M4 Complete Prologue Loop are plausible.
- screenshots must come from actual build.
- tags must avoid misleading player-investigator expectations.

## Pitch Proof

Minimum pitch assets before outreach:
- 1 minute gameplay capture.
- 5 minute playable proof.
- thesis and pillars.
- vertical slice roadmap.
- API proposal-provider access explanation.
- model availability and fallback explanation.
- scope and cut list.

## Release Blockers

Do not publish public-facing material if:
- player role is ambiguous.
- provider access mode is ambiguous.
- runtime model availability check is missing.
- generated text appears to own rules or verdict.
- text consequence is not visible.
- UI requires debug knowledge to understand Evidence, Exposure, fallback state, or verdict.
- visual captures do not show route, interactable, pressure, consequence, and end-state readability.
- external player comprehension evidence is missing or failed.
- screenshots imply features not in build.
- install path is not tested.
