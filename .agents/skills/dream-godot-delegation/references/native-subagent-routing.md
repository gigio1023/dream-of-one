# Native Subagent Routing

The normal path stays inside the current Codex or Claude session. Use its native
subagent, task, thread, or team primitive; do not start another agent CLI.

## Codex Adapter

From a Codex parent turn, create the Godot worker with the collaboration
`spawn_agent` capability. This is a direct harness call: do not invoke it
through a shell command or use `codex exec` to create a second Codex process.
The returned child agent id owns the assigned Godot run.

- Use `followup_task` to continue work with that same child after it becomes
  idle and still owns the run.
- Use `send_message` only to add context to a child that is already running.
- Use `interrupt_agent` when the objective, authority, or required parent lane
  changes and the current child must stop.
- Use a newly spawned child for a fresh isolated run after the previous child
  has stopped its worker-owned game run.

These names are the Codex harness adapter, not part of the portable Godot
contract. Claude uses its own native task or team primitive with the same
ownership and evidence rules.

## Capability Preflight

Before assigning a live run, determine separately:

1. whether a fresh native worker can see the configured Godot AI MCP tools;
2. whether the spawn surface exposes a real model and reasoning-effort selector;
3. whether the worker can report a verifiable model/effort identity.

Do not infer one capability from another. In the current Codex surface, a fresh
native worker successfully called Godot AI session discovery, but the spawn
schema and worker tool registry exposed no model/effort selector or identity.

## Model Routing

- If native spawn supports model and effort fields, pin the requested Sol-high
  or Terra-high lane there and record the returned configuration.
- Otherwise, select the requested model/effort on the parent Codex session
  before invoking this skill. Spawn one native worker from that parent and
  describe its routing as inherited, not independently verified.
- A Sol parent handles implementation-time diagnosis and non-play inspection.
- After all implementation and Sol self-review, hand one closed run packet to a
  Terra-high parent. That parent spawns the native play worker.
- If the current parent is the wrong lane, stop with the packet ready. Do not
  write a model name into the prompt and pretend it changed the worker.

## Run Topology

Spawn exactly one Godot worker. Give it the complete packet from
`references/worker-packet.md`; a fresh worker may not inherit skills or earlier
conversation details. The worker first lists Godot sessions and reports the
canonical project match. Only then may it start its assigned run.

While it runs:

- the lead continues only disjoint file or reasoning work;
- no other agent calls Godot AI against that editor;
- send follow-up context to the same worker when its retained run ownership is
  still valid;
- interrupt it if the user changes objective, authority, or model lane;
- synthesize its result from native tool evidence rather than accepting the
  summary alone.

If a fresh worker lacks Godot AI, retry once with a newly spawned native worker
after confirming the editor/server is already available. If it still lacks the
tools, report the native-delegation blocker. Do not switch automatically to
`codex exec`, curl, or Computer Use.

## Completion

The worker stops only the run it started and returns a compact result. The lead
checks the final editor play state, worker artifact or diff, and material claims
before closing the worker. Actual Terra play remains a later, separately routed
run; a Sol fixture inspection cannot stand in for it.
