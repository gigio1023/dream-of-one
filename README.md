# Dream of One

Dream of One is a log-first social simulation set in a compact city block. Every meaningful action becomes a World Event Log (WEL) entry, NPCs react to nearby logs rather than hidden global state, and police decisions are made deterministically from accumulated evidence. The player survives by maintaining a believable cover identity while the social system turns violations into suspicion, reports, interrogation, and verdicts.

## Game Overview
- **Core loop**: Violation → Suspicion → Report → Interrogation → Verdict
- **Log‑first world**: The world “remembers” through append‑only logs, not a full state snapshot.
- **Organizations drive society**: Studio, convenience store, park management, police, media, logistics, and facilities each run procedures that generate logs and artifacts.
- **Deterministic core**: Rules decide outcomes; LLMs only generate 1‑line surface text.

## What the Player Does
You play as an outsider trying to blend in. Your choices create logs that ripple through gossip, reports, and procedural systems. The safest path is to follow local procedures, use the right jargon, and avoid actions that break norms or contradict your cover.

## What “Winning” Looks Like (MCSS Slice)
In a 10–12 minute session you should be able to:
- Visit 4 landmarks: Store, Studio, Park, Police
- Generate meaningful events (not just movement)
- Trigger social reactions (gossip/report/challenge)
- Collect/inspect multiple artifacts (evidence)
- Reach a deterministic closure (verdict / cleared / escalation)
- End the session gracefully (no hard locks)

## Quick Start
1. Open Unity Hub and add `draem-of-one/`
2. Open the scene: `Assets/Scenes/Prototype.unity`
3. Press Play

## Controls
- Move: WASD
- Jump: Space
- Interact: E
- Photo / Capture: F
- Toggle log: L
- Inspect next artifact: I
- Toggle case panel: C
- Toggle debug overlay: F1
- Camera orbit: hold RMB + mouse move
- Camera zoom: mouse wheel
- Camera snap behind player: R
- Camera distance presets: 1 / 2 / 3

## Key Systems
- **World Event Log (WEL)**: Structured event records + canonical 1‑line text.
- **Semantic Shaper**: Promotes low‑level events into readable, rule‑based log lines.
- **Spatial Blackboard**: Nearby log buffers that NPCs read by distance/visibility.
- **Suspicion & Reports**: NPC suspicion feeds reports; global suspicion increases pressure.
- **Police Procedure**: Case bundles assemble logs + artifacts and produce rule‑based verdicts.
- **Artifacts**: Evidence like tickets, captures, approvals, and report notes.

## Developer Workflow
- Rebuild the world from ScriptableObject data:
  - `Tools > DreamOfOne > Rebuild World From Data`
- Validate the scene state after changes:
  - `Tools > DreamOfOne > Run Diagnostics` (keep the console clean)
- (Optional) Seed default world data:
  - `Tools > DreamOfOne > Seed World Definition (Default)`
- Tests:
  - Unity Test Runner (EditMode + PlayMode)

## LLM Setup (OpenAI Chat Completions)
- Default mode: Mock or LocalEndpoint
- To use OpenAI:
  - Set environment variable `OPENAI_API_KEY`
  - In the scene, set `LLMClient` Provider to `OpenAIChatCompletions`
  - Choose the model name in the inspector
- To run fully deterministic / template-only mode:
  - Disable `LLMClient.llmEnabled`

## Documentation
- Project definition (source of truth): `project.md`
- Detailed implementation spec (long-form): `docs/spec/new-plan.md`
- Historical snapshots (completed checklist + past status): `docs/archive/`
- Agent notes: `AGENTS.md`
