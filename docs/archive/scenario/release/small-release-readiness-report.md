# Small Release Readiness Report

Status: superseded for AI access/release-truth details as of 2026-05-06. Use `docs/direction/03-director-decision-ledger.md` DDR-004 and `docs/direction/06-release-strategy.md` for the active API proposal-provider premise. Codex CLI-required demo language below is historical and not current release truth.

## Verdict

The report is now directionally valid, but the game is not yet small-release ready.

The correct release target is:

- itch.io-first technical demo/prologue;
- player-owned local Codex CLI required;
- no developer-hosted AI;
- no paid Steam Early Access;
- Steam demo only after itch.io setup/playtest proof.

## Current State

| Area | Current Assessment | Release Meaning |
|---|---|---|
| Scenario | Strong enough for a 20-30 minute technical demo if the beat-to-runtime matrix is completed. | Keep `Station Soft Inquest`; do not expand scope. |
| AI premise | Correct after revision: Codex CLI is the player-owned local AI worker; backend remains deterministic authority. | Implement setup/preflight and failure UX before gameplay polish. |
| Store strategy | itch.io first; Steam later. | Steam is too expectation-sensitive for the first external-CLI demo. |
| Platform readiness | Not release-ready. No `godot/export_presets.cfg` exists yet. | Add export presets and exported-build smoke before public release. |
| Codex integration | Feasible but not release-ready. Local `codex-cli 0.125.0` supports required command shape. | Implement worker, schema output, timeout, logs, and validator. |
| QA | Defined but not proven. | Need clean-machine Codex setup tests and exported-build runs. |
| Store assets | Not proven. | Need 5 real screenshots, gameplay GIF/trailer, cover/capsule, setup docs. |

## Research-Backed Decisions

| Decision | Rationale |
|---|---|
| Use itch.io as first public channel. | itch.io better supports experimental technical demos, external setup copy, and fast iteration. |
| Treat Steam as secondary. | Steam free demos imply install-and-play to many players; an external Codex/subscription prerequisite creates review and backlash risk. |
| Do not use paid Early Access. | Steam says Early Access is not crowdfunding and should not launch when the product is only a tech demo. |
| Require player-owned Codex CLI. | Project has no AI budget or hosting capacity; this is the only feasible AI path. |
| Use local `codex exec`, not direct API. | Official Codex docs support non-interactive `codex exec`, read-only sandbox, JSONL, output schema, and cached local auth. |
| Fail closed when Codex fails. | AI text is untrusted output; deterministic backend must own state, fallback, Exposure, Inquest, verdict, and termination. |
| Advertise only tested platforms. | Godot exports and Codex spawning differ by OS; platform tags must reflect real exported-build tests. |

## Minimum Release Requirements

### P0 Product

| Requirement | Pass |
|---|---|
| One complete run | Player can complete Station -> Store -> Studio -> Park -> Station. |
| Three outcomes | Clean cover, messy repair, verdict-ready all work. |
| Korean-first | Korean default; English selectable; no missing keys. |
| Keyboard-only | Full run possible without mouse, including camera and UI. |
| No fake AI mode | If Codex is unavailable, the game clearly says setup failed instead of pretending live AI works. |

### P0 Codex

| Requirement | Pass |
|---|---|
| CLI preflight | `codex --version`, `codex login status`, `codex exec --help`, and schema smoke pass. |
| Invocation | Game uses `codex exec --ask-for-approval never --sandbox read-only --ephemeral --skip-git-repo-check --json --output-schema ... --output-last-message ...`. |
| Isolation | Prompt context is sent through stdin from an app-owned runtime directory, not from player home/repo. |
| Timeout | Codex timeout produces a controlled setup/failure state. |
| Validation | Backend rejects invalid JSON, unknown IDs, unsupported claims, and authority attempts. |
| Evidence | Evidence records Codex active state, proposal ID, validation result, fallback reason, final line, and deterministic outcome. |

### P0 Build

| Requirement | Pass |
|---|---|
| Export presets | `godot/export_presets.cfg` exists for every advertised platform. |
| Exported build | Build launches outside the editor on every advertised platform. |
| Codex spawning | Exported build can find/spawn `codex` from PATH or configured absolute path. |
| Runtime paths | Settings, logs, state, and Evidence write to `user://` or OS app data. |
| Checks | Backend check, Godot import/syntax/smoke/runtime/playable/localization/keyboard/visual gates pass. |

