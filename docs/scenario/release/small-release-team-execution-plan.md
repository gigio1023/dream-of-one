# Codex CLI Demo Team Execution Plan

Status: superseded for AI access/release-truth details as of 2026-05-06. Use `docs/direction/03-director-decision-ledger.md` DDR-004, `docs/direction/06-release-strategy.md`, and `plan.md` for the active API proposal-provider premise and milestone ladder. Codex CLI-required demo language below is historical and not current release truth.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel implementation tasks or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lead a small team from the current Godot prototype to a releasable itch.io-first Codex CLI-required technical demo of `Station Soft Inquest`.

**Architecture:** Godot owns 3D presentation, controls, UI, scene state, and observed local results. Backend owns Codex CLI invocation, schema validation, fallback, Evidence, Exposure, Station intake, Inquest, verdict, and termination. Players provide their own local Codex CLI installation, login, and subscription/access.

**Tech Stack:** Godot 4.6.x, GDScript, TypeScript backend under `backend/npc-runtime`, local `codex exec`, JSON Schema, itch.io release, optional later Steam Coming Soon/demo path.

---

## Source Of Truth

| Purpose | Document |
|---|---|
| Release definition | `docs/scenario/release/small-release-definition.md` |
| Current readiness verdict | `docs/scenario/release/small-release-readiness-report.md` |
| Small-release game design pack | `docs/scenario/release/game-design/README.md` |
| Scenario authoring method | `docs/scenario/release/game-design/00-authoring-method.md` |
| Beat-to-runtime matrix | `docs/scenario/release/game-design/02-beat-to-runtime-matrix.md` |
| Codex NPC interaction contract | `docs/scenario/release/game-design/03-codex-npc-interaction-contract.md` |
| Level and environment design | `docs/scenario/release/game-design/04-level-and-environment-design.md` |
| Onboarding/localization/accessibility | `docs/scenario/release/game-design/05-onboarding-localization-accessibility.md` |
| Polish and release quality bar | `docs/scenario/release/game-design/06-polish-release-quality-bar.md` |
| Scenario canon | `docs/scenario/README.md` |
| Codex gameplay architecture | `docs/scenario/pitch/02-ai-gameplay-architecture.md` |
| Codex CLI worker contract | `docs/scenario/pitch/07-codex-cli-npc-runtime.md` |
| Vertical slice scope | `docs/scenario/pitch/03-vertical-slice-plan.md` |
| Scenario quality bar | `docs/scenario/bible/11-quality-bar-and-validation.md` |

Do not use `docs/migration/godot/` as scenario canon. Use it only for migration/runtime gate references.

## Release Target

| Field | Decision |
|---|---|
| Release name | `Dream of One: Station Soft Inquest - Codex CLI Demo` |
| First channel | itch.io restricted/public technical demo |
| Steam | Coming Soon page only at first; Steam demo after itch setup proof |
| Price | Free demo |
| AI cost | Player-owned Codex CLI/account/subscription/access |
| Developer AI hosting | Explicitly out of scope |
| Supported content | One complete `Station Soft Inquest` loop |
| Supported language | Korean default, English selectable |
| Minimum playtime | 20-30 minute first run, 10-15 minute replay |

## Team Shape

| Role | Primary Responsibility | Backup |
|---|---|---|
| Game Director / Product Owner | Scope, hook, release calls, final go/no-go. | Producer |
| Godot Gameplay Engineer | Player loop, UI, controls, scene state, export smoke. | Technical Artist |
| Backend / Codex Systems Engineer | Codex preflight, `codex exec` worker, validator, Evidence. | Godot Engineer |
| Narrative Designer / Korean Writer | Beat matrix, barks, why-lines, setup/failure Korean text. | Game Director |
| 3D Environment / Technical Artist | Free asset pass, lighting, route readability, screenshots. | Godot Engineer |
| Producer / QA Coordinator | Linear/Beads hygiene, build checklist, playtests, store page. | Game Director |
| Marketing / Trailer Contractor | Gameplay GIF/trailer, itch cover, Steam capsules when approved. | Producer |

## Operating Model

| Rule | Practice |
|---|---|
| Work SoT | One Linear issue at a time as external planning source. |
| Local decomposition | Use Beads (`bd`) for internal task graph and dependencies. |
| Branching | One release branch for the demo, with small reviewable commits. |
| Review | Every P0 issue needs implementation evidence and run commands. |
| Scope control | Anything not required by this plan moves to `Deferred`, not into the demo. |
| Release authority | Game Director and Producer both sign the go/no-go gate. |

## Definition Of Ready

A task can enter implementation only when it has:

