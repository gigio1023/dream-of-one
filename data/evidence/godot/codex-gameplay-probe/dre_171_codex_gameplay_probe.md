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
- focus.world_record_prop -> look at environment record prop: studio_review_queue
- player.interact.focused -> press the focused interaction
- focus.world_record_prop -> look at environment record prop: civic_economy_panel
- player.interact.focused -> press the focused interaction
- focus.world_record_prop -> look at environment record prop: civic_ledger
- player.interact.focused -> press the focused interaction
- focus.npc -> look at visible NPC: NPC_Studio_PM
- player.interact.focused -> press the focused interaction
- focus.npc -> look at visible NPC: NPC_Waiting_Customer
- player.interact.focused -> press the focused interaction

## Player-Readable Cause Chain

- Codex/player focused the Store counter and started the Store Clerk prompt.
- Codex/player waited long enough to create a response hesitation record.
- Codex/player chose the risky 'first time here' line, causing the Store Clerk to mark the receipt.
- Codex/player typed a dream-language line, causing a Store report, waiting-customer queue reaction, Park notice, Manager forwarding, Station citation, Studio review block, and contact refusal.
- The waiting customer exists in the running scene and shows the contact-refusal reaction as player-readable NPC text.
- Codex/player inspected the Park notice board as a public environment record instead of only reading hidden state.
- Codex/player inspected the Studio review queue and Studio PM to read that the Station citation blocked a small opportunity in another place.
- Codex/player read the Studio review queue's visible role/action map: Studio PM can invite, defer, or block review from shared records.
- Codex/player inspected the civic ledger to read the NPC-to-NPC social chain as a player-facing timeline.
- Codex/player focused the Waiting Customer and pressed the same interaction key to read the NPC's current contact-refusal state and its cited ledger basis.
- The Station Officer cited civic-ledger-5 in civic-ledger-6 before opening inquest; the Studio PM blocked review in civic-ledger-7, and the waiting customer refused contact in civic-ledger-8.

## Final Player-Visible State

