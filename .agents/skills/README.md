# Repo Agent Skills

Canonical repo-specific skills live here, one directory per skill, portable
across agent harnesses.

## Harness exposure

- Codex discovers `.agents/skills/` natively.
- Claude Code reads the same files through the tracked relative symlink
  `.claude/skills` → `../.agents/skills`.
- Other harnesses can read the `SKILL.md` files directly.

Keep the symlink relative; never replace it with a copy. On Windows,
checkouts with `core.symlinks=false` materialize it as a plain file —
enable symlinks (Developer Mode + `git config core.symlinks true`) or read
`.agents/skills/` directly.

## Rules

- `docs/` stays the single source of truth. Skills route to docs and encode
  task-time procedure and authority boundaries; they must not fork facts
  from docs. When a doc changes semantics, check whether a skill's routing
  or contract summary went stale.
- Shared frontmatter is `name` and `description` only. No harness-specific
  metadata, built-in tool names, or invocation syntax in skill bodies.
- Generic craft (game direction, production, review, Godot engine
  technique) belongs to user-level skills, not this tree. Add a repo skill
  only for a contract specific to this repository.

## Current set

| Skill | Covers |
|---|---|
| `dream-npc-runtime` | Backend runtime: run/session state, social scheduler, judgment-vs-validity authority, provider boundary, checks |
| `dream-godot-client` | Godot client: first-person town, presentation boundary, modal pause, information policy, assets, smokes |
| `dream-content-authoring` | Korean-first content: canon reuse, tone, storylet contract, localization |
