# Godot Reference Patterns

Use this guide when a Godot task needs a concrete implementation pattern before
coding starts. It turns external Godot repos into practical selection rules.

This is not a tutorial and not a license to copy a starter project. Pick the
smallest reference that matches the milestone, extract the pattern, then adapt
it to the user's current project.

## Reference Repos

| Reference | Source URL | Use when | Main lesson |
| --- | --- | --- | --- |
| `godotengine/godot` | https://github.com/godotengine/godot | Engine behavior, bug discipline, API docs, tests | Reduce failures to small reproduction projects; consult official docs for version-sensitive APIs. |
| `godotengine/godot-demo-projects` | https://github.com/godotengine/godot-demo-projects | Feature-level examples | Search by category and `project.godot` metadata before inventing a pattern. |
| `KenneyNL/Starter-Kit-3D-Platformer` | https://github.com/KenneyNL/Starter-Kit-3D-Platformer | 3D platformer, third-person movement, collectibles | Movement, camera, landing feedback, collectibles, and scene reload form one playable chain. |
| `KenneyNL/Starter-Kit-FPS` | https://github.com/KenneyNL/Starter-Kit-FPS | FPS or ranged action | Weapon data belongs in custom resources; smoke checks need hit, miss, cooldown, weapon switch, and recovery. |
| `KenneyNL/Starter-Kit-City-Builder` | https://github.com/KenneyNL/Starter-Kit-City-Builder | Grid, builder, placement, save/load | Placement needs preview and persistence; save/load requires round-trip validation. |

## Pinned Review URLs

These are the exact commits reviewed while writing this guide:

- Godot Engine: https://github.com/godotengine/godot/tree/9a33066a27d70c6d4f74cae44c1ce023d8082a59
- Godot Demo Projects: https://github.com/godotengine/godot-demo-projects/tree/c9f5852130ffab4b9d57488c18cd310708c6acf0
- Kenney 3D Platformer: https://github.com/KenneyNL/Starter-Kit-3D-Platformer/tree/3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0
- Kenney FPS: https://github.com/KenneyNL/Starter-Kit-FPS/tree/185fd2326d74a5cf858cffc616f87cf9696f9cc0
- Kenney City Builder: https://github.com/KenneyNL/Starter-Kit-City-Builder/tree/4535092b740b378b700efd9df9e27a631815b84a

## Reference Selector

| User goal | Inspect first | Required adaptation note |
| --- | --- | --- |
| 2D arcade loop | [`2d/dodge_the_creeps`](https://github.com/godotengine/godot-demo-projects/tree/master/2d/dodge_the_creeps) or [`2d/pong`](https://github.com/godotengine/godot-demo-projects/tree/master/2d/pong) | Name the main loop, fail state, and score or retry condition. |
| 2D character controller | [`2d/kinematic_character`](https://github.com/godotengine/godot-demo-projects/tree/master/2d/kinematic_character) | Check input actions, collision layers, and reset/recovery. |
| 3D movement | [`3d/kinematic_character`](https://github.com/godotengine/godot-demo-projects/tree/master/3d/kinematic_character) and [Kenney 3D Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | Validate camera-relative movement and landing feedback together. |
| FPS | [Kenney FPS](https://github.com/KenneyNL/Starter-Kit-FPS) | Keep weapon tuning data visible through resources. |
| Builder or tile placement | [Kenney City Builder](https://github.com/KenneyNL/Starter-Kit-City-Builder) | Validate preview, place, rotate, remove, save, and load. |
| Input remapping | [`gui/input_mapping`](https://github.com/godotengine/godot-demo-projects/tree/master/gui/input_mapping) | Record saved input path and actions affected. |
| Runtime file handling | [`loading/runtime_save_load`](https://github.com/godotengine/godot-demo-projects/tree/master/loading/runtime_save_load) | Record allowed file types, error behavior, and export limits. |
| Accessibility | [`gui/accessibility`](https://github.com/godotengine/godot-demo-projects/tree/master/gui/accessibility) | Check focus order, labels, custom controls, and keyboard access. |
| Localization | [`gui/translation`](https://github.com/godotengine/godot-demo-projects/tree/master/gui/translation) and [`gui/pseudolocalization`](https://github.com/godotengine/godot-demo-projects/tree/master/gui/pseudolocalization) | Check translation resources, remaps, text expansion, and fonts. |

## Pattern Cards

### Project Contract

A usable Godot project declares:

- Godot version
- renderer
- main scene
- input actions
- autoloads
- target platform
- asset/import assumptions
- export presets when demo or release work is involved

Do not mark a Godot milestone done from file presence alone.

### Playable Chain

The minimum chain is:

```text
input -> movement or action -> feedback -> failure or recovery -> next choice
```

Examples:

- Platformer: move, jump, double jump, land, collect, fall, respawn.
- FPS: capture mouse, look, fire, hit or miss, cooldown, recoil, switch weapon.
- Builder: preview, place, rotate, remove, save, load.

### Scene Map

Capture the scene map before changing a project:

```text
Main scene:
Player scene:
Reusable object scenes:
Scripts:
Custom resources:
Autoloads:
Input actions:
Runtime data path:
```

This prevents agents from editing scripts while missing the scene contract that
makes the script work.

### Resource-Backed Tuning

Use custom `Resource` classes when the designer or agent needs to compare
variants without editing code.

Good fits:

- weapons
- buildable structures
- enemies
- abilities
- level rules
- economy values
- dialogue or storylet definitions

Review question:

```text
Which tuning values changed, where are they stored, and how were they checked in
play?
```

### Camera As Gameplay

For movement-heavy 3D projects, camera is part of the mechanic. Validate:

- follow target
- rotation limits
- zoom limits
- collision or obstruction behavior when relevant
- landing, hit, or speed readability
- keyboard, mouse, and gamepad input when claimed

### Save/Load Round Trip

If persistence is in scope, a build claim needs a round trip:

```text
make change -> save -> reload -> confirm same player-visible state
```

Record:

- saved resource or file type
- `user://` or `res://` path
- data classes
- failed-load fallback
- manual or automated check

### Minimal Reproduction Scene

When a Godot issue blocks a milestone, ask for the smallest project or scene
that reproduces it. A large project is harder for agents and humans to reason
about.

Use:

```text
Target scene:
Steps:
Expected:
Actual:
Godot version:
Renderer:
Input actions:
Collision layers or masks:
```

## Stop Conditions

Return `NOT_READY` when:

- no main scene is identified
- input actions are missing
- the reference project was copied without adaptation notes
- a save/load feature has no round-trip check
- a movement feature has no camera or control-feel check
- an FPS feature has no hit/miss/cooldown/recovery smoke check
- a builder feature has no preview/place/rotate/remove check

Return `USER_DECISION_NEEDED` when adapting the reference would change:

- engine version
- renderer
- target platform
- genre promise
- control scheme
- public demo or release promise

## Do Not Copy Blindly

- Starter kits are learning material, not production architecture.
- Official demos answer feature questions, not product direction.
- Some starter scripts are intentionally direct and may need splitting after the
  first playable.
- Do not copy editor-only paths or temporary scene files.
- Preserve license notices when using any external code or assets.
