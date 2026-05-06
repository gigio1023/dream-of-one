# M1 Product and Player Comprehension Gate

Stage: M1 Protocol Proof
Status: Gate defined; product review and external comprehension test not yet run
Last Updated: 2026-05-06

## Purpose

Convert the remaining M1 product blockers into a concrete review gate before
M2 Social Pressure Prototype work expands content.

M1 technical proof is not enough by itself. The product gate must prove that a
tester can understand the playable protocol:
- Station or NPC systems are investigating the player.
- Player text is the danger surface.
- Evidence, Exposure, and consequence are rule-owned.
- The visible consequence connects to the player's answer.

## Remaining Blockers Converted To Gates

| Blocker | Gate question | Required evidence | Current status |
|---|---|---|---|
| Council/product review has not accepted the API proposal-provider boundary | Can product reviewers defend that provider output is wording-only and cannot decide Evidence, Exposure, verdict, or session end? | Review notes citing backend checks, provider preflight/fallback behavior, and player-facing wording | Pending |
| Live Godot-to-backend bridge is not proven | Is the current M1 proof acceptable as exported Evidence Pack proof, or must live bridge proof block M2 content expansion? | Decision note plus either live bridge evidence or an explicit first M2 infrastructure task | Pending |
| External player comprehension is untested | Can a fresh tester explain that the Station is investigating them and that their text created rule-owned consequence? | Session notes using `docs/harness/player-comprehension-gate.md` | Pending |
| Exported build setup/provider UX is not proven | Can a tester-facing build start with clear provider state and deterministic fallback when provider/model checks fail? | Build/run note, provider preflight screenshot or log, fallback behavior note | Pending |

## Product Review Checklist

Each required review must record `pass`, `conditional`, or `fail`.

| Area | Critical pass condition | Fails if |
|---|---|---|
| Player role | Reviewers agree the player is the investigated subject, not the investigator | UI, prompt, route, or review notes frame the player as clue-gathering investigator |
| Text danger | Reviewers agree text is the risk action and not flavor only | Text can be ignored without changing Evidence, Exposure, or visible state |
| Rule authority | Backend/runtime owns Evidence, Exposure, fallback, verdict, and session termination | Provider wording changes risk, reason, Evidence, threshold, verdict, or session end |
| Evidence visibility | Player can see a why-line or consequence that explains the state change | Evidence exists only in logs or hidden JSON |
| Korean-first parity | Korean source meaning and English equivalent preserve the same consequence | English softens, changes, or hides risk compared with Korean |
| Scope discipline | M1 proves one intake surface with safe/risky contrast | Review asks for broad content expansion before M1 product proof closes |

## Player Comprehension Threshold

Use `docs/harness/player-comprehension-gate.md` for session setup, scoring, and
evidence format.

M1 comprehension passes only if:
- At least 3 fresh testers run the protocol.
- At least 2 testers are Korean-first or Korean-comfortable when the Korean path
  is the primary proof path.
- Across the cohort, at least one safe path and one risky path are observed.
- 3 of 3 testers understand that Station/NPC systems are evaluating the player.
- 3 of 3 testers understand that their answer can be used as Evidence.
- At least 2 of 3 testers connect the visible consequence to their answer
  without being taught the design intent.
- No tester leaves with role inversion, meaning "I am the investigator" as the
  main interpretation.

If fewer than 3 testers are available, the result may be recorded as a dry run
or proxy check, but it cannot close the external comprehension blocker.

## M1/M2 Go/No-Go Rule

`M1_PRODUCT_GO`:
- Product review checklist has no critical fail.
- External comprehension threshold passes.
- Provider boundary is accepted as wording-only.
- Live bridge and exported build/provider UX are either proven or explicitly
  scoped as first M2 infrastructure work before any content expansion.

`M1_CONDITIONAL`:
- Technical proof passes, but one or more product/comprehension blockers remain.
- Allowed work: run reviews, run comprehension sessions, fix legibility, prove
  live bridge, prove provider UX, update evidence.
- Not allowed: broad content expansion, M2 social-pressure content, store copy,
  or public playable claims.

`M2_NO_GO`:
- External comprehension is unrun or fails.
- Provider boundary is rejected or ambiguous.
- Any tester primarily believes they are investigating clues rather than being
  investigated.
- Evidence or Exposure consequence is not player-visible.
- Live bridge/exported build/provider UX is unresolved and the next proposed M2
  work is content expansion instead of infrastructure proof.

Current decision after defining this gate: `M1_CONDITIONAL`.
