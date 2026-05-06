# M1 Implementation Handoff

Status: draft, ready for council review
Milestone: M1 Protocol Proof
Date: 2026-04-30

## Goal

Implement the smallest proof that player text can become Evidence, change Exposure, and produce a Godot-visible consequence without giving API/provider prose rule authority.

## File Ownership

| Owner Lane | Files | Responsibility |
|---|---|---|
| Backend Runtime | `backend/npc-runtime/src/godot/runtime-schema.ts`, `backend/npc-runtime/src/runtime/*`, backend fixture/test files if added | validate safe/risky intake payloads, Evidence, Exposure delta, fallback semantics |
| Godot Runtime | `godot/scripts/runtime/playable_session.gd`, `godot/scripts/runtime/runtime_slice.gd`, `godot/tools/evidence_run.gd`, `godot/tools/runtime_slice_smoke.gd`, `godot/tools/playable_slice_smoke.gd` | render and export M1 runtime consequence, do not own deterministic verdict |
| Godot World/UI | `godot/data/world_layout.json`, `godot/scripts/world/text_surface.gd`, `godot/scripts/ui/social_stealth_hud.gd`, `godot/scenes/main.tscn` if needed | show Station prompt, risk surface, and consequence |
| Localization | `godot/scripts/localization/localization_manager.gd` and localization data if present | preserve Korean source meaning and English consequence parity |
| Evidence/QA | `data/evidence/godot/`, `.game-harness/verification-ledger.md` | record command output, screenshots, Evidence JSON, pass/fail |

Exact file plan:
- `.game-harness/milestones/M1-file-plan.md`

## Scope

Implement:
- one intake prompt.
- one safe response.
- one risky response.
- one Evidence artifact.
- one Exposure delta.
- one visible consequence in Godot.
- deterministic fallback when provider key, model availability, rate limit, timeout, or proposal validation fails.

Do not implement:
- full inquest.
- final verdict.
- open chat.
- multi-location content.
- broad asset polish.
- store/public demo copy.

## Backend Acceptance

- use `.game-harness/milestones/M1-content-contract.md` as the source content/risk contract.
- safe and risky response fixtures validate through backend-owned schema.
- risky response produces Evidence with why-line.
- Exposure before/after is recorded.
- API proposal source cannot set action type, risk tag, Evidence type, reason codes, thresholds, verdict, or session termination.
- invalid payload fails with schema reason code.

## Godot Acceptance

- use `.game-harness/milestones/M1-content-contract.md` as the visible text/consequence contract.
- intake text surface is visible.
- Korean source text is visible by default.
- consequence is visible after risky response path.
- Evidence JSON is exported.
- screenshot shows relation between text risk and consequence.

## Required Commands

```bash
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Expected Artifacts

- `data/evidence/godot/runtime-slice/`
- `data/evidence/godot/playable-slice/`
- `data/evidence/godot/screenshots/`
- `.game-harness/verification-ledger.md`
- `.game-harness/drift-log.md` if any rule moves.

## Council Gate

Before implementation, obtain non-blocking verdicts from:
- Dream Law Counsel
- Text Danger Reviewer
- Station Pressure Reviewer
- Godot Evidence Reviewer
- Systems Producer

If any lane returns `BLOCK`, do not implement until the Director reducer records a decision.

## Handoff Verdict

Current verdict:
- `CONDITIONAL`: ready to become an implementation task after dirty worktree ownership is checked.
