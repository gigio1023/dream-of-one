# Player Experience Targets

## Purpose

This document defines what the player must understand or feel at key points. It turns "make it game-like" into observable targets.

M1 technical proof is not enough for this document's target. M1 proves the protocol can work locally. A small complete prologue/demo must prove that a player can hold a short conversation, choose or enter a line, see NPC suspicion change, reach a report/inquest consequence, and explain what happened.

## Game-Like Completion Bar

The prologue/demo feels complete when:
- the player always knows the immediate available action.
- dialogue response creates visible risk, feedback, and consequence.
- the default interaction is three readable dialogue choices, with optional free input only when deterministic classification and fallback are proven.
- the Station or NPC system acts on prior Evidence without making the player the investigator.
- the player reaches inquest/verdict/session end because the loop resolves, not because content stops.
- replaying at least one safe/risky/repair path changes the outcome in a readable way.

It is not complete when:
- command evidence passes but the player cannot read the goal.
- consequence exists only in backend logs.
- visual staging does not show pressure or route intent.
- UI labels expose debug state without player meaning.
- a tester cannot explain why Exposure or verdict changed.
- the player believes they are pressing abstract risk buttons rather than speaking in a social scene.

## First 60 Seconds

Target:
- Player understands they are entering a controlled Station space.
- Player sees dialogue as the primary action surface, not only UI description.

Required signals:
- Station authority visible without exposition wall.
- one readable NPC/system prompt directed at the player.
- three dialogue choices that sound like speech.

Failure:
- player wanders through an empty scene.
- tutorial text explains the game without pressure.
- player thinks they are looking for clues.

## First 5 Minutes

Target:
- Player realizes ordinary conversation can become Evidence.

Required signals:
- player response or selected text is classified from conversation context.
- NPC reaction changes from normal to uneasy, corrective, or probing.
- Exposure or pressure changes.
- why-line or system surface explains consequence without sounding like debug output.

Failure:
- text feels like flavor.
- consequence is hidden in backend only.
- player believes outcome is arbitrary.

## First 10 Minutes

Target:
- Player understands NPC/Station systems are investigating them.

Required signals:
- intake or probe follows up on prior conversation.
- NPC/Station behavior changes from the Evidence.
- player has at least one defuse/cover attempt.
- at least one suspicion share or report shows social propagation before Station pressure.

Failure:
- NPCs only deliver lore.
- player initiates all investigative action.
- provider-generated lines feel detached from state.

## First 20-30 Minutes

Target:
- A small session closes through deterministic inquest/verdict pressure.

Required signals:
- conversation pressure resolves into report, inquest, soft verdict, or session end.
- verdict or soft-verdict preview appears.
- session consequence is tied to Evidence.

Failure:
- demo ends because content runs out.
- verdict feels authored rather than caused.
- provider text seems to invent the result.

## Visual And UI Gates

Visual gates:
- route landmarks, interactables, NPC/system pressure, consequence surface, and end-state view are visible in current-build captures.
- readable text survives normal play distance and screenshot review.
- camera/input framing does not make the player feel like a detective searching for clues.
- surveillance pressure is visible through staging, not only written in HUD text.

UI gates:
- the NPC prompt and three available dialogue choices are clear before input.
- optional free input is framed as a recorded statement, not a safe chatbot box.
- selected or entered player text is connected to Evidence/Exposure consequence.
- why-line reads as diegetic/system pressure, not debug output.
- provider/fallback state is disclosed when relevant.
- Korean and English consequence states preserve the same meaning.
- verdict/session-end UI names the deterministic result and why it happened.

Failure:
- player-facing text overlaps, clips, or requires debug knowledge.
- fallback/live-provider state is invisible when it changes player expectations.
- Exposure changes without a visible reason.
- end state appears as a generic stop screen.

## Confusion Budget

Allowed:
- player does not fully understand Dream Law at first.
- player is uncertain which answer is safe.
- player feels procedural unease.

Not allowed:
- player does not know what they can do.
- player cannot read the text.
- player cannot connect their response to consequence.
- player thinks they are a detective.

## Measurement

Use:
- screenshot or video timeline.
- playtest observation.
- text surface ledger.
- Evidence why-lines.
- player paraphrase: "What is happening to you?"

Pass threshold for demo-completion work:
- player can state they are being investigated, not investigating.
- player can connect at least one dialogue response to NPC suspicion and Evidence/Exposure consequence.
- player can explain why one choice sounded safer or stranger than another without reading internal risk labels.
- player can identify whether the provider is live or fallback-only when that affects the build promise.
- player can explain the verdict/session-end cause in ordinary language.

M1 forced/proxy smoke evidence may support implementation, but it cannot replace external comprehension evidence.
