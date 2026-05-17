# Same Order Export Setup Proof

Date: 2026-05-17
Status: `LATEST_GODOT_PACKAGED_ROUTE_PROOF`

## Version Decision

Godot official downloads currently split the release line:

- Latest stable download: Godot `4.6.2`.
- Latest preview build: Godot `4.7-beta2`, published 2026-05-11.

Because the current instruction is to use the latest Godot version, this proof
uses the latest published preview build:

```bash
/opt/homebrew/bin/godot-latest --version
```

Result:

- `4.7.beta2.official.777579205`
- App path: `/Applications/Godot-4.7-beta2.app`
- CLI path: `/opt/homebrew/bin/godot-latest`
- Export templates:
  `/Users/naem1023/Library/Application Support/Godot/export_templates/4.7.beta2/macos.zip`

Homebrew `godot` may still resolve to the latest stable cask. Use
`godot-latest` for this repo unless a task explicitly requests stable-only
verification.

## Verdict

Same Order now has current Godot 4.7-beta2 proof for:

- project import
- playable Same Order smoke
- renderer-backed visual capture
- PCK export
- PCK `--main-pack` Same Order route smoke
- macOS debug app zip export
- packaged app launch
- packaged app Same Order route smoke
- PCK route smoke outcome-body proof for all four terminal outcomes
- packaged app outcome-chain proof for the inquest result panel
- packaged app live HUD record-chain proof before the result panel

This is still not public demo readiness. The packaged app now proves the Same
Order route through an opt-in runtime smoke hook, but human tester setup and
external comprehension notes are still open.

## Project Settings

The macOS universal export required ASTC texture import support, so the Godot
project now enables:

```ini
textures/vram_compression/import_etc2_astc=true
```

## Current Export Artifacts

Current artifacts are intentionally outside the repo:

```text
/private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order.pck
/private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order-macos.zip
/private/tmp/dream-of-one-export-proof-4.7/main-pack-playable-evidence.json
/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json
/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app
```

The macOS zip was exported with the `macOS PCK` preset and contains a packaged
Godot app plus the project `.pck`.

Refresh note, 2026-05-17 20:26 KST: the PCK, macOS zip, unpacked app, and
packaged route evidence were regenerated after the typed-input proof cleanup
and civic economy account-credit panel update. Packaged route smoke now writes
`playability.packagedRouteSmokeProof.civicEconomyChecks`, and tester preflight
requires account credit, local trust, record burden, Station attention, and
the economy panel `attention` state.
The packaged app binary and route evidence are newer than
`godot/scripts/runtime/playable_session.gd`, and comprehension preflight
accepts the refreshed evidence.

Refresh note, 2026-05-17 21:05 KST: the PCK, macOS zip, unpacked app, and
packaged route evidence were regenerated after adding the live HUD record-chain
line. Packaged route smoke now writes
`playability.packagedRouteSmokeProof.consequenceLabel` and requires
`outcomeChecks.liveRecordChain = true`. Tester preflight now rejects packaged
evidence that does not show
`플레이어 발화/응답 지연 -> 상점 기록 -> 보고 전달 -> 스테이션 인용`
before the result panel.

Refresh note, 2026-05-17 22:41 KST: the PCK, macOS zip, unpacked app, and
packaged route evidence were regenerated after improving the record-prop
proof captures. Store/Station/repair prop screenshots now hide non-record
world dressing and the player body for prop proof shots only, while the
packaged app route smoke still preserves fallback-only mode, typed free input,
response hesitation, exact Station citation, live HUD record-chain proof,
outcome-chain proof, and civic economy proof.

Refresh note, 2026-05-18 KST: the PCK, macOS zip, unpacked app, and packaged
route evidence were regenerated after the live HUD consequence line was
extended through Studio review block and contact refusal. Packaged route smoke
now requires `outcomeChecks.liveRecordChain = true` for the full speech/delay
to contact-refusal chain, and tester preflight accepts the refreshed app-route
evidence.

## Command Evidence

Import:

```bash
/opt/homebrew/bin/godot-latest --headless --import --path godot
```

Playable smoke:

```bash
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/playable_slice_smoke.gd
```

Visual capture:

```bash
/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```

PCK export:

```bash
/opt/homebrew/bin/godot-latest --headless --path godot --export-pack "macOS PCK" /private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order.pck
```

PCK route smoke:

