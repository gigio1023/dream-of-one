# Player Comprehension Gate

This protocol tests whether a fresh player understands the Dream of One
protocol proof. It is not a preference survey and not a substitute for backend
or Godot checks.

Use this gate for M1 Protocol Proof closure and M2 entry decisions.

Current Same Order preparation artifact:

- `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
  field `playability.playerComprehensionPlaytestPacket`
- `.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment`
  prints the tester-facing no-spoiler invite.
- `.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output <dir>`
  writes a facilitator setup kit. In that kit, only `tester-invite.md` may be
  sent to a fresh tester.

This packet prepares the blind cohort protocol from current route evidence. It
does not replace completed tester notes.

## Tester Setup

Minimum cohort:
- 3 fresh testers with no implementation context.
- At least 2 Korean-first or Korean-comfortable testers when the Korean path is
  the primary proof path.
- English path may be tested as parity, but it does not replace Korean-first
  proof unless the milestone explicitly changes language scope.

Session rules:
- Do not explain the design rails before play.
- Give only the start instruction: "Play this short Station intake path until it
  stops or until 5 minutes pass."
- Do not answer design questions during play.
- Record observations before asking comprehension questions.
- Record whether the tester saw a safe response, risky response, or both.
- Record the tester's own explanation of the chain from dialogue to record to
  consequence to role action.
- Record whether the tester noticed a delayed answer or hesitation becoming a
  record when the inquest comparison is shown.
- Bind each session to a packaged app/evidence pair whose preflight proves the
  HUD examiner/subject wording and outcome-chain recap.
- Record the app binary SHA-256 and packaged route evidence SHA-256 so later
  review can detect if the referenced files were replaced after the session.
- Record direct quotes for both examined/evaluated interpretation and
  statement-to-record interpretation. Record delayed-answer-to-record quotes
  when observed.

## What The Tester Must Understand

Score each check as:
- `2`: unaided correct explanation or action.
- `1`: partial answer after a neutral prompt.
- `0`: wrong, absent, or contradicted by later explanation.

| ID | Check | Pass evidence | Critical |
|---|---|---|---|
| C1 | The player is being investigated by Station/NPC systems | Tester says the system is checking, evaluating, interrogating, or building a case against them | yes |
| C2 | Text is where danger starts | Tester says their answer, explanation, wording, or hesitation can be used against them | yes |
| C3 | Consequence is rule-owned | Tester connects the outcome to Evidence, Exposure, Dream Law, a why-line, or a deterministic rule rather than arbitrary prose | yes |
| C4 | Visible consequence follows the answer | Tester points to a screen change, constraint, warning, Exposure change, or route pressure caused by the answer | yes |
| C5 | Safe/risky contrast is legible | Tester can distinguish the lower-risk and higher-risk response paths after seeing or being shown both paths | yes |
| C6 | Latest record action is readable | Tester identifies which role made or cited the latest visible ledger record and what validated action made it | yes |
| C7 | Provider wording is not outcome authority | Product reviewer, not player, confirms API/provider text cannot decide risk, Evidence, Exposure, verdict, or session end | product-only |

## Pass Thresholds

Individual pass:
- C1, C2, C3, and C4 must each score `2`.
- C5 must score `2` if the tester saw both paths; otherwise it must be covered
  across the cohort.
- The session must include direct quote evidence, not only facilitator
  paraphrase.

Cohort pass:
- 3 of 3 testers score `2` on C1 and C2.
- At least 2 of 3 testers score `2` on C3, C4, C5, and C6.
- At least 2 of 3 testers who see the inquest comparison connect delayed
  answer or hesitation to a visible record.
- At least one safe path and one risky path are observed across the cohort.
- No tester leaves with role inversion as their main interpretation.

Automatic fail:
- Any tester primarily describes the game as the player investigating others.
- A tester can complete the path while treating text as flavor with no state
  consequence.
- The visible state change cannot be found without reading hidden logs.
- Provider wording appears to decide Evidence, Exposure, verdict, or session end.

## Evidence Format

Create one note per tester session. Store the note in the active harness or
evidence folder named by the milestone owner.

```markdown
# Player Comprehension Session - <YYYY-MM-DD> - <tester-id>

Stage:
Build or artifact:
Packaged route evidence:
Preflight result:
Provider state:
Packaged outcome chain proof:
App binary sha256:
Packaged route evidence sha256:
Language path:
Facilitator:
Tester prior exposure:
Duration:
Free first attempt route and final state:
Scripted alternate route and final state:
Safe path observed: yes/no
Risky path observed: yes/no
Delayed answer record noticed: yes/no

## Play Path

| Time | Player action | Screen/system response | Observer note |
|---|---|---|---|
| 00:00 |  |  |  |

Safe/risky coverage:
- Safe path observed: yes/no
- Risky path observed: yes/no

## Unaided Debrief

Prompt: "What did you think was happening to you in this scene?"
Answer:

Prompt: "What made the situation more or less dangerous?"
Answer:

Prompt: "Why did the result happen?"
Answer:

Prompt: "Explain the chain from your answer to the visible record, consequence,
and actor response."
Answer:

Direct quote: player says they are being examined/evaluated:

Direct quote: player connects their statement to a record or consequence:

Direct quote: player connects a delayed answer to a record or consequence:

## Scores

| Check | Score | Evidence quote or observed action | Notes |
|---|---:|---|---|
| C1 player investigated |  |  |  |
| C2 text danger |  |  |  |
| C3 rule-owned consequence |  |  |  |
| C4 visible consequence |  |  |  |
| C5 safe/risky contrast |  |  |  |
| C6 latest record action |  |  |  |

## Confusion Points

-

## Verdict

Result: pass/conditional/fail
Reason:
Required fix before M1/M2:
```

## M1/M2 Decision Rule

M1 may close as product-ready only when:
- Product review accepts the provider wording-only boundary.
- The comprehension cohort passes the thresholds above.
- Evidence, Exposure, why-line, and visible consequence are all player-facing.
- Any live bridge or exported build/provider UX gaps are recorded as explicit
  M2-entry infrastructure work before content expansion.

M2 content work is no-go when:
- External comprehension has not been run.
- The cohort fails any critical threshold.
- Product review rejects or cannot verify deterministic authority.
- The next proposed work expands social-pressure content before live bridge and
  provider UX decisions are resolved.
