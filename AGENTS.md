# Repo Agent Notes

Read [`docs/README.md`](docs/README.md) before changing anything. It is the
single documentation index; every active document hangs off it. Do not build
from `docs/archive/` — that tree is frozen v1 history.

## Operating Model

- The deliverable is a playable game. The single product gate is the fun gate:
  after a slice, run the game and ask "would I play this again for five
  minutes?" Record the honest answer in the PR description. No other standing
  gate exists.
- Work in small playable slices: one readable game improvement, one narrow
  proof run (smoke or manual play), one commit. Follow `CONTRIBUTING.md` for
  commit and push discipline.
- Implementation cost is treated as near zero (AI-built game). Plans are
  allowed to be ambitious; what is rationed is direction changes and process,
  not code.
- Current milestone and its detailed spec live in
  [`docs/plan/roadmap.md`](docs/plan/roadmap.md). Do not start work that
  belongs to a later milestone unless the current one is blocked.

## Process Guardrails (postmortem-derived)

v1 died of process, not code — see
[`docs/history/v1-postmortem.md`](docs/history/v1-postmortem.md). These rules
are load-bearing:

- Do not create verification ledgers, evidence gates, council reviews, proof
  audits, comprehension packets, session kits, or any standing tracker file.
  If a fact matters, it goes in the relevant doc, the PR, or a test.
- Do not add a direction document mid-milestone. Direction changes require a
  finished (or explicitly killed) milestone and must edit the existing vision
  docs rather than adding numbered addenda.
- Do not block work on external humans. Playtests inform; they never gate.
- Do not spend a slice on tests, reports, tooling, or helper automation unless
  a concrete playable change requires it.
- A maximum of one `docs/plan/m*.md` file is "active" at a time.

## Authority Boundary

| Layer | Owns | Must not own |
|---|---|---|
| Godot client | Presentation, input, tilemaps, HUD, scene-local interaction | Suspicion math, record semantics, verdicts, session termination |
| NPC runtime (TS) | Deterministic validation, suspicion, records, ledger, scheduling, fallback | Final art, camera feel |
| AI provider (via ports) | Proposing NPC wording and next tool calls inside schemas | Any direct world mutation, risk tags, verdicts, session end |

Provider access goes exclusively through the port-and-adapter layer defined in
[`docs/tech/ai-provider-ports.md`](docs/tech/ai-provider-ports.md). Never
hardcode a vendor SDK call or base URL outside an adapter. Never assume a
specific model is available; profiles are config, availability is checked at
runtime, and deterministic fallback must always work.

## Verification

Commands and policy: [`docs/tech/verification.md`](docs/tech/verification.md).
The short list:

```bash
npm run check --prefix backend/npc-runtime
$GODOT_BIN --headless --import --path godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
```

Test policy: few, high-signal, Detroit-style checks that protect deterministic
authority, schema compatibility, the provider boundary, or a player-visible
consequence. No coverage padding. No test-only slices without naming the game
consequence they protect.

## Path Portability

- No machine-specific absolute paths in tracked files. Use `GODOT_BIN` and
  repo-relative paths.
- Per-device launchers, exported builds, and auth/env files live in ignored
  `build/` paths or environment variables.
- Secrets and API keys are env vars (`MODELSCOPE_API_KEY`, `OPENAI_API_KEY`,
  ...) — never committed, never printed.

## Content Rules

- Korean is the first-authored content language; English follows via the
  localization path. Player-facing strings live in content files, not code.
- Scenario canon lives in `docs/scenario/`. Reuse it before writing new canon.
- Third-party art follows [`docs/art/asset-pipeline.md`](docs/art/asset-pipeline.md):
  CC0 packs may be committed; paid packs (e.g. LimeZu) are downloaded locally
  into gitignored paths and never pushed to this public repo.
