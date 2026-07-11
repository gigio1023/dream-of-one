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

**Decision: one family per layer, greybox architecture.** No CC0 family ships
walk-in modern buildings (city kits are exterior shells or miniature-scale
props), and mixing families *within* a layer is what reads incoherent —
proportions differ across creators more than palettes do. Therefore:

| Layer | Family | Why |
|---|---|---|
| Architecture — walls, doorways, floors of all three interiors, exterior massing | Project greybox | The only route that guarantees enterable interiors, primitive collision shapes, and navmesh-correct doorways sized to the NavigationAgent3D and first-person camera |
| Environment and props — park, street, interior dressing | **Kenney**: [Furniture Kit](https://kenney.nl/assets/furniture-kit) (furniture only), [Nature Kit](https://kenney.nl/assets/nature-kit) (park), [City Kit Roads](https://kenney.nl/assets/city-kit-roads) (street), and [City Kit Commercial](https://kenney.nl/assets/city-kit-commercial) (awning/overhang/parasol trim only) | CC0; GLB imports cleanly in Godot. No City Kit building mesh and no Furniture wall/floor/doorway mesh may own visible architecture or collision; every visible building remains the enterable greybox structure |
| Characters — all six residents | **Quaternius**: [Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) + [Women](https://quaternius.com/packs/ultimatemodularwomen.html) packs | Six unarmed civilian variants (`Casual_2`, `Casual_Hoodie`, and `Worker`; `Casual`, `Formal`, and `Worker`) provide distinct base silhouettes, 24 bundled animations each, and self-contained glTF files. Armed Suit/SWAT variants were rejected for the non-combat town |
| Animation upgrade path | Quaternius [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) free tier (45 anims, on the official Godot store), then [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) (161 anims, CC0) | Both built for engine retargeting (Godot BoneMap + SkeletonProfileHumanoid) |

**Ranked fallback:** if the character gates below fail after one bounded fix
attempt, switch the character layer to
[Kenney Blocky Characters 2.0](https://kenney.nl/assets/blocky-characters),
the creator-listed animated CC0 pack, and accept the toy proportions. Do not
rely on an unverified skin/clip count: inspect the downloaded archive and make
role coverage, idle, and walk pass the same in-engine gate. The environment
layer is unaffected either way; a full-Kenney world is the coherence floor.

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

This slice proves the decision in-engine instead of re-surveying. Sol uses
headless import plus Godot AI's non-play scene/log/snapshot inspection; it
does not drive the game. The final Terra run owns hands-on validation.

Programmatic results on 2026-07-12:

- all 23 curated Kenney models and all six Quaternius characters load as
  `PackedScene`; City Kit palette textures resolve;
- the six character meshes measure 1.843–1.870 m at `1.0×` and every file has
  `Idle` and `Walk` among its 24 animations;
- the single scale contract in `AssetScales` is Furniture `2.0×`, Nature
  `2.5×`, City kits `5.0×`, Characters `1.0×`. This produces a 0.769 m desk,
  4.27 m tree, 5 m road tile, and 2.25 m parasol;
- the test corner has a 1.65 m eye camera, 1.8 m capsule, 1.1 × 2.1 m greybox
  doorway, desk/chair, road, bench, tree, all six characters at park-view
  distance, and an automatic `Idle` → `Walk` doorway pass;
- bundled animations are sufficient, so the conditional retarget gate is not
  entered.

The gates remain:

1. **Scale reference scene** — a 1.8 m capsule, a 2.1 m doorway, a desk;
   measure each family against it and keep the four validated multipliers in
   `AssetScales`; per-model scale exceptions are forbidden.
2. **Import gate** — `$GODOT_BIN --headless --import` clean on every pack;
   GLB materials and textures resolve. Some Kenney kits carry the palette
   texture separately — assign once per kit, not per model.
3. **Character gate** — six unarmed residents are distinguishable at park
   distance (the art-direction bar); `Walk`/`Idle` loops play in Godot 4.7. A
   separate conversation animation is optional. Headless import and animation
   transition pass; final visual readability remains for Terra-high hands-on
   acceptance.
4. **Retarget gate (conditional)** — only if bundled animations are
   insufficient: BoneMap + SkeletonProfileHumanoid auto-maps on the
   Quaternius rig and one external clip plays without limb distortion. Godot's
   [4.7 retargeting guide](https://docs.godotengine.org/en/4.7/tutorials/assets_pipeline/retargeting_3d_skeletons.html)
   requires compatible bone names *and rest transforms*; auto-mapping warnings
   do not block import, so visible limb validation remains mandatory.
5. **Test corner** — park bench + road + greybox studio doorway + one character
   transitioning from idle to walking through the door. Sol may take only a
   non-play editor snapshot. Hands-on traversal, silhouette judgment, and
   clipping acceptance occur only in the final Terra-high run.

If gates 3–4 fail after one bounded fix attempt, apply the ranked fallback
and record why in the PR. The decision section above is then updated in the
same commit — it stays the single record of the choice.

## Greybox rules

- Flat fills + label, on the family's proportions and grid, using the accent
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

## Audio

Same tiering: CC0/CC-BY packs committed with licenses; restricted packs
local-only. M3R lands the SFX/ambience set (footsteps, doors, park murmur,
record-scribble cue); BGM waits for M5.
