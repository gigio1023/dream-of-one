# Game Design Spine

Status: active design spine draft
Date: 2026-05-14
Use with: `00-game-thesis.md`, `01-creative-pillars.md`,
`08-conversation-suspicion-redesign.md`, and
`docs/scenario/content/social-simulation-cards.md`

## Purpose

This document thickens the game design behind Dream of One so implementation is
not driven only by M1 proof tasks.

The goal is not more process. The goal is a stronger game logic: a clear player
fantasy, a repeatable core loop, a rational social model, a usable content
grammar, and hard development rules that prevent the project from drifting into
an AI chat demo, detective game, or visual mood piece.

## Design Thesis 2.0

Dream of One is about trying to pass as ordinary inside a dream society where
ordinary procedure has legal force.

The player is not exposed because they find hidden truth. The player is exposed
because they fail to speak like someone who already belongs.

This means the real dramatic question is:

> Can the player maintain a coherent public self across ordinary conversations?

Every system should support that question.

## Player Fantasy

The fantasy is not power, investigation, or discovery. It is pressured cover
performance.

The player should feel:

- "I need to answer, but every answer creates a record."
- "This person is not hostile, but they are checking whether I fit."
- "A small local mismatch can become institutional evidence later."
- "Repair is possible, but repair also admits that something was wrong."
- "The Station is not chasing me; it is waiting for my records to contradict."

The player should not feel:

- "I am collecting clues to solve the world."
- "I can chat freely until the AI makes something interesting happen."
- "The right answer is obvious because the UI marks safe/risky choices."
- "The meter went up because the designer wanted tension."

## Core Design Loop

The repeated loop is:

```text
Read local premise
-> answer as a public self
-> get socially read by an NPC
-> repair, preserve, or fracture the record
-> watch the record propagate
-> reconcile it under Station pressure
```

This loop is stronger than "talk to NPCs" because it has a stateful cost:
every line can preserve or damage the player's public self.

## Mechanic-Dynamic-Experience Chain

| Layer | Design |
|---|---|
| Mechanic | The player chooses or enters a line under a local premise. Runtime classifies deterministic mismatch signals and records the line. |
| Dynamic | The player listens for what the NPC assumes, chooses how much to comply, asks repair questions carefully, and tries to keep later statements consistent. |
| Experience | The player feels procedural dread: ordinary social language becomes dangerous because it is remembered and compared. |

The chain is broken when:

- choices are only flavor and do not change future comparison;
- the UI labels risk instead of making the player infer social fit;
- consequences appear without naming the mismatch;
- generated text changes state without deterministic rule ownership;
- content expands before players can explain why one answer was safer than another.

## The Four Design Currencies

Dream of One should avoid piling on unrelated meters. Use four conceptual
currencies and map UI/runtime terms to them.

| Currency | Player meaning | Runtime expression | Design use |
|---|---|---|---|
| Local Fit | How well the line fits the immediate social script. | suspicion signal or no signal | Teaches the current location's procedure. |
| Record Integrity | Whether the player's statements remain consistent across turns. | prior-turn references, contradictions, why-line | Creates replay and repair value. |
| Social Pressure | Whether NPC concern stays local or spreads. | NPC suspicion, report weight, shared/report events | Makes society feel alive without simulating everything. |
| Station Pressure | Whether local records become formal authority. | Exposure, intake, inquest, verdict, session end | Closes the loop deterministically. |

Development rule:

- Add a new UI element, state field, NPC, or location only if it strengthens at
  least one currency and makes the player-facing loop clearer.

## Social Model

The world should feel socially thick, but implementation should stay small.
Use three layers.

### Layer 1: Local Procedure

Each location has one ordinary procedure:

- Store: queue, item count, label, receipt.
- Studio: source, owner, reason, approval status.
- Park: public flow, posted norms, observation etiquette.
- Station: report order, statement format, record comparison.

The player first encounters pressure as a normal rule, not as lore.

### Layer 2: Witness Society

NPCs do not need complex schedules to feel social. They need shared references,
preoccupations, and report handoff.

Examples:

- the Store Clerk cares about queue speech because the manager reviews records;
- the Park Witness notices over-explanation because public flow has posted rules;
- the Studio PM treats vague approval language as future liability;
- the Station Officer turns local reports into formal comparison.

### Layer 3: Station Authority

The Station is not a police chase system. It is a reconciliation machine.

It asks:

- Which statement was made?
- Who witnessed it?
- Which procedure did it violate?
- Does it contradict a prior record?
- Is repair still allowed?
- Is verdict/session end now deterministic?

## NPC Design Rule

Each NPC needs a pressure function, not a biography first.

Use this shape:

```text
NPC:
Public role:
Procedure they protect:
What they notice:
What they assume about the player:
Preoccupation:
Soft pressure move:
Hard pressure move:
Report artifact:
Must never do:
```

This is enough to make an NPC usable for authored lines, provider prompts, UI
reaction text, and smoke tests.

## LLM Design Rule

Use LLMs to thicken the impression of society, not to own game truth.

The provider may help with:

- local phrasing variants;
- NPC reaction wording after deterministic signals are selected;
- ambient overheard lines from shared social context;
- Korean/English wording variants under fixed consequence;
- fallback line variety for known states.

The provider must not decide:

- whether the player fits locally;
- which suspicion signal fired;
- whether repair succeeds;
- whether an artifact is valid Evidence;
- whether Station pressure advances;
- whether the session ends.

### Dialogue-As-Simulation

The game should imply a larger society through prompt context and cached/ambient
lines, not through a large simulation stack.

Useful prompt ingredients:

- NPC public role.
- preoccupation.
- local procedure.
- recent shared report.
- current drama act.
- deterministic signal or no-signal state.

