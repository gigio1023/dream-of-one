---
doc: docs/design/runtime-evidence.md
project: Dream of One
revision: 2026-02-17
status: Active
---

# Runtime Evidence Operations Guide

This document defines the operational procedure for runtime Evidence collection and Validation Criteria for Dream of One.
Execution sequencing Source of Truth is Linear issues, governed by `project.md`.

## 1) Goal
- Automatically validate `transport`, `threadId`, and `usedFallback` from Mineflayer + backend runtime outputs.
- Record deterministic fallback causality with `reason`, `reasonCategory`, and `warningTier` (Severity Tier).
- Preserve Regression Monitoring outputs and Release Candidate (RC) decisions as reproducible Evidence artifacts without Unity-only dependencies.

## 2) Evidence Field Specification
- Required fields:
  - `transport`: `codex | codex-reply | fallback`
  - `usedFallback`: `true | false`
  - `threadId`: required when `transport` is `codex` or `codex-reply`
- Causality and Hardening fields:
  - `reason`: Reason Code
  - `reasonCategory`: `none|policy|schema|timeout|cancelled|parse|tool|runtime|unknown`
  - `warningTier`: `blocking|attention|reference`
- Backend log event split:
  - Evidence aggregation target: `npc_decision_response`
  - Client-aborted noise lane: `npc_decision_response_dropped` (excluded from response Evidence aggregation)

## 3) Execution Commands
Baseline backend checks:
```bash
cd backend/npc-runtime
npm run check
```

Runtime start with Mineflayer telemetry enabled:
```bash
NPC_RUNTIME_MINEFLAYER_ENABLED=1 \
NPC_RUNTIME_TELEMETRY_ENABLED=1 \
npm run dev --prefix backend/npc-runtime
```

Human player session entry (required for player-driven scenario Evidence):
1. Open Minecraft Java client.
2. Join the same server as runtime (`NPC_RUNTIME_MINEFLAYER_HOST:NPC_RUNTIME_MINEFLAYER_PORT`).
3. Use a username different from runtime bot accounts.

Collect recent telemetry records:
```bash
curl -s "http://127.0.0.1:8787/v1/telemetry/events?limit=200" | jq .
```

Build in-memory Evidence Pack from current runtime session:
```bash
curl -s "http://127.0.0.1:8787/v1/telemetry/evidence-pack" | jq .
```

Export Evidence Pack artifact to disk:
```bash
curl -s -X POST "http://127.0.0.1:8787/v1/telemetry/evidence-pack/export" \
  -H "content-type: application/json" \
  -d '{"fileName":"rc-evidence-pack.json"}' | jq .
```

WS8 Mineflayer-only Gate H automation:
```bash
cd backend/npc-runtime
npm run ws8:release-gate:backend -- \
  --run-id rc-ws8-run-a \
  --backend-log ../../logs/npc-runtime-real-evidence.log \
  --evidence-out ../../data/evidence/ws8/gate-h/run-a-evidence-pack.json \
  --metrics-out ../../data/evidence/ws8/gate-h/run-a-regression-metrics.json \
  --out-dir ../../logs/rc \
  --strict
```

WS8 events snapshot export:
```bash
cd backend/npc-runtime
npm run ws8:events:snapshot -- \
  --backend-log ../../logs/npc-runtime-real-evidence.log \
  --out ../../data/evidence/ws8/gate-h/run-a-events.json \
  --limit 200
```

WS8 trajectory diversity verification:
```bash
cd backend/npc-runtime
npm run ws8:trajectory:verify -- \
  --evidence ../../data/evidence/ws8/gate-h/run-a-evidence-pack.json \
  --evidence ../../data/evidence/ws8/gate-h/run-b-evidence-pack.json \
  --evidence ../../data/evidence/ws8/gate-h/run-c-evidence-pack.json \
  --out ../../data/evidence/ws8/gate-h/trajectory-diversity.json \
  --min-runs 3 \
  --strict
```

WS8 rollback drill (deprecated Unity path recoverability check):
```bash
cd backend/npc-runtime
npm run ws8:rollback-drill -- --strict
```

Legacy Unity historical comparison workflow (optional, deprecated path):
```bash
deprecated/unity/scripts/run_editor_diagnostics.sh
deprecated/unity/scripts/run_playmode_smoke.sh
```

## 4) Generated Artifacts
- `data/evidence/evidence-pack-*.json` or custom export filename
  - Mineflayer event counts, decision/fallback distributions, scheduler pressure summary
- `logs/npc-runtime-live-evidence.log` (operator-collected)
  - request/response/drop event lines for forensic timeline replay
- `/v1/telemetry/evidence-pack` response payload
  - on-demand in-memory summary for RC gating decisions

