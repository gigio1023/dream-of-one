# Asset Pipeline

Strategy: **free-first**. M1 builds from CC0/free packs mixed with authored
greybox placeholders; paid packs are an optional later upgrade, considered
only if the free tier demonstrably fails the readability bar. No purchase is
a prerequisite for any milestone.

## Sources and licensing tiers

| Tier | Source | License | Git policy |
|---|---|---|---|
| **Committed base (CC0)** | Kenney packs — primary candidate: [RPG Urban Pack](https://kenney.nl/assets/rpg-urban-pack) (480+ 16×16 town tiles **plus 6 characters with 4-direction walk cycles**); also [Roguelike Modern City](https://kenney.nl/assets/roguelike-modern-city), Kenney UI packs | CC0 | Committed under `godot/assets/kenney2d/` with each pack's license file |
| **Committed greybox** | Project-authored placeholder tiles/sprites (flat-color, labeled) | Project-owned | Committed under `godot/assets/greybox/` |
| **Local free (restricted)** | Free packs whose license forbids redistribution (e.g. LimeZu Modern Interiors free sample) | Free; commercial OK; **no redistribution** | **Never committed** (public repo). Lives in `godot/assets/third_party/` (gitignored) |
| **Paid upgrade (optional, deferred)** | LimeZu Modern Interiors/Exteriors/UI full versions (~$10 total) | Paid; credit required; no redistribution | Same gitignored path; buy only after M1 proves the free tier insufficient |

Rules:

- This is a public repository. Any pack whose license forbids redistribution
  stays inside gitignored paths — committing it is a license violation.
- Every committed pack ships its license file next to the assets.
- Every third-party pack (committed or local) gets a row in the manifest.
- Credits: maintain `docs/art/CREDITS.md` from M1 (credit even CC0 sources as
  courtesy).

## M1 asset survey (first M1 task)

Before scene work, run a short survey slice: pull the candidate CC0 packs,
assemble one test room (store corner: counter, shelf, door, one NPC walking),
and screenshot it. Decide the base pack from evidence, record the decision
and screenshot in the M1 PR, and fill the manifest. Candidates to start from:
Kenney RPG Urban Pack, Kenney Roguelike Modern City, plus a sweep of
[itch.io CC0 top-down packs](https://itch.io/game-assets/assets-cc0/tag-top-down)
for interior/props gaps. Greybox fills whatever the packs lack — a labeled
flat-color tile is better than a style-clashing import.

## Greybox rules

- Greybox tiles are flat fills + 1px border + text label, on the same 16×16
  grid, using the palette accents from
  [`art-direction.md`](art-direction.md). They must be deliberately *plain*,
  not stylized, so real art reads as an upgrade, never a clash.
- Record props may stay greybox longest — their readability comes from
  silhouette + state label, and they are the props most likely to need
  bespoke art eventually.

## Third-party manifest

`godot/assets/third_party/manifest.json` (committed even when the assets are
not) records for each local pack: name, source URL, version/date, license
summary, install path. `godot/tools/check_assets.gd` (M1 scope) verifies
presence and prints download links for anything missing. The game must run
with `third_party/` absent — committed tiers only, uglier but functional.
CI and headless smokes never depend on local-tier assets.

## Import conventions

- Godot import defaults for pixel art: filter off, mipmaps off.
- TileSets are built as Godot `TileSet` resources per location theme
  (interior-store, interior-station, exterior-street, park), sourcing regions
  from pack atlases; physics/navigation/occlusion layers configured on the
  TileSet, not per-scene.
- Character sprites: `SpriteFrames` resources with `walk_{down,up,left,right}`
  + `idle_*` animations at consistent FPS; one scene per role inheriting a
  base `npc_2d.tscn`.
- Naming: `snake_case`, prefix by theme (`store_counter`, `station_dossier`).

## Audio (deferred to M4)

Same tiering: CC0/CC-BY packs committed with licenses; restricted packs
local-only. No audio work before M4 except a single interaction click and
conversation blip set if trivially available from Kenney (CC0).
