# Environment-Agent Interface Benchmarks

Status: active research brief for Dream of One planning
Date: 2026-05-17
Focus: environment definition, agent affordance use, and tool-like NPC interfaces

## Research Question

Dream of One should not ask an LLM to improvise society from text alone. The
world should expose usable objects, records, procedures, permissions, and
consequences. Agents should perceive that world, choose from available actions,
and let runtime validation apply the result.

The benchmark question is:

```text
How do simulation games make an environment legible enough that autonomous
characters can choose useful actions without every outcome being hand-authored?
```

## External Cases

| Case | What the environment defines | How agents use it | Dream of One takeaway |
|---|---|---|---|
| RimWorld work/bills | Work types, allowed areas, workstation bills, skill/material limits, stockpile destinations. | Pawns take jobs they are assigned and capable of doing; bills are attempted in order and skipped if materials, skill, worker, or suspension conditions fail. | Store/Station records should behave like bills: role-qualified, ordered, skippable, and visibly blocked when preconditions fail. |
| Dwarf Fortress labor/work orders | Designations, zones, workshop tasks, manager orders, labors, work details, specialization. | Idle dwarves take jobs only if the relevant labor/permission path allows it. | Dream agents need labor-like authority: clerk can mark receipts, manager can forward reports, Station can cite dossiers. |
| Oxygen Not Included errands | Errand categories, building sub-priority, personal priorities, needs, schedules. | Duplicants choose available errands by personal priority, object priority, and urgent needs. | Agent selection should combine role priority with local pressure: queue delay, record burden, Station attention, trust loss. |
| Prison Architect logistics | Rooms, canteen/laundry distribution, regime time blocks, prisoner labor qualifications. | Staff/prisoners work through room assignments, time windows, qualification gates, and distribution links. | Store/Station should use room and procedure gates: who is on duty, what phase this is, which record path is open. |
| The Sims / smart objects | Objects advertise interactions, ownership, priority, expected state, animation, and role eligibility. | Agents scan surroundings and pick an object whose advertised behavior fits their goal. | Record props should expose actions as tool descriptors; NPCs should not invent actions outside the object list. |
| Immersive sim level systems | Consistent systems, consequences, AI perception, alarms, bodies, doors, vents, physics, faction reactions. | Player and NPC actions create persistent consequences that other systems can notice later. | Speech records should be persistent civic objects that other agents can cite, not transient dialogue flags. |
| GOAP + emergent narrative prototypes | Goals, action planning, schedules, smart objects, storyteller pressure. | Agents select goals, plan through available actions, then re-plan as the environment changes. | Dream can use event-driven planning ticks after speech, record mutation, burden thresholds, and Station intake. |

## Source Notes

