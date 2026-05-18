# Repo Agent Notes

## Operating Model

- Work SoT: Linear issues.
- Writer: Codex CLI.
- Default execution: work one Linear issue to completion before moving to the next.
- Commit cadence: follow `CONTRIBUTING.md`. For Codex work, finish one coherent
  slice, run the narrow proof for that slice, commit it, and push before moving
  to a different slice.
- Push failures are blocking work, not background cleanup. If a verified commit
  cannot push, diagnose, pull/rebase if needed, rerun the narrow proof, and
  retry before starting another slice.
- Game-first priority: the highest-value work is improving the actual Dream of
  One game design and implementation. Tests, Evidence, AI-play probes, session
  kits, and harness scripts exist to support that work; they are not the game.
- If a design or implementation gap is found, first ask what smallest playable
  result would make the intended game more real in the running build. Prefer
  implementing that small result and proving it over adding more process,
  review scaffolding, or helper automation.
- Do not spend a slice on tests, reports, budget tooling, helper modes, or
  evidence plumbing unless a concrete playable change or broken live-session
  path requires it. When there is no such requirement, stop at the current
  ready gate and run/playtest the game.

## Game Studio Overlay

- Documentation entry point lives in `docs/README.md`.
- Project-local Game Studio guidance lives in `.game-studio/`.
- Current Game Studio routing and state live in `.game-studio/project-state.md`.
- Framework review and proof gates live in `docs/framework/`.
- Game Studio usage rules live in `docs/framework/game-studio-usage.md`.
- Project-local Game Studio skills live under `.codex/skills/game-*` and `.codex/skills/narrative-director/`.
- Use `.codex/skills/game-long-run-control` when resuming a long Codex goal,
  when work starts drifting into support artifacts, or when a multi-slice run
  needs Ralph-like progress discipline.
- GPT review policy lives in `docs/framework/gpt-code-review.md`; meaningful reviews use GPT-5.5 high/xhigh lanes and Game Studio proof gates.
- `.game-harness/` remains the current M1 execution harness; do not replace or migrate it without an explicit decision.
- Long-running Codex goal work uses `.game-harness/goal-loop-state.md` as the
  compact resume checkpoint. Borrow Ralph-style persistence only as a discipline:
  prompt, task list, state, proof, and exit gate. Do not add a separate `.ralph/`
  system unless explicitly requested.
- On resume, read `.game-harness/active-goal-prompt.md`,
  `.game-harness/playable-goal-reference.md`,
  `.game-harness/goal-loop-state.md`, `.game-harness/continue-here.md`,
  `.game-harness/tasks.md`, `.game-harness/verification-ledger.md`, and
  `.game-studio/project-state.md`, and `AGENTS.md` before changing code.

## Path Portability

- This repo is worked on across multiple devices. Do not add machine-specific
  absolute paths, home-directory paths, or repo-external relative paths to
  active instructions, scripts, docs, or commands unless the path is the
  artifact being recorded as historical evidence.
- Prefer repo-local paths relative to the repository root.
- For external local tools or sibling repos, use explicit environment variables
  such as `GAME_STUDIO_ROOT`, `GODOT_BIN`, or `GODOT_BEST_PRACTICE_SKILL`.
  If an environment variable is not set, ask the user or record the local
  blocker instead of guessing `/Users/...`, `/home/...`, `~/git/...`, or
  `../game-studio`.
- Historical evidence ledgers may mention the path that was used on a specific
  machine. Do not copy those paths into new instructions or treat them as
  portable commands.

## Environment Awareness

- Before environment-sensitive work, identify the active OS, CPU architecture,
  shell, display availability, Godot CLI, Node/npm availability, and required
  environment variables. Record blockers instead of assuming a desktop,
  macOS `.app`, x86_64 binary, or GUI display exists.
- Current local setup may be a headless Ubuntu ARM/aarch64 server. On such
  devices, Godot headless checks and PCK route proofs can pass while observed
  human play still needs a GUI/display path such as VNC, X11 forwarding, a
  desktop session, or another tester device.
