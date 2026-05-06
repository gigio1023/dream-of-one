# Scenario Rebuild Plan

> For agentic workers: implement this plan with `superpowers:subagent-driven-development` for parallel research lanes and focused doc work. Track progress with checkbox syntax.

**Goal:** Rebuild Dream of One into an authored indie-quality scenario foundation for a Godot 3D social-stealth game.

**Architecture:** Scenario canon lives under `docs/scenario/`. Existing `docs/design/` remains product-level design. `docs/migration/godot/` remains migration-only and must not become the scenario bible.

**Tech Stack:** Markdown scenario docs, Godot 4.x runtime data, TypeScript backend authority, Korean-first localization.

---

## Decisions

- The first real scenario is `Station Soft Inquest`.
- The player is not solving a case. The player is being turned into a case.
- Store, Studio, Park, and Station all participate in one civic loop.
- Text is mechanically dangerous. It is not lore garnish.
- Failure does not stop the game. Failure creates Evidence and narrows the player's cover.
- Verdict is deterministic product authority.

## Workstreams

- [x] **Research lanes:** Run up to ten English research lanes across social stealth, surreal bureaucracy, narrative frameworks, indie case studies, local canon, episode structure, dialogue, environmental storytelling, localization, and quality gates.
- [x] **Source map:** Record reusable sources and adaptation rules in `docs/scenario/research/source-map.md`.
- [x] **Scenario index:** Create a small-file scenario bible under `docs/scenario/bible/`.
- [x] **Premise and rails:** Define logline, player fantasy, design pillars, anti-patterns, and authority boundaries.
- [x] **MDA and pressure:** Translate scenario goals into target aesthetics, dynamics, mechanics, acts, and pressure states.
- [x] **State model:** Define Exposure, read surfaces, cover states, artifacts, Station states, and deterministic transitions.
- [x] **Episode:** Write the full 20-30 minute `Station Soft Inquest` playable arc.
- [x] **Cover Tests:** Give each Cover Test detector triggers, speech-act effects, artifacts, escalation, defuse, and why-line templates.
- [x] **Characters and dialogue:** Define NPC pressure roles, voice constraints, Korean-first lines, barks, interrogation prompts, and anti-generic-AI rules.
- [x] **Environmental story:** Define how each location should look, read, sound, and change with Exposure using free assets.
- [x] **Localization:** Define Korean institutional tone and English localization constraints.
- [x] **Quality bar:** Define scenario readiness, implementation readiness, playtest validation, and Evidence artifacts.
- [x] **Project links:** Link scenario docs from `README.md`, `docs/overview.md`, and product design docs.
- [x] **Pitch-ready expansion:** Add `docs/scenario/pitch/` with product thesis, AI gameplay architecture, vertical slice plan, team plan, funding plan, and risk register.

## Parallel Agent Plan

| Attempt | Lane | Output |
|---:|---|---|
| 1 | Social stealth | Accusation-vector principles and cover-performance template. |
| 2 | Surreal bureaucracy | Tone spine and anti-amateur horror rules. |
| 3 | Narrative frameworks | MDA, acts, storylets, fail-forward, bark docs. |
| 4 | Indie case studies | Portable production methods from constrained narrative games. |
| 5 | Local canon audit | Current canon, drift, missing scenario elements. |
| 6 | Episode design | 20-30 minute Store/Studio/Park/Station arc. |
| 7 | Character/dialogue | NPC voice cards, barks, interrogation lines, why-lines. |
| 8 | Environmental story | Location scripting, prop placement, lighting, audio motifs. |
| 9 | Korean localization | Institutional register, terminology, translation constraints. |
| 10 | Quality gates | Scenario acceptance criteria and playtest rubric. |

## Pitch-Ready Follow-Up

The scenario plan must support team formation and funding discussion. Use `docs/scenario/pitch/` for:

- fundable product thesis;
- in-game AI architecture;
- 10-30 minute vertical slice proof;
- core team shape and hiring order;
- publisher/funding readiness;
- risk register and kill criteria.

## Done Criteria

- A reader can understand the full scenario without opening Godot.
- A Godot implementer can place text surfaces, NPC pressure roles, props, and Evidence hooks without inventing the story.
- A backend implementer can map Cover Tests to deterministic Exposure and Station state transitions.
- A writer can produce Korean-first lines that do not sound like generic AI dialogue.
- A reviewer can reject weak content using the quality bar in `bible/11-quality-bar-and-validation.md`.
- A potential collaborator or funding partner can understand what must be proven before the project deserves full production funding.
