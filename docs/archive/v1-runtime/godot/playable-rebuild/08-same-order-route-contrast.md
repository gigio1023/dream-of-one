# Same Order Route Contrast Pass

Status: active implementation note  
Date: 2026-05-11  
Basis: Game Studio `GS-CORE-LOOP`, `GS-SCENARIO-LEGIBILITY`, and Evidence Gates

## Goal

Make `Same Order` prove more than one forced failure path.

The player-facing prologue needs a small but real consequence space:

- clean cover: the player matches the Store Clerk's routine.
- repair recovery: the player exposes a memory gap but returns to the local premise.
- soft report: the player sounds wrong enough to be reported, but not enough for inquest.
- inquest opened: the player creates a hard contradiction or dream-language record.

This pass does not make the prologue demo-complete. It proves internal route
contrast so the next review can judge whether the loop is playable. Public
route-contrast claims still require manual player readability and comprehension
proof.

## Implemented Route Proofs

`godot/tools/playable_slice_smoke.gd` now runs fresh scenes for four routes:

| Route | Input Path | Outcome |
|---|---|---|
| `clean_cover` | `E -> 1 -> 1` | `cover_held`, no suspicion or Station intake. |
| `repair_recovered` | `E -> 2 -> 1` | `cover_held`, bounded memory-gap suspicion, no report. |
| `soft_report` | `E -> 3 -> 3` | `soft_report`, Station report filed, no inquest; continued play is not proven here. |
| `inquest_opened` | `E -> 3 -> 4` | `inquest_opened`, preset recorded statement crosses inquest threshold. |

The exported playable Evidence Pack still uses the hard inquest route as the
primary playable summary, but `playability.routeProofs` records all four route
proofs for backend validation.

## Backend Gate

`validateGodotEvidencePackSameOrderRouteProofs` validates the route-proof set.
It requires:

- all four route ids.
- embedded canonical route events for each route proof.
- four distinct route outcomes.
- three session outcomes: `cover_held`, `soft_report`, `inquest_opened`.
- clean cover below all suspicion/report thresholds.
- repair below the share threshold.
- soft report above report threshold and below inquest threshold.
- inquest route above the inquest threshold with recorded statement and
  `dream_language_leak`.

The previous inquest-only validator remains in place:
`validateGodotEvidencePackConversationSuspicionProof`.

## Product Truth

Allowed:

- Internal playable smoke proves route contrast for clean cover, repair,
  soft report, and inquest.
- The backend can validate both the inquest proof chain and the route-proof set.
- Same Order now has a basic success/failure/recovery shape.

Not allowed:

- Manual replay is proven.
- Human comprehension is proven.
- Player-facing/public route contrast is proven.
- Manual typed free input is proven.
- Live backend/provider authority is proven.
- The prologue is demo-complete or release-ready.
