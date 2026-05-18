# Agent Runbook

## Loop

1. Pick or create one Linear issue.
2. Keep local work scoped to the selected Linear issue.
3. Implement against the Godot Runtime Path.
4. Run backend and Godot checks.
5. Record Evidence paths in Linear or the PR summary.

## Required Checks

```bash
npm run check --prefix backend/npc-runtime
$GODOT_BIN --headless --import --path godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/evidence_run.gd
$GODOT_BIN --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

## Test Style

Keep verification lean. Use Detroit-style tests that call the behavior boundary a player, Godot script, backend endpoint, provider packet, or Evidence validator would actually depend on.

Do:
- cover deterministic authority, schema compatibility, route evidence, player-visible consequence, provider boundaries, and regressions.
- use a fake only when the real dependency is outside the process, such as OpenAI, Godot CLI, time, filesystem, process execution, or HTTP.
- keep each new test readable enough that a reviewer can tell which game promise it protects.

Do not:
- mock a chain of internals to force a pass.
- assert private helper choreography when the output contract already proves the behavior.
- add wide matrices, fixture factories, or coverage padding unless a real game risk needs them.

## Provider Smoke

Use the budgeted smoke before claiming live provider behavior. The checked-in
command currently covers the legacy `openai-api` gateway:

```bash
npm run openai:proposal-smoke --prefix backend/npc-runtime
OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai:proposal-smoke --prefix backend/npc-runtime
```

The active future live-LLM target is a direct `openai-codex` provider with an
explicit auth profile, `gpt-5.4-mini`, low reasoning effort, no default model
fallbacks, and deterministic fallback on any provider failure. Do not claim
`openai-codex` behavior until a Codex-provider smoke exists and passes.

## Routing

- Local Godot work: use Codex locally with Godot CLI checks.
- Backend/docs work: cloud-safe if it does not require local Godot import artifacts.
- Historical engine behavior: use git history, not active-tree archive files.
