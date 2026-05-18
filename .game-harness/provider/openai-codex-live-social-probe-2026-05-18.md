# OpenAI Codex Live Social Probe

Date: 2026-05-18
Status: backend live proof and Godot PlayableSession route dispatch smoke passed

## Claim

Dream of One can call the `openai-codex` provider directly with ChatGPT/Codex
OAuth auth, using only `gpt-5.4-mini` with low reasoning effort, no model
fallbacks, and deterministic fallback if the provider path fails.

The backend proof proves bounded LLM text proposals for NPC roles. A Godot tool
now also proves two live `/v1/npc/decision` dispatches using actual
`PlayableSession` route packets for the Store Clerk and Waiting Customer, then
confirms deterministic fallback parity on the same running scene. This still
does not switch the playable scene or HUD out of `fallback_only_m1`.

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

Godot live PlayableSession route provider dispatch smoke:

```bash
OPENAI_CODEX_AUTH_STORE_PATH=<ignored auth store> \
NPC_RUNTIME_HOST=127.0.0.1 \
NPC_RUNTIME_PORT=8787 \
OPENAI_PROPOSAL_MAX_ESTIMATED_COST_USD=0.01 \
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

Godot live PlayableSession route provider dispatch smoke:

- artifact: `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`
- artifact SHA-256: `ba676ffdd7c0ff307b14835ac569bcf3adfe3a7044e0b460f383b4d4253a9b08`
- readiness: ready for `openai-codex`
- model: `gpt-5.4-mini`
- reasoning: `low`
- fallbacks: none
- HTTP decision endpoint: `200`
- transport: `codex`
- per-request estimated cap: `$0.01`
- request count: 2
- live actors: `NPC_Store_Clerk`, `NPC_Waiting_Customer`
- total estimated cost: `$0.0084375`
- total actual usage: 2,275 input tokens, 405 output tokens, 2,680 total tokens
- Store Clerk estimated cost: `$0.00433725`
- Store Clerk actual usage: 1,290 input tokens, 171 output tokens, 1,461 total tokens
- Waiting Customer estimated cost: `$0.00410025`
- Waiting Customer actual usage: 985 input tokens, 234 output tokens, 1,219 total tokens
- fallback: false
- Store Clerk utterance: `오늘도같은걸로드릴까요?`
- Waiting Customer utterance: `줄은잠깐멈췄네요.`
- command executed in Godot world: false
- product provider state changed: false
- provider decision mutated route state: false
- fallback parity route outcome: `clean_cover`
- fallback parity session outcome: `cover_held`

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
- A Godot script can drive the actual `PlayableSession`, build live
  route-context provider packets for two NPC actors, reach the backend
  `/v1/npc/decision` endpoint, receive bounded `openai-codex` wording plus
  usage metadata, and then continue the deterministic fallback route without
  state mutation or route drift.

## What Remains Unproven

- In-game HUD/Evidence truth showing `openai_codex` instead of
  `fallback_only_m1`.
- Continuous live provider scheduling across more than two `PlayableSession`
  route jobs and memory turns.
- Player-visible live-provider mode and HUD/Evidence display. The current proof
  is still proof-only even though the two-actor role-voice smoke now returns
  bounded role-anchored lines.
- Multi-step NPC memory and policy behavior across a long live simulation.
- ChatGPT Pro quota remaining or plan-limit accounting, because the endpoint
  does not expose remaining subscription usage in these responses.

## Next Playable Slice

Keep the next increment small: choose whether to expose live-provider wording
as a player-visible experimental mode or keep it as proof-only. If enabled,
wire one bounded multi-actor route step at a time, preserve deterministic
records/actions as authority, and keep usage caps plus actual token reporting in
the playable Evidence artifact before expanding NPC count or memory scope.
