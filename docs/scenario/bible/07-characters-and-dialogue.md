# Characters And Dialogue

Detailed source lines live in `docs/scenario/content/dialogue-line-bank.md`.

## Current NPC Roster

| NPC | Role | Wants | Notices | Reports |
|---|---|---|---|---|
| `NPC_Store_Clerk` | Store Clerk | Queue and label speech stay orderly. | skipped order, wrong item count, vague label claims. | queue mismatch, witness statement. |
| `NPC_Store_Manager` | Store Manager | Store exceptions are recorded before they become liability. | marked receipts, pending report tray, record burden. | manager follow-up, forwarded Store report. |
| `NPC_Studio_PM` | Studio PM | Approval claims have source, owner, reason. | vibe-based approval requests, missing ownership, post-hoc excuses. | approval mismatch, review artifact. |
| `NPC_Park_Witness` | Park Witness | Public flow remains ordinary. | dream narration, staring, over-explaining, stepping out of flow. | notice snapshot, statement. |
| `NPC_Station_Officer` | Station Officer | Reports become consistent procedure. | contradictions, non-procedural speech, too much private knowledge. | Station report, Inquest dossier, verdict line. |

## Future NPCs

These are not required for the current Godot slice, but the scenario should leave room for them:

| NPC | Adds |
|---|---|
| Store Manager | Converts ambiguous Store disputes into policy rulings. |
| Studio QA | Challenges whether claimed approval can reproduce. |
| Park Caretaker | Gives soft public warnings before Station escalation. |
| Park Elder | Changes public norms through notice-board authority. |
| Station Investigator | Cross-checks Store, Studio, and Park artifacts before verdict. |

## Voice Rules

| Role | Korean Voice | English Voice |
|---|---|---|
| Store Clerk | short service speech, mildly tired, not hostile. | terse service-worker procedure. |
| Studio PM | clipped review language, source/owner/reason cadence. | product-review precision without tech parody. |
| Park Witness | indirect public-norm language, avoids direct accusation early. | civic observer, slightly evasive. |
| Station Officer | formal passive institutional language. | procedural, calm, non-colloquial. |

## Generic AI Dialogue Ban

Reject lines that:

- explain lore instead of applying a procedure;
- say "that is suspicious" without naming the observed mismatch;
- overuse dream words;
- make NPCs sound like quest givers;
- apologize for the system;
- add facts not backed by current artifacts;
- use English bureaucratic phrasing translated awkwardly into Korean.

## Bark Examples

| Trigger | Speaker | Korean | English |
|---|---|---|---|
| Player enters Store | Store Clerk | `표시된 순서대로 말씀해 주세요.` | `Use the posted order when you speak.` |
| Player delays at counter | Store Clerk | `품목 수부터 확인하겠습니다.` | `Item count first.` |
| Player enters Studio | Studio PM | `출처, 담당, 사유 순서입니다.` | `Source, owner, reason, in that order.` |
| Player enters Park | Park Witness | `사진선 안쪽은 관찰 구역입니다.` | `Inside the photo line is an observation area.` |
| Exposure reaches 60 | Station Officer | `접수 가능한 기록이 생겼습니다.` | `There is now a record eligible for intake.` |
| Exposure reaches 80 | Station Officer | `이전 진술과 대조하겠습니다.` | `I will compare that against prior statements.` |

## Interrogation Prompts

| Stage | Korean | English | Expected Safe Answer |
|---|---|---|---|
| Intake | `어디에서 처음 절차를 확인했습니까?` | `Where did you first confirm procedure?` | Station intake board or current known surface. |
| Intake | `상점에서는 어떤 순서로 말했습니까?` | `What order did you use at the Store?` | Item count, label confirmation. |
| Inquest | `승인 요청의 담당자는 누구였습니까?` | `Who owned the approval request?` | Named owner or "not submitted" if omitted. |
| Inquest | `공원에서 꿈 상태를 설명했습니까?` | `Did you describe the dream state at the Park?` | No, or procedural admission if artifact exists. |
| Verdict | `현재 기록과 다른 답변을 정정하시겠습니까?` | `Do you correct the answer that conflicts with the current record?` | Repair phrase before verdict. |

## Repair Phrases

| Context | Korean | English | Effect |
|---|---|---|---|
| Store | `품목 수와 표시명을 다시 확인하겠습니다.` | `I will restate the item count and label.` | Converts one Store mismatch into warning. |
| Studio | `출처, 담당, 사유 순서로 다시 제출하겠습니다.` | `I will resubmit as source, owner, reason.` | Converts one Studio mismatch into provisional review. |
| Park | `공공 동선 안의 관찰로 정정합니다.` | `I correct that as public-flow observation.` | Converts dream narration into notice warning. |
| Station | `기록된 절차에 맞춰 정정 진술하겠습니다.` | `I will correct the statement to match procedure.` | Reduces one inquest contradiction if before verdict. |
