# Continue Here

Last Updated: 2026-05-12

## Current State

M1 technical proof now passes locally with the conversation-first playable path. Treat this as engineering evidence only:
- backend check: pass, including deterministic conversation suspicion fixtures, ordered same-NPC conversation turns, playable Evidence Pack schema validation, and trajectory diversity verification.
- Godot import/syntax/scene/evidence/runtime/playable/localization/keyboard smokes: pass.
- Godot live backend bridge smoke: pass for mock-ready, missing-key fallback, and live-unavailable fallback paths.
- shell/runtime/playable Evidence Packs validate with backend `validateGodotEvidencePack`.
- visual capture script now expects the Store conversation path. Headless capture still cannot read viewport pixels, but non-headless renderer capture produced current Store conversation screenshots and a contact sheet.

M1 is not product-closed until council/product review, player comprehension evidence, live provider integration/preflight, and exported-build/setup decisions accept the API proposal-provider boundary.

Direction pivot:
- The intended player-facing game is now conversation-first suspicion, not abstract Cover Test button escalation.
- Default interaction target is three diegetic dialogue choices plus optional typed free input. Current proof uses a preset line and records it as statement Evidence; manual text-entry UI remains pending.
- NPC suspicion starts from conversation weirdness, then escalates through probing, sharing/report, Station intake, inquest, and verdict.
- The current Station Soft Inquest smoke remains internal authority/Evidence harness evidence only.

Current lane and umbrella target:
- current scoped lane: `feat/ui-visual-readability-pass`.
- umbrella target: `feat/prologue-demo-completion`.
- keep M1 technical proof green as the baseline.
- distinguish M1 proof from a small complete prologue/demo in all PR and planning updates.
- close or explicitly block conversation/UI/player-comprehension/provider/export gates before claiming the umbrella is demo-complete.
- treat broader route, inquest, verdict, and replay work as demo-completion work only after the conversation-first loop is proven.

Current lane progress:
- the playable smoke now proves `Same Order` route contrast with fresh scenes: clean cover, repair recovery, soft report, and hard inquest.
- the hard inquest route still proves Store Clerk prompt -> risky line -> preset recorded statement -> deterministic suspicion signals -> Station report/inquest -> locked session end.
- player-facing controls are now `dialogue_choice_1/2/3` plus `dialogue_free_input`; `dialogue_free_input` submits a preset line in the smoke. `SA_COMPLY/SA_BREAK` remain only in legacy runtime-slice authority tests.
- backend Evidence validation now preserves conversation identity, selected line, free-input hash, suspicion signals, suspicion/report deltas, and why-line fields.
- backend Evidence validation now also checks Same Order route proofs through `validateGodotEvidencePackSameOrderRouteProofs`.
- DecisionService preserves ordered same-NPC conversation turns instead of latest-wins coalescing when `conversation.turnId` is present.
- HUD now shows NPC prompt, three diegetic choices, free-input affordance, recorded-statement result, why-line, Evidence count, suspicion/report pressure, and end controls.
- UI/visual readability pass added a compact traversal HUD, larger conversation choice rows, explicit recorded-statement label, localized record summaries, Store Clerk reaction marker, and Store conversation staging cues. This improves presentation proof but does not close human readability or player comprehension.
- playable smoke declares `godot_local_conversation_runtime`, so public/demo authority still requires live backend/runtime integration or an explicit fallback-only product decision.

Small complete prologue/demo bar:
- player can start, understand they are being investigated, answer NPC prompts through three choices or optional typed free input, see NPC suspicion and Evidence/Exposure/report consequences, reach inquest/verdict/session end, and replay at least one meaningfully different outcome or repair path.
- UI clearly shows NPC prompt, three dialogue choices, optional typed-free-input risk, selected/entered text consequence, why-line, suspicion/report state, provider/fallback state, localization state, and verdict/session-end result.
- renderer-backed screenshots are conversation-aligned and current; human readability review remains pending.
- external tester notes prove comprehension; forced/proxy smokes do not close this blocker.

Long-running PR lifecycle:
- Keep bot feedback, review threads, and resolved/blocked status in `.game-harness/pr-review-ledger.md`.
- Separate M1 technical-pass evidence from product blockers in PR updates.
- Do not present live API/GPT availability as solved unless a fresh runtime preflight proves it.

Harness research and methodology were created under:
- `docs/research/2026-04-30/harness-methodology/`

Active harness entry:
- `docs/development/harness/README.md`

Current game-development state:
- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- `.game-harness/review-log.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/pr-review-ledger.md`
- `.game-harness/drift-log.md`

## Next Best Action

Advance the conversation-first proof from forced engineering path to product evidence. Do not expand content before the small "Same Order" proof has manual replay/readability validation and comprehension evidence.

Already implemented:
- conversation prompt/choice/free-input schema
- deterministic suspicion signal taxonomy and fixtures
- one NPC `Same Order` micro-scenario with clean cover, repair recovery, soft report, and inquest paths
- headless HUD state path with three dialogue choices and a recorded-statement result
- renderer-backed Store conversation screenshots and contact sheet
- Evidence Pack with conversation identity, selected line, free-input hash, signals, suspicion/report deltas, and why-line

Remaining required outputs:
- council review verdicts for API provider wording-only boundary
- live Godot backend/provider integration decision
- provider preflight UX decision
- runtime provider verification result before naming any live GPT model as available
- manual typed free-input UI if free input stays in the demo promise
- visual/UI gate evidence for provider/fallback state once live-provider or fallback-only demo mode is selected
- human visual/readability review of the refreshed Store conversation contact sheet
- manual replay/readability validation for the internally proven route contrast
- live backend/runtime authority proof or explicit fallback-only product decision
- player comprehension/playtest note
- exported build/setup plan
- PR bot-feedback ledger updates until all review feedback is closed or explicitly blocked

## Do Not Skip

- Do not implement broader content before M1 Protocol Proof exists.
- Do not keep abstract `SA_COMPLY`/`SA_BREAK` buttons as the player-facing primary loop.
- Do not call optional free input open-ended NPC chat.
- Do not call a recorded statement proof a manual typed-input UI proof.
- Do not let provider-generated NPC text own Exposure, verdict, or session termination.
- Prefer `gpt-5.4-nano` only after runtime provider verification confirms it for the configured provider.
- Do not assume live API access, model availability, credentials, or provider hosting from local technical checks.
- Do not claim product-playable or demo-complete until Godot/backend evidence, renderer-backed visual evidence, human readability review, and player comprehension evidence exist.
- Do not claim small prologue/demo completion from M1 technical proof alone.
