#!/usr/bin/env bash
set -euo pipefail

endpoint="${LINEAR_GRAPHQL_ENDPOINT:-https://api.linear.app/graphql}"
token="${LINEAR_API_TOKEN:-${LINEAR_TOKEN:-${LINEAR_API_KEY:-}}}"

if [[ -z "${token}" ]]; then
  echo "Missing LINEAR_API_TOKEN (or LINEAR_TOKEN / LINEAR_API_KEY)." >&2
  exit 2
fi

query=""
variables_json="{}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/linear_graphql.sh --query '<graphql>' [--variables '{"k":"v"}']
  bash scripts/linear_graphql.sh --query-file path/to/query.graphql [--variables '{"k":"v"}']

Env:
  LINEAR_API_TOKEN (preferred) or LINEAR_TOKEN / LINEAR_API_KEY
  LINEAR_GRAPHQL_ENDPOINT (default: https://api.linear.app/graphql)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --query)
      query="$2"
      shift 2
      ;;
    --query-file)
      query="$(cat "$2")"
      shift 2
      ;;
    --variables)
      variables_json="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${query}" ]]; then
  echo "Missing --query or --query-file." >&2
  usage >&2
  exit 2
fi

payload="$(
  LINEAR_QUERY="${query}" LINEAR_VARIABLES="${variables_json}" python3 - <<'PY'
import json
import os
import sys

query = os.environ.get("LINEAR_QUERY", "")
variables_raw = os.environ.get("LINEAR_VARIABLES", "{}")

try:
    variables = json.loads(variables_raw)
    if not isinstance(variables, dict):
        raise ValueError("variables must be a JSON object")
except Exception as e:
    print(f"Invalid --variables JSON: {e}", file=sys.stderr)
    sys.exit(2)

print(json.dumps({"query": query, "variables": variables}))
PY
)"

curl -sS -X POST "${endpoint}" \
  -H "Content-Type: application/json" \
  -H "Authorization: ${token}" \
  -d "${payload}"

