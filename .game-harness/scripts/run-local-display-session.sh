#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
STATE_DIR="${DREAM_OF_ONE_DISPLAY_STATE_DIR:-$REPO_ROOT/build/display-session}"
DISPLAY_NUMBER="${DREAM_OF_ONE_DISPLAY_NUMBER:-99}"
DISPLAY_VALUE=":$DISPLAY_NUMBER"
GEOMETRY="${DREAM_OF_ONE_DISPLAY_GEOMETRY:-1280x720x24}"
VNC_HOST="${DREAM_OF_ONE_VNC_HOST:-127.0.0.1}"
VNC_PORT="${DREAM_OF_ONE_VNC_PORT:-5900}"
NOVNC_HOST="${DREAM_OF_ONE_NOVNC_HOST:-127.0.0.1}"
NOVNC_PORT="${DREAM_OF_ONE_NOVNC_PORT:-6080}"
NOVNC_WEB_ROOT="${NOVNC_WEB_ROOT:-/usr/share/novnc}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [start|stop|status|env]

Starts a local Xvfb + fluxbox + x11vnc + noVNC display stack for observed
fresh-player sessions on a headless facilitator machine.

The noVNC listener binds to 127.0.0.1 by default. Use an SSH tunnel or another
explicitly secured access path for testers.
EOF
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    exit 1
  fi
}

ensure_x11_socket_dir() {
  if [[ -d /tmp/.X11-unix && ! -O /tmp/.X11-unix ]]; then
    return 0
  fi
  if [[ -d /tmp/.X11-unix ]]; then
    if command -v stat >/dev/null 2>&1 && [[ "$(stat -c '%u:%g:%a' /tmp/.X11-unix 2>/dev/null || true)" == "0:0:1777" ]]; then
      return 0
    fi
    if sudo -n true >/dev/null 2>&1; then
      sudo chown root:root /tmp/.X11-unix
      sudo chmod 1777 /tmp/.X11-unix
      return 0
    fi
    echo "X socket directory /tmp/.X11-unix is not root-owned 1777; fix it or rerun from a sudo-capable shell." >&2
    exit 1
  fi
}

pid_alive() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file")"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

write_env_file() {
  cat > "$STATE_DIR/env.sh" <<EOF
export DISPLAY=$DISPLAY_VALUE
export DREAM_OF_ONE_DISPLAY_STATE_DIR=$STATE_DIR
EOF
}

display_path() {
  local path="$1"
  if [[ "$path" == "$REPO_ROOT" ]]; then
    printf "."
  elif [[ "$path" == "$REPO_ROOT/"* ]]; then
    printf "%s" "${path#"$REPO_ROOT"/}"
  else
    printf "%s" "$path"
  fi
}

print_status() {
  echo "Display session state: $STATE_DIR"
  for name in xvfb fluxbox x11vnc websockify; do
    if pid_alive "$STATE_DIR/$name.pid"; then
      echo "- $name: running pid $(cat "$STATE_DIR/$name.pid")"
    else
      echo "- $name: stopped"
    fi
  done
  echo "- DISPLAY: $DISPLAY_VALUE"
  echo "- noVNC local URL: http://$NOVNC_HOST:$NOVNC_PORT/vnc.html"
  echo "- env: source $(display_path "$STATE_DIR/env.sh")"
}

start_session() {
  require_command Xvfb
  require_command fluxbox
  require_command x11vnc
  require_command websockify
  require_command setsid
  ensure_x11_socket_dir
  if [[ ! -d "$NOVNC_WEB_ROOT" ]]; then
    echo "Missing noVNC web root: $NOVNC_WEB_ROOT" >&2
    echo "Set NOVNC_WEB_ROOT for this device." >&2
    exit 1
  fi
  mkdir -p "$STATE_DIR"
  if pid_alive "$STATE_DIR/xvfb.pid" || pid_alive "$STATE_DIR/x11vnc.pid" || pid_alive "$STATE_DIR/websockify.pid"; then
    echo "Display session already appears to be running."
    print_status
    exit 0
  fi

  setsid -f Xvfb "$DISPLAY_VALUE" -screen 0 "$GEOMETRY" -nolisten tcp >"$STATE_DIR/xvfb.log" 2>&1
  pgrep -n -f "Xvfb $DISPLAY_VALUE" > "$STATE_DIR/xvfb.pid"
  sleep 1

  DISPLAY="$DISPLAY_VALUE" setsid -f fluxbox >"$STATE_DIR/fluxbox.log" 2>&1
  pgrep -n -f "fluxbox" > "$STATE_DIR/fluxbox.pid"
  sleep 1

  setsid -f x11vnc -display "$DISPLAY_VALUE" -localhost -nopw -forever -shared -rfbport "$VNC_PORT" >"$STATE_DIR/x11vnc.log" 2>&1
  pgrep -n -f "x11vnc .* -rfbport $VNC_PORT" > "$STATE_DIR/x11vnc.pid"
  sleep 1

  setsid -f websockify --web "$NOVNC_WEB_ROOT" "$NOVNC_HOST:$NOVNC_PORT" "$VNC_HOST:$VNC_PORT" >"$STATE_DIR/websockify.log" 2>&1
  pgrep -n -f "websockify .* $NOVNC_HOST:$NOVNC_PORT" > "$STATE_DIR/websockify.pid"
  write_env_file
  print_status
}

stop_session() {
  mkdir -p "$STATE_DIR"
  for name in websockify x11vnc fluxbox xvfb; do
    if pid_alive "$STATE_DIR/$name.pid"; then
      kill "$(cat "$STATE_DIR/$name.pid")" >/dev/null 2>&1 || true
    fi
    rm -f "$STATE_DIR/$name.pid"
  done
  echo "Stopped display session: $STATE_DIR"
}

case "${1:-status}" in
  start)
    start_session
    ;;
  stop)
    stop_session
    ;;
  status)
    print_status
    ;;
  env)
    mkdir -p "$STATE_DIR"
    write_env_file
    cat "$STATE_DIR/env.sh"
    ;;
  --help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
