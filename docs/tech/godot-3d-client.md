# Godot 3D Client

Target: Godot 4.7.x stable (keep `GODOT_BIN` per device). **Status: the M3R
spatial foundation, first run-backed social contact, authoritative
clock/schedule movement, first overheard NPC meeting, and six-resident event
dispatch surface have landed as the default 3D client beside the retained 2D
harness
([`../plan/m3-first-person-town.md`](../plan/m3-first-person-town.md)).**
`res://scenes/main_3d.tscn` now provides the whole-town greybox, dressed park
and studio, first-person controller, permanently open building portals, one
navigation map, six resident shells, HUD/settings, layout binding, and
`AgentPlaytestSurface`. Its local
`RunSession` can preload actor/location/evidence-grounded openings for all six
residents and carry any ready resident into the same generated-choice or
bounded-free-text conversation surface. The click-time start consumes the
opening without another provider wait; model judgment, coarse stance display,
child-session end, and world resume remain unchanged. The modal owns
only presentation and pause; all memory and stance truth comes back from the
TypeScript `RunService`. Outside a modal, the client batches unpaused time,
applies runtime movement IDs to projected NavMesh targets, and acknowledges an
arrival only after the matching NPC physically reaches that target. The first
park meeting now produces two attributed utterances, exact listener memory,
direction-aware subtitles, and a short spatial speech blip from the shared
audibility contract. On the next batched advance after a material scene change,
the client reports all six residents' NavMesh reachability, actor-height
physics-ray line of sight, authored-volume audibility, and positions at one
observed world revision. Runtime-authored `speech`, `readiness`, `look`, and
`movement` deltas
are the action-application surface for current runtime responses. Runtime
`playerConversationReady` remains the only authority for prompts. One
background preload is allowed at a time, the HTTP bridge keeps a foreground
transport lane, and late responses rebase instead of re-enabling stale actors.
`run/main_scene` now points to `res://scenes/main_3d.tscn`; the 2D scene remains
reachable by explicit path as the deterministic M1 harness.

Engine practice (node choices, physics layers, import settings, pitfalls) is
not duplicated here: implementing agents use the repo's `godot-best-practice`
skill and the pinned Godot AI
[`inspection/play contract`](godot-ai-playtest.md).

## Presentation direction

- First-person camera, conservative comfort-first movement for a social
  game: walk-speed default, no sprint requirement, head-bob off by default,
  FOV and sensitivity/invert user-adjustable. The expected player-facing
  surface is enumerated in "First-person interaction baseline" below; the
  M3R comfort research slice tunes its numbers, not the list.
- Low-fi free 3D assets are the accepted norm
  ([`../art/art-direction.md`](../art/art-direction.md)). Coherence bars:
  verified redistribution terms, measured family scale, correct collision,
  readable roles, and legible social state. Repeated or mixed CC0 dressing is
  allowed; fidelity is never a gate.
- Full keyboard+mouse play; keyboard-only fallback where feasible. Input
  map: move (WASD), look (mouse), `interact` (E), `choice_1..3` (1/2/3),
  `open_log` (Tab — records/open-questions surface), `cancel` (Esc),
  `toggle_debug` (F3). Extend the existing 2D input map (rename
  `open_ledger` → `open_log`); actions already use physical keycodes.

## Engine baseline (M3R decisions)

Decided here so conversion slices don't churn on project-global settings.
Landed together in the bounded engine-baseline slice before the blockout:

- **Renderer: Forward+.** The project-global switch from `gl_compatibility`
  landed before the 3D blockout while the 2D harness remained runnable. The
  shipped target is desktop (M5 exports), where Forward+ is the intended 3D
  renderer. A Web build is a non-goal; revisit the renderer only if that
  changes. Desktop uses `forward_plus`; the unused mobile override is Godot's
  `mobile` renderer rather than forcing desktop Forward+ there.
