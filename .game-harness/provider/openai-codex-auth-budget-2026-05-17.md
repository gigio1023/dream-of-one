# OpenAI/Codex Auth and Budgeted Proposal Smoke

Date: 2026-05-17
Status: superseded for provider choice; legacy OpenAI API guardrail,
generic OpenAI API live access not proven

Supersession note, 2026-05-18: the default live-LLM provider mode is direct
`openai-codex` auth with `gpt-5.4-mini` low reasoning effort and no default
model fallbacks. Keep this file as the historical `openai-api` smoke/budget
record only. Backend direct `openai-codex` live proof is now recorded in
`openai-codex-live-social-probe-2026-05-18.md`.

## Decision

Use the OpenAI API credential path for Dream of One's live proposal provider.

Do not reuse private Codex ChatGPT login credentials inside the game runtime. The local Codex CLI can be logged in, but that login is for Codex itself. The game/runtime provider must use an explicit API credential through `OPENAI_API_KEY`, model preflight, schema validation, deterministic fallback, and a request budget gate.

Current local observation:
- `codex login status` reports: logged in using ChatGPT.
- Installed CLI command is `codex login`, not `codex auth`.
- That does not prove `OPENAI_API_KEY` exists and does not prove the game can call `gpt-5.4-mini`.

## Official Documentation Basis

Sources checked:
- OpenAI Models docs: `gpt-5.4-mini` is listed as a lower-latency/lower-cost GPT-5.4 model available through the Responses API and SDKs, with current listed text pricing of `$0.75 / 1M input tokens` and `$4.50 / 1M output tokens`.
  - https://developers.openai.com/api/docs/models
  - https://developers.openai.com/api/docs/models/gpt-5.4-mini
- OpenAI Responses API: the runtime should call `/v1/responses` with a selected model, input, structured output schema, and bearer authorization.
  - https://developers.openai.com/api/reference/responses/create
- OpenAI RBAC docs: model listing is a permissioned API capability, so readiness should verify available models instead of assuming a model is enabled.
  - https://developers.openai.com/api/docs/guides/rbac
- OpenAI error docs: monthly/project budget, rate limit, and authentication errors are expected operational states and must fall back safely.
  - https://developers.openai.com/api/docs/guides/error-codes
- Codex config reference: Codex supports login/config/provider auth for Codex's own model-provider calls. This is not a public contract for a game process to extract ChatGPT credentials.
  - https://developers.openai.com/codex/config-reference

## Runtime Contract

Configured defaults:
- Preferred model: `gpt-5.4-mini`
- Fallback candidates: none by default
- Max output: `700` tokens
- Estimated input cap: `6000` tokens
- Estimated total cap: `8000` tokens
- Estimated request cost cap: `$0.01`
- Default cost estimate: `gpt-5.4-mini` current listed text prices

The budget gate runs after model availability preflight and before `/v1/responses`. If the prompt estimate exceeds configured caps, no response request is sent and the backend returns deterministic fallback.

Environment knobs:

```bash
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_PROPOSAL_PREFERRED_MODEL
OPENAI_PROPOSAL_MODEL_FALLBACKS
OPENAI_PROPOSAL_MAX_OUTPUT_TOKENS
OPENAI_PROPOSAL_MAX_ESTIMATED_INPUT_TOKENS
OPENAI_PROPOSAL_MAX_ESTIMATED_TOTAL_TOKENS
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD
OPENAI_PROPOSAL_INPUT_USD_PER_MILLION_TOKENS
OPENAI_PROPOSAL_OUTPUT_USD_PER_MILLION_TOKENS
OPENAI_PROPOSAL_LIVE_TEST
```

## Live Smoke Command

Dry run without spending:

```bash
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Budgeted live run:

```bash
OPENAI_PROPOSAL_LIVE_TEST=1 \
OPENAI_PROPOSAL_PREFERRED_MODEL=gpt-5.4-mini \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01 \
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Required result before claiming live AI:
- script prints `status: "health"` with `ok: true`.
- selected model is a configured candidate.
- script prints `status: "decision"` with `usedFallback: false`.
- decision remains wording-only: backend still owns action type, reason codes, Evidence, Exposure, inquest, verdict, and session termination.

If `OPENAI_API_KEY` is missing, the smoke skips. That is intentional; ChatGPT/Codex login is not treated as a game API key.

## Local Result on 2026-05-17

Commands run:

```bash
codex login status
PATH=/opt/homebrew/bin:$PATH npm run check --prefix backend/npc-runtime
PATH=/opt/homebrew/bin:$PATH npm run openai:proposal-smoke --prefix backend/npc-runtime
PATH=/opt/homebrew/bin:$PATH OPENAI_PROPOSAL_LIVE_TEST=1 npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Result:
- Codex CLI is logged in using ChatGPT.
- Backend build and 116 integration tests pass.
- Dry smoke prints the `gpt-5.4-mini` config and skips without spending.
- Live smoke also skips because `OPENAI_API_KEY` is missing.
- Generic OpenAI API `gpt-5.4-mini` access was not proven in this historical
  run. Direct `openai-codex` backend access was proven later.

## Release Truth

Do not claim:
- bundled OpenAI hosting.
- Codex subscription reuse by the game runtime.
- fixed model availability.
- live provider behavior from mocked integration tests.

May claim only after live evidence:
- the configured provider can reach the OpenAI API.
- the configured account has access to the selected model.
- the request stayed inside the configured budget.
- generated wording passed schema and authority validation.
