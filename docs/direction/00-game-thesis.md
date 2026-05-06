# Game Thesis

## One-Sentence Thesis

Dream of One is a Korean-first social-surveillance game where the player is not investigating a mystery; the Station investigates the player's text, turns speech into Evidence, and closes the session through deterministic Dream Law.

## Product Promise

The player should feel that ordinary explanation is unsafe. A sentence, hesitation, or attempted cover can become Evidence under a rule system the player does not control.

## AI Promise

This is an AI game because an API proposal provider can participate in bounded NPC/Station wording variation. It is not an AI game because an LLM decides truth, guilt, action choice, risk, Exposure, Evidence, verdict, or session termination.

## Non-Negotiable Authority

Backend/runtime owns:
- Dream Law
- Cover Test
- Exposure
- Evidence
- Station intake
- Inquest
- Verdict
- Session termination

The API proposal provider may propose:
- NPC line candidates
- pressure phrasing
- localized variants
- fallback surface text

The API proposal provider must not decide:
- action type
- risk tag
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
- lore-heavy walking simulator.
- liminal horror mood demo without systemic consequence.
- Godot visual scene with labels but no pressure loop.
- AI novelty demo where provider prose obscures deterministic rules.

## Strategic Question

Every major decision should answer:

> Does this make the player feel investigated by a deterministic text-reading authority?

If not, it is not currently priority work.
