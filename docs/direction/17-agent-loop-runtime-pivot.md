# Agent Loop Runtime Pivot

Last updated: 2026-05-19

## Decision

Dream of One should pivot away from adding one authored social reaction after
another. That path is only a nicer version of scripted branching. It can prove a
chain, but it does not prove the game the creator wants: NPCs that receive
context, access to tools, and local goals, then iterate like a coding agent.

The intended social simulation model is closer to a constrained Claude Code
loop than to a fixed workflow:

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

The next runtime target is a tiny tool API, not a larger list of authored social
verbs.

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

## Cut Lines

Do not add the next feature as:

- another hardcoded `if Station citation then Park warning` style chain;
- another route-specific ledger order test;
- another HUD summary of existing facts;
- another provider proof where the model only phrases an already locked action;
- a broad generative-agent framework before one tiny loop works.

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
