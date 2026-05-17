# Simulator Benchmark Research - 2026-05-14

Status: active benchmark research pack
Date: 2026-05-14
Use with: `docs/direction/11-simulator-benchmark-adoption-brief.md`

## Purpose

This pack answers a practical production question:

If the creator cannot reliably author or judge a complete game design document
from a blank page, can Dream of One be made safer by benchmarking proven
simulator games first, then layering the project's intended dream-society premise
on top?

Current answer: yes, with a constraint. The benchmark should not be copied as
theme or content. It should be copied as playable grammar.

## Research Lanes

| Lane | File | Focus |
|---|---|---|
| Bureaucratic/surveillance procedure | `lane-01-bureaucratic-surveillance/README.md` | Paperwork, data, surveillance, job pressure, moral consequence. |
| Workplace/life/routine simulation | `lane-02-workplace-life-routine/README.md` | Mundane routines, NPC texture, progression, ordinary place attachment. |
| Social stealth/suspicion | `lane-03-social-stealth-suspicion/README.md` | Blending in, tells, watcher logic, recovery, readable suspicion. |
| LLM/agent social simulation | `lane-04-llm-agent-social-sim/README.md` | Generative agents, drama management, social physics, provider boundaries. |

## Immediate Synthesis

Dream of One's safest design path is:

1. Build a readable procedure simulator before expanding fiction.
2. Make the Store and Station feel like ordinary institutions with specific
   work routines.
3. Treat each player line as an inspection artifact, not open-ended chat.
4. Let NPCs notice procedural mismatch before the Station formalizes it.
5. Use LLMs for wording, preoccupations, and ambient social texture only after
   the deterministic simulator loop already works.

## Source Policy

Sources are English-language web pages, official game pages, Steam pages,
developer pages, papers, and reputable secondary databases/interviews when
official material does not expose enough design detail.

No source is treated as proof that Dream of One will work. Each source is used
only to extract a design pattern that must be proven in Dream of One's own
playable build.

## Active Adoption Target

The next design target is not "make the whole dream society."

It is:

```text
Same Order as a procedure simulator
-> clerk expectation
-> player line
-> mismatch or repair
-> receipt/report artifact
-> Station compares exact record
-> deterministic outcome
```

This is the smallest useful benchmark adoption path because it preserves the
project rails:

- player is not investigator;
- NPCs and Station investigate the player;
- text is where the danger starts;
- provider output is wording only;
- backend/runtime owns consequence.
