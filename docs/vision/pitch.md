# Pitch

## One sentence

A 2D top-down social-stealth game where you are the suspect: every
conversation is a small interrogation you didn't ask for, everything you say
can become a record, and the town's NPCs — running real agent loops — read
those records and quietly close in.

## The fantasy

You look like everyone else in a small administered town. You are not. NPCs
assume you belong; their questions are mundane ("같은 주문이시죠?" — "the
usual order, right?"), but your answers are compared against what the town
already knows about you. Hesitate, contradict a record, or say something a
clerk finds odd, and suspicion starts to travel: a note in a tray, a word to
the manager, a posting on the park notice board, a citation read aloud by a
Station officer. You win social rounds by passing as ordinary — and you can
feel the town's attention tighten and loosen as you play.

The player is never the investigator. The society investigates the player.

## Why now / why this team shape

This is an AI-built game about AI-driven NPCs. NPCs are constrained agents:
they observe the world, choose a validated tool (move, look, talk, use an
object, write a record), read the result, and iterate — the same loop as a
coding agent, pointed at a social world. A swappable LLM provider layer is
the NPCs' actual mind: it decides what they say, what they try next, how
suspicious they become, and how the Station judges. Deterministic rules
enforce validity — sight/context separation, tool validation, a guaranteed
session ending — never the content of a judgment (see
[`design-pillars.md`](design-pillars.md), owner direction 2026-07-10).
Implementation cost is treated as near zero; design clarity is the scarce
resource.

## View and look

Top-down 2D (Stardew Valley camera), 16×16 pixel tiles and 4-direction
character sprites (free/CC0-first per the asset pipeline), modern-mundane
interiors: store, station office, park, studio. The setting is a **stateless
administered district** — generic-modern, institutionally named, deliberately
unlocatable; Korean stays the authoring language of the content. Surveillance
pressure is drawn with sightline cues, speech bubbles, reaction markers, and
inspectable records — all things a top-down camera makes *more* readable
than 3D did.

## References (what we take, what we leave)

| Game | Take | Leave |
|---|---|---|
| Papers, Please | Mundane procedure as tension; documents as truth | Booth-locked player |
| Stardew Valley | Camera, readability, town-as-home feeling | Farming/progression economy |
| Return of the Obra Dinn / Her Story | Player reconstructs what the system knows | Pure detective framing (we invert it) |
| Dwarf Fortress / RimWorld | Simulation-first stories, emergent NPC behavior | Scale; we simulate one town block deeply |
| Among Us (social reads) | "Act normal" pressure under observation | Multiplayer |

## Scope promise

First public target is an honest 15–30 minute prologue demo (M5): one town
block, a handful of deeply-instrumented NPCs, four meaningfully different
route outcomes, Korean and English. Not promised: open-ended chat, a fixed
LLM model, a full campaign.
