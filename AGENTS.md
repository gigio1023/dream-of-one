# Repo-specific agent notes
- Use GitHub MCP (personal account) for all GitHub actions on this project.
- Use GitHub MCP (personal account) for all git/GitHub actions (branches, commits, pushes, PRs). Avoid local git/gh.
- Do not use the local `gh` CLI because it is configured with company auth.
- When committing, prefer verbose bodies even for small changes: list what
  changed, why, files/paths touched, tests run, and any side effects or TODOs.
- When mentioning files in responses, always wrap the path in a proper Markdown link (e.g., `[docs/PLAN.md](docs/PLAN.md)`).
- Scene authority: use `Assets/Scenes/Prototype.unity` as the playable prototype scene.
- Rendering: project uses URP 3D renderer via `Assets/Settings/UniversalRP.asset` → `Assets/Settings/UniversalRenderer.asset`.
- Runtime helpers: `RuntimeNavMeshBaker` builds NavMesh on play; `UILayouter` arranges HUD at runtime.
- TMP resources: ensure TextMesh Pro essential resources are present under `Assets/TextMesh Pro`.
- Verification mandate: after any Unity code/scene changes, use Unity MCP to run `Tools/DreamOfOne/Run Diagnostics`, check the Unity console for errors, and re-run until the console is clean. If Unity MCP is unavailable, fall back to documenting the blocked verification and the intended checks.
