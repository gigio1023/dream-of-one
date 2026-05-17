# Same Order Provider Scheduling Contract - 2026-05-16

Stage: M1 Protocol Proof
Build or artifact: `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
Status: `SCHEDULING_CONTRACT_PASS_LIVE_GODOT_REQUIRED`

## Scope

This is backend contract evidence for live provider scheduling. It defines the
role-agent jobs Godot should dispatch later, but it does not prove live Godot
dispatch or live model availability.

## Verified Contract

| Check | Result | Evidence |
|---|---|---|
| Role jobs exist | pass | 12 scheduled jobs cover clean, repair, soft report, and inquest routes. |
| Provider boundary | pass | Jobs allow proposal/wording fields only and forbid verdict, Exposure, suspicion, economy, ledger, object-state, and session-end authority. |
| Deterministic validation | pass | Each job carries the accepted locked action after affordance and citation validation. |
| Station citation | pass | The inquest Station job cites the exact escalated Store report ledger event. |
| Fallback wording | pass | Every job carries deterministic fallback wording. |
| Live Godot dispatch | open | `liveGodotDispatchVerified` remains `false`. |

## Required Next Evidence

- Wire Godot role-agent ticks to dispatch these scheduled provider jobs.
- Run the live backend bridge with provider scheduling enabled.
- Capture provider-on and fallback evidence proving the same ledger, object,
  and civic economy outcomes.
