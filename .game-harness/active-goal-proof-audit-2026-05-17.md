# Active Goal Proof Audit

Date: 2026-05-17
Status: `NOT_READY`
Basis: `.game-harness/active-goal-prompt.md`

## Verdict

The current work moves in the correct direction, but the active goal is not complete.

Backend authority, environment affordance modeling, provider-shaped route contracts, asset source proof, fallback-only provider mode, fresh latest-Godot smoke/capture, current manual readability review, product council review, pre-playtest comprehension packets, PCK route proof, packaged app launch, and packaged app Same Order route proof now have credible internal evidence. Product proof is still blocked by external player comprehension notes.

## Requirement Audit

| Requirement | Current Evidence | Status | Why |
|---|---|---|---|
| Planning docs name the same game: Store-to-Station procedure simulator where the player is examined through conversation and records. | `docs/direction/15-agentic-social-simulation-model.md`, `docs/direction/16-agentic-prototype-target.md`, `docs/scenario/content/environment-affordance-map.md`, `.game-harness/active-goal-prompt.md`, current Godot smoke/capture artifacts. | pass | Direction and current proof now align around the Store/Station Same Order cell. Product closure still depends on external comprehension. |
| Authored environment map lists objects, affordances, roles, visibility, records, economy effects, and validation rules for `Same Order`. | `docs/scenario/content/environment-affordance-map.md`; backend `agentic-environment` tests; fresh playable Evidence Pack. | pass | The map, backend seed, and current Godot artifact now agree on authored objects and record states. |
| Backend proves role-scoped affordance discovery, validation, ledger creation, civic economy deltas, exact Station citation, and rejection of unavailable/hidden actions. | `backend/npc-runtime/test/integration/agentic-environment.integration.test.ts`; `backend/npc-runtime/test/integration/same-order-agentic-routes.integration.test.ts`; latest `npm run check` in `.game-harness/verification-ledger.md`. | pass | This is backend contract evidence, not full product evidence. |
| Provider-shaped paths preserve backend-owned ledger/economy outcomes and cannot smuggle authority fields. | `same-order-provider-action-comparison`, `same-order-provider-scheduling`, `same-order-provider-dispatch-contract` tests and Evidence Pack fields; `.game-harness/provider/same-order-provider-mode-decision-2026-05-17.md`. | pass for fallback-only M1 | Backend contract passes and M1 product truth is now fallback-only. Live Godot/HTTP provider dispatch remains future evidence, not a current claim. |
| Godot evidence shows Store/Station props, current record states, latest ledger event, actor role, validated action, suspicion/report pressure, delayed-answer record, Station citation, civic economy values, and the live/result-panel cause chain. | `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`; `data/evidence/godot/visual-capture/manifest.json`; `godot/tools/playable_slice_smoke.gd`; `godot/tools/codex_gameplay_probe.gd`; visual evidence proxy. | pass | Fresh smoke proves typed input, response-hesitation Evidence, current record props, civic economy account-credit/trust/burden/attention values, investigation trail subject/examiner/basis, `civic-ledger-4` Station Officer `cite_record`, fallback-only provider state, exact citation of `civic-ledger-3`, live HUD copy linking player speech/delay to Store record, report handoff, and Station citation, plus outcome copy linking the same chain to inquest and role action. Route proofs also carry `outcomeBody` role-action recap for clean cover, repair recovery, soft report, and inquest. |
| Codex can inspect and drive the playable cell directly. | `godot/scripts/runtime/playable_session.gd`; `godot/tools/codex_gameplay_probe.gd`; `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`; latest Godot command evidence in `.game-harness/verification-ledger.md`. | pass for internal QA | The runtime exposes `debug_codex_gameplay_action`, `debug_codex_gameplay_snapshot`, and an action catalog. The probe is a gameplay-facing QA interface, not a broad test suite. It lets Codex execute bounded player actions, read HUD/environment/ledger/NPC action state, and verify the Store Clerk -> Store Manager -> Station Officer social chain before human playtest. |
| Route evidence covers clean cover, repair recovery, soft report, and inquest from the same prompt set. | Playable route proof validation and generated Evidence Pack route proofs. | pass | Fresh playable smoke covers all four required routes from the same Store Clerk prompt set, and each route proof now records the terminal outcome body with the relevant role action. |
| Fresh screenshots/contact sheets prove readability for scene, HUD, record props, and outcome state. | `data/evidence/godot/visual-capture/contact-sheet.png`; current Store screenshots; `.game-harness/visual/same-order-manual-readability-review-2026-05-17.md`; visual evidence proxy. | pass, external comprehension pending | Fresh capture is readable for HUD, typed input, provider state, latest ledger line, Store/Station record-prop close-ups, repair-route correction slip attachment, and outcome. Tester notes still need to prove comprehension during normal play. |
| External or manual comprehension notes show players understand examination, dialogue-to-record consequences, and role/action provenance. | Comprehension proxy, blind playtest packet, and `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`. | missing | Proxy, packet, and notes ledger are setup evidence only. No tester notes exist. |
| Tester-facing build/setup proof launches outside the editor and preserves provider/fallback behavior. | `.game-harness/export/same-order-export-setup-proof-2026-05-17.md`; `godot/export_presets.cfg`; `godot/scripts/runtime/packaged_route_smoke.gd`; current Godot local proof in verification ledger. | pass | Latest Godot 4.7-beta2 PCK export plus `--main-pack` smoke preserves typed input, fallback-only provider state, latest ledger, and route proofs. The macOS app zip exports, launches, and app-binary packaged route smoke reaches inquest with fallback-only provider state, exact Station citation, persisted `packagedRouteSmokeProof` HUD wording that keeps the player as examined subject, live HUD record-chain proof, and packaged outcome-chain checks. |
| Test suite remains concise and behavior-first. | `AGENTS.md`, `docs/development/agent/runbook.md`, `docs/development/dev.md`, active goal prompt. | policy set | Future work must preserve this. Do not add broad mock-heavy tests to close proof gaps. |
| Product council review accepts the current M1 boundary. | `.game-harness/council/m1-product-gate-council-review-2026-05-17.md`; `.game-harness/review-log.md`. | conditional pass | Director, Narrative, Systems, and Godot roles pass. QA/Producer remain conditional until external comprehension notes are recorded. |

