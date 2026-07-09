# Broader Game Environment-Agent Patterns

Status: supplemental research brief
Date: 2026-05-17
Purpose: widen Dream of One's environment-first agentic simulation references
beyond management and colony simulators.

## Research Frame

The useful question is not "which game has smart NPCs?" It is:

```text
What does the game environment expose, and how do agents or systemic directors
use that exposed structure to choose actions in real time?
```

Dream of One needs the same discipline for conversation:

```text
Store/Station object state
-> visible affordances
-> role-qualified candidate actions
-> provider may choose or phrase one
-> validator accepts or rejects it
-> ledger, record, and civic pressure update
-> player can read what happened
```

## Broad Case Map

| Case | Environment design pattern | Agent/system use | Dream of One adoption |
|---|---|---|---|
| The Sims / smart objects | Objects advertise interactions, ownership, priority, expected state, and animations. | Sims scan nearby objects and choose actions that satisfy needs/goals. | Store/Station props should publish action descriptors. NPCs should choose from the prop, not invent verbs. |
| RimWorld / Dwarf Fortress / Oxygen Not Included | Work, bills, jobs, labors, errands, priorities, zones, schedules, and material gates. | Pawns/dwarves/duplicants pick valid jobs according to permissions, priorities, skills, and needs. | Dream roles need explicit authority and preconditions: clerk marks receipts, manager forwards reports, Station cites. |
| Hitman World of Assassination | Disguises, restricted areas, enforcers, illegal actions, evidence, routines, and accident setups. | NPCs react to trespass, suspicious behavior, compromised disguise, bodies, weapons, and role permissions. | Social normality should be a permission system. Speech, records, and procedure errors should work like trespass/evidence, not arbitrary dialogue outcomes. |
| Breath of the Wild / Tears of the Kingdom | Objects and elements follow consistent interaction rules: fire, water, electricity, wind, physics, fusion. | The game lets players and systems combine rules to make unexpected but readable outcomes. | Dream does not need physics complexity, but it needs "social chemistry": records, visibility, burden, and authority should combine consistently. |
| Metal Gear Solid V | Bases, weather, day/night, patrol routes, gear, radar, landing zones, and enemy adaptation. | Enemy forces change equipment and awareness based on repeated player tactics; environment changes affect infiltration options. | NPC/Station behavior can adapt to repeated player speech patterns, but adaptation must be ledger-backed and visible. |
| F.E.A.R. GOAP | Goals and reusable actions are planned dynamically instead of hard-scripted as one-off branches. | NPCs plan through modular actions and can handle unexpected combat situations. | Role agents should pick from reusable Store/Station actions with runtime validation and cached costs, not bespoke branches. |
| Left 4 Dead AI Director | The level and player state feed a pacing system that controls enemy/item placement and intensity. | A director monitors player stress and shapes peaks/valleys without scripting each fight. | Dream can eventually use a social director for pacing, but it must not override record truth or validation. |
| Watch Dogs: Legion Census | NPCs have generated identities, relationships, jobs, schedules, and persistence. | The world can recruit, profile, and follow citizens through routines and relationships. | Useful for role/world context, but too broad for M1. Use only a tiny persistent relation graph: clerk, manager, customer, Station. |
| Shadows of Doubt | A procedural city has citizens with routines, homes, workplaces, evidence, and crimes that play out. | Cases emerge from simulated citizens moving through places and leaving evidence. | Strong warning and inspiration: records must be real game objects. Also, unbounded routines create jank unless bottlenecks are designed. |
| Red Dead Redemption 2 camp | Camp members have routines, chores, moods, and conversations that bridge cutscene and gameplay personality. | The camp feels alive because characters keep consistent behavior and can invite player response over time. | Dream should keep a small cast consistent across interactions; repeated records should affect how agents address the player. |
| Bethesda Radiant AI / schedules | NPCs use schedules, packages, and environment interactions to appear to have daily lives. | The world feels less static, but broad autonomy can become fragile or goofy. | Use schedules only where they support procedure: Store shift, queue phase, report handoff, Station intake. |
| Immersive sims generally | Levels are built from consistent permissions, hazards, routes, tools, AI perception, alarms, and consequences. | Players and NPC systems create outcomes from the same rules. | Dream's conversation must sit inside a readable system of access, evidence, citation, and consequence. |

## Source Notes

