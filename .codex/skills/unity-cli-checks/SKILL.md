---

name: unity-cli-checks
description: "Batchmode checks for Unity projects: run diagnostics, playmode smoke tests, and interpret logs with clear exit codes."
---

# Unity CLI Checks

## When to use
- Running headless checks (CI or local batchmode).
- Need consistent exit codes and log files.

## Workflow
1. Run editor diagnostics first and fail fast on errors.
2. Run playmode smoke test and collect runtime errors.
3. Save logs to `logs/` with clear names.
4. Interpret exit codes: 0 OK, 1 errors, 2 timeout.

## Outputs
- `logs/editor-diagnostics.log`
- `logs/playmode-smoke.log`

## Guardrails
- If project is already open, avoid batchmode and instruct to rely on editor-side preflight.
