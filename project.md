---
status: M1 technical proof pass; visual readability lane active; prologue/demo completion gate open
runtime_path: Godot 4.x + TypeScript NPC backend
---

# Dream of One - Project Definition

Dream of One is a Godot 4.x 3D conversation social-stealth game where NPC society pressures the player through dialogue choices, bounded typed free input that can become recorded statements, social suspicion, Station intake, inquest, verdict, and deterministic session end states.

## Product Rails

- Player is not an investigator. NPCs and Station systems investigate the player.
- Dialogue is the main danger surface. Dream Laws are exposed through NPC prompts, prior conversation memory, diegetic records, and Station pressure.
- Default interaction is three diegetic dialogue choices plus optional typed free input when deterministic classification and UI are proven. Recorded statements are Evidence artifacts, not open-ended chat.
- Suspicion starts socially: an NPC notices conversational weirdness, probes, shares a report, and only then can Station pressure formalize it.
- API proposal-provider-backed NPC society proposes bounded wording only: NPC line candidates, Station pressure wording, localized variants, and fallback text variants.
- GPT model availability is checked at runtime. `gpt-5.4-nano` is not assumed by design, docs, or release planning.
- Deterministic adjudication owns validation, fallback selection, Exposure thresholds, Station intake/inquest, verdict, and session termination.
- Deterministic adjudication also owns action choice, risk tags, Evidence type, reason codes, why-line authority, and session-end authority.
- Godot owns world presentation, player/NPC movement, 3D collision/navigation observations, visuals, and scene-local interaction surfaces.

## Active Runtime Path

- Godot project root: `godot/`
- Main scene: `godot/scenes/main.tscn`
- World layout data: `godot/data/world_layout.json`
- Backend root: `backend/npc-runtime/`
- Godot runtime Schema: `backend/npc-runtime/src/godot/runtime-schema.ts`
- Evidence output: `data/evidence/godot/`

## Scenario Source Of Truth

- Active scenario docs: `docs/scenario/`
- First conversation-first scenario: `docs/scenario/bible/12-conversation-suspicion-prologue.md`
- Historical Station material: `docs/scenario/bible/05-episode-station-soft-inquest.md`
- Scenario line bank: `docs/scenario/content/dialogue-line-bank.md`
- Scenario placement contract: `docs/scenario/content/location-placement-contracts.md`
- Scenario QA rubric: `docs/scenario/playtest/scenario-qa-rubric.md`

`docs/runtime/godot/` is runtime and cutover evidence. Do not store scenario canon there.

## Current Build Truth

- The current build proves M1 technical proof only: Godot shell/runtime/playable slice, backend Schema validation path, trajectory diversity verification, and Godot bridge readiness fallback smoke.
- The current lane `feat/ui-visual-readability-pass` proves local conversation-first `Same Order` route contrast internally: clean cover, repair recovery, soft report, and hard inquest from the same Store Clerk prompt set. The hard route includes a preset recorded statement, deterministic suspicion signals, Station report/inquest, locked session end, and backend-valid playable Evidence Pack.
- The old Station Soft Inquest path is internal harness evidence only. It remains in runtime-slice authority tests, not as the player-facing playable loop.
- The current build does not yet prove a public small complete prologue/demo, live API proposal-provider loop, live backend/runtime authority, exported demo, manual typed free-input UI, external player comprehension, human visual readability, or manual replay/readability of the internally proven route contrast.
- M1 product closure still requires council/product review and external player comprehension evidence.
- The first public promise is a small honest prologue/demo only after completion gates pass.
- Public copy must not imply open-ended conversation, included AI hosting, a fixed GPT model, or final campaign scope.

## Current Lane And Umbrella Target

`feat/ui-visual-readability-pass` is the current scoped lane. It sits under the broader `feat/prologue-demo-completion` umbrella, which targets a small complete prologue/demo candidate. Neither lane may treat M1 technical proof as the same thing as demo completion.

The current lane target is:
- keep the verified M1 technical proof passing as the baseline.
- keep the conversation-first proof honest by adding manual typed-input UI if needed, manual replay/readability/comprehension validation, human readability review, player-comprehension, provider, and exported-build gates before expanding scope.
- produce truthful evidence for whether the umbrella can continue toward demo completion, should merge current work as M1-only proof, or should stop for product fixes.

A small complete prologue/demo means the player can start, understand they are being investigated, answer NPC prompts through three dialogue choices or optional typed free input, see NPC suspicion and Evidence/Exposure consequences, reach deterministic report/inquest/verdict/session end, and replay with at least one meaningfully different outcome or repair path.

## Migration Acceptance

The branch is PR-ready only when:

1. Backend checks pass with no legacy engine dependency.
2. Godot import and scene smoke checks pass.
3. Godot Evidence Packs validate against backend Schema.
4. Repository search shows no active previous-engine/runtime references outside intentional historical git deletion records.
5. Follow-up issues for live Godot backend/provider integration, full playable report-intake-verdict controller, runtime selector removal, exported provider UX, visual/UI proof, and player comprehension evidence are explicit if not implemented in the same PR.

## Verification

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
```
