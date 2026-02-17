#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

OUT_PATH="${STABILITY_TREND_OUT:-$LOG_DIR/stability-trend.json}"
MIN_RUNS="${STABILITY_TREND_MIN_RUNS:-3}"
CODEX_RATIO_MIN="${STABILITY_TREND_CODEX_RATIO_MIN:-0.7}"
CANCELLED_RATE_MAX="${STABILITY_TREND_CANCELLED_RATE_MAX:-0.35}"
DEADLINE_EXCEEDED_RATE_MAX="${STABILITY_TREND_DEADLINE_RATE_MAX:-0.25}"

node "$ROOT_DIR/deprecated/unity/scripts/collect_stability_trend.mjs" \
  --run "rc-dre-149" \
  --metrics "$LOG_DIR/rc/rc-dre-149/regression-metrics.json" \
  --evidence "$LOG_DIR/rc/rc-dre-149/runtime-evidence-summary.json" \
  --backend-log "$LOG_DIR/npc-runtime-live-evidence.log" \
  --run "rc-dre-150" \
  --metrics "$LOG_DIR/rc/rc-dre-150/regression-metrics-real.json" \
  --evidence "$LOG_DIR/rc/rc-dre-150/runtime-evidence-summary-real.json" \
  --backend-log "$LOG_DIR/npc-runtime-real-evidence.log" \
  --run "rc-smoke" \
  --metrics "$LOG_DIR/rc/rc-smoke/regression-metrics.json" \
  --evidence "$LOG_DIR/rc/rc-smoke/runtime-evidence-summary.json" \
  --backend-log "$LOG_DIR/npc-runtime.log" \
  --min-runs "$MIN_RUNS" \
  --codex-ratio-min "$CODEX_RATIO_MIN" \
  --cancelled-rate-max "$CANCELLED_RATE_MAX" \
  --deadline-exceeded-rate-max "$DEADLINE_EXCEEDED_RATE_MAX" \
  --out "$OUT_PATH"

echo "[run_stability_trend] output=$OUT_PATH"
