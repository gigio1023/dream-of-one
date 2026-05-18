# Release Strategy

## Release Position

Dream of One should first ship as a small truthful demo/prologue, not a broad commercial release.

Primary purpose:
- prove one short conversation-suspicion loop.
- prove dialogue pressure and deterministic consequence visibility.
- recruit collaborators or supporters.
- collect player comprehension data.
- avoid overpromising AI behavior.

## M1 Proof vs Complete Demo

M1 technical proof and a small complete prologue/demo are different claims.

M1 technical proof means:
- local backend, Godot, Evidence, bridge fallback, localization, keyboard, trajectory diversity, and visual-capture checks can pass.
- the dialogue -> suspicion signal -> Evidence/Exposure/report -> consequence protocol is technically credible.
- product and release blockers can still stop demo movement.

A small complete prologue/demo means:
- the player can complete one short NPC conversation route from ordinary prompt to suspicion, report/inquest, and session resolution.
- safe, uncertain/repair, risky, and optional free-input responses have visible deterministic differences.
- UI and visual hierarchy let the player read objective, dialogue risk, consequence, provider/fallback state, and end state without debug interpretation.
- external testers can explain that Station/NPC systems investigated them and that their dialogue changed suspicion/Evidence/Exposure.
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

GPT model names are not public promises. `gpt-5.4-mini` low reasoning effort is
the default `openai-codex` model, but do not claim any fixed GPT model unless
runtime verification proves it for the configured provider.

Model preference:
- `gpt-5.4-mini` with low reasoning effort is the only default model for the
  `openai-codex` provider route. Live claims still require runtime verification
  and the preconfigured request budget to pass.
- `gpt-5.4-nano` and `gpt-5-nano` are generic API models, not Codex-provider
  promises; do not use them through `openai-codex` unless live provider
  discovery proves availability.
- If runtime verification fails, release truth must say live GPT access is unavailable or must name the verified fallback mode.
- Public copy must describe the access mode, not the aspirational model target.

## Fallback Policy

No-provider fallback:
- must allow the demo to remain truthful.
- uses deterministic fallback lines.
- clearly marks live AI text as unavailable.
- preserves Dream Law, Evidence, Exposure, inquest, verdict, and session termination.

Current M1 provider mode:
- Same Order M1 is fallback-only until live API preflight and Godot-to-backend
  provider dispatch both pass.
- Provider-shaped backend contracts may be cited as boundary evidence only, not
  as live provider proof.
- Tester-facing setup and in-game UI still need to show the verified
  provider/fallback state before demo-complete claims.

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
- `gpt-5.4-mini` availability.

The public demo may claim only what the build proves:
- NPCs and Station systems investigate player dialogue.
- three-choice dialogue is the default interaction.
- optional free input is a recorded risky statement only if the build proves deterministic classification and fallback.
- API proposal providers can propose bounded NPC text when configured and verified.
- backend/runtime owns deterministic consequence.
- Korean-first with English selectable.

Before any public demo claim, proof must include:
- current-build gameplay capture for route readability, readable in-world text, consequence UI, and verdict/session-end state.
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
- dialogue consequence is not visible.
- choices read like abstract risk/debug buttons instead of plausible speech.
- optional free input is described as open chatbot play.
- UI requires debug knowledge to understand Evidence, Exposure, fallback state, or verdict.
- visual captures do not show route, interactable, pressure, consequence, and end-state readability.
- external player comprehension evidence is missing or failed.
- screenshots imply features not in build.
- install path is not tested.
