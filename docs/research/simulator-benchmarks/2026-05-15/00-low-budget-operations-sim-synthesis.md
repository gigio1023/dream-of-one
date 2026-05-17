# Low-Budget Operations Simulator Synthesis

Status: synthesis for active direction adoption
Date: 2026-05-15

## Executive Verdict

The useful benchmark is not "make Dream of One like a motel game." The useful
benchmark is:

```text
Even cheap operation simulators are not mostly ideas.
They are bundles of small, repeated, player-visible work loops.
```

These games can look generic and still feel like complete products because they
usually provide:

- a first-person workplace;
- objects that can be bought, placed, used, cleaned, stocked, repaired, or read;
- NPC customers who enter, wait, request, pay, review, or complain;
- a day/session rhythm;
- money, reputation, reviews, star rating, or debt pressure;
- staff delegation after the solo workload becomes too large;
- expansion/unlock goals;
- save/load and achievement-sized proof of progress.

Dream of One currently has stronger deterministic authority than these games,
but it has a thinner visible workplace loop. The next planning target should be
to give Same Order the minimum tangible loop that even a cheap operation sim
would have.

The user's correction is important: Dream also needs a small economy model,
because economy is how these games define society. The M1 answer is not a full
profit-and-loss simulator. It is a civic ledger: normal transactions, receipts,
corrections, report burden, and Station audit.

## Product Floor Found In Benchmarks

| Layer | What cheap operation sims usually ship | Dream of One equivalent |
|---|---|---|
| Workplace | motel, cafe, store, gas station, kitchen, internet cafe | Store and Station as small civic workplaces. |
| Primary verb | serve, stock, clean, repair, check in, cook, scan, fuel, place object | answer, correct, accept record, watch report handoff, reconcile statement. |
| Objects | rooms, shelves, registers, products, fuel pumps, computers, kitchen gear | queue mark, usual-order board, receipt tray, correction slip, report tray, Station dossier. |
| NPC flow | customers arrive, wait, request, pay, leave, review | clerk expects normality; witness/manager/Station receives a record. |
| Economy | cash, prices, rent, debt, profit, review score | cover stability, report weight, Exposure, record consistency. |
| Staff | cashier, janitor, chef, guard, receptionist, delivery worker | clerk, witness, manager, Station officer with narrow noticing roles. |
| Expansion | more rooms, shelves, services, staff, recipes, products | more procedure locations only after Store-to-Station proof passes. |
| Feedback | HUD, prompts, meters, reviews, achievements, customer reactions | exact why-line, visible record, route outcome, Station citation. |
| Proof | achievements, completed quests, unlocked rooms/businesses | route evidence JSON, screenshots, comprehension note, provider-off parity. |

## Common UI/UX Shape

The repeated UI pattern is simple and learnable:

- first-person crosshair or focus target;
- short interaction prompt near the object;
- compact money/time/reputation/status HUD;
- task list or quest prompt;
- modal management screens for shop, stock, staff, build, upgrades, prices;
- item highlight/outline;
- bottom quick slots or held-object indicator;
- customer queue or request bubbles;
- transaction confirmation;
- review/result summary after service or day end.

This is why many low-budget simulators feel similar. They are often solving the
same player problem: "What object can I use, what does the customer need, what
state changed, and what should I do next?"

Dream of One should use the same clarity, but not the same fantasy. The player
should always understand:

```text
What local procedure am I in?
What did I say?
Who noticed?
What record exists now?
What will the Station compare later?
```

## What Arctic Motel Simulator Reveals

Arctic Motel Simulator is useful because its Steam page and achievements expose
the production pattern clearly.

Observed features from public sources:

- motel territory expansion, rooms, stores, restaurants, laundries, employees,
  special agents, random events, seasons, room temperature/humidity, hunting,
  ice fishing, reviews, and 100 Steam achievements;
- SteamDB lists Unity Engine for the app;
- achievements reveal the real loop order: first room, first guest, first
  review, first store customer, first tree, first employee, heating, ice,
  igloo, hunting, fishing, restaurant, laundromat, room counts, review counts,
  business revenue thresholds, employee max levels, and end-of-quest completion.

The important point is not whether any of this is elegant. The important point
is that the game converts a broad fantasy into many small countable proof
events. That is exactly what Dream of One must do for speech and records.

## Likely Implementation Shape

For Unity-style operation sims, the common architecture is probably:

- `Interactable` component on usable objects;
- data definitions for products, rooms, upgrades, recipes, services, staff, and
  prices;
- first-person controller with raycast focus and use/hold actions;
- customer/NPC state machines;
- navigation agents for walking to service points and queues;
- object placement/snap/grid logic;
- inventory, stock, delivery, and storage state;
- register/service minigames;
- economy/reputation/review calculators;
- save data for placed objects, stock, staff, day, and money;
- task/achievement trackers.

