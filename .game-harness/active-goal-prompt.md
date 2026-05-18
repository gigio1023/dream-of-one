# Active Goal Prompt

Last Updated: 2026-05-19
Status: replacement prompt for the active thread goal

## Replacement Goal

Build Dream of One toward a small, playable open-environment NPC social
simulation where conversation is the main player action and social consequence
starts from speech. Treat Store/Station and `Same Order` as ultra-small sample
cells only. They are not the game premise, not the product center, and not the
default lens for deciding future work. Keep them deliberately thin: enough to
prove a reusable pattern, never enough to become the game.

Permanent direction lock: `AGENT_LOOP_RUNTIME` is part of the game definition.
It is documented in `docs/direction/17-agent-loop-runtime-pivot.md` and must not
be treated as a one-off task note. Future agents should find this rule by
searching `NPC_TOOL_LOOP`, `NO_FIXED_SOCIAL_CHAINS`,
`PROGRAMMATIC_WORLD_AI_INTENT`, or `CLAUDE_CODE_STYLE_NPC`.

The game should not be treated as a generic LLM sandbox, a detective game, or a
document-only design exercise. The player is the person being examined.
Ordinary dialogue, hesitation, repair attempts, and typed statements become
records that NPCs, local institutions, or other authority systems can use
against the player.

The prototype target is an authored social environment that can stay extremely
simple while still being playable:

- readable places, props, and social cues;
- explicit environment affordances for each role;
- deterministic visibility rules that decide who can see which record or event;
- a toy economy that can be as crude as points, tokens, trust, burden,
  attention, favors, or a single shared counter;
- validation rules that accept or reject every role-agent action before any
  state changes.

Correction to the current build direction: do not keep extending the prototype
by adding one more fixed social reaction chain after another. That path is
still a scripted workflow. The intended model is closer to a constrained
Claude Code loop inside a game world: an NPC observes context, chooses a local
goal or next step, calls a small validated tool, reads the result, updates
memory or conversation state, and iterates until success, failure, interruption,
or budget end.

Role agents should behave through low-level world tools rather than through a
growing catalog of authored social outcomes. The runtime should expose tools
such as `move_to`, `look`, `talk_to`, `wait`, `inspect_record`, and `request`.
It should programmatically validate movement, reachability, dialogue locks,
busy/available state, object mutation, ownership/payment, memory writes,
Evidence, Exposure, inquest, verdict, safety, budget, and replay boundaries.
The NPC agent should increasingly decide what to try, what to say, whether to
wait, whether to ask another NPC, and how to react to a blocked result.

The provider may choose the next valid tool call, produce the utterance, and
summarize short memory within tight schemas. It must not invent tools, bypass
physics or dialogue locks, mutate records directly, decide risk tags, set
Exposure, create Evidence authority, open inquest, choose verdict, or end the
session. Deterministic authority remains the guardrail; the agent loop supplies
the flexible iteration.

Conversation remains the main player action. The player should read an NPC or
system prompt, choose one of three authored lines or submit optional typed text,
and then see how that text changes suspicion, records, relationships, tiny
economy values, authority attention, and outcome. The social simulation exists
to make those conversational consequences feel grounded in a place and in NPC
relationships. Store/Station should stay small enough to be replaced by another
environment later; it is a sample for affordances, not a content pillar.

Priority order matters. The first responsibility is to make the intended game
more coherent and playable in the running build: clearer social roles, stronger
environment affordances, readable consequences, and NPC actions that make the
player feel examined. Tests, Codex gameplay QA, session kits, and evidence
records are support systems. They should verify and preserve game progress, not
replace it. If planning or implementation has a missing piece, choose the
smallest playable result that fills that gap and run it before adding more
process.

Because this game is being built from the start with AI coding agents, the
runtime must keep a Codex-playable QA interface for the active proof cell. This
is a first-class product goal, not a convenience script and not a nice-to-have
test helper. Codex or a similar AI coding tool should be able to launch the
Godot scene, read the available player actions, choose bounded actions, submit
typed text, inspect the same HUD/world/ledger/NPC state a player sees, and
write a readable artifact from an actual play run. A player-facing feature is
not ready if it cannot be played, observed, and explained through that
interface. This does not replace human comprehension notes, but it is the
default development check: prefer fast play-based verification through the
running game over test code that only checks private implementation.

