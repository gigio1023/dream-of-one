# Same Order Provider Mode Decision

Date: 2026-05-17
Last updated: 2026-05-18
Status: fallback-only for M1 product truth

## Decision

The current Same Order M1 proof uses deterministic fallback-only provider truth.

Live `openai-codex` proposal behavior is now proven as proof-only backend/Godot
evidence, not as the current playable product mode. The M1 Store/Station cell
may continue using provider-shaped backend contracts, dispatch packets, fallback
wording, and checked live-provider artifacts, but the build must not claim
player-visible live provider behavior while HUD/Evidence truth remains
`fallback_only_m1`.

## Why

Current local evidence proves the important design boundary:
- provider-shaped proposals are constrained to available environment actions;
- unsupported authority fields are rejected;
- backend/runtime preserves ledger, economy, Evidence, Exposure, inquest,
  verdict, and session-end authority;
- deterministic fallback keeps the Same Order route playable without API
  access.
- an explicit direct `openai-codex` auth profile can provide game-runtime
  credentials without using `codex exec` or generic `OPENAI_API_KEY`;
- budgeted live `openai-codex` backend smoke, two-NPC social probe, Godot
  route-context dispatch, same-NPC local-memory continuity, and NPC-to-NPC live
  observation artifacts now pass with usage accounting.

Current local evidence still does not prove player-visible live provider mode:
- the running HUD/Evidence product state remains `fallback_only_m1`;
- live calls are smoke/proof artifacts, not applied Godot commands;
- provider output remains wording-only and cannot own records, route state,
  economy, Evidence, inquest, verdict, or session end;
- ChatGPT Pro remaining quota is not exposed by the Codex response, so budget
  enforcement is limited to fixed model, request count, estimate caps, fallback
  status, and returned token usage;
- external fresh-player comprehension remains missing.

Current artifact inspection:
- `playableSummary.providerState.mode = fallback_only_m1`.
- `playableSummary.providerState.liveVerified = false`.
- `playability.providerActionComparison.pass = true`.
- `playability.providerSchedulingPlan.contractPass = true`.
- `playability.providerSchedulingPlan.liveGodotDispatchVerified = false`.
- `playability.providerDispatchContract.contractPass = true`.
- Packaged app route evidence also reports `providerState.mode =
  fallback_only_m1` and packaged route preflight requires that state.
- `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`
  reports proof-only `openai-codex` Store Clerk and Waiting Customer calls,
  fixed `gpt-5.4-mini`, no fallback, `npcToNpcLiveObservation=true`, concrete
  Waiting Customer `recentEvents` containing the Store Clerk live utterance, no
  route mutation, and product provider state unchanged.
- `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_thread_continuity_smoke.json`
  reports proof-only same-session Store Clerk continuity via backend-owned local
  workspace memory with `storeResponses=false`.

## Allowed M1 Claims

M1 may claim:
- Same Order uses deterministic fallback wording in the current product proof;
- provider-shaped proposals are bounded to available actions in backend tests;
- generated wording, when later enabled, cannot own records, risk, Exposure,
  Evidence, inquest, verdict, or session termination;
- `gpt-5.4-mini` low reasoning effort is the default `openai-codex` target;
- proof-only live `openai-codex` backend/Godot smokes pass with budget and usage
  accounting;
- same-NPC continuity uses backend-owned workspace memory by default, not
  provider-stored response chaining.

M1 must not claim:
- player-visible live API-backed NPC proposals;
- Codex subscription reuse by the game runtime;
- bundled OpenAI hosting;
- fixed GPT model availability;
- provider behavior based only on mocked tests or skipped live smoke.

## Future Gate For Player-Visible Live Provider Mode

Player-visible live provider mode can be considered only after all of the
following are true:
- an explicit `openai-codex` game runtime auth profile is configured on the
  current device;
- selected model availability is verified for the configured provider and stays
  fixed to the cheapest approved Codex-provider model;
- budgeted live smoke succeeds without fallback and records request count,
  estimated cost, actual token usage, and the fact that ChatGPT Pro remaining
  quota is unavailable;
- generated output passes schema, role-voice, and forbidden-authority
  validation;
- Godot-to-backend dispatch proves the same Store/Station route still preserves
  backend-owned records, route outcome, object state, economy, Evidence, inquest,
  verdict, and session end;
- same-NPC memory uses backend-owned workspace artifacts unless a separate live
  proof establishes provider-stored response chaining for this endpoint;
- the Codex gameplay QA action/snapshot/report path exposes the live wording and
  provider usage without reading private scene methods;
- in-game HUD/Evidence/setup copy clearly names the provider mode, model,
  fallback state, and usage boundary;
- external fresh-player comprehension notes do not regress because of the live
  wording mode.

The current future target is direct `openai-codex`, not `codex exec`. Do not
read or reuse Codex cached ChatGPT credentials as `OPENAI_API_KEY`; use an
explicit auth/profile flow and keep deterministic fallback/authority boundaries.
See `openclaw-codex-auth-adoption-proposal-2026-05-18.md` and
`openai-codex-model-policy-2026-05-18.md`.

Until then, fallback-only is the honest M1 product mode.
