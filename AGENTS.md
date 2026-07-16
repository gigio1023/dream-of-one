# Repo Agent Notes

Read [`docs/README.md`](docs/README.md) before changing anything. It is the
single documentation index; every active document hangs off it. Do not build
from `docs/archive/` — that tree is frozen v1 history.

Repo-specific agent skills live in `.agents/skills/` (Claude Code reads them
through the tracked `.claude/skills` symlink). They route to the docs; the
docs stay the source of truth.

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
| Godot client | Presentation, input, first-person world, HUD, scene-local interaction | Suspicion state, record semantics, verdicts, session termination |
| NPC runtime (TS) | Validity: tool validation, sight/context separation, delta caps and clamps, records, ledger, scheduling, lifecycle, provider-interruption state | Final art, camera feel, NPC speech, social judgment, or verdict content |
| AI provider (via ports) | NPC wording, reply suggestions, suspicion judgment with why-lines, next tool calls — all inside schemas | Any direct world mutation, conjuring unseen context, blocking session end |

Provider access goes exclusively through the port-and-adapter layer defined in
[`docs/tech/ai-provider-ports.md`](docs/tech/ai-provider-ports.md). Never
hardcode a vendor SDK call or base URL outside an adapter. Never assume a
specific model is available; profiles are config, availability is checked at
runtime, and failure must visibly interrupt the affected event without
rule-authored speech, judgment, action, memory, testimony, or verdict.

Production gameplay is provider-first. Do not store authored choice sets, NPC
reply sequences, or ordered social consequences in production storylets.
Deterministic scripted proposal sets are allowed only behind a test adapter or
generated fixture used by smoke tests.

## Verification

Commands and policy: [`docs/tech/verification.md`](docs/tech/verification.md).
The short list:

```bash
bun run --cwd backend/npc-runtime check
$GODOT_BIN --headless --import --path godot
DREAM_SESSION_MODE=fixture $GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
```

Test policy: few, high-signal, Detroit-style checks that protect deterministic
authority, schema compatibility, the provider boundary, or a player-visible
consequence. No coverage padding. No test-only slices without naming the game
consequence they protect.

### Headless-first Godot workflow

- **Default:** keep the game stopped while inspecting or editing. Use repository
  files, the Godot CLI with `--headless`, and non-running Godot AI editor/session
  inspection first. Do not call `project_run` merely to prove that code parses,
  imports finish, or a scene loads.
- **Headless can prove:** imports; scene and script loading; deterministic
  physics, collision, and navigation consequences; scripted input delivery;
  sidecar HTTP behavior; scheduler and hearing state; provider metadata and
  budgets; localization parity; and bundled font coverage. Run only the
  narrowest smoke relevant to the playable change.
- **A rendered interactive run is required for:** composition and pixels;
  character readability; lighting, materials, and animation appearance; camera
  and movement feel; real mouse capture and focus; native OS IME composition;
  frame pacing; and the fun gate. A headless pass must not be reported as
  evidence for any of these claims.
- **Godot AI boundary:** the vendored editor plugin is disabled by default under
  the headless display driver. A direct helper-autoload smoke exercises code
  paths only; it is not an MCP play session, framebuffer capture, or hands-on
  play evidence. Never use `GODOT_AI_ALLOW_HEADLESS` to treat an empty
  dummy-renderer viewport as visual proof.
- **Window-focus rule:** reserve windowed Godot AI play for the smallest final
  route that genuinely needs rendered pixels, native input, or player judgment.
  Before any command or MCP operation that may open or focus a game window,
  tell the user and wait until that notice has been delivered. Otherwise, do not
  interrupt their desktop work.

The exact evidence boundary and maintained commands live in
[`docs/tech/verification.md`](docs/tech/verification.md). `CLAUDE.md` is a
symlink to this file, so this policy is shared by Codex and Claude Code.

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
