# Codex CLI Workflow

Use Linear as the Work SoT.

## Classification

| Class | Scope | Verification |
|---|---|---|
| Godot local | `godot/**`, runtime scenes/scripts/data | Godot headless import/smoke/evidence scripts |
| Backend local | `backend/npc-runtime/**` | `npm run check --prefix backend/npc-runtime` |
| Docs/planning | Markdown and issue text | Link checks plus relevant backend/Godot command when behavior is described |

## Provider Auth

Codex CLI login is useful for agent work. Dream of One's active future
live-LLM target is a direct `openai-codex` proposal provider, not `codex exec`
and not a hidden `OPENAI_API_KEY` replacement.

Useful local checks:

```bash
codex login status
npm run openai:proposal-smoke --prefix backend/npc-runtime
OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Do not treat ChatGPT/Codex login as proof that the game runtime can call live
models. The checked-in smoke currently covers the legacy `openai-api` gateway;
do not claim `openai-codex` behavior until a Codex-provider smoke verifies the
configured auth profile, model, and budget.

Model policy for the Codex-provider path:

- use `gpt-5.4-mini`;
- request low reasoning effort;
- do not configure fallback models by default;
- do not use `gpt-5.4-nano` or `gpt-5-nano` through `openai-codex` until live
  Codex-provider discovery proves they are available there.

The active assessment is
`.game-harness/provider/openclaw-codex-auth-adoption-proposal-2026-05-18.md`.

Do not add legacy engine work back into the active tree.
