---
name: swarm-execution
description: Aggressively parallelize work with sub-agents (explorer/worker) and batch tool calls. Use when tasks span multiple files or systems.
---

# Swarm Execution

## Purpose
Split non-trivial work across sub-agents to accelerate discovery, drafting, and implementation.

## Workflow
1) Decide splits
- Identify parallelizable slices (docs vs code vs tests, systems vs UI).

2) Spawn agents
- Use `explorer` for codebase discovery.
- Use `worker` for implementation in isolated file scopes.
- Provide clear ownership per agent (files and responsibility).

3) Parallelize tools
- Use `multi_tool_use.parallel` for independent tool calls.
- Batch repetitive Unity MCP or file operations when possible.

4) Integrate
- Collect summaries + file paths.
- Resolve conflicts and apply final edits locally.

## Guardrails
- Avoid overlapping file edits across agents.
- Keep agent output concise (paths + decisions + TODOs).

## Example
- Explorer maps LLM code paths while Worker drafts docs; integrate results into final PR.
