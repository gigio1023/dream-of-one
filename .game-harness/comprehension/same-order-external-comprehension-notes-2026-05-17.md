# Same Order External Comprehension Notes

Date: 2026-05-17
Status: `PENDING_TESTER_NOTES`

## Rule

This file is for human tester notes only. Do not mark this pass from tests,
generated packets, proxy reports, screenshots, or Codex interpretation.

## Build Under Test

Use one of these current proof paths:

- Local Godot run: Godot `4.7.beta2.official.777579205` through
  `/opt/homebrew/bin/godot-latest`, main scene `godot/scenes/main.tscn`.
- Minimal PCK run:
  `/private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order.pck` with
  `--main-pack`, proven by
  `/private/tmp/dream-of-one-export-proof-4.7/main-pack-playable-evidence.json`.
- Packaged app proof:
  `/private/tmp/dream-of-one-export-proof-4.7/dream-of-one-same-order-macos.zip`
  and unpacked app
  `/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app`.
  Packaged route proof is recorded at
  `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json`.

Current packaged app status:

- The packaged app exports, launches, and reaches Same Order inquest through
  the opt-in packaged route smoke.
- Latest facilitator preflight on 2026-05-17 22:41 KST passed against
  `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json`; it
  proves fallback-only mode, typed free input, response hesitation, exact
  `civic-ledger-4 -> civic-ledger-3` citation, HUD examiner/subject wording,
  the live HUD record-chain line, and the outcome-chain recap.
- The packaged app, PCK, and route evidence were regenerated after the current
  record-prop readability capture pass, so the tester-ready build is not stale
  against the Godot prop/HUD changes in this proof set.
- This still does not count as player comprehension.
- Use the packaged app path above for fresh tester notes when possible.
- Run the app normally for testers. Do not run the headless route smoke as a
  substitute for observed play.
- The current product truth is `fallback_only_m1`. Do not record live GPT
  behavior unless a separate live provider preflight is run and documented.
- Raw tester notes currently found: `0 / 3`. The strict review helper correctly
  reports `PENDING_TESTER_NOTES` and exits non-zero until fresh notes exist.
- Current status helper also reports strict review status `PENDING_TESTER_NOTES`
  and lifts quality counts for build-bound notes, complete note structures,
  dialogue-to-record-to-consequence-to-role-action explanations, direct quote
  pairs, examined subject recognition, and no role inversion. These are all
  `0 / 0` until actual notes exist.
- The current Codex gameplay QA probe is setup proof only. It can be refreshed
  with `.game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe`
  and inspected with `--codex-probe-status`; it proves Codex can execute bounded
  player inputs and inspect Store/Station consequences, but it still does not
  count as player comprehension.

Current local proof snapshot for the next tester session:

- `/opt/homebrew/bin/godot-latest --headless --import --path godot` passed.
- `/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd` passed.
- `/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd` passed.
- `/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd` passed.
- `/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/playable_slice_smoke.gd` passed with clean cover, repair recovery, soft report, and inquest route proofs.
- `/opt/homebrew/bin/godot-latest --quit-after 2400 --path godot --script res://tools/visual_capture.gd` passed with 8 captures, including the repair-route correction slip close-up, and `blockedChecks: []`.
- `npm run same-order:attach-playability-reports --prefix backend/npc-runtime` passed after the fresh Godot run.
- `npm run check --prefix backend/npc-runtime` passed with 120 integration tests.
- The current playable Evidence Pack has `playability.visualEvidenceProxy.pass = true`, `freshCapture = true`, 8 capture checks, and `playability.comprehensionProxy.externalBlockerClosed = false`.
- This snapshot is setup proof only. It still does not count as player comprehension.

## Facilitator Run Steps

1. Before recruiting a tester, run:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --preflight`.
   This checks that the packaged app exists and that packaged route evidence
   is not older than the packaged app binary and still proves fallback-only
   mode, delayed-answer Evidence, typed free input, inquest outcome, and exact
   Station citation. It also requires packaged HUD examiner/subject proof and
   packaged live HUD record-chain and outcome-chain proof.
2. Optional no-spoiler recruitment card:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment`.
   This repeats preflight without printing preflight details, then prints only
   tester-safe invite text. It must not be counted as evidence.
