# Goal Loop State

Last Updated: 2026-05-18
Mode: lightweight Ralph-style persistence
Status: active-local-work; Codex thread goal may report paused, but repo work
continues from this state file until the external blocker is resolved.

## Why This Exists

`~/git/harness` shows useful long-running-agent habits: keep a prompt, a task
list, a resumable state file, logs/evidence, and clear exit gates. Dream of One
does not need a copied `.ralph/` system. The current `.game-harness/` already
does that job, so this file is the compact resume point for long Codex passes.

## Read First On Resume

1. `.game-harness/active-goal-prompt.md`
2. `.game-harness/goal-loop-state.md`
3. `.game-harness/continue-here.md`
4. `.game-harness/tasks.md`
5. `.game-harness/verification-ledger.md`
6. `.game-studio/project-state.md`
7. `AGENTS.md`

## Current Objective

Finish the current small proof toward an open-environment, conversation-first
NPC social simulation. The player is examined through speech, hesitation,
repair, and records. `Same Order` in Store/Station is only an ultra-small
sample for proving the pattern; it should not become the product center or the
default backlog.

The priority is game substance first. Each autonomous pass should improve the
actual intended game when a concrete gap is visible: a clearer role action, a
more readable consequence, a stronger environment affordance, or a smaller
playable social reaction. Tests, AI-play probes, session helpers, and evidence
ledgers are support work. They should stay as narrow as needed to protect the
implemented game change and must not become the main product.

The intended game is an open social field, not a Store/Station simulator.
Current Store/Station work should remain deliberately cheap: a small sample
with obvious props, blunt records, and even child-simple economy values is
acceptable if it proves NPCs can use environment affordances and social records
without bespoke reaction branches.

Keep an AI-play QA interface as part of the objective. Codex should be able to
play the current proof cell through stable action/snapshot APIs, inspect the
same HUD/world/ledger/NPC state a player would use, and produce a readable run
artifact before human testers are asked to judge the build. This is development
infrastructure for an AI-built game, not a substitute for external
comprehension notes. Any new player-facing feature should be exposed through the
action catalog, typed-action path, snapshot, and report artifact quickly enough
that Codex can check it by playing rather than by reading private code.
Every playable increment should therefore leave behind a working AI-play path:
callable actions, player-visible snapshot, role/action consequence, and a
readable run artifact. If that path breaks or cannot explain the new slice from
the player point of view, fix it before broadening the design.
This play-based interface is higher leverage than extra test code for most
game-feel and comprehension questions. Keep tests lean and reserve them for
deterministic authority, schema compatibility, provider boundaries, route
evidence, and known regressions; use Codex-run gameplay probes as the fast
default check for whether the game can actually be played, inspected, and
explained.

## Current Blocker

External fresh-player comprehension notes are still missing. Current raw manual
session count is `0 / 3`, so product closure remains blocked even though
backend, Godot, visual, Codex gameplay QA, export, and packaged route proofs
are current.

