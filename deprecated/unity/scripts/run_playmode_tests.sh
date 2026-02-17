#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
UNITY="${UNITY_PATH:-}"
if [[ -z "$UNITY" ]]; then
  UNITY="$($ROOT_DIR/scripts/unity/_find_unity.sh)"
fi

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

"$UNITY" \
  -batchmode \
  -projectPath "$ROOT_DIR/draem-of-one" \
  -runTests \
  -testPlatform PlayMode \
  -testResults "$LOG_DIR/playmode-tests.xml" \
  -logFile "$LOG_DIR/playmode-tests.log" \
  -quit

STRICT="${DREAM_EVIDENCE_STRICT:-0}"
node "$ROOT_DIR/scripts/unity/analyze_runtime_evidence.mjs" \
  --unity-log "$LOG_DIR/playmode-tests.log" \
  --backend-log "$LOG_DIR/npc-runtime.log" \
  --out "$LOG_DIR/runtime-evidence-playmode-tests.json" \
  --strict "$STRICT"