3. Optional Codex gameplay QA refresh:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe`.
   This repeats preflight, runs the active Godot scene through the Codex action
   and snapshot interface, and writes
   `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`.
   Use `--codex-probe-status` to print the latest path, hash, and status. This
   is facilitator setup proof only.
4. Optional full facilitator run pack:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack`.
   This repeats preflight and prints current build hashes, no-spoiler invite
   text, before-play instruction, after-play questions, worksheet path, and
   review commands in one place. It is facilitator-only and must not be sent to
   the tester or counted as evidence.
   Use
   `.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack-output <path>`
   to write the same pack to a facilitator-only file.
   Use
   `.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output <dir>`
   to write a session kit containing the pack, no-spoiler invite,
   facilitator-only recruitment companion, facilitator card, debrief,
   worksheet, gate status, and README. In that kit, only `tester-invite.md` may
   be sent to a fresh tester. The rest is facilitator-only setup material and
   must not be counted as raw tester notes.
   Verify a generated kit before the session with
   `.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>`.
5. Optional facilitator card:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --instructions`.
   This repeats preflight and prints the exact one-sentence prompt, the current
   app/evidence paths, and the post-session review commands without launching
   the app.
6. Optional after-play question card:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --debrief`.
   Use this only after the tester has played. It repeats preflight and prints
   the C1-C7-style debrief questions and direct quote prompts without launching
   the app or counting as evidence.
