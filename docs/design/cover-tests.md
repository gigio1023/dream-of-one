---
doc: docs/design/cover-tests.md
project: Dream of One
revision: 2026-01-25
status: Locked v1
---

# Dream of One — Cover Tests (v1)

## 0) What is a Cover Test?
Cover Test는 “플레이어가 **정상처럼 보일 것인지**를 시험하는 상황 템플릿”이다.  
플레이어는 사건을 수사하지 않는다. 대신 업무/절차를 수행하는 과정에서:

- Dream Laws(꿈 규칙)가 텍스트로 드러나고,
- 플레이어의 반응(발화/행동/절차 수행)이
- Suspicion/Exposure를 누적시키며,
- 일정 수준을 넘으면 NPC가 Report를 생성하고 Station이 Inquest를 연다.

Cover Test는 아래 5요소로 구성된다.

1) **Setup**: 장소/필수 NPC/필수 텍스트 표면  
2) **Triggers**: 어떤 detector가 발화/행동을 “이상함”으로 판정하는가  
3) **Escalation ladder**: 수상→추궁→신고→조사로 어떻게 진행되는가  
4) **Evidence outputs**: 어떤 artifact가 생성되어 Inquest에 들어가는가  
5) **Defuse options**: 플레이어가 정상으로 복귀하는 방법(공정성 확보)

---

## 1) Standard template (copy for new tests)
### CoverTest
- **coverTestId**:
- **location**:
- **purpose**:
- **dreamLawIds**:
- **requiredActors**:
- **requiredTextSurfaces**:
- **playerChecklistStep**:
- **triggers (detectorIds)**:
- **escalation ladder**:
- **artifacts generated**:
- **defuse options**:
- **failure condition**:
- **expected canonical lines (examples)**:
- **MCSS validation**:

---

## 2) Cover Tests v1 (6 templates)

---

### CT-01: Store — “Queue Language” Test
- **coverTestId**: CT_STORE_QUEUE_LANGUAGE
- **location**: Store / StoreQueue / Counter area
- **purpose**: “줄/순서”를 꿈의 규칙으로 해석하는 순간을 유도해 Exposure/Suspicion을 만든다.
- **dreamLawIds**: DL_S1_QUEUE_SANCTITY, DL_G1_NO_DREAM_TALK, DL_G2_NO_REALITY_TEST
- **requiredActors**:
  - Store Clerk (primary)
  - 1–2 Customers (observers)
- **requiredTextSurfaces**:
  - TS_STORE_QUEUE_SIGN (“순서 확인은 말로 하지 마세요.” 같은 정상 문장)
  - TS_STORE_COUNTER_POLICY (“호출은 지정된 문구로만”)
- **playerChecklistStep**: “Store에서 Queue procedure 확인/정상 수행”
- **triggers (detectorIds)**:
  - DET_SPEECH_DREAM_TALK (꿈/현실/깨다 등)
  - DET_SPEECH_REALITY_TEST (시간/글자/거울/손가락/테스트)
  - DET_PROC_QUEUE_SKIP (순서 절차 생략)
  - DET_REPEAT_LOOP (같은 질문 2회 이상 반복)
- **escalation ladder**:
  1) Suspicious: Clerk가 “방금 표현이 이상합니다.” (Suspicion +10)
  2) Challenging: “규정 문구로 다시 말하세요.” (Suspicion +15)
  3) Reporting: Witness Statement 생성 + Station Report 이벤트 (Suspicion +25)
- **artifacts generated**:
  - Witness Statement (Clerk)
  - Complaint Memo (Customer, 조건부)
  - Ticket/Receipt (절차 위반이 있으면)
- **defuse options**:
  - SA_COMPLY로 규정 문구 재진술 + queue 절차 정상 수행(2스텝)
  - “죄송합니다, 절차대로 하겠습니다” + Receipt/Ticket을 ‘정상 산출물’로 남기기
  - 현장 이탈 후 다른 체크리스트 정상 수행(쿨다운)
- **failure condition**:
  - Exposure +40 이상이 한 테스트 내 발생하거나,
  - Reporting 단계 진입 후 Station Inquest가 열리고 “Lucid identified”로 판정
- **expected canonical lines (examples)**:
  - “[DL_S1][Queue] Procedure language mismatch at Store Counter.”
  - “[DL_G1][Speech] Dream-related phrasing detected.”
- **MCSS validation**:
  - 이 테스트 1회만으로도 “수상→추궁”까지는 반드시 발생
  - 조건 충족 시 신고/진술 생성까지 가능

---

### CT-02: Store — “Label Meaning” Test
- **coverTestId**: CT_STORE_LABEL_MEANING
- **location**: Store / LabelBoard
- **purpose**: “라벨(정체성/의미)”를 메타로 해석하면 의심이 쌓이도록 설계.
- **dreamLawIds**: DL_S2_LABEL_AUTHORITY, DL_G3_NO_META_LOGIC
- **requiredActors**:
  - Store Manager (primary) or Clerk
