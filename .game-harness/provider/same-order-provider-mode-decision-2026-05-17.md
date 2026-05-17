# Same Order Provider Mode Decision

Date: 2026-05-17
Status: fallback-only for M1 product truth

## Decision

The current Same Order M1 proof uses deterministic fallback-only provider truth.

Live API proposal behavior remains a future integration target, not a current
demo claim. The M1 Store/Station cell may continue using provider-shaped
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
- `OPENAI_API_KEY` is not present in the current environment.
- the budgeted live smoke skips when the API key is missing.
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
- `gpt-5.4-mini` is a preferred configured model only after runtime
  verification and budget checks pass.

M1 must not claim:
- live API-backed NPC proposals;
- Codex subscription reuse by the game runtime;
- bundled OpenAI hosting;
- fixed GPT model availability;
- provider behavior based only on mocked tests or skipped live smoke.

## Future Gate For Live Provider Mode

Live provider mode can be considered only after all of the following are true:
- `OPENAI_API_KEY` or another explicit game runtime credential is configured;
- budgeted live smoke succeeds without fallback;
- selected model availability is verified for the configured provider;
- generated output passes schema and forbidden-authority validation;
- Godot-to-backend dispatch proves the same Store/Station route still preserves
  backend-owned outcomes;
- in-game UI or setup copy clearly names the verified provider mode.

Until then, fallback-only is the honest M1 product mode.
