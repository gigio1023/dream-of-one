# Codex CLI Auth Runtime Assessment

Date: 2026-05-18
Status: candidate provider path, not current product truth

## Local Environment Observed

- Host class: Ubuntu Linux ARM/aarch64 server.
- Shell: repo work is run from a terminal session, with no `DISPLAY` or
  `WAYLAND_DISPLAY` currently available.
- Godot: local ARM Godot CLI is available through per-device `GODOT_BIN`.
- Fresh-player setup: ignored repo-local `build/` env and launcher files can
  make the comprehension helper preflight pass on this server, but observed
  human play still needs a GUI/display route.
- Codex CLI: `codex-cli 0.130.0` is installed.
- Codex login: `codex login status` reports ChatGPT login.
- Codex credential cache exists locally under Codex home. Treat it as a secret;
  never commit, paste, or copy it into tracked docs.

## Official Documentation Basis

Sources checked:

- OpenAI Codex authentication:
  https://developers.openai.com/codex/auth
- OpenAI Codex non-interactive mode:
  https://developers.openai.com/codex/noninteractive

Relevant official guidance:

- Codex can authenticate with ChatGPT or an API key and caches login details for
  the CLI/IDE/app.
- The cached Codex auth file contains access tokens and must be treated like a
  password.
- Headless devices should use device-code login when browser callback login is
  not practical.
- For programmatic Codex CLI workflows, OpenAI recommends API-key auth by
  default. ChatGPT-managed auth in automation is advanced and intended for
  trusted runners when the workflow specifically needs a Codex user account.
- For general OpenAI API calls, official Codex auth docs say to keep using
  Platform API keys.
- `codex exec` can run non-interactively, emit JSONL, write the final message,
  and request structured output through an output schema.

## Decision

Do not reinterpret Codex ChatGPT login as `OPENAI_API_KEY`, and do not extract
or reuse the Codex credential cache inside the game runtime.

If Dream of One wants an OpenClaw-style "Codex auth by default" path, the
closer OpenClaw match is a direct `openai-codex` provider mode, not `codex
exec`. OpenClaw also supports native app-server and CLI-related paths, but its
direct LLM-provider path registers `openai-codex` with
`openai-codex-responses` and `https://chatgpt.com/backend-api/codex`.

If a CLI-worker experiment is still pursued independently, implement it as an
explicit optional `codex-cli` provider mode:

1. Preflight `codex --version`, `codex login status`, required `codex exec`
   flags, and model/provider selection.
2. Invoke `codex exec` as a local process with the smallest sandbox and prompt
   context needed.
3. Require a strict JSON Schema or parseable JSON output contract.
4. Treat all Codex output as untrusted proposal text.
5. Reject unsupported fields, authority claims, invalid IDs, hidden actions,
   and direct state mutations.
6. Preserve deterministic backend authority over records, risk, Evidence,
   Exposure, inquest, verdict, fallback, and session end.
7. Add timeout, cancellation, rate-limit/auth failure handling, and deterministic
   fallback.
8. Record provider mode in HUD/Evidence as `codex_cli` only after a live
   exported-build proof passes.

## Current Product Truth

The current active M1 truth remains `fallback_only_m1`.

The existing `openai-api` provider path remains the correct path for direct
OpenAI Responses API calls and uses `OPENAI_API_KEY`. Codex CLI auth is not a
drop-in replacement for that path.

Codex CLI auth is feasible as a future local-player/provider experiment, but it
is not the primary OpenClaw-style LLM provider path. The better next target is a
separate `openai-codex` provider mode that authenticates with Codex/ChatGPT
OAuth and calls the Codex Responses backend through the same proposal schema as
the existing `openai-api` path.

## Next Proof If Pursued

Create a narrow `openai-codex` provider spike that does not touch product
claims:

- add backend-only auth/profile preflight for Codex OAuth;
- add one schema-constrained Codex Responses proposal call against a static Same
  Order perception packet;
- verify missing login, refresh failure, timeout, invalid JSON,
  authority-field rejection, and deterministic fallback;
- only after backend proof, wire Godot dispatch and HUD provider-state evidence.

OpenClaw was reviewed as a design reference for this path. See
`openclaw-codex-auth-adoption-proposal-2026-05-18.md`.
