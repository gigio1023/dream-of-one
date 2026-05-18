# OpenAI Codex Provider Verification

Date: 2026-05-19
Status: local auth verified and `gpt-5.4-mini` live smoke passed

## Purpose

This note records the current understanding after cloning and reviewing
OpenClaw. The goal is not to turn Dream of One into a Codex CLI wrapper. The
goal is to use an OpenAI Codex-compatible provider as the first live LLM route
for bounded NPC wording proposals, while keeping the game runtime provider
boundary abstract enough to support other LLMs later.

The default implementation target remains:

- provider: `openai-codex`
- transport: Codex Responses-compatible calls
- base URL: `https://chatgpt.com/backend-api/codex`
- model: `gpt-5.4-mini`
- reasoning effort: `low`
- model fallbacks: none
- provider output authority: wording proposal only

## OpenClaw Source Reviewed

Local source checkout:

- source: `~/git/openclaw`
- commit: `4af590a5 docs(changelog): note Telegram transcript mirror fix (#83631) (thanks @kurplunkin)`

OpenClaw files reviewed:

- `extensions/openai/openai-codex-provider.ts`
- `extensions/openai/openai-codex-provider.runtime.ts`
- `extensions/openai/openai-codex-oauth.runtime.ts`
- `extensions/openai/openai-codex-device-code.ts`
- `extensions/openai/openai-codex-catalog.ts`
- `extensions/openai/openai-codex-auth-identity.ts`
- `extensions/openai/base-url.ts`
- `extensions/openai/openai-codex-provider.test.ts`
- `extensions/openai/openai-codex-device-code.test.ts`
- `docs/providers/openai.md`
- `docs/tools/plugin.md`
- `docs/tools/acp-agents.md`

## OpenClaw Pattern

OpenClaw separates several names that are easy to confuse:

| Name | Layer | Meaning |
|---|---|---|
| `openai` | canonical model/provider route | New OpenClaw agent model refs usually look like `openai/gpt-*`. |
| `openai-codex` | Codex-compatible auth/provider path | OAuth profile namespace and legacy compatibility route for ChatGPT/Codex subscription-backed calls. |
| `codex` plugin | OpenClaw runtime plugin | Native Codex app-server harness and `/codex` controls inside OpenClaw. |
| ACP `codex` | external harness route | Explicit ACP fallback, not the default OpenClaw Codex path. |

The part Dream of One should borrow is the provider/auth/transport shape, not
OpenClaw's chat runtime:

- register a distinct `openai-codex` provider mode;
- store per-device OAuth credentials in an auth profile store;
- support browser OAuth or device-code pairing;
- refresh or reject credentials through provider-owned logic;
- normalize stale OpenAI/Codex/Copilot transport metadata to
  `openai-codex-responses`;
- route Codex provider calls to `https://chatgpt.com/backend-api/codex`;
- keep `gpt-5.4-mini` available on the Codex provider route;
- keep provider output behind validation and deterministic fallback.

OpenClaw's device-code path uses:

- auth base: `https://auth.openai.com`
- verification URL: `https://auth.openai.com/codex/device`
- client id: `app_EMoamEEZ73f0CkXaXp7hrann`
- device code request: `/api/accounts/deviceauth/usercode`
- polling: `/api/accounts/deviceauth/token`
- token exchange: `/oauth/token`

Dream of One's helper intentionally mirrors only the small part needed by this
game runtime.

## Dream Of One Current Implementation

Dream of One already uses the relevant direct-provider shape:

- `backend/npc-runtime/src/config.ts` defaults
  `NPC_RUNTIME_PROPOSAL_PROVIDER` to `openai-codex`.
- `DEFAULT_OPENAI_CODEX_AUTH_STORE_PATH` is
  `build/provider-auth/openai-codex-auth.json`.
- `DEFAULT_OPENAI_PROPOSAL_MODEL` is `gpt-5.4-mini`.
- default reasoning is `low`.
- default fallback model list is empty.
- `backend/npc-runtime/src/tools/openai-codex-device-login.ts` writes a
  per-device ignored OAuth store.
- `backend/npc-runtime/src/broker/codex-tool-gateway.ts` reuses the same strict
  JSON proposal schema and authority filter for provider output.
- The Codex provider path streams responses and omits `max_output_tokens`
  because this endpoint rejects that field.

This means "use the OpenAI Codex provider for the game LLM" means:

1. The game backend calls a Codex-compatible OpenAI provider directly.
2. The LLM proposes short NPC wording fields only.
3. Backend validation chooses or rejects the proposal.
4. Godot receives only the validated result and deterministic consequences.
5. Records, ledger mutation, Evidence, Exposure, Station intake, inquest,
   verdict, and session end remain owned by deterministic game code.

This is not:

- running `codex exec` as an NPC brain;
- relying on Codex CLI login as an API key;
- letting the LLM mutate Godot state;
- letting the LLM invent new records, witnesses, laws, hidden facts, or
  affordances;
- switching to larger or more expensive models when the cheap model fails.

## Auth Status Checked

No login flow was started during this check.

Commands used:

```bash
codex login status
```

Result:

- Codex CLI reports: `Logged in using ChatGPT`.

Repo-local provider auth store checked:

- path: `build/provider-auth/openai-codex-auth.json`
- ignored by git through `.gitignore`
- profile: `default`
- type: `oauth`
- access token present: yes
- refresh token present: yes
- expiry: `2026-05-28T12:48:16.554Z`
- expired at check time: no

The two auth facts mean different things:

- Codex CLI ChatGPT login is useful for developer/Codex workflows.
- The game provider route uses the repo-local OAuth profile store.

The provider store is what matters for live NPC proposal calls. Do not rerun
device-code login while this profile is present, parseable, and unexpired.

## Live Proof

Command:

```bash
OPENAI_PROPOSAL_LIVE_TEST=1 \
NPC_RUNTIME_PROPOSAL_PROVIDER=openai-codex \
OPENAI_CODEX_PROPOSAL_MODEL=gpt-5.4-mini \
OPENAI_CODEX_REASONING_EFFORT=low \
OPENAI_CODEX_PROPOSAL_MODEL_FALLBACKS='' \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01 \
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Result:

- health: ready
- provider: `openai-codex`
- selected model: `gpt-5.4-mini`
- reasoning effort: `low`
- fallback models: none
- `hasCredential`: true
- fallback used: false
- transport: `codex`
- returned thread id: `resp_0dc7c03546139408016a0b3144644881918b94791cc5afa991`
- selected utterance: `이영수증사본은맞지않습니다.`
- estimated input tokens: 929
- estimated total tokens: 1,629
- estimated cost: `$0.00384675`
- actual input tokens: 707
- actual output tokens: 258
- actual total tokens: 965

The live proof confirms that the current repo-local provider auth is usable for
`gpt-5.4-mini` today.

## Game Direction Guardrail

The provider is support technology for an environment-first NPC social
simulation. It should make the current small environment feel more socially
alive by adding bounded role voice, shared context, and NPC preoccupations. It
must not become the game goal.

For each new live-provider slice:

1. Start from one small player-visible social consequence.
2. Expose one environment fact or record to the NPC packet.
3. Let the provider propose wording only.
4. Validate against the existing action/authority catalog.
5. Run a live smoke or Godot probe with a strict budget.
6. Update Evidence with model, fallback status, estimated cap, and returned
   usage when present.

Future providers can be added only by implementing the same proposal contract.
The first supported route remains `openai-codex`.
