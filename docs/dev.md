# Developer Guide

Revision date: 2026-01-24

This guide is the practical “how to run / how to verify” reference for the Unity project in this repo.

---

## Project Root / Scene Authority

- Unity project root: `draem-of-one/`
- Playable prototype scene: `Assets/Scenes/Prototype.unity`
- Render pipeline: URP (`Assets/Settings/UniversalRP.asset` → `Assets/Settings/UniversalRenderer.asset`)

---

## Quick Start (Local)

1. Open Unity Hub and add `draem-of-one/`.
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
- `Tools > DreamOfOne > Rebuild World From Data`
- `Tools > DreamOfOne > Run Diagnostics` (repeat until the console is clean)

Optional tooling:
- `Tools > DreamOfOne > Seed World Definition (Default)` (only if a fresh baseline is needed)

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

The project supports running without an LLM (deterministic fallback). When enabled, the LLM is treated as an **untrusted planner**:
- it proposes JSON actions,
- the engine validates allowed skills and executes deterministically,
- only validated execution writes to WEL.

OpenAI:
- set `OPENAI_API_KEY` in your environment
- configure `LLMClient` provider/model in the scene

---

## Headless Verification (Local / CI)

If you run Unity in batchmode/headless, you typically need:
- a Unity editor binary available in your environment,
- a clean `Library/` regeneration when switching OS/editor versions.

The recommended entry points are:
- editor preflight/diagnostics (compile + scene/resource checks),
- an optional short playmode smoke run.

Use the repo scripts:
- `scripts/unity/run_editor_diagnostics.sh`
- `scripts/unity/run_playmode_smoke.sh`
- `scripts/unity/run_all_checks.sh`

## Work management (Linear SoT + Beads execution)

This repo uses **Linear issues as the single source of truth** for work items and status.

Beads (`bd`) is an optional, internal tool used by Codex CLI to:
- break down a Linear issue into an execution graph (epic/tasks/dependencies),
- track local WIP (especially for Unity MCP mutex work),
- keep local reasoning state stable across sessions.

Beads data lives in `.beads/` (should be tracked); local runtime artifacts are ignored by `.beads/.gitignore`.

- Agent runbook: [`docs/agent/runbook.md`](agent/runbook.md)
- Agent skills (repo-local): [`docs/agent-skills.md`](agent-skills.md)
