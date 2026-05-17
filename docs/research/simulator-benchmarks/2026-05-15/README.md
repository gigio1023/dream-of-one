# Low-Budget Operations Simulator Benchmark Pack

Status: source-backed research pack
Date: 2026-05-15
Purpose: identify the minimum product shape behind cheap first-person operation simulators, then turn it into usable Dream of One planning rules.

## Why This Pack Exists

The immediate problem is not whether Dream of One has enough lore or a clever
LLM premise. The problem is that even small Steam operation simulators have a
thick product floor:

```text
first-person facility
-> interactable workplace objects
-> customers with visible needs
-> service or transaction loop
-> stock/cleaning/repair pressure
-> money/reputation/review feedback
-> staff or automation
-> expansion and unlocks
-> save/load and achievement-sized goals
```

Dream of One should not copy the motel/shop/cafe fantasy. It should copy the
discipline: a few visible objects, repeated procedures, records that persist,
and consequences that a player can understand without reading a design note.

## Files

| File | Role |
|---|---|
| [00-low-budget-operations-sim-synthesis.md](00-low-budget-operations-sim-synthesis.md) | Main synthesis and Dream of One adoption verdict. |
| [lane-01-product-anatomy](lane-01-product-anatomy/README.md) | Game-by-game breakdown of mechanics, UI/UX, and production implication. |
| [lane-02-implementation-and-assets](lane-02-implementation-and-assets/README.md) | Likely implementation architecture, asset categories, and Godot/backend mapping. |
| [lane-03-harness-research-protocol](lane-03-harness-research-protocol/README.md) | Reusable deep-research method using `~/git/game-studio` and `~/git/harness`. |
| [lane-04-economy-and-society](lane-04-economy-and-society/README.md) | Economy patterns across operation sims and the minimal Dream civic ledger model. |

## Source Pack

Primary game/store sources:

- Arctic Motel Simulator Steam page: https://store.steampowered.com/app/3098470/Arctic_Motel_Simulator/
- Arctic Motel Simulator Steam achievements: https://steamcommunity.com/stats/3098470/achievements
- Arctic Motel Simulator SteamDB page: https://steamdb.info/app/3098470/
- Motel Manager Simulator Steam page: https://store.steampowered.com/app/2594540/Motel_Manager_Simulator/
- Internet Cafe Simulator 2 Steam page: https://store.steampowered.com/app/1563180/Internet_Cafe_Simulator_2/
- Supermarket Simulator Steam page: https://store.steampowered.com/app/2670630/Supermarket_Simulator/
- Gas Station Simulator Steam page: https://store.steampowered.com/app/1149620/Gas_Station_Simulator/
- Cafemart Simulator Steam page: https://store.steampowered.com/app/3408110/Cafemart_Simulator/
- Corner Kitchen Fast Food Simulator Steam page: https://store.steampowered.com/app/3357250/Corner_Kitchen_Fast_Food_Simulator/

Asset and engine reference sources:

- Unity Asset Store hotel interior example: https://marketplace.unity.com/packages/3d/environments/hq-modular-interior-hotel-139761
- Sketchfab supermarket environment example: https://sketchfab.com/3d-models/supermarket-environment-943102d57ea4410098d1880a9e87ddfe
- NeoFPS feature page: https://neofps.com/
- Unity ScriptableObject guide: https://learn.unity.com/tutorial/introduction-to-scriptableobjects
- Unity NavMeshAgent manual: https://docs.unity.cn/2021.1/Documentation/Manual/class-NavMeshAgent.html
- Godot NavigationAgent3D docs: https://docs.godotengine.org/en/4.4/classes/class_navigationagent3d.html
- Godot Resources docs: https://docs.godotengine.org/en/stable/getting_started/step_by_step/resources.html

Local framework sources:

- `/Users/naem1023/git/game-studio/core/rubrics/game-design-doc-rubric.md`
- `/Users/naem1023/git/game-studio/core/templates/production/first-playable-proof-contract.md`
- `/Users/naem1023/git/game-studio/core/references/operational/game-feel.md`
- `/Users/naem1023/git/game-studio/core/references/operational/level-flow.md`
- `/Users/naem1023/git/harness/research/comparison-2026-04-05/omx-omc-ecc-gstack-unified-comparison.md`
- `/Users/naem1023/git/harness/ouroboros/docs/architecture.md`
- `/Users/naem1023/git/harness/clawhip/docs/event-contract-v1.md`
- `/Users/naem1023/git/harness/everything-claude-code/agents/gan-planner.md`
- `/Users/naem1023/git/harness/everything-claude-code/agents/gan-evaluator.md`
- `/Users/naem1023/git/harness/everything-claude-code/agents/silent-failure-hunter.md`

## Research Limit

This pack does not claim that the referenced games use specific asset packs.
Exact asset provenance requires shipped-build inspection, credits, or developer
confirmation. The asset analysis is therefore confidence-labeled:

- `observed`: stated by an official/store source or visible in current repo.
- `strong inference`: standard implementation for the listed feature set.
- `category candidate`: an asset category that would plausibly satisfy the need.

## How To Use

Treat this research as a planning input, not product authority. Stable decisions
must be copied into active direction, scenario, runtime, or harness files before
implementation starts.
