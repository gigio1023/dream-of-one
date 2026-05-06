# Small Release Definition

Status: superseded for AI access/release-truth details as of 2026-05-06. Use `docs/direction/03-director-decision-ledger.md` DDR-004 and `docs/direction/06-release-strategy.md` for the active API proposal-provider premise. Codex CLI-required demo language below is historical and not current release truth.

## Decision

The first releasable version of Dream of One should be a Codex CLI-required technical demo/prologue.

Release name:

- `Dream of One: Station Soft Inquest - Codex CLI Demo`

Target stores:

- Primary: itch.io restricted/public demo for Codex CLI users.
- Secondary: Steam Coming Soon page for wishlist/funnel work.
- Conditional: Steam demo only after the itch.io release proves setup, disclosure, and player expectation handling.

This project has no budget or infrastructure for developer-hosted AI. The player must provide their own Codex CLI installation, login, and subscription/access. Without that, the AI NPC feature is unavailable.

## Release Position

| Option | Decision | Reason |
|---|---|---|
| itch.io Codex-required demo | Primary small release. | Best fit for a technical audience that can install CLI tools and accept external account requirements. |
| Steam Coming Soon page | Secondary public presence. | Useful for wishlists while keeping the Codex-required demo risk on itch first. |
| Steam Codex-required free demo | Conditional after itch proof. | A Steam demo that is not install-and-play has high expectation/review risk. |
| Steam paid Early Access | Defer. | A paid Steam release that requires a separate AI subscription is high-risk until playtest demand is proven. |
| Developer-hosted Codex worker | Out of scope. | No AI budget, hosting budget, rate-limit operations, or account support capacity. |
| Offline fallback-only build | QA/debug only. | It can test deterministic rules, but it is not the AI game. |

## External Baseline

| Source | Requirement To Apply |
|---|---|
| Steamworks Release Process | Store presence and game build must both be reviewed before release. Store page review usually takes 3-5 business days; plan at least 7 days. A Coming Soon page must be live for at least 2 weeks before release. |
| Steam Demos | A Steam demo is a separate app/build/checklist path attached to the base game. Do not treat it as just another uploaded ZIP. |
| Steam Direct / Onboarding | Steam has app fee and timing overhead. Do not make Steam the first proof channel for an external-CLI technical demo. |
| Steam Graphical Assets | Required capsules, library assets, icons, and at least 5 real gameplay screenshots. Screenshots should show actual play, not concept art or marketing text. |
| Steam Early Access | Early Access must deliver a playable game worth the current value at purchase time; do not use it for a fragile prototype. |
| Steam AI disclosure reporting | Player-facing live AI-generated NPC text must be disclosed and guardrailed. Codex-powered NPC lines are player-facing live-generated AI content. |
| itch.io Quality Guidelines | Public pages should be ready before publication, accurately tagged, include screenshots/cover art, disclose AI use, and avoid misleading platform/language claims. |
| Godot 4.6 Export Docs | Export templates must be installed; exported PC builds must be tested outside the editor. |
| Godot 4.6 Localization Docs | Korean and English should use Godot translations, not hard-coded UI text. Locale fallback must be configured. |
| Codex CLI local command | `codex exec` supports non-interactive prompts, `--cd`, `--sandbox read-only`, `--ask-for-approval never`, `--output-schema`, and JSON event output. |
| Codex CLI auth | Codex supports ChatGPT login or API-key login, caches credentials locally, and can be checked through `codex login status`. |
| Rami Ismail: Vertical Slice | The slice must prove the team can make the game, not merely that the idea is interesting. |
| Playdigious Pitch Guide | A fundable pitch needs a playable PC build, deck, market/comps, budget, plan, and team context. |

## Public Demo Scope

The demo is release-ready only if it feels like a complete short AI game for players who already meet the Codex prerequisite.

| Area | Minimum |
|---|---|
| Runtime length | 20-30 minute first run; 10-15 minute replay. |
| Scenario | One complete `Station Soft Inquest` civic loop: Station -> Store -> Studio -> Park -> Station. |
| Outcomes | Clean cover, messy repair, lucid fracture/verdict-ready. |
| Core mechanic | Read procedure -> choose bounded speech act -> local Codex CLI NPC pressure -> deterministic Evidence -> Station comparison. |
| Codex prerequisite | Game detects `codex` on PATH, verifies non-interactive `codex exec`, and blocks AI play until setup passes. |
| Player account | Player uses their own Codex CLI login/subscription/access. No developer AI account is bundled. |
| Language | Korean default, English selectable, no missing translation keys. |
| Controls | Keyboard-only playable, mouse playable, arrow-key camera works. |
| AI | Codex CLI-backed NPC pressure visible in at least four interactions. |
| AI failure path | If Codex is unavailable, not logged in, times out, or emits invalid output, the game shows setup/failure state and deterministic Evidence/fallback reason. It must not pretend the AI feature is active. |
| Save/session | Settings persist; run state can restart cleanly; no corrupted session after quit. |
| Visual quality | One authored civic hub with readable text surfaces, composed lighting, prop clusters, no empty tutorial-box look. |
| Audio | Basic ambience, UI feedback, Station pressure cue, independent volume controls. |
| Evidence | Every Exposure or Station transition emits a why-line and evidence artifact. |
| End state | Demo reaches clear defuse/warning/verdict-ready screen with why-line. |

