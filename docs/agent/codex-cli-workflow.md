# Codex CLI Workflow Playbook (Dream of One)

Revision date: 2026-02-17

This playbook is the detailed execution workflow for running Codex CLI in this repository.  
It is aligned with `AGENTS.md` and the operating runbook in `docs/agent/runbook.md`.

## 0) Purpose and scope

- Define a repeatable end-to-end flow from user request to merged PR and closed Linear issue.
- Keep Linear as the Work Source of Truth and Beads as the local execution graph.
- Keep Runtime Path safety and validation deterministic.

## 1) Operating model (non-negotiable)

- Work Source of Truth: Linear issue status and comments.
- Execution graph: Beads (`bd`) with atomic tasks and explicit dependencies.
- Issue handling mode: one Linear issue at a time unless explicitly instructed otherwise.
- Collaboration mode: non-trivial work uses swarm execution (`explorer` first, then workers).
- PR tooling: GitHub MCP only for PR lifecycle (no `gh` CLI).
- Terminology: use canonical terms from `terminology.md`.

## 2) End-to-end workflow

### Step 1: Intake and issue selection

1. Open the target Linear issue or create one first.
2. Confirm issue includes:
   - Goal
   - Acceptance Criteria
   - Scope / Paths
   - Do-Not constraints
   - Verification commands
3. Set Linear status to `In Progress` and leave a kickoff comment.

### Step 2: Classify execution lane

Use this decision matrix:

| Lane | Use when | Labels |
|---|---|---|
| Local (Unity MCP) | Unity Editor/MCP or serialized Unity assets are required | `agent:codex`, `needs:unity-mcp` |
| Local (non-Unity) | TypeScript/backend/docs/script work can run locally without Unity | `agent:codex` |
| Cloud (Codex Cloud) | Cloud-safe and no Unity serialized assets/MCP dependency | `agent:codex-cloud` |

Cloud delegation must never include Unity serialized asset edits.

### Step 3: Build Beads execution graph

1. Prime Beads context:

```bash
bd prime
bd ready
```

2. Create an epic and atomic tasks (use real newlines with `--body-file -`):

```bash
bd create "DRE-XXX <workstream>" --type epic --labels "agent:codex" --external-ref "linear:DRE-XXX"
bd create "<atomic task>" --type task --parent <epic-id> --labels "agent:codex"
bd dep add <blocked-task-id> --blocked-by <blocking-task-id>
bd update <task-id> --status in_progress
```

3. Keep exactly one active task in progress; close tasks with high-signal reasons.

### Step 4: Discovery and implementation

1. Spawn `explorer` agents first for non-trivial codebase discovery.
2. Use swarm execution for parallel lanes (docs/code/tests) when scopes are independent.
3. Use `multi_tool_use.parallel` for independent shell or MCP calls.
4. Implement only within approved Scope; open follow-up issues for discovered out-of-scope work.

### Step 5: Validation gate

Run the narrowest relevant checks first, then broader checks.

Common checks:

```bash
npm run check --prefix backend/npc-runtime
```

If Mermaid diagrams are added/changed, render-validate before completion:

```bash
npx -y @mermaid-js/mermaid-cli -i <diagram>.mmd -o <diagram>.svg
```

For Unity MCP work:
- hold `lock:unity-mcp` while editing Unity scope;
- run `Tools > DreamOfOne > Run Diagnostics` until console is clean.

### Step 6: Commit and push

1. Split changes into logical, independently revertible commits.
2. Keep commit messages in English with clear motivation and scope.
3. Push branch with Linear-aware naming when possible (for example `DRE-165-...`).

### Step 7: PR lifecycle (GitHub MCP)

1. Open PR via GitHub MCP.
2. Request Codex/Copilot review.
3. Track bot feedback with a decision ledger:
   - `comment_id`, `severity`, `decision(valid|partial|invalid)`, `action`, `commit`, `status`, `reason`.
4. Enforce merge gate:
   - if `status.total_count > 0`, checks must be `success`;
   - if `status.total_count == 0`, checks gate passes;
   - unresolved actionable findings block merge.
5. Merge via GitHub MCP.

### Step 8: Linear synchronization and closure

1. Add PR link and validation summary comment to the Linear issue.
2. Move status to `In Review` during PR review.
3. Move to `Done` only after merge and validation completion.
4. If new work is discovered, create a new Linear issue and link it.

### Step 9: Beads closure

1. Close active Beads task(s) with reason + touched paths + verification.
2. Close parent epic when all child tasks are complete.
3. Keep `.beads/` tracked; never hand-edit Beads files.

## 3) Fast checklist

- Linear issue selected and `In Progress`
- Beads epic/tasks created with dependencies
- Scope classification decided (Unity MCP / non-Unity / Cloud)
- Implementation + validation completed
- Mermaid validation completed when needed
- PR opened/reviewed/merged via GitHub MCP
- Linear updated (`In Review` -> `Done`)
- Beads tasks and epic closed

## 4) Reference documents

- Repository policy: `AGENTS.md`
- Operational runbook: `docs/agent/runbook.md`
- Developer guide: `docs/dev.md`
- Project Source of Truth: `project.md`
- Terminology standard: `terminology.md`