Treat that AI-play loop as an acceptance condition for every new playable
increment. If a change adds dialogue, state, props, role actions, economy
values, route outcomes, or player consequences, the same pass should expose
enough public action/snapshot/report data for Codex to operate the slice from a
player point of view. Do not let AI agents verify the game by reading private
methods and guessing intent. The intended workflow is: run the scene, inspect
callable player actions, act, read player-visible state, explain the result,
then update Evidence if the play run proves the slice. When time is limited,
choose the smallest running-game probe that lets Codex play and explain the
current slice before adding broader tests.

## Proof Target

The work is not complete until current evidence proves all of the following:

- The planning docs name the same game: an open-environment NPC social
  simulation where the current tiny sample proves a reusable chain of speech,
  record, role action, and consequence without making Store/Station the product
  frame.
- The authored environment map lists objects, affordances, roles, visibility,
  records, tiny economy effects, and validation rules for the current example
  cell.
- A narrow `agent_loop_probe_v0` exists before more authored social chains are
  added: one NPC, one other NPC, one object or record, five or fewer tools,
  three to six iterations, and a player/Codex-readable transcript showing the
  NPC observe, call tools, read results, and choose the next step from context.
- Backend tests prove role-scoped affordance discovery, action validation,
  ledger creation, tiny economy deltas, exact citation of prior records, and
  rejection of unavailable or hidden actions.
- Provider-shaped paths preserve backend-owned ledger and economy outcomes and
  cannot smuggle authority fields. If provider packets include actor memory or
  policy, current proof must show that `actorMemory` is bounded to own validated
  actions plus observed ledger events, and `actorPolicy` is bounded to stable
  goals, priority shifts, action-selection policy, and forbidden claims.
- Godot evidence shows the player can see the current example props, record
  states, latest ledger event, actor role, validated action, social pressure,
  and later citation.
- Codex gameplay QA can drive the active Godot proof cell through stable public
  action/snapshot APIs, read the action catalog, submit typed text, inspect
  player-visible state, and report whether the current build is playable and
  explainable from a player point of view.
- Each new playable increment keeps that Codex gameplay QA path current enough
  that an AI coding tool can verify the slice through actual play before a
  human is asked to judge comprehension.
- Route evidence covers at least one safe, one repair, one social-report, and
  one formal-escalation outcome from the same starting prompt set. In the
  current tiny example these are clean cover, repair recovery, soft report, and
  inquest, but future proof cells should reuse the pattern rather than the
  Store/Station content.
- Screenshots or contact sheets are fresh enough to prove readability for the current scene, HUD, record props, and outcome state.
- External or manual comprehension notes show that players understand they are being examined, can connect dialogue to records and consequences, and can identify which role used which validated action.

## Operating Rules

- Game improvement comes first. Verification work is justified when it protects
  a playable change, clarifies player-visible consequence, or prevents a known
  regression. Do not spend the next pass on more helper scaffolding when a small
  game design or implementation gap can be made playable instead.
- Do not choose a test/report/helper-only slice while a playable game increment
  or fresh-player session is the real next move. If no playable change is
  justified, keep the build ready and report the blocker instead of adding more
  automation.
- Treat Store/Station as a disposable sample of the wider design. Keep it
  small, legible, and cheap. Do not make the next decision from a desire to
  deepen Store operations, Station procedure, or simulator-management detail.
- Do not add another route-specific social consequence just because it is the
  next easy slice. If the work looks like `if prior record X then NPC Y posts,
  blocks, refuses, or cites Z`, stop and reframe it as generic tool access,
  observation, conversation availability, iteration state, or a tiny agent loop.
- When choosing work, start from the open-environment question: which small
  affordance, prop, record, NPC reaction, or toy economy value makes the social
  field more believable? Use Store/Station only if it is the cheapest disposable
  sample for that general pattern.
