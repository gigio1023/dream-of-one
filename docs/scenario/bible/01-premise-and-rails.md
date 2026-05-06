# Premise And Rails

## Logline

You wake near a civic Station where ordinary procedure has already started recording you. To leave, you must complete a normal public loop through Store, Studio, Park, and Station while NPC society audits whether your words belong there.

## AI Gameplay Thesis

The released game should use Codex CLI inside gameplay, but not as final authority.

Codex CLI proposes NPC pressure, witness phrasing, soft inquest questions, and report summaries. The backend decides whether the proposal is valid, which Evidence is created, how Exposure changes, and whether Station intake, Inquest, verdict, or session termination opens.

Pitch-facing production details live in `docs/scenario/pitch/`.

## Player Fantasy

The player is not a detective, spy, or hero. The player is a person trying to remain socially legible.

The fantasy is tense competence:

- read the public rule;
- speak only within the expected procedure;
- accept small corrections before they become formal records;
- notice which words are too true to say aloud;
- reach the Station with a record that still looks normal.

## Design Pillars

| Pillar | Meaning | Implementation Consequence |
|---|---|---|
| Accusation first | Every scene asks what society suspects about the player. | Each beat starts with an accusation vector and an examiner NPC. |
| Text is machinery | Signs, prompts, forms, barks, and why-lines change state. | No player-facing text appears without a trigger or Evidence role. |
| Bureaucracy is competent | The Station is not absurdly stupid or comic. | Procedures are legible, patient, and self-justifying. |
| Surrealism is bounded | Dream logic can be strange, but enforcement is consistent. | Dream Laws always map to deterministic Cover Tests. |
| Failure records | Bad choices do not stop play; they create durable Evidence. | Every failure emits artifact, witness, threshold, or route consequence. |
| Korean first | Institutional unease comes from Korean register first. | English is localized from Korean intent, not the other way around. |

## Core Dramatic Question

Can the player pass through a normal civic day without giving the Station enough procedural evidence to classify them as lucid-abnormal?

## What The Game Is Not

- Not a detective game where the player gathers clues to solve a case.
- Not combat stealth or chase stealth.
- Not a dream-symbol tour where weirdness replaces rules.
- Not a lore codex with gameplay attached.
- Not a parody of paperwork.
- Not a meta game about being in a game.

## Authority Boundary

| System | Owns |
|---|---|
| Godot | 3D presentation, movement, collisions, text surfaces, NPC placement, prompts, HUD, observed local results. |
| Backend/product rules | Schema validation, Exposure thresholds, Station intake, Inquest, verdict, session termination, fallback selection, Evidence validity. |
| Scenario docs | Intended beats, voice, text, artifacts, environmental story, playtest quality bar. |

## First Scenario Choice

The first complete scenario is `Station Soft Inquest`, a compact civic loop:

1. Station opening procedure.
2. Store queue normalization.
3. Studio approval gate.
4. Park public-flow observation.
5. Station intake.
6. Soft Inquest.
7. Verdict edge.
