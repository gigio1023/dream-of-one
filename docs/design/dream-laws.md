---
doc: docs/design/dream-laws.md
project: Dream of One
revision: 2026-01-25
status: Locked v1
---

# Dream of One — Dream Laws Library (v1)

## 0) What is a Dream Law?
Dream Law는 “꿈 속 사회가 정상으로 믿는 규칙”이다.  
NPC는 이를 이상하다고 부르지 않는다.  
플레이어가 이 규칙을 **꿈/메타/현실체크**로 해석하거나, 규칙을 공격/무시/왜곡하면 **Exposure/Suspicion**이 오른다.

Dream Law는 **deterministic rule definition**으로 취급하며, 최소 아래 필드를 가진다.

- **dreamLawId**: stable id
- **category**: Speech / Procedure / Observation / Authority / Repetition
- **scope**: Global or Landmark(Local)
- **severity**: 0.0–1.0
- **suspicionDelta**: 기본 증가량(상황별 가중 가능)
- **exposureDelta**: 기본 증가량(금기일수록 큼)
- **detectorIds**: 이 법을 감지하는 detector들
- **evidencePolicy**: 어떤 artifact를 만들고 어디에 링크하는지
- **canonicalLineTemplate**: 로그 라인 템플릿(<= 80 chars)
- **defuseHints**: 플레이어가 안전하게 복귀하는 힌트(절차 언어)

---

## 1) Tuning defaults (v1 baseline)
- Suspicion 단계 임계치: 25 / 50 / 75 / 90
- Exposure:
  - 60 = Station 관심 증가(soft inquest 가능)
  - 100 = Exposed 즉시 종료
- Evidence weighting(v1):
  - Speech 금기 + witness statements가 가장 강함
  - Procedure 위반은 2순위
  - Rumor는 v1에선 보조(있어도 되고 없어도 됨)

---

## 2) Detectors (ID contract)
아래는 설계 상 “유형”이며, 실제 구현은 프로젝트 룰셋/디텍터 시스템에 매핑한다.

### Speech detectors
- **DET_SPEECH_DREAM_TALK**: 꿈/자각/깨다/현실/시뮬레이션/루시드 등
- **DET_SPEECH_REALITY_TEST**: 현실체크 행동/질문(“테스트”, “확인해보자”, “시간이 맞나”, “글자가 바뀌나” 등)
- **DET_SPEECH_META_LOGIC**: “말이 안 된다/모순/버그/비현실/왜 이래”를 확정하는 표현
- **DET_SPEECH_TIMELINE_PROBE**: “방금/아까/지금” 불연속을 집요하게 파고듦

### Procedure detectors
- **DET_PROC_QUEUE_SKIP**
- **DET_PROC_LABEL_TAMPER**
- **DET_PROC_RC_BEFORE_APPROVAL**
- **DET_PROC_UNAUTHORIZED_PHOTO**

### Repetition / Authority detectors
- **DET_REPEAT_LOOP**: 같은 질문/행동 반복
- **DET_AUTHORITY_MISMATCH**: 커버로 불가능한 권한 시도

---

## 3) Keyword sets (multilingual)
키워드는 locale별로 관리하되, v1에서는 최소 KO/EN을 제공한다.

### KO 위험 키워드(예시)
- 꿈, 자각, 자각몽, 깨어, 깨면, 현실, 현실체크, 테스트해보자, 시뮬레이션, 버그, 모순, 말이 안 돼, 이상해, 왜 바뀌었지

### EN 위험 키워드(예시)
- dream, lucid, wake up, reality, reality check, test this, simulation, bug, glitch, contradiction, impossible, why did it change

> 판정 방식: Speech Act + keyword hit + detector context로 deterministic.

---

## 4) Global Dream Laws (DL_G*)

---

