# Locations And Environmental Story

Detailed placement contracts live in `docs/scenario/content/location-placement-contracts.md`.

## Environment Rule

Every visible object should answer one question:

> What procedure is being performed here, and how can the player violate it?

Free assets are dressing only when they reinforce route, role, pressure, or readable procedure.

## Location Plans

| Location | Story Function | Must Show | Pressure Shift |
|---|---|---|---|
| Store | Ordinary service becomes procedural audit. | queue mark, counter, label board, receipt/print cue. | From service politeness to witness language. |
| Studio | Work claims become approval artifacts. | approval desk, criteria wall, review queue, project board. | From review help to source/owner/reason enforcement. |
| Park | Public normality punishes over-explanation. | notice board, photo spot, bench, public path. | From casual observation to recorded statement. |
| Station | Local records become formal fate. | intake board, waiting line, report desk, evidence surface. | From guidance to comparison to verdict. |

## Spatial Composition

| Element | Rule |
|---|---|
| Text surfaces | Place on approach path before the Cover Test zone, not after it. |
| NPCs | Place examiner NPC so the player sees them before the first prompt. |
| Routes | Use `CivicLoop` as the visible public path; make side wandering feel socially exposed. |
| Props | Cluster props around the rule they support; avoid random decoration. |
| Sightlines | Station should be visible from at least one point near each landmark. |
| Lighting | Use warm public service light at low Exposure, cooler institutional light after intake. |
| Audio | Use quiet public ambience early; introduce paper/printer/fluorescent motifs after records appear. |

## Per-Location Asset Direction

| Location | Free Asset Use | Avoid |
|---|---|---|
| Store | shelves, signs, counter props, receipt-like panels. | supermarket clutter that hides the rule board. |
| Studio | desks, monitor blocks, boards, cables, review markers. | startup-office comedy props. |
| Park | benches, planters, path stones, signs, low fences. | decorative trees that block text surfaces. |
| Station | barriers, light posts, desks, boards, printer-like props. | police action-game language. |

## Exposure-Based Changes

| Exposure Band | Environmental Change |
|---|---|
| 0-39 | Signs are readable, NPCs face their work, lighting is neutral. |
| 40-59 | A subtle receipt/report prop appears near the last failed location. |
| 60-79 | Station-facing light cues become visible; NPC barks mention records. |
| 80-99 | Evidence-board or report-desk emphasis increases; public spaces feel quieter. |
| 100+ | Verdict panel and Station line dominate; other spaces become secondary. |

## Level Script Schema

Use this table for each implemented location:

| Field | Required Content |
|---|---|
| `locationId` | Canon ID from `world_layout.json`. |
| `dreamLawId` | Law taught by the main text surface. |
| `coverTestId` | Cover Test triggered in the zone. |
| `approachRoute` | Route and visual markers that teach the player where to go. |
| `examinerNpcId` | NPC who applies social pressure. |
| `primaryTextSurfaceId` | Text surface read before pressure. |
| `propClusters` | Props that make the procedure visible. |
| `lightingCue` | Low/high Exposure lighting plan. |
| `audioCue` | Ambient and pressure audio motifs. |
| `failureArtifact` | Prop or UI artifact shown after failure. |
