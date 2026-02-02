# Dream of One

Dream of One is a **lucid cover social stealth** game set inside a dream. The player is the only lucid dreamer and must perform normal-looking organizational procedures while avoiding **Suspicion** and **Exposure**. NPCs treat dream-only rules as normal; if the Station identifies you as lucid, the session ends immediately.

## Game Overview
- **Work-as-cover loop**: cover tasks -> dream-law text surfaces -> manage Suspicion/Exposure -> avoid report/inquest.
- **Dream laws in text**: rules appear on signs, forms, notices, memos, and tickets.
- **Staged suspicion**: Suspicious -> Challenging -> Reporting -> Inquest.
- **Deterministic core**: outcomes are rule-based; LLMs only style surface text.
- **Log-first world**: meaningful actions become WEL entries that NPCs react to.
- **Player is not an investigator**: NPCs/Station investigate the player; you survive by staying procedural.

## What the Player Does
You act as a cover-role member inside organizations (Store, Studio, Park, Station). Follow procedures, use safe speech acts, and avoid dream/reality talk. The goal is to survive the session without a "Lucid identified" verdict.

## What "Winning" Looks Like (MCSS Slice)
In a 10-12 minute session you should be able to:
- Visit 4 landmarks: Store, Studio, Park, Station
- Trigger >=12 meaningful events (not just movement)
- Cause >=6 social reactions (suspicion/challenge/report)
- Create >=3 artifacts tied to the player
- Reach >=1 report or near-miss (Reporting stage)
- End with a summary: Clean Pass / Narrow Escape / Exposed

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
- **World Event Log (WEL)**: Structured event records + canonical 1-line text.
- **Dream Laws + Detectors**: Rule set that drives Suspicion/Exposure changes.
- **Cover Tests**: Scenario templates that exercise dream laws.
- **Speech Acts + Text Surfaces**: Player responses and the text layers that reveal laws.
- **Suspicion/Exposure + Inquest**: Staged escalation and deterministic verdicts.
- **Artifacts**: Witness statements, memos, notices, tickets, approvals.

## Developer Workflow
- Rebuild the world from ScriptableObject data:
  - `Tools > DreamOfOne > Rebuild World From Data`
- Validate the scene state after changes:
  - `Tools > DreamOfOne > Run Diagnostics` (keep the console clean)
- (Optional) Seed default world data:
  - `Tools > DreamOfOne > Seed World Definition (Default)`
- Tests:
  - Unity Test Runner (EditMode + PlayMode)

## LLM Setup (optional)
- Default mode: Mock or LocalEndpoint
- To use OpenAI:
  - Set environment variable `OPENAI_API_KEY`
  - In the scene, set `LLMClient` Provider to `OpenAIChatCompletions`
  - Choose the model name in the inspector
- To use a local endpoint:
  - Start Ollama: `ollama serve`
  - Pull model: `ollama pull qwen3:4b-instruct`
  - Set `LLMClient` Provider to `LocalEndpoint`
  - Configure endpoint URL: `http://localhost:11434/v1/chat/completions`
  - Set model: `qwen3:4b-instruct`
- To run fully deterministic / template-only mode:
  - Disable `LLMClient.llmEnabled`

## Documentation
- Project definition (SoT): `project.md`
- Dream laws library (SoT): `docs/design/dream-laws.md`
- Cover tests library (SoT): `docs/design/cover-tests.md`
- Weekly plan (Prototype v0.1): `docs/plan/week-2026-02-02-v0.1.md`
- Historical snapshots (past status): `docs/archive/`
- Agent notes: `AGENTS.md`

## This Week (Prototype v0.1)
Weekly development plan and deliverables:
- `docs/plan/week-2026-02-02-v0.1.md`