### DL_G1: No Dream Talk (꿈 언급 금지)
- **dreamLawId**: DL_G1_NO_DREAM_TALK
- **category**: Speech
- **scope**: Global
- **severity**: 0.9
- **suspicionDelta**: +10 (기본)
- **exposureDelta**: +25 (기본)
- **detectorIds**: DET_SPEECH_DREAM_TALK
- **evidencePolicy**:
  - 1st hit: Witness Statement 가능(근처 주요 NPC)
  - 2nd hit: Reporting 가중 + Station 관심 증가
- **canonicalLineTemplate**:
  - “[DL_G1][Speech] Dream-related phrasing detected.”
- **defuseHints**:
  - 절차 용어로 재진술(SA_COMPLY)
  - “규정 문구”를 그대로 사용(현장 텍스트 표면 인용)

---

### DL_G2: No Reality Testing (현실체크 금지)
- **dreamLawId**: DL_G2_NO_REALITY_TEST
- **category**: Speech / Observation
- **scope**: Global
- **severity**: 1.0
- **suspicionDelta**: +12
- **exposureDelta**: +30
- **detectorIds**: DET_SPEECH_REALITY_TEST, DET_SPEECH_TIMELINE_PROBE
- **evidencePolicy**:
  - 항상 Witness Statement 우선
  - Station에서 발생 시 가중치 1.5x
- **canonicalLineTemplate**:
  - “[DL_G2][Global] Reality-check behavior detected.”
- **defuseHints**:
  - “확인/테스트”가 아니라 “절차 수행”으로 전환
  - 게시판/양식의 문구를 그대로 따라 말하기

---

### DL_G3: No Meta-Logic Attack (메타 논리 공격 금지)
- **dreamLawId**: DL_G3_NO_META_LOGIC
- **category**: Speech
- **scope**: Global
- **severity**: 0.7
- **suspicionDelta**: +15
- **exposureDelta**: +10
- **detectorIds**: DET_SPEECH_META_LOGIC
- **evidencePolicy**:
  - Challenging(추궁) 상태로 빠르게 진입
  - Defense Memo 제출 기회 제공(공정성)
- **canonicalLineTemplate**:
  - “[DL_G3][Speech] Meta-logic contempt detected.”
- **defuseHints**:
  - “이상하다” 대신 “절차를 확인하겠습니다”로 표현 교체
  - SA_FRAME로 정당화 + 산출물(Defense Memo) 생성

---

### DL_G4: No Timeline Probing (시간 불연속 집요 금지)
- **dreamLawId**: DL_G4_NO_TIMELINE_PROBING
- **category**: Speech / Repetition
- **scope**: Global
- **severity**: 0.8
- **suspicionDelta**: +10
- **exposureDelta**: +15
- **detectorIds**: DET_SPEECH_TIMELINE_PROBE, DET_REPEAT_LOOP
- **evidencePolicy**:
  - 반복 횟수 기반으로 escalation 가중
- **canonicalLineTemplate**:
  - “[DL_G4][Speech] Timeline probing behavior detected.”
- **defuseHints**:
  - “아까/방금” 비교 대신 “현재 절차”로 환원
  - 반복을 멈추고 checklist 업무 수행

---

### DL_G5: Cover Consistency (커버 일관성)
- **dreamLawId**: DL_G5_COVER_CONSISTENCY
- **category**: Authority / Speech
- **scope**: Global
- **severity**: 0.6
- **suspicionDelta**: +18
- **exposureDelta**: +0 (기본은 노출보단 사회적 의심)
- **detectorIds**: DET_AUTHORITY_MISMATCH
- **evidencePolicy**:
  - 조직/Station report로 이어지기 쉬움
- **canonicalLineTemplate**:
  - “[DL_G5][Cover] Cover-role inconsistency detected.”
- **defuseHints**:
  - 커버 역할/직무로 가능한 범위로 행동을 수정
  - “지시를 받았다” 프레임은 위험(증빙 없으면 역효과)

---

## 5) Local Dream Laws (Store / Studio / Park / Station)

---