This is a strong inference, not an exact claim about a specific game's code.
It matches the feature sets on Steam pages and common engine docs for data
containers and navigation.

Dream of One already has a deterministic backend for suspicion/report outcomes.
What it lacks is the everyday sim scaffold around it:

- persistent Store objects;
- visible record objects;
- NPC/watcher movement and queue behavior;
- a service procedure that continues beyond dialogue choices;
- player-readable state changes before Station pressure.

## Asset Pattern

Exact asset packs are unknown. The practical asset categories are clear:

| Category | Why it exists in these games | Dream of One use |
|---|---|---|
| Modular building/interior kit | quickly builds motel/store/cafe rooms | Store, Station, Studio, Park interiors and signs. |
| Props and furniture | rooms, counters, shelves, registers, cleaning gear | queue props, counter clutter, receipt tray, station desks. |
| Product/item packs | shelves and service loops need visible goods | labels, bags, ordinary purchase items, office folders. |
| NPC character pack | customers/staff need basic bodies and animations | clerk, waiting customer, manager, Station officer. |
| UI icon/panel kit | shop/staff/upgrade screens need fast readability | records, warnings, citation, route result panels. |
| SFX/ambience | cheap sims rely on familiar workplace audio | bell, receipt print, drawer, stamp, station light, queue ambience. |
| Weather/lighting/time kit | season/day-night communicates progression | only later; M1 should prioritize record clarity. |

Recommendation: do not buy a full simulator template for Dream of One. Use
assets as presentation and interaction props, while keeping deterministic rules
in the existing Godot/backend architecture.

## Dream of One Adoption

The active M1 should become a tiny operation sim:

```text
Walk into Store
-> read queue/usual-order cue
-> answer clerk
-> receive or damage a receipt/record
-> see clerk note or report tray change
-> go to Station
-> Station cites exact Store record
-> route outcome explains why
```

This is the minimum bar before expanding Dream Law, society simulation, LLM
dialogue, or public OpenAI/Codex packaging.

It should also include a minimal economy:

```text
account credit
-> normal or corrected Store sale
-> record burden
-> Station attention
```

The economy explains why NPCs care. A bad answer is not only weird; it makes
someone's ledger dirty and creates work for the Store or Station.

## Required Planning Documents

Before implementation, each new operation-sim slice needs:

| Document | Required content |
|---|---|
| Procedure card | local role, expected behavior, usable objects, watcher, record, repair cost. |
| Object state table | object IDs, visible states, interactions, persistence, evidence event. |
| NPC flow card | spawn, path, wait point, request, reaction, exit, report behavior. |
| UI state map | HUD fields, prompts, record panel, route result, failure text. |
| Data schema note | backend fields, Godot object IDs, save/evidence output, provider boundary. |
| Asset bill of materials | asset category, source, license, confidence, replacement plan. |
| Proof contract | screenshots, route logs, fresh-player explanation, provider-off run. |

## Current Game Studio Verdict

| Question | Verdict | Reason |
|---|---|---|
| Can Dream of One use cheap operation sims as a planning baseline? | `READY` | The benchmark gives concrete product components, not just taste references. |
| Is the current Same Order build at that product floor? | `NOT_READY` | It proves deterministic route contrast, but not enough visible facility work and record objects. |
| Should the project chase broad motel/shop economy systems? | `NO` | That would fight the core premise and delay the actual speech/record loop. |
| Should asset work start now? | `READY_WITH_CONSTRAINTS` | Only small props and UI assets tied to Store/Station records. |
| Should LLM/provider work be marketed first? | `NOT_READY` | Provider value matters only after the deterministic operation loop is legible. |

## Immediate Adoption Actions

1. Add a Store procedure object list: queue mark, usual-order board, receipt tray,
   correction slip, report tray.
2. Add a Store object-state table for clean, repair, soft-report, and inquest
   routes.
3. Add the minimal civic economy ledger: `account_credit`, `local_trust`,
   `record_burden`, `station_attention`, and transaction events.
4. Add a simple waiting customer or watcher path only if it makes the record
   handoff easier to understand.
5. Replace abstract HUD phrasing with record-centered wording.
6. Produce a one-page asset bill of materials for Store and Station only.
7. Run a comprehension dry run: can a fresh player explain what object changed,
   who noticed, and why Station cared?

## Cut Rules

Cut anything that does not help the player understand Store procedure -> line ->
record -> Station citation:

- broad economy;
- full staff management;
- weather/seasons;
- room/building expansion;
- random events;
- large asset shopping;
- open-ended chat;
- second or third locations before Same Order passes the proof.
