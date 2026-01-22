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
  -executeMethod DreamOfOne.Editor.CLIRunner.RunEditorDiagnostics \
  -logFile "$LOG_DIR/editor-diagnostics.log" \
  -quit
