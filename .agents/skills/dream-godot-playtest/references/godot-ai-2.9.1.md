# Godot AI 2.9.1 Capability Map

Read this reference when mapping the portable playtest workflow to the
configured Godot AI server. Tool names below are unqualified because Codex and
Claude Code may add different MCP prefixes.

## Pinned provenance

- `plugin.cfg` and the spawned Python package report `2.9.1`.
- The vendored editor add-on uses upstream commit
  [`0ffbce6ef167e4f22e8d0674181ad06d9feeae79`](https://github.com/hi-godot/godot-ai/commit/0ffbce6ef167e4f22e8d0674181ad06d9feeae79),
  observed on upstream `main` on 2026-07-11.
- Before Dream's local helper patch, that upstream baseline is not
  byte-identical to tag `v2.9.1` (`6cdd3573…`): the post-tag snapshot changes
  only `client_configurator.gd`, `dock_panels/log_viewer.gd`, and `mcp_dock.gd`.
  The repository names the actual owner-provided baseline instead of pretending
  it is the tag.
- Dream carries one narrow patch on that baseline: a one-character key string
  also fills `InputEventKey.unicode` on its pressed event. The first-person
  controller separately derives logical motion from consecutive absolute
  positions when the helper supplies neither relative field. Both remain on
  the generic `Input.parse_input_event` path; neither mutates game truth.
- The editor spawns `godot-ai==2.9.1` over loopback. Ports and client config are
  per-device state and must never be committed.

## Core capability routing

| Need | Unqualified operation | Evidence to require |
| --- | --- | --- |
| Enumerate exact editors | `session_manage(op="list")` | canonical project path, session id, Godot/plugin/server versions, readiness, play state |
| Pin one editor | per-call `session_id`, or `session_activate` after an unambiguous list | returned active session matches the checkout |
| Read editor/run readiness | `editor_state` | `readiness`, `game_status.status`, `helper_live`, current scene |
| Inspect scene structure | `scene_get_hierarchy`, `node_get_properties`, `node_find` | requested node/path and current serialized/runtime values |
| Read diagnostics | `logs_read(source="editor"|"game"|"all", include_details=true)` | current run id/cursor, new errors and warnings |
| Launch helper or authorized play | `project_run(autosave=false)` unless saving is the task | `game_status.status="live"`, `helper_live=true`, no new launch errors |
| Stop a run | `project_manage(op="stop")` | `stopped=true`, readiness returns to editor-ready |
| Inspect a running game | `game_manage` read operations | helper-live state and the requested runtime/UI nodes |
| Send authorized player input | `game_manage` bounded input operations | resulting semantic/player-visible state, not call success alone |
| Capture the view | `editor_screenshot` | correct editor/game target, scene, viewport, and exercised state |
| Change scenes/resources | scene/node/resource operations with undo/save, or file edits for broad text | saved diff plus import/load evidence |

Use `project_run` only as allowed by the main skill's route gate. During
implementation it may establish the game-helper handshake without player
input; hands-on play remains reserved for the executor named by the current
verification contract.

For first-person look, send one position-only mouse-motion baseline followed
by bounded absolute-position motions; `Player3D` derives the missing logical
delta only when both relative fields are zero. For committed native-script
text, send one Unicode character per `input_key` press/release pair. This does
not emulate OS IME preedit/commit and must not be reported as IME composition.

## State semantics

- `readiness="ready"` means the editor can accept applicable commands.
- `game_status.status="launching"` permits one bounded poll.
- `game_status.status="live"` plus `helper_live=true` proves the game helper
  connected for the current run.
- `status="break"` requires diagnostics and stop; do not continue input.
- `status="no_helper"` blocks helper-dependent input, capture, and runtime-tree
  claims even if the process launched.
- `play_state="stopped"` with `helper_expected=true` is a healthy editor, not a
  running-game result.

The MCP initialization payload may expose `serverInfo.version` from FastMCP
rather than the Godot AI package. Use session/status metadata for the required
plugin/server package version.

## Missing tool exposure

If the server and editor connect but the current harness did not load callable
Godot AI tools, refresh discovery once or enter a fresh harness session while
the server is already available. A direct loopback status/initialize probe may
diagnose the integration, but it is not accepted for scene mutation, capture
evidence, helper execution, or play. It must never bypass the executor,
authority, or provider gates. If native tool calling remains unavailable after
the one recovery pass, report the integration layer unavailable and block the
spatial/UI completion claim.