- [RimWorld Work](https://rimworldwiki.com/index.php?title=Work) describes
  work assignment, allowed areas, direct right-click prioritization, and queued
  jobs.
- [RimWorld Bill](https://rimworldwiki.com/wiki/Bill) shows a strong object
  interface pattern: a workstation bill declares required work, worker/material
  filters, order, repetitions, destinations, and skip conditions.
- [Dwarf Fortress Labor](https://dwarffortresswiki.org/Labor) describes jobs
  created by designations, zones, workshops, and manager work orders, then
  assigned to dwarves whose labors allow the job.
- [Oxygen Not Included Priority](https://oxygennotincluded.wiki.gg/wiki/Priority)
  describes personal task priorities, object sub-priority, disabled categories,
  and needs overriding normal work.
- [Prison Architect Logistics](https://prison-architect.fandom.com/wiki/Logistics)
  describes distribution links, food demand for regime windows, room labor, and
  qualification gates.
- [GameDev Pensieve Smart Objects](https://www.gamedevpensieve.com/ai/ai_knowledge/ai_knowledge_smart-objects)
  summarizes smart objects as environment-held behavior data with responsibility,
  ownership, dependency, priority, and expected state.
- [A Cognitivist Theory of Affordances for Games](https://dl.digra.org/index.php/dl/article/view/687)
  separates real affordances, perceived affordances, and feedback. Dream needs
  all three: what is possible, what agents/players can perceive, and what UI or
  world feedback advertises.
- [How Complex AI Can Promote Emergent Narrative](https://www.joeduffy.games/how-complex-ai-can-promote-emergent-narrative)
  connects GOAP, cyclic scheduling, smart objects, and centralized story pressure
  to emergent narrative prototypes.

## Pattern: Environment As Tool Catalog

Each usable environment object should publish action descriptors. The same data
should drive the player prompt, NPC tool list, backend validator, evidence log,
and comprehension proof.

```ts
type EnvironmentActionDescriptor = {
  actionId: string;
  objectId: string;
  objectState: string;
  verb: string;
  playerLabel: string;
  eligibleRoles: string[];
  authorityRequired: string[];
  preconditions: string[];
  requiredInputs: string[];
  visibleTo: string[];
  perceivedAs: string;
  priorityHints: string[];
  ledgerEventKind: string;
  civicEconomyEffects: string[];
  validationRuleId: string;
  failureReasons: string[];
  evidenceFields: string[];
};
```

This keeps the LLM/provider in the right place. It can choose and phrase an
action, but it cannot create new authority or mutate state without a validator.

## Dream Of One Interface Target

The M1 environment should expose a small tool catalog:

| Object | Player affordance | Agent affordance | Validator |
|---|---|---|---|
| `usual_order_board` | inspect expected routine | cite expected order | visible board, Store role, current procedure |
| `store_counter` | answer, correct, pause | ask follow-up, hold service | active service phase, player present |
| `receipt_tray` | inspect receipt | create receipt, mark receipt, attach correction | Store Clerk role, statement classification |
| `report_tray` | inspect pending report | place note, forward report | Store Manager role, burden threshold |
| `civic_ledger` | read visible entries | append accepted event, cite prior event | role authority, exact source record |
| `station_dossier` | inspect citation | cite Store record, open inquest, request correction | Station Officer role, forwarded report |
| `queue_mark` | wait, step forward | complain delay, witness mismatch | queue pressure, line-of-sight |

The UI should not be a separate design layer. It should show the same action
descriptors the agents use:

- focus prompt: object name, available player verbs;
- record panel: latest ledger event, actor role, validated action, why-line;
- agent debug/evidence view: perceived objects, candidate actions, chosen action,
  rejection reason if any;
- route result: exact cited record, civic economy deltas, Station authority.

## Agent Tick Contract

For each relevant event, run a bounded tick:

```text
event occurs
-> collect visible objects and records
-> build role-specific action descriptor list
-> score actions from role goals and civic pressure
-> provider may choose wording or select among allowed actions
-> backend validates the proposed action
-> world state, ledger, and economy update
-> nearby agents receive the new event on their next tick
```

Do not run a global constant LLM loop for M1. Use event-driven ticks after:

- player speech or typed input;
- receipt/correction/report mutation;
- queue delay or witness reaction;
- record burden threshold;
- Station report receipt;
- Station dossier citation.

## Better Interface Requirements

The interface has two audiences: player and agent.

| Audience | Needs to perceive | Must not perceive |
|---|---|---|
| Player | usable object, current procedure, latest record, who acted, why it matters | hidden validator internals or future route labels |
| Store Clerk | counter, player line, usual-order cue, receipt tray, local trust | Station-only hidden conclusions |
| Store Manager | report tray, queue pressure, receipt burden, clerk note | uncited private player intent |
| Waiting Customer | delay, public mismatch, visible clerk reaction | hidden ledger fields |
| Station Officer | forwarded report, dossier, citation target, legal threshold | invented Store events or provider-only claims |
| Provider/LLM | role, nearby objects, allowed action descriptors, recent ledger entries | direct write access to Evidence, Exposure, verdict, or session end |

This is the most important planning correction: a better interface is not a
prettier HUD alone. It is a shared affordance contract for players, NPCs,
provider calls, validators, and evidence.

## Implementation Slice

Keep the first implementation narrow:

1. Convert Store/Station object states into explicit action descriptors.
2. Store candidate action lists in evidence for each agent tick.
3. Make provider packets receive action descriptors instead of free-form action
   instructions.
4. Show the latest chosen descriptor in HUD/world record copy.
5. Add rejection reasons to evidence when a role cannot use an object.
6. Add one Waiting Customer tick only if queue pressure can be seen by the
   player and cited by Store Manager.

## Design Risks

| Risk | Bad version | Better version |
|---|---|---|
| LLM improvises society | Provider invents records and consequences. | Provider chooses among validated descriptors. |
| Hidden sim | Agents act but player cannot read why. | Every important action leaves a visible record or cited ledger line. |
| Overbroad economy | Full business management dilutes the premise. | Civic economy tracks trust, burden, attention, and account credit. |
| Fake autonomy | Branch table pretends to be agents. | Same object descriptors can be used by different roles with different goals. |
| Unbounded cost | Every NPC ticks constantly. | Only nearby, relevant agents tick on meaningful events. |

## Adoption Decision

Adopt this as the next Game Studio planning layer:

```text
Dream of One environments are authored as tool catalogs.
Agents are role-bound users of those tools.
The provider may help select and phrase actions.
The backend decides whether the action is valid and what it changes.
The player reads the result through records, citations, and visible civic pressure.
```

This keeps the game pointed at social simulation without turning it into a
branching dialogue tree or an unconstrained LLM chat demo.
