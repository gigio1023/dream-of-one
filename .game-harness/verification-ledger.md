# Verification Ledger

Stage: M1 Protocol Proof
Last Updated: 2026-05-06

## Current Verdict

CONDITIONAL PASS: M1 technical proof now passes for backend checks, trajectory diversity verification, Godot headless checks, playable Evidence Pack export, shell/runtime/playable Evidence Pack schema validation, localization smoke, keyboard-look smoke, bridge fallback smoke, and visual capture.

This is a technical pass, not product closure. It proves the local protocol path and Evidence contract. It does not prove release readiness, live provider availability, player comprehension, exported-build setup, or public copy.

Small complete prologue/demo verdict: NOT VERIFIED. Current branch evidence now proves an internal Station Soft Inquest prologue path, safe/risky consequence contrast, locked post-verdict input, end controls, and five current-build visual captures. It still does not prove exported build, live provider availability, repair/replay outcome contrast, live backend authority, or external player comprehension.

Remaining blockers before advancing beyond M1:
- council/product review must accept the new API proposal-provider boundary.
- live Godot-to-backend readiness fallback is proven by smoke; live backend/provider integration is still not proven.
- external player comprehension is still untested.
- exported build setup/provider UX is still not proven.
- runtime provider preflight has not proven live API access or fixed GPT model availability.

## M1 Technical Pass vs Product Blockers

| Surface | Current Result | Release Truth |
|---|---|---|
| Local backend/Godot protocol checks | pass | May claim only local verified M1 technical proof. |
| Evidence Pack validation | pass | May claim schema-validated shell/runtime/playable Evidence Packs after checks pass. |
| Live API proposal provider | not proven | Must not claim live API-backed NPC proposals. |
| Godot backend bridge fallback | pass | May claim controlled readiness fallback smoke, not live integration. |
| `gpt-5.4-nano` model access | not proven | Preferred only when runtime provider verification confirms availability. |
| External player comprehension | pending | Must not claim product validation or player-understood loop. |
| Exported build/setup path | pending | Must not claim public install readiness. |

## Completion Truth Gates

| Gate | Current Result | Required Evidence Before Demo Completion |
|---|---|---|
| M1 technical proof | pass | Keep backend, Godot, Evidence, diversity, localization, keyboard, bridge, and visual checks passing. |
| Complete prologue route | internal pass | Forced Godot smoke proves Station rule read -> Cover Test -> safe answer -> risky why-line escalation -> verdict/session end. Human manual play is still unverified. |
| Safe/risky/recoverable outcome contrast | partial | Safe/risky pair is visible in smoke and HUD. Repair/replay contrast remains pending. |
| Visual readability | internal pass | Current-build captures cover opening Station framing, rule surface, Cover Test prompt, Exposure/why-line, and verdict/session end. Human visual review remains required before public claim. |
| UI readability | internal pass | Prompt, consequence, why-line, Exposure/Evidence, localization, and deterministic end controls are visible in current captures. Provider/fallback state is still pending for live-provider claims. |
| Player comprehension | pending | External tester notes show players understand they are being investigated and can connect text to consequence. |
| Provider/export truth | pending | Runtime preflight or fallback-only decision, exported build setup, and public limitations match the verified build. |
| Live authority integration | pending | Current playable smoke declares `godot_local_smoke_runtime`; public/demo authority must be live backend/runtime integration or an explicit fallback-only product decision. |

## Command Evidence

| Command | Result | Output Summary | Artifact |
|---|---|---|---|
| `node /Users/user/git/gigio1023/game-studio/tools/check-project.mjs /Users/user/git/gigio1023/dream-of-one` | pass | Required Game Studio directories/docs present. | `.game-studio/`, `docs/framework/` |
| `npm run check --prefix backend/npc-runtime` | pass | TypeScript build and 65 integration tests passed, including OpenAI provider model fallback, playable Evidence Pack schema, and trajectory diversity tests. | `backend/npc-runtime/` |
| `godot --headless --import --path godot` | pass | Godot 4.6.2 project import completed. | `godot/` |
| `bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot` | pass | 20 GDScript files checked, 0 errors. | `godot/**/*.gd` |
| `godot --headless --path godot --script res://tools/scene_load_smoke.gd` | pass | Main scene loaded with player, HUD, playable session, 4 landmarks, 4 NPCs, 4 text surfaces, 4 interaction zones, and 3 routes. | `godot/scenes/main.tscn` |
| `godot --headless --path godot --script res://tools/evidence_run.gd` | pass | Shell Evidence Pack exported. | `data/evidence/godot/shell/dre_171_shell_evidence.json` |
| `godot --headless --path godot --script res://tools/runtime_slice_smoke.gd` | pass | Runtime slice exported command validation/rejection, fallback, and Station intake Evidence. | `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json` |
| `godot --headless --path godot --script res://tools/playable_slice_smoke.gd` | pass | Playable forced path reads Station rules, proves safe/risky contrast, reaches verdict stage with Exposure 100, locks post-verdict speech mutation, exposes end controls, and writes 10 Evidence events. | `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json` |
| `godot --headless --path godot --script res://tools/localization_smoke.gd` | pass | Default locale `ko`, switched locale `en`. | localization runtime |
| `godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd` | pass | Mock-ready, missing-key fallback, and live-unavailable fallback paths preserve deterministic state authority. | `godot/tools/live_backend_bridge_smoke.gd` |
| `node --import tsx ... validateGodotEvidencePack(...)` | pass | Shell, runtime, and playable Evidence Packs validate: 2, 9, and 10 events. | `data/evidence/godot/**` |
| `godot --headless --path godot --script res://tools/keyboard_look_smoke.gd` | pass | Keyboard look changes yaw/pitch without movement-driven auto-yaw. | `godot/tools/keyboard_look_smoke.gd` |

## Documentation Evidence

| Check | Result | Output Summary |
|---|---|---|
| Game Studio placeholder scan | pass | No TODO/TBD/PLACEHOLDER/FIXME in `docs/direction`, `docs/framework`, or `.game-studio`. |
| release-truth search | conditional | Active direction docs use API provider premise. Older scenario/pitch/release docs with Codex CLI language are marked superseded/historical where touched. |

## Visual Evidence

| Artifact | Result | Output Summary |
|---|---|---|
| `godot --path godot --script res://tools/visual_capture.gd` | pass | Captured non-empty 1280x720 `main-shell.png` and `playable-verdict.png`. |
| `godot --path godot --script res://tools/visual_capture.gd` | pass | Generated five non-empty current-build captures plus contact sheet and manifest with no blocked checks: opening Station framing, rule surface, active Cover Test HUD, Exposure/why-line, and verdict/session end. Manifest states automated capture is not OCR/taste validation and still requires human readability review. | `data/evidence/godot/screenshots/01-opening-station-framing.png` through `05-verdict-session-end.png`, `data/evidence/godot/visual-capture/contact-sheet.png`, `data/evidence/godot/visual-capture/manifest.json` |

## Runtime Evidence

Shell, runtime, and playable Evidence Packs validate through backend `validateGodotEvidencePack`. Three-run Evidence Pack diversity validates through `validateGodotEvidencePackTrajectoryDiversity`.

## Playtest Evidence

Pending external player comprehension test. Current playability evidence includes internal forced/proxy smoke and current-build visual capture only; it does not replace blind player notes.
