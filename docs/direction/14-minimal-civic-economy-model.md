# Minimal Civic Economy Model

Status: active direction addendum
Date: 2026-05-17
Source: `docs/research/simulator-benchmarks/2026-05-15/lane-04-economy-and-society/README.md`
Agentic simulation addendum: `docs/direction/15-agentic-social-simulation-model.md`
Small-loop research: `docs/research/simulator-benchmarks/2026-05-17/02-small-game-economy-loop-research.md`

## Decision

Dream of One needs a small economy model to make society coherent.

This economy is not a shop-management game, and it is not a broad money system.
It is a civic ledger that explains why normal service, records, reports,
corrections, and Station audits matter.

```text
ordinary transaction
-> receipt or correction
-> clerk/manager liability
-> report burden
-> Station audit
-> access or pressure
```

## Design Principle

Society in Dream of One is defined by who must clean up inconsistent records.

Money matters only as a proof that the player can participate in ordinary life.
The stronger economic pressure is administrative:

- who trusts this account;
- which receipt is normal;
- which correction costs someone time;
- which report creates institutional work;
- which contradiction makes the player expensive to keep in circulation.

Economy work must stay loop-first:

```text
source -> pool -> actor decision -> sink/transform -> player consequence
```

Do not start by defining a large pressure model. Start with one ordinary
obligation that the running build can prove. A value exists only when it changes
what an NPC can observe, choose, repair, report, cite, or explain to the player.

The normal game-economy vocabulary is useful only at this scale:

| Economy term | M1 civic translation |
|---|---|
| Source/tap/faucet | A player line, delayed answer, correction, typed statement, or ordinary purchase creates a record state. |
| Pool | Receipt tray, correction slip, report tray, civic ledger, and HUD record line hold the current state. |
| Sink/drain/spender | Correction, report handling, and Station citation consume tolerance, time, or local authority. |
| Converter | Spoken ambiguity becomes an authored record; a correction may turn it into a locally closed record. |
| Gate | Role visibility and authority decide which action is valid. |
| Measurement | Evidence Pack records the source action, object state, ledger event, role action, and explanation. |

Use this vocabulary to keep scope small. Do not translate it into a full market,
full inventory, or a separate management game.

This rule is source-backed. Machinations and Unity frame game economy as
resource flow through sources, pools, sinks/drains, and player-purposeful
balance. Eco shows economy as social obligation through stores, credit,
contracts, reputation, and government. RimWorld ties value to materials, work,
quality, condition, negotiator skill, relationship context, wealth, needs, and
storyteller event selection. Workers & Resources ties cost to materials, labor,
logistics, instant-build tradeoffs, citizens, and production chains. Against
the Storm turns consumption and stockpiles into resolve costs. Papers, Please
makes the economy harsh through a tiny chain of pay, mistake penalties, rent,
food, heat, and medicine. Supermarket Simulator and Internet Cafe Simulator 2
make economy readable through chores, service, debt, equipment, staff,
customer response, and reinvestment. EVE and Old School RuneScape show mature
economies need ongoing measurement and explicit sinks, but that scale is not
appropriate for M1.

Dream of One should borrow the pattern, not the size.

## M1 Economy Values

These are current loop variables, not a promise of a full economy. Add or tune
them only when one small playable loop needs the value.

| Value | Meaning | M1 use |
|---|---|---|
| `account_credit` | small local account balance for ordinary service | proves the player can complete one normal Store transaction. |
| `local_trust` | Store confidence that the player is a normal regular | affects clerk wording and repair tolerance. |
| `record_burden` | cleanup work created by mismatch/correction/report | explains why people care about odd speech. |
| `station_attention` | formal pressure created by unresolved records | maps to report/Exposure/inquest pressure. |
| `civic_ledger` | append-only transaction and record events | lets Station cite exact Store history. |

## M1 Transaction Table

| Route | Store result | Ledger event | Economy effect |
|---|---|---|---|
| clean cover | usual order accepted and charged normally | `store_sale_normal` | `account_credit -1`, `local_trust +5`, no burden. |
| repair recovered | correction slip attached before report | `store_sale_corrected` | `account_credit -1`, small trust loss, small burden. |
| soft report | service paused or marked because routine broke | `store_exception_reported` | no clean charge, trust loss, report burden. |
| inquest opened | contradiction or dream language escalates | `store_report_escalated` | no clean charge, heavy burden, Station attention. |
| Station reconciliation | Station cites Store record | `station_record_cited` | formalizes the previous burden. |

Numbers are tuning placeholders. The required proof is that the player can see
which record changed and why the Station cared.

## Agile Economy Rule

Every new economy change must fit one row before implementation:

