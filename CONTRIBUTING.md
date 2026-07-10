# Contributing

## Commit Discipline

- Agent default: after every coherent, verified slice, commit and push before
  starting a different slice. Do not wait for an end-of-session cleanup pass.
- A finished slice means code and docs are internally consistent and the
  narrow proof check for that slice has run.
- Make small, revertable commits. Each commit should have one reason to exist
  and one clear rollback meaning.
- Do not hide several unrelated decisions behind a vague commit like
  `update docs` or `misc fixes`.
- Use short imperative subjects:
  - `docs: clarify gameplay goal`
  - `godot: add park notice affordance`
  - `backend: validate social route ledger`
- Put verification in the commit body when it matters:
  - `Check: bun run --cwd backend/npc-runtime check`
  - `Check: $GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd`
- Do not add broad tests only to make a commit look safer. Use the smallest
  Detroit-style check that proves player-visible behavior, runtime authority,
  or schema compatibility.

## Agent Workflow

- Inspect `git status --short --branch` before editing, before committing, and
  after pushing.
- Stage explicit paths. Avoid `git add -A` when unrelated local files are
  present.
- Preserve user edits. If a file contains mixed authorship, read the diff and
  stage only the relevant hunks.
- Leave generated caches, editor files, and engine scratch directories
  untracked.

## Push Failure Recovery

- Do not let a verified commit sit locally because push failed once.
- Run `git status --short --branch`, `git log --oneline -5`, and
  `git pull --rebase`; resolve only the relevant conflicts, rerun the narrow
  proof, push again.
- If a push truly cannot complete, leave the repo in a clear state: local
  commit present, failing command recorded, next recovery step identified.
