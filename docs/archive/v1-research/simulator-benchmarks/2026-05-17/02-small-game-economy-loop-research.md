# Small Game Economy Loop Research

Status: source-backed research note
Date: 2026-05-17
Purpose: keep Dream of One's economy work small, playable, and tied to NPC
social simulation instead of building a broad store-management system.

## Sources Checked

| Source | Useful point for Dream of One |
|---|---|
| Machinations framework basics | Treat economy as resource flow: resources, sources, pools, drains, converters, traders, and gates. This is useful as vocabulary, not as a mandate to model everything. <https://machinations.gitbook.io/docs/getting-started/framework-basics> |
| Machinations sustainable economy manifesto | Economy health is broader than monetization: currency/resource stability, sensible value, fair allocation, data, and control points matter. Dream of One should borrow the control-point habit, not the live-economy scale. <https://machinations.io/articles/the-machinations-manifesto-for-building-sustainable-game-economies> |
| Unity in-game economy guide | A practical economy is built from resources, sources, sinks, balance, inventory tracking, and progression purpose. If sources are too generous the game becomes empty; if sinks are too harsh the game becomes punishing. <https://unity.com/how-to/what-game-economy-guide-part-1> |
| Raph Koster, Laws of Online World Design | Long-lived worlds need ongoing drains/sinks because unlimited accumulation damages balance, but players dislike drains when they feel arbitrary. This is a warning to make costs meaningful and visible. <https://www.raphkoster.com/games/laws-of-online-world-design/the-laws-of-online-world-design/> |
| GameDesignSkills economy design overview | Economy starts from player motivation and goals; resources should represent actions and decisions inside the core gameplay. Its useful beginner model is builders/taps and spenders/sinks: one adds value, the other consumes it so decisions keep meaning. <https://gamedesignskills.com/game-design/economy-design/> |
| GDC Vault sink design summary | Sinks matter because they remove resources/items and keep decisions meaningful; spreadsheet simulation is useful once the loop exists. <https://www.gdcvault.com/play/1021008/Economic-Balancing-and-Improved-Monetization> |
| Eco economy wiki | Economy can be social infrastructure: stores, barter/credit, contracts, roles, backed currency, accounts, and taxes are ways players create obligations. <https://wiki.play.eco/en/Economy> |
| Eco laws wiki | Laws turn individual incentives into social conflict and public evidence; players use visible simulation data to argue for rules. <https://wiki.play.eco/en/Laws> |
| Against the Storm official Hostility/Resolve/Consumption Control pages | Good sim economies often start with a small number of visible pressure loops: growth raises hostility, needs affect resolve, and consumption control trades saved goods for social penalties. <https://wiki.hoodedhorse.com/Against_the_Storm/Hostility> <https://wiki.hoodedhorse.com/Against_the_Storm/Resolve> <https://wiki.hoodedhorse.com/Against_the_Storm/Consumption_Control> |
| RimWorld trade wiki | Trade is bounded by who can interact, where goods are, what value modifiers apply, and what the trader can carry; economy is embedded in character/social skill and physical logistics. <https://rimworldwiki.com/index.php?title=Trade> |
| RimWorld market value wiki | Value can be derived from inputs, work, quality, and condition, then modified by social context. For Dream of One, this supports "record value" and "trust cost" being derived from authored context rather than hand-waved mood. <https://rimworldwiki.com/wiki/Market_Value> |
| Dwarf Fortress labor wiki | Economic work can be driven by jobs, labors, tools, workshops, and manager orders; agents act because the environment exposes work, not because every action is hand-authored. <https://www.dwarffortresswiki.org/index.php/Labor> |
| Old School RuneScape Grand Exchange Tax & Item Sink update | A mature economy can add explicit transaction tax and item sinks, but the important lesson for Dream of One is clarity: the interface shows the cost, exemptions, cap, and item-removal logic. <https://oldschool.runescape.wiki/w/Update:Grand_Exchange_Tax_%26_Item_Sink> |
| EVE Online Monthly Economic Report, April 2026 | Persistent economies are monitored through production, destruction, mining, price indices, faucets, and raw data. Dream of One should borrow the habit of ledgered measurement, not the scale. <https://www.eveonline.com/news/view/monthly-economic-report-april-2026> |
| GEEvo economy-balancing paper | Modern game economies can be sensitive to small numerical changes, so even abstract economy work benefits from repeated simulation runs and tuning against concrete objectives. For this repo, the objective is comprehension of social consequence, not optimal resource yield. <https://arxiv.org/abs/2404.18574> |
| Unity Learn economy tutorial | Unity frames economy work from the core loop outward, then data analysis. This supports starting from one repeatable Store/Station loop before designing a wider economy. <https://learn.unity.com/tutorial/creating-a-game-economy> |
| RimWorld AI Storytellers wiki | RimWorld's storyteller considers colony state such as wealth, population, injuries, deaths, and event timing before choosing events. Useful lesson: economy/state variables matter when they feed event selection, not when they exist as detached meters. <https://rimworldwiki.com/wiki/AI_Storytellers> |
| RimWorld Basics wiki | RimWorld starts survival with food, shelter, and security, and teaches work bills/stockpile logistics before advanced systems. Useful lesson: player-readable needs and jobs come before full economy depth. <https://rimworldwiki.com/wiki/Basics> |
| Workers & Resources official site | The game sells its economy as planned economy, mining, manufacturing, construction, investment, citizens, and economic simulation. Useful as a later-scale reference, but too broad for M1. <https://www.sovietrepublic.net/> |
| Workers & Resources official construction wiki | Construction can be paid for instantly or built through resources, labor, and logistics. Useful lesson: a cost feels fair when the player can see which resource/labor chain it bypasses. <https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Construction> |
| Supermarket Simulator Steam page | Low-budget operation sims make economy readable through concrete chores: stock, price, checkout, market dip, customer satisfaction, profit, reinvestment, theft, and staff. <https://store.steampowered.com/app/2670630/Supermarket_Simulator/> |
| Internet Cafe Simulator 2 Steam page | Debt, customers, tech tree, guards, meals, generators, licenses, employees, and illegal options show how small business sims turn ordinary tasks into social and financial obligations. <https://store.steampowered.com/app/1563180/Internet_Cafe_Simulator_/> |
| Papers, Please MobyGames summary | A tiny procedural job becomes economic pressure because correct processing pays, mistakes penalize, and daily family expenses force tradeoffs. <https://www.mobygames.com/game/62666/papers-please/> |

