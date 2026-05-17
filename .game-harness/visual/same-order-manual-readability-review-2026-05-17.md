# Same Order Manual Readability Review

Date: 2026-05-17
Artifact set:
- `data/evidence/godot/visual-capture/contact-sheet.png`
- `data/evidence/godot/screenshots/03-active-conversation-hud.png`
- `data/evidence/godot/screenshots/04-conversation-why-line.png`
- `data/evidence/godot/screenshots/05-store-record-props-closeup.png`
- `data/evidence/godot/screenshots/06-inquest-session-end.png`
- `data/evidence/godot/screenshots/07-station-record-props-closeup.png`
- `data/evidence/godot/screenshots/08-repair-correction-slip-closeup.png`

Status: `PASS_CURRENT_CAPTURE_WITH_RECORD_PROP_CLOSEUPS_EXTERNAL_COMPREHENSION_PENDING`

## Verdict

The refreshed renderer-backed Store conversation capture is readable enough to
support internal review of the conversation HUD, typed input path,
investigation trail, live record-chain line, suspicion and report pressure,
latest ledger HUD line, fallback-only provider state, inquest outcome panel, and Store/Station record
prop close-ups, including the civic economy panel's account credit/trust/
burden/attention values and a separate repair-route correction-slip close-up.

This closes the previous stale-capture concern and remains valid after adding
the stable Codex gameplay action/snapshot API. It does not close external
player comprehension. The prop close-ups are now stronger for internal
state/provenance review because the capture hides non-record world dressing and
the player body for those proof shots only, while leaving the actual record
objects and labels visible. World props alone still should not be treated as
player-comprehension proof.

## What Reads Clearly

- The player role is framed as being examined by Station/NPC systems.
- The Store Clerk prompt and three authored dialogue choices are visible.
- The typed input field is visible in the conversation HUD.
- Suspicion and report pressure are visible in the main HUD.
- The selected risky line and why-line are visible after the first risky answer.
- The HUD record line shows the latest civic ledger event, actor role,
  validated action, and cited ledger ID.
- The top HUD consequence line now repeats the live chain during inquest:
  `플레이어 발화/응답 지연 -> 상점 기록 -> 보고 전달 -> 스테이션 인용`.
- The Store record-prop close-up frames receipt tray, correction slip, report
  tray, and civic ledger labels without the HUD covering them. The current
  capture uses a prop-focused review camera and hides NPC/text clutter,
  non-record world dressing, and the player body for this proof shot only. The
  civic-ledger prop uses a compact label:
  `시민 장부 4건 / civic-ledger-4 -> civic-ledger-3 / 기록 인용`.
- The repair-route close-up separately proves an attached correction slip
  before Station escalation, and now captures the repair-only temporary scene
  without stale inquest HUD from the previous capture.
- The Station record-prop close-up frames Station dossier and civic economy
  panel labels without the HUD covering them. The current capture uses the same
  prop-focused review camera and isolated prop view for the Station proof shot,
  and the economy panel shows `잔액 3 | 신뢰 5 | 부담 75 | 주목 70` on the
  inquest route.
- The stable Codex gameplay probe reaches the same inquest route through
  `PlayableSession.debug_codex_gameplay_action`, so the capture and Codex QA
  interface now point at the same runtime behavior rather than separate helper
  paths. The probe also verifies that the live HUD consequence line shows the
  speech/delay -> Store record -> report handoff -> Station citation chain.
- The investigation trail names the examiner, keeps the player as subject, and
  changes to Station Officer during inquest.
- The HUD provider line clearly states `fallback-only M1`, API not verified,
  and model `none`.
- The inquest end panel clearly states that the Store conversation record was received and that Station comparison triggered the inquest.
- The inquest end panel now also spells out player speech/response delay ->
  Store record -> report handoff -> Station citation -> inquest, and names the
  Station Officer role action.
- Session-end controls are visible.

## Readability Concerns

- The bottom HUD is doing most of the readability work for record state,
  provider mode, and latest ledger provenance.
- The isolated prop close-ups make labels reviewable, but they do not prove a
  fresh player will notice or understand them during normal play.
- Keep the HUD, typed-input flow, and inquest panel as the primary
  player-facing explanation for the current proof. The prop close-ups are
  supporting provenance evidence.
- The contact sheet is useful for review, but individual screenshots are still
  required for detailed product sign-off.

## Product Claim Boundary

May claim:
- Current Store conversation screenshots are readable enough for internal review
  of the conversation loop, typed input, investigation trail, record-state HUD,
  provider/fallback state, record props, and inquest panel.

Must not claim:
- External player comprehension.
- World-prop-only comprehension.
- Demo-ready readability without tester notes.

## Current Capture Evidence

Commands run on 2026-05-17:

```bash
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/playable_slice_smoke.gd
/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd
```

Observed:
- `visual_capture.gd` returned `ok: true` with no blocked checks.
- `contact-sheet.png` is 1280x1440.
- individual screenshots are 1280x720.
- `codex_gameplay_probe.gd` also returns `ok: true` with all five bounded
  player actions accepted through `PlayableSession.debug_codex_gameplay_action`.
- `05-store-record-props-closeup.png` and
  `07-station-record-props-closeup.png` are generated with a dedicated
  prop-review camera and an isolated prop view so the proof targets record
  objects rather than normal traversal framing.
- The latest world `civic_ledger` label is shortened to keep exact citation
  provenance visible without repeating the full HUD explanation.
- `08-repair-correction-slip-closeup.png` is generated from a separate repair
  route session and shows the correction slip attached without Station inquest
  or stale HUD from the previous capture.
- `storeConversationEvidence.history` includes a `typed_free_input` turn.
- `storeConversationEvidence.providerState.mode` is `fallback_only_m1`.
- `storeConversationEvidence.worldRecordProps` includes visible labeled
  `receipt_tray`, `correction_slip`, `report_tray`, `station_dossier`,
  `civic_ledger`, and `civic_economy_panel` records. The economy panel label
  includes account credit as well as trust, burden, and attention.
- `visual_capture.gd` checks the HUD investigation trail for player subject and
  Station Officer examiner during inquest.
- `visual_capture.gd` checks the inquest outcome body for the speech/delay to
  record to Station role-action chain.
- `visual_capture.gd` also checks the live HUD consequence label for the same
  record chain before relying on the outcome panel.
- the inquest screenshot names Store ledger `civic-ledger-3` and the HUD latest
  ledger line names `civic-ledger-4` as Station citation of that Store record.
