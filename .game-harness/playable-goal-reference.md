# Playable Goal Reference

Use this file as the compact guardrail for long-running Codex work.

## Goal

Make Dream of One more playable as a Godot open-environment NPC social
simulation. Each pass should add one small player-visible improvement: clearer
space, better interaction feel, readable props, visible NPC reactions, or a
consequence the player can connect to speech, records, and role actions.

## Always Reference

- `AGENTS.md`
- `docs/framework/game-studio-usage.md`
- `.game-studio/project-state.md`
- `.game-harness/goal-loop-state.md`
- `.game-harness/continue-here.md`
- `.game-harness/tasks.md`
- `docs/direction/00-game-thesis.md`
- `docs/direction/08-conversation-suspicion-redesign.md`
- `docs/direction/15-agentic-social-simulation-model.md`
- `docs/direction/16-agentic-prototype-target.md`
- `docs/scenario/content/environment-affordance-map.md`

## Reference Material

Actively use Godot and free-asset references when they help the current playable
slice:

- `godotengine/godot`
- `godotengine/godot-demo-projects`
- `KenneyNL/Starter-Kit-3D-Platformer`
- `KenneyNL/Starter-Kit-FPS`
- `KenneyNL/Starter-Kit-City-Builder`
- Kenney CC0 asset packs

Use them for patterns or scoped assets only after checking license. Record
source, license, files used, and adaptation. Do not import whole starter kits.

## Do Not

- Do not turn the game into a shooter, platformer, city builder, shop sim, or
  generic starter-kit reskin.
- Do not deepen Store/Station unless it proves a reusable social-sim pattern.
- Do not add broad economy, inventory, staff, tax, price, or multi-shop systems.
- Do not add docs, tests, probes, packets, or ledgers unless they protect a
  concrete playable change in the same pass.
- Do not treat Codex QA, screenshots, proxy reports, or generated kits as
  fresh-player comprehension.
- Do not claim product/demo/vertical-slice readiness.
- Do not claim live GPT/API behavior without live provider proof.
- Do not let provider text decide records, risk, Evidence, Exposure, inquest,
  verdict, or session end.
- Do not make the player an investigator.
- Do not hide consequence only in logs or JSON.
- Do not hardcode machine paths or sibling repo assumptions.
- Do not break Codex public gameplay action/snapshot APIs.

## Pass Shape

Pick one small playable gap, implement it, expose it to the player, run the
narrowest available proof, update `.game-harness/goal-loop-state.md`, then stop
when the next required evidence is fresh-player comprehension.
