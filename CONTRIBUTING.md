# Contributing

## Commit Discipline

- Codex/agent default: after every coherent, verified slice, commit and push
  before starting a different slice. Do not wait for an end-of-session cleanup
  pass.
- A finished slice means code, docs, and evidence are internally consistent and
  the narrow proof check for that slice has run.
- Treat an unpushed finished slice as incomplete agent work unless the user
  explicitly asks to hold it locally.
- Make small, revertable commits. Each commit should have one reason to exist
  and one clear rollback meaning.
- If the next slice would require a different rollback decision, commit and
  push the current slice first.
- Do not hide several unrelated decisions behind a vague commit like
  `update docs` or `misc fixes`. Use a subject that names the actual change,
  so `git revert` remains understandable weeks later.
- Group generated evidence with the code or content that produced it when that
  evidence is required to prove the change. Do not split proof artifacts into a
  later commit unless the proof refresh is the only change.
- Use short imperative subjects:
  - `docs: clarify gameplay goal`
  - `godot: add park notice affordance`
  - `backend: validate social route ledger`
  - `harness: update active goal state`
- Do not mix unrelated runtime code, generated evidence, documentation, and cleanup in the same commit unless they are required to prove the same change.
- Keep WIP out of normal commits. If a broken checkpoint is unavoidable, say so in the subject and push it only when the branch purpose is explicit.
- Put verification in the commit body when it matters:
  - `Check: npm run check --prefix backend/npc-runtime`
  - `Check: /opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/codex_gameplay_probe.gd`
- Do not add broad tests only to make a commit look safer. Use the smallest Detroit-style check that proves player-visible behavior, runtime authority, schema compatibility, or evidence output.

## Agent Workflow

- Inspect `git status --short --branch` before editing, before committing, and
  after pushing.
- Stage explicit paths. Avoid `git add -A` when unrelated local files are present.
- Commit and push each finished slice before starting the next one. If the user
  has asked for active progress, do not wait for another approval before
  committing a clean, verified slice.
- If a task naturally splits into docs, runtime, evidence, and harness state,
  make separate commits when each part can be reverted independently. Keep them
  together only when reverting one without the others would leave the repo
  misleading or broken.
- Before continuing after a long task, check whether a finished slice is still
  local-only. If yes, push it first unless the user explicitly asked to keep it
  unpublished.
- Preserve user edits. If a file contains mixed authorship, read the diff and stage only the relevant hunks when needed.
- Leave generated local caches, editor files, and engine scratch directories untracked unless the repo already treats them as source.

## Push Failure Recovery

- Do not let a verified commit sit locally because push failed once. Treat that
  as an active failure to resolve before taking on new product work.
- First run `git status --short --branch`, `git log --oneline --decorate -5`,
  and `git pull --rebase` so the local/remote relationship is explicit.
- If the remote moved, run `git pull --rebase`, resolve only the relevant
  conflicts, rerun the narrow proof that covers the slice, then push again.
- If hooks, credentials, network, or remote policy block the push, capture the
  exact failing command and error, fix the cause when possible, and retry in the
  same turn.
- Do not squash unrelated finished slices together just because push was
  delayed. Preserve the small revertable commits already made unless history
  repair is explicitly required.
- If a push truly cannot be completed, leave the repo in a clear state: local
  commit present, working tree status reported, failing command recorded, and
  next recovery step identified.
