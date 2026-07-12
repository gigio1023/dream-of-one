# Localization Style Guide

Detailed Korean voice notes and external localization references live in `docs/scenario/content/korean-voice-notes.md`.

## Source Language

Korean is the source language for player-facing scenario tone. English,
Italian, Simplified Chinese, French, and Japanese preserve function and mood,
not literal word order. Target gameplay locales are `ko-KR`, `en-US`,
`it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`; other Chinese variants keep separate
tags when added rather than being collapsed into `zh`.

Every translation preserves speaker identity, evidence facts, procedural
distance, placeholders, and stable ids. It may reshape sentence order and
honorific strategy to sound native. Locale reviewers extend the terminology
table below for their language before release; untranslated Korean fallback is
never accepted as parity.

## Tone

| Layer | Korean Register | English Register |
|---|---|---|
| Public signs | concise institutional 안내문. | concise public notice. |
| Store | service-polite, slightly tired. | practical service speech. |
| Studio | review/procedure language. | operational review speech. |
| Park | indirect public norm language. | civic norm speech. |
| Station | formal passive authority. | formal procedural authority. |
| Verdict | cold classification. | terse institutional classification. |

## Terminology

| Concept | Korean | English | Notes |
|---|---|---|---|
| Dream Law | 꿈의 법 | Dream Law | Use sparingly in UI; signs should usually state the procedure. |
| Cover Test | 위장 시험 | Cover Test | "위장" points to performed normality, not disguise costume. |
| Exposure | 노출 | Exposure | Keep as meter/system term. |
| Station Intake | 스테이션 접수 | Station Intake | Do not translate Station as police unless context requires it. |
| Inquest | 심문 | Inquest | Use for formal comparison stage. |
| Verdict | 판정 | Verdict | Classification, not moral judgment. |
| why-line | 사유선 | why-line | Short reason trace for state change. |
| Evidence | 증거 | Evidence | Formal artifact, not clue. |
| Statement | 진술 | Statement | Player speech made record. |
| Correction | 정정 | Correction | Repair phrase before verdict. |

## Korean Writing Rules

- Prefer institutional nouns and verbs: `확인`, `접수`, `대조`, `기록`, `진술`, `정정`, `판정`.
- Use polite endings for NPCs before escalation: `-해 주세요`, `-하겠습니다`.
- Shift to passive authority as pressure rises: `기록되었습니다`, `인정되지 않았습니다`.
- Do not overuse direct accusation. The system should feel worse because it is calm.
- Avoid internet slang, melodrama, and dream-poetry in procedure text.

## English Writing Rules

- Use short present-tense procedural lines.
- Preserve field cadence: source, owner, reason.
- Avoid cop-show phrasing.
- Avoid translating every honorific nuance; convert it into distance and formality.
- Keep UI strings shorter than Korean when possible because English expands in HUD layouts.

## Example Pairs

| Function | Korean | English |
|---|---|---|
| Store rule | `수량을 먼저 말하고 표시명을 확인하세요.` | `State quantity first, then confirm the label.` |
| Studio rule | `검토 전 출처, 담당, 사유를 제시하세요.` | `Before review, provide source, owner, and reason.` |
| Park rule | `관찰은 공공 동선 안에서만 허용됩니다.` | `Observation is allowed only inside public flow.` |
| Station rule | `접수 답변은 절차형 진술로만 인정됩니다.` | `Intake answers are accepted only as procedural statements.` |
| Verdict | `현재 기록은 판정 가능한 상태입니다.` | `The current record is ready for verdict.` |
