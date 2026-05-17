# Lane 04: Economy And Society

Status: source-backed research lane
Date: 2026-05-15

## Thesis

The project does need an economy model, but not a broad business-management
economy yet.

Cheap operation simulators use money because money connects small tasks into a
society:

```text
customer demand
-> service work
-> transaction
-> review/reputation
-> staff cost
-> supply pressure
-> expansion permission
```

Dream of One should translate that into a civic ledger:

```text
local expectation
-> player statement
-> transaction record
-> correction or mismatch
-> report cost
-> Station audit
-> access, trust, and institutional pressure
```

The economy exists to define why NPCs care. The clerk reports not because the
plot says so, but because unclean records create cost, risk, and liability.

## Benchmark Economy Patterns

| Reference | Economy elements found in public sources | Society insight |
|---|---|---|
| Arctic Motel Simulator | rooms, shops, restaurants, laundry, reviews, employees, employee training, special agents, random police/inspection events, hunting/fishing services, weather-linked room conditions | Society is a bundle of services and regulators. Money, reviews, employees, and inspections make the motel part of a public order. |
| Motel Manager Simulator | room rent, shop products, warehouse stock, product prices, room prices, cash register, fuel pump, popularity, rating, employees, ads/expansion | Society is demand plus reputation. Popularity brings customers; rating affects willingness to pay. |
| Supermarket Simulator | purchase goods from markets, stock shelves, set prices, checkout, online orders, deliveries, market prices, staff, shoplifters, security guards/cameras, store expansion | Society is supply chain plus rule enforcement. Prices, inventory, theft, and checkout queues make the store legible. |
| Gas Station Simulator | fuel/shop/workshop/car wash services, deliveries, warehouse capacity, low-price opportunities, stockouts, customer expectations, employees, task skills | Society is logistics under time pressure. Deliveries take time, storage capacity matters, and running out changes customer behavior. |
| Internet Cafe Simulator 2 | debt, tech tree, customer attraction, guards, street threats, food, generators, power outages, employee care | Society includes debt, infrastructure, and coercion. Money pressure is not only profit; it is obligation and vulnerability. |
| Cafemart Simulator | shelves/fridges/freezers, optimal prices, baskets/carts, efficient checkout, currencies, day-night/weather, co-op | Society feels real through familiar currencies, shopping habits, and customer comfort. |
| Corner Kitchen Fast Food Simulator | equipment purchases, ingredients, cooking, customers, cashiers/front-of-house, reviews, cleanliness, staff, upgrades | Society is conversion and feedback: ingredients plus labor become meals, money, and public judgment. |

## Economy Primitives

All benchmark games reduce to a few primitives:

| Primitive | Normal sim meaning | Dream translation |
|---|---|---|
| Demand | customers want room, food, product, fuel, PC time | NPC expects normal statement, usual order, proper answer shape. |
| Supply | stock, room, ingredient, fuel, equipment | player has local identity, account, usual order, allowed explanation. |
| Price | money paid or lost | cover cost, correction cost, attention cost, account charge. |
| Inventory | goods on shelves or in storage | prior records, usual-order entries, receipts, statements. |
| Reputation | review score, popularity, satisfaction | local trust, cover credit, clerk confidence, Station tolerance. |
| Labor | manual task or employee assignment | who must clean the record: player, clerk, manager, Station. |
| Security | guard, camera, shoplifter, police | watcher, report tray, Station audit, inquest. |
| Expansion | new room/service/staff/module | new procedure location or higher social access. |

## Minimal Dream Economy

Dream of One should start with four values and one ledger.

| Value | Meaning | M1 range |
|---|---|---|
| `account_credit` | whether the player's local account can complete ordinary service | 0-3 tokens for M1 only. |
| `local_trust` | how much the Store treats the player as a normal regular | 0-100. |
| `record_burden` | how much cleanup work the player's statements create | 0-100. |
| `station_attention` | how likely the Station is to formalize the mismatch | existing report/Exposure pressure can map here. |
| `civic_ledger` | ordered events tying transactions, statements, corrections, and reports together | append-only event list. |

The key is that the economy should be legible without complex management UI.

### M1 Store Transaction

| Route | Transaction | Ledger event | Economy effect |
|---|---|---|---|
| clean cover | usual order accepted; account charged normally | `store_sale_normal` | `account_credit -1`, `local_trust +5`, `record_burden +0`, `station_attention +0` |
| repair recovered | player asks what they usually order, then accepts correction | `store_sale_corrected` | `account_credit -1`, `local_trust -5`, `record_burden +15`, `station_attention +0..10` |
| soft report | player contradicts local routine but does not hard-break | `store_exception_reported` | `account_credit 0`, `local_trust -20`, `record_burden +35`, `station_attention +30` |
| inquest opened | player uses dream/outside language or contradicts prior record | `store_report_escalated` | `account_credit 0`, `local_trust -40`, `record_burden +60`, `station_attention +70` |

These numbers are not tuning truth. They are a playable scaffold.

## NPC Incentives

The economy must explain NPC behavior.

| Actor | Wants | Fears | Why they notice the player |
|---|---|---|---|
| Store Clerk | clean queue, normal receipts, low manager review | unreported mismatch creates liability | a wrong statement makes their register/receipt inconsistent. |
| Waiting Customer | fast service, stable line order | delays and public weirdness | the player slows or disturbs normal service. |
| Store Manager | high rating, few exception reports, no Station audit | inspection, bad reports, staff error | repeated mismatch threatens business standing. |
| Station Officer | consistent civic records, low unresolved burden | contradictory records spreading | Store report is a cost the institution must reconcile. |
| Player | preserve access, avoid formal attention, keep enough account credit | becoming administratively expensive | every strange line becomes cleanup work for others. |

This gives Dream a society instead of only a suspicion meter.

## Why Economy Helps The Core Game

Without an economy:

- suspicion can feel arbitrary;
- NPCs can feel like scripted accusers;
- Station pressure can feel like plot magic;
- Store procedure can feel like flavor text.

With a minimal civic economy:

- a normal transaction proves belonging;
- a correction has a cost but can recover;
- a report is a labor/liability event;
- Station pressure is an audit of unresolved burden;
- society feels like it protects ordinary procedure, not like it hunts the
  player for no reason.

## Implementation Shape

Add an economy ledger only after the Store object-state work is scoped.

Suggested event fields:

```ts
type CivicLedgerEvent = {
  eventId: string;
  sessionId: string;
  locationId: "Store" | "Station";
  actorId: string;
  recordId: string;
  transactionKind:
    | "store_sale_normal"
    | "store_sale_corrected"
    | "store_exception_reported"
    | "store_report_escalated"
    | "station_record_cited";
  accountCreditDelta: number;
  localTrustDelta: number;
  recordBurdenDelta: number;
  stationAttentionDelta: number;
  citedLine?: string;
  whyLine: string;
};
```

M1 should not implement:

- dynamic market prices;
- broad product catalog;
- staff wages;
- rent;
- loans;
- full day-end profit/loss;
- general inventory.

Those are benchmark insights for later, not M1 scope.

## Dream Design Rule

Every new social system should answer:

```text
Who pays the cost of a bad record?
Who benefits from a clean record?
Who has authority to forgive, correct, or escalate it?
```

If a system cannot answer those questions, it does not yet define society.
