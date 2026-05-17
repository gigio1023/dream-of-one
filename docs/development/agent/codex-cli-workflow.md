# Codex CLI Workflow

Use Linear as the Work SoT.

## Classification

| Class | Scope | Verification |
|---|---|---|
| Godot local | `godot/**`, runtime scenes/scripts/data | Godot headless import/smoke/evidence scripts |
| Backend local | `backend/npc-runtime/**` | `npm run check --prefix backend/npc-runtime` |
| Docs/planning | Markdown and issue text | Link checks plus relevant backend/Godot command when behavior is described |

## Provider Auth

Codex CLI login is useful for agent work, but Dream of One's runtime proposal provider uses `OPENAI_API_KEY`.

Useful local checks:

```bash
codex login status
npm run openai:proposal-smoke --prefix backend/npc-runtime
OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Do not treat ChatGPT/Codex login as proof that the game can call OpenAI API models. The live smoke must confirm the configured model and budget.

Do not add legacy engine work back into the active tree.
