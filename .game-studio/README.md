# Game Studio

Dream of One uses this directory as a project-local Game Studio guidance overlay.

- `core/` contains copied Game Studio roles, rubrics, gates, schemas, workflows, and templates.
- `project-state.md` records the current routing, profiles, stage, API migration decision, and proof blockers.
- `milestones/` and `council/` are reserved for Game Studio summaries only after the human chooses to mirror or migrate current harness state.
- `.codex/skills/game-*` and `.codex/skills/narrative-director/` contain
  project-local Codex skills copied from a Game Studio source repo during
  setup.
- `.codex/skills/game-long-run-control` is the active Game Studio route for
  long autonomous work, support-work drift control, and honest resume labels.
- `core/templates/execution/long-run-loop-state.md` is available when a future
  loop needs a fresh compact state file. The current M1 loop still uses
  `.game-harness/goal-loop-state.md`.
- `docs/framework/game-studio-usage.md` defines how to apply those skills in
  this repository.

`.game-harness/` remains the active execution harness for current M1 work.

Do not assume the Game Studio source repo lives at a particular sibling or home
path. When checking the source framework, set `GAME_STUDIO_ROOT` explicitly for
the current device.
