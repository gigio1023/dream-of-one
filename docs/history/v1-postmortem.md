# v1 Postmortem — Why the 3D Prototype Was Abandoned

v1 ran 2025-10-30 → 2026-05-19 (333 commits: a Unity MVP, then a Godot 4.x 3D
migration), reached a passing "M1 technical proof," and stopped. This
postmortem is evidence-based (repo archaeology, 2026-07-10) and exists so v2
does not repeat the pattern. Guardrails derived from it live in `AGENTS.md`
and [`../vision/design-pillars.md`](../vision/design-pillars.md).

## What actually killed it (weighted)

**1. Process outgrew the game (primary).** At abandonment the repo held ~37k
lines of markdown against ~29k lines of all game code ever written, with more
`docs:` commits than `feat:` commits. An M0–M7 gate ladder, a 90KB
verification ledger, council reviews, evidence packs, comprehension proxies,
and session kits certified everything except whether the game was fun. The
final product blocker was "external fresh-player comprehension notes 0/3" — a
gate that required recruiting human testers and that no agent could close.
Work continued anyway, producing dozens of "QA bot can read X" slices.

**2. Direction churn (primary).** Six to eight documented pivots in the final
19 days (Cover Test buttons → conversation-first → simulator benchmarks →
operation-sim floor → civic economy → environment-first agentic sim →
agent-loop runtime). On the last day, doc 17 declared the agent-loop pivot,
retroactively invalidated the previous two days of feature work, specified
`agent_loop_probe_v0` in detail — and development stopped with zero lines of
that architecture written.

**3. Assets were a chronic drag, not the proximate cause (secondary).** Across
both engine eras there was zero bespoke art: NPCs were a cylinder body with a
sphere head (`npc_placeholder.tscn`), the world was kit-bashed Kenney CC0 city
blocks, props were code-generated boxes. The roadmap itself contained an "M3:
3D Value Gate — 3D earns its cost" that never passed, "human readability
review" was permanently pending, and the risk register logged "free assets
look amateur / first impression weak." Choosing 3D made the art problem
unsolvable for a solo/AI team; the process apparatus then grew partly to
compensate for a game that never looked or felt done.

**4. The AI layer worked but was sealed off (contributing).** A live provider
round-trip (gpt-5.4-mini via a Codex profile) succeeded end to end from the
running scene, with real budgets held. But provider-truth anxiety (unstable
model availability, opaque quotas) kept the shipped mode `fallback_only_m1`,
so the game's central promise — LLM-backed NPC society — was never once
player-visible.

## What v2 keeps

- The deterministic-authority architecture: rules own suspicion, records,
  verdicts, session end; the LLM only proposes. This was the best design
  decision in v1.
- The agent-loop NPC concept (v1's doc 17): observe → validated tool → result
  → iterate. v1 died before building it; v2 builds it as
  [`../game/npc-agent-loop.md`](../game/npc-agent-loop.md).
- The engine-agnostic TS runtime core (schema, suspicion taxonomy, decision
  service, fallback) and the semantic world layout data.
- Scenario canon under `docs/scenario/` (~1.7k lines of storylets, social
  cards, dialogue banks, Korean voice notes).
- Godot. The migration was finished and proven; Godot's 2D stack is the
  strongest part of the engine and fits the new direction.

## What v2 changes

- **3D → 2D top-down.** Kills the unsolvable asset problem for a few dollars
  of licensed tiles and sprites; the game's actual content (conversation,
  records, social pressure) never needed a camera angle.
- **Provider layer → ports and adapters.** No single-vendor coupling; an
  OpenAI-compatible Chat Completions port covers diverse model families
  (ModelScope/Qwen, OpenRouter, local), a Responses port covers OpenAI models.
  Profiles are config; fallback is always available. Live wording goes
  player-visible early (M2), because provider truth is now a config concern,
  not an existential one.
- **Process → one gate.** The fun gate replaces the gate ladder. Playtests
  inform, never block. No standing ledgers or trackers.

## What v2 forbids

See the guardrails in `AGENTS.md`. In one line each: no proof-factory
artifacts; no mid-milestone direction docs; no gates owned by external humans;
no test/tooling slices without a playable reason; one active milestone at a
time.