- [GameDev Pensieve: Smart Objects](https://www.gamedevpensieve.com/ai/ai_knowledge/ai_knowledge_smart-objects)
  summarizes object-held behavior data: responsibility, ownership, dependency,
  priority, and expected state.
- [RimWorld Bill](https://rimworldwiki.com/wiki/Bill), [Dwarf Fortress Labor](https://dwarffortresswiki.org/Labor),
  and [Oxygen Not Included Priority](https://oxygennotincluded.wiki.gg/wiki/Priority)
  show work/errand systems where agents choose valid jobs through permissions,
  priority, materials, and needs.
- [Hitman 2016 gameplay summary](https://en.wikipedia.org/wiki/Hitman_%282016_video_game%29)
  describes sandbox levels, disguises, enforcers, routines, suspicious actions,
  restricted areas, evidence, and alert phases.
- [Breath of the Wild GDC coverage](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/?mobile-app=true&theme=wiki)
  describes Nintendo's chemistry-engine framing: elements change material
  states, elements change each other, and readable rule combinations let players
  discover solutions.
- [Metal Gear Solid V overview](https://en.wikipedia.org/wiki/Metal_Gear_Solid_V%3A_The_Phantom_Pain)
  describes open-world stealth, base-building, Fulton recovery, day/night,
  weather, patrol analysis, enemy adaptation, and environmental changes like
  sabotaged radar affecting landing options.
- [Jeff Orkin's F.E.A.R. planning paper](https://ojs.aaai.org/index.php/AIIDE/article/view/18724)
  argues real-time planning helps NPCs handle unexpected situations and reuse
  modular goals/actions, with CPU and architecture constraints.
- [Valve Developer Community: Left 4 Dead Design Theory](https://developer.valvesoftware.com/wiki/Left_4_Dead_Design_Theory)
  describes the AI Director as a pacing system that collects player state and
  determines enemy and item placement. If the page is blocked, the same point is
  reflected in the in-game developer commentary summaries.
- [Ubisoft: Watch Dogs Legion tools](https://news.ubisoft.com/en-us/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london)
  describes Census as generating characters with profiles, schedules,
  relationships, persistence, and role consistency.
- [PC Gamer on Shadows of Doubt procedural narratives](https://www.pcgamer.com/games/adventure/the-worlds-busiest-toilet-temporarily-made-detective-sim-shadows-of-doubt-a-murder-free-zone-you-cant-always-legislate-for-the-fact-that-everyones-going-to-need-a-wee-at-midnight/)
  gives a concrete example of citizen routines and environment bottlenecks
  changing whether crimes can occur.
- [Red Dead Redemption 2 development overview](https://en.wikipedia.org/wiki/Development_of_Red_Dead_Redemption_2)
  describes camp routines, chores, moods, and conversations as a way to make the
  player feel they inhabit a living world.

## Pattern 1: Permissions Make Behavior Legible

Hitman, immersive sims, RimWorld, and Dwarf Fortress all rely on permission
layers:

- who can enter;
- who can touch an object;
- who can use a role-specific action;
- who can see a violation;
- what evidence remains;
- who is allowed to respond.

Dream equivalent:

```text
Store Clerk may create/mark/repair receipt.
Store Manager may place/forward report.
Waiting Customer may observe delay or complain.
Station Officer may cite only known Store records.
Provider may choose wording but not authority.
```

This is more useful than writing many reaction branches. A role can react
differently because the available permissions changed.

## Pattern 2: Environment State Should Be Queryable

Good systemic games let AI query local state:

- object current state;
- owner;
- visibility;
- priority;
- route/path availability;
- schedule phase;
- current pressure or need;
- recent events.

Dream's Store/Station environment should expose the same shape:

```text
objectId
objectState
visibleTo
eligibleRoles
availableAffordances
ledgerEventKind
civicEconomyEffects
validationRuleId
failureReasons
```

That is the shared contract for player UI, NPC decisions, provider calls, and
evidence.

## Pattern 3: Adaptation Must Be Record-Backed

MGS V adapts enemy equipment to repeated player tactics. Hitman changes alert
state when the player is seen, trespasses, or leaves evidence. L4D changes
intensity based on current player state.

Dream can adapt socially, but only from records:

- repeated evasive wording lowers `local_trust`;
- repeated correction requests increase `record_burden`;
- forwarded reports increase `station_attention`;
- a cited Store record changes Station question shape;
- a visible queue delay changes customer/manager priority.

Do not adapt from hidden model vibes. If the game changes tone, the ledger must
explain why.

## Pattern 4: Broad Simulation Needs Hard Boundaries

Watch Dogs Legion, Shadows of Doubt, Radiant AI, and A-Life-style systems are
tempting because they promise a living world. Their lesson for Dream is mostly
scope control:

- persistent identities are valuable;
- schedules help the world feel less staged;
- evidence trails are powerful;
- unbounded background routines create bugs, cost, and confusing outcomes;
- simulation needs authored bottlenecks or the player cannot read causality.

M1 should not simulate a whole city. It should simulate one procedure well.

```text
Store procedure
-> Store record
-> Store-side reaction
-> Station citation
```

## Pattern 5: A Director Can Shape Pacing, Not Truth

L4D's Director is relevant because it separates pacing from local enemy AI. For
Dream, a future "social director" could decide when to introduce pressure:

- queue delay;
- witness attention;
- manager arrival;
- Station callback;
- silence after a risky answer;
- follow-up question.

But the director must not decide:

- whether Evidence exists;
- whether a record is valid;
- whether Station can cite a record;
- whether verdict/session termination happens.

Those belong to deterministic validation.

## Dream Of One Adoption Rules

1. Author objects as tool catalogs, not scenery.
2. Give every role a filtered action list from the environment.
3. Treat speech as an action against a procedure and record, not a free chat.
4. Keep provider calls inside the descriptor list.
5. Leave visible records after important actions.
6. Use civic economy as pressure, not as a full business sim.
7. Let one or two agents react to changed records before adding more agents.
8. Add pacing only after cause and effect is readable.

## M1 Implementation Implication

The next prototype improvement should not be "more NPC dialogue." It should be:

```text
action descriptor evidence for every role-agent tick
-> provider packet receives the same descriptors
-> HUD/world props show the chosen descriptor result
-> rejection reasons are logged when a role cannot use an object
-> comprehension asks whether players can name role + validated action + record
```

This is the smallest step that makes the game closer to broad systemic game
craft while staying faithful to the conversation-centered premise.