## Research Audit

This note uses three source families:

- framework/design sources: Machinations, Unity, Koster, GameDesignSkills, GDC;
- official or official-adjacent game documentation: Eco, Against the Storm,
  RimWorld, Old School RuneScape, EVE Online;
- product pages and catalog summaries for operation-sim comparison:
  Supermarket Simulator, Internet Cafe Simulator 2, Papers, Please.

The strongest claims are stable and cross-supported:

- game economies are resource flows, not only money;
- sources and sinks/drains must be paired;
- good costs are visible and tied to player purpose;
- operation sims make economy readable through repeated objects, work, service,
  records, customer/NPC reaction, and consequences;
- colony/city sims justify wider economies only after their basic needs,
  jobs, logistics, and event selectors are readable;
- mature live economies need measurement, but Dream of One should not import
  live-service scale into M1.

Unresolved gap: these sources do not prove Dream of One's economy is fun. They
only support the next design constraint: prove one readable economy loop in the
running Store/Station cell before adding more variables.

## 2026-05-17 Web Recheck

Latest source check did not change the design direction:

- Unity's current Economy documentation still frames implementation around
  currencies, inventory items, purchases, configuration, and publication. That
  is useful as a data-shape reminder, but too broad for M1.
  <https://docs.unity.com/en-us/economy>
- Unity's in-game economy guide again reduces the practical design problem to
  resources, sources, sinks, progression, and balancing the player between
  boredom and frustration. For Dream of One, that means the first economy loop
  must be readable and motivating before any wider system appears.
  <https://activation.unity3d.com/how-to/building-game-economy-guide-part-2>
- Machinations' economy writing emphasizes exchange systems, stability,
  allocation, data, and control points. Borrow the control-point habit, not a
  live-economy spreadsheet.
  <https://machinations.io/articles/the-machinations-manifesto-for-building-sustainable-game-economies>
- Dormans' Machinations paper supports simulating resource flows before a full
  game is built. For this repo, the useful simulation is a tiny record-burden
  loop, not a full society model.
  <https://ojs.aaai.org/index.php/AIIDE/article/view/12477>

## Synthesis

Most useful game economies do not begin as full markets. They begin as one
repeatable flow:

```text
source -> pool -> decision -> sink/transform -> visible consequence
```

Examples:

- Supermarket Simulator: buy goods, place them, set a price, scan payment, then
  watch customer satisfaction/profit/stock change.
- Internet Cafe Simulator 2: earn through customers, spend on debt, equipment,
  guards, meals, generators, licenses, and employees, then see access and safety
  change.
- Papers, Please: process an entrant, earn or lose pay, then face rent, heat,
  food, medicine, and family survival pressure.
- Against the Storm: gather goods, stockpile them, decide when to consume or
  ration them, then take resolve/hostility consequences.
