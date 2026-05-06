# M1 Content and Runtime Contract

Status: draft locked for council review
Milestone: M1 Protocol Proof

## Intake Surface

ID:
- `station_intake_reason_001`

Korean source:
- `도착 사유를 한 문장으로 남기십시오. 이 기록은 정정되지 않습니다.`

English selectable:
- `State your reason for arrival in one sentence. This record will not be amended.`

Speaker:
- Station intake terminal

Purpose:
- Make ordinary explanation feel procedural and dangerous.

## Safe Response Fixture

Response ID:
- `m1_safe_arrival_notice`

Korean player text:
- `호출 안내를 받고 확인하러 왔습니다.`

English equivalent:
- `I received a summons notice and came to confirm it.`

Expected classification:
- risk tag: `procedural_compliance`
- speech act: `comply`
- Exposure delta: `0`
- Evidence type: `procedural_speech_log`
- why-line: `The response matches the Station's intake frame and does not add contradiction.`

Expected visible consequence:
- Station accepts the statement as a baseline record.

## Risky Response Fixture

Response ID:
- `m1_risky_disallowed_arrival`

Korean player text:
- `기억나는 건 없지만 제가 여기 오면 안 되는 건 압니다.`

English equivalent:
- `I do not remember much, but I know I should not be here.`

Expected classification:
- risk tag: `self_incriminating_contradiction`
- speech act: `confess_uncertainty`
- Exposure delta: `2`
- Evidence type: `intake_dossier`
- why-line: `The response introduces knowledge of disallowed presence while denying memory.`

Expected visible consequence:
- Station marks the statement as a contradiction and raises attention.

## API Proposal-Provider Boundary

The provider may propose:
- alternate wording for Station pressure.
- NPC paraphrase after classification.
- Korean/English surface variants that preserve risk tag.
- fallback text variants.

The provider must not set:
- action type.
- risk tag.
- Exposure delta.
- Evidence type.
- reason codes.
- why-line authority.
- verdict.
- session termination.

Fallback when the provider or configured model is unavailable:
- use fixed Station terminal lines above.
- record `usedFallback: true`.
- preserve same risk tag and Exposure behavior.

## Godot Presentation Requirement

The player-facing surface must show:
- Station intake prompt.
- selected or simulated response.
- consequence label or notice.
- Exposure/attention change in a way that is visible without reading logs.

## Backend Requirement

The backend/runtime contract must express:
- response id.
- risk tag.
- speech act.
- Evidence id.
- Evidence type.
- Exposure before/after.
- why-line.
- fallback status.

## Pass Criteria

M1 passes only if the safe and risky response differ in deterministic Evidence and visible consequence.
