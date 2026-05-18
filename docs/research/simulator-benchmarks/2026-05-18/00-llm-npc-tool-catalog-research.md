# LLM NPC Tool Catalog Research

Status: active correction note
Date: 2026-05-18

## Question

How should Dream of One avoid hardcoding NPC consequences into dialogue choices
while still making an LLM-based NPC social simulation playable and verifiable?

## Sources Checked

| Source | Relevant concept | Dream implication |
|---|---|---|
| [Generative Agents](https://arxiv.org/abs/2304.03442) | Agents keep experience records, reflect, retrieve memories, plan behavior, and act inside an interactive sandbox. | The NPC should receive observations, memory, and available environment actions, not a branch-table result already chosen by the player option. |
| [ReAct](https://arxiv.org/abs/2210.03629) | Reasoning and actions interleave; actions query tools or environments for updated information. | Treat the game world as the tool boundary: propose action, validate, observe result, then continue. |
| [Voyager](https://arxiv.org/abs/2305.16291) | The agent improves through executable skills plus environment feedback, execution errors, and verification. | Dream's runtime should expose a small validated skill/tool catalog and return structured rejection reasons when an NPC proposes an invalid action. |
| [F.E.A.R. GOAP talk](https://www.madwomb.com/tutorials/gamedesign/prototyping/gdc2006_JeffOrkin_AI_FEAR.pdf) | Designers add goals/actions; dependencies are resolved at runtime from preconditions/effects instead of manually wiring every transition. | Author social actions with preconditions/effects and let the agent choose; do not attach each dialogue line to a fixed result. |
| [Smart Objects to Smart Locations](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter35_Ambient_Interactions_Improving_Believability_by_Leveraging_Rule-Based_AI.pdf) | World objects/locations carry use information, role allocation, and signals that make NPCs able to use new objects without changing the AI. | Store/Station objects should advertise role-filtered affordances as tool descriptors. |
| [Behavior Objects](https://arxiv.org/abs/1508.00377) | Embedding intelligence in environment objects helps manage NPC behavior complexity in open worlds. | Put social intelligence in environment object descriptors and validators before adding more dialogue branches. |

## Design Correction

Dialogue choices are player speech inputs. They may create observations and
signals, but they must not be the place where NPC actions are authored.

The active contract is:

```text
environment object state
-> role-filtered tool catalog
-> NPC/LLM proposes one tool call
-> deterministic runtime validates authority/preconditions
-> ledger/world state changes
-> other agents observe the changed record
```

The UI may show players what the place affords, but it should not label each
spoken line with a fixed authored consequence. The same spoken line may later
lead to different validated NPC actions if record state, trust, burden,
visibility, or Station attention differs.

## Required Tool Descriptor Fields

| Field | Why it exists |
|---|---|
| `actionId` | stable tool call id for LLM packets, logs, and proof. |
| `objectId` / `objectState` | proves the action came from the environment and is currently possible. |
| `affordance` | verb the NPC may propose, such as `mark_receipt` or `place_note`. |
| `eligibleRoles` | role authority boundary. |
| `visibleTo` | perception boundary. |
| `preconditions` | state, economy, or ledger requirements. |
| `ledgerEventKind` | citable event the action creates. |
| `civicEconomyEffects` | small social pressure deltas. |
| `validationRuleId` | deterministic validator that owns truth. |
| `failureReasons` | structured feedback for agent repair and Codex QA. |

## Do Not

- Do not add `ruleCue`, result labels, or record outcomes to individual dialogue
  choices.
- Do not let provider prose create records, authority, exposure, inquest, verdict,
  or session end.
- Do not expand Store content as a shop sim just because Store objects expose
  tools.
- Do not add a broader economy or town simulation before one visible tool call
  changes one NPC action in the running build.