Latest status check:
- command: `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
- result: pass for packaged preflight; strict review remains
  `PENDING_TESTER_NOTES`.
- packaged evidence: tester-ready, `stage=inquest`,
  `providerState.mode=fallback_only_m1`, typed input yes, response hesitation
  yes, live HUD record-chain proof yes, outcome-chain proof yes, civic economy
  proof yes.
- raw session note files: `0 / 3 minimum`.
- session setup now prints Codex route reports for clean cover, repair recovery,
  soft report, and inquest in the facilitator pack, worksheet, and generated
  session kit README, while still marking that proof as setup-only.
- generated session kits now require the Codex gameplay QA status to pass and
  copy facilitator-only snapshots of the current Codex JSON/Markdown reports
  into the kit as `codex-gameplay-probe.json` and
  `codex-gameplay-report.md`.
- generated session kits now also include `session-kit-manifest.json`, a
  machine-readable setup binding with app/evidence paths, hashes, copied Codex
  QA artifacts, 4/4 Codex route reports, `humanEvidence=false`, and
  `closesGoal=false`.
- session kits can now be checked with
  `.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>`,
  which verifies required files, copied Codex artifact hashes, required Codex
  player action catalog entries, copied-probe schema/API/report flags, manifest
  action/route data against the copied Codex JSON, 4/4 route reports,
  `humanEvidence=false`, `closesGoal=false`, and a no-spoiler tester invite.

Latest AI-play interface check:
- command: `/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/codex_gameplay_probe.gd`
- result: pass, `aiPlayerReportPass=true`, `stage=inquest`, accepted public
  player actions `5 / 5`, and `routeReportPassCount=4 / 4`.
- latest game increment: clean cover now has a visible social consequence too.
  When the player answers inside the local routine, the Clerk cites the usual
  order and creates a normal receipt; the Waiting Customer reads that normal
  receipt, uses `accept_routine` on the queue mark, changes the queue state to
  `settled`, adds `queue_routine_kept` to the civic ledger, and raises local
  trust by 2. This proves that the social field reacts to fitting in, not only
  to risk or repair.
- prior repair increment remains current: repair has a visible social consequence, not only
  a clerk-internal correction. When the player admits uncertainty and then
  returns to the Clerk's premise, the Clerk attaches a correction slip and the
  Waiting Customer reads that correction record, uses `accept_repair` on the
  queue mark, changes the queue state to `settled`, adds
  `queue_repair_accepted` to the civic ledger, increases local trust by 5, and
  reduces record burden by 5. This proves the reusable pattern that repair can
  calm a social situation through another NPC, not just avoid punishment.
- prior small negative-reaction increment remains current: a Waiting Customer
  reads the Clerk's report note, uses `complain_delay`, disrupts the queue, and
  a Park Witness can post public rumor from the same Store note before
  manager/Station actions continue. These are reusable NPC-to-NPC record-use
  patterns, not reasons to deepen Store/Station content.
- artifact:
  `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`
- Markdown report:
  `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.md`
- SHA-256:
  `f3767775cb393b577c7c58b844a906c0aab6be5588c406ee597b6b793e436934`
- Markdown SHA-256:
  `9f0d0ed934d757b053f80b6fbd5cc4154010504093c5ea02a376c1546324c889`
- new proof: artifact now includes `aiPlayerReport` with action path, final
  player-visible state, player-readable cause chain, role-action explanation,
  NPC-to-NPC observation explanation, and the explicit boundary that this is
  not external comprehension evidence. The same run also writes a Markdown
  sidecar for fast human/Codex review. The probe also now starts fresh scenes
  and drives public Codex/player actions through clean cover, repair recovery,
  soft report, and inquest outcomes, proving AI-play route coverage without
  replacing human comprehension notes.
- session kit manifests now bind the current Codex action catalog
  (`focus.store_counter`, `conversation.start`,
  `player.wait.hesitation_record`, `dialogue.choice.by_id`,
  `dialogue.choice.by_index`, and `player.type.free_input`) so an AI coding
  tool can verify which player actions are callable before a human session.
- session kit verification now requires both dialogue action surfaces:
  `dialogue.choice.by_id` and `dialogue.choice.by_index`, so Codex can drive
  authored choices by stable id or by visible player-facing slot.
- session kit verification now also requires the copied Codex probe to contain
  an accepted `player.type.free_input` step with a non-empty text payload that
  reaches the inquest route. This keeps the "Codex can submit typed text"
  objective tied to actual play, not only to an action catalog entry.
- session kit verification now requires Codex-readable player-visible state
  from the copied probe: HUD record text, investigation trail, civic economy
  panel, world record props, civic ledger citation, and Store Manager/Station
  Officer role actions. This keeps "Codex can inspect HUD/world/ledger/NPC
  state" tied to actual play artifacts.
- session kit verification now fails if manifest action/route summaries drift
  from the copied `codex-gameplay-probe.json`, keeping AI-play setup proof tied
  to the actual Godot probe artifact instead of trusting duplicated metadata.
- generated session kits now run their own verifier at creation time and write
  `session-kit-self-check.txt`, so a facilitator or AI tool can see that the
  bundle passed setup checks before any human play session.
- facilitator pre-play prompts now use the neutral line "Play this short scene
  without prior explanation..." instead of "Station intake path", reducing
  first-run hinting before external comprehension notes are captured.
- session kit verification now also checks facilitator-only pre-play files for
  the neutral line and fails if stale "Station intake path" wording returns,
  keeping blind-player setup honest before raw notes are collected.
- tester-facing invite verification now rejects broader first-run hints such
  as Station/station, 스테이션, inquest, record objects, ledger terms, risk,
  Evidence, provider/fallback, and examined-role wording.
- tester-facing invite spoiler checks are case-insensitive for English terms,
  so capitalized leaks such as Record, REPORT, or Station also fail setup
  verification.
- standalone `--recruitment` output now runs the same broad no-spoiler scan
  before printing, so a direct tester invite cannot bypass the session kit
  verifier.
- `.game-harness/scripts/verify-comprehension-review-guards.sh` now also
  proves the standalone `--recruitment` path fails on broad/case-insensitive
  tester-invite leaks, so the quickest fresh-player invite path is covered by
  a regression guard.
- The same guard now proves session-kit verification fails if
  `dialogue.choice.by_index` is dropped from the Codex action catalog binding.
- It also proves verification fails if the copied Codex probe no longer
  contains an accepted typed free-input step.
- It also proves verification fails if the copied probe loses player-visible
  HUD record state or Station Officer citation state.
- session kit verification now also requires the copied Codex Markdown gameplay
  report to remain readable as a player-perspective artifact: action path,
  player-readable cause chain, final visible state, route outcomes, role
  actions, NPC-to-NPC observations, and the explicit external-comprehension
  boundary. The guard proves a damaged Markdown report fails even when its hash
  is updated in the manifest.
- `.game-studio/project-state.md` has been realigned with current proof:
  typed free input is proven through the Godot/HUD/Codex QA path, fallback-only
  provider mode and export setup are no longer open blockers, and product
  closure remains blocked on external fresh-player comprehension notes plus the
  final product/council decision from those notes.
- `.game-harness/verification-ledger.md` now mirrors that blocker truth: live
  provider integration remains future evidence, not an M1 fallback-only
  blocker; the current product blocker is external fresh-player comprehension
  and the final product/council decision from those notes.
- `.game-harness/continue-here.md` now starts with the same 2026-05-18 resume
  truth: do not reopen typed input, provider/export, or broad role-review work
  unless evidence regresses; use the session kit and tester-safe invite to run
  observed fresh-player sessions.
- `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`
  now uses the neutral pre-play line instead of the stale "Station intake path"
  instruction, and the comprehension guard fails if that stale first-run hint
  returns.
- `.game-harness/tasks.md` and `.game-studio/project-state.md` now stop listing
  manual recorded-statement/free-input decision work as open. Current evidence
  proves HUD typed free-input through Godot/HUD/packaged/Codex QA, while the
  legacy recorded-statement fallback remains internal only.
- `.game-studio/project-state.md` now puts fresh-player sessions, strict note
  review, and the M1/M2 decision ahead of any issue splitting or next example
  environment increment.
- `.game-harness/tasks.md` now moves post-comprehension issue creation and
  prototype-plan splitting behind a dedicated external-comprehension blocker
  section, so the active task list points at fresh-player sessions first.
- `.game-harness/scripts/run-same-order-comprehension-session.sh --status` now
  prints the exact `--recruitment`, `--session-kit-output`, `--verify-session-kit`,
  and live helper commands when raw notes are below the required three sessions.
- generated session kit README now repeats the `--verify-session-kit
  <this-session-kit-dir>` command for moved or edited kits, the live
  observed-session helper command, and the rule that the README, manifest,
  Codex QA artifacts, route reports, and facilitator notes stay away from the
  tester before first play.
- session kit verification now fails if README loses the live observed-session
  handoff, the neutral-pre-play reminder, or the tester-facing boundary.
- successful session kit verification now prints `README live-session handoff:
  pass`, so the generated self-check tells facilitators and AI tools that the
  kit still contains the live observed-session bridge.
- Codex gameplay QA status now includes source freshness against the active
  Godot proof-cell files. Session kit generation fails unless the probe JSON
  and Markdown report are newer than the watched Godot scene/runtime/HUD files,
  and the generated self-check prints `Codex source freshness: pass...`.
- `--verify-session-kit <dir>` now also recomputes freshness for the kit's
  copied `codex-gameplay-probe.json` and `codex-gameplay-report.md` against
  the current watched proof-cell files. If a kit was generated before a
  Godot/HUD/probe source change, re-verification fails instead of trusting the
  old manifest text.
- 2026-05-18 resume readiness recheck kept the scope intentionally narrow:
  reran the Godot Codex gameplay probe and generated/verified a temporary
  session kit. The probe still passes with `stage=inquest`, accepted public
  player actions `5 / 5`, `aiPlayerReportPass=true`, and route reports `4 / 4`;
  the temporary kit verifier printed Codex source freshness pass, current kit
  freshness pass, copied probe cross-check pass, route reports pass, and
  `README live-session handoff: pass`. This is still setup proof only; raw
  session notes remain `0 / 3`.
- 2026-05-18 playable repair-response increment: added the smallest positive
  NPC-to-NPC social reaction. The repair route now proves
  `mark_receipt -> offer_correction -> attach_correction -> accept_repair`;
  final repair state includes `store_queue_mark=settled`,
  `correction_slip=attached`, `queue_repair_accepted`, local trust 45, record
  burden 30, and Station attention 5. The terminal repair copy now says the
  Waiting Customer accepted the correction and let the line continue. Verified
  with latest Godot playable smoke, Codex gameplay probe, backend playability
  report attachment, full backend check, and GDScript syntax check. This is
  internal playable proof only; external fresh-player notes remain `0 / 3`.
- 2026-05-18 playable routine-response increment: added the smallest safe-route
  NPC-to-NPC social reaction. The clean route now proves
  `cite_expected_order -> create_receipt -> accept_routine`; final clean state
  includes `store_queue_mark=settled`, `receipt_tray=normal`,
  `queue_routine_kept`, local trust 57, record burden 0, and Station attention
  0. This keeps Store/Station thin while making the broader social-sim rule
  clearer: another NPC can read a normal record and keep the environment calm.
  Verified with latest Godot playable smoke, Codex gameplay probe, backend
  playability report attachment, full backend check, GDScript syntax check, and
  comprehension gate status. This is internal playable proof only; external
  fresh-player notes remain `0 / 3`.

## Loop State

| Field | Current value |
|---|---|
| Stage | `M1 Protocol Proof` |
| Product verdict | `technical conditional pass; product gate open` |
| Provider mode | `fallback_only_m1` |
| Latest Godot command | `/opt/homebrew/bin/godot-latest` |
| Packaged proof path | `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json` |
| Codex gameplay QA | pass with JSON `aiPlayerReport`, Markdown sidecar, and 4/4 route reports; internal proof only |
| Codex action catalog | bound into status output and generated session kit manifests; internal setup proof only |
| External comprehension | `PENDING_TESTER_NOTES` |

## Allowed Next Work

- Default to a small open-environment game improvement when one is available.
  The preferred
  shape is: name the missing player-facing consequence, implement the smallest
  playable version, run the narrowest real game check, then update state. Do not
  choose more test/helper/document work just because it is easier to automate.
- If `--status` passes, raw notes are still `0 / 3`, and no watched
  Godot/HUD/probe/session-helper source changed, do not rerun Codex probe,
  recreate session kits, or add another setup artifact just to make progress.
  The build is already waiting on an observed fresh-player session.
- Complexity check before starting: if the change adds another internal gate,
  helper mode, manifest field, or review artifact, it is probably the wrong
  next move unless an existing live-session path is failing. The current proof
  surface is enough to try the session.
- If the current playable build has a clear game-design gap, prefer a tiny
  implementation slice over more comprehension infrastructure. Examples:
  clearer NPC-to-NPC handoff feedback, a prop state that changes after a role
  action, a consequence line that makes authority legible, one validated social
  affordance that creates a new playable reaction, or one child-simple economy
  value that changes an NPC choice. Do not choose the gap merely because it is
  a Store/Station detail.
- Improve tester-readiness, facilitator flow, or comprehension-state tracking if
  it directly helps collect honest fresh-player notes.
- Improve the Codex gameplay QA interface when it helps AI agents play the
  current build like a player: action catalog, snapshot clarity, typed input,
  HUD/world/ledger visibility, route result explanation, or artifact readability.
- If a small game slice adds visible state or consequences, keep the AI-play
  interface current in the same pass so Codex can launch, act, inspect, and
  explain the slice from the player point of view.
- Treat a missing AI-play path as a blocker for new player-facing scope, even
  when ordinary test code still passes.
- Make tiny player-facing readability fixes only when they reduce confusion in
  the existing example proof cell or clarify a reusable social-sim pattern.
- Re-run Godot/package/backend checks after any runtime-facing edit.
- Update evidence and this state file after each real change.

## Do Not Do Next

- Do not let testing, AI-play interface work, evidence formatting, or process
  documentation displace a missing playable game improvement.
- Do not expand the Store into a management game, and do not deepen Station
  bureaucracy. Store/Station work is valid only as the smallest disposable way
  to prove a reusable open-environment social pattern.
- Do not add broad society, economy, route, provider, or lore scope before the
  current proof is externally understood.
- Do not count Codex QA, screenshots, proxy packets, or generated worksheets as
  fresh-player comprehension.
- Do not replace play-based AI QA with mock-heavy tests. Test code is allowed
  only when it protects public behavior, deterministic authority, schema
  compatibility, route evidence, provider boundaries, or a known regression.
- Do not add mock-heavy tests or coverage padding.

## Loop Exit Gate

Do not claim the active goal complete until strict external comprehension review
has enough fresh-player notes and the council/product gate accepts them. If the
only remaining work is waiting for human testers, report the blocker plainly and
keep the repo state ready for that session.

## Next Action

If a fresh tester is present, use the minimal path:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Only use the setup bundle when recruiting or handing off to a facilitator:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --status
.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack
.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output <dir>
.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>
```