## Strong Evidence

- Backend environment affordance and ledger validation is now meaningful.
- Provider-shaped comparisons preserve provider-off ledger and economy results.
- Scheduling and dispatch contracts keep provider work bounded to available action context.
- Route proof covers clean, repair, soft report, and inquest outcomes.
- Codex gameplay QA now has a small stable runtime action/snapshot API and a
  Godot probe that can play the active cell, inspect
  HUD/environment/ledger/NPC role-action state, and write
  `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`.
- The inquest HUD now shows the record chain before the result panel:
  `플레이어 발화/응답 지연 -> 상점 기록 -> 보고 전달 -> 스테이션 인용`.
  `codex_gameplay_probe.gd` and `visual_capture.gd` both verify this line.
- Storylet/runtime mapping now binds Same Order beats to runtime action step ids
  and provider job ids through `playability.storyletRuntimeMap`.
- Playtest packet asks the right comprehension questions, including who made/cited the latest visible record and what validated action produced it.
- Session helper and note reviewer now require direct quote fields and the
  tester's own dialogue-to-record-to-consequence-to-role-action explanation
  before any pass-candidate status.
- Raw manual-session notes now have a short facilitator quality guide at
  `.game-harness/comprehension/manual-sessions/README.md`, and the session
  helper `--status` output points to it before naming the next action.
- The session helper now has `--codex-probe` and `--codex-probe-status`.
  This lets Codex refresh the live Godot gameplay QA artifact and print its
  path, SHA-256, inquest-stage status, and accepted action count before human
  playtesting. The helper labels this as setup proof only, not player evidence.
- The session helper now has an after-play `--debrief` card that prints the
  C1-C7-style questions and direct quote prompts without launching the app or
  counting as evidence.
- The session helper now has a `--worksheet` mode for remote or paper-note
  sessions. It prints the strict-review fields plus the current app/evidence
  hashes, but remains setup evidence until filled from observed fresh-player
  play.
