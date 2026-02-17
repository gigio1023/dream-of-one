#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

RC_PROFILE="${RC_PROFILE:-quick}"
RC_RUN_ID="${RC_RUN_ID:-rc-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_PLAYMODE_TESTS="${RUN_PLAYMODE_TESTS:-1}"

if [[ "$RC_PROFILE" == "release" ]]; then
  NORMAL_RUNS="${RC_NORMAL_RUNS:-3}"
  FAILURE_RUNS="${RC_FAILURE_RUNS:-2}"
else
  NORMAL_RUNS="${RC_NORMAL_RUNS:-1}"
  FAILURE_RUNS="${RC_FAILURE_RUNS:-0}"
fi

run_normal_pass() {
  local run_tag="$1"
  echo "[run_all_checks] normal pass: $run_tag"
  DREAM_EVIDENCE_STRICT=1 \
  DREAM_REQUIRE_UNITY_EVIDENCE="${DREAM_REQUIRE_UNITY_EVIDENCE:-0}" \
  DREAM_REQUIRE_BACKEND_EVIDENCE="${DREAM_REQUIRE_BACKEND_EVIDENCE:-0}" \
    "$ROOT_DIR/deprecated/unity/scripts/run_editor_diagnostics.sh"
  DREAM_EVIDENCE_STRICT=1 \
  DREAM_REQUIRE_UNITY_EVIDENCE="${DREAM_REQUIRE_UNITY_EVIDENCE:-0}" \
  DREAM_REQUIRE_BACKEND_EVIDENCE="${DREAM_REQUIRE_BACKEND_EVIDENCE:-0}" \
    "$ROOT_DIR/deprecated/unity/scripts/run_playmode_smoke.sh"
}

run_failure_injection_pass() {
  local run_tag="$1"
  local scenario="$2"
  echo "[run_all_checks] failure-injection pass: $run_tag scenario=$scenario"
  DREAM_FAILURE_SCENARIO="$scenario" \
  DREAM_EVIDENCE_STRICT=1 \
  DREAM_REQUIRE_UNITY_EVIDENCE="${DREAM_REQUIRE_UNITY_EVIDENCE:-0}" \
  DREAM_REQUIRE_BACKEND_EVIDENCE="${DREAM_REQUIRE_BACKEND_EVIDENCE:-0}" \
    "$ROOT_DIR/deprecated/unity/scripts/run_playmode_smoke.sh"
}

for ((i = 1; i <= NORMAL_RUNS; i++)); do
  run_normal_pass "$RC_RUN_ID-normal-$i"
done

for ((i = 1; i <= FAILURE_RUNS; i++)); do
  run_failure_injection_pass "$RC_RUN_ID-failure-$i" "failure-injection-$i"
done

if [[ "$RUN_PLAYMODE_TESTS" == "1" ]]; then
  DREAM_EVIDENCE_STRICT=0 "$ROOT_DIR/deprecated/unity/scripts/run_playmode_tests.sh"
fi

node "$ROOT_DIR/deprecated/unity/scripts/collect_regression_metrics.mjs" \
  --evidence "$LOG_DIR/runtime-evidence-summary.json" \
  --backend-log "$LOG_DIR/npc-runtime.log" \
  --out "$LOG_DIR/regression-metrics.json"

node "$ROOT_DIR/deprecated/unity/scripts/package_release_candidate.mjs" \
  --run-id "$RC_RUN_ID" \
  --out-dir "$LOG_DIR/rc" \
  --evidence "$LOG_DIR/runtime-evidence-summary.json" \
  --metrics "$LOG_DIR/regression-metrics.json" \
  --editor-log "$LOG_DIR/editor-diagnostics.log" \
  --playmode-smoke-log "$LOG_DIR/playmode-smoke.log" \
  --playmode-tests-log "$LOG_DIR/playmode-tests.log"

echo "[run_all_checks] completed RC run: $RC_RUN_ID"
