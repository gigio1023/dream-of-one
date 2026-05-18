# Agent Search Index

Status: active routing index
Last updated: 2026-05-19

Use this file when an agent needs to find the right source of truth quickly.
It exists so important runtime rules are not trapped in one deep document.

## Fast Route Table

| Search phrase or task | Read first | Then inspect |
|---|---|---|
| `codex auth`, `Codex auth`, `openai-codex auth`, `provider auth`, `game LLM auth` | `docs/development/ai-provider-runtime.md` | `backend/npc-runtime/src/config.ts`, `backend/npc-runtime/src/tools/openai-codex-device-login.ts`, `.game-harness/provider/openai-codex-provider-verification-2026-05-19.md` |
| `openai-codex`, `OpenAI Codex provider`, `Codex provider`, `ChatGPT/Codex provider` | `docs/development/ai-provider-runtime.md` | `backend/npc-runtime/src/broker/codex-tool-gateway.ts`, `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md` |
| `codex login`, `codex cli`, `codex exec`, `Codex CLI auth` | `docs/development/ai-provider-runtime.md` | `.game-harness/provider/codex-cli-auth-runtime-assessment-2026-05-18.md`, `docs/direction/03-director-decision-ledger.md` |
| `AI provider`, `LLM provider`, `proposal provider`, `NPC proposal`, `provider boundary` | `docs/development/ai-provider-runtime.md` | `docs/design/authority-map.md`, `docs/direction/15-agentic-social-simulation-model.md` |
| `provider output authority`, `LLM can decide`, `AI action`, `AI verdict` | `docs/design/authority-map.md` | `docs/development/ai-provider-runtime.md`, `docs/direction/00-game-thesis.md` |
| `gpt-5.4-mini`, `model availability`, `model fallback`, `nano model` | `docs/development/ai-provider-runtime.md` | `.game-harness/provider/openai-codex-model-policy-2026-05-18.md`, `docs/direction/06-release-strategy.md` |
| `live provider smoke`, `live LLM proof`, `provider usage`, `provider budget` | `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md` | `.game-harness/provider/openai-codex-provider-verification-2026-05-19.md`, `.game-harness/verification-ledger.md` |
| `Godot provider`, `PlayableSession provider`, `provider in game` | `docs/runtime/godot/README.md` | `godot/tools/live_provider_dispatch_smoke.gd`, `godot/tools/live_provider_thread_continuity_smoke.gd` |
| `add another provider`, `OpenAI SDK abstraction`, `future LLM` | `docs/development/ai-provider-runtime.md` | `backend/npc-runtime/src/config.ts`, `backend/npc-runtime/src/broker/codex-tool-gateway.ts` |

## AI Provider Search Tags

These exact tokens are intentionally repeated across active docs and code
comments:

- `AI_PROVIDER_SEARCH_INDEX`
- `GAME_RUNTIME_CODEX_AUTH`
- `OPENAI_CODEX_PROVIDER`
- `OPENAI_CODEX_PROVIDER_AUTH_STORE`
- `LLM_PROPOSAL_ONLY`
- `CODEX_CLI_IS_NOT_GAME_PROVIDER_AUTH`
- `DO_NOT_RUN_CODEX_LOGIN_FOR_GAME_PROVIDER_AUTH`

If a future agent searches any of those tokens, it should land on this index,
`docs/development/ai-provider-runtime.md`, `AGENTS.md`, or the backend provider
config.

## Canonical AI Provider Rule

Dream of One uses AI providers as bounded proposal workers. The current first
provider implementation is `openai-codex`.

`openai-codex` in this game means:

- backend proposal provider mode;
- Codex-compatible OAuth profile;
- repo-local ignored auth store;
- `https://chatgpt.com/backend-api/codex`;
- `gpt-5.4-mini`;
- low reasoning effort;
- no default model fallbacks.

`openai-codex` in this game does not mean:

- run `codex login`;
- run `codex auth`;
- run `codex exec`;
- read Codex CLI private token caches;
- use `OPENAI_API_KEY` as an implicit replacement;
- give an LLM game-state authority.

## Auth Check Order

When the user or task says "Codex auth" and the topic is gameplay or NPC LLM:

1. Read `docs/development/ai-provider-runtime.md`.
2. Check `build/provider-auth/openai-codex-auth.json` without printing raw
   token values.
3. Check profile `default` unless `OPENAI_CODEX_AUTH_PROFILE` is set.
4. Confirm access token presence, refresh token presence, and expiry.
5. Run `npm run openai:proposal-smoke --prefix backend/npc-runtime` for a
   no-live-spend configuration check.
6. Run live smoke only if the user intends to spend the small provider budget.
7. Start `npm run openai-codex:login --prefix backend/npc-runtime` only if the
   provider auth store is missing, expired, rejected by proof, or explicitly
   requested.

Do not start with Codex CLI login commands for game provider auth.

## Authority Rule

Allowed provider proposal fields:

- `npcLineCandidates`
- `stationPressureWording`
- `localizedVariants`
- `fallbackTextVariants`

The provider must not decide:

- action type;
- record creation;
- ledger mutation;
- risk tag;
- suspicion signal;
- Exposure;
- Evidence type;
- why-line authority;
- Station intake;
- inquest;
- verdict;
- session termination.

## Proof Commands

No-live-spend provider configuration check:

```bash
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Budgeted live provider smoke:

```bash
OPENAI_PROPOSAL_LIVE_TEST=1 \
NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex \
OPENAI_CODEX_PROPOSAL_MODEL=gpt-5.4-mini \
OPENAI_CODEX_REASONING_EFFORT=low \
OPENAI_CODEX_PROPOSAL_MODEL_FALLBACKS='' \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01 \
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

General repo health after provider docs/code changes:

```bash
git diff --check
npm run check --prefix backend/npc-runtime
node "$GAME_STUDIO_ROOT/tools/check-project.mjs" "$PWD"
```

Set `GAME_STUDIO_ROOT` to the local Game Studio checkout before running the
third command.