## Target Platform Order

Advertise only platforms that pass clean-machine setup and exported-build testing.

| Order | Platform | Release Use | Reason |
|---:|---|---|---|
| 1 | Linux x86_64 | First technical validation target if a Linux test machine is available. | Least app-store/signing friction; Codex CLI and terminal setup are natural for the target audience. |
| 2 | Windows x64 | Highest audience value after Codex/PATH spawning is proven. | Must validate native PowerShell Codex, PATH visibility from a GUI-launched game, Defender/SmartScreen, and non-embedded PCK packaging. |
| 3 | macOS Universal 2 | Ship only after signing/notarization and external `codex` spawning are verified. | macOS Gatekeeper, app bundle, and sandboxing can block local CLI assumptions. Do not use App Store sandboxing. |

## Codex CLI Release Policy

The released demo requires player-owned Codex CLI.

Required install/runtime assumptions:

- `codex` is installed and available on PATH.
- Player has completed `codex login`.
- Player has active Codex access through their own OpenAI account/subscription.
- The game can spawn `codex exec` as a local child process.
- The game never asks for or stores OpenAI API keys.
- The game does not ship developer credentials.

Required invocation shape:

```bash
codex exec \
  --cd <game-runtime-context-dir> \
  --ask-for-approval never \
  --sandbox read-only \
  --ephemeral \
  --skip-git-repo-check \
  --json \
  --output-schema <npc-proposal-schema.json> \
  --output-last-message <final-json-output-path> \
  -
```

Pass the structured NPC prompt through stdin. Treat `--output-schema` as a formatting request, not as authority. Backend validation remains mandatory.

Allowed release implementations:

| Implementation | Release Use |
|---|---|
| Player-owned local Codex CLI | Required AI path for small release. |
| Curated deterministic fallback | Required only for error display, QA, and non-AI rule testing. It does not count as AI gameplay. |
| Developer-hosted AI worker | Not allowed for first small release. |

Required guardrails:

- Preflight screen checks Codex CLI availability before starting an AI run.
- Prompt sends compact game state only: NPC role, ObservationFrame, active Cover Test, allowed intents/actions, and required JSON schema.
- Player-facing disclosure says NPC lines are generated through the player's local Codex CLI account.
- Timeout budget per interaction: target 3-8 seconds; hard failure/fallback after timeout.
- Backend rejects non-JSON, unknown IDs, authority claims, unsupported observations, unsafe text, and verdict/intake/termination attempts.
- Evidence pack records proposal ID, validation result, fallback reason, final line, deterministic state result, and whether Codex was active.

## Required Setup UX

The demo must include an in-game setup screen before the first run.

| Check | Pass | Fail Message |
|---|---|---|
| `codex` binary found | `codex --version` exits successfully. | `Codex CLI가 필요합니다. 설치 후 다시 실행하세요.` |
| Login/access works | `codex login status` exits successfully and a minimal `codex exec --sandbox read-only --ask-for-approval never` probe returns structured output. | `Codex 로그인이 필요하거나 계정에서 Codex 사용이 불가합니다.` |
| Required flags exist | `codex exec --help` includes `--sandbox`, `--json`, `--output-schema`, `--output-last-message`, `--ephemeral`, and `--skip-git-repo-check`. | `현재 Codex CLI 버전이 데모 실행 조건을 충족하지 않습니다.` |
| Sandbox works | Probe runs with read-only sandbox. | `읽기 전용 Codex 실행이 실패했습니다. Codex 설정을 확인하세요.` |
| JSON schema works | Probe respects output schema or backend parser accepts JSON-only result. | `NPC 제안 형식 검증에 실패했습니다.` |
| Timeout works | Forced timeout produces controlled error. | `Codex 응답 시간이 초과되었습니다. 다시 시도하거나 설정을 확인하세요.` |

Do not hide setup failure behind generic "AI unavailable" text. The audience is technical enough to act on precise setup errors.

## Release-Ready Content Checklist

