# Asset Pipeline

> Rewritten 2026-07-11 for the first-person 3D conversion. The 2D tile/sprite
> pipeline this replaces lives in git history; its licensing tiers and
> survey-first method carry over unchanged.

Strategy: **free-first**. The M3R world builds from CC0 3D packs mixed with
authored greybox volumes; paid packs are an optional later upgrade considered
only if the free tier demonstrably fails the readability bar. No purchase is
a prerequisite for any milestone.

## Sources and licensing tiers

| Tier | Source | License | Git policy |
|---|---|---|---|
| **Committed base (CC0)** | Kenney 3D kits (e.g. [City Kit suburban/commercial](https://kenney.nl/assets?q=3d), Furniture Kit, Mini Characters), [Quaternius](https://quaternius.com/) packs, [KayKit](https://kaylousberg.itch.io/) CC0 packs | CC0 | Committed under `godot/assets/kenney3d/`, `godot/assets/quaternius/`, etc., each with its license file |
| **Committed greybox** | Project-authored placeholder volumes/materials (flat-color, labeled) | Project-owned | Committed under `godot/assets/greybox/` |
| **Local free (restricted)** | Free packs whose license forbids redistribution | Free; commercial OK; **no redistribution** | **Never committed** (public repo). `godot/assets/third_party/` (gitignored) |
| **Paid upgrade (optional, deferred)** | e.g. Synty low-poly packs | Paid; no redistribution | Same gitignored path; buy only after the free tier provably fails |

Rules (unchanged):

- This is a public repository. Any pack whose license forbids redistribution
  stays inside gitignored paths — committing it is a license violation.
- Every committed pack ships its license file next to the assets.
- Every third-party pack (committed or local) gets a manifest row.
- Credits: maintain `docs/art/CREDITS.md` (credit even CC0 sources).

## M3R asset family decision (researched 2026-07-11, validated 2026-07-12)

Recorded so the in-engine validation slice starts from a decision, not a
blank survey. Licenses, formats, and pack contents below were verified on the
creators' own pages and the curated subset was imported in Godot 4.7. The
remaining visual judgment is named in the validation section.

**Decision: fixed greybox architecture, permissive CC0 dressing.** No surveyed
CC0 family ships all of the walk-in modern buildings this game needs, so
greybox remains authoritative for architecture, collision, portals, and
navigation. The owner prefers a visibly occupied low-fi town to strict family
coherence, so the dressing layer may repeat assets and mix creator-sourced,
license-verified CC0 packs after their scale is measured in-engine.

| Layer | Family | Why |
|---|---|---|
| Architecture — walls, doorways, floors of all three interiors, exterior massing | Project greybox | The only route that guarantees enterable interiors, primitive collision shapes, and navmesh-correct doorways sized to the NavigationAgent3D and first-person camera |
| Environment and props — park, street, interior dressing | Already imported **Kenney** Furniture, Nature, City Roads, and City Commercial as the base; **Quaternius**, **KayKit**, or another official-source CC0 pack may supplement it | Density outranks family purity. Every added family needs a preserved license, manifest/Credits entry, clean Godot import, and one measured family scale. No kit building mesh or furniture wall/floor/doorway mesh may own gameplay architecture or collision |
| Characters — all six residents | **Quaternius**: [Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) + [Women](https://quaternius.com/packs/ultimatemodularwomen.html) packs | Six unarmed civilian variants (`Casual_2`, `Casual_Hoodie`, and `Worker`; `Casual`, `Formal`, and `Worker`) provide distinct base silhouettes, 24 bundled animations each, and self-contained glTF files. Armed Suit/SWAT variants were rejected for the non-combat town |
| Animation upgrade path | Quaternius [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) free tier (45 anims, on the official Godot store), then [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) (161 anims, CC0) | Both built for engine retargeting (Godot BoneMap + SkeletonProfileHumanoid) |

**Ranked fallback:** if the character gates below fail after one bounded fix
attempt, switch the character layer to
[Kenney Blocky Characters 2.0](https://kenney.nl/assets/blocky-characters),
the creator-listed animated CC0 pack, and accept the toy proportions. Do not
rely on an unverified skin/clip count: inspect the downloaded archive and make
role coverage, idle, and walk pass the same in-engine gate. The permissive
environment-dressing decision is unaffected either way.

**Top known risk:** no candidate pack confirms a talk/gesture loop by name.
Resolution order: use idle for speech → repurpose a bundled wave/interact/sit
clip when it imports cleanly → retarget an external library only after the
social loop is playable. The record-scribble sound plus reaction marker is the
accepted fallback for writing activity; animation polish cannot block M3R.

License rules the research made binding:

- Download from the creators' own sites, not aggregators — poly.pizza
  mislabels some CC0 Quaternius models as CC-BY. Manifest rows cite the
  creator's license page.
- **Never committable** (local gitignored tier only): Mixamo (no standalone
  redistribution of characters/animations), Synty including free packs (EULA
  forbids sharing source files), Denys Almaral packs (no file
  redistribution).
- Paid-tier remainders (Quaternius Pro/Source, KayKit Extra, Kenney paid
  packs) stay local-tier until their license text is verified.
- The Women archive's license copy incorrectly names “Ultimate Modular Males.”
  Preserve that upstream file verbatim and pair it with the official Women
  source page, which identifies the pack as CC0; do not silently rewrite
  third-party license text.

## M3R validation slice (first art task of the conversion)

This slice proves the decision in-engine instead of re-surveying. Headless
import and Godot AI scene/log/snapshot inspection establish the mechanical
baseline. A native in-session GPT-5.6 Sol ultra child with exclusive run
ownership performs the bounded hands-on Qwen-live validation.

Programmatic results through 2026-07-13:

- all 23 curated Kenney models, the 17 selected KayKit Furniture Bits models,
  the ten selected KayKit Prototype Bits models, the eight selected KayKit
  City Builder Bits models, and all six Quaternius characters load as
  `PackedScene`; their shared palette textures resolve;
- the six character meshes measure 1.843–1.870 m at `1.0×` and every file has
  `Idle` and `Walk` among its 24 animations;
- the single scale contract in `AssetScales` is Kenney Furniture `2.0×`,
  Nature `2.5×`, City kits `5.0×`, KayKit Furniture `1.0×`, KayKit City
  `5.0×`, KayKit Prototype `1.0×`, and Characters `1.0×`. This produces a
  0.769 m desk, 4.27 m tree, 5 m road tile, 2.25 m parasol, a 1.224 m KayKit
  armchair, a 1 m Prototype barrel, and roughly 4 m KayKit hatchback;
- the test corner has a 1.65 m eye camera, 1.8 m capsule, 1.1 × 2.1 m greybox
  doorway, desk/chair, road, bench, tree, all six characters at park-view
  distance, and an automatic `Idle` → `Walk` doorway pass;
- bundled animations are sufficient, so the conditional retarget gate is not
  entered.

The gates remain:

1. **Scale reference scene** — a 1.8 m capsule, a 2.1 m doorway, a desk;
   measure each family against it and keep the seven validated multipliers in
   `AssetScales`; per-model scale exceptions are forbidden.
2. **Import gate** — `$GODOT_BIN --headless --import` clean on every pack;
   GLB materials and textures resolve. Some Kenney kits carry the palette
   texture separately — assign once per kit, not per model.
3. **Character gate** — six unarmed residents are distinguishable at park
   distance (the art-direction bar); `Walk`/`Idle` loops play in Godot 4.7. A
   separate conversation animation is optional. Headless import and animation
   transition pass; final visual readability remains for the bounded native
   Sol-ultra hands-on acceptance.
4. **Retarget gate (conditional)** — only if bundled animations are
   insufficient: BoneMap + SkeletonProfileHumanoid auto-maps on the
   Quaternius rig and one external clip plays without limb distortion. Godot's
   [4.7 retargeting guide](https://docs.godotengine.org/en/4.7/tutorials/assets_pipeline/retargeting_3d_skeletons.html)
   requires compatible bone names *and rest transforms*; auto-mapping warnings
   do not block import, so visible limb validation remains mandatory.
5. **Test corner** — park bench + road + greybox studio doorway + one character
   transitioning from idle to walking through the door. Non-play snapshots are
   supporting evidence; hands-on traversal, silhouette judgment, and clipping
   acceptance occur in the final native Sol-ultra run.

If gates 3–4 fail after one bounded fix attempt, apply the ranked fallback
and record why in the PR. The decision section above is then updated in the
same commit — it stays the single record of the choice.

## Greybox rules

- Flat fills + label, on validated human-scale proportions and grid, using the accent
  palette from [`art-direction.md`](art-direction.md). Deliberately plain so
  real assets read as an upgrade, never a clash.
- Interaction-critical surfaces (reception desk, dossier table, notice
  board) may stay greybox longest — their readability comes from silhouette
  and placement.

## Third-party manifest

`godot/assets/third_party/manifest.json` (committed even when assets are
not) records name, source URL, version/date, license summary, install path.
`godot/tools/check_assets.gd` verifies the declared licenses and curated files;
`asset_validation_smoke.gd` proves import, materials, scales, and animation.
The game must run with `third_party/` absent — committed tiers only, uglier
but functional. CI and headless smokes never depend on local-tier assets.

## Import conventions

- glTF (`.glb`, plus the selected self-contained character `.gltf` files) as
  the interchange format — Godot 4.7's
  [recommended 3D scene format](https://docs.godotengine.org/en/4.7/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html);
  imported scenes inherit a shared
  base material setup; collision generated or authored per kit convention,
  verified in the validation slice.
- Characters: shared `SkeletonProfile`-compatible rigs where the family
  allows. Preserve imported `Idle`/`Walk` clip names; the NPC wrapper exposes
  canonical `idle`/`walk` states to gameplay code.
- Apply only the multipliers in `AssetScales`; never “fix” an individual prop
  by eye with a one-off scale.
- Naming: `snake_case`, prefix by theme (`studio_desk`, `station_dossier`).
- Engine-practice details (import flags, LOD, lightmap choices) follow the
  repo's `godot-best-practice` skill at implementation time.

## Bundled export fonts

Exports use three Regular, single-face files from the official Noto CJK
`Sans/SubsetOTF` tree at revision
`f8d157532fbfaeda587e826d4cd5b21a49186f7c`: KR for `ko`, `en`, `it`, and
`fr`; SC for `zh`; and JP for `ja`. They live under
`godot/assets/fonts/noto_sans_cjk/` with the upstream OFL-1.1 text. Their
per-file and license SHA-256 values are recorded in the third-party manifest
and [`CREDITS.md`](CREDITS.md).

The locale autoload wraps the regional face as the primary font, with the other
two files available only for missing scripts such as the six-language picker.
It assigns that selection to `ThemeDB`, the shared HUD theme, and the HUD's
runtime UI-scale theme copy. Shared onboarding controls inherit the theme;
an unthemed runtime `Control` can opt in through
`Localization.apply_export_font()`.
Because the locale's own face is always primary, overlapping Han glyphs do not
fall through to the wrong region. Do not replace this with a fixed CJK fallback
order or a platform font: the first face in a fixed chain already contains the
overlapping glyph, and system availability differs between exports.

## Audio

Same tiering: CC0/CC-BY files may be committed with their licenses; restricted
packs stay local-only. The landed M3R baseline generates its footsteps, small
prop impact, park ambience, shared interior room tone, and record-scribble cue
deterministically in project code. This makes the current set project-owned,
portable, and independent of an audio download. The town has permanently open
portals, so it needs no door sound. The procedural spatial speech blip already
in `npc_3d.gd` remains the speech cue; do not replace working project audio
without a measured play reason. BGM waits for M5.

The optional higher-fidelity replacement shortlist was rechecked against
creator or individual source pages on 2026-07-12:

| Need | First source | License and selection rule |
|---|---|---|
| Footsteps | [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | 50 CC0 files, officially tagged `footstep`/`foley`; select 2–4 neutral variants, not a surface-material system. |
| Pick/place/throw impact | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | 130 CC0 files; select 2–3 small dull impacts. |
| Park loop candidate | [Local Park Sound Ambience](https://freesound.org/s/265046/) | Individual sound is CC0, 19.815-second stereo WAV. Audition and make a clean loop before adoption. |
| Interior loop candidate | [Office Room Tone](https://freesound.org/s/278154/) | Individual sound is CC0, 30.275-second mono WAV; reuse quietly in all three interiors. |
| Record cue candidate | [Draw & Trace — Pencil](https://freesound.org/s/753216/) | Individual sound is CC0, clean mono recording; extract only one short scribble cue. |

Freesound is not a single-license catalog. Recheck the chosen sound's own CC0
page at download time and record its author, source URL, original filename, and
date in the existing manifest and Credits. Download and commit only the chosen
files plus license evidence, never a whole audio bundle.

The export-font source, license, regional mapping, and glyph coverage are now
bundled and checked by the asset and localization smokes. Replace the
procedural audio only when live play demonstrates a concrete quality problem;
then audition ambience by a clean loop seam, repetition fatigue over a 30–60
minute run, absence of intelligible speech or strong location signatures, and
its ability to stay below NPC utterances. Blend park and interior loops gently
across permanently open portals; a hard zone switch would falsely imply a
closed door.

The current density passes repeat the 23 committed Kenney models across the
park, street, and three interiors and mix in models from
[KayKit Furniture Bits](https://kaylousberg.itch.io/furniture-bits) Free 1.0.
The committed Furniture selection contains 17 models: the original seating,
tables, lamps, cabinet, and books plus small books, cabinets, plants, picture
frames, rugs, and shelving. The mixed-asset child scene currently uses the
small books, plants, frames, rugs, and lamps to break up empty floors, desks,
and walls. The curated models, shared texture, and upstream CC0 license live
under `godot/assets/kaykit/furniture_bits/`; Godot 4.7 import, texture, and
`1.0×` family-scale checks pass. Ten models from
[KayKit Prototype Bits](https://kaylousberg.itch.io/prototype-bits) Free 1.1
extend the same palette with barrels, boxes, cans, decorated pallets, and a
decorated table at `1.0×`. The current scene uses barrels and boxes inside
existing solid service-corner footprints and keeps collisionless cans in
low-traffic interior corners; larger pallets and the table remain available
for later collision-aware placement. Only that portable clutter, its shared
texture, and the verbatim CC0 license live under
`godot/assets/kaykit/prototype_bits/`; architecture, targets, dummies, the full
archive, and paid-tier files are excluded. Exterior dressing also has eight
CC0 models from
[KayKit City Builder Bits](https://kaylousberg.itch.io/city-builder-bits) Free
1.0: two stationary cars, a dumpster, fire hydrant, streetlight, traffic light,
and two small trash shapes. Only those model pairs, their shared texture, and
the upstream license are committed under
`godot/assets/kaykit/city_builder_bits/`; all building, base, and road meshes
are excluded. Their measured family multiplier is `5.0×`; the imported scenes
remain render-only, while the town supplies project-owned primitive blockers
for cars, dumpsters, and posts and leaves only loose trash collisionless. A
later official-source CC0 pack remains allowed when it adds a useful silhouette
without changing architecture, but it cannot block this pass. Keep only used
files plus license evidence. T8's deliberately tiny pick/move/throw set uses
the committed Kenney
`computer_keyboard.glb`, `potted_plant.glb`, and one project-greybox box; only
interactive props need wrapper scenes. Do not install an asset-placement or
first-person-controller addon: the current editor-authored town, Godot AI
workflow, interaction ray, and controller already own those jobs.
