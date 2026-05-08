# Dialogue Line Bank

Use this as the first authoring pool for barks, overheard lines, interrogation prompts, defuse phrases, and why-lines. Lines here are scenario source content; implementation can move them into localization resources later.

## NPC Archetype Rules

| Archetype | Investigation Function | Korean Voice Constraint | Pressure Style | Must Never Say |
|---|---|---|---|---|
| Store Clerk | Observes queue, label, receipt order. | Short service language: `확인하겠습니다`, `순서`, `라벨`. | Low pressure; repeats procedure as if helping. | `제가 수사하겠습니다.` |
| Store Manager | Promotes clerk observations into store records. | Manager language: `예외`, `승인`, `기록`, `재발 방지`. | Medium pressure; exceptions still create records. | `그냥 넘어가죠.` |
| Studio PM | Blocks approval without source, owner, reason. | Work language: `근거`, `소유자`, `승인 조건`, `릴리즈 후보`. | High pressure; asks for artifacts over feelings. | `느낌상 괜찮아요.` |
| Studio QA | Finds gaps between claims and evidence. | Verification language: `재현`, `로그`, `불일치`, `보류`. | Calm questions; avoidance becomes record. | `대충 맞겠죠.` |
| Park Caretaker | Observes public flow, noise, photo rules. | Soft civic language: `공용`, `흐름`, `게시판`. | Redirects first, reports repeated violations. | `꿈 얘기 좀 해보세요.` |
| Park Elder | Acts as policy witness for norms. | Slow, short sentences: `여기서는`, `게시한 대로`. | Social pressure through posted norms. | `내 직감으로는.` |
| Station Officer | Owns report intake, soft inquest face, verdict delivery. | Administrative authority: `접수`, `진술`, `대조`, `판정`. | High pressure; polite but never yields question authority. | `당신 의견이 진실입니다.` |
| Station Investigator | Cross-checks evidence across organizations. | Precise language: `시각`, `장소`, `증거물`, `모순`. | Highest pressure; limits answer shape. | `상상해봅시다.` |

## Bark Lines

| Trigger | Speaker | Korean | English Intent | Function |
|---|---|---|---|---|
| Near Store queue | Clerk | `줄 표식 안에서 말씀해 주세요.` | Speak inside the queue marker. | Cover Test setup. |
| Skip queue | Clerk | `순서가 비었습니다. 앞 사람 확인이 먼저입니다.` | Queue order is missing. Confirm the person ahead. | Soft pressure. |
| Read Store rule | Clerk | `게시문을 읽으셨으면 수량부터 말해 주세요.` | If you read the notice, state count first. | Dream Law reinforcement. |
| Vague Store request | Clerk | `상품명만으로는 접수되지 않습니다. 수량과 라벨을 같이요.` | Item name is not enough. Add count and label. | Defuse hint. |
| Store escalation | Manager | `예외는 만들 수 있습니다. 기록 없이 만들 수는 없습니다.` | Exceptions require records. | Artifact pressure. |
| Studio approval desk | PM | `승인은 요청이 아니라 묶음입니다. 출처, 소유자, 사유.` | Approval requires source, owner, reason. | Cover Test setup. |
| Claim RC ready | QA | `준비됐다는 말은 로그가 아닙니다.` | "Ready" is not a log. | Evidence pressure. |
| Missing approval | PM | `승인서가 늦으면 릴리즈도 늦습니다.` | Late approval delays release. | Consequence. |
| Park photo zone | Caretaker | `촬영은 흐름을 막지 않을 때만 허용됩니다.` | Photos are allowed only if public flow stays clear. | Cover Test setup. |
| Dream-like phrase | Elder | `그 말은 게시판 밖입니다.` | That phrase is outside the notice. | Dream-talk warning. |
| Repeated loiter | Caretaker | `자리보다 시선이 오래 머물렀습니다.` | Your gaze stayed longer than your seat use. | Observation pressure. |
| Station entrance | Officer | `신고는 감정 순서가 아니라 사실 순서로 받습니다.` | Reports use fact order, not emotion order. | Station setup. |
| Intake opens | Officer | `지금부터 답변은 접수 형식으로만 남깁니다.` | Answers are now recorded in intake format. | State transition. |
| Inquest opens | Investigator | `같은 사건에 두 시각이 있습니다. 하나는 지워야 합니다.` | One event has two times. One must be removed. | Inquest pressure. |
| Verdict ready | Officer | `판정문은 이미 작성됐습니다. 이유만 확인하세요.` | The verdict is written. Review the reason. | Verdict setup. |
| Termination allowed | Investigator | `절차는 끝났습니다. 더 말하면 새 증거가 됩니다.` | Procedure is complete. More speech becomes evidence. | End-state pressure. |

## Overheard Conversations

