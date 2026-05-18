# AI Provider Runtime

Status: active runtime contract
Last updated: 2026-05-19

Search index: `docs/agent-search-index.md`
Search tokens: `AI_PROVIDER_SEARCH_INDEX`, `GAME_RUNTIME_CODEX_AUTH`,
`OPENAI_CODEX_PROVIDER`, `OPENAI_CODEX_PROVIDER_AUTH_STORE`,
`CODEX_CLI_IS_NOT_GAME_PROVIDER_AUTH`, `LLM_PROPOSAL_ONLY`,
`DO_NOT_RUN_CODEX_LOGIN_FOR_GAME_PROVIDER_AUTH`, `AGENT_LOOP_RUNTIME`,
`NPC_TOOL_LOOP`.

## Core Rule

Dream of One uses AI providers as bounded proposal workers. The current
checked-in provider path mainly handles NPC and Station wording, but the game
philosophy is broader: future NPC agents should be able to propose the next
valid tool call and utterance inside `AGENT_LOOP_RUNTIME`. See
`docs/direction/17-agent-loop-runtime-pivot.md`.

The provider may help a role sound alive and may eventually help a role decide
what small runtime tool to try next. It does not own the game.

The runtime owns facts, records, affordances, validation, ledger mutation,
Evidence, Exposure, Station intake, inquest, verdict, and session termination.

Current first implementation:

- provider mode: `openai-codex`
- model: `gpt-5.4-mini`
- reasoning effort: `low`
- default model fallbacks: none
- base URL: `https://chatgpt.com/backend-api/codex`
- auth store: `build/provider-auth/openai-codex-auth.json`

This is intentionally provider-shaped. Future LLM providers must implement the
same proposal contract. They should not get special game authority.

## What "Codex Auth" Means Here

In this repo, game-runtime Codex auth means the `openai-codex` provider auth
profile used by the backend proposal gateway.

It does not mean "run Codex CLI login" unless the user explicitly asks for
developer-agent CLI auth.

Do this first when checking game provider auth:

1. Inspect `build/provider-auth/openai-codex-auth.json` without printing raw
   token values.
2. Confirm the configured profile exists, defaults to `default`, and is not
   expired.
3. Run the backend provider smoke only when the user intends to spend the small
   live-test budget.

Do not start a device-code or browser login flow just because a prompt says
"Codex auth". Start login only when the provider auth store is missing,
unparseable, expired, or rejected by the live provider, and the user has agreed
to refresh auth.

## Layers

```text
Godot PlayableSession
  -> player input, HUD, visible objects, local route state
  -> backend perception packet
  -> OpenAiProposalGateway
  -> selected AI provider implementation
  -> strict JSON wording proposal
  -> backend proposal validation
  -> deterministic intent, fallback, ledger, and Evidence
  -> Godot presentation
```

The provider sits in the middle. It is not an actor with write access to the
world.

## Provider Contract

Allowed provider outputs:

- `toolCallProposal` only when the tool exists in an explicit runtime schema
- `npcLineCandidates`
- `stationPressureWording`
- `localizedVariants`
- `fallbackTextVariants`

Forbidden provider authority:

- unchecked action type selection outside the validated tool catalog
- bypassing movement, distance, turn lock, busy/available state, ownership,
  payment, object-state, or record-access checks
- new environment affordances
- new records or hidden facts
- ledger mutation
- Exposure, suspicion threshold, Evidence type, or why-line authority
- Station intake state
- inquest, verdict, or session termination
- model-internal or backend-internal explanations shown as world truth

The gateway rejects forbidden fields and forbidden authority wording before the
proposal can become player-visible text.

## Current OpenAI Codex Implementation

The active backend path is direct provider access:

- config: `backend/npc-runtime/src/config.ts`
- gateway: `backend/npc-runtime/src/broker/codex-tool-gateway.ts`
- login helper: `backend/npc-runtime/src/tools/openai-codex-device-login.ts`
- smoke: `backend/npc-runtime/src/tools/openai-proposal-smoke.ts`

