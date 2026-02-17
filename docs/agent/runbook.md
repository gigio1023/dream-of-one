# Codex Runbook (Linear SSOT + Beads Execution + Codex Cloud)

Revision date: 2026-02-17

This document defines the operating runbook for **Codex CLI**.  
The goal is to ensure: users provide only natural-language instructions; Codex CLI organizes and tracks Linear issues; implementations are done locally (with Beads when needed); and cloud-safe work is delegated to Codex Cloud via Linear.

Terminology rule: all operational docs/comments should follow `terminology.md` canonical terms.

For command-level step-by-step execution, use:
- `docs/agent/codex-cli-workflow.md`

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

- **Single Source of Truth (SSOT)**: Linear issues (agreement unit across humans/agents)
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
# meaning: <blocked> depends on <blocker>
bd dep add <impl-task-id> <setup-task-id>
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

### 7.1.1 Autonomous PR loop (GitHub MCP only)

Use this loop when running without human gating:

1. Create PR (if needed), then comment `@codex review`.
2. Build and maintain a review ledger for bot comments:
   - `comment_id`, `source`, `author`, `severity`, `decision`, `action`, `commit`, `status`, `reason`
3. Validate each bot finding as `valid|partial|invalid` before changing code.
4. Enforce merge criteria:
   - PR is open and mergeable
   - no unresolved actionable bot findings
   - checks criteria:
     - `status.total_count > 0` -> require `status.state=success`
     - `status.total_count == 0` -> pass (no required checks configured)
5. Merge via GitHub MCP and post merged SHA to Linear.
6. Sync local branch to latest `main` and continue next issue.

Hard rules:
- Do not use `gh` CLI for PR lifecycle.
- Never merge on red/pending checks when checks exist.
- Never merge while actionable medium-or-higher feedback remains unresolved.

### 7.2 Unity MCP mutex (single Unity Editor session)

When Unity scenes/prefabs/assets are involved, guard with Beads labels:

- `needs:unity-mcp` : Unity Editor + MCP required
- `lock:unity-mcp` : issue currently holding the Unity MCP lock (exactly one)

Operations (local):

1. Before Unity work, clear any other issue with `lock:unity-mcp`.
2. Add `lock:unity-mcp` to the active issue.
3. After Unity changes, run `Tools > DreamOfOne > Run Diagnostics` until console is clean.
4. Remove `lock:unity-mcp` when done.

Deprecated Unity docs:
- `docs/deprecated/unity/index.md`

For prototype simplification validation loops:
1. Run `Tools > DreamOfOne > Apply Simple Verification Mode`.
2. Run `Tools > DreamOfOne > Run Diagnostics` and ensure the console is clean.

---

## 8) Failure / drift handling

- If Beads grows large, close/compact old internal issues to reduce overhead.
- If a Codex Cloud PR fails locally, record cause/repro/next steps in Linear and handle locally.

---

## 9) TS NPC runtime local operation (`DRE-112`)

Use this when working the Codex-first backend runtime at `backend/npc-runtime`.

Tracking policy:
- Progress is tracked in Linear + Beads only.
- Do not maintain `progress.md`-style local progress files.

### 9.1 Environment variables

- `NPC_RUNTIME_HOST` (default: `0.0.0.0`)
- `NPC_RUNTIME_PORT` (default: `8787`)
- `CODEX_TOOL_COMMAND` (default: Node executable path + repo runner script)
- `CODEX_TOOL_ARGS` (default: auto-set to `scripts/codex-tool-runner.mjs` when command is not overridden)
- `CODEX_CLI_COMMAND` (optional: override Codex binary used by the runner, default: `codex`)
- `CODEX_TOOL_TIMEOUT_MS` (default: `20000`)
- `NPC_RUNTIME_MAX_BROKER_INFLIGHT` (default: `4`, global Codex broker concurrency cap)
- `NPC_RUNTIME_DECISION_DEADLINE_MS` (default: `8000`, per-request runtime deadline budget)
- `NPC_RUNTIME_WORKSPACE_ROOT` (default: `data/workspaces`, actor workspace artifact root)
- `NPC_RUNTIME_THREAD_STORE_PATH` (default: `data/thread-store.json`)
- mailbox metrics include `skippedBeforeBroker` for limiter-wait stale-job skip tracking

