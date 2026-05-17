# Same Order Provider Dispatch Contract - 2026-05-16

Stage: M1 Protocol Proof
Build or artifact: `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
Status: `DISPATCH_PACKET_CONTRACT_PASS_LIVE_HTTP_REQUIRED`

## Scope

This is backend contract evidence for converting scheduled provider jobs into
`POST /v1/npc/decision` packets. It does not prove live Godot HTTP dispatch,
live model availability, or provider-on runtime behavior.

## Verified Contract

| Check | Result | Evidence |
|---|---|---|
| Decision packets exist | pass | 12 scheduled role-agent jobs produce `/v1/npc/decision` packets. |
| Schema safety | pass | Every packet parses as a `PerceptionPacket`. |
| Conversation authority guard | pass | Caller-authored suspicion/report/why-line fields remain rejected. |
| Bounded behavior | pass | Mock wording decisions pass bounded behavior without granting state authority. |
| Station packet | pass | The Station job dispatches at `Station`, uses `Ask`, and preserves procedural speech. |
| Live HTTP dispatch | open | `liveHttpDispatchVerified` remains `false`. |

## Required Next Evidence

- Send these packets from Godot role-agent ticks through the live backend bridge.
- Capture provider-on and fallback HTTP decision responses.
- Prove returned wording never mutates ledger, object, civic economy, verdict,
  Exposure, or session termination authority.
