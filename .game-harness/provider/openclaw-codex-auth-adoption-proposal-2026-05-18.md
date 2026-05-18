# OpenClaw OpenAI Codex Provider Adoption Proposal

Date: 2026-05-18
Status: implemented default provider shape with backend live proof

## Correction

The first pass over-emphasized OpenClaw's native Codex app-server and
`codex exec` automation paths. The relevant OpenClaw path for Dream Of One is
the direct LLM-provider path:

- provider id: `openai-codex`
- model API: `openai-codex-responses`
- base URL: `https://chatgpt.com/backend-api/codex`
- auth profile type: OpenAI Codex/ChatGPT OAuth, with optional API-key backup

This is closer to Dream Of One's existing `OpenAiProposalGateway` than to a
local CLI subprocess.

## Source Reviewed

OpenClaw files inspected:

- `extensions/openai/openai-codex-provider.ts`
- `extensions/openai/openai-codex-catalog.ts`
- `extensions/openai/openai-codex-oauth.runtime.ts`
- `extensions/openai/openai-codex-device-code.ts`
- `extensions/openai/openai-codex-provider.runtime.ts`
- `extensions/openai/base-url.ts`
- `src/agents/auth-profiles/oauth.ts`
- `src/agents/model-auth.ts`
- `src/agents/model-auth.profiles.test.ts`
- `src/agents/openai-transport-stream.ts`
- `src/agents/pi-embedded-runner/stream-resolution.ts`

Official Codex docs checked:

- https://developers.openai.com/codex/auth
- https://developers.openai.com/codex/noninteractive

## OpenClaw Pattern To Borrow

OpenClaw treats Codex as a provider/auth mode, not as `OPENAI_API_KEY`.

The important shape is:

- register an `openai-codex` provider;
- normalize its transport to `openai-codex-responses`;
- use `https://chatgpt.com/backend-api/codex` as the Responses-compatible base
  URL;
- store Codex OAuth profiles in an auth-profile store;
- resolve a usable OAuth access token for runtime requests;
- refresh OAuth credentials through provider-owned refresh logic;
- use device-code login for remote/headless setups;
- route requests through the same OpenAI Responses-style transport with bearer
  auth;
- keep provider output behind the same validators and policy gates.

## Dream Of One Recommended Shape

Add a distinct `openai-codex` proposal provider mode, not a `codex exec` worker.

The implementation should reuse the existing `OpenAiProposalGateway` contract:

1. Add `NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex`.
2. Add `OpenAiCodexProposalGateway` or generalize `OpenAiProposalGateway` to
   support a provider descriptor.
3. Use the Codex Responses base URL:
   `https://chatgpt.com/backend-api/codex`.
4. Use `gpt-5.4-mini` with low reasoning effort as the only default Codex
   provider model, with explicit availability checks.
5. Send the same strict JSON proposal schema already used by `openai-api`.
6. Reuse existing proposal parsing and forbidden-authority rejection.
7. Keep deterministic fallback for missing auth, expired auth, refresh failure,
   unavailable model, invalid JSON, unsupported fields, and timeout.

## Auth Design

Start with a project-local auth profile store, not with direct reads from the
Codex CLI credential cache.

Recommended env/config:

- `NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex`
- `OPENAI_CODEX_PROPOSAL_MODEL=gpt-5.4-mini`
- `OPENAI_CODEX_REASONING_EFFORT=low`
- `OPENAI_CODEX_BASE_URL=https://chatgpt.com/backend-api/codex`
- `OPENAI_CODEX_AUTH_PROFILE=default`
- `OPENAI_CODEX_AUTH_STORE_PATH=build/provider-auth/openai-codex-auth.json`

`build/` is ignored and per-device. Do not commit auth profiles or token
material.

For headless Ubuntu ARM, prefer device-code login. A browser callback flow is
not reliable on this server class.

## Model Policy

Use only the cheapest model currently visible in OpenClaw's `openai-codex`
provider path: `gpt-5.4-mini` with low reasoning effort. OpenAI API docs list
`gpt-5.4-nano` and `gpt-5-nano` as cheaper API models, and OpenClaw lists nano
models under its general `openai` catalog, but the reviewed `openai-codex`
catalog and resolver do not expose nano models. Do not configure nano for
`openai-codex` until live Codex-provider discovery proves availability.

## Implementation Slices

### Slice 1: provider shape, no live auth

- Done: config parsing defaults to `openai-codex`.
- Done: provider health reports missing auth cleanly and uses the local
  OpenClaw-style Codex catalog allowlist.
- Done: tests prove the provider mode uses `gpt-5.4-mini` with no default model
  fallbacks and does not rely on `OPENAI_API_KEY`.

### Slice 2: OAuth profile store

- Done: add a small ignored auth-profile file format:
  `{ access, refresh, expires, accountId?, email?, planType? }`.
- Done: add device-code login helper for local setup:
  `npm run openai-codex:login --prefix backend/npc-runtime`.
- Prefer implementing only the small Codex OAuth/device-code/refresh surface
  needed by this runtime before adding a broad provider SDK dependency.
- Add refresh logic with file locking before spending refresh tokens.
- Never log or write raw tokens to Evidence.

### Slice 3: Codex Responses proposal call

- Done at provider-shape level: reuse the existing proposal prompt, JSON
  schema, parser, and POST path under the configured Codex base URL.
- Done for backend live calls: Codex Responses requires `stream: true` and
  rejects `max_output_tokens` on this provider path, so `openai-codex` requests
  stream text and omit that parameter while generic `openai-api` still sends
  `max_output_tokens`.
- Done: backend live smoke passed with `gpt-5.4-mini`, low reasoning, no
  fallback models, no deterministic fallback, and provider usage metadata.

### Slice 4: proof and product gate

- Done: backend live smoke skips without a usable Codex auth profile and runs
  with an explicit budget gate when `OPENAI_PROPOSAL_LIVE_TEST=1`.
- Done: backend tiny social probe checks two role agents against the same
  visible record context while enforcing a total estimated cap.
- Add Godot-to-backend proof before surfacing `providerState.mode =
  openai_codex`.
- Keep `fallback_only_m1` as product truth until exported-build proof passes.

## Do Not

- Do not use `codex exec` as the runtime LLM worker for this path.
- Do not treat Codex ChatGPT login as `OPENAI_API_KEY`.
- Do not configure `gpt-5.5`, pro models, `gpt-5.4`, or API nano models as the
  default Codex-provider route for this game.
- Do not read or copy another tool's private token cache into tracked files.
- Do not let LLM output create records, risk, Exposure, Evidence, inquest,
  verdict, or session end.
- Do not add hidden NPC actions outside the environment affordance catalog.

## Current Decision

Implementing `openai-codex` as a direct provider is feasible and better aligned
with OpenClaw than a CLI-worker design.

The safe first target is backend-only: authenticate, call Codex Responses with
the existing bounded proposal schema, validate, and fall back deterministically.
Only after that should Godot HUD/Evidence claim live `openai_codex` behavior.
