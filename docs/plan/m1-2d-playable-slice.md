# M1 — 2D Playable Slice

**Status: closed as a deterministic scenario harness.** The implementation is
useful for UI, transport, authority, and regression testing, but it did not
prove the intended LLM-driven NPC gameplay. Production gameplay continues in
M2; authored choices and route scripts must not expand here.

## Goal

The `Same Order` (같은 주문) scenario is executable as a 2D top-down harness
with real licensed art: walk into the store, get questioned, answer through
choices or typed input, watch suspicion travel, reach any of the four routes,
and replay. It retired presentation and transport risks, not the core
AI-gameplay risk.

## Player-visible deliverables

1. **The store scene**, built free-first (CC0 packs + greybox per
   [`../art/asset-pipeline.md`](../art/asset-pipeline.md)): store interior +
   entrance street strip, counter, usual-order cue, receipt tray, correction
   slip, report tray, queue marker, and a doorway to a minimal Station intake
   room (inquest terminal scene). Greybox elements follow the greybox rules
   (plain, labeled, on-grid).
2. **Five characters** with sprites and role accents: player, Store Clerk,
   Store Manager, Waiting Customer, Station Officer (Station room only).
   Kenney RPG Urban Pack's walk-cycle characters are the starting candidates;
   role accents applied per the art direction.
3. **Movement + interaction:** 4-dir walk, collision, focus highlight,
   `interact` opens conversation with the Clerk or inspection of any record
   prop.
4. **The full conversation flow** per
   [`../game/core-loop.md`](../game/core-loop.md): prompt → three choices +
   typed input field + hesitation timer → why-lines → suspicion/pressure
   updates → NPC reactions (bubbles, markers, one influence line) → route
   terminal panel citing exact ledger entries → instant replay.
5. **All four routes** reachable and meaningfully different (clean cover,
   repair, soft report, hard inquest — inquest transitions to the Station
   room for the citation beat).
6. **Inspection legibility:** record props and reacting NPCs are inspectable
   with 열람/기록/오간 말 details, per pillar 3.

## Technical deliverables

- `godot/` rebuilt as a 2D project per
  [`../tech/godot-2d-client.md`](../tech/godot-2d-client.md) (project
  settings, scene architecture, HUD, localization plumbing KO-only for now).
  v1 3D scenes/scripts deleted in the same PR.
- `world_layout.json` gains its `tile` block; `world_builder_2d.gd` renders
  from it.
- **Asset survey slice first** (see asset pipeline): assemble one test room
  from candidate CC0 packs, screenshot, decide the base pack in the PR.
- Asset pipeline bootstrapped: `godot/assets/kenney2d/` + `godot/assets/greybox/`
  committed, `godot/assets/third_party/` gitignored with `manifest.json` +
  `check_assets.gd`, `docs/art/CREDITS.md` started.
- Runtime: `data/storylets/same-order.json` compiled from the scenario
  packet; sidecar session endpoints
  (`start/answer/decision/snapshot/end`) serving the storylet; agent-loop
  *shape* (context assembly + tool validation + ledger events) driving NPC
  reactions deterministically as a test harness. Begin the keep/trim/retire
  absorption listed
  in [`../tech/npc-runtime.md`](../tech/npc-runtime.md) as these modules are
  touched.
- Smokes: `scene_load_smoke.gd`, `route_smoke.gd` (drives all four routes
  headless via the Session API), `localization_smoke.gd` (KO keys),
  `check_assets.gd`.

## Acceptance

- [ ] All four routes playable by hand and passing `route_smoke.gd`.
- [ ] A player who slips once can find the repair path without docs.
- [ ] Every suspicion change shows a why-line; every ledger event surfaces a
      visible consequence within 1s.
- [ ] Game runs and looks intentional from a fresh clone with committed
      tiers only (CC0 + greybox); no paid or local-only asset is required by
      any scene or smoke.
- [ ] `bun run --cwd backend/npc-runtime check` green; no v1 3D files remain
      under `godot/`.
- [ ] Fun gate answered honestly in the PR.

## Non-goals

EN locale, additional locations beyond the Station intake room, ambient NPC
schedules, save/load, audio beyond trivial CC0 blips,
gamepad support.

Live providers and agent-selected actions are no longer deferred as optional
texture. They are the active M2 foundation.

## Dependencies / notes

- No purchases required. The asset survey slice is the first M1 task; paid
  upgrades are a post-M1 option only if the free tier fails readability.
- Keep sessions restartable in <2s — replay speed is part of the fun gate.