- Linear issue link or Beads task ID.
- Owner and backup.
- Files to touch.
- Acceptance criteria.
- Verification commands.
- Evidence artifact path.
- Do-not list.
- If the task touches gameplay, scenario, UI text, AI NPC behavior, or 3D hub layout: a mapped requirement from `docs/scenario/release/game-design/`.

## Definition Of Done

A task is done only when:

- Acceptance criteria pass.
- Required commands pass locally.
- Evidence artifact or screenshot exists when required.
- Docs are updated if behavior or setup changed.
- No unrelated user changes are reverted.
- Handoff note names changed files and remaining risks.

## File Responsibility Map

| Area | Files |
|---|---|
| Backend config/runtime paths | `backend/npc-runtime/src/config.ts` |
| Godot runtime schema | `backend/npc-runtime/src/godot/runtime-schema.ts` |
| Codex broker/tool boundary | `backend/npc-runtime/src/broker/codex-broker.ts`, `backend/npc-runtime/src/broker/codex-tool-gateway.ts` |
| Runtime decision/fallback | `backend/npc-runtime/src/runtime/decision-service.ts`, `backend/npc-runtime/src/runtime/fallback.ts`, `backend/npc-runtime/src/runtime/readiness.ts` |
| Backend evidence/telemetry | `backend/npc-runtime/src/runtime/telemetry.ts`, `backend/npc-runtime/src/broker/thread-store.ts` |
| Godot main scene | `godot/scenes/main.tscn` |
| Godot player/controls | `godot/scenes/actors/player.tscn`, `godot/scripts/actors/player_controller.gd` |
| Godot playable loop | `godot/scripts/runtime/playable_session.gd`, `godot/scripts/runtime/runtime_slice.gd` |
| Godot UI | `godot/scenes/ui/social_stealth_hud.tscn`, `godot/scripts/ui/social_stealth_hud.gd` |
| Godot world/layout | `godot/data/world_layout.json`, `godot/scripts/world/world_generator.gd`, `godot/scripts/world/world_shell.gd` |
| Godot localization | `godot/scripts/localization/localization_manager.gd` |
| Godot tools/checks | `godot/tools/*.gd` |
| Export presets | `godot/export_presets.cfg` |
| Release docs | `docs/scenario/release/*.md` |
| Scenario content | `docs/scenario/bible/*.md`, `docs/scenario/content/*.md` |

## Milestones

### M0: Scope Lock And Team Kickoff

**Goal:** Freeze demo promise and make the team executable.

**Owners:** Game Director, Producer.

**Exit Gate:**

- `Station Soft Inquest` is the only shipped scenario.
- itch.io-first release decision accepted.
- Steam demo explicitly deferred.
- Small-release game-design pack is accepted as the playable design source of truth.
- Every P0 issue names the relevant beat, Codex NPC contract, level rule, onboarding rule, or polish gate.
- P0 issue list created.
- No one is building extra districts, voice/TTS, broad NPC schedules, or developer-hosted AI.

**Steps:**

- [ ] Create Linear epic: `Dream of One Codex CLI Demo Release`.
- [ ] Create Beads epic mirroring the Linear epic.
- [ ] Create P0 tasks from the `P0 Backlog` section below.
- [ ] Assign one owner and one backup per P0 task.
- [ ] Add `small-release-definition.md` and `small-release-readiness-report.md` as source docs to every issue.
- [ ] Add `release/game-design/README.md` and the relevant child design doc to every gameplay-facing issue.
- [ ] Confirm team can run:

```bash
codex --version
godot --version
npm run check --prefix backend/npc-runtime
```

### M1: Codex CLI Runtime Foundation

**Goal:** Prove player-owned local Codex CLI can drive NPC proposals without owning game state.

**Owners:** Backend / Codex Systems Engineer, Godot Gameplay Engineer.

**Exit Gate:**

- In-game setup detects missing/invalid Codex.
- Backend can invoke `codex exec` with read-only sandbox and schema output.
- Invalid output fails closed.
- Evidence records Codex active/failure state.

**Required Implementation:**

- [ ] Add Codex preflight service.
- [ ] Add `codex exec` worker invocation:

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

- [ ] Pass prompt through stdin.
- [ ] Store transient Codex run files under app-owned runtime data, not player home or repo.
- [ ] Validate final JSON against backend schema.
- [ ] Reject authority attempts: Exposure, intake, Inquest, verdict, termination, fallback.
- [ ] Add failure cases for missing binary, missing login, timeout, invalid JSON, unknown IDs, authority claim.

**Verification:**

