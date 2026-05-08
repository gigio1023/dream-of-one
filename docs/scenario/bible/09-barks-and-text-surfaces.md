# Barks And Text Surfaces

## Bark System

Barks are not flavor chatter. They are short social signals that:

- teach current procedure;
- show NPC attention;
- warn before escalation;
- confirm state change;
- vary public mood by Exposure.

## Bark Fields

| Field | Meaning |
|---|---|
| `id` | Stable localization key. |
| `speakerRole` | NPC role or system voice. |
| `trigger` | Zone entry, idle delay, failed speech, threshold crossing, artifact created. |
| `stage` | `ambient`, `report`, `intake`, `inquest`, or `verdict`. |
| `priority` | `low`, `normal`, `urgent`. |
| `cooldownSeconds` | Minimum repeat delay. |
| `ko` | Korean source line. |
| `en` | English localized line. |
| `evidenceLink` | Artifact or state if the bark matters mechanically. |

## Bark Table

| ID | Trigger | Stage | Korean | English |
|---|---|---|---|---|
| `bark.store.order` | Enter Store counter | ambient | `먼저 수량입니다.` | `Quantity first.` |
| `bark.store.mismatch` | Store risky dialogue line | report | `방금 발화는 대기 기록과 맞지 않습니다.` | `That statement does not match the queue record.` |
| `bark.studio.fields` | Enter Studio zone | ambient | `출처, 담당, 사유가 있어야 검토됩니다.` | `Review needs source, owner, and reason.` |
| `bark.studio.provisional` | Studio uncertain/repair line | report | `임시 검토로만 남기겠습니다.` | `I will leave that as provisional review.` |
| `bark.park.flow` | Enter Park photo spot | ambient | `관찰은 동선 안에서만 가능합니다.` | `Observation stays inside public flow.` |
| `bark.park.statement` | Park risky recorded statement | report | `그 표현은 진술로 남습니다.` | `That wording remains as a statement.` |
| `bark.station.intake_open` | Exposure 60 | intake | `접수 가능한 기록이 생겼습니다.` | `There is now a record eligible for intake.` |
| `bark.station.inquest_open` | Exposure 80 | inquest | `이전 기록과 대조하겠습니다.` | `I will compare this against prior records.` |
| `bark.station.verdict` | Exposure 100 | verdict | `판정 가능한 상태입니다.` | `This is now ready for verdict.` |

## Text Surface Rules

| Rule | Reason |
|---|---|
| One readable rule per conversation-risk path. | Player must be able to learn before failure. |
| Body text under 140 Korean characters. | Diegetic text should be readable in 3D. |
| Use procedure verbs, not lore nouns. | The surface must tell the player how to behave. |
| Attach law ID and conversation/signal context in data. | Evidence must remain auditable. |
| Text must be cited by at least one bark or why-line. | No isolated lore signs. |

## Text Surface Set

| ID | Korean Source Direction | English Direction |
|---|---|---|
| `TS_Store_QueueRules` | `수량 → 표시명 → 확인` order must be explicit. | Keep item count and label confirmation order. |
| `TS_Studio_ApprovalCriteria` | `출처/담당/사유` cadence must repeat. | Preserve source/owner/reason cadence. |
| `TS_Park_NoticeBoard` | Public-flow wording must discourage over-explanation. | Avoid "dream" unless warning against saying it. |
| `TS_Station_IntakeRules` | Cold intake language: accepted statements, consistency, procedure. | Formal, not police-drama. |

## Authoring Guardrails

- Write five candidate barks for each trigger and keep the two sharpest.
- Prefer concrete record words: `기록`, `진술`, `접수`, `대조`, `정정`, `판정`.
- Avoid filler: `수상하군`, `이상하네요`, `무슨 일이죠`.
- A bark may hint, pressure, or confirm. It must not explain the whole world.
