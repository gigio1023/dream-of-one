# Game Development Lifecycle for Agent-Led Work

This lifecycle adapts game production, game design, playtesting, QA, and release sources into a Codex-executable process.

## Stage 0: Seed Lock

Goal:
- Freeze the product promise before implementation.

Outputs:
- `game-seed.md`
- authority map
- non-goals
- target audience
- release posture

Pass gate:
- Every role can explain the game in one paragraph.
- Design rails are testable.
- The AI/NPC authority boundary is explicit.

Fail gate:
- The game is defined only by lore.
- The player role is ambiguous.
- Codex-generated text can alter deterministic rules.

## Stage 1: Scenario Runtime Contract

Goal:
- Convert scenario prose into executable design artifacts.

Outputs:
- beat sheet
- state model
- text surface table
- NPC motive table
- runtime schema needs
- evidence semantics
- fallback rules

Pass gate:
- Every beat has trigger, state, text, consequence, fallback, evidence.
- Dream Law/Cover Test/Exposure/Inquest/Verdict authority is traceable.

Fail gate:
- Dialogue exists but no condition or consequence exists.
- Story beat cannot be tested.
- Korean and English text differ in legal/system meaning.

## Stage 2: Prototype Loop

Goal:
- Build the riskiest loop in the cheapest playable form.

For Dream of One:
- Station intake -> player response -> NPC/Station pressure -> Evidence -> Exposure delta -> soft verdict preview.

Outputs:
- playable Godot slice
- backend schema fixture
- smoke test
- screenshot or video capture
- playtest note

Pass gate:
- Player understands they are being investigated.
- Text is perceived as risky.
- Deterministic state changes are visible in evidence.

Fail gate:
- It feels like a tutorial room with labels.
- The player becomes an investigator.
- Verdict feels arbitrary or purely authored.

## Stage 3: Vertical Slice

Goal:
- Prove production readiness, not just demo appeal.

Outputs:
- one polished 20-30 minute loop
- content pipeline proof
- art/audio/UI direction proof
- localization proof
- QA regression set
- pitch screenshots/build notes

Pass gate:
- Core loop, scenario, art direction, audio cues, UI, accessibility, localization, and deterministic runtime work together.
- Team can estimate content expansion from real pipeline cost.

Fail gate:
- It depends on manual scene tweaking without repeatable checks.
- Godot visuals are acceptable but the gameplay promise is unclear.
- AI NPC text cannot be bounded or replayed.

## Stage 4: Content Expansion

Goal:
- Add content without changing the core product law.

Outputs:
- new locations
- new NPCs
- expanded text surface tables
- new evidence fixtures
- localization updates
- regression notes

Pass gate:
- New content reuses established runtime contracts.
- New beats do not invent unreviewed authority.

Fail gate:
- Every scene needs new one-off logic.
- Content changes require hidden backend rule changes.

## Stage 5: QA and Polish

Goal:
- Make the experience legible, stable, accessible, and repeatable.

Outputs:
- bug triage
- playtest reports
- screenshot/video evidence
- input/camera accessibility checks
- localization QA
- performance and loading notes
- release blocker list

Pass gate:
- Blockers are closed or explicitly deferred.
- Known roughness does not break the player promise.
- Build truth matches docs/screenshots.

Fail gate:
- “Playable” means only that Godot starts.
- Text surfaces overlap, truncate, or lose consequence.
- Mouse-only control blocks keyboard-first play.

## Stage 6: Release Candidate

Goal:
- Freeze a known good build.

Outputs:
- RC build
- verification ledger
- store page copy
- screenshots
- known issues
- install/run guide

Pass gate:
- RC build passes all required evidence checks.
- Store claims match actual build.
- No non-blocker polish enters after pencils-down without revalidation.

Fail gate:
- Last-minute cosmetic changes are merged without smoke/playtest.
- Screenshots show features not present in build.

## Stage 7: Launch and Post-Launch

Goal:
- Release a truthful small game and learn from real players.

Outputs:
- launch package
- changelog
- crash/bug intake
- feedback synthesis
- post-launch patch plan

Pass gate:
- Install path is clear.
- Codex CLI requirement is explicit.
- Feedback is classified by player confusion, runtime failure, content gap, accessibility issue, and release packaging issue.

Fail gate:
- Players cannot tell why Codex CLI is required.
- AI/NPC behavior is sold as broader than it is.

## Harness Rule

No stage should advance because the agent says it is “mostly done.” It advances when the stage’s required artifacts and evidence exist.