- Keep per-device launchers, exported PCKs, local route evidence, and auth/env
  settings in ignored repo-local `build/` files or explicit environment
  variables. Do not copy their absolute paths into tracked active instructions.
- Codex CLI login is useful for agent/developer workflows. The default
  live-LLM runtime target is a direct `openai-codex` proposal provider with explicit
  auth/profile setup, not `codex exec` and not a hidden `OPENAI_API_KEY`
  replacement. Use `gpt-5.4-mini` with low reasoning effort as the only
  configured OpenAI Codex model until live Codex-provider discovery proves a
  cheaper Codex-supported model. Do not assume API `nano` models are available
  through the Codex provider.

## Godot Runtime

- Active engine root: `godot/`
- Preferred Godot command: set `GODOT_BIN` to the local latest Godot CLI for
  the current machine. The latest published proof used
  `4.7.beta2.official.777579205` as of 2026-05-17, but do not hardcode another
  device's absolute CLI path into new docs or scripts.
- Main scene: `godot/scenes/main.tscn`
- Runtime data: `godot/data/world_layout.json`
- Godot checks:
  - `$GODOT_BIN --headless --import --path godot`
  - `$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd`
  - `$GODOT_BIN --headless --path godot --script res://tools/evidence_run.gd`
  - `$GODOT_BIN --headless --path godot --script res://tools/runtime_slice_smoke.gd`
  - `$GODOT_BIN --headless --path godot --script res://tools/codex_gameplay_probe.gd`

## Backend Runtime

- Backend root: `backend/npc-runtime/`
- Runtime Schema: `backend/npc-runtime/src/godot/runtime-schema.ts`
- Required check: `npm run check --prefix backend/npc-runtime`
- Backend owns deterministic validation, fallback selection, scheduling, and Evidence semantics.

## Test Policy

- Tests are subordinate to playable game progress. Use them to protect the
  smallest implemented game consequence, not to substitute for implementing
  the consequence.
- A test-only change is exceptional. Before adding one, name the player-facing
  behavior, deterministic authority boundary, provider boundary, or known
  regression it protects. If that sentence cannot name a real game consequence,
  do not add the test.
- Keep tests Detroit-style: exercise the public behavior boundary and the player/game consequence, not private implementation steps.
- Prefer a small number of high-signal integration or smoke checks over broad test matrices.
- Do not add mocks just to make tests pass. Use fakes only at real external boundaries such as network, filesystem, time, process, or engine availability.
- Do not assert every internal helper, intermediate field, or branch unless that value is part of the runtime contract or Evidence proof.
- For game work, a test is justified when it protects deterministic authority, schema compatibility, route evidence, player-visible consequence, provider boundary, or a known regression.
- Do not spend time padding coverage with tests that only restate implementation details.
- Prefer game-running probes over test padding when the question is whether Codex can understand, play, inspect, and explain the current build.
- Do not grow tests around convenience scripts, accounting reports, manifest
  formatting, or helper output merely because they are easy to verify. For
  those, a single command run and ledger note is usually enough unless the
  behavior gates live provider spend, deterministic authority, or a player-
  visible release claim.

## Design Rails

- Dream of One is an open-environment NPC social simulation. The core target is
  a believable social field that NPCs can act inside; the player enters that
  field and becomes examined by it through conversation, hesitation, repair, and
  records.
- When priorities conflict, choose the work that makes the intended game more
  playable, legible, or socially reactive in the current build. Do not let
  testing strategy, AI-agent interface work, or documentation polish displace a
  missing playable mechanic, readable consequence, or role action.
- Store/Station is only an ultra-small sample cell, not the purpose of the
  game. Keep it thin, replaceable, and almost throwaway. Do not overfit design,
  code, tasks, or proof language to "the Store game"; use it only when it is
  the cheapest way to prove reusable NPC-to-NPC social action, record creation,
  and player consequences.
