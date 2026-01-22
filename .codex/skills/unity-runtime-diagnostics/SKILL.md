---

name: unity-runtime-diagnostics
description: "Runtime diagnostics workflow: event probes, error capture, and automatic summary logging during Play."
---

# Unity Runtime Diagnostics

## When to use
- Need zero-error Play sessions.
- Debugging runtime-only failures.

## Workflow
1. Inject a runtime error probe in Play.
2. Capture error counts and sample messages.
3. Exit Play and summarize results.
4. Feed results back into preflight gates.

## Guardrails
- Do not swallow errors; always surface them.
