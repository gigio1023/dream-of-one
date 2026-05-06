# Level And Environment Design

## Purpose

The 3D hub must teach procedure spatially. It should not look like a tutorial sandbox with props sprinkled around. The player should understand where authority is, where the next public rule is, and who can record them.

## Spatial Thesis

The hub is one civic loop:

```text
Station -> Store -> Studio -> Park -> Station
```

Station remains the authority landmark from most sightlines. Store, Studio, and Park are pressure stations around that landmark, not disconnected mini-levels.

## Social-Space Categories

| Category | Dream of One Use | Risk Rule |
|---|---|---|
| Public | Hub center, main paths. | Safe orientation and route reading. |
| Public purpose | Crosswalks, route strips, approach paths. | Suggests correct movement without pressure. |
| Public rule | Store queue, Park notice path, Station exterior board. | Rule visible before social pressure. |
| Private professional | Studio review desk, Station report desk. | Purpose-bound answers required. |
| Private personal | Deferred. | Avoid in small release; too expensive for scope. |

## Rule-Before-Risk Layout

Every pressure location must stage three zones in this order:

1. Public approach.
2. Readable rule surface.
3. Cover Test/work anchor.

No NPC pressure, evidence prop, or invisible trigger may sit between the player and the rule surface.

## Landmark Requirements

| Location | Silhouette | Color/Light | Props | Rule Surface |
|---|---|---|---|---|
| Station | tall institutional header, barriers, intake window. | amber/white civic light. | forms, queue posts, evidence board. | intake rules, report desk notice, final notice. |
| Store | awning, counter, queue rail. | cooler blue storefront with warm counter. | labels, receipt printer, baskets. | queue and label rules. |
| Studio | overhang, review desk, criteria wall. | violet/neutral office light. | project board, approval stamps, source cards. | source/owner/reason criteria. |
| Park | open low shape, fence/gate, notice board. | green/soft public light, Station visible beyond. | bench, route sign, camera/photo spot. | public-flow notice. |

## Wayfinding Rules

- First 15 seconds: player sees Station sign, intake board, Officer silhouette, and Store route cue.
- Add visual beats every 6-8 meters on long routes: sign, light pool, crosswalk mark, paper trail, or route stripe.
- Use contrast in shape, light, and movement before adding HUD arrows.
- Keep hub center mostly open so institutions remain readable.
- Do not make decorative clutter compete with rule boards.

## Lighting Rules

Use a four-pass lighting plan:

1. Global civic dusk/neutral base.
2. Critical path lights for doors, boards, and counters.
3. Cover Test light pools around interaction anchors.
4. Restrained mood detail.

Godot implementation should use a deliberate `WorldEnvironment`, `DirectionalLight3D`, local lights for rule surfaces, and performance-conscious post-processing. Do not rely on the editor preview sun/environment for runtime.

## Environmental Storytelling Rules

Prop clusters must answer at least one question:

- What rule applies here?
- Who records the player?
- What Evidence can be produced?
- How can the player repair a record?

Decorative-only props belong on edges and backgrounds, not between the player and readable procedure.

## Screenshot Targets

The small release needs five representative screenshots/GIF captures:

| Shot | Must Show |
|---|---|
| Station opening | Station board, Officer silhouette, route cue, HUD. |
| Store queue | queue rail, label board, Clerk, speech choice. |
| Studio review | criteria wall, PM, approval artifact, Evidence delta. |
| Park public flow | notice board, route path, Witness, Station sightline. |
| Station return | report desk, Evidence list, why-line, outcome pressure. |

## Godot 3D Implementation Notes

- Use named anchors in `godot/data/world_layout.json`; avoid raw coordinate-only placement.
- Missing required anchors should fail generation or inspection.
- Generated worlds need inspection cameras for screenshots.
- Movement and NPC placement should be validated through scene smoke plus visual capture.
- Text boards need stable dimensions, high contrast, and localization-safe layout.

## Go/No-Go

The hub is release-acceptable only when a blind player can navigate the route and identify each location's rule without reading external docs.
