# CI runner policy

## Required runner set

All GitHub Actions workflows in this repository **must** use the `doo-arc-runner-set` runner set:

- Use `runs-on: doo-arc-runner-set`.
- Do not use `ubuntu-latest` (or any GitHub-hosted runner label) for repository workflows.

This requirement prevents consuming GitHub Pro hosted-runner quota.
