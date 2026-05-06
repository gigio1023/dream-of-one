# Continue Here

Last Updated: 2026-05-06

## Current State

M1 technical proof now passes locally. Treat this as engineering evidence only:
- backend check: pass, including trajectory diversity verification.
- Godot import/syntax/scene/evidence/runtime/playable/localization/keyboard smokes: pass.
- Godot live backend bridge smoke: pass for mock-ready, missing-key fallback, and live-unavailable fallback paths.
- shell/runtime/playable Evidence Packs validate with backend `validateGodotEvidencePack`.
- visual capture produced `main-shell.png` and `playable-verdict.png`.

M1 is not product-closed until council/product review, player comprehension evidence, live provider integration/preflight, and exported-build/setup decisions accept the API proposal-provider boundary.

Branch target for `feat/prologue-demo-completion`:
- keep M1 technical proof green as the baseline.
- distinguish M1 proof from a small complete prologue/demo in all PR and planning updates.
- close or explicitly block visual/UI/player-comprehension/provider/export gates before claiming a demo-complete branch.
- treat broader route, inquest, verdict, and replay work as demo-completion work, not as evidence that M1 is already product-closed.

Current branch progress:
- internal Station Soft Inquest smoke now proves Station rule read -> Cover Test focus -> safe `SA_COMPLY` -> risky `SA_BREAK` why-line escalation -> deterministic verdict/session end with post-verdict input locked.
- HUD now exposes case framing, Exposure meter, safe/risky consequence copy, why-line, Evidence count, deterministic verdict trace, and end controls.
- world presentation now adds stronger Station route/surveillance cues, larger text surfaces, Cover Test zone framing, and visible player body/camera offset.
- visual capture now exports five current-build screenshots plus a contact sheet and manifest with no blocked checks when run with the normal renderer; the manifest is automated evidence, not an OCR/taste substitute.
- playable smoke declares `godot_local_smoke_runtime`, so public/demo authority still requires live backend/runtime integration or an explicit fallback-only product decision.

Small complete prologue/demo bar:
- player can start, understand they are being investigated, make text responses, see Evidence/Exposure consequences, reach inquest/verdict/session end, and replay at least one meaningfully different outcome or repair path.
- UI clearly shows prompt, selected/entered text consequence, why-line, Exposure state, provider/fallback state, localization state, and verdict/session-end result.
- visual captures prove route readability, interactable text surfaces, surveillance pressure, HUD consequence, and end-state readability from the current build.
- external tester notes prove comprehension; forced/proxy smokes do not close this blocker.

Long-running PR lifecycle:
- Keep bot feedback, review threads, and resolved/blocked status in `.game-harness/pr-review-ledger.md`.
- Separate M1 technical-pass evidence from product blockers in PR updates.
- Do not present live API/GPT availability as solved unless a fresh runtime preflight proves it.

Harness research and methodology were created under:
- `docs/research/harness-methodology/2026-04-30/`

Active harness entry:
- `docs/harness/README.md`

Current game-development state:
- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- `.game-harness/review-log.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/pr-review-ledger.md`
- `.game-harness/drift-log.md`

## Next Best Action

Close M1 product review, then select whether this branch continues toward small complete prologue/demo or narrows to M1-only proof. Do not expand content before that decision.

Required outputs:
- council review verdicts for API provider wording-only boundary
- live Godot backend/provider integration decision
- provider preflight UX decision
- runtime provider verification result before naming any live GPT model as available
- visual/UI gate evidence for provider/fallback state once live-provider or fallback-only demo mode is selected
- repair/replay outcome contrast beyond the current forced safe/risky Station smoke
- live backend/runtime authority proof or explicit fallback-only product decision
- player comprehension/playtest note
- exported build/setup plan
- PR bot-feedback ledger updates until all review feedback is closed or explicitly blocked

## Do Not Skip

- Do not implement broader content before M1 Protocol Proof exists.
- Do not let provider-generated NPC text own Exposure, verdict, or session termination.
- Prefer `gpt-5.4-nano` only after runtime provider verification confirms it for the configured provider.
- Do not assume live API access, model availability, credentials, or provider hosting from local technical checks.
- Do not claim this stage is playable until Godot/backend evidence and at least one screenshot/playable artifact exist.
- Do not claim small prologue/demo completion from M1 technical proof alone.