- Prefer small playable proof over broad content.
- Do not expand society, lore, or route count until the first environment cell is readable and replayable.
- Do not treat Store, Station, queue, receipt, or citation mechanics as the
  game premise. Treat them as tiny examples for proving social affordances,
  record pressure, and NPC-to-NPC consequences that can move to other
  environments.
- Work in short playable increments, but aim the next increments at reusable
  agent-loop mechanics: observation, movement, conversation availability,
  tool-call result handling, short memory, and player-readable loop transcript.
  Add authored social actions only when they are scaffolding for that generic
  loop, not as the main design method.
- Do not call tests or generated packets player comprehension.
- Do not call live provider behavior proven unless a budgeted live preflight succeeds.
- Keep deterministic backend authority stronger than provider output.
- Do not let provider memory or policy become hidden authority. Memory is
  observed context; policy is role guidance. Neither may invent affordances,
  records, private intent, Exposure, inquest, verdict, or session end.
- Keep language, UI, and evidence focused on what the player can see, infer, and explain.
- Maintain a stable AI-play interface for the active proof cell. In Godot, use
  public debug/action/snapshot APIs such as
  `PlayableSession.debug_codex_gameplay_action`,
  `debug_codex_gameplay_snapshot`, and the action catalog instead of reaching
  into private scene methods.
- When adding player-facing state, dialogue, props, consequences, or routes,
  expose enough of it through the action catalog/snapshot/report path for Codex
  to play the scene and explain the result without reading private code.
- If Codex cannot quickly answer "what can I do, what did I do, what changed,
  which role acted, and what can the player infer?" from the running build,
  fix the AI-play interface before expanding game scope.
- Prefer actual play-based Codex checks for game comprehension, flow, and
  player-visible consequence. Add test code only when it protects deterministic
  authority, schema compatibility, route evidence, provider boundaries, or a
  known regression.
- Keep tests lean and Detroit-style: protect the game consequence and contract,
  avoid mock-heavy implementation checks, and do not pad coverage for its own
  sake. Do not add tests for convenience reports, helper formatting, or process
  output unless that behavior gates live spend, deterministic authority, or a
  player-visible release claim.

## Practical Next Work

When choosing the next task, prefer the weakest missing proof in this order:

1. identify the smallest missing game improvement in the open-environment social
   simulation;
2. before adding another fixed social reaction, build the smallest playable
   agent-loop proof: one NPC uses generic tools over several iterations and
   reacts to tool results;
3. implement that improvement as a playable result, not just as a document or
   harness artifact;
4. prefer a neutral open-place interaction; keep Store/Station only when it is
   the cheapest disposable sample for the general pattern;
5. keep the Codex gameplay QA interface able to play, inspect, and explain the
   running proof cell before asking humans to judge it; if the interface cannot
   play the new slice, fix that before expanding scope;
6. run the packaged app with fresh testers using the blind playtest packet;
7. record direct tester notes in the external comprehension ledger;
8. decide M1 go/conditional/no-go from those notes and council review;
9. only pursue live provider work if it becomes part of the public promise;
10. only then broader content, extra roles, more locations, or deeper provider behavior.

When the next available work is only test hardening or process polish, do not
invent it as progress. Either make the smallest real playable change, run the
current playable/fresh-player path, or stop and report what human/game evidence
is blocking the goal.

## Long-Running Loop Rules

Use Ralph-style persistence only as a lightweight discipline, not as a new
framework. Before each resume or long autonomous pass, read
`.game-harness/goal-loop-state.md`, `.game-harness/continue-here.md`, and this
file, then pick the next smallest proof item.

Each pass should:

- restate the current blocker in one sentence;
- change only the smallest useful slice;
- run the narrowest real game/build check that can prove the slice;
- update `.game-harness/goal-loop-state.md` with status, evidence, blocker,
  and next action before stopping;
- continue only while there is a concrete next action that can improve playable
  proof without expanding scope.

Exit or pause when the next required evidence is outside Codex control. The
current hard gate is external fresh-player comprehension: no amount of internal
smoke, generated packet, screenshot, or Codex interpretation may count as that
evidence.