- Default future choices should start from the open-environment social-sim
  question, not from Store/Station scope: what tiny role affordance, prop,
  record, gossip, warning, refusal, repair, help, obstruction, or toy economy
  value makes NPCs act more believably around the player?
- Favor agile playable slices over waterfall planning. Add the smallest
  environment rule, prop, economy pressure, or NPC affordance that makes the
  social simulation more real, then prove it in the running build before adding
  broader scope.
- Add economy only as a tiny playable loop first. It may be deliberately crude:
  a few points, tokens, trust, burden, attention, favors, queue delay, or a
  single shared counter are enough if one NPC decision visibly changes. Use it
  to show who owes, who trusts, who is burdened by a record, who reports, who
  helps, or who gains authority to act. Avoid broad abstract economy systems
  until a small NPC interaction needs them and the current loop is proven.
- Treat common game-economy terms as a checklist, not scope permission:
  source/tap, pool, sink/drain, converter, gate, and measurement must map to
  one visible interaction in the current example environment before
  implementation.
- Use one economy hypothesis per increment: one record changes, one role chooses
  a different validated action, and the player can explain who now has work or
  authority. Stop after the first playable proof, then run the checks and update
  Evidence before adding another value.
- External economy references are guardrails, not backlog. Translate
  source/sink, colony-sim, city-builder, operation-sim, and live-economy
  examples into one tiny current-environment loop before changing code.
- Do not design a detailed pressure model before there is a playable reason
  for it. Add one economy value only when it changes one visible role decision
  in the current build. Prefer the next smallest repair, report, gossip,
  refusal, warning, help, obstruction, or citation loop over prices, inventory,
  wages, rent, taxes, Store expansion, Station bureaucracy, or multi-shop
  systems.
- NPCs should use environment affordances and shared records before bespoke
  branches. Prefer role-scoped actions such as notice, cite, mark, trade,
  warn, report, repair, refuse, or gossip over hard-coded reactions to every
  player line.
- Maintain a Codex gameplay QA interface for the active proof cell. Codex
  should be able to run the Godot scene, apply bounded player actions, inspect
  HUD/environment/ledger/NPC action state, and write a readable artifact before
  asking a human to judge the build. In Godot, prefer
  `PlayableSession.debug_codex_gameplay_action`,
  `debug_codex_gameplay_snapshot`, and the action catalog over direct calls to
  private scene methods.
- Treat that Codex gameplay QA interface as a first-class development target for
  an AI-built game, but keep it subordinate to game progress. When deciding
  between another probe/helper and a missing playable game improvement, build
  the smallest playable improvement first, then expose just enough action and
  snapshot data for Codex to verify it.
- When adding player-facing state, dialogue, props, consequences, or routes,
  expose enough of it through the action catalog/snapshot/report path for Codex
  to play the slice, inspect the same facts a player sees, and explain the
  result without reading private scene methods.
- A playable increment is not ready for review if Codex cannot launch or probe
  the current proof cell, list callable player actions, take bounded actions,
  inspect the resulting HUD/world/ledger/NPC state, and produce a readable
  player-perspective artifact. Fix that interface before expanding scope.
- Player is not an investigator.
- NPCs, local institutions, and authority systems investigate the player.
- Text is where the danger starts.
- Dream Law, Cover Test, Exposure, formal intake, inquest, verdict, and session
  termination remain deterministic product authority.

## Previous Runtime Policy

- Previous engine/runtime stacks are not active Runtime Paths.
- Do not add old engine/runtime docs, tools, or archive paths back to the active tree.
- If a task needs historical behavior, recover it from git history instead of adding archive files back to the active tree.

## Mermaid Validation

Any change that adds or edits Mermaid diagrams in docs must be render-validated with Mermaid CLI:

```bash
npx -y @mermaid-js/mermaid-cli -i <diagram>.mmd -o <diagram>.svg
```
