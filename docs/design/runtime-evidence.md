---
doc: docs/design/runtime-evidence.md
project: Dream of One
revision: 2026-02-14
status: Active
---

# Runtime Evidence Operations Guide

This document defines the operational procedure for runtime Evidence collection and Validation Criteria for Dream of One.
Execution sequencing Source of Truth is Linear issues, governed by `project.md`.

## 1) Goal
- Automatically validate `transport`, `threadId`, and `usedFallback` from Unity and Backend runtime outputs.
- Record deterministic fallback causality with `reason`, `reasonCategory`, and `warningTier` (Severity Tier).
- Preserve Regression Monitoring outputs and Release Candidate (RC) decisions as reproducible Evidence artifacts.

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
Baseline checks:
```bash
scripts/unity/run_editor_diagnostics.sh
scripts/unity/run_playmode_smoke.sh
```

Full checks with Release Candidate packaging:
```bash
scripts/unity/run_all_checks.sh
```

Recommended Release Candidate profile:
```bash
RC_PROFILE=release RC_NORMAL_RUNS=3 RC_FAILURE_RUNS=2 scripts/unity/run_all_checks.sh
```

Long-session stability trend profile (3-run comparison):
```bash
scripts/unity/run_stability_trend.sh
```

Live-play accumulation profile (non-test loop):
```bash
rg --no-line-number "transport=" "$HOME/Library/Logs/Unity/Editor.log" | tail -n 300 > logs/unity-live-play.log
node scripts/unity/analyze_runtime_evidence.mjs \
  --unity-log logs/unity-live-play.log \
  --backend-log logs/npc-runtime-live-evidence.log \
  --out logs/runtime-evidence-summary.json \
  --require-unity-entries \
  --require-backend-entries
node scripts/unity/collect_regression_metrics.mjs \
  --evidence logs/runtime-evidence-summary.json \
  --backend-log logs/npc-runtime-live-evidence.log \
  --out logs/regression-metrics.json
node scripts/unity/package_release_candidate.mjs \
  --run-id rc-dre-149 \
  --out-dir logs/rc \
  --evidence logs/runtime-evidence-summary.json \
  --metrics logs/regression-metrics.json \
  --editor-log logs/editor-diagnostics.log \
  --playmode-smoke-log logs/playmode-smoke.log \
  --playmode-tests-log logs/playmode-tests.log
```

## 4) Generated Artifacts
- `logs/runtime-evidence-summary.json`
  - field presence violations and distribution metrics
- `logs/regression-metrics.json`
  - Runtime Path ratio, fallback rate, and continuity-loss indicators
- `logs/rc/<run-id>/manifest.json`
  - Release Candidate checklist decision and referenced log paths

## 5) Decision Criteria
- `violations` must be `0`
- `codexPathRatio` must meet target (`>= 0.7` by default)
- `codexReplyMissingThreadId` must be `0`
- `fallbackWithoutReason` must be `0`

## 6) Operations Notes
- Empty Unity or Backend logs can force metric failures by design.
- Enable strict mode with `DREAM_EVIDENCE_STRICT=1`.
- Enforce Evidence entry presence with:
  - `DREAM_REQUIRE_UNITY_EVIDENCE=1`
  - `DREAM_REQUIRE_BACKEND_EVIDENCE=1`
- During load Hardening runs, monitor `mailbox.skippedBeforeBroker` to track reduced unnecessary broker execution for canceled/deadline-expired jobs.

## 7) Stability Thresholds and Failure Response
- Default thresholds in `scripts/unity/run_stability_trend.sh`:
  - `runCount >= 3`
  - `codexPathRatio >= 0.7`
  - `cancelledRate <= 0.35`
  - `deadlineExceededRate <= 0.25`
- Output file:
  - `logs/stability-trend.json`
- Failure response order:
  1. If `summary.pass.runCount=false`, expand the run set to at least three runs.
  2. If `codexPathRatio` fails, classify top fallback spikes from backend `fallbackReasonDistribution`.
  3. If `cancelledRate` or `deadlineExceededRate` fails, inspect per-run `mailboxMax` and `globalQueued` peaks, then retune deadline and Global Cap together.
  4. If `droppedResponses` increases, align Unity timeout/cancel policy with backend deadline behavior.
