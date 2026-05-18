# Environment-First Agentic Social Simulation Model

Status: active direction addendum
Date: 2026-05-15
Depends on:

- `docs/direction/13-operation-sim-quality-floor.md`
- `docs/direction/14-minimal-civic-economy-model.md`
- `docs/research/simulator-benchmarks/2026-05-17/00-environment-agent-interface-benchmarks.md`
- `docs/research/simulator-benchmarks/2026-05-17/01-broader-game-environment-agent-patterns.md`
- `docs/research/simulator-benchmarks/2026-05-18/00-llm-npc-tool-catalog-research.md`
- `docs/scenario/content/social-simulation-cards.md`
- `docs/direction/17-agent-loop-runtime-pivot.md`

## Decision

Dream of One should treat society as an environment-first agentic simulation.

The designer should not author every social reaction as a branch. The designer
defines a world that has places, procedures, records, affordances, economic
pressure, visibility, and authority. Social agents then observe that world and
choose how to act inside it.

2026-05-19 direction lock: this means more than "choose from a longer action
catalog." The game must move toward `AGENT_LOOP_RUNTIME`: NPCs iterate through
small tools, tool results, conversation state, and memory. A larger list of
hardcoded social reactions is still scripted branching.

```text
environment state
-> agent perception
-> local goal or next-step selection
-> tool discovery
-> tool call proposal
-> runtime validation and tool result
-> memory/conversation update
-> next iteration or stop
```

The game is not an if/else script. It is a constrained social sandbox where
agents can use world tools freely, while the runtime keeps facts, records,
and verdict authority deterministic.

## What The Designer Defines

The designer defines the social physics, not every event.

| Layer | What to define | What not to define |
|---|---|---|
| Place | Store counter, queue, report tray, Station desk, sightlines, access rules | every possible conversation outcome. |
| Procedure | what normal operation means here | every sentence an NPC may say. |
| Affordances | inspect, speak, wait, move, mark, carry, file, cite, correct, refuse | one-off bespoke action for every branch. |
| Records | receipt, correction, note, report, dossier, citation | hidden facts that cannot be cited. |
| Economy | trust, burden, attention, account credit | full business-management spreadsheet. |
| Authority | who may touch which records and under what conditions | NPC omniscience or free state mutation. |
| Visibility | who can see, hear, remember, or later learn an event | global knowledge shared by everyone. |
| Consequence law | what validators accept, reject, or escalate | provider-owned verdicts. |

The player's job is to disturb or preserve this world through ordinary action.
The agents' job is to keep their part of society working.

## What A Social Agent Is

A social agent is a role-bound actor operating in an authored environment.

| Field | Purpose |
|---|---|
| `role` | social function: clerk, manager, customer, officer, witness. |
| `home_setting` | where the agent belongs and which procedure they understand. |
| `goals` | what the agent wants to keep true: service speed, clean ledger, low burden, authority. |
| `needs` | pressure that changes priorities: delay, audit risk, contradiction, trust loss. |
| `perception_scope` | what the agent can currently see, hear, inspect, or learn from records. |
| `memory` | private observations, recent exchanges, and trusted records. |
| `social_graph` | who the agent knows, trusts, serves, fears, or reports to. |
| `authority_bounds` | which state changes the runtime may accept from this agent. |
| `affordance_policy` | how the agent chooses from available environmental actions. |
| `forbidden_claims` | facts or outcomes the agent cannot invent. |

The important shift: the agent does not own a hardcoded scene branch. The agent
owns a role, perception, goals, and a way to choose from available affordances.

Stronger rule: the agent should not merely choose the next item in a
route-specific action list. It should run a small loop over context and tools:
look, move, talk, wait, request, inspect, read result, then choose the next
step. This is the `CLAUDE_CODE_STYLE_NPC` target for Dream of One.

## Environment Affordances

Affordances are exposed by the world, not invented by the agent.

Examples:

| Environment object or state | Affordances it may expose |
|---|---|
| queue mark | wait, observe queue, complain about delay, leave queue. |
| Store counter | speak, serve, pause service, ask for correction. |
| usual-order board | inspect, cite expected order, compare statement. |
| receipt tray | create receipt, mark receipt, attach correction, inspect record. |
| report tray | place note, inspect pending report, forward report. |
| Station desk | open intake, cite dossier, request correction, close intake. |
| civic ledger | read permitted entries, append validated event, cite exact prior record. |
| account/trust/burden values | change priority, tone, route pressure, and escalation likelihood. |

