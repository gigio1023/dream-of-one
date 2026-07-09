# Conversation Suspicion Redesign

Status: accepted design direction  
Date: 2026-05-06  
Replaces: player-facing Cover Test button loop as the primary game loop

## Decision

Dream of One should be a conversation-first social suspicion game.

Most player interaction should happen through dialogue. The default interaction
model is three authored or provider-proposed dialogue choices plus optional free
input. The player is not solving a case. They are trying to pass as someone who
belongs in a place where ordinary people, NPC institutions, and Station systems
notice conversational weirdness.

The current Station Soft Inquest playable slice remains useful as an internal
authority and Evidence harness. It is not the target player-facing design.

## Player Promise

The player should feel:

- an ordinary conversation is safer than silence but never fully safe.
- the wrong sentence can make an NPC think the player came from somewhere else.
- suspicion starts socially, not as a police meter.
- repeated small conversational mismatches become reports.
- Station/Inquest/Verdict are consequences of accumulated conversation records,
  not content gates or authored endings.

## Core Loop

```text
NPC prompt
-> player chooses one of three lines or writes an optional free line
-> runtime records the utterance in conversation memory
-> deterministic rules classify conversation anomalies
-> NPC response changes from normal to uneasy to probing
-> suspicion is stored, shared, or reported
-> Station opens intake/inquest when report thresholds are met
-> verdict/session end resolves from Evidence, not generated prose
```

Game Studio first-playable framing:

```text
Verb -> read -> risk -> response -> learning -> next choice
Speak -> read NPC context -> risk exposure -> see NPC reaction -> learn what sounded wrong -> answer the next prompt
```

## Interaction Model

### Default Choice Set

Every conversation prompt should usually present three choices:

1. `safe/local`: fits the NPC premise and local routine.
2. `uncertain/repair`: asks for clarification, delays, or repairs without
   directly breaking cover.
3. `risky/weird`: contradicts local memory, exposes outside knowledge, or uses
   dream/meta language.

These labels are internal. The UI shows diegetic dialogue lines, not risk labels.

Example:

NPC:

> 오늘도 같은 걸로 드릴까요?

Choices:

1. 네, 같은 걸로 부탁해요.
2. 제가 보통 뭘 시켰죠?
3. 오늘 처음 왔는데요.

Optional free input:

> 저는 이 꿈에 방금 들어왔어요.

The third choice and the free input can both be risky, but for different
reasons. The authored choice is controlled and testable. The free input is a
high-risk expressive statement.

### Optional Free Input

Free input is allowed only when the UI can make its risk clear. It should not be
required to finish the prologue. It should be positioned as an expressive
shortcut that can help, repair, or expose the player.

Free input must pass through deterministic classification. The API provider may
suggest paraphrases or NPC response wording, but it must not own suspicion tags,
Exposure deltas, report thresholds, Evidence type, Station state, verdict, or
session end.

## Deterministic Suspicion Signals

The backend/runtime should classify player dialogue using deterministic signals
from the selected choice, local context, and conversation memory.

Initial signal set:

| Signal | Meaning | Example |
| --- | --- | --- |
| `local_routine_mismatch` | Player contradicts what an NPC assumes is normal. | "오늘 처음 왔는데요" after a clerk treats them as a regular. |
| `dream_language_leak` | Player uses world-breaking language. | "이 꿈", "이 세계", "로드", "세이브". |
| `memory_gap_admission` | Player admits missing expected local memory. | "제가 보통 뭘 하죠?" |
| `role_script_break` | Player answers outside the expected social script. | Explaining identity during a purchase. |
| `prior_statement_contradiction` | New statement conflicts with prior conversation memory. | Says they live nearby, then says they just arrived. |
| `authority_evasion` | Player avoids a direct procedural question. | "그건 중요하지 않아요" during Station intake. |
| `over_explanation` | Player explains too much in a situation that expects routine. | Long self-defense during casual service. |

Signals may raise:

- local NPC suspicion
- shared rumor suspicion
- Station report weight
- Evidence confidence

Signals must not be created by provider prose alone. The provider can propose
wording around a signal selected by deterministic rules.

## Social Propagation

Suspicion should move through people before it becomes institutional.

Stages:

1. `normal`: NPC treats the player as expected.
2. `uneasy`: NPC notices one mismatch and asks a soft follow-up.
3. `probing`: NPC asks a confirming question or references prior records.
4. `shared`: NPC records or shares the oddity with another NPC/system.
5. `reported`: Station receives a report.
6. `inquest`: Station asks procedural questions using accumulated Evidence.
7. `verdict`: deterministic outcome closes or redirects the session.

This replaces "press risky button four times" as the player-facing escalation.

## Evidence Model

Conversation Evidence should be named after what happened in dialogue, not after
abstract Cover Test pressure.

Preferred event families:

