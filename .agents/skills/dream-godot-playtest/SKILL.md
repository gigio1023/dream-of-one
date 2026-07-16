---
name: dream-godot-playtest
description: Use when operating, playtesting, or live-debugging Dream of One through its configured Godot AI integration, including runtime captures, scene-tree inspection, bounded player input, or reproducing a player-facing Godot issue. NOT for code-only Godot changes without a live run (dream-godot-client), backend-only checks (dream-npc-runtime), or OS-window testing outside Godot AI.
---

# Dream of One — Godot Playtest

Use the configured Godot AI editor integration to inspect or, when the current
verification contract explicitly permits it, drive Dream of One. The project
contract lives in `docs/tech/godot-ai-playtest.md`; executor and live-provider
routing lives in `docs/tech/verification.md`. Read both before starting a run.

## Route Before Connecting

- A review or status request is read-only. Inspect an already connected editor
  and logs; do not launch, input, save, reload, or mutate state.
- During M3R implementation, use only non-play inspection: session/readiness,
  scene hierarchy, properties, logs, and non-player-controlled helper
  handshake or snapshots. Stop the run without sending game input.
- Hands-on game driving is allowed only when the current verification document
  or an executable handoff packet designates this agent as the play executor.
  Apply its exact model/provider preflight; missing credentials or forbidden
  provider interruption is a blocker, never permission to substitute.
- A build/fix request permits in-scope editor mutations and non-destructive
  checks, but not plugin installation, client reconfiguration, provider-secret
  access, publishing, or changes to backend-owned game truth.

## Session Preflight

1. Resolve the repository root from Git and select the editor whose canonical
   project path is that checkout's `godot/` directory. Never select by project
   name alone.
2. Require Godot 4.7.x, the pinned editor snapshot, plugin and server package
   2.9.1, the expected game-helper autoload, and editor `readiness=ready`.
   Route every call by session id when more than one editor exists.
3. Read `references/godot-ai-2.9.1.md` for the unqualified capability mapping;
   harnesses may expose different MCP prefixes.
4. Inspect the current play state and diagnostic cursor before the first
   stateful operation. A stale running or debugger-break state must be handled
   deliberately, not mistaken for a fresh test.
5. Launch an agent-owned editor with Godot AI telemetry disabled. Do not commit
   the per-device setting or restart a user-owned editor merely to change it.

## Non-Play Implementation Path

Use the narrowest read that answers the implementation question. If the game
helper itself must be verified, launch in the required model-free fixture mode,
wait boundedly for `game_status.status=live` and `helper_live=true`, read only
the necessary snapshot/log state, then stop without input. This proves the
control surface, not gameplay, visuals, fun, or LLM behavior.

Prefer files and the Godot CLI for code, bulk resources, import, and smokes.
Use the live editor for scene-owned structure, inspector state, logs, and
captures that a file check cannot establish. Never use runtime evaluation to
manufacture a state that a later playtest is meant to reach.

## Authorized Play Path

When the routing gate authorizes actual play:

1. Perform the provider and credential preflight from
   `docs/tech/verification.md` without printing secret values.
2. Launch the main project and require a live helper. Read the initial semantic
   snapshot and capture only when visual context matters.
3. Drive generic bounded actions. Check semantic state and logs at meaningful
   transitions rather than after every frame.
4. Require player-visible consequences plus returned provider metadata; process
   readiness alone never proves the selected live model or an uninterrupted run.
5. Capture the exercised state, read new editor/game errors with details, and
   stop the run unless the user explicitly asked to leave it open.

Godot AI input must use the same UI/action path as a player. It may never call
the sidecar directly, set suspicion or stance, create records, force a verdict,
or end a run through a debug mutation.

## Bounded Recovery

On connection or helper failure, make one recovery pass: refresh sessions,
confirm the exact editor/root/version, inspect plugin/server state, poll one
documented readiness window, and relaunch one run only when no code change is
needed. If the same prerequisite remains absent, stop and report the failed
layer and strongest available file/CLI evidence.

Do not reinstall the plugin, rewrite client configuration, restart a
user-owned editor, switch to screen-coordinate automation, or silently weaken
the required executor/provider route.

## Evidence and Output

Lead with the observed outcome. Report the selected project/session, Godot and
plugin/server versions, play/helper state, exact interaction or non-play scope,
new errors, captures when required, provider provenance for live play, and
whether the run was stopped. Label unobserved visual, gameplay, or model claims
blocked or inconclusive rather than inferring a pass.

## Gotchas

- The vendored editor snapshot is pinned separately from the 2.9.1 Python
  server package; use the exact provenance in the reference.
- `serverInfo.version` may report the FastMCP framework version. The Godot AI
  package version comes from session/status metadata.
- `helper_expected=true` is not `helper_live=true`; stopped editor readiness is
  not a playable run.
- Fixture/helper checks are model-free engineering evidence and never satisfy
  M3R's final live acceptance or fun gate.