### P0 Store/Docs

| Requirement | Pass |
|---|---|
| Above-fold warning | Page first paragraph states local Codex CLI and player-owned Codex access are required. |
| AI disclosure | Live AI-generated text disclosed; guardrails and deterministic fallback explained. |
| Privacy note | Explains bounded game context is sent through the player's configured OpenAI/Codex account. |
| Install guide | Covers Codex CLI install, login, supported OS, game launch, troubleshooting, known limits. |
| Media | 5 real gameplay screenshots plus short gameplay GIF/trailer. |

### P0 QA

| Requirement | Pass |
|---|---|
| Clean-machine setup | 2-3 testers start without Codex installed and reach first AI interaction using docs only. |
| Codex-ready playtest | At least 5 external Codex-ready testers complete one run. |
| Comprehension | At least 8 of 10 testers can explain why Exposure changed. |
| Failure soak | Missing binary, missing login, timeout, invalid JSON, and invalid authority output do not crash. |
| No P0/P1 bugs | No crash, softlock, unreadable critical text, broken end state, or false Evidence. |

## Current Blockers In This Repo

| Blocker | Evidence |
|---|---|
| No export presets | `godot/export_presets.cfg` is absent. |
| Codex worker not proven in exported game | Local CLI exists, but game-side preflight/worker/rejection path still needs implementation. |
| Store setup docs missing | Release docs define requirements, but no player-facing quickstart page is present yet. |
| Clean-machine tests absent | No external setup/playtest artifacts yet. |
| Steam readiness premature | Steam can be prepared later, but itch.io should validate the external dependency first. |

## Suggested Store Copy

Use this near the top of itch.io and any Steam page:

> Dream of One: Station Soft Inquest is a free technical demo. It requires a local installation of OpenAI Codex CLI and a player-owned ChatGPT/OpenAI account with Codex access. AI access is not included. The developer does not operate an AI server for this demo.

Required bullets:

- Contains live AI-generated NPC and Station text.
- Requires internet access, OpenAI Codex CLI, and a player-configured ChatGPT/OpenAI account or API key.
- AI access is not included with the demo; usage may count against the player's OpenAI plan, credits, rate limits, or billing.
- The game sends bounded in-game context to the player's local Codex/OpenAI setup.
- Do not enter personal, private, or sensitive information into gameplay text.
- AI output is constrained by game rules; invalid output is rejected or replaced with deterministic fallback text.

## Go / No-Go

Go only when:

1. exported build works outside editor;
2. local Codex preflight passes;
3. four NPC interactions use Codex CLI;
4. Codex failure cases are controlled;
5. three endings are playable;
6. Korean and English runs complete;
7. store page discloses AI and external dependency above the fold;
8. clean-machine setup testers can run the demo without direct help.

Otherwise, keep the build private or restricted on itch.io.

## Sources

- Steam Release Process: https://partner.steamgames.com/doc/store/releasing
- Steam Review Process: https://partner.steamgames.com/doc/store/review_process
- Steam Demos: https://partner.steamgames.com/doc/store/application/demos
- Steam Early Access: https://partner.steamgames.com/doc/store/earlyaccess
- Steam AI Content announcement: https://steamcommunity.com/groups/steamworks/announcements/detail/3862463747997849619
- itch.io Quality Guidelines: https://itch.io/docs/creators/quality-guidelines
- itch.io Getting Indexed: https://itch.io/docs/creators/getting-indexed
- Godot Exporting Projects: https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html
- Godot Data Paths: https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html
- Godot Internationalization: https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html
- OpenAI Codex CLI: https://developers.openai.com/codex/cli
- OpenAI Codex Non-interactive Mode: https://developers.openai.com/codex/noninteractive
- OpenAI Codex Authentication: https://developers.openai.com/codex/auth
- Rami Ismail, Prototypes & Vertical Slice: https://ltpf.ramiismail.com/prototypes-and-vertical-slice/
- Playdigious Pitch Guide: https://playdigious.com/wp-content/uploads/2023/06/PlaydigiousOriginals_HowToPitch.pdf
