## 아키텍처 개요

리포지터리 구조:
- `game/`: Unity 6 URP 프로젝트
- `server/`: LLM 백엔드 서버 (향후 예정)
- `docs/`: 루트 레벨 문서 (이 폴더)
- `game/docs/`: 게임 디자인/기술 문서

경계/책임:
- 클라이언트(Unity): 게임플레이 루프, 규칙, 의심 모델, 페이싱 디렉터, 오프라인 대화 폴백
- 서버(후속): `IDialogueProvider` 구현체로 LLM 응답 제공(타임아웃 시 폴백)

### 모듈 매핑 (코드 ↔ 설계)
- Core (`Assets/Scripts/Core/`)
  - 규칙 데이터: `DreamRule`(SO), `DreamRuleSet`(SO)
  - 의심/인지율: `SuspicionManager`, `NpcPerception`
  - 세션: `GameSession`
  - 디렉터: `DirectorController`
  - 대화계층: `IDialogueProvider`, `DialogueResult`
- Gameplay (`Assets/Scripts/Gameplay/`)
  - 단서 노출/획득: `ClueTrigger`
  - 캐릭터: `PlayerController`, `NpcController`
- UI (`Assets/Scripts/UI/`)
  - 지식 노트: `KnowledgeNoteView`
  - 디버그: `DebugOverlay`

### 핵심 데이터 타입
- `DreamRule`
  - id/category/statement/clues/suspicionDelta 등. 설계 스키마는 `game/docs/Design/DreamRules.md` 참고
- `DreamRuleSet`
  - 세션 후보 규칙 목록, 시드 기반 선택(후속)

### 흐름(요약)
1) 단서 트리거 → `HypothesisTracker.LogClue` → 3회 누적 시 확정 → UI 표기
2) 위반 이벤트 → `SuspicionManager.ApplyViolation` → NPC `s_i` 및 전역 `G` 갱신
3) 3분 무단서 → `DirectorController` 단서 이벤트 트리거
4) `GameSession`이 시간/`G` 임계로 세션 종료

### 문서 링크
- 원페이퍼: `game/docs/Design/OnePageGDD.md`
- 규칙 스키마: `game/docs/Design/DreamRules.md`
- 의심 모델: `game/docs/Design/SuspicionModel.md`
- 디렉터: `game/docs/Design/Director.md`
- 로드맵: `game/docs/Design/VerticalSliceRoadmap.md`
- 컨벤션: `docs/Contrib/UnityProjectConventions.md`

ADR 색인:
- ADR-0001 리포지터리 레이아웃 및 문서 분리 (루트 ADR)


