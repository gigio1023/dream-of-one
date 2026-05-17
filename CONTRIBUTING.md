# Contributing

## Commit Discipline

- Make small, revertable commits. A commit should have one reason to exist and one clear rollback meaning.
- Prefer committing after each coherent slice passes its narrow proof check, then push the branch while the context is still fresh.
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
- Commit and push each finished slice before starting the next one.
- Preserve user edits. If a file contains mixed authorship, read the diff and stage only the relevant hunks when needed.
- Leave generated local caches, editor files, and engine scratch directories untracked unless the repo already treats them as source.
