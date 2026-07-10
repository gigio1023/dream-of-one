---
name: dream-godot-client
description: Use when changing dream-of-one's Godot client under godot/ — scenes, tilemaps, actors, HUD, conversation panel, input, presentation scale, assets, or headless smokes. Triggers include "HUD", "conversation panel", "tilemap", "output preset", "speech bubble", "reaction marker", and "scene smoke". NOT for suspicion/record/session logic (dream-npc-runtime), Korean wording and tone (dream-content-authoring), or engine-generic Godot questions.
---

# Dream of One — Godot Client

Change the 2D client under `godot/` (Godot 4.7.x stable, launched via
`GODOT_BIN`) while keeping it a pure presentation layer. Paths below are
from the repository root. This skill carries the repo's contracts; engine
technique itself belongs to a general Godot skill when one is installed.

## Presentation-Only Boundary

The client renders state, captures input, and forwards player actions to
the runtime sidecar over the Session API. It never computes suspicion,
records, verdicts, or session end. If a change needs new truth, it belongs
in `backend/npc-runtime` (see the dream-npc-runtime skill); the client
renders what comes back.

## Scale Domains (fragile — keep exact)

- World: fixed 640×360 `SubViewport`, nearest-neighbor filtered,
  integer-scaled. Output presets 1280×720 (2×), 1920×1080 (3×, default),
  2560×1440 (4×), 3840×2160 (6×). Minimum window 1280×720; pixel snap on.
- HUD: native-resolution `Control` hierarchy outside the world viewport.
  Anchors and containers determine layout — never manually scaled world
  coordinates.
- Generated conversation text grows its panel to a capped height, then
  scrolls internally; it must not push response controls off-screen.

## Information Policy

Normal play always shows: NPC identity/role, current speech bubble, a short
reaction marker, and the NPC's current social action. Influence lines and
action source appear briefly when an event lands, then clear. Judgment
reasons, record contents, and causality chains live in inspect/ledger
views. Raw ids, collision, sensing, and raw state sit behind F3 debug — and
no debug overlay may be required to understand normal play.

Every consequence surfaces within 1s of its ledger event; no silent state
changes. Full keyboard-only play is a standing requirement.

## Assets

- Tiers and licensing: `docs/art/asset-pipeline.md`. Committed CC0
  (`godot/assets/kenney2d/`) and project greybox; redistribution-restricted
  packs live only in gitignored `godot/assets/third_party/` (the manifest
  stays tracked). The game must run with `third_party/` absent.
- After a fresh clone, branch switch, or engine change, run the headless
  import before judging visuals. A field of role-accent rings means
  textures are not imported — verify import and `check_assets.gd` before
  touching scene or art code.

## Verification

```bash
$GODOT_BIN --headless --import --path godot
DREAM_SESSION_MODE=fixture $GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
```

Full smoke list (route, localization, assets) and policy:
`docs/tech/verification.md`. Resist adding smokes without a regression that
demands one. For player-facing changes, actually play the affected flow and
record the fun-gate answer in the PR; visual changes get one before/after
screenshot pair from the running game.

## Read Before Editing

| Doc | When |
|---|---|
| `docs/tech/godot-2d-client.md` | scene architecture, input map, HUD rules, smokes |
| `docs/art/art-direction.md` | look rules, palette, readability |
| `docs/art/asset-pipeline.md` | asset sourcing, licensing, import conventions |
| active milestone under `docs/plan/` | current scope and acceptance |

## Gotchas

- No machine-specific absolute paths; use `GODOT_BIN` and repo-relative
  paths. `godot/.godot/` is generated cache, never source.
- Player-facing strings go through the translation system with keys mapped
  to content data — never hardcoded text (wording rules:
  dream-content-authoring skill).
- Fixture replay is smoke-only (`DREAM_SESSION_MODE=fixture`); normal
  launch uses the HTTP/provider path.
- No 3D return, no mixed pixel densities, no HD-2D lighting.
