# Game Seed

Status: Active draft
Owner: Product/design authority
Last Updated: 2026-05-06

## One-Sentence Game

Dream of One is a Korean-first 3D social-stealth prologue where the player is investigated by NPCs and Station systems, and ordinary text becomes evidence under deterministic Dream Law.

## Player Promise

The player should feel that speech, hesitation, and explanation are not safe UI actions. They are surfaces that Station systems can read, classify, and use.

## Design Rails

- Player role: subject of investigation, not investigator.
- Investigation authority: NPCs and Station systems investigate the player.
- Text role: text is where danger starts.
- AI role: API proposal provider proposes bounded wording only.
- Deterministic authority: backend/runtime owns Dream Law, Cover Test, Exposure, Evidence, Station intake, Inquest, verdict, and session termination.
- Language default: Korean-first; English selectable.
- Release scope: small playable demo/prologue, not open-ended AI sandbox.

## Non-Goals

- Open chatbot sandbox.
- Detective game where player gathers clues as investigator.
- Lore-only walking simulator.
- AI-generated verdicts.
- Godot visual demo without consequence.
- Broad commercial launch before small playable proof.

## Core Loop

1. Player enters a Station-controlled space.
2. NPC or Station surface requests ordinary explanation.
3. Player response is treated as potential evidence.
4. Backend/runtime updates deterministic state.
5. Godot presents pressure, consequence, and route constraints.
6. Inquest/verdict closes the session according to rule-owned state.

## Authority Boundaries

| Area | Owner | Notes |
|---|---|---|
| NPC/Station wording variants | API proposal-provider layer | Must be bounded, model-checked, validated, and fall back safely |
| Action/risk/reason selection | Backend/runtime deterministic authority | Provider output cannot choose actions, risk tags, reason codes, Evidence type, or why-line authority |
| Exposure | Backend/runtime deterministic authority | No generated text ownership |
| Cover Test | Backend/runtime deterministic authority | Trigger and threshold must be inspectable |
| Evidence | Backend/runtime deterministic authority | Evidence must record why-lines |
| Station intake | Backend/runtime plus Godot presentation | Godot shows; backend decides |
| Inquest | Backend/runtime deterministic authority | Godot renders state and choices |
| Verdict | Backend/runtime deterministic authority | Provider cannot decide verdict |
| Session termination | Backend/runtime deterministic authority | Must be reproducible |

## Required Evidence

- Godot: import, scene smoke, playable slice, screenshot/capture.
- Backend: schema/type check and fixture parity.
- Text surface: Korean/English lines with condition, risk tag, consequence.
- Runtime: Evidence JSON with why-lines.
- Playtest: observation of when player understands they are being investigated.

## Drift Watch

- Player becomes investigator.
- AI text starts controlling rules.
- Korean becomes translation of English instead of source language.
- Godot scene looks better but weakens the text-to-record danger chain.
- Runtime evidence exists but player cannot perceive consequence.
- Release docs promise broader AI than current provider preflight and build evidence support.
