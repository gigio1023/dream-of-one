# Dream of One — Single Plan

이 문서는 **프로젝트 정의 + 구현 범위 + 실행/테스트 + Unity 설정 + 진행 현황 + 개발 계획**을 모두 포함하는 **유일한 문서**다.
다른 문서는 유지하지 않는다.

---

## 1) 프로젝트 정의
- 목표: 편의점 거리에서 **위반 → 의심 → 신고 → 심문 → 판정** 루프 1회 이상 자연스럽게 실행되는 v0.1
- 원칙: 판정은 규칙 기반, LLM은 1줄 변주/요약만 담당
- 범위: NPC 4명(Clerk/Elder/Tourist/Police), 규칙 3개(R4/R5/R10)

## 2) 현재 구현 상태
- 루프 핵심 로직(위반→의심→신고→심문→판정) 완료
- 씬이 비어 있어도 **RuntimeBootstrap**이 최소 월드를 자동 구성해 즉시 플레이 가능
- LLM 호출/폴백 포함, 출력은 1줄 제한 처리
- NavMesh 없이도 **SimplePatrol**로 NPC 이동 가능

## 3) 남은 작업(완성 조건)
1. **정식 씬 구성**
   - Main/Prototype 씬에 시스템 오브젝트와 UI Canvas 배치
2. **NavMesh 베이크 기반 이동 전환**
   - NavMeshSurface 추가 + Bake
   - Police/NPC NavMeshAgent 활성화
3. **UI 정식 배치**
   - G 바/로그/토스트/심문 텍스트/프롬프트 배치 및 연결
4. **10분 루프 검증**
   - 위반→의심→신고→심문→판정 1회 이상 재현

---

## 4) Unity 에디터 최소 설정
- 씬 열기: `Assets/Scenes/Prototype.unity` 또는 `Main.unity`
- 시스템 오브젝트가 없다면 RuntimeBootstrap이 자동 생성
- 정식 구성 시 시스템 오브젝트 배치:
  - WorldEventLog, SemanticShaper, GlobalSuspicionSystem, ReportManager
  - EventLogPresenter, UIManager, ViolationResponseSystem
- NavMeshSurface 추가 후 Bake
- UI Canvas 생성 및 UIManager 연결
- Input Actions 연결(`Assets/InputSystem_Actions.inputactions`)

---

## 5) 실행 방법
1. Unity Hub에서 `draem-of-one/` 열기
2. 씬 열기
3. Play

입력
- 이동: WASD
- 상호작용: E
- 촬영: F

LLM(선택)
- 기본 엔드포인트: `http://localhost:11434/utterance`
- 실패 시 폴백으로 진행

---

## 6) 테스트 방법
- Unity Test Runner → **EditMode** → Run All
- 수동: 10분 플레이에서 예외/크래시 없이 루프 1회 재현

---

## 7) 개발 계획 (압축)
### 단계 A — 씬/네비/UI 정식화
- NavMesh 베이크 적용
- UI Canvas 배치 + UIManager 연결
- 시스템 오브젝트 연결 확인

### 단계 B — 튜닝/검증
- 의심 수치/신고 쿨다운/판정 임계값 튜닝
- 10분 루프 검증 후 기록 남김

### 단계 C — 마감
- README/빌드 설정 정리
- v0.1 슬라이스 상태 확정

---

## 8) 변경 기록(요약)
- 문서 통합: 단일 계획 문서만 유지
- RuntimeBootstrap + LLM/폴백 + SimplePatrol 연결 완료
