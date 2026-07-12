# Premise And Rails

## Logline

You wake as an outsider in the central park with a scheduled Station hearing
already waiting. Six residents live, meet, and compare what they actually
know about you; to leave, you must persuade enough of them that you are an
ordinary person before the hearing decides what you are.

## Player Situation

The player wakes in the park and remembers nothing from before that moment.
The only lead is a clue that a Studio review schedule might include them. It
does not prove that they are the expected reviewer or that the booking belongs
to them. Neither fact has a hidden canonical answer that the player must
discover.

The Studio reception is a plausible first conversation, not a required quest
route. The run's purpose is to pass the scheduled hearing through
conversation. The player may admit uncertainty, adopt the review premise,
challenge it, or offer another account; no authored answer is privileged as
the truth.

## AI Gameplay Thesis

The released game uses a configured provider as the residents' judgment when
that provider passes runtime preflight. It proposes NPC wording and next
actions, judges suspicion and stance from the speaker's scoped context, and
judges the final hearing account.

The runtime validates every proposed world action, enforces sight and context
separation, clamps allowed state changes, maintains records and the civic
ledger, and guarantees that conversations and the hearing terminate. It does
not replace a live provider's social or hearing judgment with authored
outcomes.

Pitch-facing production details live in `docs/archive/scenario/pitch/`.

## Player Fantasy

The player is not a detective, spy, or hero. The player is a person trying to remain socially legible.

The fantasy is tense competence:

- learn what each resident has actually seen, heard, or read;
- choose what account of yourself to give them;
- repair contradictions before they become institutional pressure;
- earn enough grounded support to enter the hearing with a credible account;
- argue for an ordinary classification and leave.

## Design Pillars

| Pillar | Meaning | Implementation Consequence |
|---|---|---|
| Accusation first | Every scene asks what society suspects about the player. | Each beat starts with an accusation vector and an examiner NPC. |
| Text is machinery | Signs, prompts, forms, barks, and why-lines change state. | No player-facing text appears without a trigger or Evidence role. |
| Bureaucracy is competent | The Station is not absurdly stupid or comic. | Procedures are legible, patient, and self-justifying. |
| Surrealism is bounded | Dream logic can be strange, but enforcement is consistent. | Dream Laws always map to deterministic suspicion signals and Evidence. |
| Failure records | Bad choices do not stop play; they create durable Evidence. | Every failure emits artifact, witness, threshold, or route consequence. |
| Korean first | Institutional unease comes from Korean register first. | English is localized from Korean intent, not the other way around. |

## Core Dramatic Question

Can the player make six independently informed residents' accounts of them
sound ordinary before the Station hearing?

## What The Game Is Not

- Not a detective game where the player gathers clues to solve a case.
- Not a booking mystery or a memory-recovery quest.
- Not combat stealth or chase stealth.
- Not a dream-symbol tour where weirdness replaces rules.
- Not a lore codex with gameplay attached.
- Not a parody of paperwork.
- Not a meta game about being in a game.

## Authority Boundary

| System | Owns |
|---|---|
| Godot | 3D presentation, movement, collisions, text surfaces, NPC placement, prompts, HUD, observed local results. |
| NPC runtime | Schema and tool validation, scoped context, delta caps, records, civic ledger, scheduling, guaranteed session and run ending, deterministic fallback. |
| AI provider | NPC wording, suspicion and stance judgment, valid next-tool proposals, and the final hearing judgment. |
| Scenario docs | Setting, resident identities, goals, private pressures, voice, scene facts, and outcome presentation; never fixed production replies or reaction order. |

## Opening Situation

The run begins in the park. The Studio clue gives the player somewhere
plausible to start, while every resident remains a valid first conversation.
Residents ask and act from their own goals and scoped memories; the content
does not prescribe who reveals a fact, who reports it, or how any stance must
change.

`Same Order` remains an M1 Store regression scenario, not the M3R opening or
production route. Its fixed beats and lines may be used only by scripted test
adapters and bounded fallback. `Station Soft Inquest` likewise remains source
material rather than the current player-facing first loop.
