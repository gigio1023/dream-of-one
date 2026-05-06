# M1 File Plan

Status: selected
Milestone: M1 Protocol Proof

## Backend Files

Primary implementation candidates:
- `backend/npc-runtime/src/godot/runtime-schema.ts`
- `backend/npc-runtime/src/runtime/decision-service.ts`
- `backend/npc-runtime/src/runtime/fallback.ts`
- `backend/npc-runtime/src/runtime/lifecycle-gates.ts`

Required test file:
- `backend/npc-runtime/test/integration/m1-protocol-proof.integration.test.ts`

The M1 test file should cover:
- safe response fixture.
- risky response fixture.
- invalid payload rejection.
- API proposal provider cannot set action type, risk tag, Evidence type, reason codes, Exposure, verdict, or session termination.
- fallback preserves deterministic result.

## Godot Files

Primary implementation candidates:
- `godot/scripts/runtime/playable_session.gd`
- `godot/scripts/runtime/runtime_slice.gd`
- `godot/scripts/ui/social_stealth_hud.gd`
- `godot/scripts/world/text_surface.gd`
- `godot/data/world_layout.json`

Required tool updates or additions:
- `godot/tools/playable_slice_smoke.gd`
- `godot/tools/runtime_slice_smoke.gd`
- `godot/tools/visual_capture.gd`

## Evidence Artifact Paths

Runtime evidence:
- `data/evidence/godot/runtime-slice/m1_protocol_proof_runtime_evidence.json`

Playable evidence:
- `data/evidence/godot/playable-slice/m1_protocol_proof_playable_evidence.json`

Screenshot:
- `data/evidence/godot/screenshots/m1-protocol-proof.png`

Verification ledger:
- `.game-harness/verification-ledger.md`

## Ownership Rule

Do not edit all listed candidates by default. The implementation worker must first inspect actual call paths and then touch the smallest set needed to produce the evidence.

## Dirty Worktree Rule

Before implementation:
- record `git status --short`.
- list files the worker intends to touch.
- do not revert unrelated existing changes.
