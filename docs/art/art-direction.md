# Art Direction

> Rewritten 2026-07-11 for the first-person 3D conversion (owner direction in
> [`../vision/design-pillars.md`](../vision/design-pillars.md)). The 2D
> pixel-art direction this replaces lives in git history.

## Direction in one line

A stateless administered district in deliberately modest low-poly 3D — an
ordinary, slightly-too-tidy small town whose surveillance pressure reads
through composition, subtitles, and UI, not through fidelity or grimdark
palette.

Setting note (unchanged, decided 2026-07-10): the town is a **placeless
administrative zone** — no real-world country markers, generic-modern
signage, institutional naming (구역/스테이션 numbering). Korean remains the
authoring language of all content; the place stays unlocatable, which keeps
all six target localizations culturally neutral and fits the dream-logic
undertone.

## Camera and world

- First-person camera with conservative comfort-first movement
  ([`../tech/godot-3d-client.md`](../tech/godot-3d-client.md)).
- One seamless tiny map: central park, three enterable single-story
  buildings (studio reception, office, Station), connective street space.
  Every visible building is enterable; the map closes with vegetation,
  walls, terrain, and sightlines — never fake facades.
- Human scale matters more than detail: door heights, desk heights, and
  walking distances should feel ordinary, because the fantasy is being an
  ordinary person in an ordinary place.

## The quality bar (and what it is not)

The owner explicitly accepts visibly free, low-quality assets. The bars that
do gate:

- **One coherent asset family per layer.** All architecture from greybox,
  all environment/props from one modular free family, all six residents
  from one character family ([`asset-pipeline.md`](asset-pipeline.md)
  records the chosen families); a style clash breaks the fiction faster
  than plainness does, and mixing *within* a layer — where proportions
  diverge — is what clashes.
- **Collision and navigation correctness.** Nothing player-visible clips,
  floats, or blocks a doorway.
- **Role readability.** The six residents are distinguishable at park
  distance by silhouette plus one accent color per role — before any
  nameplate.
- **Social-state legibility.** Attention, speech, and record activity read
  in-world: subtitle attribution, reaction markers, and a visible record cue.
  A writing pose is welcome when the chosen rig already supports it; the
  record-scribble sound plus marker is the accepted low-fi fallback, so
  retargeting polish never blocks the LLM social loop.

Fidelity, asset uniqueness, and lighting sophistication are explicitly not
gates and never justify a slice.

## Look rules

- **Warm base, cold authority.** Ordinary spaces use the asset family's
  natural warm/neutral palette; Station elements (officer accent, citation
  surfaces, hearing room) carry the game's only systematic cold blue-grey.
  Suspicion UI borrows this accent as pressure rises.
- **Greybox is a citizen.** Missing pieces ship as deliberately plain,
  labeled greybox volumes on the family's proportions
  ([`asset-pipeline.md`](asset-pipeline.md)) rather than style-clashing
  imports.
- **No horror styling** — dread comes from procedure and attention, not
  darkness. Daylight town, legible interiors.

## UI

- Diegetic-leaning, world-first HUD: direction-aware subtitles for audible
  speech, a modal conversation surface that keeps the speaker centered,
  quiet nameplates, coarse `oppose / uncertain / vouch` stance summaries and
  one institutional-pressure line, plus the records/open-questions log behind
  `Tab`. Numeric suspicion is inspect/debug information, not a normal HUD
  gauge. Settings live behind Esc.
- Typography: regular (non-pixel) KO-capable fonts at comfortable PC
  density, user-adjustable UI scale — carried from the M2 playtest fixes.
  One accent face for Station officialese.

## Anti-goals

- No fidelity race, no bespoke-art slices before M5 polish, no mixed asset
  families within one layer (the per-layer split and greybox are by
  design).
- No darkness-as-mood; no camera effects that fight comfort (head-bob off by
  default, no forced FOV changes outside deliberate conversation framing).
