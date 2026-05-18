# OpenClaw Codex Auth Adoption Proposal

Date: 2026-05-18
Status: proposal, not implemented product truth

## Source Reviewed

An external OpenClaw clone was inspected for Codex auth/provider behavior,
including:

- `docs/providers/openai.md`
- `docs/concepts/oauth.md`
- `docs/auth-credential-semantics.md`
- `extensions/codex/provider.ts`
- `extensions/codex/provider-catalog.ts`
- `extensions/codex/src/app-server/auth-bridge.ts`
- `extensions/codex/src/app-server/config.ts`
- `src/agents/cli-credentials.ts`
- `src/agents/auth-profiles/external-cli-discovery.ts`

Official Codex docs checked:

- https://developers.openai.com/codex/auth
- https://developers.openai.com/codex/noninteractive

## OpenClaw Pattern To Borrow

OpenClaw does not treat Codex ChatGPT login as an `OPENAI_API_KEY`.

It separates:

- model route: canonical `openai/<model>` style model refs;
- runtime: Codex app-server or other execution runtime;
- auth source: Codex/ChatGPT OAuth profile, Codex CLI login fallback, or API-key
  backup;
- readiness: probe/status can discover auth and model availability without
  changing product truth;
- authority: model output is still routed through validators and runtime-owned
  policy.

OpenClaw also scopes external CLI credential discovery. It only reads Codex CLI
auth when the provider/runtime is in scope, keeps keychain prompting disabled on
read-only status paths, and treats local OAuth profile storage as the canonical
token sink once its own profile exists.

## What Dream Of One Should Not Copy Yet

Do not copy OpenClaw's full app-server/OAuth system into the game runtime.

Do not:

- read Codex tokens as `OPENAI_API_KEY`;
- commit or expose Codex credential cache contents;
- make game state depend on private token files;
- claim live provider mode from `codex login status` alone;
- let LLM output create records, risk, Exposure, Evidence, inquest, verdict, or
  session end;
- add hidden NPC actions that are not present in the environment affordance
  catalog.

## Recommended Dream Of One Shape

Add a distinct optional provider mode named `codex-cli` only after a backend
spike proves it.

The mode should use the local Codex CLI as a proposal worker, not as a direct
game authority:

1. Preflight `codex --version`, `codex login status`, `codex exec --help`, and
   required non-interactive flags.
2. Run `codex exec` with the smallest viable sandbox, preferably read-only for
   proposal generation.
3. Pass only a compact NPC perception packet, environment affordance catalog,
   and allowed output schema.
4. Require strict JSON output with the existing text-proposal fields:
   `npcId`, `npcLineCandidates`, `stationPressureWording`,
   `localizedVariants`, and `fallbackTextVariants`.
5. Reuse the existing proposal parser/authority rejection rules from the
   `openai-api` path.
6. Treat auth failure, timeout, malformed JSON, unsupported fields, forbidden
   authority wording, or model unavailability as deterministic fallback.
7. Record Evidence/HUD provider mode as `codex_cli` only after a live exported
   build proves Godot-to-backend dispatch.

## Suggested Implementation Slices

### Slice 1: backend-only spike

- Add `NPC_RUNTIME_PROPOSAL_PROVIDER=codex-cli`.
- Add config fields:
  - `CODEX_CLI_BIN`
  - `CODEX_CLI_MODEL`
  - `CODEX_CLI_TIMEOUT_MS`
  - `CODEX_CLI_SANDBOX`
- Add a command-runner backed `CodexCliProposalGateway`.
- Keep tests on a fake runner; no live Codex is required for normal CI.
- Add a skipped/optional live smoke that requires logged-in Codex CLI.

### Slice 2: contract proof

- Feed a static Same Order perception packet through the `codex-cli` gateway.
- Verify strict parser pass/fail behavior.
- Verify deterministic fallback for missing auth, timeout, bad JSON, forbidden
  fields, mismatched `npcId`, and authority wording.

### Slice 3: Godot dispatch

- Wire `codex-cli` provider mode through the same backend decision service.
- Surface provider state in HUD/Evidence as `codex_cli`.
- Preserve deterministic runtime authority over all game consequences.

### Slice 4: product gate

- Only then update current product truth from `fallback_only_m1`.
- Require exported-build evidence, not just backend tests.

## Open Question

OpenClaw has moved toward a native Codex app-server harness. Dream Of One should
start with `codex exec` because it is smaller, officially documented for
non-interactive use, easier to sandbox, and enough for text proposals. Native
app-server style integration can be revisited only if `codex exec` cannot
provide stable structured proposal output.

## Current Decision

Keep the active product mode as `fallback_only_m1`.

Treat OpenClaw as a design reference for provider/auth separation, scoped CLI
credential discovery, and fail-closed validation. Do not import its auth system
as a runtime dependency until a separate implementation decision is made.
