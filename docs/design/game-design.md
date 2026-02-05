---
doc: docs/design/game-design.md
project: Dream of One
revision: 2026-02-05
status: Draft v0.1 (Design Bible)
---

# Dream of One — Game Design Bible (v0.1)

## 0) One-line pitch
루시드 드리머인 플레이어가 조직 절차를 ‘정상적으로 수행’하며 의심과 노출을 피하는 **텍스트 기반 사회적 스텔스** 게임.

## 1) Experience goals
- 플레이어가 “정상처럼 보이기”에 몰입하도록 만드는 압박과 긴장
- 규칙이 명확하고 공정하다고 느끼는 **deterministic** 피드백
- 텍스트 상호작용이 위험 표면임을 체감하는 세션 구조
- 반복 플레이에서 “증거·판정·회피”가 변화하는 리플레이성

## 1.1) Onboarding (first 3 minutes)
- 첫 장소에서 **Dream Law 1개 + Cover Test 1개**만 노출
- SA_COMPLY → SA_FRAME 순서로 안전한 대응을 학습
- 첫 Witness Statement는 반드시 생성되도록 유도 (기록의 무게 체감)
- UI가 “왜 의심이 올랐는지”를 즉시 보여줌

## 2) Design pillars (non-negotiable)
- **Player is not an investigator**: 플레이어는 조사 대상이며 커버를 유지해야 함.
- **Deterministic core**: 판정, 증거, 노출은 규칙 기반.
- **Text is danger surface**: 텍스트 표면이 Dream Law를 드러냄.
- **Artifacts outweigh words**: 말보다 기록이 무겁다.
- **Readable reasons**: why/what/who가 항상 UI와 로그에 표시됨.

## 3) Core loop (session)
**Cover 업무 수행 → Text surface 대응 → Suspicion/Exposure 관리 → 신고/조사 회피 → 세션 종료**

### Session rhythm (10–12 min)
- 0:00–1:00: 커버 브리핑 + 체크리스트
- 1:00–9:00: 4개 랜드마크 순회 + Cover Tests 최소 2회
- 9:00–12:00: 신고/인퀘스트 압박 또는 soft check
- End: 요약 + 다음 훅

## 4) Player verbs / inputs
- **Speech Acts**: SA_COMPLY / SA_INQUIRE / SA_FRAME / SA_BREAK
- **Interaction**: 텍스트 표면 읽기, 절차 수행, 증빙 제출, 현장 이탈(쿨다운)
- **Movement**: 탐색/이동은 보조이며, 위험은 텍스트에서 발생

## 5) Systems overview

### 5.1 Dream Laws
- 전역/로컬 규칙 정의 (DL_G*, DL_S*, DL_ST*, DL_P*, DL_N*)
- detectorId + lawId + evidencePolicy로 구성
- 텍스트 표면이 해당 법을 ‘정상적인 문서’로 드러냄

### 5.2 Suspicion / Exposure
- Suspicion: NPC/조직별 누적, 단계적 압박
- Exposure: 글로벌 누적, 기본적으로 감소 없음
- Station에서의 위반은 가중치가 큼

### 5.3 Cover Tests
- 장소별 템플릿 (CT-01..CT-06)
- escalation ladder: Suspicious → Challenging → Reporting → Inquest
- defuse 옵션 필수: 공정성 보장

### 5.4 Artifacts & Evidence
- Witness Statement / Memo / Ticket / Notice Snapshot / Approval Note
- 증거는 WEL → Artifact → Dossier로 연결
- 기록은 판정 가중치에 직접 반영

### 5.5 Inquest Dossier (player case)
- suspect = PLAYER
- evidence bundle + deterministic verdict
- verdict: Cleared / Warning / Detained / Lucid identified

### 5.6 NPC behavior
- Role + Routine 기반 (Store/Studio/Park/Station)
- 플레이어 행동과 텍스트 입력을 감시/기록
- Rumor 시스템은 v1 이후 확장

### 5.7 LLM boundary
- LLM은 **표현 스타일**만 제공
- Truth transitions는 항상 deterministic
- LLM 실패 시 즉시 템플릿 폴백

### 5.8 World Event Log (WEL)
- 모든 의미 있는 변화는 StructuredEvent 기록
- canonical line은 UI/디버그/증거의 단일 근거

## 6) Content scope (v0.1 → v1)

### Required landmarks
- Store / Studio / Park / Station

### Text surfaces
- signage, notice, form, ticket, memo, approval note
- 각 surface는 최소 1개 DreamLawId 참조

### Cover Tests (v1 baseline)
- CT-01 Store Queue Language
- CT-02 Store Label Meaning
- CT-03 Studio Approval Gate Speech
- CT-04 Park Observation Pressure
- CT-05 Station Soft Inquest
- CT-06 Global Reality Check Contagion

## 7) UI / UX
- HUD: Suspicion(지역/조직), Exposure, cover, checklist
- Artifact inventory + inspection
- Inquest dossier UI: “why verdict happened” 표시
- Debug overlay: last detectors + reason codes (옵션)

## 8) Progression / replayability
- 세션 스코어: 위험/회피/정상 수행 가중치
- 루트: Clean Pass / Narrow Escape / Exposed
- v1 이후: 조직 정책/권한/장비로 플레이스타일 변화

## 9) Narrative & tone
- 테마: 순응, 감시, 정상성 연기, 자각의 억제
- NPC는 “규칙이 정상”이라고 믿는 톤 유지
- 플레이어는 ‘깨달음’을 감추기 위해 절차 용어만 사용

## 10) Audio / visual direction (v0.1)
- 현실적 공간 + 꿈의 비논리성을 텍스트로 표현
- UI는 정보 밀도 높고 이유를 즉시 노출
- 음향은 긴장/압박을 강조하는 얕은 레이어

## 11) Accessibility / localization
- 텍스트 가독성: 폰트/크기/대비 기준 유지
- 위험 키워드 locale별 관리 (KO/EN 우선)
- Dream Law 용어집 고정(번역 일관성)

## 12) Failure recovery & fairness
- 즉시 종료 대신 “경고/보류” 단계 확보
- defuse 경로 최소 1개 보장 (Cover Test마다 정의)
- “왜 졌는지” 로그/도시어로 납득 가능해야 함

## 13) Production pipeline
- ScriptableObjects 기반 데이터 정의
- `Rebuild World From Data`로 재현 가능
- Diagnostics gate: 콘솔 에러 0
- PlayMode tests: 세션 시작/종료, 커버 테스트, 인퀘스트, LLM 비활성

## 14) Metrics & tuning targets
- Session 10–12 min 안정
- 2+ Cover Tests/세션, 3+ Artifacts/세션
- 노출 상승 사유는 100% 설명 가능

## 15) v0.1 → v1 milestones (big picture)
- v0.1: MCSS 동작 + deterministic 루프 완성
- v0.2: NPC routine 강화 + UI 이유설명 완성도
- v1: 4+ 루틴, 6+ 사건, 3+ 엔딩, 리플레이성 확보

## 16) Dependencies (SoT)
- Gameplay contract: `project.md`
- Dream Laws: `docs/design/dream-laws.md`
- Cover Tests: `docs/design/cover-tests.md`
