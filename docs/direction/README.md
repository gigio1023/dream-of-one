# Dream of One Direction Pack

This is the active director-level entry point for Dream of One.

Use this before planning large features, changing the game loop, expanding story, changing 2D/3D strategy, publishing public material, or delegating broad Codex work.

Core AI/NPC philosophy is locked in
[Agent Loop Runtime Doctrine](17-agent-loop-runtime-pivot.md). Read it before
any NPC behavior, social simulation, provider, or agentic runtime work.
Search tokens: `AGENT_LOOP_RUNTIME`, `NPC_TOOL_LOOP`,
`NO_FIXED_SOCIAL_CHAINS`, `PROGRAMMATIC_WORLD_AI_INTENT`,
`CLAUDE_CODE_STYLE_NPC`.

For LLM/provider/auth questions, read
[`docs/agent-search-index.md`](../agent-search-index.md) first. It routes
`codex auth`, `openai-codex`, AI provider, and provider-boundary terms to the
active source of truth.

## Documents

- [Game Thesis](00-game-thesis.md)
- [Creative Pillars](01-creative-pillars.md)
- [Director Roadmap](02-director-roadmap.md)
- [Director Decision Ledger](03-director-decision-ledger.md)
- [Director Council](04-director-council.md)
- [Player Experience Targets](05-player-experience-targets.md)
- [Release Strategy](06-release-strategy.md)
- [Team and Role Model](07-team-and-role-model.md)
- [Conversation Suspicion Redesign](08-conversation-suspicion-redesign.md)
- [Game Design Spine](09-game-design-spine.md)
- [Team Operating Brief](10-team-operating-brief.md)
- [Simulator Benchmark Adoption Brief](11-simulator-benchmark-adoption-brief.md)
- [Simulator Reference Games Map](12-simulator-reference-map.md)
- [Operation Sim Quality Floor](13-operation-sim-quality-floor.md)
- [Minimal Civic Economy Model](14-minimal-civic-economy-model.md)
- [Agentic Social Simulation Model](15-agentic-social-simulation-model.md)
- [Agentic Prototype Target](16-agentic-prototype-target.md)
- [Agent Loop Runtime Pivot](17-agent-loop-runtime-pivot.md)

## Relationship to Other Docs

| Area | Path | Role |
|---|---|---|
| Agent operating map | `AGENTS.md` | repo rules and checks |
| Execution harness | `.game-harness/` | current stage, tasks, evidence, drift |
| Scenario bible | `docs/scenario/` | story, beat, dialogue, locations |
| Social simulation cards | `docs/scenario/content/social-simulation-cards.md` | NPC pressure functions, location procedures, storylet cards, and provider prompt context |
| Same Order storylet packet | `docs/scenario/content/same-order-storylet-packet.md` | production-ready Store-to-Station storylet packet for the active M1 prototype |
| Simulator benchmark research | `docs/research/simulator-benchmarks/2026-05-14/` | source-backed benchmark lanes for procedure, routine, social stealth, and LLM/social-agent patterns |
| Low-budget operation sim research | `docs/research/simulator-benchmarks/2026-05-15/` | source-backed benchmark lanes for cheap first-person operation sim mechanics, implementation, assets, and reusable research protocol |
| Simulator reference map | `docs/direction/12-simulator-reference-map.md` | active reference extraction: what to borrow, what to reject, and what proof it implies |
| Operation sim quality floor | `docs/direction/13-operation-sim-quality-floor.md` | active quality floor: visible workplace, usable objects, records, NPC pressure, and Station citation proof |
| Minimal civic economy model | `docs/direction/14-minimal-civic-economy-model.md` | active economy model: account credit, local trust, record burden, Station attention, and civic ledger |
| Agentic social simulation model | `docs/direction/15-agentic-social-simulation-model.md` | active society model: environment affordances plus role agents that freely choose validated actions |
| Agentic prototype target | `docs/direction/16-agentic-prototype-target.md` | active M1 target: one affordance-rich Store/Station environment with 2-3 role agents, ledgered interaction, and conversation-centered social proof |
| Agent loop runtime doctrine | `docs/direction/17-agent-loop-runtime-pivot.md` | direction lock: stop extending fixed social chains and build NPC tool-call iteration as the game philosophy |
| Runtime design | `docs/design/` | rules, authority, evidence |
| Research basis | `docs/research/2026-04-30/director-harness/` | source-backed director methodology |
| Harness engineering | `docs/development/harness/` | operating contracts and readiness gates |

## Operating Principle

Do not start from "what can Codex build next?"

Start from:
- what product risk must be proven,
- which design currency or storylet the work strengthens,
- which pillar the work strengthens,
- what evidence will make the decision real,
- what must be cut if the evidence fails.

## Current Strategic Position

Dream of One is still before a trustworthy vertical slice. The next director-level target is a conversation-first M1 proof: prove NPC prompt -> three dialogue choices or optional free input -> deterministic suspicion signal -> Evidence/Exposure/report consequence with backend-owned authority and Godot-visible feedback.

Current verdict:
- M1 technical proof passes locally for the `Same Order` conversation path.
- product closure still needs provider, replay/repair, external comprehension, export, and human visual readability evidence.
- not ready for broad vertical-slice implementation.
- planning should now use the simulator benchmark adoption brief: prove a
  mundane Store-to-Station procedure simulator first, then layer dream/LLM
  texture only after the cause chain is readable.
- the cheap operation sim quality floor now requires tangible Store/Station
  objects, record state changes, and exact Station citation before broad
  expansion.
- the minimal civic economy now defines society through normal transactions,
  record cleanup cost, report burden, and Station audit.
- the long-term social simulation model is environment-first agentic society,
  but the current doctrine is sharper: do not keep adding fixed social reaction
  chains. Author small tools, world rules, visibility, dialogue locks, and
  validation; let NPC agents iterate over tool calls and conversation context.
- the active prototype target is now one small Store/Station environment where
  conversation changes records, agents react through affordances, and Station
  cites the ledger.
- the next architecture target is `agent_loop_probe_v0`: one NPC, one other NPC,
  one object or record, five or fewer tools, three to six iterations, and a
  player/Codex-readable transcript.
