# Game Design

Scenario source of truth lives in `docs/scenario/`.
Use `docs/scenario/bible/05-episode-station-soft-inquest.md` for the first complete episode and `docs/scenario/content/dialogue-line-bank.md` for authored NPC pressure text.

## Core Loop

The player moves through Store, Studio, Park, and Station while NPCs and Station systems pressure the player through procedural text, observation, intake, and verdict logic.

## Player Role

The player is not an investigator. The player performs cover work while NPC society investigates inconsistencies.

## Danger Surface

Text is the danger surface:

- Dream Laws appear as diegetic rules and notices.
- Cover Tests trigger from player utterances, proximity, interaction, and route context.
- Generated artifacts such as tickets, reports, memos, and why-lines become Evidence.

## Deterministic Authority

Rule-driven systems own:

- Exposure thresholds
- Station intake
- Inquest escalation
- Verdict readiness
- Session termination
- Fallback Path selection

Godot owns scene presentation and observed world state. Backend Schema and validation keep the loop auditable.
