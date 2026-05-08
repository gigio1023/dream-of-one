# Readiness Gates

## Current Verdict

Ready for M1 Protocol Proof preparation.

Not ready for:
- broad content expansion.
- vertical slice implementation.
- public demo.
- store/pitch publication.

## Gate A: Direction Readiness

Pass criteria:
- thesis exists.
- pillars exist.
- anti-games exist.
- API proposal-provider premise and runtime model availability rule are recorded.
- 3D value gate is explicit.

Current status:
- Pass with caution. Pillars exist, but player experience timing and release strategy needed separate active docs. These have been added under `docs/direction/`.

## Gate B: Milestone Readiness

Pass criteria:
- current milestone has product risk, scope, evidence, council lanes, exit verdict.
- milestone does not attempt vertical slice before protocol proof.

Current status:
- Pass for M1 after `.game-harness/milestones/M1-protocol-proof.md`.

## Gate C: Execution Readiness

Pass criteria:
- exact file ownership exists.
- acceptance criteria are testable.
- verification commands are known.
- evidence artifact paths are defined.

Current status:
- Pass for narrow M1 backend-first implementation. Broad Godot/content implementation remains conditional on preserving existing dirty worktree changes.

## Gate D: Director Council Readiness

Pass criteria:
- required lanes are named.
- each lane has verdict format.
- reducer owner is explicit.

Current status:
- Pass structurally. Actual lane reviews are pending.

## Gate E: Implementation Start

Pass criteria:
- council reviews are not blocking.
- implementation handoff exists.
- Beads/Linear task is selected.
- dirty worktree is understood.

Current status:
- Not yet pass. The repo has many existing dirty changes. Do not start broad implementation until the selected issue scope and ownership are isolated.

## Gate F: Vertical Slice Start

Pass criteria:
- M1 Protocol Proof passes.
- M2 Social Pressure Prototype passes.
- M3 3D Value Gate passes.

Current status:
- Blocked.

## Required Next Move

Start M1 backend-first implementation, then wire Godot-visible consequence after backend expected state is explicit.
