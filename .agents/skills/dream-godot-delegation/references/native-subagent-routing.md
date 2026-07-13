# Native Subagent Routing

The normal path stays inside the current Codex or Claude session. Use its native
subagent, task, thread, or team primitive; do not start another agent CLI.

## Codex Adapter

From a Codex parent turn, create the Godot worker with the collaboration
`spawn_agent` capability. This is a direct harness call: do not invoke it
through a shell command or use `codex exec` to create a second Codex process.
Keep the lead session unchanged. Select `sol_high_godot` for Sol-high work or
`terra_high_playtest` for Terra-high play. `.codex/config.toml` registers those
roles, and their relative config files pin `model` plus
`model_reasoning_effort`. The returned child agent id owns the assigned Godot
run. These role/config fields follow the official
[Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml).

- Use `followup_task` to continue work with that same child after it becomes
  idle and still owns the run.
- Use `send_message` only to add context to a child that is already running.
- Use `interrupt_agent` when the objective, authority, or required worker lane
  changes and the current child must stop.
- Use a newly spawned child for a fresh isolated run after the previous child
  has stopped its worker-owned game run.

These names are the Codex harness adapter, not part of the portable Godot
contract. Claude uses its own native task or team primitive with the same
ownership and evidence rules.

## Capability Preflight

Before assigning a live run, determine separately:

1. whether a fresh native worker can see the configured Godot AI MCP tools;
2. whether the trusted-project session exposes the required custom agent role;
3. whether that role's config file pins the exact model and effort.

Do not infer one capability from another. A child seeing Godot AI does not prove
its model/effort. Role selection plus the loaded role config is the Codex
pinning evidence; prompt prose or a matching task name is not.

## Model Routing

- Keep the lead/main session on its current model.
- Select `sol_high_godot` for implementation-time diagnosis and non-play
  inspection when delegation is warranted.
- After implementation and Sol self-review, select a fresh
  `terra_high_playtest` worker and give it the closed play packet.
- A session created before the repo role config existed may not expose the new
  role. Start one fresh session in this trusted project, then retry once. If the
  role is still absent, stop with the packet ready. Do not switch the parent,
  write a model name into the prompt and pretend it changed the worker, or use
  an external agent CLI.

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
before closing the worker. Actual Terra play remains a separately pinned worker
run; a Sol fixture inspection cannot stand in for it.