- The session helper now has a `--recruitment` mode for no-spoiler tester
  invites. It repeats preflight without printing preflight details, then prints
  only first-impression instructions, avoiding records, reports, risk, Station
  citation, provider mode, app/evidence paths, and intended player-role
  spoilers.
- The session helper now has a `--facilitator-pack`, `--facilitator-pack-output
  <path>`, and `--session-kit-output <dir>` flow so a facilitator can prepare
  the tester invite, recruitment companion, run card, debrief prompts, blank
  worksheet, build hashes, and gate status without turning any of those setup
  files into comprehension evidence. In generated kits, `tester-invite.md` is
  the only tester-facing file.
- The session helper `--status` output now separates raw note file count from
  strict review status and lifts build-bound, complete-structure,
  dialogue-to-record-to-consequence-to-role-action, direct quote, examined
  subject, and no-role-inversion counts into the top summary. File count alone
  cannot close the gate.
- The note reviewer now also validates that each raw session is explicitly
  bound to packaged live HUD record-chain proof and outcome-chain proof, and
  that each referenced packaged app evidence file still carries both. Actual
  notes cannot pass against a build that only explains the Store-to-Station
  role-action chain after the result screen.
- `.game-harness/scripts/verify-comprehension-review-guards.sh` now verifies
  that placeholder notes with valid-looking build hashes still fail strict
  review when direct quote fields are `yes`, `observed`, `none`, or `pass`.
- The same guard now verifies that `--recruitment` and session-kit
  `tester-invite.md` output do not leak preflight, provider, app/evidence, risk,
  record, report, Station, or intended-role spoilers into tester-facing text.
- Latest status helper output reports raw session note files as `0 / 3
  minimum`, strict review status `PENDING_TESTER_NOTES`, and all lifted quality
  counts at `0 / 0` because no real notes exist.
- Status and review helpers now track a separate civic economy detail count, so
  fresh tester notes can capture whether players noticed account credit, local
  trust, record burden, or Station attention without turning setup material into
  comprehension evidence.

## Weak Or Missing Evidence

- External comprehension notes from fresh testers.
- No external comprehension notes from fresh testers.

## Current Artifact Inspection

Local checks on 2026-05-17:

```bash
/opt/homebrew/bin/godot-latest --version
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/playable_slice_smoke.gd
/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd
/opt/homebrew/bin/godot-latest --headless --path godot --export-debug "macOS PCK" /private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order-macos.zip
DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_OUTPUT=/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json /private/tmp/dream-of-one-export-proof-4.7/app/Dream\ of\ One\ Godot\ Shell.app/Contents/MacOS/Dream\ of\ One\ Godot\ Shell --headless --log-file /private/tmp/dream-of-one-export-proof-4.7/app-route-smoke.log
PATH=/opt/homebrew/bin:$PATH npm run same-order:attach-playability-reports --prefix backend/npc-runtime
PATH=/opt/homebrew/bin:$PATH npm run check --prefix backend/npc-runtime
node -e "<inspect data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json>"
```

Findings:
- Godot 4.7-beta2 is installed as `/opt/homebrew/bin/godot-latest`, and fresh import/smoke/capture ran on 2026-05-17.
- The fresh playable Evidence Pack has `playableSummary.providerState.mode = fallback_only_m1`.
- The inquest route proof now includes `response_hesitation_noted`,
  `response_hesitation`, and `playableSummary.responseHesitationCount = 1`,
  so delayed answers are part of the current deterministic record proof.
- `free_input_submitted.inputMode = typed_free_input`, has a `freeInputHash`, and has empty `recordedStatementScope`.
- `worldRecordProps.civic_ledger.label` shows `civic-ledger-4`, Station Officer role, 기록 인용, and citation of `civic-ledger-3`.
- `worldRecordProps.civic_economy_panel.label` shows account credit, local
  trust, record burden, and Station attention as
  `잔액 3 | 신뢰 5 | 부담 75 | 주목 70`.
- `playability.visualEvidenceProxy.pass = true`, `freshCapture = true`, and `verdict = FRESH_CAPTURE_VERIFIED_HUMAN_REVIEW_REQUIRED`.
- The visual capture manifest has 8 captures with `blockedChecks: []`,
  including `repair-correction-slip-closeup` for the repair route.
