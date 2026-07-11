# Design Pillars

Four pillars. When priorities conflict, the lower-numbered pillar wins.

Revised 2026-07-10 after a direct owner interview at the M1→M2 boundary.
The largest change: **judgment authority moved from deterministic rules to
the model.** Rules keep the world valid; the model decides what things mean.

## Owner direction (2026-07-10, interview-confirmed)

This block is the confirmed source for the revision below. If a pillar and
this block ever drift apart, this block wins until the owner says otherwise.

1. **Game promise** — the player is interrogated inside a society of NPCs
   that genuinely understand and judge with an LLM. No pre-authored dialogue
   tree exists anywhere.
2. **The five-minute experience** — an NPC that understands an improvised
   answer and digs into its content; NPCs whispering about the player and
   visibly changing their attitude afterwards; a verdict genuinely reversed
   by a good argument; an NPC taking an action the player never prompted.
   All four, not any one of them.
3. **Input** — AI-generated contextual reply choices are the default, because
   free typing is tiring; a short free-typed phrase ("기타…") is always
   available. Either way the NPC understands the content. The choice UI is
   ergonomics, not a limit on the conversation.
4. **The model judges** — NPC dialogue, actions, suspicion formation, and
   Station verdicts. Being persuaded is gameplay. Prompt injection is a
   prompt/UX design problem, not a reason to remove model authority.
5. **Rules enforce validity, not judgment** — per-NPC sight and context
   separation (an NPC cannot use what it never saw, heard, or read), tool
   validation for every world mutation, and a session structure that always
   reaches an ending.
6. **Authored content** — world setting, NPC roles, goals, secrets,
   personalities, scene premises. Never lines or reaction orders.
7. **Restart** — memory lives inside one session. The four canonical routes
   are regression tests only; live play may leave them.
8. **Never-accept failures** — an NPC breaking the fiction (admitting it is
   an AI, referencing the real world), a session that cannot end, an NPC
   contradicting what it just said or saw.
9. **Current milestone bar** — one deep NPC loop is not enough; NPC-to-NPC
   social reaction must be visible in the same milestone. A successful live
   provider call is required proof.
10. **Not now** — cross-session memory, local model support (long-term goal
    only), more locations, save/load.

## Owner direction (2026-07-11, interview-confirmed, M2→M3 boundary)

Deltas confirmed at the M2 close. Where this block conflicts with the
2026-07-10 block (notably its item 7) or a pillar, this block wins.

1. **The run (회차) is the unit of play.** A run spans multiple conversations
   and incidents; suspicion, records, and the ledger persist across
   conversations *within* a run and reset *between* runs. "Memory lives
   inside one session" now reads "inside one run"; a conversation session
   stays the runtime unit with a guaranteed ending.
2. **A run has a purpose and a deadline.** The player came to town for a
   reason (sourced from scenario canon) and has limited time. Win by
   achieving the purpose in time; lose only to a definitive Station verdict.
3. **Interrogation is survivable.** Being reported and questioned at the
   Station is an in-run event: a defense that persuades lowers suspicion and
   the run continues. Argument-reversible verdicts are the hinge of the run
   structure, not a session-ending screen.
4. **Pressure comes from the fiction, not the clock.** No timers,
   auto-submit, or hesitation records in ordinary conversation; slow answers
   cost nothing by default. Real-time pressure exists only inside explicit
   high-pressure fiction (Station interrogation), and generously (≥40s).
5. **Waiting must never be structural.** The only time the player waits on
   the model is the minimum path to the content about to be shown (one
   merged judgment+reply call); every other provider call is preloaded,
   overlapped with the player's think/typing time, or deferred. Long
   generation is acceptable; serialized architecture is a defect.
6. **Time is spent, not streamed.** Run time advances only when the player
   acts: a day splits into segments (morning/noon/evening), a meaningful
   conversation or incident consumes one, and resting a segment slightly
   lowers suspicion. Thinking and typing never move the clock; deadline
   pressure is "chances left," never a running clock.