```bash
npm run check --prefix backend/npc-runtime
codex --version
codex login status
codex exec --help
```

### M2: Playable Scenario Completion

**Goal:** Make `Station Soft Inquest` playable as a complete short game.

**Owners:** Godot Gameplay Engineer, Narrative Designer, Backend Engineer.

**Exit Gate:**

- Player completes Station -> Store -> Studio -> Park -> Station.
- Four NPC interactions use Codex CLI.
- Three outcomes work: clean cover, messy repair, verdict-ready.
- Every Exposure/Station transition has Evidence and why-line.

**Required Beats:**

| Beat | Location | Required Result |
|---|---|---|
| 1 | Station | Player reads intake rule and learns procedural speech. |
| 2 | Store | Clerk pressures queue/label speech through Codex proposal. |
| 3 | Studio | PM pressures source/owner/reason through Codex proposal. |
| 4 | Park | Witness pressures public-flow behavior through Codex proposal. |
| 5 | Station | Officer compares artifacts deterministically. |
| 6 | Verdict edge | Final why-line names trigger, witness, record, stage, outcome. |

**Verification:**

```bash
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
```

### M3: Godot Export And Platform Proof

**Goal:** Move from editor prototype to exported demo build.

**Owners:** Godot Gameplay Engineer, Producer / QA Coordinator.

**Exit Gate:**

- `godot/export_presets.cfg` exists.
- First advertised platform build launches outside editor.
- Exported build can spawn local `codex`.
- Runtime writes go to `user://` or OS app data.

**Platform Order:**

| Order | Platform | Condition |
|---:|---|---|
| 1 | Linux x86_64 | Use if a clean Linux machine is available. |
| 2 | Windows x64 | Use after PATH/native Codex/Defender checks pass. |
| 3 | macOS Universal 2 | Use only after signing/notarization and sandbox-disabled external `codex` spawning are proven. |

**Verification:**

```bash
test -f godot/export_presets.cfg
godot --headless --import --path godot
godot --path godot --export-release "<Preset Name>" <output-path>
```

Run the exported binary from the OS shell or file manager. Do not count editor/headless runs as export proof.

### M4: Player Setup, QA, And Accessibility

**Goal:** Prove non-developers can set up Codex and complete the demo.

**Owners:** Producer / QA Coordinator, Narrative Designer, Godot Engineer.

**Exit Gate:**

- 2-3 clean-machine setup testers reach first AI interaction using docs only.
- 5 external Codex-ready testers complete one run.
- 8 of 10 testers can explain why Exposure changed.
- No P0/P1 bugs open.

**Required QA Scenarios:**

| Scenario | Expected Result |
|---|---|
| No Codex installed | Setup screen names install requirement. |
| Codex installed, not logged in | Setup screen names login/access problem. |
| Codex timeout | Controlled failure state; no crash. |
| Invalid JSON | Backend rejects and records reason. |
| Authority attempt | Backend rejects and records reason. |
| Korean full run | No missing keys or clipped critical UI. |
| English full run | No missing keys or clipped critical UI. |
| Keyboard-only run | Full completion without mouse. |

**Required Accessibility Basics:**

- Readable critical text at 1080p and common laptop resolution.
- Strong contrast for HUD and signs.
- No color-only state communication.
- Camera sensitivity option.
- Invert camera option.
- Audio volume controls.
- Captions/subtitles for any critical audio information.

### M5: Store Package And Public Itch Release

**Goal:** Ship an honest technical demo page and downloadable build.

**Owners:** Producer / QA Coordinator, Marketing Contractor, Game Director.

**Exit Gate:**

- itch page is complete before publication.
- Page first paragraph states Codex CLI/player-owned access requirement.
- AI disclosure is filled.
- Privacy note is present.
- 5 real gameplay screenshots exist.
- Short gameplay GIF or trailer exists.
- Credits/licenses are included.

**Required Store Copy:**

```text
Dream of One: Station Soft Inquest is a free technical demo.
It requires a local installation of OpenAI Codex CLI and a player-owned ChatGPT/OpenAI account with Codex access.
AI access is not included.
The developer does not operate an AI server for this demo.
```

Required bullets:

- Contains live AI-generated NPC and Station text.
- Requires internet access, OpenAI Codex CLI, and a player-configured ChatGPT/OpenAI account or API key.
- AI access is not included with the demo; usage may count against the player's OpenAI plan, credits, rate limits, or billing.
- The game sends bounded in-game context to the player's local Codex/OpenAI setup.
- Do not enter personal, private, or sensitive information into gameplay text.
- AI output is constrained by game rules; invalid output is rejected or replaced with deterministic fallback text.

