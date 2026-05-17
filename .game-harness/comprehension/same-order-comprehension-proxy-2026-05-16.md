# Same Order Comprehension Proxy - 2026-05-16

Stage: M1 Protocol Proof
Build or artifact: `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
Status: `PROXY_PASS_EXTERNAL_REQUIRED`

## Scope

This is a proxy dry run against the current Evidence Pack. It checks whether
the build exposes enough cause-and-effect evidence for a later fresh-player
session. It does not close the external player comprehension blocker.

## Proxy Result

| Check | Proxy result | Evidence |
|---|---|---|
| C1 player is investigated | pass | `inquest_opened` exists; Station report and inquest events exist; Station dossier is cited; Station Officer uses `cite_record`. |
| C2 text is where danger starts | pass | `clean_cover` has no suspicion signals; `inquest_opened` records risky speech signals; text-specific signals include `dream_language_leak` or `local_routine_mismatch`; player answer events exist. |
| C3 consequence is rule-owned | pass | visible why-line exists; civic ledger events are accepted with why-lines; agent actions pass deterministic validation; provider-shaped comparison preserves deterministic outcomes. |
| C4 visible consequence follows answer | pass | receipt, report tray, Station dossier, and civic economy props are visible with labels; outcome title/body are present. |
| C5 safe/risky contrast | pass | clean, repair, soft report, and inquest routes exist; outcomes differ across cover/report/inquest; clean avoids inquest; risky path reaches inquest. |
| C6 validated action trail remains readable | pass | agentic route proofs preserve ordered ledger affordances; provider route proofs preserve the same action trail; scheduled jobs and dispatch packets carry recent ledger affordances into provider context. |
| C7 provider wording boundary | pass as contract evidence | provider-shaped comparison is proposal-only and passes; provider scheduling contract passes; provider dispatch packet contract passes; live Godot/HTTP provider dispatch remains explicitly unverified. Product review is still required. |

## External Blocker

External comprehension is still open. This proxy cannot replace the required
3-tester protocol in `.game-harness/player-comprehension-gate.md`.

Required next steps:

- Run the 3-tester comprehension protocol without explaining the design first.
- Capture at least one safe or repair path and one risky or inquest path across
  the cohort.
- Record tester quotes for C1-C6 in `.game-harness/review-log.md` or per-session
  notes.