- Packaged app route evidence at `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json` validates through backend schema and conversation proof, while `playability.packagedRouteSmokeProof` records exported HUD examiner/subject wording for preflight.
- Packaged app route evidence now also records
  `playability.packagedRouteSmokeProof.outcomeChecks.speechDelayRecordChain`
  and `stationOfficerRoleAction`, both true, so preflight rejects an exported
  app that stops explaining the dialogue-to-record-to-Station-action chain.
- Packaged app route evidence now records
  `playability.packagedRouteSmokeProof.outcomeChecks.liveRecordChain`, so
  preflight and raw-note review reject an exported app that only explains the
  chain after the session result.
- Packaged app route evidence now records
  `playability.packagedRouteSmokeProof.civicEconomyChecks`, so preflight and
  raw-note review reject an exported app that stops showing account credit,
  local trust, record burden, Station attention, or economy panel attention
  state.
- The refreshed packaged app binary and packaged route evidence are newer than
  `godot/scripts/runtime/playable_session.gd`, so the current tester-ready
  preflight is no longer pointing at a stale export.
- Playable and PCK route proofs now include `outcomeBody` text for all four
  terminal outcomes, including clean-cover, repair, soft-report, and inquest
  role-action recaps.
- `npm run check --prefix backend/npc-runtime` passes 120 integration tests after attaching backend playability reports to the fresh Godot artifact.
- `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
  still reports raw session note files as `0 / 3 minimum` and strict status
  `PENDING_TESTER_NOTES`; the latest technical proof does not close the
  external comprehension gate.
- Current direct artifact inspection shows:
  - route proofs: `clean_cover`, `repair_recovered`, `soft_report`, `inquest_opened`;
  - visual manifest: `ok: true`, 8 captures, no blocked checks;
  - provider contracts: action comparison pass, scheduling contract pass,
    dispatch packet contract pass;
  - live provider dispatch: still unverified, correctly not claimed;
  - comprehension proxy: pass with `externalBlockerClosed: false`;
  - player comprehension packet: `externalBlockerClosed: false`.

Manual readability review on 2026-05-17:
- Current Store conversation screenshots are readable enough for internal review of the conversation HUD, typed input, investigation trail, suspicion/report pressure, fallback-only provider state, latest ledger HUD line, why-line, and inquest outcome.
- Store/Station prop labels are useful for internal state review. The latest
  capture isolates record props by hiding non-record world dressing and the
  player body during prop proof shots, and the repair-route correction slip
  screenshot now captures a repair-only temporary scene without stale inquest
  HUD. These screenshots strengthen internal provenance proof, but they still
  do not replace external comprehension notes.

## Next Proof Order

1. Keep the Codex gameplay QA probe passing after each small playable change:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe --codex-probe-status`.

2. Run the blind comprehension packet with testers and record notes.

3. Run the packaged app manually with at least one fresh player during the
   comprehension protocol, using the packaged route proof as setup evidence.

4. Keep the fallback-only provider state visible in UI/setup unless live preflight and Godot dispatch are later proven.

Current tester-ready entry:

- Packet:
  `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`
- Facilitator helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh`
- Gate status helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
- Facilitator kit helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output /tmp/same-order-session-kit`
- Codex gameplay QA refresh:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe --codex-probe-status`
- Facilitator pack file helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack-output /tmp/same-order-facilitator-pack.md`
- No-spoiler recruitment helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment`
- After-play debrief helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --debrief`
- Raw-note worksheet helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh --worksheet`
- Raw notes quality guide:
  `.game-harness/comprehension/manual-sessions/README.md`
- Notes review helper:
  `.game-harness/scripts/review-same-order-comprehension-notes.sh`
- Review guard:
  `.game-harness/scripts/verify-comprehension-review-guards.sh`
- Notes ledger:
  `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`
- Preferred app:
  `/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app`
- Product truth for this test: `fallback_only_m1`, not live GPT.

## Completion Rule

Do not mark the active goal complete until the external comprehension row becomes `pass` with current tester notes.