### M6: Steam Preparation

**Goal:** Prepare Steam presence without letting Steam force premature broad release expectations.

**Owners:** Producer, Game Director, Marketing Contractor.

**Exit Gate:**

- Steam Coming Soon page is prepared only after itch page copy is validated.
- Steam demo remains deferred until itch proof exists.
- Steam AI disclosure draft is ready.
- Capsule/screenshots use real gameplay.

**Steam Demo Gate:**

Steam demo can start only when:

- itch release has clean setup proof;
- no recurring support issue around Codex install/login;
- external dependency copy is proven understandable;
- exported Windows build works from a clean install;
- AI disclosure and privacy note are ready above the fold.

## P0 Backlog

### P0-01: Codex CLI Preflight

**Owner:** Backend / Codex Systems Engineer.

**Files:**

- Modify: `backend/npc-runtime/src/runtime/readiness.ts`
- Modify: `backend/npc-runtime/src/config.ts`
- Add or modify tests under `backend/npc-runtime/src/`
- Modify Godot setup UI when exposed.

**Acceptance Criteria:**

- Detects `codex` binary.
- Reads `codex --version`.
- Verifies `codex login status`.
- Verifies required `codex exec --help` flags.
- Runs schema smoke in app-owned temp directory.
- Reports exact failure reason.

**Commands:**

```bash
npm run check --prefix backend/npc-runtime
codex --version
codex login status
codex exec --help
```

### P0-02: Codex NPC Worker

**Owner:** Backend / Codex Systems Engineer.

**Files:**

- Modify: `backend/npc-runtime/src/broker/codex-broker.ts`
- Modify: `backend/npc-runtime/src/broker/codex-tool-gateway.ts`
- Modify: `backend/npc-runtime/src/runtime/decision-service.ts`
- Modify: `backend/npc-runtime/src/runtime/fallback.ts`
- Modify: `backend/npc-runtime/src/godot/runtime-schema.ts`

**Acceptance Criteria:**

- Invokes local player-owned `codex exec`.
- Uses read-only sandbox, `--ephemeral`, schema output, and timeout.
- Treats Codex output as untrusted.
- Rejects invalid or authority-owning proposals.
- Emits Evidence for accepted, rejected, timeout, and fallback outcomes.

**Commands:**

```bash
npm run check --prefix backend/npc-runtime
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

### P0-03: Beat-To-Runtime Matrix

**Owner:** Narrative Designer / Korean Writer.

**Files:**

- Modify: `docs/scenario/bible/05-episode-station-soft-inquest.md`
- Modify: `docs/scenario/bible/06-cover-tests-and-evidence.md`
- Modify: `docs/scenario/content/dialogue-line-bank.md`
- Modify: `docs/scenario/content/location-placement-contracts.md`

**Acceptance Criteria:**

- Every beat has location, player goal, examiner, trigger, text surface, speech acts, Exposure delta, artifact, why-line, failure result.
- Store, Studio, Park, Station each include Codex prompt role notes.
- Korean setup/failure text exists for Codex missing/login/timeout/invalid output.

### P0-04: Godot Playable Loop

**Owner:** Godot Gameplay Engineer.

**Files:**

- Modify: `godot/scenes/main.tscn`
- Modify: `godot/scripts/runtime/playable_session.gd`
- Modify: `godot/scripts/runtime/runtime_slice.gd`
- Modify: `godot/scripts/ui/social_stealth_hud.gd`
- Modify: `godot/data/world_layout.json`

**Acceptance Criteria:**

- Full route is playable.
- Four NPC pressure interactions appear in-game.
- Three outcome paths work.
- HUD shows Exposure, active Cover Test, Evidence why-line, Station state.
- Keyboard-only play works.

**Commands:**

```bash
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
```

### P0-05: Exported Build Pipeline

**Owner:** Godot Gameplay Engineer.

**Files:**

- Add: `godot/export_presets.cfg`
- Add or modify: export smoke script under `godot/tools/`
- Modify docs under `docs/scenario/release/`

**Acceptance Criteria:**

- Export presets exist for advertised platform only.
- Export templates are documented.
- Exported build launches outside editor.
- Exported build can spawn `codex`.
- Runtime writes do not target `res://` or executable directory.

**Commands:**

```bash
godot --headless --import --path godot
godot --path godot --export-release "<Preset Name>" <output-path>
```

### P0-06: Player-Facing Setup Guide

**Owner:** Producer / QA Coordinator.

**Files:**

- Add: `docs/scenario/release/player-quickstart.md`
- Modify: `docs/scenario/release/small-release-definition.md`
- Modify: `docs/scenario/release/small-release-readiness-report.md`

