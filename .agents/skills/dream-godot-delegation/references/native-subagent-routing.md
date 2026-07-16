# Native Subagent Routing

The normal path stays inside the current Codex or Claude session. Use its native
subagent, task, thread, or team primitive; do not start another agent CLI.

## Codex Adapter

From a Codex parent turn, create the Godot worker with the collaboration
`spawn_agent` capability. This is a direct harness call: do not invoke it
through a shell command or use `codex exec` to create a second Codex process.
Keep the lead session unchanged. Apply an explicit model/effort selector only
when the current spawn surface exposes one and the owner requires it; otherwise
use the accepted native child route from `docs/tech/verification.md`. The
returned child agent id owns the assigned Godot run.

- Use `followup_task` to continue work with that same child after it becomes
  idle and still owns the run.
- Use `send_message` only to add context to a child that is already running.
- Use `interrupt_agent` when the objective, authority, or required worker lane
  changes and the current child must stop.
- Use a newly spawned child for a fresh isolated run after the previous child
  has stopped its worker-owned game run.

These collaboration primitives are the Codex harness adapter, not part of the
portable Godot contract. Claude uses its own native task or team primitive with
the same ownership and evidence rules.

## Capability Preflight

Before assigning a live run, determine separately:

1. whether a fresh native worker can see the configured Godot AI MCP tools;
2. whether the current owner/runtime policy accepts the harness's native child;
3. when an exact independent pin is required, whether the spawn surface exposes
   and confirms that model/effort selection.

Do not infer one capability from another. A child seeing Godot AI does not prove
its model/effort. Prompt prose or a matching task name is never pinning evidence.

## Model Routing

- Keep the lead/main session on its current model.
- Follow the current owner policy in `docs/tech/verification.md`; the current
  Codex default is GPT-5.6 Sol ultra for delegated diagnosis and hands-on play.
- After implementation and self-review, select a fresh native worker and give
  it the closed play packet.
- Do not use `lower-capability-executor-prompt` unless the owner explicitly asks
  for it. Do not switch the parent, write a model name into the prompt and
  pretend it changed the worker, or use an external agent CLI.

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
tools, report the native-delegation blocker. If the owner explicitly required a
runtime pin and the harness cannot prove it, report that separate blocker. Do
not switch automatically to `codex exec`, curl, or Computer Use.

## Completion

The worker stops only the run it started and returns a compact result. The lead
checks the final editor play state, worker artifact or diff, and material claims
before closing the worker. Fixture inspection cannot stand in for an authorized
live play run.
