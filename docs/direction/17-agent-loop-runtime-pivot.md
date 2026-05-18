# Agent Loop Runtime Doctrine

Last updated: 2026-05-19
Status: direction lock, not a temporary task note
Search tokens: `AGENT_LOOP_RUNTIME`, `NPC_TOOL_LOOP`,
`NO_FIXED_SOCIAL_CHAINS`, `PROGRAMMATIC_WORLD_AI_INTENT`,
`CLAUDE_CODE_STYLE_NPC`.

## Doctrine

Dream of One is not trying to become a bigger table of authored social
reactions. It is trying to become a small world where NPCs can use context,
tools, and conversation over several iterations.

This is a core game philosophy. Treat it as part of the game definition, not as
a temporary goal-loop instruction.

The design target is closer to a constrained Claude Code loop than to a fixed
workflow. Older LLM workflows often failed because requirements had to be
pre-baked into a rigid chain. Claude Code feels different because the agent is
given context, permissions, tools, feedback, and a goal, then it loops: it
observes, chooses, acts, reads the result, and acts again. Dream of One's NPCs
should move toward that structure inside a game world.

Adding one authored reaction after another, such as "if Station citation then
Park warning," may be useful as throwaway scaffolding, but it is not the game.
If future work keeps adding those chains as the main method, the project is
drifting away from the intended design.

The target loop is:

```text
observe world
choose a goal or next step
call one small tool
read the result
update memory or conversation state
repeat until done, blocked, interrupted, or budgeted out
```

The game should author the world, tools, permissions, safety rails, and evidence
contracts. The NPC agent should decide what to try, what to say, when to wait,
when to ask, and when to stop.

## Permanent Design Split

The game owns the world. The agent owns the attempt.

| Layer | Must be authored/programmatic | Should be agentic |
| --- | --- | --- |
| Space | positions, reachability, movement result, interaction distance | where to go and why |
| Attention | visibility, hearing, focus, known records | what seems relevant now |
| Conversation | turn locks, busy state, safety, timeout | what to say, whether to wait or rephrase |
| Objects | tool schemas, preconditions, ownership, mutation rules | which tool to try next |
| Memory | what can be written, recalled, cited, or forgotten | what short note matters next |
| Authority | Evidence, Exposure, inquest, verdict, session end | never agent-owned |

This split is the main architecture. Do not replace it with either extreme:

- not a blank chatbot that can do anything;
- not an if/else society where every social result is pre-authored.

## What Must Stay Programmatic

These are engine/runtime responsibilities. They should not be improvised by the
LLM:

- movement, position, reachability, collision, and interaction distance;
- whether an NPC is already talking, busy, blocked, waiting, or available;
- tool schemas, cooldowns, costs, permissions, and preconditions;
- inventory, ownership, payment, handoff, and object state mutation;
- dialogue session locks, turn ownership, interruption, and timeout;
- memory writes, ledger writes, Evidence semantics, Exposure, inquest, verdict,
  and session termination;
- budget, provider timeout, fallback, content safety, and replay boundaries.

## What The Agent Should Decide

These should not be hardcoded as one-off branches whenever possible:

- which nearby actor or object matters next;
- whether to move, wait, speak, inspect, request, trade, help, refuse, report, or
  ask a follow-up;
- what to say, within role and safety constraints;
- whether a response is enough or another iteration is needed;
- whether a blocked tool result means retry, ask someone else, wait, or abandon;
- what short memory note should carry into the next tick.

## Tool Layer, Not Social-Action Catalog

The runtime target is a tiny tool API, not a larger list of authored social
verbs. The tool result is programmatic; the reason to use the tool and the next
attempt after seeing the result are agentic.

MVP tool set:

| Tool | Programmatic guarantee | Agent freedom |
| --- | --- | --- |
| `move_to(target)` | navigation and arrival/failure result | why to go there |
| `look(target)` | returns visible objects, actors, state, and affordances | what seems relevant |
| `talk_to(actor, utterance)` | checks availability, distance, turn lock, safety | what to say |
| `wait(duration, reason)` | advances time within budget | whether waiting is better than acting |
| `inspect_record(target)` | returns ledger/object facts the actor can access | how to interpret them |
| `request(actor, topic_or_item)` | opens a bounded social request | what the NPC wants |

The first prototype does not need pathfinding sophistication, trading systems,
or complex inventory. It needs one room, two NPCs, one desire, one object or
record, and enough tool results for the NPC to loop.

## Provider Placement

Current checked-in provider proof is still mostly wording/proposal work. That
was acceptable for earlier proof cells, but it is not the final AI premise.

Future provider work should move toward this shape:

```text
agent context + visible tools + recent tool results + short memory
-> model proposes one next tool call and one utterance or reason
-> runtime validates schema, permissions, distance, turn locks, object state,
   record access, budget, and safety
-> world returns a structured result
-> model gets the result on the next iteration
```

The provider may propose a tool call only when that tool exists in the runtime
tool schema. It never mutates game state directly.

## First Narrow Prototype

Build an `agent_loop_probe` proof before adding more scripted social chains.

Scenario:

- NPC A starts at point A with a simple goal such as "get a permitted item" or
  "resolve a missing receipt".
- NPC A can use `move_to`, `look`, `talk_to`, `wait`, and `request`.
- NPC B may be busy, available, refusing, or willing to answer.
- NPC A must iterate: move, observe, attempt conversation, handle busy/refusal,
  wait or rephrase, then finish with success or a clear blocker.
- The player can watch or inspect the short loop transcript in the running game.

Success is not a clever story. Success is proving that the NPC did not follow a
fixed authored chain. It used generic tools, read results, and made the next
choice from context.

Minimal example:

```text
NPC A wants a permitted item or answer.
A looks around.
A moves near NPC B.
A tries to talk.
B is busy or unavailable.
A waits or asks a shorter question.
B answers or refuses.
A decides whether to request, stop, or record a blocker.
The player/Codex can inspect the transcript.
```

The content can be mundane. The architecture is the point.

## Cut Lines

Do not add the next feature as:

- another hardcoded `if Station citation then Park warning` style chain;
- another route-specific ledger order test;
- another HUD summary of existing facts;
- another provider proof where the model only phrases an already locked action;
- a broad generative-agent framework before one tiny loop works.

Also reject tasks framed as:

- "add the next NPC reaction";
- "add one more ledger chain";
- "make another role read the previous record and respond";
- "prove one more route-specific social consequence";
- "increase explainability count" without a new agent loop behavior.

Provider output may still be bounded, but the boundary should move from
"choose one authored social action" toward "choose the next valid tool call and
utterance inside a small world."

## Required Next Work

The next implementation slice should be:

```text
agent_loop_probe_v0:
one NPC, one other NPC, one object/record, five or fewer tools, three to six
iterations, visible transcript, deterministic tool validation, no new authored
social chain.
```

Verification should prove:

- the NPC took at least two different tool calls based on observed results;
- one tool call can fail or block, and the NPC chooses a reasonable next step;
- another NPC can accept or reject conversation based on programmatic dialogue
  state;
- the final result is visible to the player/Codex through the running scene;
- tests stay minimal and protect the public behavior or deterministic tool
  boundary only.