- Stage: `inquest`
- Outcome: `inquest_opened` / `inquest_opened`
- Suspicion/report: `125` / `120`
- Investigation trail: 검사자: 스테이션 직원 | 대상: 플레이어 | 근거: civic-ledger-8 대기 손님 / 접촉 거부 / 접촉 거부 -> civic-ledger-6
- Consequence: 심문 압박입니다. 이전 대화의 이상 신호가 근거가 됩니다. / 흐름: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부
- Inspected record: Waiting Customer / Waiting Customer / 현재 반응: 접촉 거부 / 말/태도: 스테이션이 인용했으면 저는 말 섞지 않겠습니다. / 근거 행동: civic-ledger-8 / 대기 손님 -> 접촉 거부 / 읽은 기록: civic-ledger-6 / 스테이션 직원 -> 기록 인용 / 대상 기록물: 대기 표식 / 가능 조건: 대기 표식=줄 흐트러짐, 인용 장부 civic-ledger-6 / 값 변화: 신뢰-8, 부담+5 / 이 반응은 NPC가 읽은 기록, 공개 단서, 또는 인용 결과가 사회적 행동으로 바뀐 상태입니다.
- Inspected NPC: { "npcId": "NPC_Waiting_Customer", "displayName": "Waiting Customer", "role": "Waiting Customer", "state": "refused", "exposure": 125, "pressureText": "스테이션이 인용했으면 저는 말 섞지 않겠습니다.", "markerVisible": true, "reactionText": "접촉 거부", "materialAlpha": 0.3980952501297, "emissionEnergy": 0.61666667461395, "basisAction": { "sequence": 8, "stepId": "inquest.waiting_customer.refuse_contact", "actorId": "NPC_Waiting_Customer", "actorRole": "waiting_customer", "perceivedObjectIds": ["store_queue_mark", "store_counter", "usual_order_cue", "park_notice_board"], "affordance": "refuse_contact", "objectId": "store_queue_mark", "recordId": "store_same_order_contact_refused", "citedLedgerEventId": "civic-ledger-6", "availableActions": [{ "actionId": "store_queue_mark.complain_delay", "objectId": "store_queue_mark", "objectState": "disrupted", "affordance": "complain_delay", "playerLabel": "Complain Delay", "eligibleRoles": ["waiting_customer"], "preconditions": ["object_state:disrupted", "role_allowed:waiting_customer", "known_ledger_event_required", "record_id:store_same_order_queue_state"], "visibleTo": ["store_clerk", "waiting_customer"], "perceivedAs": "public queue pressure", "priorityHints": ["economy:recordBurden", "pressure:queue_delay"], "toState": "disrupted", "ledgerEventKind": "queue_delay_noted", "civicEconomyEffects": ["recordBurden:+5"], "validationRuleId": "same_order.store_queue_mark.complain_delay", "failureReasons": ["object_not_perceived", "affordance_unavailable", "role_authority_exceeded", "why_line_required", "ledger_event_unknown", "ledger_event_not_known"], "recordId": "store_same_order_queue_state", "requiresLedgerEvent": true, "requiresStoreLedgerEvent": false, "citableLedgerEventIds": ["civic-ledger-6"] }, { "actionId": "store_queue_mark.accept_repair", "objectId": "store_queue_mark", "objectState": "disrupted", "affordance": "accept_repair", "playerLabel": "Accept Repair", "eligibleRoles": ["waiting_customer"], "preconditions": ["object_state:disrupted", "role_allowed:waiting_customer", "known_ledger_event_required", "record_id:store_same_order_queue_state"], "visibleTo": ["store_clerk", "waiting_customer"], "perceivedAs": "public repair acceptance", "priorityHints": ["economy:localTrust", "economy:recordBurden", "pressure:repair_accepted"], "toState": "settled", "ledgerEventKind": "queue_repair_accepted", "civicEconomyEffects": ["localTrust:+5", "recordBurden:-5"], "validationRuleId": "same_order.store_queue_mark.accept_repair", "failureReasons": ["object_not_perceived", "affordance_unavailable", "role_authority_exceeded", "why_line_required", "ledger_event_unknown", "ledger_event_not_known"], "recordId": "store_same_order_queue_state", "requiresLedgerEvent": true, "requiresStoreLedgerEvent": false, "citableLedgerEventIds": ["civic-ledger-6"] }, { "actionId": "store_queue_mark.refuse_contact", "objectId": "store_queue_mark", "objectState": "disrupted", "affordance": "refuse_contact", "playerLabel": "Refuse Contact", "eligibleRoles": ["waiting_customer"], "preconditions": ["object_state:disrupted", "role_allowed:waiting_customer", "known_ledger_event_required", "record_id:store_same_order_queue_state"], "visibleTo": ["store_clerk", "waiting_customer"], "perceivedAs": "queue refuses contact after citation", "priorityHints": ["economy:localTrust", "economy:recordBurden", "pressure:authority_seen"], "toState": "refused", "ledgerEventKind": "queue_contact_refused", "civicEconomyEffects": ["localTrust:-8", "recordBurden:+5"], "validationRuleId": "same_order.store_queue_mark.refuse_contact", "failureReasons": ["object_not_perceived", "affordance_unavailable", "role_authority_exceeded", "why_line_required", "ledger_event_unknown", "ledger_event_not_known"], "recordId": "store_same_order_queue_state", "requiresLedgerEvent": true, "requiresStoreLedgerEvent": false, "citableLedgerEventIds": ["civic-ledger-6"] }], "selectedActionDescriptor": { "actionId": "store_queue_mark.refuse_contact", "objectId": "store_queue_mark", "objectState": "disrupted", "affordance": "refuse_contact", "playerLabel": "Refuse Contact", "eligibleRoles": ["waiting_customer"], "preconditions": ["object_state:disrupted", "role_allowed:waiting_customer", "known_ledger_event_required", "record_id:store_same_order_queue_state"], "visibleTo": ["store_clerk", "waiting_customer"], "perceivedAs": "queue refuses contact after citation", "priorityHints": ["economy:localTrust", "economy:recordBurden", "pressure:authority_seen"], "toState": "refused", "ledgerEventKind": "queue_contact_refused", "civicEconomyEffects": ["localTrust:-8", "recordBurden:+5"], "validationRuleId": "same_order.store_queue_mark.refuse_contact", "failureReasons": ["object_not_perceived", "affordance_unavailable", "role_authority_exceeded", "why_line_required", "ledger_event_unknown", "ledger_event_not_known"], "recordId": "store_same_order_queue_state", "requiresLedgerEvent": true, "requiresStoreLedgerEvent": false, "citableLedgerEventIds": ["civic-ledger-6"] }, "selectionReason": "A waiting customer sees the Station cite the player and refuses contact while the inquest is open.", "whyLine": "A waiting customer sees the Station cite the player and refuses contact while the inquest is open.", "accepted": true, "validation": "accepted", "ledgerEventId": "civic-ledger-8", "ledgerEventKind": "queue_contact_refused", "economyAfter": { "accountCredit": 3, "localTrust": 0, "recordBurden": 93, "stationAttention": 70 } }, "basisLedgerEventId": "civic-ledger-8", "basisLedgerEventLabel": "civic-ledger-8 / 대기 손님 -> 접촉 거부", "basisAffordance": "refuse_contact", "basisAffordanceLabel": "접촉 거부", "basisObjectId": "store_queue_mark", "basisObjectLabel": "대기 표식", "citedLedgerEventId": "civic-ledger-6", "citedLedgerEventLabel": "civic-ledger-6 / 스테이션 직원 -> 기록 인용", "basisConditionLabels": ["대기 표식=줄 흐트러짐", "인용 장부 civic-ledger-6"], "basisEconomyEffectLabels": ["신뢰-8", "부담+5"], "body": "현재 반응: 접촉 거부\n말/태도: 스테이션이 인용했으면 저는 말 섞지 않겠습니다.\n근거 행동: civic-ledger-8 / 대기 손님 -> 접촉 거부\n읽은 기록: civic-ledger-6 / 스테이션 직원 -> 기록 인용\n대상 기록물: 대기 표식\n가능 조건: 대기 표식=줄 흐트러짐, 인용 장부 civic-ledger-6\n값 변화: 신뢰-8, 부담+5\n이 반응은 NPC가 읽은 기록, 공개 단서, 또는 인용 결과가 사회적 행동으로 바뀐 상태입니다." }
- Civic economy: 시민 경제 / 잔액 3 | 신뢰 0 | 부담 93 | 주목 70
- Why-line: WHY-LINE: 그 말에는 이곳 사람이 쓰지 않는 꿈/바깥 세계 표현이 들어 있습니다.

