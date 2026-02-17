# Developer Guide

Revision date: 2026-02-17

This guide is the practical run/verify reference for the current Mineflayer + TypeScript Runtime Path.

Terminology rule: use canonical terms from `terminology.md` for docs and user-facing runtime text.

---

## Runtime Authority

Primary Runtime Path:
- Backend runtime: `backend/npc-runtime/`
- Minecraft runtime client: Mineflayer Bot
- Decision interface: `POST /v1/npc/decision`
- Evidence interface: `/v1/telemetry/*`, `/health/queue`

Legacy Runtime Path (deprecated, rollback only):
- Unity runtime operations: `docs/deprecated/unity/dev.md`
- Unity archive index: `docs/deprecated/unity/index.md`

---

## Quick Start (Mineflayer Runtime Path)

### 1) Install and baseline verification

```bash
npm install --prefix backend/npc-runtime
npm run check --prefix backend/npc-runtime
```

### 2) Start runtime

```bash
NPC_RUNTIME_MINEFLAYER_ENABLED=1 \
NPC_RUNTIME_TELEMETRY_ENABLED=1 \
NPC_RUNTIME_MINEFLAYER_HOST=127.0.0.1 \
NPC_RUNTIME_MINEFLAYER_PORT=25565 \
NPC_RUNTIME_MINEFLAYER_USERNAME=npc-runtime-bot \
npm run dev --prefix backend/npc-runtime
```

### 3) Probe health and telemetry

```bash
curl -s http://127.0.0.1:8787/health | jq .
curl -s http://127.0.0.1:8787/health/ready | jq .
curl -s http://127.0.0.1:8787/health/queue | jq .
curl -s "http://127.0.0.1:8787/v1/telemetry/events?limit=20" | jq .
curl -s http://127.0.0.1:8787/v1/telemetry/evidence-pack | jq .
```

---

## Runtime Configuration (selected)

From `backend/npc-runtime/src/config.ts`:

- Runtime toggles:
  - `NPC_RUNTIME_MINEFLAYER_ENABLED`
  - `NPC_RUNTIME_TELEMETRY_ENABLED`
- Mineflayer connection:
  - `NPC_RUNTIME_MINEFLAYER_HOST`
  - `NPC_RUNTIME_MINEFLAYER_PORT`
  - `NPC_RUNTIME_MINEFLAYER_USERNAME`
  - `NPC_RUNTIME_MINEFLAYER_PASSWORD`
  - `NPC_RUNTIME_MINEFLAYER_AUTH` (`offline|microsoft|mojang`)
  - `NPC_RUNTIME_MINEFLAYER_VERSION`
  - `NPC_RUNTIME_MINEFLAYER_LIFECYCLE_TIMEOUT_MS`
- Scheduler and deadlines:
  - `NPC_RUNTIME_MAX_BROKER_INFLIGHT`
  - `NPC_RUNTIME_SCHEDULER_MAX_PENDING_PER_BOT`
  - `NPC_RUNTIME_SCHEDULER_MAX_PENDING_GLOBAL`
  - `NPC_RUNTIME_SCHEDULER_SNAPSHOT_INTERVAL_MS`
  - `NPC_RUNTIME_DECISION_DEADLINE_MS`
- Evidence output:
  - `NPC_RUNTIME_TELEMETRY_MAX_RECORDS`
  - `NPC_RUNTIME_EVIDENCE_OUTPUT_DIR`

---

## Validation and Evidence

### Integration checks

```bash
npm run check --prefix backend/npc-runtime
```

### Gate H automation (Mineflayer-only)

```bash
npm run ws8:release-gate:backend --prefix backend/npc-runtime -- --run-id rc-ws8-run-a --strict
npm run ws8:events:snapshot --prefix backend/npc-runtime -- --out data/evidence/ws8/gate-h/run-a-events.json
```

Repeat for `run-b` and `run-c`, then:

```bash
npm run ws8:trajectory:verify --prefix backend/npc-runtime -- \
  --evidence data/evidence/ws8/gate-h/run-a-evidence-pack.json \
  --evidence data/evidence/ws8/gate-h/run-b-evidence-pack.json \
  --evidence data/evidence/ws8/gate-h/run-c-evidence-pack.json \
  --out data/evidence/ws8/gate-h/trajectory-diversity.json --strict
```

### Key script entrypoints

- `npm run ws8:evidence:backend --prefix backend/npc-runtime`
- `npm run ws8:metrics:backend --prefix backend/npc-runtime`
- `npm run ws8:rc:backend --prefix backend/npc-runtime`
- `npm run ws8:rollback-drill --prefix backend/npc-runtime`

### Key outputs

- `logs/runtime-evidence-summary-backend.json`
- `logs/regression-metrics-backend.json`
- `logs/rc/<run-id>/manifest.json`
- `data/evidence/ws8/gate-h/*`

---

## Legacy Unity Path (deprecated)

Rollback drills and Unity archive integrity checks live under:
- `docs/deprecated/unity/dev.md`
- `docs/deprecated/unity/index.md`

---

## Work management (Linear SSOT + Beads graph)

This repo uses **Linear issues as the single source of truth** for work status.

Beads (`bd`) is the local execution graph for detailed dependency tracking:
- break down a Linear issue into atomic tasks and dependencies,
- track local WIP sequencing,
- keep local execution context stable across sessions.

References:
- Project overview: [`docs/overview.md`](overview.md)
- Agent runbook: [`docs/agent/runbook.md`](agent/runbook.md)
- Codex CLI workflow playbook: [`docs/agent/codex-cli-workflow.md`](agent/codex-cli-workflow.md)
- Agent skills: [`docs/agent-skills.md`](agent-skills.md)