### 9.2 Local commands

From repo root:

```bash
cd backend/npc-runtime
npm install
npm run check
```

Run the service:

```bash
cd backend/npc-runtime
npm run build
node dist/index.js
```

Expected startup log:
- `npc-runtime listening on http://<host>:<port>`

Response telemetry notes:
- response evidence event: `npc_decision_response`
- client-aborted response event: `npc_decision_response_dropped` (noise channel; excluded from evidence aggregation)

Long-session stability trend (DRE-154):

```bash
deprecated/unity/scripts/run_stability_trend.sh
```

Key outputs:
- `logs/stability-trend.json`
- run summary includes codex ratio, fallback reason distribution, and mailbox peaks (`skippedBeforeBroker/cancelled/deadlineExceeded/globalQueued`)

### 9.3 Hook policy behavior (DRE-114)

- Runtime decision path is codex-only. If request includes `cognitionPath`, only `codex` or `codex-reply` is accepted.
- Non-codex values are rejected deterministically with fallback reason `policy_reject_non_codex_path`.
- Tool failures:
  - timeout: immediate fallback (`codex_timeout`, no retry to avoid load amplification)
  - cancel/abort: immediate fallback (`request_cancelled`)
  - parse/tool failure: retry-once then fallback

### 9.4 Workspace continuity specification (`DRE-141`)

Per actor key (`sessionId+npcId`), runtime persists the following artifacts:
- `persona.json`
- `policy.json`
- `memory.json`
- `summary.json`
- `thread.json`

Lifecycle:
- Load artifacts before each decision and include them in Codex prompt context.
- After each decision (including fallback), append memory entry + update summary/thread.
- Thread continuity uses `threadStore` and `thread.threadId` to continue `codex -> codex-reply`.

Rotation / compaction policy:
- `memory.entries` retains last 50 records.
- `thread.transportHistory` retains last 20 records.
- `memory.recentEvents` retains last 20 events.

Failure behavior:
- Missing or invalid artifact file falls back to default empty artifact shape (no crash).
- Fallback decisions are also persisted so continuity remains auditable.

### 9.5 Smoke checks

Health:

```bash
curl -s http://127.0.0.1:8787/health
```

Readiness:

```bash
curl -s http://127.0.0.1:8787/health/ready
```

If not ready, `reasons` may include:
- `codex_command_not_resolvable`
- `thread_store_path_not_accessible`
- `workspace_root_path_not_accessible`

Decision endpoint:

```bash
curl -s http://127.0.0.1:8787/v1/npc/decision \
  -H 'content-type: application/json' \
  -d '{
    "sessionId":"smoke-session",
    "npcId":"npc-1",
    "landmarkId":"Store",
    "nearbyActors":["player"],
    "recentEvents":["shift_start"],
    "organizationContext":{"org":"Store"},
    "playerSignals":{"suspicion":0.1}
  }'
```

Expected runtime decision log fields:
- `event` (`npc_decision_request` | `npc_decision_response`)
- `requestId`
- `sessionId`
- `npcId`
- `threadId` (nullable on request, expected on response)
- `deadlineMs`
- `latencyMs`

Response-only fields:
- `transport` (`codex` | `codex-reply` | `fallback`)
- `usedFallback`
- `reason` (when fallback is used)
- `mailbox` (`queued`, `inflight`, `coalesced`, `dropped`, `cancelled`, `deadlineExceeded`, `globalCap`, `globalInFlight`, `globalQueued`)
