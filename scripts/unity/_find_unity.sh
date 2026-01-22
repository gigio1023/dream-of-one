#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${UNITY_PATH:-}" && -x "${UNITY_PATH}" ]]; then
  echo "${UNITY_PATH}"
  exit 0
fi

if [[ -n "${UNITY_APP:-}" && -x "${UNITY_APP}" ]]; then
  echo "${UNITY_APP}"
  exit 0
fi

latest=""
for candidate in /Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity; do
  if [[ -x "$candidate" ]]; then
    latest="$candidate"
  fi
done

if [[ -n "$latest" ]]; then
  echo "$latest"
  exit 0
fi

echo "Unity executable not found. Set UNITY_PATH to Unity.app/Contents/MacOS/Unity" >&2
exit 1