| ID | Requirement | Owner |
|---|---|---|
| SR-CONTENT-01 | Beat-to-runtime matrix complete for every required beat. | Game Director / Narrative |
| SR-CONTENT-02 | Four Cover Tests implemented with trigger, text surface, examiner, speech choices, artifact, why-line, and defuse. | Narrative / Gameplay |
| SR-CONTENT-03 | Korean line bank includes setup, pressure, fallback, repair, verdict, and Codex prompt examples for Store, Studio, Park, Station. | Korean Writer |
| SR-CONTENT-04 | English localization preserves function and tone for all shipped text, including setup/failure messages. | Localization |
| SR-CONTENT-05 | No lore-only text. Every sign, bark, and line has a gameplay role. | Game Director |

## Release-Ready Technical Checklist

| ID | Requirement | Owner |
|---|---|---|
| SR-TECH-01 | Godot 4.6 version pinned and export templates installed. | Godot Engineer |
| SR-TECH-02 | `godot/export_presets.cfg` exists for every advertised platform. | Godot Engineer |
| SR-TECH-03 | First advertised platform export works outside editor and can spawn `codex` from PATH or configured absolute path. | Godot Engineer |
| SR-TECH-04 | Windows x64 ships only after native Codex/PATH, Defender/SmartScreen, and non-embedded PCK packaging are tested. | Godot Engineer |
| SR-TECH-05 | macOS ships only after local `codex` spawning, sandbox-disabled distribution, signing/notarization, and Gatekeeper behavior are documented. | Producer / Engineer |
| SR-TECH-06 | Runtime state, settings, logs, and Evidence write to `user://` or OS app data, not beside the executable or inside `res://`. | Gameplay / Backend |
| SR-TECH-07 | `npm run check --prefix backend/npc-runtime` passes. | Backend Engineer |
| SR-TECH-08 | Godot import, syntax, scene load, runtime slice, playable slice, localization, keyboard look, and visual capture gates pass. | Gameplay Engineer |
| SR-TECH-09 | Exported-build smoke exists and runs outside the editor on every advertised platform. | QA |
| SR-TECH-10 | Codex worker has preflight, timeout, structured logs, deterministic rejection fixtures, output schema, and no direct state authority. | Backend Engineer |
| SR-TECH-11 | Crash-free 30-minute soak run with Codex active. | QA |
| SR-TECH-12 | Failure soak run covers missing Codex binary, missing login, timeout, invalid JSON, and invalid authority attempts. | QA |
| SR-TECH-13 | Performance target: stable 60 FPS on target hardware at 1080p, excluding Codex response latency. | Godot / Tech Art |

## Release-Ready Store Checklist

| ID | Requirement | Owner |
|---|---|---|
| SR-STORE-01 | Page title or first paragraph states: `Requires local Codex CLI and player-owned Codex access.` | Producer |
| SR-STORE-02 | Install guide explains Codex CLI setup, login, supported OS, and how the game invokes Codex. | Producer / Backend |
| SR-STORE-03 | AI disclosure explains live-generated NPC text, player-owned account use, and deterministic backend guardrails. | Producer / Backend |
| SR-STORE-04 | Privacy note states what game context is sent to Codex through the player's account. | Producer / Backend |
| SR-STORE-05 | Required capsules, cover art, icon, and 5 real gameplay screenshots complete. | Art / Producer |
| SR-STORE-06 | Short gameplay trailer/GIF shows setup pass, Codex line, Evidence, and Station verdict edge. | Marketing |
| SR-STORE-07 | itch page includes accurate platforms/languages, external dependency disclosure, setup guide, AI disclosure, and direct downloadable builds. | Producer |
| SR-STORE-08 | Credits list free assets, licenses, tools, and AI usage notes. | Producer |

Required page copy:

- `Contains live AI-generated NPC and Station text.`
- `Requires internet access, OpenAI Codex CLI, and a player-configured ChatGPT/OpenAI account or API key.`
- `AI access is not included with the demo; usage may count against the player's OpenAI plan, credits, rate limits, or billing.`
- `The game sends bounded in-game context to the player's local Codex/OpenAI setup so NPCs can respond to the current scene.`
- `The developer does not operate an AI server for this demo.`
- `Do not enter personal, private, or sensitive information into gameplay text.`
- `AI dialogue may be unexpected. Responses are constrained by game rules; invalid output is rejected or replaced with deterministic fallback text.`

## Release-Ready QA Gates

