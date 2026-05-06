# Current Stage

Stage: M1 Protocol Proof
Status: Technical conditional pass; product gate open
Owner: Product/design plus runtime implementation
Last Updated: 2026-05-06

## Goal

Prove the smallest text-to-Evidence-to-Exposure protocol before broad prototype or vertical-slice work.

## Scope

In:
- one Station intake surface.
- one safe response and one risky response.
- Korean-first text surface with English consequence parity.
- API proposal-provider wording boundary.
- Backend-owned deterministic rule/evidence contract.
- Godot-visible consequence and screenshot evidence.

Out:
- Full campaign.
- Unbounded NPC chat.
- Final art pass.
- Store launch.
- Multiplayer or online service.

## Required Inputs

- `docs/scenario/`
- `docs/design/`
- `backend/npc-runtime/src/godot/runtime-schema.ts`
- `godot/data/world_layout.json`
- `godot/scenes/main.tscn`
- `docs/research/harness-methodology/2026-04-30/`

## Deliverables

- M1 implementation handoff.
- safe/risky fixture contract.
- text surface table for the intake surface.
- Evidence JSON with why-line and Exposure delta.
- Godot screenshot showing consequence.
- council review entries.

## Required Role Reviews

| Role | Required | Current Result |
|---|---:|---|
| Game Director | yes | pending product verdict |
| Narrative Design | yes | pending product verdict |
| Systems Design | yes | pending product verdict |
| Godot Runtime | yes | bridge fallback harness exists; live backend integration pending |
| QA / Playtest | yes | external comprehension pending |
| Art / Audio / Game Feel | no | deferred until M2/M3 |
| Release Producer | no | deferred until M5 |

## Acceptance Criteria

- M1 intake has trigger, state, text, consequence, fallback, and expected evidence.
- API provider output is bounded to wording only and cannot decide action, risk, Evidence, Exposure, verdict, or session termination.
- Korean text is source meaning; English selectable text preserves system consequence.
- Godot playable path shows the player being investigated, not investigating.
- Evidence output explains why a response changed state.

## Verification Commands

```bash
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Exit Gate

M1 implementation handoff exists and local technical evidence can pass. M1 cannot product-close until the council/product reviews and external comprehension gate accept the protocol.

Current reducer verdict:
- `M1_CONDITIONAL`: technical proof exists; product closure is blocked by review and comprehension evidence.

Current handoff:
- `.game-harness/milestones/M1-implementation-handoff.md`

Current gate:
- `.game-harness/player-comprehension-gate.md`
