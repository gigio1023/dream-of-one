# M1 Low-Budget Operation Sim Quality Floor Review

Date: 2026-05-15
Scope: apply cheap first-person operation simulator benchmarks to Dream of One M1.
Inputs:

- `docs/research/simulator-benchmarks/2026-05-15/`
- `docs/direction/13-operation-sim-quality-floor.md`
- `docs/scenario/content/same-order-storylet-packet.md`
- `godot/data/world_layout.json`
- `godot/scripts/runtime/playable_session.gd`
- `backend/npc-runtime/src/runtime/conversation-suspicion.ts`

## Council Verdict

Dream of One has enough deterministic runtime authority to become a distinctive
game, but it does not yet meet the product floor that cheap operation
simulators routinely meet.

The gap is not art quality. The gap is tangible workplace causality:

```text
object -> action -> state change -> NPC reaction -> persistent record -> later citation
```

Same Order proves route contrast internally. It still needs visible Store and
Station objects that let a player understand what changed before reading logs.

## Role Notes

| Role | Verdict | Notes |
|---|---|---|
| Game Director | `READY_WITH_CONCERNS` | The benchmark is useful because it converts "make it a better game" into workplace verbs and record objects. Do not drift into shop economy. |
| Systems Designer | `READY` | Current suspicion/report weights can drive the loop. Add object states and record IDs before adding new signal types. |
| Narrative Director | `READY_WITH_CONCERNS` | Same Order already has strong beats. The story should now be expressed through receipt, correction, report, and dossier objects. |
| UX/Game Feel | `NOT_READY` | Player-facing clarity is not yet at the operation-sim floor. The player needs focus prompts, object state changes, and exact citation panels. |
| Producer | `READY_WITH_CONSTRAINTS` | Split into small work packages. Avoid asset shopping that does not serve Store procedure and Station citation. |
| QA/Evidence | `NOT_READY` | Existing smoke is necessary but not enough. Need route screenshots and fresh-player explanation. |

## Required Work Packages

1. Store object-state table and evidence events.
2. Store props: usual-order board, receipt tray, correction slip, report tray.
3. Station citation panel or dossier prop that shows exact Store line.
4. Handoff cue from clerk/Store to Station.
5. Fresh-player comprehension dry run.
6. Asset bill of materials with license proof.

## Cut List

- broad store inventory;
- currency/economy;
- staff management;
- second operation location;
- weather/season system;
- large marketplace asset import;
- open-ended provider chat;
- public OpenAI/Codex marketing claim.

## Gate

M1 cannot be called product-closed until a fresh player can explain:

```text
what the Store expected,
what the player said,
which record changed,
who noticed,
and why the Station cited it.
```