## 5) Decision Criteria
- `violations` must be `0`
- `codexPathRatio` must meet target (`>= 0.7` by default) on decision records
- `codexReplyMissingThreadId` must be `0`
- `fallbackWithoutReason` must be `0`
- backpressure fallback share (`runtime_actor_queue_saturated`, `runtime_global_queue_saturated`) must remain within target envelope for scenario load

## 6) Operations Notes
- Empty telemetry windows can force metric failures by design.
- `npc_decision_response_dropped` is a transport/noise lane and must not be counted as successful response Evidence.
- During Hardening runs, monitor:
  - `mailbox.skippedBeforeBroker`,
  - `mailbox.backpressureRejected`,
  - `mailbox.actorQueueSaturated`,
  - `mailbox.globalQueueSaturated`.
- Use `/health/queue` to confirm Global Concurrency Limit + queue pressure before RC decision.

## 7) Stability Thresholds and Failure Response
- Default thresholds for Mineflayer runtime stability trend:
  - `runCount >= 3`
  - `codexPathRatio >= 0.7`
  - `cancelledRate <= 0.35`
  - `deadlineExceededRate <= 0.25`
  - `backpressureRejectedRate <= 0.15`
- Failure response order:
  1. If `runCount` fails, expand the run set to at least three runs.
  2. If `codexPathRatio` fails, classify top fallback spikes from `reasonCategory` and Reason Code distribution.
  3. If `cancelledRate` or `deadlineExceededRate` fails, inspect per-run queue pressure and retune deadline + Global Concurrency Limit together.
  4. If `backpressureRejectedRate` fails, increase scheduler caps only with explicit load-test Evidence.
  5. If `droppedResponses` increases, align client timeout/cancel policy with backend deadline behavior.

## 8) Gate H Workflow (Mineflayer-only)
### Goal
- Run Gate H with Mineflayer Runtime Path Evidence only.
- Exclude Unity legacy artifacts from Gate H pass/fail decisions.

### Procedure
1. Run baseline checks and start runtime telemetry collection:
   - `npm run check --prefix backend/npc-runtime`
   - `NPC_RUNTIME_MINEFLAYER_ENABLED=1 NPC_RUNTIME_TELEMETRY_ENABLED=1 npm run dev --prefix backend/npc-runtime`
2. Execute at least three consecutive scenario runs for the same release candidate target.
3. For each run, execute Mineflayer-only gate packaging and events snapshot export:
   - `cd backend/npc-runtime && npm run ws8:release-gate:backend -- ...`
   - `cd backend/npc-runtime && npm run ws8:events:snapshot -- ...`
4. Verify trajectory diversity using exactly the three run Evidence Pack outputs:
   - `cd backend/npc-runtime && npm run ws8:trajectory:verify -- ...`
5. Verify Gate H Acceptance Criteria using only Mineflayer Evidence Pack fields:
   - `violations == 0`
   - `codexReplyMissingThreadId == 0`
   - `fallbackWithoutReason == 0`
   - `codexPathRatio >= 0.7`
   - `runCount >= 3`
6. Write gate decision and artifact links into `docs/design/ws8-final-migration-report.md`.

### Acceptance Criteria
- Gate H decision is derived from Mineflayer Runtime Path artifacts only.
- Gate H output includes deterministic pass/fail reason text with Reason Code and Reason Category references when failed.

### Validation Criteria
- Gate H artifact set exists and is linkable from the migration report:
  - `data/evidence/ws8/gate-h/*-evidence-pack.json`
  - `data/evidence/ws8/gate-h/*-events.json`
  - `data/evidence/ws8/gate-h/trajectory-diversity.json`
  - `logs/rc/rc-ws8-run-*/manifest.json`
  - `docs/design/ws8-final-migration-report.md`
- Unity deprecated path checks may be attached as reference Evidence, but never as Gate H pass criteria.

## 9) Rollback Drill Procedure and Log Location
### Goal
- Confirm rollback to the deprecated Unity path remains technically possible without changing Mineflayer Runtime Path authority.

### Procedure
1. Capture pre-drill Status Snapshot:
   - `/health/queue` response
   - latest Mineflayer Evidence Pack export filename
2. Run rollback drill command:
   - `cd backend/npc-runtime && npm run ws8:rollback-drill -- --strict`
3. Record command outputs and timestamps under:
   - `logs/ws8/rollback-drill/<YYYYMMDD-HHMM>/`
4. Add a drill entry to `docs/deprecated/unity/ws8-rollback-drill-log.md` with:
   - run timestamp,
   - operator,
   - command list,
   - result (`pass|fail`),
   - linked log/evidence paths,
   - residual risk notes.

### Acceptance Criteria
- Rollback drill log entry exists for the current Release Candidate (RC) cycle.
- Drill result is reproducible through linked command outputs.

### Validation Criteria
- `docs/deprecated/unity/ws8-rollback-drill-log.md` contains the latest drill record.
- Drill artifacts are present under `logs/ws8/rollback-drill/` and linked from the drill record.
