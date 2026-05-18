# OpenAI Codex Live Social Probe

Date: 2026-05-18
Status: backend live proof and Godot HTTP decision dispatch smoke passed

## Claim

Dream of One can call the `openai-codex` provider directly with ChatGPT/Codex
OAuth auth, using only `gpt-5.4-mini` with low reasoning effort, no model
fallbacks, and deterministic fallback if the provider path fails.

The backend proof proves bounded LLM text proposals for NPC roles. A Godot tool
now also proves one live `/v1/npc/decision` HTTP dispatch through the backend.
This still does not switch the running playable scene or HUD out of
`fallback_only_m1`.

## Commands

Device login, per machine:

```bash
npm run openai-codex:login --prefix backend/npc-runtime
```

One-call provider smoke:

```bash
OPENAI_CODEX_AUTH_STORE_PATH=<ignored auth store> \
OPENAI_PROPOSAL_LIVE_TEST=1 \
npm run openai:proposal-smoke --prefix backend/npc-runtime
```

Two-NPC social probe with a total estimated cap:

```bash
OPENAI_CODEX_AUTH_STORE_PATH=<ignored auth store> \
OPENAI_PROPOSAL_LIVE_TEST=1 \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.005 \
OPENAI_CODEX_SOCIAL_PROBE_TOTAL_ESTIMATED_COST_USD=0.01 \
npm run openai-codex:social-probe --prefix backend/npc-runtime
```

Godot live provider dispatch smoke:

```bash
OPENAI_CODEX_AUTH_STORE_PATH=<ignored auth store> \
NPC_RUNTIME_HOST=127.0.0.1 \
NPC_RUNTIME_PORT=8787 \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.005 \
OPENAI_PROPOSAL_TIMEOUT_MS=12000 \
NPC_RUNTIME_DECISION_DEADLINE_MS=12000 \
npm run dev --prefix backend/npc-runtime
```

In another shell:

```bash
$GODOT_BIN --headless --path godot --script res://tools/live_provider_dispatch_smoke.gd
```

Do not commit auth stores or local absolute auth paths. Use
`OPENAI_CODEX_AUTH_STORE_PATH` per device when the default ignored path is not
the current working directory's intended store.

## 2026-05-18 Results

One-call smoke:

- provider: `openai-codex`
- model: `gpt-5.4-mini`
- reasoning: `low`
- fallbacks: none
- estimated cost: `$0.00360825`
- actual usage: 513 input tokens, 230 output tokens, 743 total tokens
- fallback: false
- selected utterance: `영수증사본은원본기준입니다.`

Two-NPC social probe:

- provider: `openai-codex`
- model: `gpt-5.4-mini`
- reasoning: `low`
- request count: 2
- per-request estimated cap: `$0.005`
- total estimated cap: `$0.01`
- summed estimated cost: `$0.00732675`
- actual usage: 1,126 input tokens, 425 output tokens, 1,551 total tokens
- fallback: false for both NPCs
- Store Clerk utterance: `영수증기록은이미남겼습니다.`
- Waiting Customer utterance: `줄이길어졌네요.`

Godot live provider dispatch smoke:

- artifact: `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`
- artifact SHA-256: `6bfa62f7db9f00cb96c7d47c78eee47772eb8bcefb6b81ecda2cb68eb367b962`
- readiness: ready for `openai-codex`
- model: `gpt-5.4-mini`
- reasoning: `low`
- fallbacks: none
- HTTP decision endpoint: `200`
- transport: `codex`
- estimated cost: `$0.003666`
- actual usage: 568 input tokens, 300 output tokens, 868 total tokens
- fallback: false
- selected utterance: `영수증은여기있습니다.번호와내용이맞는지만확인해주세요.`
- command executed in Godot world: false
- product provider state changed: false

ChatGPT Pro remaining quota is not exposed by the Codex Responses payload used
here. The enforceable budget controls are model allowlist, reasoning effort,
request count, estimated per-request cap, estimated total cap, no fallback
upgrades, and recorded actual token usage when the provider returns it.

## What This Proves

- The OpenClaw-style `openai-codex` provider route works without `codex exec`.
- Device-code OAuth can supply runtime bearer auth through an ignored profile.
- Codex Responses must stream on this provider path.
- This provider path rejects `max_output_tokens`, so the runtime omits it only
  for `openai-codex`.
- Provider output remains wording only; backend action type, records, Evidence,
  Exposure, inquest, verdict, and session end remain deterministic authority.
- A tiny two-role social context can produce bounded live LLM wording without
  falling back or upgrading model.
- A Godot script can reach the live backend `/v1/npc/decision` endpoint and
  receive bounded `openai-codex` wording plus usage metadata without mutating
  Godot state.

## What Remains Unproven

- In-game HUD/Evidence truth showing `openai_codex` instead of
  `fallback_only_m1`.
- Live provider dispatch from the actual `PlayableSession` route loop with
  fallback parity for the same route events.
- Multi-step NPC memory and policy behavior across a long live simulation.
- ChatGPT Pro quota remaining or plan-limit accounting, because the endpoint
  does not expose remaining subscription usage in these responses.

## Next Playable Slice

Keep the next increment small: route one existing `PlayableSession` provider
job through the live backend with `gpt-5.4-mini`, preserve the same
deterministic route events as fallback-only, and expose provider mode plus usage
summary in the playable Evidence artifact before expanding NPC count or memory
scope.
