# Lane 01: Product Anatomy

Status: source-backed research lane
Date: 2026-05-15

## Read This First

The goal is not to rank the games. The goal is to reverse-engineer what a small
operation simulator must contain before players read it as "a real game."

## Arctic Motel Simulator

Public source anchors:

- Steam page: motel expansion, room types, shops, restaurant, laundry, seasons,
  humidity/temperature, hunting, employees, special agents, random events, and
  AI disclosure for some store/capsule and brush texture work.
- Steam achievements: first room, first guest, first review, first store
  customer, tree cutting, first employee, heating, ice mining, igloo, hunting,
  fishing, restaurant, laundromat, room-count goals, business revenue goals,
  employee max-level goals, all-quest completion.
- SteamDB: Unity Engine.

Product anatomy:

| Product part | Evidence | Design meaning |
|---|---|---|
| Facility | motel territory, room types, igloos, RV areas, shops, restaurant, laundry | broad fantasy is decomposed into rooms and service modules. |
| Manual labor | trees, ice, boiler fuel, hunting, fishing | filler verbs create physical work between management screens. |
| Service loop | guests, rooms, store customers, restaurant customers | each business needs an arrival/request/service/reward loop. |
| Reviews/reputation | first review, star ratings, review counts | customer response becomes progress feedback. |
| Staff | cashier, janitor, chef, receptionist, deliveryman, special agents | staff unlocks after solo workload is too wide. |
| Long tail | revenue tiers, max-level employees, all unlocks | achievements turn repeated tasks into goals. |

Dream implication:

Dream of One needs countable proof events too. A Store line cannot just "feel
wrong"; it needs a record event, a visible object change, a cited line, and a
route outcome.

## Motel Manager Simulator

Steam page features:

- old motel plus shop and gas station;
- design, furnish, clean, and rent rooms;
- order products, stock warehouse/shelves, set prices;
- serve customers, manage rating/popularity;
- cash register, fuel pump, cleaning, check-in/out, shelf filling;
- staff room and hired employees;
- expansion options such as fuel pumps, payphones, vending machines, bus
  station, and ads.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Combined businesses | a cheap sim can stack motel/shop/gas loops to create content volume. |
| Cleanliness | visual state gives players an always-available task. |
| Warehouse/stock | purchases must become visible inventory before they become sales. |
| Price/rating | simple economy connects player choice to customer behavior. |
| Staff assignment | late-game complexity becomes delegation UI. |

Dream implication:

Dream should not stack businesses, but it should borrow the object-state
discipline. "Receipt tray empty/full/marked/reported" is the Dream equivalent
of "shelf empty/stocked/dirty/served."

## Internet Cafe Simulator 2

Steam page features:

- build an internet cafe;
- thugs/mobsters can disrupt the cafe;
- rainy days can attract customers;
- tech tree;
- debt pressure;
- guards, meals, generators, computer upgrades, game licenses;
- legal and illegal business paths;
- employees.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Equipment | computers and generators make the fantasy visible. |
| License/upgrades | upgrades are not abstract; they unlock customer appeal. |
| Threat events | thugs/bombs/debt add pressure beyond normal service. |
| Weather modifier | simple environment condition changes customer behavior. |

Dream implication:

The project can use Station pressure like debt/thugs: a simple external force
that interrupts ordinary service. But M1 should first make the ordinary service
readable.

## Supermarket Simulator

Steam page features:

- stock shelves, set prices, take payments, hire staff, expand store, handle
  shoplifters, design layout;
- buy products through online or local markets;
- online orders and personal delivery;
- real-time market prices;
- floors/walls/category signs;
- cleaning and trash;
- cameras, alarm sensors, security guards;
- online co-op for up to four players.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Stock-to-sale chain | a product exists in market, delivery, storage, shelf, basket, checkout. |
| Pricing | customer satisfaction and profit fight each other. |
| Security | not every visitor is a customer; watcher systems are part of the loop. |
| Layout | shelves and signs are gameplay, not decoration. |
| Cleaning | state decay creates maintenance pressure. |

Dream implication:

Dream's Store needs its own stock-to-record chain:

```text
local expectation -> player line -> receipt/note -> report tray -> Station dossier
```

That chain should be as inspectable as a supermarket shelf.

## Gas Station Simulator

Steam page features:

- renovate, expand, and run a gas station;
- remove debris, repair equipment, paint and decorate;
- fuel, shop, workshop, warehouse, car wash;
- customers have time pressure;
- employees have skills and level through tasks;
- stock and fuel delivery take time;
- warehouse expansion allows larger storage.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Restore-to-run loop | players first make a broken place usable, then operate it. |
| Service queues | impatient customers create time pressure. |
| Service modules | fuel, shop, repairs, wash each add separate verbs. |
| Employee skill | automation improves with use and communicates progress. |
| Deliveries | stock is not instant; planning matters. |

Dream implication:

Dream should borrow "service queue pressure" at a tiny scale. One waiting
customer or one clerk glance can make Same Order feel public, which matters
because the player is being watched.

## Cafemart Simulator

Steam page features:

- cafe and supermarket loops;
- hundreds of products and many dishes in early access;
- shelf/fridge/freezer placement;
- price setting;
- baskets/carts/register service;
- construction menu, grid placement, painting floors/walls;
- co-op;
- multiple locations, signage, currencies, weather, day/night, music.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Two adjacent fantasies | cafe + market increases content volume while reusing store grammar. |
| Grid placement | layout editing becomes accessible and cheap to author. |
| Signage/currency | small localization-like details make the place feel configurable. |
| Early access statement | core loop is claimed before full content completion. |

Dream implication:

M1 can be small if it is honest about scope. A "core loop works" claim is
acceptable only when the Store/Station loop actually works in the build.

## Corner Kitchen Fast Food Simulator

Steam page features:

- buy cooking equipment;
- stock ingredients;
- prepare meals and serve customers;
- upgrade restaurant, read reviews, expand;
- furniture, tables, chairs, decorations;
- cleanliness for customer satisfaction;
- cooks and staff;
- recipes.

Product anatomy:

| Product part | Design meaning |
|---|---|
| Recipe loop | input items become ordered output under customer pressure. |
| Reviews | customer feedback closes the service loop. |
| Staff/training | later automation is part of progression. |
| Cleanliness/decor | non-core tasks support satisfaction and pacing. |

Dream implication:

Dream's "recipe" is not food. It is a statement shape:

```text
expected local premise + bounded answer + matching record = cover holds
```

The player should learn that recipe through play.

## Shared Mechanic Inventory

| Mechanic | Minimum implementation | Dream translation |
|---|---|---|
| First-person interaction | raycast/focus, prompt, use action | focus Store objects, clerk, Station dossier. |
| Object state | empty/full/dirty/broken/active | blank/normal/corrected/marked/reported record object. |
| Customer path | spawn, queue, request, service, exit | witness/regular stands nearby, notices mismatch, leaves or reports. |
| Transaction | item/service accepted, money changes | line accepted, record consistency changes. |
| Reputation/review | customer satisfaction affects progression | cover stability/report pressure/Exposure. |
| Staff task | assign employee to repeated work | NPC role has narrow noticing duty. |
| Upgrade/unlock | spend money to expand service | unlock more procedure locations only after proof. |
| Day/session summary | summarize profit, reviews, tasks | summarize record chain and why-line. |

## Takeaway

Cheap operation sims succeed when they make ordinary work visible, repeatable,
and countable. Dream of One needs the same visible work loop for language and
records before it asks players to care about dream logic.