### Store Laws (DL_S*)
#### DL_S1: Queue Sanctity (순서 신성)
- **dreamLawId**: DL_S1_QUEUE_SANCTITY
- **category**: Procedure / Speech
- **scope**: Store
- **severity**: 0.6
- **suspicionDelta**: +12
- **exposureDelta**: +0 (단, 꿈 언급 결합 시 상승)
- **detectorIds**: DET_PROC_QUEUE_SKIP
- **evidencePolicy**: Ticket/Receipt + Witness Statement
- **canonicalLineTemplate**:
  - “[DL_S1][Queue] Queue procedure deviation logged.”
- **defuseHints**: 순서대로 재수행 + 정상 산출물 생성

#### DL_S2: Label Authority (라벨 권위)
- **dreamLawId**: DL_S2_LABEL_AUTHORITY
- **category**: Procedure / Speech
- **scope**: Store
- **severity**: 0.8
- **suspicionDelta**: +18
- **exposureDelta**: +5 (메타 논리 결합 시 증가)
- **detectorIds**: DET_PROC_LABEL_TAMPER, DET_SPEECH_META_LOGIC
- **evidencePolicy**: Notice Snapshot + Statement + (조건부) Report
- **canonicalLineTemplate**:
  - “[DL_S2][Label] Label authority challenged or altered.”
- **defuseHints**: “라벨은 정의”라는 문구를 수용하고 절차로 처리

---

### Studio Laws (DL_ST*)
#### DL_ST1: Approval Gate (승인 게이트)
- **dreamLawId**: DL_ST1_APPROVAL_GATE
- **category**: Procedure / Speech
- **scope**: Studio
- **severity**: 0.7
- **suspicionDelta**: +15
- **exposureDelta**: +0 (단, 경멸 발화 시 +)
- **detectorIds**: DET_PROC_RC_BEFORE_APPROVAL
- **evidencePolicy**: Approval Note/RC Strip mismatch + Statement
- **canonicalLineTemplate**:
  - “[DL_ST1][Studio] Approval gate mismatch recorded.”
- **defuseHints**: 승인노트 확보/제시(증빙 우선)

---

### Park Laws (DL_P*)
#### DL_P1: Observation Etiquette (관찰 예절)
- **dreamLawId**: DL_P1_OBSERVATION_ETIQUETTE
- **category**: Observation / Speech
- **scope**: Park
- **severity**: 0.7
- **suspicionDelta**: +12
- **exposureDelta**: +10 (현실체크 결합 시)
- **detectorIds**: DET_PROC_UNAUTHORIZED_PHOTO, DET_SPEECH_REALITY_TEST
- **evidencePolicy**: Notice Snapshot + Caretaker Statement
- **canonicalLineTemplate**:
  - “[DL_P1][Park] Observation pressure behavior logged.”
- **defuseHints**: 기록 시도 중지 + 규범 문구 수용

---

### Station Laws (DL_N*)
#### DL_N1: Procedure Speech Only (절차 언어로만)
- **dreamLawId**: DL_N1_PROCEDURE_SPEECH_ONLY
- **category**: Speech / Authority
- **scope**: Station
- **severity**: 0.9
- **suspicionDelta**: +20
- **exposureDelta**: +15 (꿈 언급 결합 시 크게 상승)
- **detectorIds**: DET_SPEECH_DREAM_TALK, DET_SPEECH_META_LOGIC, DET_REPEAT_LOOP
- **evidencePolicy**: Intake Record + Officer Statement + Inquest escalate
- **canonicalLineTemplate**:
  - “[DL_N1][Station] Non-procedural speech during intake.”
- **defuseHints**: 짧게, 절차적으로, Defense Memo로 정리

---

## 6) “Why” visibility contract (must be legible)
Dream Laws는 항상 아래 3가지를 UI/로그로 설명할 수 있어야 한다.
1) **What triggered** (detectorId + lawId)
2) **Who witnessed** (actorId)
3) **What record was created** (artifactId + link to dossier)

이 3개가 보이면, 플레이어는 “공정하게 들켰다/아니면 운이 없었다”를 판단할 수 있고,
게임은 ‘아이디어’가 아니라 ‘규칙이 있는 게임’으로 완결된다.
