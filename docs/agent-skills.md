# Agent Skills (this repo)

This repo keeps reusable agent workflows as **Skills**. Skills are small, filesystem-based “onboarding packets” that help an agent perform repeated work consistently (e.g., Linear issue hygiene, Beads execution graphs, Unity MCP operations).

## Where Skills live

- Repo-local skills live under `.codex/skills/<skill-name>/SKILL.md`.
- A Skill’s YAML frontmatter (`name`, `description`) drives discovery/triggering.

## Repo conventions

- **Frontmatter**: `name` + `description` only.
- **Triggering**: Put “when to use” cues in `description` (the body is loaded only after trigger).
- **YAML safety**: If the `description` contains `:` (colon) or other punctuation, prefer quoting it or using a folded block (`description: >`) to avoid YAML parse errors.
- **Prefer MCP when available**: Use MCP for systems that support it (e.g., Linear, Unity). Beads is a local CLI (`bd`), so CLI usage is expected.
- **Progressive disclosure**: Keep `SKILL.md` short; move bulky details into `references/` and deterministic helpers into `scripts/`.

## Linear (SoT + Codex Cloud dispatch) skills

Linear issues are the single source of truth for work items and status. Linear is also the surface used to delegate cloud-safe tasks to Codex Cloud (`@Codex`).

- `dreamofone-linear-issue`: High-signal issue template (goal/AC/scope/do-not/verification + routing labels).
- `linear-mcp`: Linear MCP operations: create/update issues, set status, add PR links, label-based routing, and optional GraphQL fallback.

## Beads (execution graph) skills

Beads (`bd`) is used internally by Codex CLI (and Claude Code) as an execution graph (epic/tasks/dependencies) to keep local WIP stable across sessions.

- Beads is **not** the work system of record in this repo (Linear is).
- Beads does **not** map 1:1 to Linear issues, and there is no automatic sync between them.
- `.beads/` should be tracked in git; local runtime artifacts are ignored by `.beads/.gitignore`.

- `beads-workflow`: Local workflow (`bd prime` → create tasks/deps → work → close), compaction-safe notes.
- `beads-scope-split`: Break down large work into an Epic + Tasks with dependencies.
- `beads-worktree`: Use `bd worktree` for safe local parallelism (shared `.beads` DB).

### Linear auth/config (fallback)

The MCP tool integration is environment-specific. If MCP is unavailable, `linear-mcp` supports a GraphQL fallback using:

- `LINEAR_API_TOKEN` (preferred) or `LINEAR_TOKEN` / `LINEAR_API_KEY`

## Unity skills

Unity workflows (MCP-first) live under:
- `.codex/skills/unity-*`
- `.codex/skills/urp-material-fixer`
- `.codex/skills/tmp-font-stability`

## Adding a new skill

1. Create a new folder under `.codex/skills/<skill-name>/`.
2. Add `SKILL.md` with:
   - YAML frontmatter (`name`, `description`)
   - concise, imperative workflow guidance
3. Add optional `scripts/` and `references/` only if they will be used repeatedly.

Validation:
- Run `scripts/skills/validate_skills.py` to catch frontmatter mistakes early.
