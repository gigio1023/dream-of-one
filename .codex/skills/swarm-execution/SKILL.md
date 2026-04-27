---
name: swarm-execution
description: Parallelize discovery, implementation, and review/check validation lanes with explorer/worker agents and batched tool calls.
---

# Swarm Execution

## Purpose
Split non-trivial work across sub-agents to accelerate discovery, implementation, and merge-readiness validation.

## Workflow
1) Decide splits
- Identify independent lanes (discovery, code, tests, review triage, checks monitoring).

2) Spawn agents
- Use `explorer` for codebase discovery.
- Use `worker` for implementation in isolated file scopes.
- Assign one owner for bot review triage using `validate-ai-review` logic when PR feedback exists.
- Provide clear ownership per agent (files and responsibility).

3) Parallelize tools
- Use `multi_tool_use.parallel` for independent tool calls.
- Batch repetitive Godot CLI/file operations and PR polling when possible.

4) Integrate
- Collect summaries + file paths.
- Ensure each actionable bot comment has a recorded decision (`valid/partial/invalid`) and follow-up status.
- Resolve conflicts and apply final edits locally.

5) Gate handoff
- Do not hand off to merge until required checks are green and actionable bot comments are addressed.

## Guardrails
- Avoid overlapping file edits across agents.
- Keep agent output concise (paths + decisions + blockers).
- Escalate immediately when lanes block each other.

## Example
- Explorer maps relevant files, Worker A implements, Worker B adds tests, Worker C triages bot comments; integrate once checks are green.
