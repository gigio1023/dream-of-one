# Dream of One Documentation

Use this page as the documentation map. README.md is the project entry point; this page routes deeper work.

## Active Documentation

| Directory | Purpose |
|---|---|
| [agent-search-index.md](agent-search-index.md) | Search-first routing for agents, especially AI provider/auth/provider-boundary work. |
| [direction](direction/README.md) | Game thesis, pillars, roadmap, decision ledger, release strategy, and conversation redesign. |
| [design](design/game-design.md) | Runtime authority, Dream Laws, Evidence semantics, and social-causality rules. |
| [scenario](scenario/README.md) | Active scenario bible, dialogue/content banks, localization notes, and playtest rubric. |
| [runtime/godot](runtime/godot/README.md) | Godot runtime path, validation gates, Schema/action notes, parity, and cutover history. |
| [development](development/dev.md) | Developer setup, checks, CI policy, agent runbooks, and harness engineering docs. |
| [framework](framework/README.md) | Project-local Game Studio proof gates and GPT review guidance. |

## State And Evidence

| Path | Role |
|---|---|
| [.game-harness](../.game-harness/README.md) | Current M1 execution state, tasks, review logs, verification ledger, and continuation note. |
| [.game-studio](../.game-studio/README.md) | Project-local Game Studio routing, rubrics, roles, gates, and state. |
| [data/evidence/godot](../data/evidence/godot/) | Generated Godot Evidence Packs and visual captures. |

## Archive And Research

| Directory | Contents |
|---|---|
| [archive](archive/README.md) | Superseded material for historical lookup only. Not an active implementation path. |
| [research](research/) | Source-backed methodology and director-harness research. |
| [research/simulator-benchmarks](research/simulator-benchmarks/README.md) | Source-backed benchmark research for simulator-first Dream of One planning. |

## Reading Order

1. [Agent search index](agent-search-index.md)
2. [Project definition](../project.md)
3. [Completion plan](../plan.md)
4. [Conversation suspicion redesign](direction/08-conversation-suspicion-redesign.md)
5. [Game design spine](direction/09-game-design-spine.md)
6. [Team operating brief](direction/10-team-operating-brief.md)
7. [Simulator benchmark adoption brief](direction/11-simulator-benchmark-adoption-brief.md)
8. [Simulator reference games map](direction/12-simulator-reference-map.md)
9. [Operation sim quality floor](direction/13-operation-sim-quality-floor.md)
10. [Minimal civic economy model](direction/14-minimal-civic-economy-model.md)
11. [Agentic social simulation model](direction/15-agentic-social-simulation-model.md)
12. [Agentic prototype target](direction/16-agentic-prototype-target.md)
13. [Agent loop runtime pivot](direction/17-agent-loop-runtime-pivot.md)
14. [AI provider runtime](development/ai-provider-runtime.md)
15. [Game design](design/game-design.md)
16. [Scenario docs](scenario/README.md)
17. [Godot runtime path](runtime/godot/README.md)
18. [Verification ledger](../.game-harness/verification-ledger.md)

## Current Truth

Dream of One is a conversation-first suspicion game. The player is investigated through dialogue, recorded statements, suspicion signals, social reports, Station intake, inquest, and deterministic session end states.

The checked-in build proves an M1 technical slice and backend `openai-codex`
live wording calls. Godot live smokes now prove proof-only route-context
dispatch and same-NPC local-memory continuity through the running
`PlayableSession`, but the product HUD/Evidence truth remains `fallback_only_m1`.
It does not yet prove a public demo, player-visible live-provider mode, or
product-ready fixed GPT model availability.

The current planning method is benchmark-first: build a readable Store-to-Station
procedure simulator before expanding dream fiction, broad social simulation, or
OpenAI/provider-led wording claims.

The current quality-floor method is operation-sim-first: Same Order must show a
visible workplace, usable Store/Station objects, record state changes, NPC
pressure, and exact Station citation before broad content or provider-forward
claims.

The current economy method is civic-ledger-first: Same Order needs one normal
transaction, one possible correction, one report burden, and one Station audit
before broad shop or staff systems.

The current social simulation method is agent-loop-first: author places, low
level tools, records, visibility, dialogue locks, and validation, then let NPC
agents iterate over tool calls and conversation context. Do not keep adding one
fixed social reaction chain after another as the main design method.

The current LLM/NPC method is tool-loop-first: dialogue choices are player
speech inputs, while NPCs should increasingly use small validated tools such as
`move_to`, `look`, `talk_to`, `wait`, `inspect_record`, and `request`.
AI_PROVIDER_SEARCH_INDEX lives at [agent-search-index.md](agent-search-index.md).
The default live-LLM provider mode is direct `openai-codex` auth with
`gpt-5.4-mini` low reasoning effort only; API `nano` models are not assumed
usable through that Codex provider until live discovery proves it. Missing
credential or failed provider calls fall back deterministically. Provider
response storage is off by default; same-NPC continuity uses backend-owned
workspace memory in the next prompt. Backend and Godot live proof records
estimated caps and returned token usage, but ChatGPT Pro remaining quota is not
exposed by the provider response.
Game-runtime Codex auth means the backend provider profile described in
[AI provider runtime](development/ai-provider-runtime.md), not Codex CLI login.

The current prototype target is `agent_loop_probe_v0`: one NPC, one other NPC,
one object or record, five or fewer tools, three to six iterations, and a
player/Codex-readable transcript proving the NPC can observe, act, read the
result, and choose the next step without a fixed authored chain.
