#!/usr/bin/env bash
set -euo pipefail

# Codex Web / cloud containers typically do not have Unity Editor available.
# This script sets up repo-local tooling that *can* run in a headless container,
# especially Beads (`bd`) which we use as an internal execution graph.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[setup] repo: $ROOT_DIR"

export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

persist_path() {
  local export_line='export PATH="$HOME/.local/bin:$HOME/bin:$PATH"'
  local profile_file="$HOME/.profile"

  if [[ -f "$profile_file" ]] && grep -q 'HOME/.local/bin' "$profile_file"; then
    return 0
  fi

  echo "[setup] ensuring PATH persistence in $profile_file"
  {
    echo ""
    echo "# Added by dream-of-one/scripts/setup_codex_web.sh"
    echo "$export_line"
  } >>"$profile_file"
}

ensure_cmd() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "[setup] missing required command: $name" >&2
    return 1
  fi
}

install_beads() {
  if command -v bd >/dev/null 2>&1; then
    echo "[setup] beads already installed: $(command -v bd)"
    return 0
  fi

ensure_cmd curl
  echo "[setup] installing beads (bd)..."

  # The upstream installer is maintained by the Beads project.
  # User-provided install method:
  #   curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
  local tmp
  tmp="$(mktemp -t beads-install.XXXXXX.sh)"
  curl -fsSL "https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh" -o "$tmp"
  bash "$tmp"
  rm -f "$tmp"

  export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
  if ! command -v bd >/dev/null 2>&1; then
    echo "[setup] beads install finished but 'bd' is not on PATH." >&2
    echo "[setup] expected locations: $HOME/.local/bin/bd or $HOME/bin/bd" >&2
    exit 1
  fi

  echo "[setup] beads installed: $(command -v bd)"
}

install_python_deps() {
  if [[ ! -f "$ROOT_DIR/scripts/skills/validate_skills.py" ]]; then
    return 0
  fi

  ensure_cmd python3
  if ! python3 -m pip --version >/dev/null 2>&1; then
    echo "[setup] warning: python3 pip is unavailable; skipping python deps install." >&2
    return 0
  fi
  if python3 -c "import yaml" >/dev/null 2>&1; then
    echo "[setup] python dependency OK: pyyaml"
    return 0
  fi

  echo "[setup] installing python dependency: pyyaml"
  python3 -m pip install --user --quiet pyyaml
}

prime_beads_repo() {
  if [[ ! -d "$ROOT_DIR/.beads" ]]; then
    echo "[setup] warning: .beads/ not found in repo. Skipping 'bd prime'." >&2
    return 0
  fi

  # Prime Beads cache/daemon as needed. This should be safe in headless envs.
  # Any runtime artifacts (db/log/sock) are ignored by .beads/.gitignore.
  echo "[setup] beads: bd prime"
  if ! (cd "$ROOT_DIR" && bd prime >/dev/null); then
    echo "[setup] warning: 'bd prime' failed (non-fatal). You can still use 'bd' manually." >&2
  fi
}

main() {
  persist_path
  install_beads
  install_python_deps
  prime_beads_repo

  echo "[setup] done"
  bd --version || true
}

main "$@"
