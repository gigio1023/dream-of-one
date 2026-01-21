# Repo-specific agent notes
- Use GitHub MCP (personal account) for all GitHub actions on this project.
- Use GitHub MCP (personal account) for all git/GitHub actions (branches, commits, pushes, PRs). Avoid local git/gh.
- Do not use the local `gh` CLI because it is configured with company auth.
- When committing, prefer verbose bodies even for small changes: list what
  changed, why, files/paths touched, tests run, and any side effects or TODOs.
- When mentioning files in responses, always wrap the path in a proper Markdown link (e.g., `[docs/PLAN.md](docs/PLAN.md)`).
