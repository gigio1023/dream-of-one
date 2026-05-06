# Dream of One Harness Application

## Current Diagnosis

Dream of One has enough raw direction to continue, but the plan can still feel loose because several different layers are mixed:

- game premise
- scenario prose
- runtime schema
- Godot scene implementation
- Codex CLI NPC interaction
- production plan
- release pitch
- QA evidence

When these layers are mixed, Codex can make technically plausible changes that do not improve the game. The harness must force each layer to produce an artifact the next layer can consume.

## Product Seed

Dream of One should be treated as:
- Korean-first 3D social-stealth prologue.
- Player is the subject of investigation.
- NPCs and Station systems investigate the player.
- Text is the danger surface.
- Codex CLI generates bounded NPC text proposals.
- Backend/runtime owns deterministic rules, thresholds, Evidence, verdict, and session termination.

It should not become:
- open chatbot sandbox.
- detective/investigator game.
- lore-only walking simulator.
- Godot scene demo with labels.
- AI novelty demo where generated text controls rules.

## Required Conversion Pipeline

Every scenario item must convert through this chain:

1. Player experience goal
2. Design pillar
3. Scenario beat
4. Runtime contract
5. Content table
6. Godot placement
7. Evidence fixture
8. Playtest observation
9. Revision record

Example:

| Layer | Example |
|---|---|
| Experience goal | Player feels that ordinary answers can become evidence. |
| Design pillar | Text is the danger surface. |
| Scenario beat | Station intake asks for a harmless reason for arrival. |
| Runtime contract | response text is classified into risk tags; backend computes Exposure delta. |
| Content table | Korean default line, English line, speaker, condition, repeat policy. |
| Godot placement | visible Station terminal or clerk text surface in intake area. |
| Evidence fixture | input payload, expected risk tag, expected Exposure delta, why-line. |
| Playtest observation | tester noticed the line became evidence before verdict. |
| Revision record | changed prompt wording without changing backend threshold. |

## First Usable Harness Cycle

Use this cycle for the next major work item:

1. Create or update `.game-harness/game-seed.md`.
2. Create `.game-harness/current-stage.md` for `Scenario Runtime Contract` or `Prototype Loop`.
3. Run role reviews against current scenario docs before implementation.
4. Produce `implementation-handoff.md` with exact files and acceptance criteria.
5. Implement only the approved handoff.
6. Run Godot/backend checks and capture screenshot/evidence.
7. Write `verification-ledger.md`.
8. Write `drift-log.md` if any seed or stage rule moved.

## Immediate Gaps to Close

### Gap 1: Scenario Is Not Fully Runtime-Executable

Need:
- beat table with trigger/state/consequence/fallback/evidence.
- NPC motive and response constraints.
- text surface table with Korean/English, risk tag, repetition, UI placement.

Why:
- Without this, Codex can add dialogue that sounds right but does not produce game state.

### Gap 2: Playability Is Under-Evidenced

Need:
- 10-minute playable path.
- keyboard-only control path.
- screenshot/video for each major beat.
- user confusion note.

Why:
- A Godot scene can load and still not be a game.

### Gap 3: AI NPC Contract Needs Product Framing

Need:
- explicit Codex CLI requirement in player-facing release docs.
- local Codex invocation boundary.
- generated text validation and fallback behavior.
- offline/no-Codex degraded path.

Why:
- The game is an AI game, but the AI cannot be allowed to own rules or verdicts.

### Gap 4: Art/Audio/Game Feel Need System Legibility

Need:
- visual pillars for Station authority, text danger, evidence, verdict.
- state-bound audio cue list.
- camera/input feel targets.
- UI readability and localization constraints.

Why:
- Free assets can improve surface quality, but only art direction makes the game feel intentional.

### Gap 5: Release Readiness Needs Store Truth

Need:
- exact small-release scope.
- Codex CLI/subscription prerequisite.
- screenshots from actual build.
- known limitations.
- supported language/platform list.

Why:
- Public promise must match build truth, especially for AI-dependent features.

## Recommended Next Documents

Create these next as active working artifacts:

- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- `.game-harness/review-log.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/drift-log.md`

Then mirror stable conclusions into:
- `docs/scenario/`
- `docs/design/`
- `docs/harness/`

## Done Definition for This Harness

The methodology is ready when:
- a new Codex session can identify the current game stage without asking the user.
- a worker can implement a small slice from handoff alone.
- a reviewer can block weak game design with file-backed criteria.
- Godot/backend checks are attached to design acceptance, not only code acceptance.
- drift from the seed is visible before it becomes the new default.