## Route Outcomes

- `clean_cover`: pass `true`, stage `normal`, outcome `clean_cover`, suspicion/report `0/0`
  - Clean cover: Codex accepted the routine, the Store Clerk closed a normal receipt, public trust rose, the waiting customer shared a local tip, the Studio PM opened a review invitation from the public record, and Codex inspected that invited review queue as a visible world prop. normal/clean_cover, suspicion 0, report 0.
- `repair_recovered`: pass `true`, stage `uneasy`, outcome `repair_recovered`, suspicion/report `20/10`
  - Repair recovery: Codex admitted uncertainty, accepted the Clerk premise, the correction slip attached, the waiting customer let the queue settle, the Park board showed a public repair notice, the Studio PM kept review conditional from that public record, and Codex inspected both props. uneasy/repair_recovered, suspicion 20, report 10. NPC는 발화의 어긋남을 먼저 느끼고, 스테이션은 그 기록을 나중에 봅니다. / 흐름: 기억 공백 발화 -> 정정표 -> 대기줄 수습 -> 공개 수습 게시 -> 조건부 리뷰
- `cover_held_under_suspicion`: pass `true`, stage `uneasy`, outcome `cover_held_under_suspicion`, suspicion/report `35/30`
  - Suspicious cover: Codex made a risky claim then returned to the Clerk premise; the Park public warning made the waiting customer keep distance, the Studio PM deferred review, and Codex inspected that deferred review queue. uneasy/cover_held_under_suspicion, suspicion 35, report 30.
- `soft_report`: pass `true`, stage `reported`, outcome `soft_report`, suspicion/report `95/80`
  - Soft report: Codex broke routine twice, causing a pending Store report, public rumor, Manager service pause, and queue exit without opening inquest. reported/soft_report, suspicion 95, report 80. 대화 기록이 접수되었습니다. 앞선 말과 충돌하지 않아야 합니다. / 흐름: 플레이어 발화 -> 상점 기록 -> 공원 게시 -> 응대 중단 -> 줄 이탈 -> 보고 접수
- `inquest_opened`: pass `true`, stage `inquest`, outcome `inquest_opened`, suspicion/report `125/120`
  - Inquest: Codex hesitated, chose the risky line, typed dream-language speech, and the Station cited the Store record. inquest/inquest_opened, suspicion 125, report 120. 심문 압박입니다. 이전 대화의 이상 신호가 근거가 됩니다. / 흐름: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부

## Role Actions

- store_clerk used mark_receipt on receipt_tray -> civic-ledger-1
- store_clerk used place_note on report_tray -> civic-ledger-2
- waiting_customer used complain_delay on store_queue_mark -> civic-ledger-3
- park_witness used post_rumor on park_notice_board -> civic-ledger-4
- store_manager used forward_report on report_tray -> civic-ledger-5
- station_officer used cite_record on station_dossier -> civic-ledger-6
- studio_pm used block_review on studio_review_queue -> civic-ledger-7
- waiting_customer used refuse_contact on store_queue_mark -> civic-ledger-8

## NPC-To-NPC Observations

- waiting_customer saw store_clerk place_note at civic-ledger-2, then chose complain_delay
- park_witness saw store_clerk place_note at civic-ledger-2, then chose post_rumor
- store_manager saw store_clerk place_note at civic-ledger-2, then chose forward_report
- station_officer saw store_manager forward_report at civic-ledger-5, then chose cite_record
- studio_pm saw station_officer cite_record at civic-ledger-6, then chose block_review
- waiting_customer saw station_officer cite_record at civic-ledger-6, then chose refuse_contact

## Explainability Checks

- `codexPlayedThroughPublicActions`: `true`
- `canReadExaminedPlayerRole`: `true`
- `canReadInputToRecordChain`: `true`
- `canReadNpcToNpcChain`: `true`
- `canReadLiveHudSocialCitation`: `true`
- `canReadLiveHudNearbyStances`: `true`
- `canReadVisibleNpcReaction`: `true`
- `canInspectPublicEnvironmentRecord`: `true`
- `canInspectCrossPlaceAuthorityConsequence`: `true`
- `canInspectRecordRoleAffordanceMap`: `true`
- `canInspectNpcReaction`: `true`
- `canReadExactStationCitation`: `true`
- `canReadCivicEconomyPressure`: `true`
- `canInspectCivicEconomyChange`: `true`
- `canInspectNpcToNpcSocialLedger`: `true`
- `canReadFinalOutcome`: `true`
- `notHumanEvidence`: `true`

## Product Boundary

This report proves Codex can play and inspect the active build through public gameplay APIs. It does not prove fresh-player comprehension; external notes remain required.
