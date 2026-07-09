# Game Design

Director source of truth starts in `docs/direction/08-conversation-suspicion-redesign.md`.
Core AI/NPC philosophy is locked in
`docs/direction/17-agent-loop-runtime-pivot.md`.
Scenario source of truth lives in `docs/scenario/`, but the current scenario bible still needs a conversation-first rewrite before it can be treated as player-facing canon again.

## Core Loop

The player talks to NPCs while trying to sound locally normal. Each prompt offers three diegetic dialogue choices and, when proven safe enough for the build, optional free input. The runtime records the line, deterministic rules classify conversational weirdness, NPC suspicion changes, and reports can propagate to Station intake, inquest, and verdict logic.

NPCs should not be implemented as a growing set of fixed reaction branches. The
core social-simulation loop is `AGENT_LOOP_RUNTIME`: an NPC observes context,
chooses a local next step, calls a small validated tool, reads the result,
updates memory or conversation state, and iterates. The game definition depends
on this distinction.

## Player Role

The player is not an investigator. The player performs cover work while NPC society investigates inconsistencies.

## Danger Surface

Dialogue is where danger starts:

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

## NPC Agent Loop

The runtime should expose small tools and programmatic constraints:

- `move_to(target)`
- `look(target)`
- `talk_to(actor, utterance)`
- `wait(duration, reason)`
- `inspect_record(target)`
- `request(actor, topic_or_item)`

Programmatic systems own distance, reachability, busy/available dialogue state,
turn locks, object mutation, ownership/payment, memory writes, Evidence,
Exposure, inquest, verdict, and session end.

The NPC/LLM agent owns what to try, what to say, whether to wait, whether to
ask another actor, and how to react to a blocked tool result. A new feature that
only adds another fixed `if record X then NPC Y does Z` chain is not sufficient
game progress unless it directly scaffolds this loop.

## Current Internal Harness

The existing Godot Station Soft Inquest smoke proves deterministic authority with text surfaces and abstract speech acts. Preserve it as internal harness evidence until the conversation-first loop replaces it with a playable prompt/choice/free-input proof.
