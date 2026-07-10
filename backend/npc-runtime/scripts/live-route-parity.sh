#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RUNTIME_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(CDPATH= cd -- "$RUNTIME_DIR/../.." && pwd)
PORT=${DREAM_SESSION_PORT:-18787}
GODOT_BIN=${GODOT_BIN:-}
LOG_FILE=${TMPDIR:-/tmp}/dream-of-one-npc-runtime-$$.log
GODOT_HOME=${TMPDIR:-/tmp}/dream-of-one-godot-home

if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then
	echo "GODOT_BIN must name an executable Godot binary" >&2
	exit 2
fi

cleanup() {
	if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
	rm -f "$LOG_FILE"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$GODOT_HOME"
(
	cd "$RUNTIME_DIR"
	PORT=$PORT bun run serve
) >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

attempt=0
until curl --fail --silent "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; do
	attempt=$((attempt + 1))
	if ! kill -0 "$SERVER_PID" 2>/dev/null; then
		cat "$LOG_FILE" >&2
		exit 1
	fi
	if [ "$attempt" -ge 80 ]; then
		cat "$LOG_FILE" >&2
		echo "live parity: sidecar did not become healthy" >&2
		exit 1
	fi
	sleep 0.1
done

HOME="$GODOT_HOME" \
	DREAM_SESSION_MODE=http \
	DREAM_SESSION_URL="http://127.0.0.1:$PORT" \
	"$GODOT_BIN" --headless --path "$REPO_DIR/godot" --script res://tools/route_smoke.gd

echo "live_route_parity sidecar_pid=$SERVER_PID routes=4 result=PASS"
