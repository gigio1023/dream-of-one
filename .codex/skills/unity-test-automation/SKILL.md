---

name: unity-test-automation
description: "Automate Unity tests: editmode/playmode tests, smoke runner, and log-based error capture."
---

# Unity Test Automation

## When to use
- Need repeatable tests in CI or local runs.

## Workflow
1. Run editmode tests first.
2. Run playmode smoke test with runtime error probe.
3. Parse logs for errors and fail on first error.
4. Write summary report under logs/.

## Guardrails
- Keep tests deterministic; avoid time-sensitive flakiness.
