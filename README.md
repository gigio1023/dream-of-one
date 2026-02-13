# Dream of One

Dream of One is a 3D social stealth simulation where LLM-driven NPC agents form an active society inside a dream. The player is the only lucid dreamer and must survive by behaving procedurally normal.

## Product Focus
- **LLM-first NPC behavior**: most NPC decisions come from LLM agent reasoning.
- **Unity world authority**: sensing, action validation, movement, and UI are executed in Unity.
- **Social stealth loop**: perform cover work, avoid reports, avoid lucid identification.
- **Simple core, deep behavior**: limited action set, emergent social outcomes.

## Prototype v0.1 Scope
- Session: 10-12 minutes.
- Landmarks: `Store`, `Studio`, `Park`, `Station`.
- NPC action set (fixed): `Move`, `Talk`, `Ask`, `Observe`, `Work`, `Report`, `Escort`, `Idle`.
- Player speech acts (fixed): `SA_COMPLY`, `SA_INQUIRE`, `SA_FRAME`, `SA_BREAK`.
- Endings: `Clean Pass`, `Narrow Escape`, `Exposed`.

## Quick Start
1. Open Unity Hub and add `draem-of-one/`.
2. Open scene `Assets/Scenes/Prototype.unity`.
3. Press Play.

## Controls
- Move: `WASD`
- Jump: `Space`
- Interact: `E`
- Photo/Capture: `F`
- Toggle log: `L`
- Inspect next artifact: `I`
- Toggle case panel: `C`
- Toggle debug overlay: `F1`
- Camera orbit: hold `RMB` + move mouse
- Camera zoom: mouse wheel
- Camera snap behind player: `R`
- Camera distance presets: `1` / `2` / `3`

## Runtime Architecture
- Unity emits observation packets from world state and recent events.
- TypeScript `npc-runtime` backend orchestrates Codex decisions and returns constrained envelopes.
- Unity validates every action and executes or safely falls back.
- Session escalation and ending transitions are handled in runtime rules.

## LLM Setup (local)
- Start local runtime: `ollama serve`
- Pull model: `ollama pull qwen3:4b-instruct`
- In `LLMClient`:
  - `Provider = LocalEndpoint`
  - `llmEnabled = true`
  - `LocalEndpointMode = UtteranceProxy` with `http://localhost:11434/utterance`, or
  - `LocalEndpointMode = OpenAIChatCompletions` with `http://localhost:11434/v1/chat/completions`
  - `LocalModel = Qwen3_4B_Instruct`

## Developer Workflow
- Rebuild world data into scene:
  - `Tools > DreamOfOne > Rebuild World From Data`
- Run diagnostics:
  - `Tools > DreamOfOne > Run Diagnostics`
- Run tests:
  - Unity Test Runner (`EditMode`, `PlayMode`)

## Documentation Map
- Product definition (SoT): `project.md`
- Master execution plan (SoT): `plan.md`
- Design bible: `docs/design/game-design.md`
- Dream law content pack: `docs/design/dream-laws.md`
- Cover test content pack: `docs/design/cover-tests.md`
- Runtime evidence operations: `docs/design/runtime-evidence.md`
- Terminology standard: `terminology.md`
- Developer guide: `docs/dev.md`
- Agent runbook: `docs/agent/runbook.md`
- Agent policy: `AGENTS.md`
