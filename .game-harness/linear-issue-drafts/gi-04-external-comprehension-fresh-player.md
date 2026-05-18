# GI-04 External Comprehension Fresh-Player Sessions

Status: draft for Linear creation
Date: 2026-05-18
Target Linear team: `Dream-of-one` (`DRE`)
Suggested initial state: `Backlog`
Suggested labels: `codex-managed`, `agent:codex`

## Goal

Run observed fresh-player Same Order sessions and record enough raw notes to
decide whether the current Dream of One proof cell is understandable to people
who have not seen the project internals.

This is the current product/demo gate. Internal Codex probes, smoke tests,
session kits, and evidence artifacts are setup proof only; they do not close
this issue.

## Scope

- Run the current packaged Same Order helper with fresh testers.
- Capture raw notes through the default live helper flow.
- Reach at least `3 / 3` raw manual session notes.
- Run strict note review.
- Copy only accepted quote-reviewed findings into the external comprehension
  ledger.
- Record the resulting M1/M2 go, conditional, or no-go decision separately.

## Do Not

- Do not substitute Codex gameplay QA, generated session kits, screenshots, or
  backend tests for observed player notes.
- Do not explain route labels, safe/risky scoring, Station/inquest concepts, or
  expected conclusions before the tester's first play.
- Do not weaken the strict review helper to pass incomplete notes.
- Do not record machine-specific app paths in tracked docs or scripts.
- Do not launch the observed play session from a headless shell where
  `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
  reports `Human play display: not-ready`.
- Do not claim product/demo readiness while raw notes remain below three or
  strict review remains `PENDING_TESTER_NOTES`.

## Acceptance Criteria

- `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
  reaches setup readiness pass on the facilitator device, including a ready
  `Human play display` line.
- Raw note count is at least `3 / 3`.
- Raw notes use distinct fresh tester labels.
- Strict review no longer returns `PENDING_TESTER_NOTES`.
- Notes include direct tester quotes for the required comprehension questions.
- Accepted findings are copied into
  `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`.
- The final decision explicitly says whether players understood:
  - they are being examined;
  - their speech or hesitation became a record;
  - which object changed;
  - which NPC or authority role acted;
  - why the Station did or did not cite a Store record.

## Verification

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --status
.game-harness/scripts/run-same-order-comprehension-session.sh
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
```

Optional facilitator setup only:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --recruitment
.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output <dir>
.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>
```

## Handoff Artifacts

- `.game-harness/continue-here.md`
- `.game-harness/goal-loop-state.md`
- `.game-harness/goal-completion-audit-2026-05-18.md`
- `.game-harness/comprehension/manual-sessions/README.md`
- `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`
- `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`
- `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.md`

## Linear Creation Note

As of 2026-05-18, the available Linear MCP in this session had search,
update, and comment tools but no issue-create tool, and `LINEAR_API_TOKEN` was
unset for GraphQL fallback. Create this in Linear from a session with issue
creation permission, then link the created issue in the goal loop state.

Rechecked on 2026-05-18 after the Ubuntu ARM display-readiness helper change:
the searchable Linear tools still expose search/update/project/label helpers,
but no issue-create mutation.

Rechecked again on 2026-05-18 with broader open-issue searches for
`Dream of One comprehension fresh player Same Order GI-04 tester notes
PENDING_TESTER_NOTES`, `Same Order`, and `fresh player comprehension tester
notes`; no open matching issue was found. Recent Linear tickets confirm the
repo team is `Dream-of-one` with key `DRE`. Create this as a new DRE issue from
a session with issue-create permission; do not hardcode the future identifier
before Linear assigns it.

Label/state lookup:

- `codex-managed` label exists in DRE.
- `agent:codex` label exists in DRE.
- `needs:godot-local` was not found in DRE during lookup; do not invent it.
- Workflow states include `Backlog`, `Todo`, `In Progress`, `In Review`,
  `Done`, `Duplicate`, and `Canceled`.
