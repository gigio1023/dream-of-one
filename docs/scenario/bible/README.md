# Scenario Bible Index

Status: Needs conversation-first rewrite before use as player-facing canon.

## One-Sentence Game

Dream of One is a 3D conversation social-stealth game where a player tries to sound locally normal while NPC society and the Station convert conversational weirdness, reports, and recorded statements into Evidence.

## Redesign Notice

The active director-level redesign is `docs/direction/08-conversation-suspicion-redesign.md`.

This bible still contains useful NPC, location, Dream Law, voice, and Station material, but its player-facing loop is outdated where it centers abstract `SA_*` buttons, Cover Test zone activation, or repeated risky inputs. Future scenario work should rewrite these documents around NPC prompts, three dialogue choices, optional free input, deterministic suspicion signals, social sharing/report, and Station consequence.

## Documents

| File | Purpose |
|---|---|
| `01-premise-and-rails.md` | Logline, fantasy, pillars, forbidden moves, and authority boundaries. |
| `02-player-experience-mda.md` | Target feelings, gameplay dynamics, and mechanics that create them. |
| `03-act-and-pressure-map.md` | Three-act scenario structure and five pressure states. |
| `04-state-model.md` | Runtime state, thresholds, transitions, and deterministic ownership. |
| `05-episode-station-soft-inquest.md` | Historical first playable episode arc. Use for Station material, not as current player-facing loop. |
| `06-cover-tests-and-evidence.md` | Legacy Cover Tests, detector triggers, speech outcomes, artifacts, why-lines. Use as source material for conversation-first rewrites. |
| `07-characters-and-dialogue.md` | NPC roles, voice constraints, barks, interrogation prompts, line samples. |
| `08-locations-and-environmental-story.md` | Space, prop, route, text-surface, lighting, and audio story plans. |
| `09-barks-and-text-surfaces.md` | Reactive bark system and diegetic text-surface content rules. |
| `10-localization-style-guide.md` | Korean-first terminology and English localization constraints. |
| `11-quality-bar-and-validation.md` | Scenario readiness, playtest, and implementation validation gates. |
| `12-conversation-suspicion-prologue.md` | Replacement first playable scenario for the conversation-first redesign. |

## Content Banks

| File | Purpose |
|---|---|
| `../content/dialogue-line-bank.md` | Bark, overheard, interrogation, defuse, and why-line source lines. |
| `../content/location-placement-contracts.md` | Placement schema for routes, props, text surfaces, lighting, sightlines, and audio motifs. |
| `../content/korean-voice-notes.md` | Korean-first institutional tone notes and term variants. |
| `../playtest/scenario-qa-rubric.md` | Scenario QA and blind playtest rubric. |

## Canon IDs

| Domain | IDs |
|---|---|
| Landmarks | `Store`, `Studio`, `Park`, `Station` |
| Routes | `CivicLoop`, `StoreQueue`, `StationIntake` |
| Internal speech-act classifiers | `SA_COMPLY`, `SA_INQUIRE`, `SA_FRAME`, `SA_BREAK`; internal harness only. |
| Player-facing dialogue model | three diegetic choices plus optional free input |
| Conversation signals | `local_routine_mismatch`, `dream_language_leak`, `memory_gap_admission`, `role_script_break`, `prior_statement_contradiction`, `authority_evasion`, `over_explanation` |
| Dream Laws | `DL_S1_QUEUE_SANCTITY`, `DL_ST1_APPROVAL_GATE`, `DL_P1_OBSERVATION_ETIQUETTE`, `DL_N1_PROCEDURE_SPEECH_ONLY` |
| Cover Tests | `CT_STORE_QUEUE_LANGUAGE`, `CT_STUDIO_APPROVAL_GATE_SPEECH`, `CT_PARK_OBSERVATION_PRESSURE`, `CT_STATION_SOFT_INQUEST` |
| Actors | `NPC_Store_Clerk`, `NPC_Store_Manager`, `NPC_Studio_PM`, `NPC_Park_Witness`, `NPC_Station_Officer` |

## Scenario Promise

The player should feel that every harmless phrase can become a record, every NPC can notice when the player sounds like an outsider, and every polite follow-up can become the start of a report.