| Gate | Pass Criteria |
|---|---|
| Codex setup | At least 5 external testers install/login/run Codex CLI and launch the demo from the written setup guide. |
| Blind comprehension | At least 8 of 10 blind testers can explain why Exposure changed after one run. |
| Completion | At least 8 of 10 Codex-ready testers finish one outcome without reading design docs. |
| Clean-machine setup | At least 2-3 testers start from a machine without Codex installed and reach the first AI interaction from the setup guide only. |
| Input | Full run possible with keyboard only, including camera control and UI navigation. |
| Text legibility | All required 3D signs readable at intended distance; HUD text does not overlap at 1080p. |
| AI validity | Four shipped NPC interactions call local Codex CLI and produce accepted or rejected proposals with Evidence. |
| AI failure | Missing binary, missing login, timeout, invalid JSON, and invalid authority attempts produce clear setup/failure messages and do not crash. |
| Localization | Korean and English runs complete with no missing keys, clipped text, or untranslated critical prompts. |
| Regression | No P0/P1 bugs open; no known crash on launch, setup, Codex call, language switch, scene transition, or end state. |
| Store honesty | Screenshots/trailer and store copy clearly show the external Codex CLI requirement. |

## Minimum Backlog Before Public Demo

| Priority | Work |
|---|---|
| P0 | Implement player-owned local Codex CLI preflight. |
| P0 | Implement `codex exec` worker with read-only sandbox, output schema, timeout, logs, and deterministic validator. |
| P0 | Add `godot/export_presets.cfg` and matching export-template setup docs. |
| P0 | Add exported-build smoke test outside the Godot editor. |
| P0 | Move exported runtime writes to `user://` or OS app data. |
| P0 | Complete beat-to-runtime matrix for `Station Soft Inquest`. |
| P0 | Finish three outcome paths and Station end-state UI. |
| P0 | Make keyboard-only controls and arrow-key camera reliable. |
| P0 | Add deterministic failures for missing Codex, missing login, timeout, invalid JSON, and invalid authority attempts. |
| P0 | Export first advertised platform build and verify it can spawn `codex` outside the editor. |
| P1 | Add audio pass, settings menu, save/settings persistence, and credits/licenses. |
| P1 | Produce 5 real gameplay screenshots and one short gameplay trailer/GIF. |
| P1 | Run at least 10 blind playtests, including 5 external Codex setup tests. |
| P1 | Prepare Steam/itch AI disclosure, external dependency copy, setup guide, and privacy notes. |
| P2 | Add controller polish, Steam Deck pass, macOS signing/notarization, and extra NPC variants. |

## Explicit Non-Goals For Small Release

- No paid Early Access.
- No full game launch.
- No developer-hosted Codex worker.
- No bundled developer AI credentials.
- No OpenAI API key input flow.
- No promise that the AI feature works without player-owned Codex CLI access.
- No Steam demo before itch.io setup/playtest proof.
- No advertised platform that has not passed exported-build testing.
- No procedural scenario generator.
- No broad NPC schedule simulation.
- No voice/TTS dependency.
- No extra districts beyond Station, Store, Studio, Park.
- No unbounded free-text outcome authority.

## Go / No-Go Rule

Release the demo only when all P0 work is complete and the team can show:

1. a real exported build;
2. player-owned Codex CLI setup pass;
3. one full Korean run with Codex active;
4. one full English run with Codex active;
5. one missing-Codex failure run;
6. one invalid-Codex-output rejection run;
7. one clean-cover ending;
8. one messy-repair ending;
9. one verdict-ready ending;
10. five gameplay screenshots;
11. blind playtest evidence that players understand the core loop and setup requirement.

If any of these fail, keep the build private or restricted on itch.io.

## Source Links

- Steamworks Release Process: https://partner.steamgames.com/doc/store/releasing
- Steamworks Review Process: https://partner.steamgames.com/doc/store/review_process
- Steam Demos: https://partner.steamgames.com/doc/store/application/demos
- Steam Direct Fee: https://partner.steamgames.com/doc/gettingstarted/appfee
- Steam Coming Soon: https://partner.steamgames.com/doc/store/coming_soon
- Steam Graphical Assets: https://partner.steamgames.com/doc/store/assets
- Steam Early Access: https://partner.steamgames.com/doc/store/earlyaccess
- Steam AI disclosure update: https://steamcommunity.com/groups/steamworks/announcements/detail/3862463747997849619
- itch.io Quality Guidelines: https://itch.io/docs/creators/quality-guidelines
- itch.io Getting Indexed: https://itch.io/docs/creators/getting-indexed
- Godot 4.6 release: https://godotengine.org/releases/4.6/
- Godot export docs: https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html
- Godot internationalization docs: https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html
- Godot data paths: https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html
- OpenAI Codex CLI docs: https://developers.openai.com/codex/cli
- OpenAI Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- OpenAI Codex authentication: https://developers.openai.com/codex/auth
- Rami Ismail, Prototypes & Vertical Slice: https://ltpf.ramiismail.com/prototypes-and-vertical-slice/
- Playdigious pitch guide: https://playdigious.com/wp-content/uploads/2023/06/PlaydigiousOriginals_HowToPitch.pdf
