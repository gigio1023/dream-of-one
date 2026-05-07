# Verification Ledger

Stage: M1 Protocol Proof
Last Updated: 2026-05-07

## Current Verdict

CONDITIONAL PASS: M1 technical proof now passes for backend checks, deterministic conversation suspicion fixtures, ordered same-NPC conversation turns, trajectory diversity verification, Godot checks, playable Evidence Pack export, shell/runtime/playable Evidence Pack schema validation, localization smoke, keyboard-look smoke, bridge fallback smoke, and renderer-backed visual capture.

This is a technical pass, not product closure. It proves the local protocol path and Evidence contract. It does not prove release readiness, live provider availability, player comprehension, exported-build setup, or public copy.

Small complete prologue/demo verdict: NOT VERIFIED. Current branch evidence proves a local `Same Order` path: Store Clerk prompt, three choices, a preset recorded statement carried through the free-input Evidence contract, deterministic suspicion/report signals, Station inquest, locked input, backend-valid playable Evidence Pack, and renderer-backed screenshots/contact sheet. It still does not prove exported build, live provider availability, manual text-entry UI, repair/replay outcome contrast, live backend authority, human visual readability, or external player comprehension.

Remaining blockers before advancing beyond M1:
- council/product review must accept the new API proposal-provider boundary.
- live Godot-to-backend readiness fallback is proven by smoke; live backend/provider integration is still not proven.
- external player comprehension is still untested.
- exported build setup/provider UX is still not proven.
- runtime provider preflight has not proven live API access or fixed GPT model availability.
- manual typed free-input UI is still not proven; current smoke submits a preset line and records the resulting statement.
- headless visual capture is expected to report viewport-capture blockers; non-headless renderer capture produces current Store conversation PNGs and a contact sheet.

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
| M1 technical proof | pass | Keep backend, Godot, Evidence, diversity, localization, keyboard, bridge, and renderer-backed visual checks passing. |
| Complete prologue route | internal pass | Forced Godot smoke proves Store Clerk prompt -> risky choice -> preset recorded statement -> suspicion/report -> Station inquest/session end. Human manual play is still unverified. |
| Safe/risky/recoverable outcome contrast | partial | Backend fixtures cover safe/risky/free-input classification. Playable smoke currently proves the risky plus preset-free-input route only; repair/replay contrast remains pending. |
| Visual readability | internal partial | `visual_capture.gd` expectations are aligned to the Store conversation path. Non-headless renderer capture produced nonblank screenshots and a contact sheet; human readability/OCR review remains pending. |
| UI readability | internal partial | Headless smokes prove the HUD state path for prompt, three choices, free-input affordance, recorded-statement result, why-line, Evidence, suspicion/report pressure, and deterministic end controls. Manual text entry and human visual review remain required. |
| Player comprehension | pending | External tester notes show players understand they are being investigated and can connect text to consequence. |
| Provider/export truth | pending | Runtime preflight or fallback-only decision, exported build setup, and public limitations match the verified build. |
| Live authority integration | pending | Current playable smoke declares `godot_local_conversation_runtime`; public/demo authority must be live backend/runtime integration or an explicit fallback-only product decision. |

## Command Evidence

