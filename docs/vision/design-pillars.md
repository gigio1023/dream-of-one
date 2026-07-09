# Design Pillars

Four pillars. When priorities conflict, the lower-numbered pillar wins.

## 1. Conversation is the threat surface

The core verb is answering. Danger enters through dialogue: three diegetic
choices plus bounded typed free input that becomes a recorded statement.
Combat, stealth-crouching, and inventory puzzles are out of scope. If a
feature does not change what it feels like to be questioned, it is decoration.

**Decision rule:** prefer the change that makes an NPC's question, the
player's answer, or the consequence of that answer more legible or more tense.

## 2. Deterministic authority, proposing AI

Rules own truth: suspicion math, record semantics, ledger state, Station
intake, inquest, verdict, session end. The LLM proposes — NPC wording and next
tool calls inside explicit schemas — and everything it proposes is validated
before it touches the world. The game must be fully playable with providers
off (deterministic fallback lines).

**Decision rule:** if a design needs the model to be *right* to work, redesign
it so the model only needs to be *interesting*.

## 3. A society that visibly reacts

Suspicion is social before it is institutional: an NPC notices, probes,
gossips, writes a record; other NPCs read that record and change behavior; only
then does the Station formalize. Every reaction must be observable by the
player in-world — speech bubbles, reaction markers, records you can inspect,
an influence you can trace. NPCs are agent loops
([`../game/npc-agent-loop.md`](../game/npc-agent-loop.md)), not scripted
reaction chains.

**Decision rule:** author affordances and rules, not outcomes. If a slice is
"add another hardcoded if-X-then-Y social branch," reframe it as a tool,
record, or visibility change the agent loop can use.

## 4. Playable first, honest always

Every milestone ends in something a person plays and judges with the fun gate:
"would I play this again for five minutes?" Public claims match the build
exactly (no implied open-ended chat, no promised model). Ambition goes into
the game — more NPCs, more locations, richer loops — never into process.

**Decision rule:** between a proof artifact and a playable improvement, build
the playable improvement.

## Anti-goals (v1 failure guardrails)

- **No proof factory.** No ledgers, gate ladders, council reviews, evidence
  packs, comprehension packets. The fun gate plus thin smokes is the whole
  verification story ([`../tech/verification.md`](../tech/verification.md)).
- **No mid-milestone pivots.** Direction edits happen between milestones, in
  the existing vision docs, not as numbered addenda. v1 pivoted 6–8 times in
  its final 19 days; v2 budgets at most one direction change per milestone
  boundary.
- **No externally-owned gates.** Playtests inform; they never block a merge or
  a milestone.
- **No 3D.** The question "does 3D earn its cost?" was answered: no.
- **No vendor lock in the AI layer.** Providers are profiles behind ports
  ([`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md)).