```bash
DREAM_OF_ONE_PLAYABLE_EVIDENCE_OUTPUT=/private/tmp/dream-of-one-export-proof-4.7/main-pack-playable-evidence.json \
/opt/homebrew/bin/godot-latest --headless \
  --log-file /private/tmp/dream-of-one-export-proof-4.7/main-pack-smoke.log \
  --main-pack /private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order.pck \
  --script res://tools/playable_slice_smoke.gd
```

macOS packaged app export:

```bash
/opt/homebrew/bin/godot-latest --headless --path godot --export-debug "macOS PCK" /private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order-macos.zip
```

Packaged app launch:

```bash
/private/tmp/dream-of-one-export-proof-4.7/app/Dream\ of\ One\ Godot\ Shell.app/Contents/MacOS/Dream\ of\ One\ Godot\ Shell \
  --headless \
  --log-file /private/tmp/dream-of-one-export-proof-4.7/app-launch.log \
  --quit-after 3
```

Packaged app route smoke:

```bash
DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_OUTPUT=/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json \
/private/tmp/dream-of-one-export-proof-4.7/app/Dream\ of\ One\ Godot\ Shell.app/Contents/MacOS/Dream\ of\ One\ Godot\ Shell \
  --headless \
  --log-file /private/tmp/dream-of-one-export-proof-4.7/app-route-smoke.log
```

## Proven Behavior

The latest PCK `--main-pack` smoke and packaged app route smoke preserved:

- `stage = inquest`
- `sessionOutcome = inquest_opened`
- `providerState.mode = fallback_only_m1`
- `response_hesitation_noted` is present before typed speech on the packaged
  inquest route
- `free_input_submitted.inputMode = typed_free_input`
- `playableSummary.providerState.liveVerified = false`
- `worldRecordProps.civic_economy_panel.label` shows account credit, trust,
  burden, and attention: `잔액 3 | 신뢰 5 | 부담 75 | 주목 70`
- latest civic ledger `civic-ledger-4`
- route proofs for `clean_cover`, `repair_recovered`, `soft_report`, and
  `inquest_opened`
- route proof `outcomeBody` text for all four terminal outcomes, including
  role-action recap for the Store Clerk, Store Manager, and Station Officer
- packaged HUD role wording: `검사자`, `대상: 플레이어`, and Station Officer
  during inquest, now recorded in `playability.packagedRouteSmokeProof`
- packaged live HUD consequence wording:
  `playability.packagedRouteSmokeProof.outcomeChecks.liveRecordChain` is true,
  proving the exported build shows the speech/delay -> Store record -> queue
  reaction -> Park notice -> report handoff -> Station citation -> Studio review
  block -> contact refusal chain before the result panel
- packaged outcome wording:
  `playability.packagedRouteSmokeProof.outcomeChecks.speechDelayRecordChain`
  and `stationOfficerRoleAction` are true, proving the exported result panel
  links player speech/response delay to Store record, report handoff, Station
  citation, inquest, and Station Officer role action

The packaged app launch exits cleanly in headless mode. The packaged route
smoke writes `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json`
and that artifact validates through backend Evidence Pack and conversation
proof validation.

## Not Proven

- Manual run of the packaged app by a tester.
- External player comprehension notes.
- Live API proposal-provider dispatch in Godot.
- Public install readiness, Steam readiness, itch readiness, or final demo
  readiness.

The previous app-binary `--script res://tools/playable_slice_smoke.gd` and
`.gdc` attempts hung because that was the wrong harness shape for an exported
app. Current route proof uses `godot/scripts/runtime/packaged_route_smoke.gd`,
which is inert unless `DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_OUTPUT` or
`DREAM_OF_ONE_PACKAGED_ROUTE_SMOKE` is set. The route proof also reads the
exported app HUD snapshot, fails if the inquest HUD stops naming the player as
the examined subject, and writes a proof object that the tester preflight
requires before launch.
Preflight now also requires the packaged outcome-chain proof, so a tester
session cannot start from this helper if the exported app stops explaining the
dialogue-to-record-to-Station-action chain.
Preflight also requires the packaged live HUD record-chain proof, so a tester
session cannot start if the exported app only explains the chain after the
session result.
Preflight also requires the packaged civic economy proof, so a tester session
cannot start if the exported app stops showing account credit, trust, burden,
and Station attention on the civic economy panel.

## Next Export Proof

Close the exported-build/setup blocker only after this exists as current
evidence:

1. Run the packaged app with fresh testers.
2. Record whether testers connect dialogue to record, consequence, and role
   action.
3. Keep setup notes and failure behavior tied to the exact app zip path.
