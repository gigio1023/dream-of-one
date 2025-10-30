# 버티컬 슬라이스 로드맵 (VS, 가안)

본 로드맵은 하루 단위의 작은 완결로 동기부여를 유지하면서, 전문가 합류 시 즉시 이해 가능한 DoD(Definition of Done)를 제공합니다. 본 문서는 가안이며, 플레이테스트/개발 진행에 따라 수정될 수 있습니다.

## VS-M0: 부팅 가능한 프로토(1–2일)
- 목표: 씬 실행 즉시 3인칭 이동, 디버그 오버레이, 빈 규칙 루프 뼈대
- DoD
  - `Prototype.unity` 실행 → 플레이어 이동 가능
  - `Global Awareness G` 디버그 라벨 표시
  - `HypothesisTracker` 존재(테스트용 API 호출로 확정 로그 확인)

## VS-M1: 규칙-단서-확정 루프(2–3일)
- 목표: 단서 2–3개 노출 → 가설 누적 → 3회시 자동 확정(UI 반영)
- DoD
  - `ClueTrigger` 2–3개 배치, `Player` 태그로 발동
  - `KnowledgeNoteView`: 확정된 규칙 ID가 UI에 표시
  - 규칙 1개 실제 데이터 사용(`RUL-ETQ-LeftHandWave` 등)

## VS-M2: 위반-의심-인지율 & 디렉터(2–3일)
- 목표: 위반 시 NPC 개인 의심 증가 → 전역 G 반영, 3분 무단서 시 디렉터 단서 이벤트
- DoD
  - `SuspicionManager.ApplyViolation(...)` 경로로 NPC 의심/전역 G 변화 확인
  - 위반 1회 트리거 방법(테스트용 버튼/행동) 확보
  - 180초 무단서 시 `Director` 로그로 단서 이벤트 발생

## VS-M3: 콘텐츠 3룰 + 최소 밸런스(2–3일)
- 목표: 3개 규칙 세션 로테이션, 단서 밀도 조정, 종료 조건 작동
- DoD
  - `DreamRuleSet`에서 3개 규칙 선택(시드 고정)
  - 각 규칙 단서 ≥2, 위반 시 의심 변화 체감
  - `G ≥ 0.30` 또는 25분 경과로 세션 종료 로그

---

## 일일 마이크로 마일스톤(예시 10일)
1. M0-1: `Prototype` 씬 정리, 플레이어 이동/카메라, 디버그 라벨
2. M0-2: `HypothesisTracker`/`KnowledgeNoteView` 배선(더미 데이터로 1개 확정)
3. M1-1: `ClueTrigger` 2개 배치, 규칙 ID(태그) 전달 경로 연결
4. M1-2: 규칙 SO 1개 작성, 단서 2개 배치, UI에 확정 반영
5. M2-1: `NpcPerception` 시야계수 튜닝, `ApplyViolation` 테스트 버튼
6. M2-2: 위반→개인의심→전역 G 라벨 반영, 간단 스무딩 검증
7. M2-3: `Director` 180초 타이머로 단서 이벤트 로그 확인
8. M3-1: 규칙 3개 SO 작성, `DreamRuleSet` 시드 셔플 연결
9. M3-2: 단서 밀도/의심 델타 1차 튜닝, 종료 조건 확인
10. 품질: 플레이 영상 30–60초 캡처, 문서/체크리스트 업데이트

---

## 위험/가드레일
- 단서 부족은 재미를 급격히 해침 → `Director`로 3분 보장
- LLM은 후순위(오프라인 폴백 유지) → 대화는 1–2문장, 실패 시 스텁
- 루프 가시성 우선: HUD 과잉은 지양하되, 디버그 오버레이는 유지

## 문서 링크
- 원페이퍼: `game/docs/Design/OnePageGDD.md`
- 규칙 스키마: `game/docs/Design/DreamRules.md`
- 의심 모델: `game/docs/Design/SuspicionModel.md`
- 디렉터: `game/docs/Design/Director.md`
- 컨벤션: `docs/Contrib/UnityProjectConventions.md`