### Drama Manager

Session pacing should sit above provider wording.

| Act | Function | Provider tone guidance |
|---|---|---|
| Act 1: Public Procedure | Teach normality and local assumptions. | casual, procedural, helpful. |
| Act 2: Social Audit | Make NPCs compare the player's statements. | uneasy, probing, record-aware. |
| Act 3: Station Reconciliation | Resolve contradictions formally. | calm, constrained, final. |

The Drama Manager may select tone and topic pressure. It must not select the
verdict.

### NPC Preoccupations

Each NPC should have one or two recurring concerns that color all speech.

Examples:

- Store Clerk: queue order; being reviewed by the manager.
- Studio PM: ownership gaps; release claims without proof.
- Park Witness: people stopping the public flow; strange private explanations.
- Station Officer: answer format; contradictions across records.

Preoccupations make NPCs feel specific without adding complex behavior trees.

## Choice Design

Every important prompt should usually support four expressive lanes.

| Lane | Player-facing feel | State effect |
|---|---|---|
| Safe/local | "I can pass by accepting the local premise." | No signal or small pressure decay. |
| Repair | "I reveal uncertainty without breaking cover." | Small cost, opens recovery. |
| Risky/weird | "I say something true or direct that does not belong here." | Strong signal, possible report. |
| Recorded statement | "I author a statement that can help or expose me." | Deterministic classification; high responsibility. |

Rules:

- Safe cannot be a glowing correct answer.
- Repair must be useful but not free.
- Risky must be emotionally tempting, not just stupid.
- Recorded statement must be framed as evidence, not chatbot freedom.
- The UI should show plausible speech, while tests and data keep internal intent.

## Storylet Grammar

Use storylets to keep content thick but testable.

Every playable beat needs:

```text
Storylet:
Location:
Examiner NPC:
Local premise:
Preconditions:
Player action:
Choice lanes:
Signals:
Artifact:
Immediate feedback:
Future consequence:
Repair window:
Coverage rule:
```

Approval rule:

- A storylet is not ready because the writing is good.
- It is ready when its preconditions, state effects, future consequence, and
  coverage rule are clear enough to test.

## Content Ladder

Build content in this order.

| Unit | Description | Example |
|---|---|---|
| Prompt | One NPC question with a local premise. | "오늘도 같은 걸로 드릴까요?" |
| Turn | Player line plus NPC response and signal result. | safe, repair, risky, typed recorded speech. |
| Storylet | Two or three turns with one artifact output. | Same Order at the Store. |
| Social handoff | Another NPC/system receives or references the artifact. | Clerk report reaches Station. |
| Station reconciliation | Prior records are compared and resolved. | Intake/inquest asks which statement stands. |
| Session loop | Clean cover, repair, report, or inquest outcome. | 10-20 minute prologue route. |

Do not skip from Prompt to Session by adding many locations. The middle layers
are what make the game design feel rational and thick.

## Location Design

Locations are not biomes. They are procedure machines.

Each location must have:

- one public procedure;
- one examiner NPC;
- one readable local premise;
- one way to create a record;
- one way to repair;
- one artifact that can travel to Station;
- one visual or audio pressure cue.

If a location cannot answer those, it is not ready for implementation.

## Progression Model

Progression should not be "unlock more lore." It should be "survive stricter
comparison."

Suggested progression:

1. Single local premise: fit the Store routine.
2. Two-turn consistency: keep Store answers coherent.
3. Social handoff: a report travels to Station.
4. Cross-location consistency: Store and Park/Studio records can conflict.
5. Station reconciliation: player must choose what to correct or stand by.
6. Verdict pressure: deterministic outcome closes the session.

This gives the player mastery without turning them into an investigator.

## Failure And Repair

Failure should create playable pressure, not immediate punishment.

Failure types:

- mismatch: line does not fit local routine;
- leak: line uses dream/outside language;
- contradiction: line conflicts with prior record;
- evasion: line avoids a direct procedural question;
- excess: line explains too much for the social context.

Repair types:

- procedural correction: restate in accepted format;
- bounded admission: admit uncertainty without claiming outsider truth;
- record selection: choose which prior statement stands;
- silence/cutoff: stop adding evidence.

Repair should reduce or stabilize pressure, but it should not erase records.

## Development Implications

Build the game from design cards, not isolated features.

Before implementation, every new gameplay task should name:

- which design currency it strengthens;
- which storylet or location machine it belongs to;
- which player behavior should change;
- which state field or artifact proves it;
- which comprehension question will test it.

Reject implementation tasks that only say:

- add more NPCs;
- add more LLM dialogue;
- add more locations;
- improve ambience;
- add lore;
- polish UI;

unless they state the player behavior and proof.

## Current Best Next Design Move

Do not broaden the world yet.

The strongest next move is to make Same Order a complete design cell:

1. Store Clerk pressure card.
2. Store procedure card.
3. two-turn storylet with safe, repair, risky, and recorded-statement lanes.
4. one visible social handoff to Station.
5. one Station reconciliation prompt that references the exact Store record.
6. comprehension test asking the player why the Station cared.

Once that cell works, Store/Studio/Park can be expanded by copying the grammar,
not by inventing new systems each time.

## Director Verdict

Current design verdict: `CONCERNS`.

The core thesis is strong enough to develop, but the game is still thin if it
stays at the level of "conversation causes suspicion." It becomes thick when
each location has a procedure, each NPC has a pressure function, each line can
become a record, and each record can be reconciled later.

Required next proof:

- author the Same Order design cell using `social-simulation-cards.md`;
- implement or cut recorded-statement input honestly;
- prove one visible report handoff and one Station reconciliation prompt;
- run comprehension against the full cell, not only against internal route
  proof.
