# M2 — Provider Ports Live

**Status: queued** (starts when M1 passes its gate).

## Goal

Ship the port-and-adapter provider layer from
[`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md) and make live
LLM wording player-visible in the M1 slice — the thing v1 built but never
turned on. After M2, switching a profile (`NPC_PROVIDER_PROFILE=modelscope/qwen3.7-plus`)
changes NPC texture in-game with zero code changes, and providers-off remains
a first-class mode.

## Deliverables

**Runtime (`src/providers/`):**

- `ports.ts` (`NpcProposalPort`, `TextGenPort`), `envelope.ts` (zod schema +
  instructed-JSON repair), `registry.ts` (profile loading, env resolution,
  selection), `budget.ts` (per-session caps + usage accounting),
  `service.ts` (fallback ladder, timeouts, retry, telemetry events).
- `adapters/chat-completions.ts`, `adapters/responses.ts`, `adapters/mock.ts`.
- `providers.config.json` + `.env.example` documenting
  `MODELSCOPE_BASE_URL/API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_*`,
  `OLLAMA_BASE_URL`, `NPC_PROVIDER_PROFILE`.
- Retire the v1 codex broker/auth stack in the same PR
  (see [`../tech/npc-runtime.md`](../tech/npc-runtime.md) retire list).

**Game integration:**

- `proposeUtterance` wired into conversation beats: Clerk prompts, probes,
  reaction lines, Waiting Customer remarks — each with intent + forbidden-claims
  bounds from actor policy, hydrated from the NPC's visible context only.
- Latency UX: beat-appropriate thinking cue; hard 2.5s deadline → fallback
  line; no conversation stall ever.
- Debug overlay: active profile, per-NPC last proposal (accepted/fallback +
  reason), session usage/cost estimate.

**Proof:**

- Contract tests against `MockAdapter` (validation, ladder, budget, repair) in
  `npm run check`.
- `provider:smoke` script per profile (manual, budget-capped).
- `route_smoke.gd` extended: run all four routes with providers off and with
  `mock/scripted` on; assert identical route outcomes (texture-not-truth
  invariant).
- One real session each on a ModelScope Qwen profile and an OpenAI profile
  with usage numbers recorded in the PR.

## Acceptance

- [ ] Profile switch via env var only; no vendor imports outside `adapters/`.
- [ ] Kill the network mid-conversation → play continues on fallback without
      a visible error.
- [ ] Budget exhaustion downgrades silently and is visible in the overlay.
- [ ] Live wording respects intent and forbidden claims across ~20 sampled
      utterances (manual review in PR).
- [ ] Fun gate: does live texture make the conversation *feel* more alive
      than the line bank? Honest answer recorded — if "no", M3 proceeds
      anyway but M5's default profile decision gets this data point.

## Non-goals

`proposeNextStep` (M3), per-role profile routing (M4), streaming responses,
cost dashboards, provider-side memory (`previous_response_id` etc. — session
memory stays runtime-owned).