| Command | Result | Output Summary | Artifact |
|---|---|---|---|
| `node /Users/user/git/gigio1023/game-studio/tools/check-project.mjs /Users/user/git/gigio1023/dream-of-one` | pass | Required Game Studio directories/docs present. | `.game-studio/`, `docs/framework/` |
| `npm run check --prefix backend/npc-runtime` | pass | TypeScript build and 77 integration tests passed, including OpenAI provider model fallback, API conversation authority rejection, conversation suspicion fixtures, ordered conversation turns, playable Evidence Pack schema, Same Order proof validation, and trajectory diversity tests. | `backend/npc-runtime/` |
| `godot --headless --import --path godot` | pass | Godot 4.6.2 project import completed. | `godot/` |
| `bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot` | pass | 20 GDScript files checked, 0 errors. | `godot/**/*.gd` |
| `godot --headless --path godot --script res://tools/scene_load_smoke.gd` | pass | Main scene loaded with player, HUD, playable session, 4 landmarks, 4 NPCs, 4 text surfaces, 4 interaction zones, and 3 routes. | `godot/scenes/main.tscn` |
| `godot --headless --path godot --script res://tools/evidence_run.gd` | pass | Shell Evidence Pack exported. | `data/evidence/godot/shell/dre_171_shell_evidence.json` |
| `godot --headless --path godot --script res://tools/runtime_slice_smoke.gd` | pass | Runtime slice exported command validation/rejection, fallback, and Station intake Evidence. | `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json` |
| `godot --headless --path godot --script res://tools/playable_slice_smoke.gd` | pass | Playable forced path starts `Same Order`, selects a risky line, submits a preset recorded statement through the free-input Evidence contract, records `free_input_submitted` with `freeInputHash`, reaches `inquest_opened`, locks post-inquest input mutation, exposes end controls, and writes 12 Evidence events. | `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json` |
| `godot --headless --path godot --script res://tools/localization_smoke.gd` | pass | Default locale `ko`, switched locale `en`. | localization runtime |
| `godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd` | pass | Mock-ready, missing-key fallback, and live-unavailable fallback paths preserve deterministic state authority. | `godot/tools/live_backend_bridge_smoke.gd` |
| `node --import tsx ... validateGodotEvidencePack(...)` | pass | Shell, runtime, and playable Evidence Packs validate through backend tests; playable pack preserves conversation identity, selected line, free-input hash, suspicion signals, deltas, and why-line. | `data/evidence/godot/**` |
| `godot --headless --path godot --script res://tools/keyboard_look_smoke.gd` | pass | Keyboard look changes yaw/pitch without movement-driven auto-yaw. | `godot/tools/keyboard_look_smoke.gd` |

## Proof Validators

| Validator | Current Truth |
|---|---|
| `backend/npc-runtime/test/integration/conversation-suspicion.integration.test.ts` | Safe, risky, and free-input conversation classifications are deterministic backend behavior. |
| `backend/npc-runtime/test/integration/decision-service.integration.test.ts` | Same-NPC conversation turns with `conversation.turnId` stay ordered and are not latest-wins coalesced. |
| `backend/npc-runtime/test/integration/godot-runtime-schema.integration.test.ts` | Conversation Evidence requires identity fields, deterministic signal trace, selected line or free-input hash, deltas, and why-line. |
| `validateGodotEvidencePackConversationSuspicionProof` | Playable Evidence Pack must include the ordered Same Order conversation chain with one `conversationId`, turn continuity, final `inquest` stage, and report threshold proof. |
| `godot/tools/playable_slice_smoke.gd` | Forced local Godot path records a preset displayed statement through the free-input Evidence contract; it does not prove manual text-entry UI. |
| `godot/tools/visual_capture.gd` | Store conversation capture expectations are aligned. Headless capture is expected-blocked; renderer-backed capture produced current PNG/contact-sheet proof. |

## Documentation Evidence

| Check | Result | Output Summary |
|---|---|---|
| Game Studio placeholder scan | pass | No TODO/TBD/PLACEHOLDER/FIXME in `docs/direction`, `docs/framework`, or `.game-studio`. |
| release-truth search | conditional | Active direction docs use API provider premise. Older scenario/pitch/release docs with Codex CLI language are marked superseded/historical where touched. |

## Visual Evidence

| Artifact | Result | Output Summary |
|---|---|---|
| `godot --headless --path godot --script res://tools/visual_capture.gd` | expected blocked | State expectations are aligned to Store conversation captures, but the headless display server cannot provide viewport pixels. Use the renderer-backed command below for PNG proof. | `data/evidence/godot/visual-capture/manifest.json` |
| `godot --path godot --script res://tools/visual_capture.gd` | pass | Produced five nonblank Store conversation screenshots and a 1280x1080 contact sheet with no blocked checks. Human readability review is still required before product/demo-complete claims. | `data/evidence/godot/screenshots/01-opening-store-framing.png`, `data/evidence/godot/visual-capture/contact-sheet.png` |

## Runtime Evidence

Shell, runtime, and playable Evidence Packs validate through backend `validateGodotEvidencePack`. The playable pack now includes `conversation_started`, `dialogue_choice_selected`, `free_input_submitted` with `freeInputHash`, `conversation_anomaly_detected`, `npc_suspicion_changed`, `suspicion_shared`, `station_report_created`, and `station_inquest_opened`. Three-run Evidence Pack diversity validates through `validateGodotEvidencePackTrajectoryDiversity`.

## Playtest Evidence

Pending external player comprehension test. Current playability evidence includes internal forced/proxy smoke plus renderer-backed visual capture; human readability and blind player notes remain required.
