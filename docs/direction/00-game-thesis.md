# Game Thesis

## One-Sentence Thesis

Dream of One is a Korean-first conversation social-stealth game where the player is not investigating a mystery; NPC society and the Station investigate the player's dialogue, turn conversational weirdness into Evidence, and close the session through deterministic Dream Law.

## Product Promise

The player should feel that ordinary conversation is necessary but never fully safe. A selected line, free statement, hesitation, contradiction, or attempted cover can make an NPC wonder whether the player came from somewhere else. When enough suspicion is shared, the Station receives a report.

## AI Promise

This is an AI game because an API proposal provider can participate in bounded NPC/Station wording variation for prompts, response choices, reactions, localization, and fallback text. It is not an AI game because an LLM decides truth, suspicion tags, Exposure, Evidence, report thresholds, verdict, or session termination.

## Primary Interaction

The default player verb is dialogue.

Each ordinary conversation should usually offer:
- three diegetic dialogue choices.
- optional free input when the build can classify it deterministically.
- a visible NPC/system response that teaches what sounded safe, uncertain, or strange.

The three choices are internally shaped as safe/local, uncertain/repair, and risky/weird, but the UI must show them as plausible speech, not as debug risk labels.

## Non-Negotiable Authority

Backend/runtime owns:
- Dream Law
- conversation memory
- suspicion signals
- report thresholds
- Cover Test semantics when used as internal proof
- Exposure
- Evidence
- Station intake
- Inquest
- Verdict
- Session termination

The API proposal provider may propose:
- NPC line candidates
- pressure phrasing
- dialogue choice wording for already-authored choice intents
- NPC reaction wording for known suspicion states
- localized variants
- fallback surface text

The API proposal provider must not decide:
- action type
- risk tag
- suspicion signal
- Evidence type
- reason codes
- why-line authority
- thresholds
- state transitions
- verdicts
- session closure
- final Evidence semantics

## Anti-Games

Dream of One must not become:
- detective game where the player gathers clues as investigator.
- open-ended chatbot sandbox.
- abstract speech-act button game where the main verb is selecting `SA_BREAK`.
- lore-heavy walking simulator.
- liminal horror mood demo without systemic consequence.
- Godot visual scene with labels but no pressure loop.
- AI novelty demo where provider prose obscures deterministic rules.

## Strategic Question

Every major decision should answer:

> Does this make the player feel investigated by a deterministic text-reading authority?

If not, it is not currently priority work.

## Current Redesign Record

The active redesign is [Conversation Suspicion Redesign](08-conversation-suspicion-redesign.md). It demotes the current Station Soft Inquest button loop to internal harness status and makes choice-supported dialogue the first player-facing proof path.