The `openai-codex` implementation follows the OpenClaw provider pattern:

- a distinct `openai-codex` provider mode;
- a Codex-compatible OAuth profile stored in an ignored repo-local file;
- a Codex Responses-compatible transport at
  `https://chatgpt.com/backend-api/codex`;
- `gpt-5.4-mini` as the only default model;
- no automatic fallback to larger or more expensive models;
- deterministic fallback if auth, model selection, budget, timeout, JSON schema,
  or authority validation fails.

The Codex provider path streams responses and omits `max_output_tokens` because
the Codex endpoint rejects that field. Generic `openai-api` requests still use
the normal JSON response path and may send `max_output_tokens`.

## Environment Variables

Default live provider:

```bash
NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex
OPENAI_CODEX_PROPOSAL_MODEL=gpt-5.4-mini
OPENAI_CODEX_REASONING_EFFORT=low
OPENAI_CODEX_PROPOSAL_MODEL_FALLBACKS=''
OPENAI_CODEX_AUTH_PROFILE=default
OPENAI_CODEX_AUTH_STORE_PATH=build/provider-auth/openai-codex-auth.json
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01
```

The backend also accepts direct `OPENAI_CODEX_ACCESS_TOKEN` or
`OPENAI_CODEX_API_KEY` for explicit local experiments, but the normal path is
the ignored auth profile store.

`OPENAI_API_KEY` belongs to the generic `openai-api` provider path. It is not
the same as `openai-codex` provider auth.

## Setup And Check Commands

Create or refresh the game provider OAuth profile only when needed:

```bash
npm run openai-codex:login --prefix backend/npc-runtime
```

Check configuration without spending live budget:

```bash
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Run a budgeted live smoke:

```bash
OPENAI_PROPOSAL_LIVE_TEST=1 \
NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex \
OPENAI_CODEX_PROPOSAL_MODEL=gpt-5.4-mini \
OPENAI_CODEX_REASONING_EFFORT=low \
OPENAI_CODEX_PROPOSAL_MODEL_FALLBACKS='' \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01 \
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Expected live-smoke properties:

- provider is `openai-codex`;
- selected model is `gpt-5.4-mini`;
- reasoning effort is `low`;
- fallback models are empty;
- `hasCredential` is true;
- `usedFallback` is false for a healthy proof;
- returned token usage is recorded when the provider returns it.

## Failure Behavior

Failures must become deterministic fallback, not improvised provider behavior.

Fallback is required for:

- missing provider credential;
- expired or rejected provider credential;
- unavailable model;
- budget estimate over cap;
- request timeout;
- cancellation;
- invalid JSON;
- wrong `npcId`;
- forbidden proposal fields;
- authority wording inside proposed text.

The fallback path should still produce Evidence that explains the reason and
keeps the game route coherent.

## Adding Another Provider

A second provider may be added after `openai-codex`, but it must enter through
the same proposal boundary.

Minimum requirements:

1. Add a provider mode in `backend/npc-runtime/src/config.ts`.
2. Provide a credential source that is not confused with Codex CLI auth.
3. Implement the same strict proposal schema.
4. Reuse the same forbidden-authority checks.
5. Keep model and budget defaults explicit.
6. Prove missing-auth, timeout, invalid proposal, and fallback behavior.
7. Run at least one live smoke before claiming the provider works.

Do not add provider-specific game logic to Godot scenes. Godot should receive a
validated runtime result, not a raw model response.

## Current Proof

Current source-backed OpenClaw and local proof note:

- `.game-harness/provider/openai-codex-provider-verification-2026-05-19.md`

Current live provider evidence ledger:

- `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md`

The checked proof confirms that the repo-local `openai-codex` auth profile can
call `gpt-5.4-mini` with low reasoning and no model fallback. Product truth
still remains bounded by the current Godot Evidence gates.
