# Godot Worker Packet

Complete every field that changes behavior. Delete commentary and unused
options before launch.

```text
Outcome: <one observable result this worker must produce>

Requested native worker route: <current owner/runtime policy>.
Runtime selection evidence: <native selector/config if the owner explicitly
requires a pin; otherwise state that the inherited/default native route is
accepted>. A model name in this packet is not proof of a runtime pin.
Lead session: remains unchanged.

Authority mode: <inspect | play | implement>

Repository state:
- Root: resolve with Git; do not embed an absolute path in tracked files.
- Branch/commit: <current branch and HEAD>
- Existing changes: <dirty files the worker must preserve>
- Owned files: <none for inspect/play, exact paths for implement>
- Forbidden files/actions: <scope exclusions and user-owned files>

Required reading:
- AGENTS.md and docs/README.md
- .agents/skills/dream-godot-delegation/SKILL.md
- .agents/skills/dream-godot-playtest/SKILL.md
- docs/tech/verification.md
- docs/tech/godot-ai-playtest.md
- <task-specific docs/source>

Objective context: <accepted facts, current blocker, and why this run is needed>

Godot route:
- Use native godot-ai MCP only; no curl, loopback client, or Computer Use.
- Match the editor by canonical <repo>/godot path and route every call by exact
  session id.
- Verify Godot 4.7.x and plugin/server 2.9.1 before stateful work.
- Launch mode/provider: <fixture inspection | live
  modelscope/qwen3.7-plus, zero fallback>.
- This worker exclusively owns any run it starts and must stop it before exit.

Actions allowed: <bounded reads, input sequence, or exact implementation scope>
Actions forbidden: <player input for inspect, source edits for play,
backend truth mutation, editor restart/quit, secret printing, staging/commit>

Required evidence:
- <semantic snapshot fields or UI transitions>
- <captures, if the task makes a visual claim>
- new editor/game errors with details
- fixture/live provider provenance and fallback status
- final run stopped state

Mechanical checks: <only checks relevant to this packet>

Output:
- requested native worker route, available runtime-selection evidence, and
  selected session/version preflight
- chronological observations that decide the result
- files changed/checks run, if authorized
- pass | fail | inconclusive | blocked
- remaining risk and smallest next action

Stop when: the required evidence decides the objective, one bounded recovery
fails, another process takes run ownership, or continuing would exceed this
packet's authority. Do not broaden scope to manufacture a pass.
```
