# Contributing

## Commit Discipline

- Make small, revertable commits. A commit should have one reason to exist and one clear rollback meaning.
- Prefer committing after each coherent slice passes its narrow proof check, then push the branch while the context is still fresh.
- In this repo, Codex should treat commit-and-push as the default end of each
  completed work slice, not as a final cleanup step. If the work is coherent,
  verified, and useful to revert as one unit, commit it and push it before
  moving on.
- For Codex/agent work, the default is to commit and push every finished slice
  before starting a different slice. Do not save several unrelated improvements
  for one large end-of-session commit.
- A finished slice means code/docs/evidence are internally consistent and the
  narrow proof check for that slice has run. At that point, inspect status,
  stage explicit paths, commit, and push without waiting for another reminder.
- Treat an unpushed finished slice as incomplete agent work unless the user
  explicitly asks to hold it locally.
- If commit or push fails, diagnose and retry immediately instead of carrying
  the verified slice forward as local-only work.
- If the next slice would require a different rollback decision, push the
  current slice first. A later revert should be able to remove one coherent
  behavior change, one documentation-only adjustment, or one proof refresh.
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

- Inspect `git status --short --branch` before and after each slice.
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