- `conversation_started`
- `dialogue_choice_selected`
- `free_input_submitted`
- `conversation_anomaly_detected`
- `npc_suspicion_changed`
- `suspicion_shared`
- `station_report_created`
- `station_inquest_opened`
- `verdict_reached`

Evidence records should include:

- conversation id
- speaker id
- prompt id
- selected choice id or free input hash
- displayed player line
- prior line references
- deterministic signals
- suspicion before/after
- report weight before/after
- why-line shown to the player

## UI Direction

The player-facing UI should emphasize conversation, not meters.

Required UI elements:

- current NPC prompt
- three dialogue choices
- optional free input affordance
- recent conversation history
- subtle NPC reaction state
- "what sounded wrong" why-line after consequence
- report/rumor trace when suspicion is shared
- Station record when institutional pressure begins

Exposure can still exist internally, but the first readable feedback should be
NPC reaction and conversation record. A meter may remain as a secondary Station
pressure indicator only if it does not make the game feel like a debug harness.

## Minimal Prologue Scenario

Working title: "Same Order"

Scene:

- Store counter near Station route.
- Clerk believes the player is a regular.
- A nearby witness can overhear or receive the clerk's concern.
- Station officer later asks about the reported mismatch.

Playable route:

1. Clerk asks a routine question: "오늘도 같은 걸로 드릴까요?"
2. Player chooses safe, uncertain, risky, or optional free input.
3. Clerk reacts normally, uneasily, or with a probing follow-up.
4. A second prompt checks whether the player can maintain local routine.
5. If suspicion crosses the social threshold, the clerk shares a report.
6. Station intake uses the report as Evidence.
7. Player gets one repair chance.
8. Session ends with one of three deterministic outcomes:
   - `cover_held`: suspicion decays, player leaves.
   - `soft_report`: report filed, current micro-scenario closes with warning; continued play after report requires a later playable proof.
   - `inquest_opened`: Station opens formal questioning.

This is smaller and more honest than a broad Station route. It proves the actual
game: dialogue creates suspicion.

## AI/API Role

The provider may propose:

- NPC prompt variants
- three candidate player-line phrasings for an already-authored choice intent
- NPC reaction wording for a known suspicion state
- localized variants
- fallback line variants

The provider must not decide:

- which choice is safe or risky
- which signal fired
- suspicion delta
- report threshold
- Evidence type
- why-line authority
- Station/Inquest/Verdict state
- session termination

The release premise remains API-based proposal provider with runtime model
availability checks. The design must still work in deterministic fallback-only
mode.

## First Playable Proof Contract

Proof target:

> Can one short conversation make a player understand that sounding socially
> wrong causes NPC suspicion, report pressure, and Station consequence?

Minimum proof:

- one NPC
- one overheard/shared suspicion path
- three prompts
- three choices per prompt
- optional free input for at least one prompt
- deterministic suspicion signals
- one repair chance
- one Station report or inquest handoff
- Evidence Pack validated by backend
- gameplay capture showing conversation, NPC reaction, why-line, and outcome

Cut rules:

- Cut 3D route breadth before cutting conversation consequence.
- Cut live provider before cutting deterministic fallback playability.
- Cut free input before cutting the three-choice loop.
- Cut extra NPCs before cutting social propagation.
- Cut visible Exposure meter before cutting NPC reaction readability.

## Required Review Gates

Before calling this direction complete:

- Game Director: player verb is dialogue, not zone activation.
- Systems Designer: suspicion signals are deterministic and inspectable.
- Narrative Director: choices sound like plausible speech, not debug risk tags.
- UX Reviewer: player can read choices, reaction, and why-line without a manual.
- QA Lead: safe, risky, repair, and report paths are replayable.
- Release Reviewer: public copy does not promise open-ended chatbot play.

## Immediate Implementation Slice

1. Define `ConversationPrompt`, `DialogueChoice`, `ConversationTurn`,
   `SuspicionSignal`, and `ConversationEvidence` schemas.
2. Replace player-facing `SA_COMPLY/SA_BREAK` UI with three displayed dialogue
   lines plus optional free input.
3. Build "Same Order" with deterministic authored choices.
4. Add free-input classifier fallback that detects only a small safe set of
   explicit lexical signals first, such as dream-language leaks.
5. Convert playable smoke from forced `SA_BREAK x4` to:
   safe route, risky route, repair route, report route.
6. Update Evidence Pack validation to require conversation identity and signal
   trace for the conversation proof.

## Deprecated As Player-Facing Direction

Deprecated for player-facing design:

- abstract speech-act buttons as the primary interaction.
- risk labels shown as the choice identity.
- Cover Test zone activation as the main verb.
- repeated identical risky input to reach verdict.
- in-world notices as the primary proof that text is dangerous.

Preserved as internal harness:

- backend-owned authority.
- deterministic fallback.
- Evidence Pack validation.
- Station/Inquest/Verdict thresholds.
- Godot runtime shell.
- API provider as wording-only proposal layer.
