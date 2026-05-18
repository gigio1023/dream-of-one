# Game Thesis

## One-Sentence Thesis

Dream of One is a Korean-first conversation social-stealth game where the player is not investigating a mystery; NPC society and the Station investigate the player's dialogue, turn conversational weirdness into Evidence, and close the session through deterministic Dream Law.

## Core AI Philosophy

Dream of One's social simulation should be built around
[`AGENT_LOOP_RUNTIME`](17-agent-loop-runtime-pivot.md), not a growing table of
fixed reactions.

The game should work like a constrained coding-agent loop inside a small social
world: NPCs receive context, local goals, memory, and access to validated
tools; they observe the result of each tool call; then they choose the next
step. The designer authors the world, tools, permissions, safety rails, and
authority rules. The NPC decides what to try, what to say, whether to wait, ask,
retry, or stop.

This is not optional implementation detail. It is part of what the game is.

## Product Promise

The player should feel that ordinary conversation is necessary but never fully safe. A selected line, free statement, hesitation, contradiction, or attempted cover can make an NPC wonder whether the player came from somewhere else. When enough suspicion is shared, the Station receives a report.

## AI Promise

This is an AI game because NPC society should move toward bounded
`NPC_TOOL_LOOP` behavior: an LLM may propose the next valid tool call, choose
utterance, summarize short memory, or decide how to respond to a blocked result
inside explicit runtime tools.

The current checked-in provider proof is more limited and may still generate
bounded NPC/Station wording variation for prompts, response choices, reactions,
localization, and fallback text. That is a stepping stone, not the final design
center.

It is not an AI game because an LLM owns truth, suspicion tags, Exposure,
Evidence, report thresholds, verdict, or session termination.

AI_PROVIDER_SEARCH_INDEX: provider/auth implementation truth starts at
[`docs/agent-search-index.md`](../agent-search-index.md) and
[`docs/development/ai-provider-runtime.md`](../development/ai-provider-runtime.md).
The first provider implementation is `openai-codex`; it is not Codex CLI login.

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
- next tool call inside an explicit runtime tool schema;
- NPC line candidates
- pressure phrasing
- dialogue choice wording for already-authored choice intents
- NPC reaction wording for known suspicion states
- localized variants
- fallback wording

The API proposal provider must not decide:
- unchecked action type outside a runtime tool schema
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
- if/else society where every social consequence is an authored branch.
- fixed workflow LLM demo where changing the requirement means rewriting the
  whole chain.
- abstract speech-act button game where the main verb is selecting `SA_BREAK`.
- lore-heavy walking simulator.
- liminal horror mood demo without systemic consequence.
- Godot visual scene with labels but no pressure loop.
- AI novelty demo where provider prose obscures deterministic rules.

## Strategic Question

Every major decision should answer:

> Does this make the player feel investigated by a deterministic text-reading authority?

And for AI/NPC work:

> Does this help NPCs iterate over context and tools, or does it merely add one
> more fixed reaction?

If not, it is not currently priority work.

## Current Redesign Record

The active redesign is [Conversation Suspicion Redesign](08-conversation-suspicion-redesign.md). It demotes the current Station Soft Inquest button loop to internal harness status and makes choice-supported dialogue the first player-facing proof path.