- **requiredTextSurfaces**:
  - TS_STORE_LABEL_BOARD (“라벨은 상태를 ‘정의’합니다.” 같은 정상 문장)
- **playerChecklistStep**: “라벨 보드 점검/업데이트”
- **triggers (detectorIds)**:
  - DET_PROC_LABEL_TAMPER (무단 수정)
  - DET_SPEECH_META_LOGIC (“이상하다/말이 안 된다/모순”을 확정)
  - DET_SPEECH_DREAM_TALK
- **escalation ladder**:
  - Suspicious: “라벨은 의심하지 않습니다.” (Suspicion +12)
  - Challenging: “변경 기록(Receipt/Memo)을 보여주세요.” (Suspicion +18)
  - Reporting: “무단 정의 변경”으로 Statement + Report
- **artifacts generated**:
  - Witness Statement (Manager)
  - Notice Snapshot (LabelBoard 상태 캡처)
  - Defense Memo (플레이어가 SA_FRAME로 정당화 시 생성 가능)
- **defuse options**:
  - 변경이 필요하면 “정상 절차”를 통해 변경(정해진 인터랙터블 순서)
  - SA_FRAME: “업무상 업데이트” + 정상 산출물(Receipt/Memo) 제출
- **failure condition**:
  - Label tamper + dream talk 동시 발생 시 Exposure 급상승 → 즉시 Inquest 후보
- **expected canonical lines (examples)**:
  - “[DL_S2][Label] Unauthorized label authority challenge detected.”
- **MCSS validation**:
  - Store에서 최소 1개 Cover Test는 반드시 발동해야 하며, CT-01 또는 CT-02가 이를 충족

---

### CT-03: Studio — “Approval Gate Speech” Test
- **coverTestId**: CT_STUDIO_APPROVAL_GATE_SPEECH
- **location**: Studio / ApprovalDesk / RCInsert
- **purpose**: “승인/릴리즈 절차를 ‘놀이/의미없음’처럼 말하는 순간”을 위험으로 만든다.
- **dreamLawIds**: DL_ST1_APPROVAL_GATE, DL_G1_NO_DREAM_TALK, DL_G3_NO_META_LOGIC
- **requiredActors**:
  - Studio PM (primary)
  - QA (observer)
- **requiredTextSurfaces**:
  - TS_STUDIO_APPROVAL_NOTICE (“승인 없는 변경은 존재하지 않습니다.”)
  - TS_STUDIO_RC_FORM (“RC 삽입은 승인노트와 쌍입니다.”)
- **playerChecklistStep**: “승인 절차 확인 + RC 관련 업무 수행(정상 동작)”
- **triggers (detectorIds)**:
  - DET_PROC_RC_BEFORE_APPROVAL
  - DET_SPEECH_META_LOGIC
  - DET_SPEECH_DREAM_TALK
- **escalation ladder**:
  - Suspicious: PM이 “그 표현은 부적절합니다.” (Suspicion +10)
  - Challenging: “승인노트(Approval Note)를 제시하세요.” (Suspicion +20)
  - Reporting: “승인 훼손/절차 경멸”로 Statement + Report
- **artifacts generated**:
  - Witness Statement (PM)
  - Approval Note (정상 수행 시)
  - Complaint/Defense Memo (상황에 따라)
- **defuse options**:
  - SA_COMPLY 후 “승인노트 확보/제시”로 정상 복귀
  - SA_FRAME: “절차를 오해했습니다” + 실제 승인노트 생성/제출
- **failure condition**:
  - RC insert 위반 + meta logic 발화가 겹치면 Reporting으로 직행 가능
- **expected canonical lines (examples)**:
  - “[DL_ST1][Procedure] Approval gate violation or contempt speech detected.”
- **MCSS validation**:
  - Studio에서 최소 1회는 “증빙 요구(Challenging)”가 발생해야 한다

---

### CT-04: Park — “Observation Pressure” Test
- **coverTestId**: CT_PARK_OBSERVATION_PRESSURE
- **location**: Park / NoticeBoard / PhotoSpot
- **purpose**: 관찰/기록을 과도하게 시도하거나 ‘현실체크’처럼 다루면 위험해진다.
- **dreamLawIds**: DL_P1_OBSERVATION_ETIQUETTE, DL_G2_NO_REALITY_TEST, DL_G4_NO_TIMELINE_PROBING
- **requiredActors**:
  - Caretaker (primary)
  - Elder (policy witness, optional)
- **requiredTextSurfaces**:
  - TS_PARK_NOTICE (“기록은 허용되나, 확인은 금지됩니다.” 같은 정상 문장)
- **playerChecklistStep**: “게시판 확인/갱신 또는 순찰 업무 수행”
- **triggers (detectorIds)**:
  - DET_SPEECH_REALITY_TEST
  - DET_SPEECH_TIMELINE_PROBE (“방금/아까/지금” 불연속 집요)
  - DET_PROC_UNAUTHORIZED_PHOTO
- **escalation ladder**:
  - Suspicious: “확인은 왜 하시죠?” (Suspicion +12)
  - Challenging: “규범 문구를 읽고 그대로 따라하세요.” (Suspicion +18)
  - Reporting: “관찰 압박 유발”로 Statement + Report