**Acceptance Criteria:**

- Explains install, login, launch, preflight, known failures.
- States AI cost/access is player-owned.
- Says no developer-hosted AI exists.
- Includes bug report template.
- Includes privacy note.

### P0-07: QA Evidence Pack

**Owner:** Producer / QA Coordinator.

**Files:**

- Add: `docs/scenario/release/qa-playtest-protocol.md`
- Add evidence outputs under `data/evidence/godot/` through test runs.

**Acceptance Criteria:**

- Clean-machine setup protocol exists.
- Codex-ready playtest protocol exists.
- Failure soak protocol exists.
- Screenshot requirements exist.
- Go/no-go sheet exists.

## Parallelization Plan

Run these workstreams in parallel after M0:

| Lane | Owner | Dependencies |
|---|---|---|
| Codex preflight/worker | Backend Engineer | M0 scope lock |
| Beat-to-runtime matrix | Narrative Designer | M0 scope lock |
| Godot loop/UI/control | Godot Engineer | M0 scope lock |
| Export/platform proof | Godot Engineer / QA | First playable route |
| Setup/store/docs | Producer | Codex preflight command shape |
| Visual/media pass | Technical Artist / Marketing | First playable route |

Do not let Codex worker, scenario writing, and Godot loop block each other unless IDs or schema fields change. If an ID changes, update schema/docs before the next merge.

## Weekly Cadence

| Cadence | Meeting | Output |
|---|---|---|
| Daily async | Blockers, merged work, next action. | One-line update per owner. |
| Twice weekly | Integration review. | Run checks, inspect playable route, update blocker list. |
| Weekly | Release gate review. | P0 status, QA evidence, risk changes, next milestone call. |
| Per milestone | Go/no-go review. | Signed decision by Game Director and Producer. |

## Required Checks Before Every Release Candidate

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

Exported build checks are mandatory after `godot/export_presets.cfg` exists.

## Risk Register

| Risk | Severity | Owner | Mitigation |
|---|---:|---|---|
| Players cannot set up Codex CLI. | P0 | Producer / Backend | Above-fold warning, setup guide, preflight screen, clean-machine tests. |
| Codex output breaks game authority. | P0 | Backend | Schema validation, rejection, deterministic fallback, Evidence trace. |
| Steam audience rejects external subscription requirement. | P1 | Producer | itch-first release; Steam demo deferred until support burden is understood. |
| Exported build cannot spawn `codex`. | P0 | Godot Engineer | Platform-specific process tests; absolute path override; no App Store sandbox. |
| Runtime writes into packaged app path. | P0 | Backend / Godot | Move to `user://` or OS app data. |
| Scenario feels like a procedure quiz. | P1 | Game Director / Narrative | Add NPC pressure, movement, witness, fail-forward artifacts. |
| Visuals still feel prototype-like. | P1 | Technical Artist | Route composition, prop clusters, lighting, screenshots before store page. |
| Korean text sounds generic. | P1 | Korean Writer | Korean source pass, line bank review, no literal English-first translation. |

## Go / No-Go Sheet

Release only if every line is `Pass`.

| Gate | Pass Evidence |
|---|---|
| Exported build launches | Build path, platform, run log. |
| Codex preflight passes | Screenshot/log of setup pass. |
| Missing Codex fails cleanly | Screenshot/log of setup fail. |
| Four Codex NPC interactions work | Evidence pack proposal IDs. |
| Three endings work | Screenshots and Evidence packs. |
| Korean run complete | QA run note. |
| English run complete | QA run note. |
| Keyboard-only complete | QA run note. |
| Store page honest | Page draft reviewed. |
| 5 gameplay screenshots | Asset paths listed. |
| External setup testers pass | Tester notes. |

If any P0 gate fails, ship only to private testers.

## Deferred Work

These are intentionally out of scope for the small release:

- Paid Early Access.
- Full game launch.
- Developer-hosted Codex worker.
- Bundled developer AI credentials.
- OpenAI API key input flow inside the game.
- Procedural scenario generator.
- Broad NPC schedule simulation.
- Voice/TTS dependency.
- Extra districts beyond Station, Store, Studio, Park.
- Steam demo before itch proof.
- Unsupported platform tags.

## Leadership Rule

The team is building one proof:

> A player with their own Codex CLI can install the demo, pass setup, enter a small authored Godot 3D civic loop, receive live Codex-driven NPC pressure, and still understand that deterministic backend rules own Evidence, Exposure, Inquest, verdict, and session termination.

Everything that does not strengthen that proof is deferred.