7. Optional status check:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --status`.
   This repeats preflight, counts raw session note files, prints strict review
   status and key quality counts, prints the current review, and names the next
   action without launching the app. Trust strict status and quality counts, not
   file count alone.
8. Optional raw-note worksheet for remote or paper sessions:
   `.game-harness/scripts/run-same-order-comprehension-session.sh --worksheet`.
   This repeats preflight and prints the exact fields expected by strict
   review, plus current app/evidence hashes. A blank worksheet is not evidence.
9. Run `.game-harness/scripts/run-same-order-comprehension-session.sh`, or open
   `/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app`
   manually. The helper asks for tester label, language comfort, and explicit
   `Fresh tester: yes` before launch, and refuses to launch for non-fresh or
   unmarked participants.
10. Say only:
   `Play this short scene without prior explanation until it stops or until 5 minutes pass.`
11. Let the tester try one free first attempt.
12. Record the tester's first explanation before explaining records, risk,
   Station citation, or provider behavior.
13. If a scripted comparison is needed, use the route cards in
   `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`.
14. Record direct quotes where possible. Mark uncertainty as `conditional`, not
   `pass`.

The helper writes raw session notes under
`.game-harness/comprehension/manual-sessions/`. Those files are not a pass by
themselves; they must still be reviewed against the pass criteria below.
The short raw-note quality guide for facilitators is
`.game-harness/comprehension/manual-sessions/README.md`.

After collecting notes, run:

```bash
.game-harness/scripts/review-same-order-comprehension-notes.sh
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
.game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md
```

The review helper rejects weak structure before human review. It checks the
minimum three-session sample, at least two Korean-comfortable testers,
all three marked as fresh testers with distinct tester labels, safe/risky route
coverage, complete note fields, the explicit dialogue to record to consequence
to role-action explanation, direct quotes, build/preflight provenance,
app/evidence SHA-256 binding, packaged live HUD record-chain proof, packaged
outcome-chain proof, O1-O7 pass counts, delayed-answer record comprehension,
and role inversion. It
verifies that referenced build/evidence paths exist, that their hashes match
the session note, that route evidence is not older than the app binary, and
that the evidence still proves fallback-only mode, typed input, delayed-answer
Evidence, inquest, exact Station citation, HUD examiner/subject wording, and
the speech/delay -> Store record -> Station role-action outcome chain. A helper status of
`PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW` still does not close the gate; accepted
direct quotes and the final verdict must be copied into this file by a human
reviewer.

Direct quote fields must contain actual tester wording. The helper does not
count placeholder answers such as `yes`, `pass`, `observed`, `not observed`,
or `none` as direct quotes.
The guard script
`.game-harness/scripts/verify-comprehension-review-guards.sh` creates temporary
placeholder notes with valid-looking build/evidence hashes and verifies that
strict review still fails with direct quote counts at `0 / 3`.

Use normal mode while inspecting partial notes. Use `--strict` for gate checks;
it exits non-zero unless the raw notes reach
`PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW`. Use `--ledger-draft` to write a
copyable human-review draft. The draft is not a pass; it still requires quote
review before accepted findings are copied into this file.

## Pass Criteria

Minimum sample: three fresh testers.

Pass only if:

- 3 of 3 are fresh testers who have not seen the Same Order proof, route cards,
  or design explanation before. The raw note must say `Fresh tester: yes`;
  `pass`, `observed`, or facilitator shorthand does not count.
- 3 of 3 session notes use distinct tester labels.
- 3 of 3 understand they are being examined by NPCs or Station systems.
- 3 of 3 connect at least one dialogue or typed statement to a visible record.
- 2 of 3 can explain the chain from dialogue to record to consequence to role
  action without being taught the design intent.
- 2 of 3 who see the inquest comparison connect delayed answer or hesitation
  to a visible record.
- 2 of 3 can identify who made or cited the latest record.
- 0 of 3 leave thinking the main role is investigating other people.
- Direct quote evidence preserves actual tester wording, not facilitator
  summaries or checkbox answers.

## Session Template

### Tester A

- Date:
- Tester label:
- Fresh tester:
- Tester language comfort:
- Build path:
- Packaged route evidence path:
- Preflight result:
- Provider state:
- Packaged live HUD record-chain proof:
- Packaged outcome chain proof:
- App binary sha256:
- Packaged route evidence sha256:
- Route seen:
- Free first attempt route / final state:
- Scripted alternate route / final state:
- Safe path observed:
- Risky path observed:
- First explanation of goal:
- What changed after the player's line:
- Record or ledger detail noticed:
- Who acted on the record:
- Dialogue to record to consequence to role action explanation:
- Delayed answer record noticed:
- Direct quote examined/evaluated:
- Direct quote statement-to-record:
- Direct quote delay-to-record:
- O7 connects delayed answer to record:
- Did the tester think they were examining others:
- Facilitator intervention needed:
- Verdict: `pass`, `conditional`, or `fail`
- Notes:

### Tester B

- Date:
- Tester label:
- Fresh tester:
- Tester language comfort:
- Build path:
- Packaged route evidence path:
- Preflight result:
- Provider state:
- Packaged live HUD record-chain proof:
- Packaged outcome chain proof:
- App binary sha256:
- Packaged route evidence sha256:
- Route seen:
- Free first attempt route / final state:
- Scripted alternate route / final state:
- Safe path observed:
- Risky path observed:
- First explanation of goal:
- What changed after the player's line:
- Record or ledger detail noticed:
- Who acted on the record:
- Dialogue to record to consequence to role action explanation:
- Delayed answer record noticed:
- Direct quote examined/evaluated:
- Direct quote statement-to-record:
- Direct quote delay-to-record:
- O7 connects delayed answer to record:
- Did the tester think they were examining others:
- Facilitator intervention needed:
- Verdict: `pass`, `conditional`, or `fail`
- Notes:

### Tester C

- Date:
- Tester label:
- Fresh tester:
- Tester language comfort:
- Build path:
- Packaged route evidence path:
- Preflight result:
- Provider state:
- Packaged live HUD record-chain proof:
- Packaged outcome chain proof:
- App binary sha256:
- Packaged route evidence sha256:
- Route seen:
- Free first attempt route / final state:
- Scripted alternate route / final state:
- Safe path observed:
- Risky path observed:
- First explanation of goal:
- What changed after the player's line:
- Record or ledger detail noticed:
- Who acted on the record:
- Dialogue to record to consequence to role action explanation:
- Delayed answer record noticed:
- Direct quote examined/evaluated:
- Direct quote statement-to-record:
- Direct quote delay-to-record:
- O7 connects delayed answer to record:
- Did the tester think they were examining others:
- Facilitator intervention needed:
- Verdict: `pass`, `conditional`, or `fail`
- Notes:

## Current Verdict

No tester notes have been recorded. Player comprehension remains open.
