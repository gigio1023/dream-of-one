# Verifying Unity (Headless) in Codex Web

This document describes a CI-style workflow to validate that the Unity project:
- compiles (including packages),
- passes editor diagnostics/preflight checks,
- and can enter Play Mode briefly without runtime errors,

in a cloud/container environment (Codex Web) where Unity may not be installed beforehand.

Goal: not "Unity GUI editing", but fast signal on "does the project build/run cleanly?".

## Assumptions

- Unity version: `6000.2.10f1` (project pinned)
- Project path (repo root relative): `draem-of-one/`
- Prototype scene: `Assets/Scenes/Prototype.unity`
- In Codex Web, network may be disabled after Setup, so package restore/resolve must finish during Setup.

## Codex Web configuration (copy/paste)

### Container image

For diagnostics/smoke only:

- Recommended: `unityci/editor:ubuntu-6000.2.10f1-base-3.2.1`

If you later need Linux builds:

- Example: `unityci/editor:ubuntu-6000.2.10f1-linux-il2cpp-3.2.1`

### Environment variables

- `UNITY_PROJECT_PATH=/workspace/draem-of-one`
- `UNITY_LOGS_DIR=/workspace/unity-logs`

### Secrets (sensitive)

Store the Unity license as a secret and materialize it during Setup.

- Recommended: `UNITY_LICENSE_BASE64` = base64-encoded contents of `Unity_lic.ulf`
- Alternative: `UNITY_LICENSE` = raw `Unity_lic.ulf` contents (multiline)

### Container caching

Enable caching. Unity's first import/package resolve is expensive; caching dramatically speeds up subsequent runs.

## Setup script (copy/paste)

This script:
1) installs minimal OS deps,
2) writes the Unity license file (without printing secrets),
3) removes `Library/` and `Temp/` to avoid host/editor mismatch issues,
4) runs editor diagnostics/preflight (package resolve + compile + scene/resource checks),
5) runs a short Play Mode smoke test to catch runtime errors.

```bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

PROJECT_PATH="${UNITY_PROJECT_PATH:-/workspace/draem-of-one}"
LOGS_DIR="${UNITY_LOGS_DIR:-/workspace/unity-logs}"

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates git git-lfs curl jq ripgrep xvfb

git lfs install || true

# Unity binary (unityci/editor images usually provide unity-editor)
if command -v unity-editor >/dev/null 2>&1; then
  UNITY_BIN="unity-editor"
elif [ -x /opt/unity/Editor/Unity ]; then
  UNITY_BIN="/opt/unity/Editor/Unity"
else
  echo "ERROR: Unity executable not found in image." >&2
  exit 1
fi

# Write license file (do NOT echo secrets)
mkdir -p "$HOME/.local/share/unity3d/Unity"
LICENSE_PATH="$HOME/.local/share/unity3d/Unity/Unity_lic.ulf"

if [ -n "${UNITY_LICENSE_BASE64:-}" ]; then
  echo "$UNITY_LICENSE_BASE64" | base64 -d > "$LICENSE_PATH"
elif [ -n "${UNITY_LICENSE:-}" ]; then
  printf '%s' "$UNITY_LICENSE" > "$LICENSE_PATH"
else
  echo "ERROR: Missing Unity license secret. Set UNITY_LICENSE_BASE64 (recommended) or UNITY_LICENSE." >&2
  exit 2
fi

mkdir -p "$LOGS_DIR"

# Recommended: regenerate Library/Temp on the container OS/editor to avoid incompatibilities.
rm -rf "$PROJECT_PATH/Library" "$PROJECT_PATH/Temp" || true

# 1) Editor preflight/diagnostics (package resolve + compile + scene/resource checks)
#    Fails the setup step if errors are detected.
xvfb-run -a "$UNITY_BIN" -batchmode -nographics \
  -projectPath "$PROJECT_PATH" \
  -executeMethod DreamOfOne.Editor.CLIRunner.RunEditorDiagnostics \
  -logFile "$LOGS_DIR/preflight.log"

# 2) (Optional) Playmode smoke (short timeout; catches runtime errors)
xvfb-run -a "$UNITY_BIN" -batchmode -nographics \
  -projectPath "$PROJECT_PATH" \
  -executeMethod DreamOfOne.Editor.CLIRunner.RunPlaymodeSmokeTest \
  -logFile "$LOGS_DIR/playmode-smoke.log"
```

## Unity entry points used

- `DreamOfOne.Editor.CLIRunner.RunEditorDiagnostics`
  - Runs preflight validation and exits non-zero on errors.
- `DreamOfOne.Editor.CLIRunner.RunPlaymodeSmokeTest`
  - Enters Play Mode briefly and fails on runtime errors (default timeout ~25s).

Code locations:

- `draem-of-one/Assets/Editor/CLI/CLIRunner.cs`
- `draem-of-one/Assets/Editor/PreflightValidator.cs`

## Logs / troubleshooting

- Logs:
  - `unity-logs/preflight.log`
  - `unity-logs/playmode-smoke.log`
- If Codex Web disables network after Setup, ensure package resolve/import completes during Setup and is cached.
- If you depend on Git-based UPM packages (e.g. `com.coplaydev.unity-mcp`), Setup must run with network enabled.

