# Small Release Game Design Bible

## One-Sentence Game

`Dream of One: Station Soft Inquest` is a 20-30 minute 3D social-stealth prologue where the player performs normal civic behavior while NPCs and Station systems convert imprecise public text into Evidence.

## Player Fantasy

The fantasy is not power. It is procedural survival.

The player feels watched by ordinary systems: queue boards, approval desks, park notices, intake forms, and mild NPC questions. The tension comes from knowing that a mundane answer can become a formal record.

## Design Pillars

| Pillar | Meaning | Ship Test |
|---|---|---|
| Text is machinery | Public words and player speech drive state. | Every critical sign, bark, choice, and why-line maps to a rule or artifact. |
| NPCs are examiners | NPCs test procedure; they do not give quests. | Each NPC owns one stable Cover Test. |
| AI is pressure, not authority | Codex varies surface pressure inside rules. | Same input state can get varied NPC text but identical deterministic outcome. |
| Failure becomes record | Mistakes create Evidence and later Station pressure. | No failure path dead-ends before verdict. |
| Small loop, full closure | The demo proves one complete ritual. | Station return produces clean cover, warning, or verdict-ready edge. |

## Core Loop

1. Read a public procedure.
2. Enter a social zone.
3. Choose a bounded speech act.
4. Receive NPC or Station pressure.
5. Create, repair, or avoid a record.
6. See why Exposure changed.
7. Carry the record into the next Station comparison.

## Player Verbs

| Verb | Runtime Form | Design Rule |
|---|---|---|
| Move | Keyboard/mouse/arrow look in 3D hub | Movement routes the player through public rules; it is not traversal filler. |
| Read | Interact with boards, signs, receipts, notices | Reading is the first defensive action. |
| Inspect | Look at Evidence, artifacts, and rule surfaces | Inspection must clarify why a record exists. |
| Answer | Choose bounded speech act | Speech acts are the main social-stealth control. |
| Repair | Comply, narrow, cite procedure, or correct record | Repair must stay available until verdict-ready. |
| Submit | Return to Station and let records be compared | Station compares; player does not investigate. |

## Speech Acts

| Speech Act | Player Meaning | Typical Effect |
|---|---|---|
| `SA_COMPLY` | Use the expected procedure. | Holds cover or reduces future risk. |
| `SA_INQUIRE` | Ask for rule clarification. | Low risk if rule was read; can reveal procedure. |
| `SA_FRAME` | Reframe answer as ordinary civic behavior. | Medium risk; may defuse if supported by prior artifact. |
| `SA_BREAK` | Over-explain, mention dream state, or contradict record. | High risk; creates or escalates Evidence. |

## Slice Arc

| Stage | Location | Emotional Function | Mechanical Function |
|---|---|---|---|
| Orientation | Station exterior | This place already has rules. | Teach reading, objective, and Exposure. |
| First pressure | Store | Mild public embarrassment. | First Codex NPC line and first Evidence delta. |
| Procedure depth | Studio | Professional compliance. | Multi-field source/owner/reason test. |
| False relief | Park | Open space still records you. | Public-flow restraint test. |
| Authority return | Station | The system has been waiting. | Intake opens from accumulated records. |
| Soft Inquest | Station | The player is compared to themselves. | Backend compares artifacts and speech acts. |
| Verdict edge | Station | Closure without overbuilding scope. | End state cites deterministic why-line. |

## End States

| End State | Condition | Player-Facing Meaning |
|---|---|---|
| Clean Cover | Low Exposure, no critical contradiction. | The public record stayed legible. |
| Warning | Medium Exposure or repaired mismatch. | The record is imperfect but procedurally survivable. |
| Verdict-Ready | Exposure threshold or unrepaired contradiction. | Station has enough record to terminate or detain in a full release. |
| Lucid Identified | Repeated dream-state speech and contradictions. | The player failed to remain ordinary in the public record. |

For the small release, `Verdict-Ready` is valid closure if it includes a complete why-line and replayable Evidence chain.

## What Makes It An AI Game

The game is an AI game because the player faces live Codex-generated NPC pressure inside deterministic constraints.

Codex should make interactions feel less canned by:

- restating the current mismatch in the NPC's voice;
- choosing a pressure tone that matches the examiner;
- generating short diegetic follow-up lines from current records;
- producing variation across replays without changing facts.

Codex should never:

- invent a law, witness, artifact, location, or verdict;
- decide Exposure;
- decide Station intake, Inquest, verdict, or termination;
- explain backend or model internals to the player;
- override a deterministic fallback.

## Minimum Complete Scenario

The small release is complete only when all of these exist in the playable build:

| Required Item | Count | Notes |
|---|---:|---|
| Complete civic loop | 1 | Station -> Store -> Studio -> Park -> Station. |
| Codex NPC interactions | 4 | Clerk, PM, Witness, Officer. |
| Rule surfaces | 5+ | Opening board plus one per pressure location. |
| Evidence artifacts | 4+ | One per pressure beat plus Station dossier. |
| Why-lines | 6+ | Every Exposure or Station transition. |
| Repair vectors | 3+ | Store, Studio, Station. |
| End states | 3 | Clean cover, warning, verdict-ready/lucid. |
| Korean/English UI | Full | Korean default; English selectable. |

## Design Anti-Goals

- broad open world;
- generic NPC chatbot;
- detective quest structure;
- lore-first exposition;
- extra districts before the first loop is shippable;
- AI-hosted backend paid by developer;
- Steam-first launch before itch setup proof.