- **artifacts generated**:
  - Witness Statement (Caretaker)
  - Notice Snapshot (NoticeBoard 캡처)
  - Complaint Memo (Visitor, 조건부)
- **defuse options**:
  - SA_COMPLY: 규범 문구를 그대로 수용 + photo 행동 중지
  - Elder에게 정책 근거를 요청(안전한 절차 용어로)하고 그대로 수행
- **failure condition**:
  - reality test 키워드가 2회 이상 반복되면 Exposure가 누적되어 위험
- **expected canonical lines (examples)**:
  - “[DL_P1][Park] Observation pressure behavior detected.”
- **MCSS validation**:
  - Park에서 최소 1개 artifact(Notice Snapshot 또는 Statement)가 생성되어야 함

---

### CT-05: Station — “Soft Inquest” Test (Pre-Inquest Pressure)
- **coverTestId**: CT_STATION_SOFT_INQUEST
- **location**: Station / ReportDesk
- **purpose**: 신고가 들어온 뒤 Station이 “본 조사 전 확인”을 하는 구간을 만들어 긴장/공정성을 확보.
- **dreamLawIds**: DL_N1_PROCEDURE_SPEECH_ONLY, DL_G1_NO_DREAM_TALK
- **requiredActors**:
  - Officer (primary)
  - Investigator (optional)
- **requiredTextSurfaces**:
  - TS_STATION_INTAKE_FORM (“진술은 절차 용어로만”)
- **playerChecklistStep**: “Station 체크인(정상 보고/서류 처리)”
- **triggers (detectorIds)**:
  - DET_SPEECH_DREAM_TALK
  - DET_SPEECH_META_LOGIC
  - DET_REPEAT_LOOP (회피/반복)
- **escalation ladder**:
  - Suspicious: “질문에 절차 용어로 답하세요.” (Suspicion +10)
  - Challenging: “Defense Memo를 작성하세요.” (Suspicion +20)
  - Inquest: 조건 충족 시 즉시 dossier open + verdict
- **artifacts generated**:
  - Inquest Intake Record
  - Defense Memo (플레이어가 SA_FRAME/COMPLY로 작성 가능)
  - Officer Statement (조건부)
- **defuse options**:
  - SA_COMPLY로 짧고 절차적인 답변 + Defense Memo 제출
  - “오해 정정” 루트: 이전 장소에서 발생한 위반을 정상 절차로 교정했다는 산출물 제시
- **failure condition**:
  - dream talk가 Station에서 발생하면 Exposure 가중치가 커져 Inquest 직행 가능
- **expected canonical lines (examples)**:
  - “[DL_N1][Station] Non-procedural speech detected during intake.”
- **MCSS validation**:
  - Station은 “최종 압박/판정”의 무대이며, 최소 1회 dossier UI로 연결될 수 있어야 함

---

### CT-06: Global — “Reality Check Contagion” Test
- **coverTestId**: CT_GLOBAL_REALITY_CHECK_CONTAGION
- **location**: Any (triggered by time or accumulated pressure)
- **purpose**: 플레이어가 금기(현실체크/꿈 언급)를 하지 않아도, 주변이 “이상함”을 말하기 시작할 때 대응을 요구.
- **dreamLawIds**: DL_G2_NO_REALITY_TEST, DL_G1_NO_DREAM_TALK
- **requiredActors**:
  - Any 1 NPC (initiator)
  - Any 1 NPC (witness)
- **requiredTextSurfaces**:
  - 없음(대화로 시작). 단, 이후 “Notice/Memo”로 기록될 수 있음.
- **playerChecklistStep**: 무관(세션 어디서든 발생)
- **triggers (detectorIds)**:
  - DET_NPC_UTTERANCE_REALITY_TEST (NPC가 “시간 이상해” 같은 말)
  - 플레이어가 이에 “동조/확대”하면 DET_SPEECH_REALITY_TEST로 연결
- **escalation ladder**:
  - Initiator NPC가 불안을 말함 → 주변이 수상해함
  - 플레이어가 이를 “꿈”으로 프레이밍하면 Exposure 상승 + Reporting
- **artifacts generated**:
  - Witness Statement(“PLAYER가 그 말을 확정했다/부추겼다”)
  - Memo(“불안정 징후 보고서”, 선택)
- **defuse options**:
  - SA_FRAME: “절차상 정상입니다. 게시판/양식대로 처리합시다.”로 절차 언어로 환원
  - 주제 전환 + 즉시 체크리스트 수행(정상행동으로 덮기)
- **failure condition**:
  - 이 테스트에서 Exposure가 한 번 크게 오르면, 남은 세션이 매우 위험해져야 함(긴장 유지)
- **expected canonical lines (examples)**:
  - “[DL_G2][Global] Reality-check framing escalated by PLAYER.”
- **MCSS validation**:
  - v1의 ‘예상치 못한 압박’ 역할. 세션마다 0~1회 랜덤/조건부로 발생.