An agent can combine these in different ways. For example, a clerk with a dirty
receipt and rising queue pressure might offer correction, pause service, or ask
the manager for help. The designer does not need to pre-write all three as
separate story branches; the environment makes them possible.

## Environment As Tool Catalog

External game references point to the same implementation lesson: RimWorld work
bills, Dwarf Fortress labors, Oxygen Not Included errands, Prison Architect
logistics, Sims-style smart objects, Hitman permissions, Breath of the Wild
rule chemistry, F.E.A.R. planning, Left 4 Dead pacing, Watch Dogs Legion
schedules, and Shadows of Doubt evidence routines all make autonomous behavior
practical by putting actionable structure in the environment.

Dream should follow that pattern. Each important object should publish action
descriptors that can be read by:

- the player prompt;
- the role-agent candidate-action list;
- provider dispatch packets;
- backend validation;
- evidence logs;
- comprehension and visual proof.

Minimum descriptor fields:

| Field | Purpose |
|---|---|
| `actionId` | stable action identity for logs and provider packets. |
| `objectId` / `objectState` | where the action comes from and when it exists. |
| `eligibleRoles` | which actors may even consider the action. |
| `preconditions` | local state, visible records, or procedure phase required. |
| `visibleTo` | who can perceive the action before or after it happens. |
| `ledgerEventKind` | what citable civic event the action creates. |
| `civicEconomyEffects` | trust, burden, attention, or account changes. |
| `validationRuleId` | runtime authority that accepts or rejects the proposal. |
| `failureReasons` | player/agent-readable reason when use is blocked. |

This is the core interface: agents do not receive a blank instruction to
"react." They receive a role-filtered list of usable environment tools and the
results of previous tool calls.

## Tool Catalog, Not Choice Consequences

The correction from the 2026-05-18 research pass is strict:

- dialogue choices are player speech inputs, not NPC action definitions;
- the environment defines tool descriptors;
- the NPC/LLM agent chooses among currently available tools;
- deterministic runtime validation owns whether the proposed tool call is
  accepted, rejected, ledgered, or escalated.

Do not attach result cues such as "this choice creates a report" to individual
dialogue options. The player should be able to read what the place can do:
which objects exist, which roles can act on them, which records can be created,
and which validators can reject an action. The NPC then decides whether to
create a normal receipt, mark it, offer correction, place a note, pause service,
cite a record, or do nothing based on perception, goals, memory, pressure, and
the role-filtered tool catalog.

```text
player speech / delay / movement
-> environment state and observations change
-> role agent receives perception + tool catalog
-> role agent proposes one actionId with a why-line
-> runtime validates object state, role authority, visibility, economy, ledger
-> accepted action mutates world/ledger; rejected action returns feedback
```

This keeps LLM agency in the right place. The provider may rank, choose, or word
a bounded action, but it may not author the world rule that makes the action
possible.

## Agent Tick

Each social agent runs an event-driven loop after relevant changes:

```text
Perceive local world
-> update private memory
-> choose short-term goal
-> list available affordances
-> propose one tool call
-> runtime validates and returns a result
-> decide whether to continue, wait, retry, ask, or stop
```

Ticks should be event-driven for M1:

- player speaks;
- a record changes;
- burden crosses a threshold;
- a queue delay appears;
- Station receives a report;
- another nearby actor acts.

Do not run every citizen as a constant background LLM process in M1.

For the next implementation, do not add another bespoke reaction chain. Build
`agent_loop_probe_v0` and prove three to six observe/tool/result iterations in
the running scene.

## Runtime Validation

Agent freedom stops at validation.

Runtime rejects actions that:

- require unavailable affordances;
- exceed role authority;
- use facts outside perception or memory;
- mutate records without a trace;
- violate deterministic thresholds;
- invent hidden social facts;
- decide Evidence, Exposure, inquest, verdict, or session end through prose.

This is the line between simulation and chaos. Agents may surprise the player,
but they cannot rewrite product truth.

## Civic Economy As Social Physics

The minimal economy is not mainly a HUD. It is the pressure field that agents
react to.

This pressure field must grow from small playable loops, not from a complete
spreadsheet designed up front. For any new economy variable, define only one
source, one visible pool, one role decision, one sink or transform, and one
player-readable consequence.

