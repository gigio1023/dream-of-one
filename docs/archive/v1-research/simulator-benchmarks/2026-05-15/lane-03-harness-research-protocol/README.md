# Lane 03: Harness Research Protocol

Status: reusable method
Date: 2026-05-15

## Purpose

The user requirement is now part of the working method:

```text
Every serious topic must be investigated deeply enough to improve the next
game decision, not merely summarized.
```

For Dream of One, research is only useful if it changes one of these:

- active direction;
- storylet cards;
- object/state contracts;
- Godot/backend work packages;
- proof gates;
- cut rules.

## Local Sources To Use

| Source | Use |
|---|---|
| `~/git/game-studio/core/rubrics/game-design-doc-rubric.md` | Check whether the idea names player role, loop, decision, feedback, progression, edge cases, tuning knobs, proof, and rejected alternatives. |
| `~/git/game-studio/core/templates/production/first-playable-proof-contract.md` | Convert research into the smallest playable proof. |
| `~/git/game-studio/core/references/operational/game-feel.md` | Break verbs into input, startup, state change, confirmation, consequence, recovery. |
| `~/git/game-studio/core/references/operational/level-flow.md` | Make sure the player learns, practices, varies, combines, and can recover. |
| `~/git/harness/research/comparison-2026-04-05/omx-omc-ecc-gstack-unified-comparison.md` | Treat research as upstream of implementation/verification/deployment, not as the final output. |
| `~/git/harness/ouroboros/docs/architecture.md` | Convert vague ideas into spec, acceptance tree, and execution tasks. |
| `~/git/harness/clawhip/docs/event-contract-v1.md` | Normalize game and agent events into typed records. |
| `~/git/harness/everything-claude-code/agents/gan-planner.md` | Demand exact product detail, edge cases, flows, and quality bar. |
| `~/git/harness/everything-claude-code/agents/gan-evaluator.md` | Verify live behavior, screenshots, responsive/readability, and "real product" quality. |
| `~/git/harness/everything-claude-code/agents/silent-failure-hunter.md` | Hunt hidden fallbacks, empty catches, missing logs, lost errors, and timeout gaps. |

## Required Research Pack Shape

Every future deep-research request should create or update a dated pack:

```text
docs/research/<topic>/<YYYY-MM-DD>/
  README.md
  00-synthesis.md
  lane-01-source-map/README.md
  lane-02-product-anatomy/README.md
  lane-03-implementation-and-assets/README.md
  lane-04-dream-adoption/README.md
```

If the topic is smaller, lanes can be collapsed. The synthesis must still name
the decision, proof, and cuts.

## Research Workflow

1. Define the product question.
2. Gather primary sources first: official pages, manuals, docs, Steam pages,
   developer pages, engine docs.
3. Add secondary sources only when they expose player pain or missing product
   expectations.
4. Extract product anatomy, not vibes.
5. Build an implementation map with confidence labels.
6. Create a Dream of One adaptation table.
7. Define proof artifacts before proposing implementation.
8. Reflect stable conclusions into active direction/harness docs.
9. Run checks and stage the files.

## Confidence Labels

Use these labels in research:

| Label | Meaning |
|---|---|
| `observed` | Public source or local repo directly states it. |
| `inferred` | Strongly likely from feature set and common implementation pattern. |
| `candidate` | Useful option, not proven by the source. |
| `unknown` | Do not build on it until verified. |

## Anti-Slop Rules

- Do not use a large reference list as proof.
- Do not say "inspired by X" unless the exact borrowed behavior is named.
- Do not claim exact asset usage without proof.
- Do not let research create broad scope unless it also creates cut rules.
- Do not approve LLM/provider expansion before provider-off parity exists.
- Do not call a code path "done" without player-facing proof.

## Dream-Specific Translation

Every finding must pass this table:

| Research finding | Required Dream translation |
|---|---|
| Customer service loop | Which NPC asks, waits, reacts, and leaves a record? |
| Inventory/stock loop | Which statement/record object changes state? |
| Review/reputation | Which cover/report/Exposure value changes and why? |
| Staff/task delegation | Which NPC role notices what, and what can they not know? |
| Upgrade/expansion | Which new procedure location becomes legal after proof? |
| UI pattern | Which prompt/record/citation becomes easier to read? |
| Asset category | Which object makes the cause chain clearer? |

## Default Output

At the end of future research, produce:

- a dated research pack;
- one active direction or scenario update if the research changes authority;
- one implementation-ready work package list;
- one proof checklist;
- one cut list;
- source URLs and local source paths.

If a topic does not produce these, it was not deep enough to guide production.
