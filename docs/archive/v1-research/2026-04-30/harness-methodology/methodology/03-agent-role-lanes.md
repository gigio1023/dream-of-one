# Agent Role Lanes

Role lanes are used to make broad game work reviewable. Each lane has one responsibility, one output shape, and clear blockers.

## Game Director Lane

Reads:
- `game-seed.md`
- scenario bible
- current stage plan
- latest playable evidence

Checks:
- player promise
- fantasy coherence
- novelty
- emotional arc
- scope discipline

Blocks when:
- player role changes.
- scene is technically correct but no longer expresses the game.
- added content weakens the 20-30 minute small-release loop.

Output:
- `APPROVE`, `CONDITIONAL`, or `BLOCK`
- player-facing reason
- required seed/stage correction

## Narrative Design Lane

Reads:
- scenario beat sheet
- NPC motive table
- text surface table
- localization notes

Checks:
- beat causality
- speaker motive
- text as the start of risk
- repeated line fatigue
- Korean-first meaning
- fallback line safety

Blocks when:
- text is decorative only.
- dialogue creates rule authority not owned by backend.
- English and Korean imply different consequences.

## Systems Design Lane

Reads:
- authority map
- backend schema
- runtime state model
- evidence semantics

Checks:
- Mechanics -> Dynamics -> Aesthetics mapping
- threshold ownership
- exploit path
- deterministic fallback
- state transition completeness

Blocks when:
- Godot or generated text owns verdict/session termination.
- Exposure or Cover Test can change without Evidence.
- invalid command payload can produce success evidence.

## Level Design Lane

Reads:
- Godot scene map
- world layout data
- playable route
- screenshot/contact sheet

Checks:
- route readability
- sightline and attention pressure
- landmark placement
- text surface placement
- camera/input constraints

Blocks when:
- scene exists but player path is unclear.
- interactable text is not readable.
- space invites investigation fantasy instead of being investigated.

## Godot Runtime Lane

Reads:
- `godot/`
- `godot/data/world_layout.json`
- scene smoke/evidence outputs
- Godot docs when API uncertainty exists

Checks:
- scene/node ownership
- signals and groups
- CharacterBody3D/navigation/collision where needed
- resource import
- screenshot/run evidence
- no legacy path reintroduction

Blocks when:
- direct transform teleport bypasses intended movement/collision in production logic.
- missing anchors collapse to origin.
- scene smoke depends on incidental config.

## QA / Playtest Lane

Reads:
- acceptance criteria
- verification ledger
- playable path
- known issues

Checks:
- reproducibility
- blocker severity
- user confusion
- input accessibility
- localization layout
- regression coverage

Blocks when:
- no fresh command output exists.
- no screenshot or playable evidence exists for visual/UI changes.
- playtest notes do not map to fixes or accepted risk.

## Art / Audio / Game Feel Lane

Reads:
- art direction notes
- audio cue map
- screenshot/video evidence
- level route
- UI text surfaces

Checks:
- visual identity
- material/lighting consistency
- affordance readability
- state-bound audio cues
- camera stability
- response timing

Blocks when:
- polish hides the system state.
- assets look better individually but weaken product identity.
- UI/game feel makes consequence hard to read.

## Release Producer Lane

Reads:
- release definition
- store copy
- install/run guide
- verification ledger
- known issue list

Checks:
- build truth vs public claims
- platform requirements
- Codex CLI requirement clarity
- screenshots
- supported language/platform list
- pencils-down exceptions

Blocks when:
- public materials promise missing features.
- Codex subscription/install requirement is hidden.
- RC build changed after verification without rerun.

## Multi-Agent Dispatch Rule

Use parallel subagents only when lanes do not need the same immediate blocking result and do not write the same files. Assign file ownership before spawning. Every subagent that writes research or review output must write a markdown artifact before completion.
