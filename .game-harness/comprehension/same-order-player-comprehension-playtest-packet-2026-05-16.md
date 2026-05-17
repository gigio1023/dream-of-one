# Same Order Player Comprehension Playtest Packet

Date: 2026-05-16
Stage: M1 Protocol Proof
Status: ready to run with packaged app; external player notes still required

Backend source:
`backend/npc-runtime/src/runtime/same-order-player-comprehension-playtest.ts`

Evidence field:
`playability.playerComprehensionPlaytestPacket`

## Purpose

Run a small blind test for the actual game question:

```text
Does a fresh player understand that their speech changes a Store record,
that delayed answers can also become records, and that Station can use those
records against them?
```

## Protocol

Build under test:

- Preferred tester build:
  `/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app`
- Facilitator helper:
  `.game-harness/scripts/run-same-order-comprehension-session.sh`
- Notes review helper:
  `.game-harness/scripts/review-same-order-comprehension-notes.sh`
- Zip artifact:
  `/private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order-macos.zip`
- Provider state for this packet: `fallback_only_m1`. Do not describe it as
  live GPT behavior during the test.

Start instruction:

```text
Play this short Station intake path until it stops or until 5 minutes pass.
```

Do not explain the player role, safe/risky answers, Store records, Station
citation, or provider boundary before the debrief.

Use route cards only after the tester's free first attempt or for a scripted
alternate run. For the inquest alternate run, use the HUD input field and press
Enter; do not use the internal recorded-statement fallback.

Facilitator run order:

1. Run `.game-harness/scripts/run-same-order-comprehension-session.sh --preflight`
   before the tester arrives. It must pass before using the packaged app, and
   it must print both packaged HUD examiner/subject proof and packaged outcome
   chain proof.
2. Run `.game-harness/scripts/run-same-order-comprehension-session.sh` or open
   the packaged app normally. The helper asks for tester label, language
   comfort, and explicit `Fresh tester: yes` before launching; it refuses to
   launch for non-fresh or unmarked participants. Do not use the headless smoke
   hook.
3. Confirm the participant has not seen this Same Order proof, route cards, or
   design explanation before.
4. Let the tester play one free first attempt without explaining the design.
5. Record the route, final state, and first explanation before any correction.
6. If needed, run the assigned route card as an alternate path.
7. Ask C1-C6 immediately after play. Ask C7 only for product/provider review.
   Record the tester's own dialogue -> record -> consequence -> role action
   explanation, delayed-answer interpretation, and direct quotes before giving
   any design explanation.
8. Copy or summarize accepted session files from
   `.game-harness/comprehension/manual-sessions/` into
   `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`.
9. Use `.game-harness/scripts/review-same-order-comprehension-notes.sh` to
   check whether the raw notes are complete enough for review. The script
   cannot close the gate without human quote review. It also rejects notes
   whose referenced packaged app evidence no longer proves the live HUD
   record-chain line and outcome-chain recap, or no longer matches the
   app/evidence SHA-256 recorded at session
   time. Direct quote fields must contain actual tester wording; checkbox
   answers such as `yes`, `pass`, or `observed` are not counted as quotes.
10. Use `.game-harness/scripts/review-same-order-comprehension-notes.sh --strict`
   when wiring the notes into a gate; it exits non-zero unless the raw notes
   reach pass-candidate status.
11. Use `.game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md`
   to prepare a human-review draft before updating the external ledger. The
   draft is not a pass.

| Tester | Routes | Purpose |
|---|---|---|
| T1 | `clean_cover` -> `inquest_opened` | Normal receipt vs Station citation. |
| T2 | `repair_recovered` -> `inquest_opened` | Local correction vs escalation. |
| T3 | `soft_report` -> `clean_cover` | Store-side report vs clean routine sale. |

## Route Cards

These cards are for facilitator operation after the blind first attempt. Do not
read them aloud as design explanation.

