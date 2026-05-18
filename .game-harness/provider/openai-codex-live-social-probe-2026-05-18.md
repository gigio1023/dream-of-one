# OpenAI Codex Live Social Probe

Date: 2026-05-18
Status: backend live proof passed; Godot live dispatch still not proven

## Claim

Dream of One can call the `openai-codex` provider directly with ChatGPT/Codex
OAuth auth, using only `gpt-5.4-mini` with low reasoning effort, no model
fallbacks, and deterministic fallback if the provider path fails.

The current proof is backend-only. It proves bounded LLM text proposals for NPC
roles. It does not prove live provider dispatch from the running Godot scene.

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

## What Remains Unproven

- Godot-to-backend live provider dispatch in the running scene.
- In-game HUD/Evidence truth showing `openai_codex` instead of
  `fallback_only_m1`.
- Multi-step NPC memory and policy behavior across a long live simulation.
- ChatGPT Pro quota remaining or plan-limit accounting, because the endpoint
  does not expose remaining subscription usage in these responses.

## Next Playable Slice

Keep the next increment small: route one existing Godot provider dispatch packet
through the live backend with `gpt-5.4-mini`, preserve the same deterministic
route events as fallback-only, and expose provider mode plus usage summary in
the Evidence artifact before expanding NPC count or memory scope.
