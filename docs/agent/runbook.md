# Codex Runbook (Linear SoT + Beads Execution + Codex Cloud)

Revision date: 2026-02-08

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
4. Enforce merge gates:
   - PR is open and mergeable
   - no unresolved actionable bot findings
   - checks gate:
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
- `CODEX_TOOL_COMMAND` (default: `codex-tool-runner`)
- `CODEX_TOOL_ARGS` (default: empty; space-separated)
- `CODEX_TOOL_TIMEOUT_MS` (default: `8000`)
- `CODEX_GLOBAL_BUDGET_MS` (default: `16000`)
- `NPC_RUNTIME_PROMPT_CHAR_BUDGET` (default: `3600`)
- `NPC_RUNTIME_THREAD_STORE_PATH` (default: `data/thread-store.json`)
- `NPC_RUNTIME_RELIABILITY_MIN_DECISIONS` (default: `10`)
- `NPC_RUNTIME_FALLBACK_RATE_MAX` (default: `0.35`)
- `NPC_RUNTIME_TIMEOUT_RATE_MAX` (default: `0.2`)
- `NPC_RUNTIME_PARSE_FAILURE_RATE_MAX` (default: `0.2`)

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

### 9.3 Hook policy behavior (DRE-114)

- Runtime decision path is codex-only. If request includes `cognitionPath`, only `codex` or `codex-reply` is accepted.
- Non-codex values are rejected deterministically with fallback reason `policy_reject_non_codex_path`.
- Tool failures (timeout/tool/parse) follow retry-once then fallback.

### 9.4 Smoke checks and endpoint interpretation

Liveness:

```bash
curl -s http://127.0.0.1:8787/health
```

Expected:
- HTTP `200`
- Body: `{"status":"ok","service":"npc-runtime"}`

Readiness:

```bash
curl -s http://127.0.0.1:8787/health/ready
```

Expected:
- HTTP `200` when ready, HTTP `503` when not ready.
- `status` is `ready` or `not_ready`.
- `reasons` contains deterministic codes when not ready:
  - `codex_command_not_resolvable`
  - `thread_store_path_not_accessible`
- `checks.codexCommand` and `checks.threadStorePath` provide per-check details.

Reliability:

```bash
curl -s http://127.0.0.1:8787/health/reliability
```

Expected:
- HTTP `200` only when gate status is `pass`.
- HTTP `503` when status is `fail`, `insufficient_sample`, or `not_available`.
- Body shape:
  - `status`: `pass` | `fail` | `insufficient_sample` | `not_available`
  - `snapshot`: reliability counters/rates
  - `gate`: `pass`, `status`, `reason`, `thresholds`, `violations`, `summary`

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
- `latencyMs`

Response-only fields:
- `transport` (`codex` | `codex-reply` | `fallback`)
- `usedFallback`
- `reason` (when fallback is used)

### 9.5 Incident triage matrix (deterministic)

| Signal | Where to check | Meaning | Immediate action |
| --- | --- | --- | --- |
| `status=not_ready` + `codex_command_not_resolvable` | `/health/ready` | Runtime cannot resolve Codex command path | Fix `CODEX_TOOL_COMMAND` / PATH, then recheck `/health/ready` |
| `status=not_ready` + `thread_store_path_not_accessible` | `/health/ready` | Thread store parent path is not writable/readable | Fix `NPC_RUNTIME_THREAD_STORE_PATH` permissions/path, then recheck |
| `status=insufficient_sample` | `/health/reliability` | Decision count below `minimumDecisions`; reliability gate is intentionally non-passable | Generate more decision traffic or lower `NPC_RUNTIME_RELIABILITY_MIN_DECISIONS` only if policy allows |
| `status=fail` with `metric=fallbackRate` | `/health/reliability` `gate.violations` | Too many fallback responses | Inspect decision logs for repeated fallback reasons and reduce upstream failures |
| `status=fail` with `metric=timeoutRate` | `/health/reliability` `gate.violations` | Too many codex timeouts | Tune timeout/budget or lower request pressure; verify Codex command health |
| `status=fail` with `metric=parseFailureRate` | `/health/reliability` `gate.violations` | Too many parse failures | Inspect prompt/output schema compatibility and recent contract changes |
| `reason=policy_reject_non_codex_path` in decision response log | `npc_decision_response` log | Request attempted non-codex cognition path and was rejected by policy | Fix caller payload (`cognitionPath`) to `codex`/`codex-reply` or omit it |
| `reason=policy_required_field_missing` in decision response log | `npc_decision_response` log | Perception packet failed required-field pre-hook checks | Fix payload shape before request |
| `reason=parse_failure` in decision response log | `npc_decision_response` log | Codex output could not be parsed to `NpcIntent` after retry policy | Inspect output/prompt schema drift and parser constraints |
| `reason=codex_timeout` in decision response log | `npc_decision_response` log | Tool call exceeded timeout | Tune `CODEX_TOOL_TIMEOUT_MS` / `CODEX_GLOBAL_BUDGET_MS`, inspect command latency |
| `reason=tool_failure` in decision response log | `npc_decision_response` log | Tool call failed for non-timeout reason | Inspect codex tool invocation and stderr behavior |

### 9.6 Verification bundle

Run the baseline gate:

```bash
cd backend/npc-runtime
npm run check
```

Review output for:
- build success
- integration tests green
- no regressions in readiness/reliability endpoint behavior
