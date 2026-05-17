# Simulator Benchmark Adoption Brief

Status: active direction addendum
Date: 2026-05-14
Source: `docs/research/simulator-benchmarks/2026-05-14/`
Related quality floor: `docs/direction/13-operation-sim-quality-floor.md`

## Decision

Dream of One should adopt a benchmark-first design method for the next planning
cycle.

The game should be developed first as a small, legible simulator of ordinary
social procedure. The dream premise, Station authority, and OpenAI SDK/provider
wording layer should sit on top of that baseline.

This is not a genre pivot away from conversation suspicion. It is a production
method for making the conversation suspicion game judgeable.

## Why This Helps

The creator does not need to author a perfect design document from instinct.
Instead, Game Studio can use reference games as calibration material.

The useful question becomes:

```text
Which proven simulator grammar are we borrowing,
what exact player behavior does it create,
and how will Dream of One prove that behavior in its own build?
```

This makes critique less subjective. A feature is no longer accepted because it
sounds interesting. It is accepted only if it strengthens a playable simulator
loop.

## Reference Pillars

| Reference family | Borrow | Do not borrow |
|---|---|---|
| Paperwork/procedure sims | mismatch checking, escalating rule complexity, records, daily pressure, consequence summaries | pure document inspection as the whole fantasy. |
| Surveillance/data sims | limited observation feeds, institutional interpretation, ethical discomfort | player-as-detective authority. |
| Job/routine sims | ordinary workplace texture, repeated tasks, customer/NPC expectation, attachment to place | cozy drift without danger. |
| Social stealth/suspicion games | blending in, tells, watcher attention, visible suspicion triggers, recovery under pressure | multiplayer balance or combat stealth. |
| LLM/social-agent research | memory/context, preoccupations, drama tone, ambient social texture | provider-owned rules, endless chat, unbounded canon. |

## Adopted Core Loop

Dream of One's benchmark-first loop is:

```text
Read procedure
-> answer under social expectation
-> NPC compares answer to local record
-> player repairs or fractures cover
-> consequence becomes a record
-> Station cites that record
-> deterministic outcome explains why
```

This replaces weaker loops:

- talk to NPC until something strange happens;
- collect lore to understand the dream;
- ask the LLM anything;
- watch suspicion increase without a visible record.

## Current Same Order Revision Target

The active M1 Same Order prototype should be reframed as a miniature procedure
simulator.

Minimum Store procedure:

- queue or counter sign;
- normal "same order" assumption;
- displayed or implied usual-order record;
- receipt/label record;
- clerk concern behavior;
- report handoff cue.

Minimum Station procedure:

- exact Store line cited;
- exact record cited;
- constrained answer shape;
- deterministic route outcome;
- why-line explaining mismatch, repair, report, or inquest.

The player should be able to say:

```text
The clerk expected me to know the usual order. My answer did not match the
store record, so a note/report was created. The Station used that record later.
```

## Design Document Standard

Every new design document or storylet should include this benchmark-derived
checklist:

| Field | Required answer |
|---|---|
| Simulator baseline | What ordinary procedure is being simulated? |
| Player job | What does the player repeatedly do? |
| Judgment cues | What can the player read before choosing? |
| Expected behavior | What counts as fitting in? |
| Mismatch | What can go wrong? |
| Watcher | Who or what notices? |
| Record | What concrete record carries the consequence forward? |
| Repair | How can the player recover, and what does it cost? |
| Formalization | How does Station/NPC authority cite the record? |
| Proof | What playable evidence shows players understood it? |

If a design cannot answer these fields, it is not ready for implementation.

## LLM/OpenAI SDK Placement

The OpenAI SDK/provider layer should be packaged internally as a wording and
social-texture layer, not as the game engine.

Allowed provider jobs:

- rewrite NPC reaction in the NPC's pressure voice;
- generate bounded ambient lines from shared context;
- vary Station phrasing under fixed consequence;
- create Korean/English wording variants;
- produce fallback alternatives for known deterministic states.

Rejected provider jobs:

- classify whether the player belongs;
- invent new local rules;
- change suspicion thresholds;
- create Evidence without backend validation;
- decide report, inquest, verdict, or session end;
- make public claims about open-ended conversation before proof.

## Production Rule

No broad content expansion until Same Order passes the simulator adoption proof.

This proof now includes the low-budget operation simulator floor: the Store and
Station must have tangible procedure objects, visible record state changes, a
handoff cue, and exact Station citation.

Pass condition:

- Store procedure guide is readable.
- Same Order has clean, repair, soft report, and inquest route proof.
- Station cites the Store record exactly.
- Provider-off fallback gives the same outcomes.
- A fresh player or proxy can explain the cause chain.

## Game Studio Verdict

| Question | Verdict |
|---|---|
| Should benchmark-first planning replace blank-page design drafting? | `READY` |
| Should the current M1 plan be revised around simulator adoption? | `READY_WITH_CONCERNS` |
| Should this unlock broad M2 society simulation? | `NOT_READY` |
| Should this justify Codex/OpenAI/game-as-agent marketing yet? | `NOT_READY` |

## Immediate Actions

1. Create a Store procedure UI/readability issue.
2. Create a Store record and Station exact-citation issue.
3. Keep `docs/scenario/content/same-order-storylet-packet.md` aligned so every
   beat names procedure cue, record, and repair cost.
4. Run a fresh-player comprehension dry run before any M2 expansion.
5. Record live-provider vs fallback-only truth only after provider-off route
   parity is proven.
