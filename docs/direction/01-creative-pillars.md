# Creative Pillars

## Pillar 1: Dialogue Is Where The Danger Starts

Statement:
- Dialogue is not flavor. Dialogue is where the player exposes themselves.

Strengthens:
- three diegetic dialogue choices and optional recorded free input.
- NPC prompts that contain local assumptions.
- Station notices that classify player statements after deterministic rules fire.
- Evidence why-lines.
- Korean-first phrasing with preserved legal/system meaning.

Rejects:
- safe lore exposition.
- decorative NPC barks.
- UI text that explains consequence without participating in it.
- English source text translated into Korean after the fact.

Evidence:
- conversation prompt/choice table with condition, signal, risk, consequence.
- backend Evidence output.
- player screenshot showing NPC reaction and consequence attached to dialogue.

## Pillar 2: The Station Investigates You

Statement:
- The player is not the authority. NPCs and Station systems are.

Strengthens:
- intake procedures.
- inquest prompts.
- NPC suspicion and procedural follow-up.
- suspicion sharing and report handoff before formal Station action.
- spatial layouts that put the player under observation.

Rejects:
- clue collection fantasy.
- detective tools.
- investigation board UI.
- NPCs waiting passively for player judgment.

Evidence:
- playable path where Station/NPC asks, classifies, escalates.
- player action timeline showing response under pressure.
- playtest note that player understood they were being investigated.

## Pillar 3: Deterministic Law Behind Unstable Speech

Statement:
- The experience may feel socially unstable, but the rule outcome is reproducible.

Strengthens:
- backend-owned thresholds.
- fixture-based Evidence.
- fallback selection.
- deterministic inquest/verdict/session closure.

Rejects:
- LLM-owned verdicts.
- prose-driven state changes.
- hidden manual scene scripting that bypasses runtime authority.
- Godot-only validation that diverges from backend schema.

Evidence:
- backend check.
- runtime evidence JSON.
- why-lines.
- invalid/valid fixture examples.

## Pillar 4: 3D Space Must Increase Surveillance Pressure

Statement:
- 3D is justified only if space, camera, route, distance, and visibility make investigation pressure stronger.

Strengthens:
- readable Station authority.
- NPC sightline and route pressure.
- conversation staging, overhearing, and report handoff positioned in the player's movement path.
- contact sheets showing player view and system view.

Rejects:
- 3D decoration.
- large empty hubs.
- assets that look better but obscure text consequence.
- mouse-only presentation that blocks keyboard-first play.

Evidence:
- player-view screenshot.
- Station/system-view contact sheet.
- keyboard-only route proof.
- text readability at gameplay distance.

## Conflict Rule

When pillars conflict:
1. Deterministic authority wins over generated text variety.
2. Dialogue danger wins over lore clarity.
3. Being investigated wins over player empowerment.
4. 3D value must be proven; otherwise simplify presentation.
