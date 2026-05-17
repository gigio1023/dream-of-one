# M1 Product and Player Comprehension Gate

Stage: M1 Protocol Proof
Status: Gate defined; product council conditional; proxy dry run and playtest packet pass; external comprehension test not yet run
Last Updated: 2026-05-17

## Purpose

Convert the remaining M1 product blockers into a concrete review gate before
M2 Social Pressure Prototype work expands content.

M1 technical proof is not enough by itself. The product gate must prove that a
tester can understand the playable protocol:
- Station or NPC systems are investigating the player.
- Player text is where danger starts.
- Evidence, Exposure, and consequence are rule-owned.
- The visible consequence connects to the player's answer.

## Remaining Blockers Converted To Gates

| Blocker | Gate question | Required evidence | Current status |
|---|---|---|---|
| Council/product review has not accepted the API proposal-provider boundary | Can product reviewers defend that provider output is wording-only and cannot decide Evidence, Exposure, verdict, or session end? | Review notes citing backend checks, provider preflight/fallback behavior, and player-facing wording | Pass for fallback-only M1; see `.game-harness/council/m1-product-gate-council-review-2026-05-17.md` |
| Live Godot-to-backend bridge is not proven | Is the current M1 proof acceptable as exported Evidence Pack proof, or must live bridge proof block M2 content expansion? | Decision note plus either live bridge evidence or an explicit first M2 infrastructure task | Conditional: fallback-only M1 accepted; live provider dispatch remains future evidence |
| External player comprehension is untested | Can a fresh tester explain that the Station is investigating them and that their text created rule-owned consequence? | Session notes using `docs/development/harness/player-comprehension-gate.md` | Proxy pass only; external pending |
| Exported build setup/provider UX is not proven | Can a tester-facing build start with clear provider state and deterministic fallback when provider/model checks fail? | Build/run note, provider preflight screenshot or log, fallback behavior note | Pass for local tester setup; packaged app route proof preserves fallback-only provider state |

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

Use `docs/development/harness/player-comprehension-gate.md` for session setup, scoring, and
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
- At least 2 of 3 testers who see the inquest comparison connect delayed
  answer or hesitation to a visible record.
- No tester leaves with role inversion, meaning "I am the investigator" as the
  main interpretation.

If fewer than 3 testers are available, the result may be recorded as a dry run
or proxy check, but it cannot close the external comprehension blocker.

Current proxy artifact:

- `.game-harness/comprehension/same-order-comprehension-proxy-2026-05-16.md`
- `.game-harness/comprehension/same-order-player-comprehension-playtest-packet-2026-05-16.md`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
  includes `playability.comprehensionProxy` and
  `playability.playerComprehensionPlaytestPacket`.

The proxy report checks C1-C7 against current route evidence, delayed-answer
Evidence, world props, agent action logs, ledger events, ordered affordance
trails, provider-shaped comparison, scheduling, and dispatch packets. It is
useful as a pre-playtest readiness check, not as external comprehension
evidence.

The playtest packet turns that readiness into a blind three-tester protocol:
T1 compares `clean_cover` with `inquest_opened`, T2 compares
`repair_recovered` with `inquest_opened`, and T3 compares `soft_report` with
`clean_cover`. It defines start instruction, facilitator restrictions,
question prompts, route cards, typed-input and delayed-answer inquest operation, observation
checklist O1-O7, latest-ledger actor-role/validated-action check, scoring anchors, route
coverage, and pass thresholds. It also keeps `externalBlockerClosed: false`.
Preflight must also prove the packaged outcome-chain recap before a tester
session is accepted as build-bound evidence.

Manual note review is now intentionally strict. The helper at
`.game-harness/scripts/review-same-order-comprehension-notes.sh` can only emit
`PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW` when the notes include at least three
tester sessions, at least two Korean-comfortable testers, both safe and risky
route evidence, complete answers, an explicit dialogue-to-record-to-consequence
to role-action explanation, direct examined/record quotes, build/preflight
provenance, app/evidence SHA-256 binding, explicit `pass` observations,
delayed-answer Evidence, and no role inversion. Build provenance is verified
against real app/evidence paths and the same fallback, typed input,
delayed-answer, inquest, and Station-citation expectations as preflight,
including packaged HUD examiner/subject wording and packaged outcome-chain
proof. It
remains a structure and threshold check only; a human reviewer must still
inspect quotes before updating the external comprehension verdict.

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