The verifier checks copied Codex QA artifacts, full action/route binding,
accepted typed-input execution, player-visible HUD/world/ledger/NPC state,
readable Markdown gameplay report content, tester-facing spoiler safety,
broader Station/record/risk/examined-role term leaks with case-insensitive
English matching, and neutral facilitator pre-play wording. A passing kit is
still setup proof only; it cannot close the external comprehension gate.

The Game Studio project-state file now matches this proof state: do not reopen
manual typed input, provider/export decision, or broad role-review blockers
unless new evidence regresses. The active product blocker is still external
fresh-player comprehension.

The verification ledger also matches this: do not treat live provider access as
required for fallback-only M1 closure, but do not claim live provider behavior
until a separate live preflight proves it.

The continuation file also matches this: the next useful action is a real
fresh-player Same Order session, not broader implementation.

The `--status` helper is intentionally concise now. It suppresses the detailed
packaged preflight log on success, prints the live fresh-player session as the
first next action, keeps Codex QA as a setup-readiness summary, and avoids
dumping the full raw-note review table while there are still `0 / 3` notes.
Use `--codex-probe-status` only when the detailed AI-play proof is actually
needed.

The default live helper also suppresses successful packaged-preflight detail
before launch and avoids printing facilitator-only spoiler terms in the
pre-launch reminder. If the packaged app or evidence fails, errors still print;
if it passes, the fresh tester sees only the neutral first-run instruction.
Raw notes written by the default live helper now also bind the session to the
same Codex gameplay QA route summary used by the worksheet and session kit:
clean cover, repair recovery, soft report, and inquest stay visible as setup
context without counting as human comprehension evidence.
After the packaged app closes, the default live helper now prints a short
after-play reminder before raw-note prompts: ask what happened to the tester,
what changed after speech or typed input, and capture the tester's own wording
for examined/evaluated, statement-to-record, and delay-to-record quotes before
explaining the design.
The same live helper now asks those own-word comprehension and direct-quote
prompts before route labels, safe/risky classification, facilitator
intervention, or pass/fail scoring. This keeps the first explanation closer to
the player's actual read of the scene instead of the facilitator's categories.
The manual-session README now mirrors the same low-friction path: run
`.game-harness/scripts/run-same-order-comprehension-session.sh` for each fresh
tester, use `--status` only as a readiness check, and reserve recruitment,
session-kit, worksheet, debrief, and Codex detail modes for optional setup or
handoff. After writing a raw note, the live helper prints only the progress
note count, minimum remaining sessions, review command, and status command; it
does not add another gate. Once raw note count reaches three, it switches the
post-session prompt to strict review and ledger-draft commands so the next
product-gate action is visible immediately.

The standalone `--recruitment` path also self-checks the invite text before it
prints, and the comprehension guard script proves that a leaked tester invite
fails before it is used. Use `--recruitment` when you only need the tester-safe
invite, and use the session kit when a facilitator needs the full setup bundle.
The external comprehension ledger now also tells facilitators to run
`--verify-session-kit <dir>` after generating a session kit.
Generated session kit README files now also name the live observed-session
helper command and repeat the tester-facing boundary after kit verification.
The verifier now checks those README handoff lines so generated setup material
cannot silently drift away from the actual fresh-player run flow.
Its success output now also names `README live-session handoff: pass`, making
that bridge visible in `session-kit-self-check.txt`.
It also prints `Codex source freshness: pass...` and `Codex kit current source
freshness: pass...`; if a gameplay/HUD/probe file is newer than the copied
Codex probe artifacts, regenerate the probe and recreate the human-session kit.

After observed play, review the raw notes with:

```bash
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
```
