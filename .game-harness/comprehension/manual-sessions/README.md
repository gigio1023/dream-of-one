# Same Order Manual Session Notes

This directory stores raw notes from actual fresh-player Same Order
comprehension sessions.

These files are human evidence only when they come from observed play. Do not
create filler notes, proxy notes, generated notes, or simulated tester answers.

## Run

Default path for each fresh tester:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Use `--status` only as a quick readiness check:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --status
```

Use setup helpers only when recruiting, handing off to another facilitator, or
collecting notes outside the interactive helper:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment
.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output build/session-kits/same-order
.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit build/session-kits/same-order
.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack
.game-harness/scripts/run-same-order-comprehension-session.sh --worksheet
.game-harness/scripts/run-same-order-comprehension-session.sh --debrief
.game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe-status
```

After each session, the helper writes one raw note and prints the current raw
note count plus the minimum additional sessions needed before strict review can
pass. Review progress at any time; strict review stays pending until at least
three valid fresh-player notes exist. Once the count reaches three, the helper
prints the strict review and ledger-draft commands directly:

```bash
.game-harness/scripts/review-same-order-comprehension-notes.sh
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
.game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md
```

To verify the reviewer still rejects placeholder notes:

```bash
.game-harness/scripts/verify-comprehension-review-guards.sh
```

## Pass-Quality Notes

Write down what the tester says before explaining the design. The most important
fields are:

- whether the tester thinks NPCs or Station systems are examining the player;
- what changed after a spoken or typed line;
- which record or ledger detail the tester noticed;
- whether the tester noticed the civic economy panel and what credit, trust,
  burden, or attention seemed to mean;
- who made or cited the latest record;
- the tester's own dialogue -> record -> consequence -> role action explanation;
- whether delayed answer or hesitation became a record;
- direct quotes in the tester's words.

Use `--debrief` as an after-play checklist for those questions. It is a
facilitator aid only; it is not player evidence by itself.

Use `--recruitment` to print only the no-spoiler invitation text that may be
sent to a fresh tester. It should not be saved as evidence; it exists to avoid
telling testers about records, risk, Station citation, provider mode, or the
intended role before first play.

Use `--facilitator-pack` to print the whole run order, current app/evidence
hashes, no-spoiler invite text, before-play instruction, after-play questions,
and review commands in one place. It is facilitator-only and must not be sent
to the tester. Use `--facilitator-pack-output <path>` to write the same pack
to a file for the facilitator's notes.

Use `--codex-probe` to run the current Godot scene through the Codex gameplay
QA interface before a human session. Use `--codex-probe-status` to print the
latest probe path, hash, and status. This proves Codex can execute bounded
player inputs and inspect Store/Station consequences, but it is not player
comprehension evidence.

Use `--session-kit-output <dir>` to write a setup directory with the run pack,
tester invite, facilitator-only recruitment companion, facilitator card,
after-play debrief, worksheet, gate status snapshot, and README. In that kit,
`tester-invite.md` is the only tester-facing file. The rest is facilitator-only
setup material and must not be counted as a raw tester session.

Use `--worksheet` when the facilitator needs to collect notes outside the
interactive helper. It prints the same fields the strict reviewer expects,
including the live HUD record-chain proof, outcome-chain proof, and current
app/evidence hashes. A blank worksheet is not evidence and should not be saved
as a completed session.

Direct quote fields must not be filled with `yes`, `pass`, `observed`,
`not observed`, or `none`. Use `conditional` when the tester partly understands
the chain but needs facilitator explanation.

## Current Gate

The active goal remains open until the review helper reaches
`PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW` and a human reviewer copies accepted
quote findings into
`.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`.

`--status` reports both raw note file count and strict review status. Trust the
strict status, not the file count. It also lifts the most important quality
counts to the top: build-bound notes, complete note structure,
dialogue-record-consequence-role explanations, direct quote pairs, examined
subject recognition, and no role inversion. Three weak or blank files still
fail.
