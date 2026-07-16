#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RUNTIME_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(CDPATH= cd -- "$RUNTIME_DIR/../.." && pwd)
GODOT_BIN=${GODOT_BIN:-}
REQUESTED_PORT=${DREAM_SESSION_PORT:-0}
TEMP_ROOT=
LOG_FILE=
HEALTH_FILE=
GODOT_HOME=
SERVER_PID=

if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then
	echo "GODOT_BIN must name an executable Godot binary" >&2
	exit 2
fi

TEMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/dream-of-one-run-api-parity.XXXXXX")
LOG_FILE=$TEMP_ROOT/npc-runtime.log
HEALTH_FILE=$TEMP_ROOT/health.json
GODOT_HOME=$TEMP_ROOT/godot-home

cleanup() {
	status=$?
	trap - EXIT HUP INT TERM
	if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
		kill -TERM "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
	if [ "$status" -ne 0 ] && [ -f "$LOG_FILE" ]; then
		cat "$LOG_FILE" >&2
	fi
	rm -rf "$TEMP_ROOT"
	exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir -p "$GODOT_HOME"
(
	cd "$RUNTIME_DIR"
	exec env \
		-u OPENAI_API_KEY \
		-u MODELSCOPE_API_KEY \
		-u LOCAL_LLM_BASE_URL \
		PORT="$REQUESTED_PORT" \
		bun src/tools/scripted-session-server.ts
) >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

BASE_URL=
attempt=0
while [ "$attempt" -lt 100 ]; do
	if ! kill -0 "$SERVER_PID" 2>/dev/null; then
		echo "run API parity: scripted sidecar exited before readiness" >&2
		exit 1
	fi
	BASE_URL=$(sed -n 's/^npc-runtime session API listening on //p' "$LOG_FILE" | tail -n 1)
	if [ -n "$BASE_URL" ] && curl --fail --silent "$BASE_URL/health" >"$HEALTH_FILE"; then
		if grep -q '"status":"ok"' "$HEALTH_FILE"; then
			break
		fi
	fi
	attempt=$((attempt + 1))
	sleep 0.05
done
if [ -z "$BASE_URL" ] || [ "$attempt" -ge 100 ]; then
	echo "run API parity: scripted sidecar did not become healthy" >&2
	exit 1
fi

HOME="$GODOT_HOME" \
	DREAM_SESSION_MODE=http \
	DREAM_SESSION_URL="$BASE_URL" \
	"$GODOT_BIN" --headless --path "$REPO_DIR/godot" \
		--script res://tools/run_api_http_smoke.gd

kill -TERM "$SERVER_PID"
wait "$SERVER_PID"
if kill -0 "$SERVER_PID" 2>/dev/null; then
	echo "run API parity: scripted sidecar survived graceful shutdown" >&2
	exit 1
fi
SERVER_PID=

echo "PASS run_api_http_parity: scripted localhost sidecar stopped without a live provider"