- RimWorld: produce or store goods, choose a qualified negotiator and trade
  venue, then accept price/logistics consequences.
- Dwarf Fortress: create work orders, let eligible workers use workshops/tools,
  then turn labor and materials into objects.
- Eco: create obligations through stores/contracts/credit, then let social
  rules and taxes shape future behavior.
- Old School RuneScape: tax a transaction, show the seller the fee, and route
  some value into item removal to protect a mature marketplace.
- EVE Online: measure production, destruction, mining, price indices, and
  faucets so developers can see whether the world economy is drifting.
- RimWorld: let needs, work, stockpiles, trade, wealth, and storyteller events
  interact, but start the player from concrete survival and work-order chores.
- Workers & Resources: make cost legible through production chains, citizen
  labor, logistics, and instant-build tradeoffs rather than a hidden number.

The useful translation is not "make a full market." It is:

```text
ordinary action -> tracked value -> visible obligation -> role action -> consequence
```

Dream of One should use economy as social explanation. A clerk cares because a
record leaves work behind. A manager cares because unresolved work becomes
liability. The Station cares because an unresolved record can be cited.

## Common Economy Patterns To Borrow Carefully

The sources converge on a practical set of economy patterns. None of them should
be imported whole into M1. Each is useful only if it makes the Store/Station
social simulation clearer.

| Pattern | Normal game use | Safe Dream of One translation |
|---|---|---|
| Tap/faucet/source | Quests, loot, harvest nodes, customers, or work create money, goods, XP, or stock. | A player line, delay, correction, or ordinary purchase creates a receipt state or record burden. |
| Pool/inventory/ledger | Resources sit in a wallet, stockpile, warehouse, account, or log. | Receipt tray, correction slip, report tray, civic ledger, and HUD record line. |
| Sink/drain/spender | Shops, crafting, repairs, taxes, death costs, upkeep, and time costs remove value. | Correction consumes local tolerance; report consumes clerk/manager time; Station citation formalizes unresolved burden. |
| Converter | Raw inputs become crafted goods, service, access, or progress. | Spoken ambiguity becomes a written record; correction can convert a dirty record into a locally closed one. |
| Trader/exchange | Goods and currency move between actors at a price or ratio. | Account credit buys normal service, while trust/burden decide whether that service remains ordinary. |
| Gate | A probability, threshold, role, or requirement controls where resources go. | Role authority and visibility decide whether a clerk can repair, a manager can forward, or Station can cite. |
| Allocation/fairness | Rewards feel earned through effort, skill, time, risk, or role. | NPC actions feel legitimate because the record, visibility, and role authority are visible before consequence. |
| Measurement | Live economies track production, destruction, prices, faucets, sinks, and raw data. | Evidence Pack tracks source action, object state, ledger event, selected role action, and player-facing explanation. |
| Event selection | Colony/city sims use wealth, population, needs, logistics, or danger state to choose what happens next. | Station/Manager response should read one visible record state before choosing cite, warn, repair, or forward. |
| Logistics cost | Construction/management sims make cost visible through required materials, labor, delivery, and time. | A correction/report should cost visible role work: a slip, note, report tray, or Station dossier change. |

This makes the minimum useful economy one observable transformation:

```text
speech/delay/correction
-> receipt/correction/report state
-> one role sees it
-> one validated action changes it
-> HUD/outcome explains the social cost
```

Do not create parallel values such as pressure, stress, suspicion, debt, trust,
reputation, and stock unless each one earns its place by changing a visible
role action. One vague "pressure" meter would be less useful than one record
that the player can see getting repaired or cited.

For Dream of One, the economy should not start as prices, profit, inventory, or
store growth. The first economy should answer only this:

```text
What ordinary obligation did the player's speech create, who must clean it up,
and who gains the right to cite it?
```

## Adoption Rule

Economy work must be implemented as tiny playable loops.

Each loop needs:

1. one source: what creates the resource or burden;
2. one pool: where the resource/burden is visible;
3. one actor decision: who changes behavior because of it;
4. one sink or transform: how it is spent, resolved, escalated, or formalized;
5. one player-readable consequence.

If a proposed economy feature cannot fit this shape, it is too large for the
next agile increment.

Treat broad examples as later proof material, not permission to expand scope.
RimWorld, Dwarf Fortress, Workers & Resources, Eco, EVE, and live-service
economies all demonstrate depth, but they become useful only when a small
Dream of One loop already proves why a resource, obligation, or role action
matters. The correct first move is not to model society. It is to make one
piece of society answer:

```text
who created work, who can see it, who can repair it, and who can cite it?
```

Do not define a detailed pressure model before there is a playable reason for
it. A new value may enter the design only when it changes one visible role
decision in the current build. If it only sounds plausible in a design meeting,
it stays out.

