# Release Strategy

## Release Position

Dream of One should first ship as a small truthful demo/prologue, not a broad commercial release.

Primary purpose:
- prove one short Station Soft Inquest.
- prove text pressure and deterministic consequence visibility.
- recruit collaborators or supporters.
- collect player comprehension data.
- avoid overpromising AI behavior.

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

Provider access must be disclosed in:
- install guide.
- demo page.
- in-game setup.
- known limitations.

## Steam/itch.io Stance

Initial target:
- itch.io or direct demo build for proof and team recruiting.

Steam page:
- wait until M3 3D Value Gate and M4 Vertical Slice are plausible.
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
- screenshots imply features not in build.
- install path is not tested.
