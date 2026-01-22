---

name: unity-preflight-gate
description: "Run preflight validation before Play or CLI runs: aggregate diagnostics, city build/material fixes, input scans, and block Play if errors exist."
---

# Unity Preflight Gate

## When to use
- Need a repeatable preflight check before entering Play mode or running CLI checks.
- Want to block Play if required assets, fonts, or input config are invalid.

## Workflow
1. Run editor diagnostics and capture errors/warnings.
2. Ensure city layout/build step ran (if applicable) and materials are fixed.
3. Scan scripts for legacy Input usage when Input System is active.
4. Aggregate results and write a log file under `logs/`.
5. If errors exist, prevent Play or fail the CLI run.

## Outputs
- A single summary list of errors/warnings/info.
- Optional log file path for CI or handoff.

## Guardrails
- Never enter Play if errors are present.
- Keep the preflight deterministic and idempotent.
