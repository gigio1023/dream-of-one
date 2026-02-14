# Repo agent notes (Codex)

## Operating model (single source of truth)

- **Work SoT:** Linear issues. Do not use Markdown TODO lists as a task system.
- **Execution graph:** Beads (`bd`) is an internal dependency/work decomposition tool for Codex CLI (may create epics/tasks/deps), but it is **not** mirrored to Linear.
- **Default workflow (strict):** Unless a task explicitly says otherwise, always pull **one Linear issue at a time** and work it to completion before moving on.
- **Beads usage (strict):** Regardless of the Linear issue granularity, you must record **detailed, atomic work items** in Beads and define dependencies between them (e.g., “boil water” → “cook pasta” → “mix sauce”). Beads is a local graph for fine‑grained planning and must be populated for every task.
- **Beads storage:** `.beads/` should be tracked in git; do not hand-edit its files. Use the `bd` CLI. Local runtime artifacts are ignored by `.beads/.gitignore`.
- **Writer:** Codex CLI only. The user gives natural-language instructions and reviews PRs.
- **Codex Cloud:** Optional “worker” triggered from Linear (`@Codex`) for cloud-safe tasks (no Unity MCP / no serialized Unity assets).

## Collaboration mode (aggressive agent swarm)

- **Default to swarm**: If a task is non-trivial or spans multiple files/systems, spawn sub-agents immediately.
- **Use explorers first**: For codebase questions, always spawn an `explorer` agent to locate relevant code and report back.
- **Parallelize**: Use multiple agents to split work (docs vs code vs tests), then integrate results.
- **Clear ownership**: When using `worker` agents, assign explicit file/area ownership and avoid overlapping edits.
- **Fast feedback**: Ask sub-agents to return summaries + file paths, not long prose.
- **Tooling**: Use `multi_tool_use.parallel` for independent tool calls; prefer batch operations when possible.

## Auto PR workflow (no human gating)

- **Default**: open PR → request Codex review → run checks → auto-merge via GitHub MCP → update Linear → continue.
- **No gh CLI**: use GitHub MCP only.
- **Decision ledger required**: track each bot comment with `decision/action/commit/status`.
- **Merge condition**:
  - if `status.total_count > 0`, require checks green (`state=success`)
  - if `status.total_count == 0`, treat checks gate as pass (no required checks configured)
  - unresolved actionable bot findings block merge

## Skills (mandatory)

- **Use skills aggressively**: If a request matches any skill trigger, apply that skill for the current turn.
- **Explicit callout**: State which skill(s) you are using and why.
- **Progressive disclosure**: Open only the skill files you need; do not bulk-load.
- **Repo skills to prefer**:
  - `auto-pr-merge` (automatic PR lifecycle + merge)
  - `swarm-execution` (aggressive parallelization)

## Terminology discipline (mandatory)

- Canonical vocabulary in `terminology.md` is mandatory for all new docs, issue bodies, PR text, and user-facing runtime strings.
- Use the exact canonical term first; do not invent local aliases when `terminology.md` already defines one.
- For first mention in Korean text, use `English term (Korean meaning)` where clarity helps.
- Keep internal identifiers unchanged (for example `PROC_RC_SKIP`, `threadId`), but prefer canonical wording in human-readable messages.
- Do not use informal `contract` wording for technical API/data semantics; use `Specification` or `Schema`.

## Session loop (Codex must follow)

1. Pick a Linear issue to work on (or create one first).
2. Classify it:
   - **Local (Unity MCP)**: needs Unity Editor/MCP.
   - **Local (non-Unity)**: can be done locally without Unity.
   - **Cloud (Codex Cloud)**: cloud-safe; delegate via Linear `@Codex`.
3. Execute:
   - Local: optionally create a Beads epic + tasks for dependency tracking; implement + verify locally; update Linear status/comments.
   - Cloud: ensure it’s cloud-safe + labeled, then delegate; review PR locally when ready.
4. Close the Linear issue when merged/validated; optionally compact/close the internal Beads graph.

Discovered work during implementation:
- Create a follow-up Linear issue (or add a checklist to the current Linear issue if truly trivial).
- If local execution needs structure, create internal Beads tasks and link deps.

## Beads description formatting (important)

- For multi-line descriptions, **do not** write literal `\n` sequences (they will show up as `\n` in `bd show` and leak into any copied text).
- Prefer `--body-file -` (stdin) with a heredoc so the issue body contains real newlines:
  - `bd create "..." --type task --labels "agent:codex" --body-file - <<'EOF'`
  - `...`
  - `EOF`
- If `bd show <id>` displays `\n`, normalize the Beads description first (Beads hygiene).

## Linear description formatting (important)

- When creating/updating Linear issues via MCP, write **real newlines** in `description`/comments.
- Never paste literal `\\n` sequences into Linear descriptions; they will show up as `\n` in the UI.
- If the source text contains literal `\\n`, normalize it before writing to Linear.

## Linear labels (recommended)