| Route | Actions | Expected visible evidence | Comprehension signal |
|---|---|---|---|
| `clean_cover` | Choose 1, then choose 1. | normal receipt; stable trust; Store Clerk create-receipt ledger action; no Store report; no Station dossier citation | Tester can say the ordinary answer closed the sale without a report. |
| `repair_recovered` | Choose 2, then choose 1. | marked receipt; attached correction slip; Store Clerk correction ledger action; small burden; no Station inquest | Tester can say uncertainty created a record, but accepting the premise repaired it locally. |
| `soft_report` | Choose 3, then choose 3. | marked receipt; pending report tray; Store Manager reaction; Store Manager note/forward ledger action; no formal inquest | Tester can say the Store reacted and made a report without the Station ending the session. |
| `inquest_opened` | Choose 3, wait about 12 seconds at the probe prompt, then type `저는 이 꿈에 방금 들어왔어요.` in the HUD input and press Enter. | delayed-answer record; forwarded report tray; cited Station dossier; Station Officer cite-record ledger action; Station attention; locked inquest outcome | Tester can say typed speech and delayed response became Store records that the Station used. |

## Questions

- C1: What did you think was happening to you in this scene?
- C2: What made the situation more or less dangerous?
- C3: Why did the result happen?
- C4: What changed on the screen after your answer?
- C5: After seeing the alternate path, which answer was safer and which was riskier?
- C6: Who made or cited the latest record you saw, and what validated action made that record?
- C7: Product review only: can provider wording decide risk, Evidence, Exposure, verdict, or session end?

## Pass Bar

- 3 of 3 testers are fresh participants who have not seen the proof, route
  cards, or design explanation before. The raw note must say
  `Fresh tester: yes`; `pass`, `observed`, or facilitator shorthand does not
  count.
- 3 of 3 session notes use distinct tester labels.
- 3 of 3 testers understand NPCs or Station are evaluating the player.
- 3 of 3 testers understand their answer can become evidence.
- At least 2 of 3 connect visible consequence to their answer.
- At least 2 of 3 testers who see the inquest comparison connect delayed
  answer or hesitation to a record.
- At least 2 of 3 identify the role and validated action behind the latest visible ledger record.
- No tester leaves thinking they are primarily investigating other people.
- Direct quote fields must preserve what the tester actually said. Do not
  replace a quote with `yes`, `pass`, or a facilitator summary.

## Observation Checklist

- O1: Tester identifies that NPCs or Station systems are evaluating the player.
- O2: Tester connects a spoken or typed answer to a changed Store record.
- O3: Tester notices at least one social actor reaction beyond the clerk's dialogue.
- O4: Tester can explain why clean or repair is safer than soft report or inquest.
- O5: Tester can identify which role made or cited the latest ledger record and name the validated action shown beside it, such as create receipt, mark receipt, place note, forward report, or cite record.
- O6: Tester keeps the player as the person being evaluated, not the case owner.
- O7: Tester connects a delayed answer or hesitation to a Store record or Station pressure.
- Optional economy note: capture whether the tester noticed account credit,
  trust, record burden, or Station attention, but do not coach this before
  their first explanation.

## Session Note Template

```text
Build or artifact id:
Packaged route evidence path:
Preflight result:
Provider state:
Packaged live HUD record-chain proof:
Packaged outcome chain proof:
App binary sha256:
Packaged route evidence sha256:
Tester label:
Tester language comfort:
Fresh tester: yes/no
Free first attempt route and final state:
Scripted alternate route:
Safe path observed: yes/no
Risky path observed: yes/no
Observed O1-O7 pass/fail with quotes:
C1-C7 answers:
Dialogue -> record -> consequence -> role action explanation:
Delayed answer record noticed:
Direct quote: tester says they are examined/evaluated:
Direct quote: tester connects statement to record/consequence:
Direct quote: tester connects delayed answer to record, if observed:
Confusion points before facilitator explanation:
Decision: pass, conditional, or fail for this tester:
```

This packet is setup evidence only. It does not close external comprehension.
