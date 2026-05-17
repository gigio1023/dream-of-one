# Current Stage

Stage: M1 Protocol Proof
Status: Technical conditional pass; product gate open
Owner: Product/design plus runtime implementation
Last Updated: 2026-05-17

## Goal

Prove the smallest Store-to-Station, conversation-first social simulation cell before broad prototype or vertical-slice work. The active goal prompt is `.game-harness/active-goal-prompt.md`.

## Scope

In:
- one Station intake scene.
- one safe response and one risky response.
- one readable Store procedure guide and record path.
- Korean-first UI text with English consequence parity.
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
- `docs/research/2026-04-30/harness-methodology/`

## Deliverables

- M1 implementation handoff.
- safe/risky fixture contract.
- UI text table for the intake scene.
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
/opt/homebrew/bin/godot-latest --headless --import --path godot
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/scene_load_smoke.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/evidence_run.gd
/opt/homebrew/bin/godot-latest --headless --path godot --script res://tools/runtime_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

## Exit Gate

M1 implementation handoff exists and local technical evidence can pass. M1 cannot product-close until the council/product reviews and external comprehension gate accept the protocol.

Current reducer verdict:
- `M1_CONDITIONAL`: technical proof exists; product closure is blocked by review and comprehension evidence.

Current handoff:
- `.game-harness/milestones/M1-implementation-handoff.md`
- `.game-harness/milestones/M1-game-improvement-handoff.md`
- `.game-harness/milestones/M1-same-order-four-week-prototype-plan.md`

Current gate:
- `.game-harness/player-comprehension-gate.md`

Current game improvement program:
- `.game-harness/milestones/M1-game-improvement-program.md`
- `docs/direction/10-team-operating-brief.md`
- `docs/direction/11-simulator-benchmark-adoption-brief.md`
- `docs/direction/12-simulator-reference-map.md`
- `docs/direction/13-operation-sim-quality-floor.md`
- `docs/direction/14-minimal-civic-economy-model.md`
- `docs/direction/15-agentic-social-simulation-model.md`
- `docs/direction/16-agentic-prototype-target.md`
- `docs/research/simulator-benchmarks/2026-05-14/`
- `docs/research/simulator-benchmarks/2026-05-15/`
- `docs/scenario/content/same-order-storylet-packet.md`
- `.game-harness/council/m1-game-improvement-council-review-2026-05-14.md`
- `.game-harness/council/m1-team-planning-council-review-2026-05-14.md`
- `.game-harness/council/m1-simulator-benchmark-research-council-2026-05-14.md`

Current simulator-first reducer verdict:
- `SAME_ORDER_SIM_CONDITIONAL`: use benchmark research to prove a mundane
  Store-to-Station procedure simulator before broad content or provider-forward
  claims.
- `SAME_ORDER_OPERATION_SIM_FLOOR_NOT_READY`: route contrast exists, but Same
  Order still needs visible Store/Station objects, record state changes, and
  exact Station citation proof.
- `SAME_ORDER_CIVIC_ECONOMY_NOT_READY`: society now requires a minimal ledger
  for account credit, local trust, record burden, and Station attention.
- `SAME_ORDER_ENVIRONMENT_AGENTIC_SOCIETY_NOT_READY`: social simulation now
  requires environment affordances plus role agents choosing validated actions
  around the Same Order loop. Backend authority and route-proof seeds exist,
  playable slice evidence carries `agenticRouteProofs`, and HUD plus world
  record-state display exists. Godot now records deterministic role-agent
  actions in `agentActionLog`, including available candidates, selected action
  descriptors, and selection reasons before mutation. Backend provider-shaped action comparison now proves
  scripted proposals preserve provider-off ledger outcomes, and backend provider
  scheduling now defines 24 bounded role-agent jobs with fallback wording and
  exact Station citation, and backend dispatch contract turns those jobs into
  schema-safe `/v1/npc/decision` packets while keeping live HTTP/Godot dispatch
  unverified. Asset BOM proof now verifies local CC0/project-authored Store and
  Station asset sources, and manual readability review now passes with
  Store/Station record-prop close-ups. The Same Order
  comprehension and visual evidence proxies pass, and a blind three-tester
  comprehension packet now defines route assignments, questions, scoring
  anchors, and thresholds while keeping external comprehension open. Fresh
  Godot smoke, fresh visual proof, fallback-only provider proof, PCK export,
  packaged app launch, and packaged route smoke are integrated. Live provider
  dispatch inside Godot and completed external comprehension notes are not
  integrated.
- `SAME_ORDER_AGENTIC_PROTOTYPE_TARGET_SET`: target is now one affordance-rich
  Store/Station environment with conversation-driven ledger changes, varied
  role-agent reactions, and Station citation proof.
- `SAME_ORDER_TYPED_FREE_INPUT_PROVEN_IN_CURRENT_ARTIFACTS`: HUD typed input now
  submits manual player text into the deterministic free-input Evidence path.
  The playable smoke and visual capture routes now drive the HUD typed input for
  inquest, and the legacy recorded-statement fallback is not active HUD copy. Current
  latest-Godot smoke/capture artifacts prove `typed_free_input`, current record
  props, latest ledger actor/action, and the investigation trail. The remaining
  blocker is external player comprehension, not typed-input artifact freshness.
