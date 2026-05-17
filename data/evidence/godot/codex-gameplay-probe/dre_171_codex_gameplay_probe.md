# Codex Gameplay QA Report

- JSON artifact: `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`
- Scope: M1 Same Order Store/Station cell
- Pass: `true`
- Human evidence: `false`
- Boundary: This proves Codex can play and inspect the current build. It does not prove fresh players understood it; external notes remain required.

## Action Path

- focus.store_counter -> look at the Store counter
- conversation.start -> start the clerk's Same Order question
- player.wait.hesitation_record -> let hesitation become a record
- dialogue.choice.by_id -> choose dialogue id store.same_order.risky
- player.type.free_input -> type player speech: 저는 이 꿈에 방금 들어왔어요.
- focus.world_record_prop -> look at environment record prop: park_notice_board
- player.interact.focused -> press the focused interaction

## Player-Readable Cause Chain

- Codex/player focused the Store counter and started the Store Clerk prompt.
- Codex/player waited long enough to create a response hesitation record.
- Codex/player chose the risky 'first time here' line, causing the Store Clerk to mark the receipt.
- Codex/player typed a dream-language line, causing a Store report, waiting-customer queue reaction, Park notice, Manager forwarding, and Station citation.
- Codex/player inspected the Park notice board as a public environment record instead of only reading hidden state.
- The Station Officer cited civic-ledger-5 in civic-ledger-6 before opening inquest, and the waiting customer refused contact in civic-ledger-7.

## Final Player-Visible State

- Stage: `inquest`
- Outcome: `inquest_opened` / `inquest_opened`
- Suspicion/report: `125` / `120`
- Investigation trail: 검사자: 스테이션 직원 | 대상: 플레이어 | 근거: civic-ledger-7 대기 손님 / 접촉 거부 / 접촉 거부 -> civic-ledger-6
- Consequence: 심문 압박입니다. 이전 대화의 이상 신호가 근거가 됩니다. / 흐름: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용
- Inspected record: 공원 게시판 / 소문이 붙어 있습니다. 이 공개 기록은 상점 안의 보고와 함께 더 큰 절차로 이어질 수 있습니다.
- Civic economy: 시민 경제 / 잔액 3 | 신뢰 0 | 부담 90 | 주목 70
- Why-line: WHY-LINE: 그 말에는 이곳 사람이 쓰지 않는 꿈/바깥 세계 표현이 들어 있습니다.

## Route Outcomes

- `clean_cover`: pass `true`, stage `normal`, outcome `clean_cover`, suspicion/report `0/0`
  - Clean cover: Codex accepted the routine, the Store Clerk closed a normal receipt, public trust rose, and the waiting customer shared a local tip. normal/clean_cover, suspicion 0, report 0.
- `repair_recovered`: pass `true`, stage `uneasy`, outcome `repair_recovered`, suspicion/report `20/10`
  - Repair recovery: Codex admitted uncertainty, accepted the Clerk premise, the correction slip attached, the waiting customer let the queue settle, and the Park witness posted that the mismatch was repaired. uneasy/repair_recovered, suspicion 20, report 10.
- `cover_held_under_suspicion`: pass `true`, stage `uneasy`, outcome `cover_held_under_suspicion`, suspicion/report `35/30`
  - Route cover_held_under_suspicion ended at uneasy/cover_held_under_suspicion, suspicion 35, report 30.
- `soft_report`: pass `true`, stage `reported`, outcome `soft_report`, suspicion/report `95/80`
  - Soft report: Codex broke routine twice, causing a pending Store report and Manager follow-up without opening inquest. reported/soft_report, suspicion 95, report 80.
- `inquest_opened`: pass `true`, stage `inquest`, outcome `inquest_opened`, suspicion/report `125/120`
  - Inquest: Codex hesitated, chose the risky line, typed dream-language speech, and the Station cited the Store record. inquest/inquest_opened, suspicion 125, report 120. 심문 압박입니다. 이전 대화의 이상 신호가 근거가 됩니다. / 흐름: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용

## Role Actions

- store_clerk used mark_receipt on receipt_tray -> civic-ledger-1
- store_clerk used place_note on report_tray -> civic-ledger-2
- waiting_customer used complain_delay on store_queue_mark -> civic-ledger-3
- park_witness used post_rumor on park_notice_board -> civic-ledger-4
- store_manager used forward_report on report_tray -> civic-ledger-5
- station_officer used cite_record on station_dossier -> civic-ledger-6
- waiting_customer used refuse_contact on store_queue_mark -> civic-ledger-7

## NPC-To-NPC Observations

- waiting_customer saw store_clerk place_note at civic-ledger-2, then chose complain_delay
- park_witness saw store_clerk place_note at civic-ledger-2, then chose post_rumor
- store_manager saw store_clerk place_note at civic-ledger-2, then chose forward_report
- station_officer saw store_manager forward_report at civic-ledger-5, then chose cite_record
- waiting_customer saw station_officer cite_record at civic-ledger-6, then chose refuse_contact

## Explainability Checks

- `codexPlayedThroughPublicActions`: `true`
- `canReadExaminedPlayerRole`: `true`
- `canReadInputToRecordChain`: `true`
- `canReadNpcToNpcChain`: `true`
- `canInspectPublicEnvironmentRecord`: `true`
- `canReadExactStationCitation`: `true`
- `canReadCivicEconomyPressure`: `true`
- `canReadFinalOutcome`: `true`
- `notHumanEvidence`: `true`

## Product Boundary

This report proves Codex can play and inspect the active build through public gameplay APIs. It does not prove fresh-player comprehension; external notes remain required.
