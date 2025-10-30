# Unity 프로젝트 컨벤션 (Dream of One)

## 엔진/환경
- Unity: 6000.2.10f1 (LTS 동급만 허용)
- 렌더 파이프라인: URP 17.x
- 입력: Input System 1.14 (Legacy Input 비활성)
- 플랫폼: PC 우선 (Mac/Win)

## 폴더 구조 (Assets)
- `Assets/Scripts/`
  - `Core/` 규칙/의심/세션/디렉터/대화 인터페이스 등 엔진-불문 모듈
  - `Gameplay/` 플레이어/NPC/지각/트리거 등 씬 상호작용
  - `UI/` 노트 뷰/디버그 오버레이 등 UI 계층
  - `DreamOfOne.asmdef` (루트 네임스페이스 `DreamOfOne`)
- `Assets/Scenes/` 게임플레이 씬 (`Prototype.unity` 등)
- `Assets/AddressableAssets/` Addressables 그룹(후속)
- `Assets/Data/Rules/` ScriptableObject 규칙 에셋
- `Assets/Prefabs/` 프리팹 (Player, NPC, Clue 등)

권장 추가:
- `Assets/Art/` (Models/Textures/Materials)
- `Assets/UI/` (TMP 폰트, Sprites)

## 네임스페이스/어셈블리
- 네임스페이스: `DreamOfOne.Core`, `DreamOfOne.Gameplay`, `DreamOfOne.UI`
- 어셈블리: `DreamOfOne` 단일 asmdef 유지. 하위 분리는 성숙도↑ 시 고려(`DreamOfOne.Core`/`Gameplay`/`UI`).

## 씬/프리팹 규칙
- 씬 이름: `Prototype`, `Cafe`, `Park` 등 PascalCase, 공백/한글 지양
- 씬 배선: `Prototype`에 최소 구성(플레이어, 1–2 NPC, 단서 트리거, HypothesisTracker, SuspicionManager, Director)
- 프리팹: `P_` 접두사(`P_Player`, `P_NPC_Guard`, `P_CluePoster`)
- 레이어/태그: `Player` 태그 사용(예: `ClueTrigger`), 커스텀 레이어는 문서화

## UI
- 텍스트는 TextMeshPro 선호(신규 UI). 기존 `UnityEngine.UI.Text`는 프로토타입 유지
- 캔버스 스케일러: `Scale With Screen Size`, 기준 1920x1080
- 폰트/스프라이트는 Addressables 전환 계획 수립

## 입력(Input System)
- 액션 자산: `Assets/InputSystem_Actions.inputactions`
- 바인딩 변경 시: 리비전 노트에 영향 씬/UI 명시

## 데이터/룰(ScriptableObject)
- 규칙 에셋 위치: `Assets/Data/Rules/`
- 파일명: `RUL-<CAT>-<Slug>.asset` (예: `RUL-ETQ-LeftHandWave.asset`)
- `DreamRuleSet.asset`로 세션 후보 묶음 관리(랜덤 시드 사용)

## Addressables (후속)
- 번들 단위: 거점(카페 내부 등) 기준
- 로드/릴리즈는 핸들 1:1 매칭 (메모리 가드)
- 그룹 네이밍: `grp.location.cafe`, `grp.ui.common` 등

## 코딩 스타일
- MonoBehaviour 필드: `[SerializeField] private` 기본, 런타임 프로퍼티로 노출
- Update 최소화, 이벤트/트리거 활용
- 델타/가중치 파라미터는 `[Range]`로 튜닝 가능화
- 주석은 비자명한 의도/불변식/성능 주의만

## 정의(DoD) 체크
- 플레이: `Prototype` 씬에서 즉시 Run 가능
- 규칙: 3개 규칙 에셋 연결, 단서 ≥2 배치, 위반 시 의심 변화 확인 가능
- 로그: 세션 종료 사유/규칙 확정 로그 노출
- 문서: 관련 문서 링크(설계/아키텍처/체크리스트) 최신화

## Git/LFS
- 대용량 바이너리(Library 제외) LFS 고려(모델/텍스처/오디오)
- `.meta` 추적 유지, `Library/`, `Temp/` 등은 `.gitignore`

## 성능 가드(프로토타입)
- LLM 호출은 1명/분당 예산 준수, 실패 시 폴백
- Addressables 미도입 상태에서는 씬 경량 유지(에셋 수 최소화)