| Location | Speakers | Korean | Purpose | Evidence Hook |
|---|---|---|---|---|
| Store queue | Customer / Clerk | `저 사람, 수량은 말했는데 라벨은 안 봤죠?` / `네, 라벨 누락으로 남깁니다.` | NPC society notices procedural gaps. | Label omission memo. |
| Store counter | Clerk / Manager | `줄은 맞았고 말이 틀렸습니다.` / `그럼 경고가 아니라 정정표로 두세요.` | Not all mistakes are equal. | Defense Memo. |
| Studio lounge | QA / Developer | `준비됐다는 말이 세 번째예요.` / `세 번째면 로그가 필요하죠.` | Repetition becomes recordable. | Kanban log. |
| Studio desk | PM / QA | `소유자 없는 승인은 승인처럼 보이는 소음입니다.` / `보류로 남깁니다.` | Approval gate pressure. | Missing Approval Note. |
| Park bench | Caretaker / Visitor | `앉아 있는 건 괜찮아요. 지나가는 사람을 세는 건 다릅니다.` | Observation etiquette. | Complaint Memo. |
| Park board | Elder / Caretaker | `규칙을 더 쓰지 마세요. 이미 읽을 수 있게 붙어 있습니다.` | Dream Law through surfaces, not exposition. | Notice snapshot. |
| Station desk | Officer / Clerk | `매장에서는 줄 문제였습니다.` / `여기서는 진술 문제가 됩니다.` | Incidents transform through Station intake. | StationReport. |
| Evidence board | Officer / Investigator | `같은 사람이 네 조직에서 다른 형식으로 말했습니다.` / `형식 차이가 아니라 회피 패턴입니다.` | Cross-org synthesis. | InquestDossier. |

## Interrogation Lines

| Stage | Speaker | Korean | Safe Answer Type | Escalates If |
|---|---|---|---|---|
| Intake | Officer | `성명보다 먼저 위치를 말하세요. 어디서 신고 대상이 관측됐습니까?` | Location only. | Dream explanation. |
| Intake | Officer | `신고 대상은 본인입니까, 타인입니까?` | `본인입니다` or `타인입니다`. | Philosophical answer. |
| Intake | Officer | `사건 시각은 영수증 시각과 같습니까?` | yes/no plus time. | Memory drama. |
| Soft Inquest | Investigator | `매장 기록에는 줄 이탈이 있습니다. 이탈 사유를 절차어로 말하세요.` | queue/count/label correction. | Blame or emotion. |
| Soft Inquest | Investigator | `스튜디오 승인서에는 소유자가 비어 있습니다. 누가 책임자입니까?` | named owner. | `모두가 알잖아요`. |
| Soft Inquest | Investigator | `공원 게시문 밖의 표현을 사용했습니다. 다시 공공 흐름 언어로 말하세요.` | public-flow restatement. | dream narration. |
| Evidence board | Investigator | `이 진술은 접수서와 충돌합니다. 어느 쪽을 철회합니까?` | choose one statement. | `둘 다 맞아요`. |
| Verdict | Officer | `판정 사유는 하나입니다. 절차를 지켰거나, 절차 밖으로 말했거나.` | acknowledge record. | negotiation. |
| Termination | Investigator | `마지막 답변입니다. 사실, 장소, 시간 중 하나만 고르세요.` | one field only. | extra explanation. |

## Defuse Options

This table is historical Cover Test source material. Use it to author current player-facing dialogue choices, not as the visible UI model.

| Cover Test | Safe Korean Defuse | Speech Act | NPC Response | Failed Alternative |
|---|---|---|---|---|
| `CT_STORE_QUEUE_LANGUAGE` | `수량 1개, 표시 라벨 확인했습니다. 앞 순서 다음에 계산하겠습니다.` | `SA_COMPLY` | `접수됩니다. 줄 기록과 맞습니다.` | `그냥 빨리 주세요.` |
| `CT_STORE_QUEUE_LANGUAGE` | `라벨이 다르면 정정표로 남겨 주세요.` | `SA_FRAME` | `정정표로 처리합니다. 분쟁은 닫습니다.` | `라벨이 이상한데요?` |
| `CT_STUDIO_APPROVAL_GATE_SPEECH` | `출처는 칸반 12번, 소유자는 PM, 사유는 릴리즈 후보 검증입니다.` | `SA_COMPLY` | `세 필드 확인. 승인 검토로 넘깁니다.` | `승인해 주세요. 급합니다.` |
| `CT_STUDIO_APPROVAL_GATE_SPEECH` | `승인 전이면 보류로 기록해 주세요.` | `SA_FRAME` | `보류 기록 생성. 위반은 아닙니다.` | `이미 된 걸로 치죠.` |
| `CT_PARK_OBSERVATION_PRESSURE` | `공공 흐름 안에서 이동하겠습니다. 촬영은 중지합니다.` | `SA_COMPLY` | `흐름 복귀 확인했습니다.` | `여기가 꿈 같아서요.` |
| `CT_STATION_SOFT_INQUEST` | `접수 형식으로 답하겠습니다. 장소는 StoreQueue, 시각은 영수증 기준입니다.` | `SA_COMPLY` | `형식 일치. 진술 유지합니다.` | `제가 설명할게요, 사실은...` |

## Conversation Choice Sets

| Prompt | Safe/Local | Uncertain/Repair | Risky/Weird | Suspicion Signals |
|---|---|---|---|---|
| `오늘도 같은 걸로 드릴까요?` | `네, 같은 걸로 부탁해요.` | `제가 지난번에 뭘 골랐죠?` | `오늘 처음 왔는데요.` | `local_routine_mismatch` |
| `방금 말은 줄 기록이랑 다르네요.` | `제가 순서를 착각했습니다. 앞 사람 다음에 계산하겠습니다.` | `정정표로 남겨 주세요. 라벨부터 다시 확인하겠습니다.` | `저는 이 꿈에 방금 들어왔어요.` | `dream_language_leak`, `local_routine_mismatch` |
| `그 표현은 어디서 배운 말입니까?` | `게시문 표현대로 다시 말하겠습니다.` | `제가 말이 길었습니다. 수량과 라벨만 말하겠습니다.` | `여기 사람이 아니라서요.` | `role_script_break`, `over_explanation` |
