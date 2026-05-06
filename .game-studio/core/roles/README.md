# Roles

Roles define review authority. Activate only the roles needed for the current
stage, files, and risk.

## Role Files

- `directors.yaml`: always-on direction and production authority.
- `leads.yaml`: discipline leads activated by content or risk.
- `specialists.yaml`: implementation specialists.
- `engine-specialists.yaml`: engine-specific specialists.
- `playbooks/`: role behavior and review prompts.

## Default Lean Council

- `game-director`
- `producer`
- `technical-director`
- `qa-lead`

## Authority Boundary

Roles may advise, block readiness, and name the next proof. They do not own the
human's taste, selected concept, Direction Lock, stage movement, or public
promises. When any of those decisions is required, return
`USER_DECISION_NEEDED`.

## Playbook Rule

Selecting a role is not enough. A review must use the relevant playbook and
produce role-specific findings, proof checked, internal evidence checked, and
verdicts.