7. **State is on the dashboard, not in the room.** Suspicion is two-layered
   — per-NPC opinion plus institutional report pressure — and the HUD keeps
   an always-visible gauge (owner choice: legibility over diegetic
   subtlety). In-world record props stay removed; detail lives in inspect.

## 1. Conversation is the threat surface

The core verb is answering. The player converses through AI-generated
diegetic reply choices (default input, to keep typing fatigue low) plus a
short free-typed phrase option. Whichever form the player uses, the NPC
understands the content and responds to it — this is real conversation, not
choice-tree selection with flavor text. Everything said can become a record.
Combat, stealth-crouching, and inventory puzzles are out of scope. If a
feature does not change what it feels like to be questioned, it is decoration.

**Decision rule:** prefer the change that makes an NPC's question, the
player's answer, or the consequence of that answer more legible or more tense.

## 2. LLM judgment is the world's judgment

NPCs judge with the model: what to say, what to do next, whether the player's
answer is suspicious, and — at the Station — how intake, inquest, and verdict
actually go. A player who argues well can genuinely turn a verdict around;
being persuaded is gameplay, not a failure mode. Prompt injection is defended
at the prompt and UX layer, not by taking judgment away from the model.

Rules enforce *validity*, never *judgment*:

- **Sight and context separation** — each NPC's context is assembled only
  from what it authored, observed, heard, or read. No omniscient NPCs.
- **Tool validation** — every world mutation goes through a validated tool
  against real world state. The model cannot conjure objects or records.
- **Session structure** — every session reaches an ending. The runtime owns
  that guarantee even when the judgment inside it is the model's.

Fallback exists so a session can survive provider failure honestly (visibly
marked), but the product experience requires a live model. Online play with a
paid model is the current premise; local-model support is a long-term goal,
not a design constraint today.

**Decision rule:** if a rule decides the *content* of a judgment, move that
decision into the model's context; if it protects the *validity* of the
world, keep it deterministic.

## 3. A society that visibly reacts

Suspicion is social before it is institutional: an NPC notices, probes,
gossips, writes a record; other NPCs read that record and change behavior; only
then does the Station formalize. Every reaction must be observable by the
player in-world — speech bubbles, reaction markers, records you can inspect,
an influence you can trace. NPCs are agent loops
([`../game/npc-agent-loop.md`](../game/npc-agent-loop.md)), not scripted
reaction chains. Per the owner direction above, visible NPC-to-NPC reaction
belongs in the current milestone, not a later one.

**Decision rule:** author affordances and rules, not outcomes. If a change is
"add another hardcoded if-X-then-Y social branch," reframe it as a tool,
record, or visibility change the agent loop can use.

## 4. Playable first, honest always

Every milestone ends in something a person plays and judges with the fun gate:
"would I play this again for five minutes?" Public claims match the build
exactly — including what the conversation can and cannot understand — and no
specific model is promised. Ambition goes into the game — more NPCs, more
locations, richer loops — never into process.

**Decision rule:** between a proof artifact and a playable improvement, build
the playable improvement.

## Unacceptable failures (owner-set quality floor)

These three are never "interesting model behavior"; implementation must
actively defend against them with prompting, validation, and repair:

1. An NPC breaks the fiction: admits being an AI, references the real world.
2. A session drags on without reaching an ending.
3. An NPC acts in direct contradiction to what it just said or saw.

Offensive or strange-but-in-fiction model output is not on this list; the
owner prefers to observe it before regulating it.

## Anti-goals (v1 failure guardrails)

- **No proof factory.** No ledgers, gate ladders, council reviews, evidence
  packs, comprehension packets. The fun gate plus thin smokes is the whole
  verification story ([`../tech/verification.md`](../tech/verification.md)).
- **No mid-milestone pivots.** Direction edits happen between milestones, in
  the existing vision docs, not as numbered addenda. v1 pivoted 6–8 times in
  its final 19 days; v2 budgets at most one direction change per milestone
  boundary. (This revision is the M1→M2 boundary change.)
- **No externally-owned gates.** Playtests inform; they never block a merge or
  a milestone.
- **No 3D.** The question "does 3D earn its cost?" was answered: no.
- **No vendor lock in the AI layer.** Providers are profiles behind ports
  ([`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md)).
