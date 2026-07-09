# M1 — 2D Playable Slice

**Status: next.** First implementation milestone of v2.

## Goal

The `Same Order` (같은 주문) storylet is fully playable as a 2D top-down game
with real licensed art: walk into the store, get questioned, answer through
choices or typed input, watch suspicion travel, reach any of the four routes,
replay. Deterministic only (no live provider — that's M2). This retires the
two biggest reboot risks: "2D doesn't carry the feeling" and "the core loop
isn't fun."

## Player-visible deliverables

1. **The store scene**, built from the asset pipeline's committed tier and
   local licensed tier: store interior + entrance street strip, counter,
   usual-order cue, receipt tray, correction slip, report tray, queue marker,
   and a doorway to a minimal Station intake room (inquest terminal scene).
2. **Five characters** with real sprites and role accents: player, Store
   Clerk, Store Manager, Waiting Customer, Station Officer (Station room
   only).
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
- Asset pipeline bootstrapped: `godot/assets/kenney2d/` committed,
  `godot/assets/third_party/` gitignored with `manifest.json` +
  `check_assets.gd`, `docs/art/CREDITS.md` started.
- Runtime: `data/storylets/same-order.json` compiled from the scenario
  packet; sidecar session endpoints
  (`start/answer/decision/snapshot/end`) serving the storylet; agent-loop
  *shape* (context assembly + tool validation + ledger events) driving NPC
  reactions deterministically. Begin the keep/trim/retire absorption listed
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
- [ ] Game runs from a fresh clone without paid assets (fallback tier) and
      looks right with them.
- [ ] `npm run check` green; no v1 3D files remain under `godot/`.
- [ ] Fun gate answered honestly in the PR.

## Non-goals

Live providers, EN locale, additional locations beyond the Station intake
room, ambient NPC schedules, save/load, audio beyond trivial CC0 blips,
gamepad support.

## Dependencies / notes

- Purchase/download the LimeZu set (~$10) before scene work; manifest first.
- Keep sessions restartable in <2s — replay speed is part of the fun gate.