Do not pre-author a broad pressure taxonomy. In this project, an economy value
is valid only when it makes one role-agent choice clearer in the current
build. Start with record burden and repair because those directly explain why a
Store-side actor or Station actor cares about the player's line.

| Economy state | How it changes agent behavior |
|---|---|
| `account_credit` low | service becomes formal or blocked. |
| `local_trust` low | agents ask narrower questions and rely on records. |
| `record_burden` high | managers/officers prioritize cleanup or escalation. |
| `station_attention` high | Station actors seek exact citations and correction opportunities. |

This lets society act without manually scripting every reaction. The world has
pressure; agents have roles; the runtime validates what they can do.

Until the current Store/Station cell is externally understood, do not add
market prices, wages, rent, inventory throughput, staff schedules, or multiple
shops. Those systems are later tools, not the current game purpose.

Next economy-facing agent test should be:

```text
dirty receipt or delayed statement
-> correction slip becomes available
-> Clerk/Manager chooses keep_local or forward_report
-> runtime validates the action
-> HUD/outcome explains whether the burden was capped or became citable
```

This is deliberately smaller than a full social economy. It gives agents one
usable environmental tool and gives the player one readable consequence.

## Provider/LLM Placement

Implementation contract: see
[`docs/agent-search-index.md`](../agent-search-index.md) and
[`docs/development/ai-provider-runtime.md`](../development/ai-provider-runtime.md).
The first live implementation is the direct `openai-codex` provider. It is not
`codex exec`, not Codex CLI login, and not a replacement for runtime validation.

Allowed provider jobs:

- propose the next valid tool call from the current tool schema;
- choose among currently available affordances;
- choose one validated environment tool from the role-filtered tool catalog;
- explain the chosen action in role voice;
- generate in-character wording for an approved intent;
- summarize memory into a compact note;
- generate cached ambient NPC-NPC chatter from ledger context;
- vary tone through preoccupations and drama pacing.

Rejected provider jobs:

- create new affordances;
- bypass a blocked tool result;
- invent records or hidden facts;
- mutate ledger without validation;
- make agents omniscient;
- decide suspicion thresholds;
- decide Evidence, Exposure, inquest, verdict, or session end;
- override deterministic fallback.

Provider output should feel like agency. Runtime validation should preserve
truth.

## M1 Proof Shape

M1 should prove a tiny environment, not a full society.

Required environment:

- Store counter;
- queue or public-waiting context;
- usual-order cue;
- receipt/correction/report record path;
- Station desk or dossier;
- civic ledger with trust/burden/attention effects.

Required agents:

- Store Clerk;
- one Store-side social actor, such as Manager or Waiting Customer;
- Station Officer.

The proof is not that they follow one exact branch. The proof is that they can
react to the same environment through validated affordance use.

Minimum acceptable proof:

```text
player line changes Store state
-> Clerk chooses an environment affordance
-> runtime validates and writes ledger event
-> another Store-side actor reacts to visible burden or queue pressure
-> Station later cites the ledger event
```

## What To Author Next

Author these, in this order:

1. Environment affordance map.
2. Record and ledger schema.
3. Actor role cards with goals, perception, memory, and authority bounds.
4. Validator rules.
5. Deterministic fallback policies.
6. Provider prompt shape for affordance choice and wording.
7. Playable proof with screenshots, ledger replay, and comprehension notes.

Do not author a giant reaction table.

## Cut Rules

Do not build these before M1 environment-agent proof:

- full offscreen town simulation;
- every NPC as always-on LLM;
- unrestricted tool calling;
- unlimited long-term memory;
- provider-owned social facts;
- broad economic management;
- emergent verdicts.

Allowed now:

- one small environment;
- 2-3 role agents;
- event-driven ticks;
- affordance discovery;
- deterministic validators;
- exact ledger replay;
- provider-off fallback;
- provider-on wording or action proposal only after fallback proof.

## Director Verdict

| Question | Verdict |
|---|---|
| Should Dream of One define society through environment plus agent use? | `READY` |
| Should the team author every NPC reaction directly? | `NO` |
| Should M1 prove a full autonomous town? | `NOT_READY` |
| Should M1 prove one small affordance-rich environment with 2-3 agents? | `READY_WITH_CONCERNS` |
| Should provider output own world truth? | `NO` |