| Field | Required answer |
|---|---|
| Source | What player/NPC action creates the resource, burden, or obligation? |
| Pool | Where can the player or NPC see it? |
| Decision | Which role changes behavior because of it? |
| Sink/transform | How is it spent, resolved, escalated, or formalized? |
| Player consequence | What line, prop, HUD state, outcome, or Evidence entry proves it? |

If any answer is missing, cut the feature. Do not implement abstract pressure
just because it sounds plausible.

Each increment gets one hypothesis:

```text
If one record becomes dirty or repaired,
then one role should choose a different validated action,
and the player should be able to say who now has work or authority.
```

Implement only enough code, UI, and Evidence to prove that hypothesis. Stop
there, run the checks, and update the ledger before choosing the next economy
increment.

Do not define "pressure" as a complete model first. For this project, pressure
is accepted only after it has a small playable loop:

```text
one record gets dirtier or cleaner
-> one role can see that state
-> one validated action becomes more likely or available
-> the player can read the consequence
```

Use this economy ladder:

| Level | Rule |
|---|---|
| Loop | One source, one visible pool, one role decision, one sink/transform, one player consequence. |
| Variable | Add only when the loop needs a tracked value. |
| Rule | Add only when the value changes one visible affordance or role decision. |
| System | Add only after several loops are proven and fresh players understand them. |
| Expansion | Blocked until Store/Station is readable: prices, inventory, wages, rent, taxes, multi-shop networks. |

## Source-Backed Design Guard

Use wider economy references as constraints, not as a feature backlog:

| Reference pattern | Dream of One rule |
|---|---|
| Unity and Machinations start from loop/resource flow. | Write one source/pool/decision/sink/consequence row before implementation. |
| RimWorld makes state matter through work, stockpiles, wealth, needs, and event selection. | Add a value only when it changes a visible NPC or Station action. |
| Workers & Resources exposes cost through labor, materials, logistics, and instant-build tradeoffs. | Make report/correction cost visible through props and role work, not hidden arithmetic. |
| Operation sims show stock, chores, service, staff, debt, and customer response. | Borrow the readable chore/object grammar, not the store-business scope. |
| Live economies track faucets, sinks, prices, production, destruction, and taxes. | Borrow ledgered measurement only after the small loop is playable. |

This keeps development agile: each sprint changes one playable behavior, not a
large spreadsheet of plausible society variables.

## NPC Incentive Model

| Actor | Economic motive | Behavioral consequence |
|---|---|---|
| Store Clerk | clean receipts prevent manager/Station review | notices statements that make the receipt hard to close. |
| Waiting Customer | fast queue and predictable service | reacts to delays or public oddness. |
| Store Manager | rating and audit risk | wants exceptions reported before they become liability. |
| Station Officer | unresolved burden must be reconciled | cites Store records and forces one statement to stand. |
| Player | keep access without becoming administratively costly | must decide whether to comply, correct, or expose contradiction. |

## Cut Rules

Do not implement these before M1 operation-sim proof:

- dynamic market prices;
- full product catalog;
- wages;
- rent;
- loans;
- staff scheduling;
- day-end profit/loss;
- broad inventory;
- expansion economy.

Allowed now:

- one local account value;
- one receipt/correction/report ledger;
- one Store transaction;
- one Station citation;
- one comprehension proof.
- one visible social-cost explanation showing who now has work or authority
  because of the player's record.

Next allowed increments, in order:

1. make correction reduce or cap burden before Station escalation;
2. make one manager action depend on visible burden;
3. make one normal transaction consume account credit and improve trust;
4. make one Station citation require an observed Store event.

Each increment must be proven in Godot and backend checks before the next is
started.

Current recommendation: do `local repair sink` next. It is the smallest economy
improvement that strengthens social simulation: the player creates a record
problem, a correction slip can cap or reduce the burden, and a role decides
whether that is enough to keep the matter local. This should be proven before
adding more account math, prices, inventory, debt, or public reputation.

## Proof Gate

The civic economy model is accepted only when a fresh player can explain:

```text
The Store expected a normal transaction.
My line made the receipt normal, corrected, or reportable.
That changed trust/burden.
The Station cited the Store record because unresolved burden has to be reconciled.
```

Provider wording, extra locations, and broad society simulation remain blocked
until this chain is playable.

## Relationship To Agentic Simulation

The economy values are not mainly HUD meters. They are shared social pressures
that actors observe when choosing from available environment affordances.

```text
record_burden rises
-> Store Manager notices liability
-> Manager proposes file_report
-> runtime validates authority
-> Station later cites the ledger event
```

This is how society should grow: actors react to ledger state and role pressure,
not to a manually scripted branch for every possible line.
