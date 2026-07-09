# Godot Playable Rebuild

This directory is the executor-facing plan for turning the Godot shell into an M1 playable technical proof.

Scenario canon has moved to `docs/scenario/`. Files in this directory are migration-era implementation notes and validation plans, not the scenario bible.

## Documents

- `01-runtime-architecture.md`: Godot scene, script, signal, group, UI, and backend authority shape.
- `02-first-playable-scenario.md`: migration-era playable loop notes. Active conversation-first scenario canon starts in `docs/scenario/bible/12-conversation-suspicion-prologue.md`.
- `03-execution-plan.md`: ordered implementation slices with files, acceptance criteria, and verification.
- `04-validation-and-evidence.md`: commands, artifacts, visual checks, and pass/fail gates.
- `05-free-asset-pass.md`: free 3D asset source, license, placement, and validation notes.
- `06-localization.md`: Korean-first localization, English selection, and localized UI validation.
- `07-ui-visual-readability-pass.md`: Game Studio-based plan for making the Store conversation proof read as a small playable conversation rather than a debug harness.
- `08-same-order-route-contrast.md`: route contrast pass proving clean cover, repair recovery, soft report, and inquest paths.

## Rebuild Rule

The playable rebuild must keep the current product rails:

- Player is not an investigator.
- NPCs and Station systems investigate the player.
- Text is where danger starts.
- Dream Law, Cover Test, Exposure, Station intake, Inquest, verdict, and session termination remain deterministic product authority.
- Godot presents the 3D world, captures player interaction, emits observations, executes bounded commands, and records visible evidence.

## External Godot References

Godot 4.6 official docs used for this plan:

- Best practices index: <https://docs.godotengine.org/en/4.6/tutorials/best_practices/index.html>
- Scene organization: <https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html>
- UI overview: <https://docs.godotengine.org/en/4.6/tutorials/ui/>
- CharacterBody3D: <https://docs.godotengine.org/en/stable/classes/class_characterbody3d.html>
- Navigation maps: <https://docs.godotengine.org/en/4.6/tutorials/navigation/navigation_using_navigationmaps.html>
