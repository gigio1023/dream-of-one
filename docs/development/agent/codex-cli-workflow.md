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

Codex CLI auth may be explored only as a separate `codex-cli` provider mode,
not as hidden API-key replacement. The runtime must preflight Codex CLI/login,
invoke `codex exec` with a strict output contract, validate every proposal, and
fall back deterministically on missing login, timeout, invalid output, or
authority attempts. The active assessment is
`.game-harness/provider/codex-cli-auth-runtime-assessment-2026-05-18.md`.

Do not add legacy engine work back into the active tree.
