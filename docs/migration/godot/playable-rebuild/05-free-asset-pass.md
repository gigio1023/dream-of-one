# Free 3D Asset Pass

## Goal

Improve the Godot playable slice's visual readability with permissive free 3D assets while keeping gameplay authority in semantic layout data and scripts.

## Sources Researched

| Source | Decision | Reason |
|---|---|---|
| Kenney City Kit Roads | Use | CC0, small download, GLB/glTF format, Godot-compatible city dressing. |
| Kenney City Kit Commercial | Use | CC0, low-poly commercial buildings and storefront details matching Store/Studio/Station. |
| Quaternius free assets | Defer | Also suitable and CC0, but Kenney city packs match this prototype's civic layout with less style mixing. |

## Applied Assets

Assets live under `godot/assets/kenney/`.

- Roads, side lanes, crossings, and barrier road pieces for Civic Loop readability.
- Streetlights, work lights, cones, construction barrier, and street signs for Station pressure.
- Low-detail buildings for Store, Studio, Park, and Station.
- Taller commercial buildings and skyscraper silhouettes for a more game-like city backdrop.
- Awnings, overhangs, and parasols for storefront/park silhouette.

## Godot Integration Pattern

- The assets are GLB files imported by Godot.
- Instances are created in `WorldGenerator` under `Generated_FreeAssets`.
- Each asset instance is tagged with `free_visual_assets`.
- `ShellInspector` fails if fewer than thirty expected visual asset instances are present.
- Landmark proxy volumes remain semantic/collision references but are visually demoted to translucent footprints.

## Non-Goals

- Do not make downloaded assets authoritative for gameplay ids.
- Do not manually place assets in `main.tscn`.
- Do not introduce marketplace addons.
- Do not mix licenses that require attribution into the runtime tree without explicit documentation.
