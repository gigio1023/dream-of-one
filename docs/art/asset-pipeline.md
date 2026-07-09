# Asset Pipeline

## Sources and licensing tiers

| Tier | Source | License | Git policy |
|---|---|---|---|
| **Committed base** | Kenney 2D packs (e.g. RPG Urban Pack, UI packs) | CC0 | Committed under `godot/assets/kenney2d/` with the pack's `License.txt` |
| **Local licensed** | LimeZu Modern Interiors / Modern Exteriors / Modern User Interface (itch.io, a few USD each) | Paid; commercial use OK with credit; **redistribution forbidden** | **Never committed** (public repo). Lives in `godot/assets/third_party/` (gitignored) |
| **Bespoke** | Project-drawn sprites/UI | Project-owned | Committed |

Rules:

- This is a public repository. Any pack whose license forbids redistribution
  must stay inside gitignored paths — committing it is a license violation.
- Every committed pack ships its license file next to the assets.
- Every third-party pack (committed or local) gets a row in the manifest
  below. No untracked-provenance assets.
- Credits: maintain `docs/art/CREDITS.md` from M1 (LimeZu requires credit;
  Kenney credit is courtesy).

## Third-party manifest

`godot/assets/third_party/manifest.json` (committed even though the assets
are not) records for each local pack: name, source URL, version/date
purchased, license summary, install path. A setup script
(`godot/tools/check_assets.gd`, M1 scope) verifies presence and prints
purchase links for anything missing, so a fresh clone knows exactly what to
buy/download (~$10 total for the LimeZu set).

## Fallback rule

The game must *run* without the local licensed tier: if
`godot/assets/third_party/` is absent, scenes fall back to the committed
Kenney/bespoke tier (uglier but functional). CI and headless smokes therefore
never depend on paid assets. Screenshots for public pages always use the full
tier.

## Import conventions

- Godot import defaults for pixel art: filter off, mipmaps off; textures
  imported as `CanvasTexture`/atlas as appropriate.
- TileSets are built as Godot `TileSet` resources per location theme
  (interior-store, interior-station, exterior-street, park), sourcing regions
  from pack atlases; physics/navigation/occlusion layers configured on the
  TileSet, not per-scene.
- Character sprites: `SpriteFrames` resources with `walk_{down,up,left,right}`
  + `idle_*` animations at consistent FPS; one scene per role inheriting a
  base `npc_2d.tscn`.
- Naming: `snake_case`, prefix by theme (`store_counter`, `station_dossier`).

## Audio (deferred to M4)

Same tiering: CC0/CC-BY packs committed with licenses; paid packs local-only.
No audio work before M4 except a single interaction click and conversation
blip set in M1 if trivially available from Kenney (CC0).