- `agent:codex` (Codex CLI local execution)
- `agent:codex-cloud` (delegate to Codex Cloud via Linear; MUST be cloud-safe)
- `agent:human` (high ambiguity / needs human decision)
- `needs:unity-mcp` (Unity Editor + MCP required; do not delegate to cloud)
- `codex-managed` (optional; issues created/maintained by Codex workflows)

## Codex Cloud delegation (via Linear)

Use Codex Cloud only for issues that:
- are **cloud-safe** (no Unity Editor/MCP required, and no serialized Unity assets),
- have Linear label `agent:codex-cloud`,
- and do **not** have `needs:unity-mcp`.

Delegation protocol:
1. Ensure the Linear issue description is high-signal: goal, AC, scope, do-not, verification.
2. Trigger Codex in Linear by assigning the issue to Codex or mentioning `@Codex` in a comment (include repo + any constraints).
3. When Codex posts a PR, review locally and run the appropriate verification.
4. Close the Linear issue after merge/verification (leave PR link in the issue).

## Game design rails (Lucid Cover Social Stealth v1)

- **Player is not an investigator**: NPCs/Station investigate the player; player performs cover work to avoid exposure.
- **LLM-first NPC society**: most NPC actions are proposed by LLM agents from role/memory/org context.
- **Deterministic safety/adjudication**: runtime validation, fallback, and end-state gates remain rule-driven.
- **Text is the danger surface**: Dream Laws are revealed via text surfaces and Cover Tests, not meta exposition.
- **SoT docs**: `project.md`, `docs/design/game-design.md`, `docs/design/dream-laws.md`, `docs/design/cover-tests.md`.

## Unity authoring / verification

- Unity project root: `draem-of-one/` (all `Assets/...` paths are relative to this folder).
- Scene authority: `Assets/Scenes/Prototype.unity`.
- Rendering: URP via `Assets/Settings/UniversalRP.asset` → `Assets/Settings/UniversalRenderer.asset`.
- Runtime helpers: `RuntimeNavMeshBaker` builds NavMesh on play; `UILayouter` arranges HUD at runtime.
- TMP resources: ensure TextMesh Pro essential resources exist under `Assets/TextMesh Pro`.

Unity MCP-first:
- Prefer Editor-driven changes via Unity MCP (menus / AssetDatabase) and save assets/scenes.
- If MCP is unavailable/not connected, stop and ask the user to (re)open Unity + connect MCP.
- Avoid hand-editing `.asset`/`.meta`/`.unity`/`.prefab` unless explicitly approved.
- Do not use background waits like `sleep` to simulate playtime; focus on direct implementation steps only.

Unity MCP mutex (single editor session):
- Treat `needs:unity-mcp` work as WIP=1.
- If using internal Beads tasks, acquire `lock:unity-mcp` on the active Beads issue before Unity work; release after diagnostics and a clean console.

Verification mandate:
- After Unity code/scene changes, run `Tools/DreamOfOne/Run Diagnostics` via Unity MCP until the console is clean.
- If MCP is unavailable, document what checks are blocked and what would be run.

## Local LLM QA (NPC dialogue sanity)

- Use Ollama local endpoint for NPC dialogue checks when requested.
- Recommended model: `qwen3:4b-instruct`.
- LLMClient config (scene):
  - Provider `LocalEndpoint`, `llmEnabled=true`.
  - LocalEndpointMode:
    - `UtteranceProxy` (default): endpoint `http://localhost:11434/utterance`
    - `OpenAIChatCompletions`: endpoint `http://localhost:11434/v1/chat/completions`
  - LocalModel enum: `Qwen3_4B_Instruct`.
- If timeouts occur, keep `timeoutSeconds >= 8` for local runs.
- Quick trigger: `Tools > DreamOfOne > LucidCover > Debug > Simulate First TextSurface (SA_BREAK)` and confirm `NpcUtterance` in WEL.

## GitHub / git

- Use GitHub MCP (personal account) or local git CLI for GitHub actions (branches/commits/pushes/PRs).
- Do not use the local `gh` CLI (company auth).
- Commits: prefer verbose bodies (what/why/paths/tests/side effects/TODOs).
- Branch/PR naming: prefer including the Linear issue ID (e.g., `DOO-123-short-slug`).

## Docs

- Developer guide: `docs/dev.md`
- Codex runbook: `docs/agent/runbook.md`
- Project definition (SoT): `project.md`
- Execution sequencing (SoT): Linear issues (governed by `project.md`)
- Game design bible: `docs/design/game-design.md`
- Dream laws library (SoT): `docs/design/dream-laws.md`
- Cover tests library (SoT): `docs/design/cover-tests.md`

## Mermaid validation (mandatory)

- Any change that adds or edits Mermaid diagrams in docs must be render-validated with Mermaid CLI before completion.
- Minimum command pattern: `npx -y @mermaid-js/mermaid-cli -i <diagram>.mmd -o <diagram>.svg`
- If rendering fails, do not mark the task done until diagram syntax is fixed and render succeeds.
