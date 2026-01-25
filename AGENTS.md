# Repo agent notes (Codex)

## Operating model (single source of truth)

- **Work SoT:** Linear issues. Do not use Markdown TODO lists as a task system.
- **Execution graph:** Beads (`bd`) is an internal dependency/work decomposition tool for Codex CLI (may create epics/tasks/deps), but it is **not** mirrored to Linear.
- **Default workflow (strict):** Unless a task explicitly says otherwise, always pull **one Linear issue at a time** and work it to completion before moving on.
- **Beads usage (strict):** Regardless of the Linear issue granularity, you must record **detailed, atomic work items** in Beads and define dependencies between them (e.g., “boil water” → “cook pasta” → “mix sauce”). Beads is a local graph for fine‑grained planning and must be populated for every task.
- **Beads storage:** `.beads/` should be tracked in git; do not hand-edit its files. Use the `bd` CLI. Local runtime artifacts are ignored by `.beads/.gitignore`.
- **Writer:** Codex CLI only. The user gives natural-language instructions and reviews PRs.
- **Codex Cloud:** Optional “worker” triggered from Linear (`@Codex`) for cloud-safe tasks (no Unity MCP / no serialized Unity assets).

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

## GitHub / git

- Use GitHub MCP (personal account) or local git CLI for GitHub actions (branches/commits/pushes/PRs).
- Do not use the local `gh` CLI (company auth).
- Commits: prefer verbose bodies (what/why/paths/tests/side effects/TODOs).
- Branch/PR naming: prefer including the Linear issue ID (e.g., `DOO-123-short-slug`).

## Docs

- Developer guide: `docs/dev.md`
- Codex runbook: `docs/agent/runbook.md`
- Project definition: `project.md`