- **3D physics: Jolt**, set explicitly (`physics/3d/physics_engine`) before
  the first 3D physics slice to `Jolt Physics`, then restart the editor as the
  [Godot 4.7 Jolt guide](https://docs.godotengine.org/en/4.7/tutorials/physics/using_jolt_physics.html)
  requires. The player, six resident shells, and static blockers now exercise
  that baseline; no later physics-engine migration is planned.
- **Lighting: fixed daylight, no bakes.** One `DirectionalLight3D` with
  shadows plus `WorldEnvironment` ambient; interiors read through ambient
  plus a few `OmniLight3D`s. No day/night cycle (continuous world time is
  minutes-scale; the art direction is a daylight town). No lightmaps, GI,
  or reflection probes in M3R — flat-color low-poly doesn't need them.
- **Single-story rule: no stairs anywhere.** Entrances are flush thresholds
  or short ramps. This deletes step-handling from the controller and keeps
  the navmesh effectively one plane.
- **Parallel-tree migration.** The 3D world grew under its own scene tree
  (`scenes/town/`) until the first overheard-meeting proof made it
  `run/main_scene`. The retained 2D scene remains an explicit-path regression
  harness; deleting it still requires owner confirmation through the salvage
  map below.

## Scene architecture (target)

```
Main (Node)
├── World (Node3D) — one seamless town scene
│   ├── Terrain/buildings: park, studio reception, office, Station,
│   │   street connective space (single navmesh world, no scene loads)
│   ├── Building portals (permanently open; no interaction or scene load)
│   ├── Props (few pick/move/throw physics objects)
│   └── Actors
│       ├── Player (CharacterBody3D + first-person Camera3D + interaction ray)
│       └── NPC instances (CharacterBody3D, NavigationAgent3D, schedule/policy
│           movement driver, speech/attention presentation state)
├── HUD (CanvasLayer)
│   ├── Subtitles (direction-aware, for audible in-world NPC speech)
│   ├── ConversationSurface (modal: generated prompt + suggestions, typed
│   │   input, typewriter reveal, diegetic thinking wait)
│   ├── PressureLine (institutional pressure, latest-ledger line)
│   ├── LogPanel (coarse per-NPC stances, records,
│   │   open-questions/rumor log)
│   └── OutcomePanel (hearing result, cited ledger entries, run recap, restart)
├── Session (Node) — run/session state machine, world-pause controller
└── RuntimeBridge (Node) — HTTP pool to the runtime sidecar (unchanged)
```

## First-person interaction baseline (table stakes)

What any player expects the moment they hold the mouse in a first-person
game. This is the contract of what must exist; recommended defaults are
given so slices don't stall, and the comfort research slice may retune
numbers (updating this section in the same commit) but never shrinks the
list.

### Input and camera

- **Mouse look**: pitch clamped to roughly ±85°, yaw unlimited. With the
  mouse captured, read `InputEventMouseMotion.screen_relative` so sensitivity
  stays resolution-independent per the
  [Godot 4.7 input guidance](https://docs.godotengine.org/en/4.7/tutorials/inputs/mouse_and_input_coordinates.html).
  Sensitivity slider and invert-Y toggle live in settings; defaults medium,
  non-inverted.
- **Mouse capture**: captured during free movement; released whenever a
  surface needs a cursor (conversation, log, settings, outcome panel).
  `cancel` (Esc) releases capture and opens settings. Window focus loss
  releases capture but does not pause the world. Only an active player-modal
  conversation pauses world time; log/settings cursor surfaces suppress
  player movement while NPC simulation and the clock continue.
- **Movement**: WASD with normalized diagonals; single walk speed, no
  sprint, no stamina. Space performs one modest grounded jump (initial
  velocity `4.5 m/s`) only while player control is enabled; no route,
  interaction, or progression gate may require it. There is no crouch, and
  `interact` remains on E so one key cannot trigger both actions.
  `CharacterBody3D` velocity stays in meters per second and is not multiplied
  by `delta` before `move_and_slide()`.
- **FOV**: default ≈ 75°, slider 60–100. Head bob off by default.

### Interaction feedback

- A minimal center reticle (small dot). When the forward interaction ray
  (~2.5 m) hits an interactable, the reticle changes and a text prompt
  names the action in-fiction ("E — 말 걸기 / 집기 / 살펴보기").
  Nameplates stay quiet per the art direction; the prompt is the loud part.
- Interactable kinds and their verbs: NPC → conversation, prop → pick up
  (then place/throw), record surface → inspect.
- An interactable out of range but centered shows nothing — no half-lit
  prompts.

### Collision and movement resolution

- The player is a `CharacterBody3D` moved with `move_and_slide`: walls
  never stop movement dead — the player slides along them. No collision
  damage, no knockback, no physics forces applied to the player.
- **Player vs NPC**: both are solid; the player cannot shove NPCs and NPCs
  never push the player. NPC avoidance steers around the player and each
  other. If the player blocks an NPC's path, the NPC waits a beat and
  re-paths — standing in someone's way is observable social behavior, not
  a physics fight.
- **Never trap the player**: schedule anchors never place an idle NPC inside a
  building-portal volume, and an NPC blocked in a portal yields after a moment.
  Interiors respect the minimum-corridor metric so one stationary NPC never
  seals a room.
- **Props**: small `RigidBody3D` props are pushable by walking but tuned
  (mass, damping) not to launch; a prop that can leave reachable space is
  a collision bug — greybox collision closes all gaps.
- **Out-of-bounds failsafe**: the closed single-story map should make
  falling impossible; a kill-Z below the world teleports the player to the
  nearest anchor and logs a warning. Cheap insurance, invisible in normal
  play.

### Settings surface (Esc), minimal

The target surface contains look sensitivity, invert Y, FOV, UI scale (M2
carryover), master/SFX volume, and language (`ko/en/it/zh/fr/ja`). The landed
selector reads those six entries from `data/supported_locales.json`; the HUD
does not carry a second hardcoded language list. The first run-start attempt
locks the corresponding full API locale, while a later selector change is
saved and labeled for the next run or restart. Nothing else is added until
live play asks for it.

## World construction plan

How the seamless town gets built from the decided asset families
([`../art/asset-pipeline.md`](../art/asset-pipeline.md)).

**Authoring model.** The town scene is authored in the Godot editor —
sightline composition and interior readability are editorial work, not
generation output (v1's 981-line world generator is the anti-pattern).
`world_layout.json` stays the semantic truth (landmarks, zones, anchors,
sight/audibility volumes) and binds to the scene through named marker nodes;
a thin binding assertion inside the scene smoke checks the two agree in both
directions. The client renders the scene and measures live physical facts; the
runtime reasons over those revisioned observations plus the JSON's semantic
registry. Neither side invents an actor, anchor, volume, or object id the other
cannot validate.

**Metric standards.** Fixed once by the asset-pipeline scale reference scene
and then binding on every slice: 1 unit = 1 m; player capsule 1.8 m tall,
radius 0.35 m; eye height ≈ 1.65 m; doorways ≥ 1.1 m wide × 2.1 m high;
interior ceilings 2.7–3.0 m; minimum corridor 1.6 m (twice the
NavigationAgent3D radius plus margin). Each asset family gets one global
import scale measured against this scene, never per-model fudging.

**Greybox owns gameplay geometry.** Floors, walls, doorways, thresholds, and
all walkable surfaces are authored greybox volumes with primitive collision
shapes. The navigation bake includes those surfaces plus simple authored
blockers for fixed large props. Kit dressing (the imported Kenney base plus
any creator-sourced, license-verified CC0 packs) is presentation: simple
convex or box collision only
where a piece should block movement, never trimesh-from-render-mesh. Fixed
large furniture uses simple authored blocker geometry or a
`NavigationObstacle3D` with `affect_navigation_mesh` in the bake;
`avoidance_enabled` alone is not a substitute for static pathfinding geometry.
Dynamic bodies use avoidance without triggering a rebake. Dressing can never
break a proven blockout. Visual density has priority over family purity:
repeat props, mix compatible CC0 families, and use collisionless foliage or
small clutter wherever a blocker would compromise a route.

**Construction order.** (1) Full-town greybox blockout from
`world_layout.json` — park, three interiors, street. (2) Controller,
permanently open portals, collision, and navmesh proven on the blockout. (3)
Dress location by location with the kit layer, re-verifying collision/nav each
time. The park, studio reception, office, and Station all need enough repeated
furniture, foliage, trim, and street objects to read as occupied rather than as
empty blockout. Interaction-critical surfaces may stay greybox longest because
their silhouette and placement carry gameplay meaning.

**Building portals.** Every building doorway stays permanently open and has no
physical door body, interaction, animation, or door SFX. Bake the walkable
surfaces with the portals open; a bidirectional `NavigationLink3D` bridges each
narrow portal's two baked surfaces inside the same navigation map. The link
follows the physical opening and is not a scene transition. Portal ids and
connections remain semantic visibility and audibility boundaries in
`world_layout.json`; there is no dynamic open/closed state.

**Town scale.** Small enough that any building-to-building walk stays under
roughly 30 seconds, and the park center keeps all three building entrances in
view — this is what makes commutes legible and the park-idle acceptance test
observable. Sightline composition closes the map per the art direction.

**Props.** The few pick/move/throw props are `RigidBody3D` with primitive
shapes, carried on a hold anchor in front of the camera. Physics is not a
pillar; keep the prop count low and the interactions boring.

**Audio/audibility consistency.** Speech audibility, subtitles, and the
runtime's heard-speech records all derive from the same `world_layout.json`
audibility volumes. `AudioStreamPlayer3D` range and attenuation are
presentation derived from those volumes, not the authority check; Godot audio
attenuation alone does not decide who heard an utterance. What the semantic
audibility snapshot marks hearable is exactly what gets a direction cue and
exactly what the runtime may record. Short spatial murmurs/blips make in-range
speech audible without adding TTS. Zone ambience (park murmur, office hum)
runs off `Area3D` zones.

**Performance posture.** Tiny map, six NPCs: no occlusion culling, LOD, or
baking until a measured frame problem exists. The bar is a clean frame on
the dev machine with all six NPC loops live.

## Contracts carried over from the 2D client

- **RuntimeBridge transport and authority** — keep the localhost HTTP sidecar
  and zod validation; Godot never computes truth. M3R extends the endpoint and
  packet surface with `/v1/run/*`, run-bound conversation requests, world
  revisions, and run deltas as specified in
  [`npc-runtime.md`](npc-runtime.md); the old Session API is not the whole
  contract anymore.
- **Conversation input semantics** — three generated suggestions plus bounded
  free text submit into the same judgment path. Ordinary talk becomes the
  interlocutor's attributed memory; it is not presented as an administrative
  record unless a later validated record action actually creates one. No
  timer exists outside Station interrogation (≥40s inside it).
- **Consequence surfacing ≤1s** of its ledger event; no silent state change.
- **Fallback honesty** — provider status badge and fallback reason surface in
  play; raw ids stay behind F3 debug.
- **Localization path** — all player-facing strings use the existing Godot
  `TranslationServer` path. Korean is first-authored; `en/it/zh/fr/ja` use the
  same M3R keys and placeholder sets. The selected presentation id maps once to
  the full immutable run locale (`ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`,
  or `ja-JP`). The parity smoke reads each JSON table directly so Korean
  fallback cannot hide a missing translation. The current HUD uses Godot's
  default/system font path and wraps long Italian/French text without a
  locale-specific scene; glyph rendering and IME composition remain visual
  and hands-on acceptance items.

## New client responsibilities (3D-specific)

- **World pause**: a player modal conversation freezes world time, NPC
  simulation, and physics from open through its merged LLM wait and clean end;
  conversation locks player movement and camera on the interlocutor. Ambient
  NPC provider work never pauses free exploration. Results carry the observed
  world revision, are revalidated before applying, and wait until resume if
  they complete during a modal pause.
- **Direction-aware subtitles**: audible NPC speech (mono- and NPC-to-NPC
  dialogue) renders as subtitles with speaker attribution and rough direction
  cues when in earshot; audibility ranges come from `world_layout.json`
  volumes so the runtime and presentation agree on what was hearable.
- **Spatial fact reporting**: `Town3D.spatial_facts()` returns one player fact
  beside exactly six actor facts in stable actor-id order. Reachable anchors come from
  `NavigationServer3D` paths on the synchronized town map; visible actors come
  from actor-height physics rays; audible actors must share an authored
  `world_layout.json` volume and be inside its speech distance. Each resident
  also reports whether the player is visible, audible, navmesh-reachable, and
  standing inside a conversation zone that admits that actor. A brief empty
  player location between authored zones is reported honestly and simply
  disables contact. The packet is
  stamped with the advance's observed revision and rides the existing batched
  advance lane after movement, arrival/block, schedule, or rebase changes and
  while residents are moving. It is never a per-frame HTTP or provider call.
  `visibleObjectIds` stays empty until the canonical prop registry lands.
- **Interaction**: forward ray picks the nearest interactable (NPC, prop,
  record surface); `interact` opens conversation, pickup, or inspect.
- **Navigation**: one navigation map for the whole seamless town, with one
  baked surface resource and three bidirectional links across the permanently
  open building portals; NPC `move_to` resolves through `NavigationAgent3D`;
  portals remain continuous paths, never scene boundaries. Movement waits
  until the navigation map has
  synchronized, calls `get_next_path_position()` from `_physics_process`, and
  stops querying once `is_navigation_finished()` is true to avoid empty-path
  startup and endpoint jitter. Avoidance is enabled only while an NPC is
  moving; the agent's `velocity_computed` signal supplies the safe velocity.
  Semantic anchors are projected onto this map before becoming agent targets;
  this keeps desk/surface markers authored above floor height from becoming
  false arrival checks. Arrival signals carry the runtime movement ID and
  anchor, and unreachable final positions never acknowledge arrival. The
  client retries a freshly projected target twice for transient map/path
  failure, then exposes a stable blocked movement for debug inspection until
  a later runtime movement supersedes it.
  These lifecycle rules follow the
  [Godot 4.7 NavigationAgent guide](https://docs.godotengine.org/en/4.7/tutorials/navigation/navigation_using_navigationagents.html).
- **NPC-initiated contact**: an authoritative `activeContact` temporarily
  preempts only the named resident's schedule presentation. `NPC3D` reuses its
  `NavigationAgent3D`, refreshing the moving player target at most every 0.25
  seconds and only after 0.5 m of player movement. It stops at the runtime safe
  distance, faces the player, and emits readiness once. Main sends a fresh
  batched spatial packet, then passes the contact id through the existing
  preload-backed `session/start`; the ordinary conversation modal is the only
  dialogue surface. Settings and the Tab log defer automatic opening without
  pausing the world. Cancellation returns the actor visually toward the
  contact's origin anchor without emitting a runtime arrival, while a consumed
  contact leaves the actor at the conversation position.
- **Schedule presentation**: NPCs visibly commute between anchors; meeting
  windows read at a glance (two residents talking look like two residents
  talking from across the park). Each pair approaches distinct physical
  standing slots around one semantic meeting center so solid capsules cannot
  deadlock a meeting-ready condition. Outside an event or meeting, every
  resident follows deterministic authored local routes with per-actor,
  per-waypoint staggered dwell times. This ambient motion is ordinary game AI,
  not an LLM decision or provider call; an event-driven move safely preempts
  it and the schedule resumes afterward.
- **Advance lane**: run start and clock packets use stable client idempotency
  keys. Only one mutation is in flight; an ambiguous transport failure retries
  the exact packet, while a stale revision rebases from a full run snapshot
  before unsent time/arrivals receive a new ID. Opening conversation pauses
  the tree, settles that lane, and sends no clock packet until clean resume.
  Settings and log surfaces do not pause the clock.
- **Decision delta application**: current NPC-decision responses apply only
  their typed `actionDeltas`: speech feeds subtitles/blips, readiness updates
  conversation availability, look turns the resident toward an actor, and
  movement enters the existing arrival-confirmed navigation lane. A decision
  that resolves during a player modal retains its exact wake request. On clean
  session end, `queuedRunDeltas` is applied once per session id and only at the
  matching world revision; the later decision retry therefore cannot replay
  the same presentation effect.

## Smokes (headless, thin)

Keep the thin list, rebuilt for 3D as slices land: `scene_load_smoke.gd`
(scene instances, bidirectional layout binding, reachable interior path
endpoints, no ceiling nav islands, runtime-issued physical NPC movement,
arrival acknowledgement, six sorted engine spatial facts, clock/physics
pause, distinct meeting slots, exactly-once queued action application, and the
full fixture receptionist flow from run start through modal pause, judgment,
stance presentation, child-session end, and resumed control), a
run/session route smoke against the sidecar API
(fixture mode), `localization_smoke.gd`, `check_assets.gd`. Same commands as
[`verification.md`](verification.md); resist additions without an escaped
regression.

## Salvage map from the 2D client (`godot/` current tree)

| Current 2D piece | Fate |
|---|---|
| `RuntimeBridge`, session state machine | Keep the HTTP transport and conversation behavior; extend schemas/state for the run lifecycle, world revisions, and run deltas |
| Conversation panel logic (suggestions, typed input, typewriter, thinking state) | Port logic to the modal 3D surface; interaction contracts unchanged |
| Pressure line / inspect / outcome HUD logic | Port; layouts rebuilt |
| `world_layout.json` | Keep; re-express coordinates in 3D, add sight/audibility volumes |
| TileMap scenes, `world_builder_2d.gd`, 2D actor scenes, pixel presets | Replace with the 3D world (delete only in the slice that lands the replacement — destructive cleanup needs owner confirmation per the handoff rules) |
| `tools/*_smoke.gd` | Rewrite thin per the list above |
| Localization keys/content data | Keep |

No parallel maintained 2D/3D trees: after the conversion slices land and the
owner confirms cleanup, the 2D presentation code is deleted in the same PR
that proves its 3D replacement.
