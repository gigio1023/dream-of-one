# Team Operating Brief

Status: active team brief for scoped M1 planning
Date: 2026-05-14
Source: Game Studio design council review

## Verdict

Dream of One is ready for a small team to run a narrow M1 Same Order prototype.
It is not ready for broad content production, vertical slice work, or public
demo claims.

Current operating verdict:

| Scope | Verdict | Rule |
|---|---|---|
| Direction discussion | `READY` | The team can use the design spine as the shared language. |
| Same Order M1 prototype | `READY_WITH_CONCERNS` | Work may proceed if every task names proof and cut rules. |
| Broad M2 content | `NOT_READY` | No Studio/Park expansion until Same Order closes. |
| Public demo claim | `NOT_READY` | No public promise until comprehension, provider/export truth, and release audit pass. |

## One-Sentence Player Promise

The player tries to pass as ordinary in a dream society where everyday speech
is recorded, compared, and used by NPC and Station systems to determine whether
the player belongs.

## Non-Negotiables

- The player is not an investigator.
- The primary verb is dialogue under local procedure.
- Text is where the danger starts.
- NPCs apply social pressure before the Station formalizes it.
- Provider output is wording only.
- Backend/runtime owns suspicion signals, Evidence, Exposure, report, inquest,
  verdict, and session end.
- Korean source text owns meaning; English must preserve consequence parity.
- No stage movement or public promise happens without a decision record.

## Current Prototype Question

Can a fresh player understand that a Store conversation creates a record that
NPC and Station systems investigate?

The target proof is one complete Same Order design cell:

```text
Store premise
-> player speech
-> Store Clerk social read
-> visible record or repair
-> report handoff
-> Station reconciliation prompt
-> clean cover, repair, soft report, or inquest outcome
```

## Team Scope

### In

- Same Order only.
- Store Clerk, optional Store Manager/report artifact, and Station Officer.
- three authored speech choices.
- recorded-statement lane only if it is clearly implemented or explicitly cut.
- visible cause chain from utterance to suspicion/report/Evidence.
- one Station reconciliation prompt that cites the exact Store record.
- Korean-first copy and English parity review.
- human readability review and external comprehension dry run.

### Out

- Studio/Park playable expansion.
- broad social simulation.
- full campaign or vertical slice.
- final art/audio pass.
- public store/pitch copy.
- live provider as a player promise unless provider preflight and fallback UX are
  the explicit proof target.

## Open Decisions

| Decision | Owner | Due | Default if unresolved |
|---|---|---|---|
| Typed recorded-speech UI | Game Director + Godot UX + Systems | Week 1 midweek | Implemented as HUD typed input; keep the internal fixed record path only as non-tester fallback. |
| Live provider vs fallback-only prototype | Producer + Systems | Week 4, or earlier if it blocks UI copy | Fallback-only prototype; no live AI claim. |
| Public/demo promise wording | Producer + Release reviewer | After M1 product gate | No public demo claim. |
| Prologue end definition | Game Director + QA | Week 4 gate | M1 remains conditional; do not advance. |

## Role Ownership

| Role | Owns | Must produce |
|---|---|---|
| Game Director | player promise, scope cuts, stage decisions | go/no-go verdict and accepted risks |
| Producer | 4-week plan, gates, blocked scope, owner map | weekly gate status and cut calls |
| Narrative Director | storylet packet, Korean-first lines, NPC pressure | approved Same Order storylet cards and line variants |
| Systems Designer | signals, thresholds, route outcomes, repair logic | beat-to-runtime matrix and route coverage |
| Backend Runtime | schema, validation, provider/fallback authority | passing backend checks and Evidence validation |
| Godot Runtime/UX | player input, HUD, visual cause chain, capture | playable route, screenshot/video proof, readability fixes |
| Art/Audio Direction | procedure readability, pressure cues, sensory hierarchy | sensory matrix and non-audio fallback plan |
| QA Lead | comprehension gate, bug triage, retest | playtest notes, blockers, and retest status |

## Same Order Operating Contract

Required artifacts before implementation expansion:

- `docs/scenario/content/same-order-storylet-packet.md`.
- beat-to-runtime matrix for each prompt.
- route coverage for `clean_cover`, `repair_recovered`, `soft_report`, and
  `inquest_opened`.
- provider prompt fixtures or explicit fallback-only decision.
- sensory matrix for Store arrival, active dialogue, mismatch, report handoff,
  Station reconciliation, and end state.
- current verification ledger update after proof runs.

## First-Read And Sensory Contract

The first readable element changes by moment:

| Moment | First read | Second read | Third read |
|---|---|---|---|
| Store arrival | Store Clerk and counter | queue mark and label board | Station sightline |
| Rule read | local procedure object | player action prompt | pressure cue |
| Active dialogue | NPC prompt | three speech choices | recorded-statement affordance if enabled |
| Mismatch | selected/entered player line | NPC reaction | why-line |
| Report handoff | record or clerk action | report destination | pressure state |
| Station reconciliation | Station question | cited Store record | allowed repair or answer shape |
| End state | deterministic outcome | why-line | restart/exit controls |

Audio can reinforce these states but must never be the only gameplay signal.

## Cut Rules

- Cut typed free input before cutting the three-choice loop.
- Cut live provider before cutting deterministic fallback playability.
- Cut Studio/Park before cutting Store-to-Station reconciliation.
- Cut visual polish before cutting readability.
- Cut public copy before weakening release truth.

## Required Proof

Minimum internal artifacts for this team cycle:

- valid playable Evidence Pack.
- route proof for clean cover, repair, soft report, and inquest.
- renderer-backed screenshot/contact sheet after UI changes.
- end-to-end Same Order video or walkthrough capture.
- human readability note.
- external comprehension notes from fresh testers or a clearly marked proxy dry
  run.
- provider/fallback decision record.
- M1/M2 go/no-go review.

## Blocked Until Proof

The following remain blocked:

- M2 content expansion.
- new playable locations.
- broad NPC society simulation.
- vertical slice language.
- demo/release copy.
- live AI claims.
- fixed GPT model claims.
- Steam/itch page work.

## Next Team Meeting

Agenda:

1. Confirm recorded-statement decision.
2. Assign storylet packet, runtime matrix, UI readability, and QA test packet owners.
3. Approve the 4-week Same Order prototype plan.
4. Create or update Linear issues from the plan.
5. Record any human stage or public-promise decision separately.
