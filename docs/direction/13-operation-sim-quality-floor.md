# Operation Sim Quality Floor

Status: active direction addendum
Date: 2026-05-15
Source: `docs/research/simulator-benchmarks/2026-05-15/`
Economy addendum: `docs/direction/14-minimal-civic-economy-model.md`

## Decision

Dream of One should use low-budget first-person operation simulators as a
quality-floor benchmark for M1/M2 planning.

This does not mean Dream of One becomes a motel, supermarket, cafe, or gas
station game. It means the project must meet the same minimum product discipline
that those games meet:

```text
visible workplace
-> repeated local procedure
-> usable objects
-> NPC demand or watcher pressure
-> persistent record/state change
-> readable consequence
-> proof that the player understood it
```

## What This Changes

The active M1 Same Order target is no longer only "conversation route proof."
It is a tiny operation-sim proof where speech is the work being performed and
records are the goods being moved.

The player should experience:

```text
I entered a Store.
The Store had a normal procedure.
The clerk expected my usual order.
My line changed a record.
The clerk or Store system passed that record forward.
The Station cited the same record.
The outcome made sense.
```

## Minimum Store/Station Product Floor

| Required component | M1 version |
|---|---|
| Workplace | one readable Store counter and one Station intake desk. |
| Primary verb | answer, correct, accept record, inspect cited record. |
| Procedure cue | queue mark, usual-order board, receipt/label tray. |
| Stateful object | receipt/correction slip/report tray with visible state changes. |
| Minimal economy | account credit, local trust, record burden, and Station attention. |
| NPC pressure | clerk notices mismatch; optional waiting customer/manager reinforces public context. |
| Record propagation | Store record ID and exact player line reach Station. |
| Formal consequence | Station compares current answer to prior Store record. |
| Feedback | why-line, route outcome, record chain, screenshot/contact sheet. |
| Proof | clean, repair, soft report, and inquest routes pass provider-off. |

## Things To Borrow From Cheap Operation Sims

- short interaction prompts;
- visible workplace props;
- simple object states;
- minimal transaction and reputation pressure;
- NPC waiting/serving flow;
- status/review/result feedback;
- task-sized goals;
- staff/watcher roles with limited knowledge;
- achievement-like proof counters.

## Things Not To Borrow

- broad economy;
- money-first progression;
- full profit-and-loss simulation;
- large building expansion;
- full staff management;
- weather/seasons;
- item catalog bloat;
- random events;
- template-driven simulator code;
- generic shop fantasy.

## Required Planning Artifacts

Before a Same Order implementation pass, create or update:

| Artifact | Purpose |
|---|---|
| Procedure card | defines local procedure, expected answer, mismatch, watcher, record, repair. |
| Object state table | defines each Store/Station prop state and evidence event. |
| Civic ledger table | defines account credit, trust, burden, Station attention, and transaction events. |
| NPC flow card | defines clerk/witness/officer path, wait, reaction, and knowledge limits. |
| UI state map | defines prompt, record panel, why-line, citation panel, outcome. |
| Asset bill of materials | defines prop/UI/audio assets, source, license, and replacement plan. |
| Proof checklist | defines screenshots, route logs, provider-off run, and fresh-player explanation. |

Current Same Order asset BOM:

- `docs/scenario/content/same-order-asset-bill-of-materials.md`
- backend verifier:
  `backend/npc-runtime/src/runtime/same-order-asset-bill-of-materials.ts`
- evidence field:
  `playability.assetBillOfMaterials`

## Implementation Guidance

Use the current Godot/backend architecture:

- Godot owns spatial props, prompts, NPC placement, UI, capture, and player input.
- Backend/runtime owns deterministic signal, report weight, Exposure, Station
  transition, verdict, and session termination.
- Provider/OpenAI SDK output may only vary bounded wording after state is locked.
- Assets are props and clarity aids, not gameplay authority.

## Gate

M1 operation-sim proof passes only when:

- a fresh player can describe the Store procedure;
- a fresh player can identify which object changed after their line;
- Store record exists before Station cites it;
- transaction/ledger effect is visible enough for the player to explain;
- Station cites exact Store line and record ID;
- clean, repair, soft report, and inquest routes remain deterministic;
- provider-off fallback produces the same route outcomes;
- screenshots and evidence JSON agree with the player's explanation.

## Director Verdict

| Scope | Verdict |
|---|---|
| Use low-budget operation sims as quality-floor benchmark | `READY` |
| Treat current Same Order as meeting that floor | `NOT_READY` |
| Create Store/Station object-state pass | `READY` |
| Start broad economy/staff/content expansion | `NOT_READY` |
| Market the game as OpenAI/Codex-powered before this proof | `NOT_READY` |
