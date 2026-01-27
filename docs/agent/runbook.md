# Codex Runbook (Linear SoT + Beads Execution + Codex Cloud)

Revision date: 2026-01-24

This document defines the operating runbook for **Codex CLI**.  
The goal is to ensure: users provide only natural-language instructions; Codex CLI organizes and tracks Linear issues; implementations are done locally (with Beads when needed); and cloud-safe work is delegated to Codex Cloud via Linear.

---

## 0) Goals / Non-goals

### Goals

1. Convert natural-language requests into Linear issues (with AC/scope/do-not/verification).
2. When local implementation is required, create a Beads execution graph (epic/task/dep). (Optional)
3. Manage progress via Linear status/comments and attach PR links.
4. Delegate Unity MCP–ineligible cloud work to Codex Cloud via Linear. (Optional)

### Non-goals

- Do not keep a 1:1 “mirror” between Beads and Linear.
- Do not treat external servers/schedulers as the primary control plane (repo scripts/hooks are allowed as internal tools).

---

## 1) Invariants

- **Single Source of Truth (SoT)**: Linear issues (agreement unit across humans/agents)
- **Beads role**: internal execution graph for local implementation; never mirrored to Linear
- **Writer**: Codex CLI only (users provide natural-language instructions + PR review/merge)
- **Codex Cloud**: delegate only cloud-safe work (no Unity MCP/serialized assets)

---

## 2) One-time setup (human)

### 2.1 Beads initialization

If `.beads/` already exists (usually from git), do not touch it.  
If not, run once from repo root:

```bash
bd init
```

### 2.2 Codex CLI ↔ Linear MCP

This can vary by environment; use the safest routine:

1. Enable `rmcp_client = true` in `~/.codex/config.toml`
2. Add the MCP server:

```bash
codex mcp add linear --url https://mcp.linear.app/mcp
```

3. Log in if needed:

```bash
codex mcp login linear
```

---

## 3) Session start (bootstrap)

1. Select the issue to work on today in Linear (or create one).
   - Recommended labels:
     - `agent:codex` (local Codex CLI)
     - `agent:codex-cloud` (delegate to Codex Cloud)
     - `needs:unity-mcp` (Unity work required)

2. (Optional) For local work, load Beads context:

```bash
bd prime
```

---

## 4) Issue definition (agree in Linear)

A Linear issue must include, at minimum (mandatory for Codex Cloud delegation):

- Goal (what/why)
- Acceptance Criteria (definition of done)
- Scope / Paths
- Do-Not (Unity serialized assets, scene structure, etc.)
- Verification (commands/checks to pass)

---

## 5) Codex Cloud delegation (Linear @Codex, optional)

Delegate only work that cannot use Unity MCP.

Recommended “cloud-safe” criteria:

- No Unity Editor/MCP required (no `needs:unity-mcp`)
- No edits to `.unity/.prefab/.asset/.meta` serialized assets
- Build/verification not dependent on Unity Editor (docs/scripts/pure code)

Recommended Linear labels:

- `agent:codex-cloud`
- (if needed) `agent:human`

Operations:

1. Finalize issue description (AC/scope/do-not/verification).
2. Assign the issue to Codex or mention `@Codex` in a Linear comment (include repo/branch rules if needed).
3. When Codex creates a PR, review/verify locally and merge.
4. Close the Linear issue (keep PR link).

---

## 6) Local execution (when using Beads graph)

### 6.1 When to use Beads

- Implementation takes more than ~2 minutes and needs dependencies/ordering/WIP tracking.
- Unity MCP mutex requires WIP=1.
- Refactor/splitting/testing tasks with clear steps.

### 6.2 Minimal command pattern (examples)

```bash
# create epic (internal container)
bd create "EPIC: <feature>" --type epic --labels "agent:codex"

# create tasks (children of epic)
bd create "Implement X" --type task --parent <epic-id> --labels "agent:codex"
bd create "Write tests for X" --type task --parent <epic-id> --labels "agent:codex"

# dependency (A depends on B)
bd dep add <impl-task-id> --blocked-by <setup-task-id>
```

> Check exact flags via `bd <cmd> --help`.

---

## 7) Execution loop (code/test/PR/done)

### 7.1 One-at-a-time mode (WIP=1 recommended)

Especially for Unity MCP work, WIP=1 yields the lowest operational cost.

1. Move the Linear issue to `In Progress` and leave a kickoff comment (plan/risks/verification).
2. (Optional) Update Beads internal tasks to `in_progress`.
3. Implement → run local tests/checks.
4. Create/update PR → comment in Linear with PR link + move to `In Review`.
5. Merge + verify → set Linear to `Done`.

### 7.2 Unity MCP mutex (single Unity Editor session)

When Unity scenes/prefabs/assets are involved, guard with Beads labels:

- `needs:unity-mcp` : Unity Editor + MCP required
- `lock:unity-mcp` : issue currently holding the Unity MCP lock (exactly one)

Operations (local):

1. Before Unity work, clear any other issue with `lock:unity-mcp`.
2. Add `lock:unity-mcp` to the active issue.
3. After Unity changes, run `Tools > DreamOfOne > Run Diagnostics` until console is clean.
4. Remove `lock:unity-mcp` when done.

---

## 8) Failure / drift handling

- If Beads grows large, close/compact old internal issues to reduce overhead.
- If a Codex Cloud PR fails locally, record cause/repro/next steps in Linear and handle locally.
