# Kenney Free Asset Pass

This folder contains a small, curated subset of Kenney CC0 3D assets used by the Godot playable slice.

## Sources

| Folder | Source | Version | License | Local license |
|---|---|---|---|---|
| `city-kit-roads/` | [Kenney City Kit (Roads)](https://kenney.nl/assets/city-kit-roads) | 1.1 | Creative Commons CC0 | `city-kit-roads/LICENSE.txt` |
| `city-kit-commercial/` | [Kenney City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial) | 2.1 | Creative Commons CC0 | `city-kit-commercial/LICENSE.txt` |
| `city-kit-suburban/` | [Kenney City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) | 2.0 | Creative Commons CC0 | `city-kit-suburban/LICENSE.txt` |

Kenney lists these packs as Creative Commons CC0 assets. Attribution is not required by CC0, but source links stay documented here so the free-asset polish pass remains auditable. The original license files are preserved in each asset-pack folder.

## Local Subset

The repo carries only the GLB/glTF files and texture files needed by the current playable slice, not the full upstream downloads.

- `city-kit-roads/`: road pieces, crossings, barriers, construction props, lights, and signs.
- `city-kit-commercial/`: low-detail buildings, skyscraper silhouettes, awnings, overhangs, and parasols.
- `city-kit-suburban/`: trees, fences, planters, driveway slabs, and stone paths.

## Import Rule

- Use GLB/glTF assets for Godot import.
- Keep required texture files beside the GLB files, including `Textures/colormap.png`.
- Do not edit generated `.godot/` import cache files by hand.
- Place instances through `WorldGenerator` under `Generated_FreeAssets` so semantic landmarks, anchors, routes, zones, and text surfaces remain the source of gameplay truth.

## Current Usage

`godot/scripts/world/world_generator.gd` places roads, crossings, side lanes, lights, construction props, signs, awnings, overhangs, parasols, trees, fences, planters, stone paths, low-detail buildings, and backdrop skyscrapers as visual dressing only. These assets do not own Dream Law, Cover Test, Exposure, or Station authority.
