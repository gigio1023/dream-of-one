# M4 — Town Social Sim

**Status: queued.**

## Goal

Scale the proven loop from one room to one living town block: four locations,
6–8 agent-loop NPCs, day segments, ambient life, and persistence — per
[`../game/world-social-sim.md`](../game/world-social-sim.md). After M4 the
game reads as a *place* that investigates you, not a scene that does.

## Deliverables

**World:** Park, Studio, and street scenes themed per the asset pipeline;
location transitions; navigation across the block; notice board, review
queue, and approval-criteria objects live with real visibility rules.
(Owner note 2026-07-11, very low priority: the notice board is the intended
successor to the removed in-room record props — NPCs both read *and* write
it during ambient life.)

**Cast:** Park Witness, Studio PM, and 1–2 ambient residents join the M1
cast, each with actor policy, schedules (three day segments), and low-budget
ambient loops (restock, sweep, queue, small talk) on the same tool catalog.

**Social depth:** cross-place propagation through records only (a park
posting matters because roles *read* it); the five civic economy values
active, each demonstrably changing one role decision; repair paths that span
locations (public repair posting reopening a Studio opportunity — v1's best
emergent-feeling beat, now emergent for real).

**Content:** 2–3 additional storylets compiled from
`scenario/content/social-simulation-cards.md`, placed across locations so a
session weaves storylet beats with ambient life.

**Persistence:** mid-run save/load at beat boundaries (records, ledger,
economy, NPC memory snapshots); per-role provider profiles (cheap ambient,
better Station/Studio) through the M2 registry.

## Acceptance

- [ ] A full run day (open → close) plays across ≥3 locations with
      storylet + ambient beats interleaved.
- [ ] Suspicion raised in the store visibly alters behavior in the park and
      studio *only* via records/economy values (no cross-scene scripting).
- [ ] Save, quit, reload mid-day: identical world state; routes still
      terminate correctly (`route_smoke.gd` extended to a day-cycle smoke).
- [ ] Ambient NPCs act believably enough that a watcher can narrate what each
      is doing and why.
- [ ] Fun gate — this is the "is the town alive?" milestone; judge harshly.

## Non-goals

Second town block, weather/lighting systems, NPC romance/relationship sims,
economy systems beyond the five values, EN locale (M5), audio polish beyond
a basic ambient/interaction pass.
