# Developer Guide

Revision date: 2026-02-14

This guide is the practical “how to run / how to verify” reference for the Unity project in this repo.

Terminology rule: use canonical terms from `terminology.md` for docs and user-facing runtime text.

---

## Project Root / Scene Authority

- Unity project root (deprecated path): `deprecated/unity/draem-of-one/`
- Playable prototype scene: `Assets/Scenes/Prototype.unity`
- Render pipeline: URP (`Assets/Settings/UniversalRP.asset` → `Assets/Settings/UniversalRenderer.asset`)

---

## Quick Start (Local)

1. Open Unity Hub and add `deprecated/unity/draem-of-one/`.
2. Open `Assets/Scenes/Prototype.unity`.
3. Press Play.

---

## Authoring Rules (Safety)

### Prefer Unity Editor / AssetDatabase authoring (Unity MCP-first)

Unity assets are not “just files”. They are serialized objects tied to `.meta` GUIDs and importer state.

When creating or modifying:
- `.unity`, `.prefab`, `.asset`, `.meta`

Prefer Editor-driven creation:
- Unity menus / CreateAssetMenu flows, or
- Editor scripts that call `AssetDatabase.CreateAsset`, `PrefabUtility.SaveAsPrefabAsset`, etc.

Avoid hand-editing these files unless explicitly approved (high risk of GUID/reference/import corruption).

### If Unity MCP is unavailable

If MCP is not connected, stop scene/asset authoring work and ask the user to:
- open Unity,
- connect MCP,
- and re-run the required menu tools below.

---

## Required Menu Tools (Use These)

World build and verification:
- `Tools > DreamOfOne > Apply Simple Verification Mode` (recommended for rapid 4-landmark validation loops)
- `Tools > DreamOfOne > Run Diagnostics` (repeat until the console is clean)

Manual equivalent for the same simple profile:
- `Tools > DreamOfOne > Build City (POLYGON, Simple Verification)`
- `Tools > DreamOfOne > Seed World Definition (Simple Verification)`
- `Tools > DreamOfOne > Rebuild World From Data`

Optional baseline tooling:
- `Tools > DreamOfOne > Seed World Definition (Default)` (only if a full default baseline is required)

---

## Playtest Contract (What “works” means)

Minimum Complete Simulation Slice (MCSS) target:
- 10–12 minute session
- Player can visit: Store / Studio / Park / Station
- Meaningful events, social reactions, artifacts, and at least one procedural closure
- No hard locks; session ends cleanly
- “LLM off” mode remains functional (deterministic fallback)

The high-level definition and roadmap live in `project.md`.
Actionable work items (issues/status/PR links) live in Linear.
Beads (`bd`) is optional and used internally by Codex CLI for dependency tracking while implementing.

---

## LLM Setup (Optional)

The project supports running without an LLM (deterministic fallback). When enabled, the LLM is **styling-only**:
- It can paraphrase or add tone to surface text.
- It **cannot** decide truth transitions, evidence creation, or verdicts.
- Deterministic systems always own event truth and scoring.

OpenAI:
- Set `OPENAI_API_KEY` in your environment.
- Configure `LLMClient` provider/model enums in the scene.

Local endpoint (Ollama, OpenAI-compatible):
- Start server: `ollama serve`
- Pull model: `ollama pull qwen3:4b-instruct`
- Configure `LLMClient` Provider = `LocalEndpoint`
- LocalEndpointMode = `OpenAIChatCompletions`
- Endpoint: `http://localhost:11434/v1/chat/completions`
- LocalModel = `Qwen3_4B_Instruct`

Local endpoint (utterance proxy):
- Configure `LLMClient` Provider = `LocalEndpoint`
- LocalEndpointMode = `UtteranceProxy`
- Endpoint: `http://localhost:11434/utterance` (or your custom proxy)

---

## Headless Verification (Local / CI)

If you run Unity in batchmode/headless, you typically need:
- a Unity editor binary available in your environment,
- a clean `Library/` regeneration when switching OS/editor versions.

The recommended entry points are:
- editor preflight/diagnostics (compile + scene/resource checks),
- an optional short playmode smoke run.

Use the repo scripts:
- `deprecated/unity/scripts/run_editor_diagnostics.sh`
- `deprecated/unity/scripts/run_playmode_smoke.sh`
- `deprecated/unity/scripts/run_all_checks.sh`

Runtime evidence tooling:
- `deprecated/unity/scripts/analyze_runtime_evidence.mjs` (validates required Evidence fields and transport continuity)
- `deprecated/unity/scripts/collect_regression_metrics.mjs` (builds Regression Monitoring metrics)
- `deprecated/unity/scripts/package_release_candidate.mjs` (packages the Evidence Pack for Release Candidate decisions)
- `deprecated/unity/scripts/collect_stability_trend.mjs` (aggregates multi-run stability trends)
- `deprecated/unity/scripts/run_stability_trend.sh` (runs the default 3-run stability profile)

Mock runtime option for deterministic validation:
- `backend/npc-runtime/scripts/mock-codex-tool-runner.mjs`
- Example:
  - `CODEX_TOOL_COMMAND=node`
  - `CODEX_TOOL_ARGS='scripts/mock-codex-tool-runner.mjs'`
  - `MOCK_CODEX_MODE=normal|parse-failure|timeout|tool-failure`

Real runner acceptance option:
- use default repo runner (`scripts/codex-tool-runner.mjs`) without mock env overrides
- example service env:
  - `NPC_RUNTIME_DECISION_DEADLINE_MS=30000`
  - `CODEX_TOOL_TIMEOUT_MS=30000`

Generated outputs:
- `logs/runtime-evidence-summary.json`
- `logs/regression-metrics.json`
- `logs/rc/<run-id>/manifest.json`
- `logs/unity-live-play.log` (live metadata lines extracted from Unity Editor.log)
- `logs/npc-runtime-live-evidence.log` (backend decision response sample logs for regression metrics)
  - Note: client-aborted requests are recorded as `npc_decision_response_dropped` and excluded from response Evidence aggregation

## Work management (Linear SSOT + Beads execution graph)

This repo uses **Linear issues as the single source of truth** for work items and status.

Beads (`bd`) is an optional, internal tool used by Codex CLI to:
- break down a Linear issue into an execution graph (epic/tasks/dependencies),
- track local WIP (especially for Unity MCP mutex work),
- keep local reasoning state stable across sessions.

Beads data lives in `.beads/` (should be tracked); local runtime artifacts are ignored by `.beads/.gitignore`.

- Agent runbook: [`docs/agent/runbook.md`](agent/runbook.md)
- Codex CLI workflow playbook: [`docs/agent/codex-cli-workflow.md`](agent/codex-cli-workflow.md)
- Agent skills: [`docs/agent-skills.md`](agent-skills.md)
