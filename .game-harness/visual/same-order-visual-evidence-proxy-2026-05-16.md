# Same Order Visual Evidence Proxy - 2026-05-16

Stage: M1 Protocol Proof
Manifest: `data/evidence/godot/visual-capture/manifest.json`
Status: `FRESH_CAPTURE_VERIFIED_HUMAN_REVIEW_REQUIRED`

## Scope

This proxy verifies current renderer-backed Store conversation screenshots and
contact-sheet files. It checks file presence, PNG signature, dimensions,
minimum byte size, required capture roles, record-prop snapshots, and whether
each capture remains marked for human readability review.

The fresh Godot smoke/capture ran on 2026-05-17 with Godot
`4.7.beta2.official.777579205` through `/opt/homebrew/bin/godot-latest`.

Latest ledger actor/action visibility:

- Implemented in scripts: yes.
- Current playable artifact proves it: yes.
- Evidence path:
  `playableSummary.worldRecordProps.civic_ledger.label` includes
  `civic-ledger-4`, Station Officer role, `기록 인용`, and citation of
  `civic-ledger-3`.

Typed input evidence:

- Implemented in scripts: yes.
- Current playable artifact proves it: yes.
- Evidence path:
  `playableSummary.events[free_input_submitted]` carries
  `inputMode: typed_free_input`, a non-empty `freeInputHash`, and an empty
  `recordedStatementScope`.

Record-prop evidence:

- Manifest has required props: yes.
- Required props:
  `receipt_tray`, `correction_slip`, `report_tray`, `station_dossier`,
  `civic_ledger`, and `civic_economy_panel`.
- Evidence path:
  `storeConversationEvidence.worldRecordProps` has visible bodies and labels
  for each required prop.

Outcome-chain evidence:

- Implemented in scripts: yes.
- Current visual capture checks it: yes.
- Evidence path:
  the inquest HUD outcome body includes player speech/response delay -> Store
  record -> report handoff -> Station citation -> inquest, and names the
  Station Officer role action.

## Verified Captures

| Role | Artifact | Expected size |
|---|---|---:|
| opening-store-framing | `data/evidence/godot/screenshots/01-opening-store-framing.png` | 1280x720 |
| store-rule-guide-readable | `data/evidence/godot/screenshots/02-store-rule-guide-readable.png` | 1280x720 |
| active-conversation-hud | `data/evidence/godot/screenshots/03-active-conversation-hud.png` | 1280x720 |
| conversation-why-line | `data/evidence/godot/screenshots/04-conversation-why-line.png` | 1280x720 |
| store-record-props-closeup | `data/evidence/godot/screenshots/05-store-record-props-closeup.png` | 1280x720 |
| inquest-session-end | `data/evidence/godot/screenshots/06-inquest-session-end.png` | 1280x720 |
| station-record-props-closeup | `data/evidence/godot/screenshots/07-station-record-props-closeup.png` | 1280x720 |
| repair-correction-slip-closeup | `data/evidence/godot/screenshots/08-repair-correction-slip-closeup.png` | 1280x720 |
| contact sheet | `data/evidence/godot/visual-capture/contact-sheet.png` | 1280x1440 |

## Result

- Fresh capture proxy: pass.
- Latest ledger actor/action artifact proof: pass.
- Typed input artifact proof: pass.
- Record-prop visibility artifact proof: pass.
- Repair-route correction slip close-up: pass.
- Outcome-chain artifact proof: pass.
- Fallback-only provider state proof: pass.
- Human readability review: pass with prop close-ups; external comprehension
  still required.
- External player comprehension: still required.

Required next steps:

- Keep the backend attach step after future Godot smoke runs:
  `npm run same-order:attach-playability-reports --prefix backend/npc-runtime`.
- Do not use this proxy as external player comprehension evidence.
