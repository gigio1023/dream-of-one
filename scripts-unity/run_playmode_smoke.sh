#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)" pwd)"
UNITY="${UNITY_PATH:-}"
if [[ -z "$UNITY" ]]; then
  UNITY="$($ROOT_DIR/deprecated/unity/scripts/_find_unity.sh)"
fi

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

"$UNITY" \
  -batchmode \
  -projectPath "$ROOT_DIR" \
  -executeMethod DreamOfOne.Editor.CLIRunner.RunPlaymodeSmokeTest \
  -logFile "$LOG_DIR/playmode-smoke.log" \
  -quit

STRICT="${DREAM_EVIDENCE_STRICT:-0}"
REQUIRE_UNITY="${DREAM_REQUIRE_UNITY_EVIDENCE:-0}"
REQUIRE_BACKEND="${DREAM_REQUIRE_BACKEND_EVIDENCE:-0}"

ANALYZE_ARGS=(
  --unity-log "$LOG_DIR/playmode-smoke.log"
  --backend-log "$LOG_DIR/npc-runtime.log"
  --out "$LOG_DIR/runtime-evidence-summary.json"
  --strict "$STRICT"
)

if [[ "$REQUIRE_UNITY" == "1" ]]; then
  ANALYZE_ARGS+=(--require-unity-entries)
fi
if [[ "$REQUIRE_BACKEND" == "1" ]]; then
  ANALYZE_ARGS+=(--require-backend-entries)
fi

node "$ROOT_DIR/deprecated/unity/scripts/analyze_runtime_evidence.mjs" "${ANALYZE_ARGS[@]}"

node "$ROOT_DIR/deprecated/unity/scripts/collect_regression_metrics.mjs" \
  --evidence "$LOG_DIR/runtime-evidence-summary.json" \
  --backend-log "$LOG_DIR/npc-runtime.log" \
  --out "$LOG_DIR/regression-metrics.json"
