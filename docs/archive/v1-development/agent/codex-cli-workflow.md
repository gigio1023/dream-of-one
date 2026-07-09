# Codex CLI Workflow

Use Linear as the Work SoT.

## Classification

| Class | Scope | Verification |
|---|---|---|
| Godot local | `godot/**`, runtime scenes/scripts/data | Godot headless import/smoke/evidence scripts |
| Backend local | `backend/npc-runtime/**` | `npm run check --prefix backend/npc-runtime` |
| Docs/planning | Markdown and issue text | Link checks plus relevant backend/Godot command when behavior is described |

## Provider Auth

Codex CLI login is useful for agent work. Dream of One's default live-LLM
provider mode is direct `openai-codex`, not `codex exec` and not a hidden
`OPENAI_API_KEY` replacement.

Useful local checks:

```bash
codex login status
npm run openai-codex:login --prefix backend/npc-runtime
npm run openai:proposal-smoke --prefix backend/npc-runtime
OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai:proposal-smoke --prefix backend/npc-runtime
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.005 OPENAI_CODEX_SOCIAL_PROBE_TOTAL_ESTIMATED_COST_USD=0.01 OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai-codex:social-probe --prefix backend/npc-runtime
$GODOT_BIN --headless --path godot --script res://tools/live_provider_dispatch_smoke.gd
```

Do not treat ChatGPT/Codex login as proof that the game runtime can call live
models. The checked-in smoke defaults to `openai-codex`; live proof still
requires a configured `OPENAI_CODEX_ACCESS_TOKEN`, `OPENAI_CODEX_API_KEY`, or
`OPENAI_CODEX_AUTH_STORE_PATH`.

The device-login helper is the OpenClaw-style path for headless machines. It
prints a device URL/code and saves a per-device ignored auth profile. Do not
copy token material or absolute auth-store paths into tracked files.

Model policy for the Codex-provider path:

- use `gpt-5.4-mini`;
- request low reasoning effort;
- do not configure fallback models by default;
- keep provider response storage off by default; same-NPC continuity should use
  backend-owned workspace memory unless a separate live proof changes this;
- do not use `gpt-5.4-nano` or `gpt-5-nano` through `openai-codex` until live
  Codex-provider discovery proves they are available there.

The active assessment is
`.game-harness/provider/openclaw-codex-auth-adoption-proposal-2026-05-18.md`.
Backend live proof and usage accounting are recorded in
`.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md`.
The Godot smokes prove NPC-to-NPC route-context dispatch and same-NPC local
memory continuity; they do not change `fallback_only_m1` product truth.
Use `npm run openai-codex:usage --prefix backend/npc-runtime` before any new
live provider run to summarize checked-in Godot live-artifact spend without
calling the provider.

Do not add legacy engine work back into the active tree.
