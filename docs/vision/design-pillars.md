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

## Owner direction (2026-07-11 late, direction interview + unknowns pass, M3 kill boundary)

Confirmed through an option-map pass over researched prior art and an explicit
closure gate, at a legal direction-change point: the 2D M3 was killed and
replaced (kill paragraph in [`../plan/roadmap.md`](../plan/roadmap.md)). Where
this block conflicts with any earlier block or pillar text, this block wins.

1. **First-person 3D conversion.** The game becomes one small seamless
   first-person 3D town the player is physically inside. One deliberate,
   complete direction change — not a probe, not an A/B room. 3D is
   infrastructure for the LLM NPC society, not an art upgrade; low-quality
   free assets are explicitly acceptable.
2. **The run purpose: pass the hearing.** The player is an outsider who must
   be classified ordinary at a scheduled Station hearing (청문회) to leave
   town. The hearing pools what the six NPCs individually believe — from
   their real memories — and the verdict is computed from that belief state.
   The player edits those beliefs through conversation only. Owner-approved
   one-sentence intent (Korean, canonical): 여섯 자율 LLM 주민이 당신 없이도
   서로 만나 당신에 대한 이론을 굳혀 가는 1인칭 3D 소도시에서, 정해진 청문회
   날까지 대화만으로 주민들의 믿음을 편집해(보증 확보·소문 진압) '평범한
   사람' 판정을 받아 마을을 떠나는 게임.
3. **Staged rollout.** First version presents each resident's existing
   per-NPC opinion as one coarse stance (`oppose`, `uncertain`, `vouch`) rather
   than adding a third social meter. Four of six residents must be
   `vouch`-ready before the hearing may classify the player as ordinary; this
   quorum is necessary, not sufficient. The model judges each stance from
   that resident's real memory, while rules
   verify provenance and count the quorum. The final hearing defense may cause
   one last memory-grounded stance reassessment. The rumor-diffusion clock
   lands only after NPC-to-NPC conversation is proven in play.
4. **Win/loss/deadline.** The hearing date is the deadline and the scheduled
   hearing is the only run-ending judgment in M3R. Win = classified ordinary;
   loss = a definitive abnormal verdict. Earlier Station interrogation is
   always a survivable in-run recovery event. Target run length 30–60 minutes,
   one sitting.
5. **Continuous world time** replaces action-cost day segments. The world,
   NPC simulation, and physics run in real time during free exploration and
   pause completely while the player is inside a modal conversation, including
   its merged judgment+reply wait. Ambient NPC provider work never pauses the
   world; it is asynchronous and its proposal is revalidated against the fresh
   world revision before any effect applies. Thinking and typing still never
   cost anything.
6. **Anti-idling comes from other people's meetings, never decay bars.**
   Standing still cannot earn a vouch: hearsay may create doubt, but a positive
   vouch requires that resident's meaningful first-hand conversation with the
   player. NPC-to-NPC conversations keep creating attributed memories, an NPC
   who never met the player testifies accordingly ("모르는 분인데요"), and
   suspicious NPCs may initiate contact. No affection meters, absence-decay,
   or busywork timers.
7. **Six persistent NPCs, one event-driven loop.** Exactly six NPCs run the
   same agent loop regardless of player distance; provider calls wake on
   schedules, arrivals, observations, goals, and conversations — never per
   tick. Interpersonal claims move between NPCs only through real utterances
   and listener memory; no scripted gossip or off-screen summary system.
   Explicit administrative records may still be written and read as validated
   world actions, but reading a record is not proxy dialogue and does not by
   itself change a personal stance.
8. **Conversation stays modal.** Player dialogue locks movement and camera on
   the interlocutor until it ends normally, pauses the world, and keeps
   generated reply suggestions plus bounded free text.
9. **Legibility contract.** Every off-screen social change reaches the player
   attributed — through conversation, overheard speech with direction-aware
   subtitles, or inspectable records — plus an open-questions/rumor-log
   surface. An unattributed silent state change is a defect, not depth.
10. **Scope floor and ceiling.** Permanently open building portals plus a few
    pick/move/throw props; no physical door interaction, inventory system,
    trespass, theft, combat, health, damage, or chase.
    Observed object handling may enter NPC factual memory but triggers no
    automatic reaction and cannot directly advance a vouch. Every visible
    building is enterable — park plus single-story studio reception, office,
    and Station — so building count stays minimal.
11. **The Store is retired.** The studio reception/approval procedure is the
    ordinary first location; no commerce systems.

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

Suspicion is social before it is institutional: an NPC notices, probes, speaks
to another NPC in an actual exchange, or writes an administrative record; only
then does the Station formalize. Personal stance moves through remembered
speech, while explicit records move factual and institutional state. Every
reaction the player encounters must be attributable in-world — subtitles,
reaction markers, records you can inspect, and an influence chain you can
trace. NPCs are agent loops
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
  boundary. (The 2026-07-11 first-person conversion consumed the M3-boundary
  budget by explicitly killing M3 first.)
- **No externally-owned gates.** Playtests inform; they never block a merge or
  a milestone.
- **No fidelity race.** "No 3D" was re-answered 2026-07-11 with new evidence:
  the owner played the finished 2D build and rejected its immersion, and now
  accepts visibly free low-quality assets. 3D is allowed as infrastructure
  for the NPC society — but visual quality is still never a gate, and asset
  polish never justifies a slice on its own.
- **No vendor lock in the AI layer.** Providers are profiles behind ports
  ([`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md)).
