# Same Order Provider Mode Decision

Date: 2026-05-17
Status: fallback-only for M1 product truth

## Decision

The current Same Order M1 proof uses deterministic fallback-only provider truth.

Live `openai-codex` proposal behavior remains a future integration target, not
a current demo claim. The M1 Store/Station cell may continue using provider-shaped
backend contracts, dispatch packets, and fallback wording, but the build must
not claim live provider behavior until live access and Godot dispatch are both
proven.

## Why

Current local evidence proves the important design boundary:
- provider-shaped proposals are constrained to available environment actions;
- unsupported authority fields are rejected;
- backend/runtime preserves ledger, economy, Evidence, Exposure, inquest,
  verdict, and session-end authority;
- deterministic fallback keeps the Same Order route playable without API
  access.

Current local evidence does not prove live provider behavior:
- `codex login status` proves the local Codex CLI is logged in using ChatGPT,
  but that is not a game runtime API credential.
- no verified game runtime provider credential/profile exists yet.
- the current budgeted live smoke is a legacy `openai-api` guardrail, not
  proof of `openai-codex`.
- Godot-to-backend live provider dispatch has not been refreshed in the current
  playable artifact.

Current artifact inspection:
- `playableSummary.providerState.mode = fallback_only_m1`.
- `playableSummary.providerState.liveVerified = false`.
- `playability.providerActionComparison.pass = true`.
- `playability.providerSchedulingPlan.contractPass = true`.
- `playability.providerSchedulingPlan.liveGodotDispatchVerified = false`.
- `playability.providerDispatchContract.contractPass = true`.
- `playability.providerDispatchContract.liveHttpDispatchVerified = false`.
- Packaged app route evidence also reports `providerState.mode =
  fallback_only_m1` and packaged route preflight requires that state.

## Allowed M1 Claims

M1 may claim:
- Same Order uses deterministic fallback wording in the current product proof;
- provider-shaped proposals are bounded to available actions in backend tests;
- generated wording, when later enabled, cannot own records, risk, Exposure,
  Evidence, inquest, verdict, or session termination;
- `gpt-5.4-mini` low reasoning effort is the default `openai-codex` target, but
  live behavior is claimed only after runtime verification and budget checks
  pass.

M1 must not claim:
- live API-backed NPC proposals;
- Codex subscription reuse by the game runtime;
- bundled OpenAI hosting;
- fixed GPT model availability;
- provider behavior based only on mocked tests or skipped live smoke.

## Future Gate For Live Provider Mode

Live provider mode can be considered only after all of the following are true:
- an explicit `openai-codex` game runtime auth profile is configured;
- budgeted live smoke succeeds without fallback;
- selected model availability is verified for the configured provider;
- generated output passes schema and forbidden-authority validation;
- Godot-to-backend dispatch proves the same Store/Station route still preserves
  backend-owned outcomes;
- in-game UI or setup copy clearly names the verified provider mode.

The current future target is direct `openai-codex`, not `codex exec`. Do not
read or reuse Codex cached ChatGPT credentials as `OPENAI_API_KEY`; use an
explicit auth/profile flow and keep deterministic fallback/authority boundaries.
See `openclaw-codex-auth-adoption-proposal-2026-05-18.md` and
`openai-codex-model-policy-2026-05-18.md`.

Until then, fallback-only is the honest M1 product mode.
