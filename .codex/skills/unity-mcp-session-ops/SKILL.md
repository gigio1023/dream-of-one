---

name: unity-mcp-session-ops
description: "Operate Unity via MCP: connect session, set active instance, read console, and run editor tools in a stable sequence."
---

# Unity MCP Session Ops

## When to use
- Need to drive Unity editor operations programmatically.
- Console read/clear, scene checks, or tool menu execution required.

## Workflow
1. Check session availability and set active instance.
2. Read or clear console before critical operations.
3. Execute editor tools (menu items) in a safe order.
4. Re-check console for new errors.

## Guardrails
- If no session is connected, fall back to CLI or editor-side automation.
- Avoid destructive scene changes without a save step.
