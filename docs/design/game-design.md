# Game Design

Director source of truth starts in `docs/direction/08-conversation-suspicion-redesign.md`.
Scenario source of truth lives in `docs/scenario/`, but the current scenario bible still needs a conversation-first rewrite before it can be treated as player-facing canon again.

## Core Loop

The player talks to NPCs while trying to sound locally normal. Each prompt offers three diegetic dialogue choices and, when proven safe enough for the build, optional free input. The runtime records the line, deterministic rules classify conversational weirdness, NPC suspicion changes, and reports can propagate to Station intake, inquest, and verdict logic.

## Player Role

The player is not an investigator. The player performs cover work while NPC society investigates inconsistencies.

## Danger Surface

Dialogue is the danger surface:

- NPC prompts carry local assumptions.
- Dialogue choices express safe, uncertain/repair, or risky/weird intent without exposing debug labels.
- Optional free input is a recorded statement, not an open chatbot promise.
- Dream Laws appear through diegetic records, prior statements, NPC memory, and Station pressure.
- Generated artifacts such as conversation logs, anomaly records, reports, memos, and why-lines become Evidence.

## Deterministic Authority

Rule-driven systems own:

- Conversation identity and memory
- Suspicion signal classification
- Social sharing and report thresholds
- Exposure thresholds
- Station intake
- Inquest escalation
- Verdict readiness
- Session termination
- Fallback Path selection

Godot owns scene presentation, dialogue UI, observed world state, and player input capture. Backend Schema and validation keep the loop auditable.

## Current Internal Harness

The existing Godot Station Soft Inquest smoke proves deterministic authority with text surfaces and abstract speech acts. Preserve it as internal harness evidence until the conversation-first loop replaces it with a playable prompt/choice/free-input proof.
