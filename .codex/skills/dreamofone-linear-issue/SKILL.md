---
name: dreamofone-linear-issue
description: Create a high-signal Linear issue for Dream of One with goal/AC/scope/constraints/verification and correct routing labels (local vs codex-cloud vs unity-mcp). Use when asked to “이슈 만들어줘/정리해줘”, “작업을 티켓으로 만들자”, or before delegating work to Codex Cloud.
---

# Dream of One → Linear Issue Template

## What to ask/confirm first

- Target Linear team (don’t guess if ambiguous).
- Is this **cloud-safe** (Codex Cloud) or **local-only**?
  - Cloud-safe: no Unity MCP; no `.unity/.prefab/.asset/.meta` edits.
  - Local-only: Unity MCP required or high ambiguity.

## Issue skeleton (copy/paste)

Write the description with **real newlines**. Don’t include literal `\\n` sequences (they show up as `\n` in Linear).

Use this structure in the Linear issue description:

- **Goal**
  - What we are building/fixing and why.
- **Acceptance Criteria**
  - [ ] …
  - [ ] …
- **Scope**
  - Code/paths:
  - Scenes/assets impacted (Unity root: `draem-of-one/`):
  - Risk notes (blast radius):
- **Constraints / Do-Not**
  - Don’t hand-edit `.unity/.prefab/.asset/.meta` unless explicitly approved.
  - Unity MCP-first for scene/asset authoring.
  - Keep `Assets/Scenes/Prototype.unity` playable.
  - If delegating to Codex Cloud: **do not** modify Unity serialized assets.
- **Verification**
  - Unity: `Tools > DreamOfOne > Run Diagnostics` until console is clean
  - (Optional) CLI: `scripts/unity/run_all_checks.sh`
  - Any tests to run and what “pass” means.
- **Notes (for future compaction)**
  - Decisions, tradeoffs, and follow-ups.

## Labels (routing)

- `agent:codex` (default; local Codex CLI work)
- `agent:codex-cloud` (delegate via Linear; only when cloud-safe)
- `agent:human` (needs human decision)

Add when needed:
- `needs:unity-mcp` (scene/prefab/asset authoring, import/material fixes, etc.)
