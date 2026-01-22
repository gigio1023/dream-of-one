#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

$ROOT_DIR/scripts/unity/run_editor_diagnostics.sh
$ROOT_DIR/scripts/unity/run_playmode_smoke.sh
