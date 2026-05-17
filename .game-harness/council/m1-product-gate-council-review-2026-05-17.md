# M1 Product Gate Council Review

Date: 2026-05-17
Review mode: lean
Final verdict: `VERDICT: CONDITIONAL (external comprehension notes required)`

## Scope

Review whether the current Same Order M1 proof is ready to move beyond
technical proof toward product closure.

This review uses current repository evidence only. It does not simulate player
comprehension and does not approve a public demo claim.

## Proof Checked

- `.game-harness/player-comprehension-gate.md`
- `.game-harness/active-goal-proof-audit-2026-05-17.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/provider/same-order-provider-mode-decision-2026-05-17.md`
- `.game-harness/export/same-order-export-setup-proof-2026-05-17.md`
- `.game-harness/visual/same-order-manual-readability-review-2026-05-17.md`
- `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`

## Roles Activated

- Game Director
- Narrative Design
- Systems Design
- Godot Runtime
- QA / Playtest
- Producer

## Role Verdicts

| Role | Verdict | Reason |
|---|---|---|
| Game Director | `PASS` | The build and docs now point at one clear promise: the player answers an ordinary Store prompt and becomes the examined subject of NPC/Station record use. |
| Narrative Design | `PASS` | The two-step Same Order beat gives dialogue a job in play: safe, repair, soft report, and inquest routes change records and Station pressure instead of adding lore-only branches. |
| Systems Design | `PASS` | Backend/runtime owns validation, ledger, civic economy deltas, Station citation, fallback, and terminal authority; provider-shaped packets cannot own those outcomes. |
| Godot Runtime | `PASS` | Fresh Godot evidence shows typed input, record props, latest ledger actor/action, fallback-only provider state, and exact Station citation in HUD/capture artifacts. |
| QA / Playtest | `CONDITIONAL (external notes missing)` | Proxy and packet are ready, but no fresh tester notes prove that players understood examination, record causality, or role/action provenance. |
| Producer | `CONDITIONAL (product closure blocked)` | The smallest useful proof is now packaged and reviewable, but M1 cannot move to product-go before external comprehension and final go/no-go recording. |

## Product Checklist

| Area | Verdict | Evidence |
|---|---|---|
| Player role | pass | Direction docs, HUD copy, screenshots, and route proof frame the player as examined by Store/Station systems. |
| Text danger | pass | Dialogue choice and typed input change suspicion, report pressure, records, and route outcome. |
| Rule authority | pass | Provider mode decision and backend tests keep Evidence, Exposure, inquest, verdict, and session end in runtime authority. |
| Evidence visibility | pass with concern | HUD shows why-line, pressure, latest ledger event, role, action, and citation. World prop labels still depend on HUD support. |
| Korean-first parity | pass for M1 text | Korean prompt/choice meanings drive the current proof; English is support copy. |
| Scope discipline | pass | Current proof stays in one Store/Station cell and rejects broader content before comprehension. |
| External comprehension | missing | No human tester notes exist. |

## Provider Boundary Decision

`PASS` for fallback-only M1.

Current product truth is `fallback_only_m1`. The game may claim deterministic
fallback wording and provider-shaped backend contracts. It must not claim live
GPT behavior, Codex subscription reuse, fixed model access, or provider-owned
state changes.

Live provider mode remains a future gate requiring runtime credentials,
budgeted live smoke, model verification, schema/authority validation, and
Godot-to-backend dispatch proof.

## M1/M2 Decision

Current decision remains `M1_CONDITIONAL`.

Allowed next work:

- run the blind three-tester comprehension protocol;
- review raw manual notes through
  `.game-harness/scripts/review-same-order-comprehension-notes.sh`;
- copy accepted findings into the external comprehension ledger;
- record final M1 go/conditional/no-go after tester notes.

Not allowed before comprehension passes:

- broader content expansion;
- M2 social-pressure content;
- public demo claim;
- live GPT claim;
- route count expansion.

## Required Fixes

1. Run at least three fresh tester sessions.
2. Ensure at least two testers are Korean-first or Korean-comfortable for the
   Korean path.
3. Record direct quotes for O1-O7, especially:
   - player is examined by NPC/Station;
   - speech becomes a record;
   - delayed answer or hesitation becomes a record;
   - consequence follows the record;
   - latest record role/action is understood.
4. Update `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`.
5. Then record the final M1/M2 go/no-go decision.