Use one economy hypothesis per increment:

```text
If the player creates or repairs one record burden,
then one NPC should choose a different validated action,
and the player should be able to explain who now has work or authority.
```

If the increment cannot prove that hypothesis in Godot/backend Evidence, cut it
back before adding another value.

Use this ladder:

| Scope | Allowed when | Example |
|---|---|---|
| `loop` | always, if one source/pool/decision/sink/consequence is clear | player line creates receipt burden; clerk marks it. |
| `variable` | only after the loop is playable | `record_burden` changes manager action. |
| `rule` | only after one variable is visible to the player | burden above one threshold exposes `forward_report`. |
| `system` | only after 2-3 loops are proven and understood | account/trust/burden/attention as a civic ledger. |
| `economy expansion` | blocked until the current prologue is readable | pricing, inventory, wages, rent, taxation, multiple shops. |

## Dream Of One M1 Economy Loop

Keep the current Store/Station cell as a proof of obligation, not commerce.

| Loop part | M1 implementation |
|---|---|
| Source | player line, delayed answer, correction attempt, or typed statement. |
| Pool | receipt tray, correction slip, report tray, civic ledger, economy panel. |
| Actor decision | Clerk marks/repairs, Manager notes/forwards, Station cites. |
| Sink/transform | correction closes locally, report moves to Station, citation formalizes. |
| Player consequence | HUD/outcome explains record change and who acted from it. |

This is enough economy for the current game purpose. It creates society because
records cost other people work and authority, not because the Store has a full
business model.

The first playable implementation should be intentionally small:

```text
player says something odd
-> receipt burden increases by 1
-> Clerk chooses mark_receipt or offer_correction
-> correction lowers/caps burden or report forwards it
-> HUD/outcome names who now has work or authority
```

Do not add a second burden type, an inflation curve, or a store balance sheet
until a fresh player can explain that chain.

## What Not To Define Yet

Do not add these until the above loop is repeatedly playable and externally
understood:

- dynamic prices;
- product catalog;
- wages or rent;
- inventory throughput;
- profit/loss;
- staff schedules;
- multiple shops;
- full credit/debt network;
- taxation;
- long-term inflation/balance curves.

These may become useful later, but adding them now would hide the actual game:
conversation becoming a social record.

Also avoid designing "pressure" as a large abstract model. For M1, pressure is
only accepted when it is one of these:

- a record is dirty;
- a role can see the dirty record;
- a role has one validated action because of it;
- the player can read what happened.

## Next Economy Increments

Use these in order. Each should be one small playable proof.

| Increment | Proof |
|---|---|
| E1 obligation record | Player speech creates a visible record and a small burden value. |
| E2 local repair sink | A correction action reduces or caps burden before Station escalation. |
| E3 role priority | Manager chooses a different affordance when burden is above a visible threshold. |
| E4 citation authority | Station can only cite a Store event that it can observe. |
| E5 account participation | A normal transaction consumes one local credit and slightly improves trust. |
| E6 social cost display | HUD/outcome explains who now has work/authority because of the record. |

Stop after each increment and run the playable proof before adding the next.

## Development Method

Economy design for this repo must follow this cadence:

```text
research pattern
-> choose one smallest loop
-> write the loop row before implementation
-> implement only that loop
-> expose it in UI/Evidence
-> run Godot/backend proof
-> write what the player should understand
-> check whether the loop made the social simulation clearer
-> only then choose the next loop
```

Do not write a large economy spec and then implement toward it. The spec should
grow from playable loops that prove the social simulation is getting clearer.

Implementation should stop at the first readable proof. Do not continue into a
second economy feature just because the first one was easy to code. Run the
smoke, inspect the Evidence Pack, update the ledger, and decide whether the
player-facing cause chain became clearer.

## Current Recommendation

The next useful economy increment is still `E2 local repair sink`, not a broader
economy model.

Reason:

- `E1 obligation record` already has backend/Godot proof paths for receipt,
  report, ledger, burden, attention, and citation.
- The player-facing risk is comprehension, not lack of variables.
- A local repair sink is the smallest move that can make society feel less
  binary: an NPC can notice a problem, offer a fix, and either keep it local or
  let it travel to the Station.

Definition:

```text
source: player correction or delayed/typed clarification
pool: correction slip attached to the receipt
decision: Clerk or Manager decides whether the correction is enough
sink/transform: burden is capped locally or forwarded as a report
consequence: outcome/HUD explains whether the record stayed local or became citable
```

Cut line: if this requires new shops, product stock, money balance, extra NPC
biographies, or multiple days, the increment is too large.
