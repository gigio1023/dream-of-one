# 초보자용 유니티 개발 계획 (가안)

본 문서는 유니티/C# 초보자가 하루 20–60분 단위의 작은 완결을 달성하도록 돕는 실행 계획입니다. 진행 중 피드백에 따라 변경될 수 있는 가안입니다.

## 목표/범위
- VS(M0~M3)에서 정의한 최소 루프를 작동시킨다: 단서→가설→3회 확정, 위반→의심→전역 G, 3분 무단서 시 디렉터 이벤트.
- 매일 "Play 눌러 확인 가능한 결과(DoD)"를 갖는다.
- 3년차 개발자이지만 Unity/C# 처음, 게임 개발 미경험자 기준으로 작성.

## 사전 준비 (Day 0 ~ 필요 시 분산)

### Day 0-1: Unity 설치 및 프로젝트 열기 (30분)
1. Unity Hub 설치 ([unity.com/download](https://unity.com/download))
2. Unity 6000.2.10f1 버전 설치
   - Hub > Installs > Add > 6000.2.10f1 검색/설치
3. Hub > Projects > Add > `<repo경로>/game/` 선택
4. 프로젝트 열기(첫 로드는 5–10분 소요 가능)
5. **DoD**: Unity Editor가 열리고 Console/Inspector/Hierarchy 패널이 보임

### Day 0-2: 프로젝트 탐색 및 씬 열기 (20분)
1. Project 패널에서 `Assets/Scenes/Prototype.unity` 더블클릭
2. Hierarchy에서 게임 오브젝트 목록 확인
3. Scene 뷰에서 마우스 우클릭+드래그(회전), 스크롤(줌)
4. Play 버튼(▶) 클릭 → Game 뷰 확인 → 다시 클릭해 종료
5. **DoD**: Prototype 씬이 열리고, Play/Stop 가능

### Day 0-3: 문서 숙지 (20–30분, 선택적으로 분산 가능)
- 컨벤션: `docs/Contrib/UnityProjectConventions.md`
- VS 로드맵(가안): `game/docs/Design/VerticalSliceRoadmap.md`
- 규칙 스키마: `game/docs/Design/DreamRules.md`
- 의심 모델: `game/docs/Design/SuspicionModel.md`
- 디렉터: `game/docs/Design/Director.md`
- **DoD**: 핵심 용어(SO, DoD, 단서, 의심, G) 이해

---

## Day 1 — 플레이어 이동 확인 및 디버그 오버레이 연결 (40–60분)

### 목표
`Prototype` 씬에서 플레이어가 이동 가능하고, 화면 좌상단에 `Global Awareness G` 라벨이 보이게 한다.

### 단계별 작업

#### 1-1. 플레이어 이동 확인 (10분)
1. Hierarchy에서 플레이어 오브젝트 찾기(이름 `Player` 또는 유사)
2. 선택 후 Inspector에서 `PlayerController` 컴포넌트 확인
3. Play 후 WASD 또는 화살표로 이동 가능한지 확인
4. **문제 시**: 플레이어 오브젝트가 없으면 Hierarchy 우클릭 > Create Empty, 이름 `Player`, `PlayerController` 스크립트 추가

#### 1-2. SuspicionManager 생성 (15분)
1. Hierarchy 빈 공간 우클릭 > Create Empty, 이름 `GameManagers`
2. 다시 우클릭 > Create Empty, 이름 `SuspicionManager_Obj`, `GameManagers`의 자식으로 드래그
3. Inspector 하단 Add Component > 검색창에 `SuspicionManager` 입력 후 선택
4. Inspector에서 `globalAwarenessG` 값 확인(0.0 초기값)

#### 1-3. DebugOverlay 연결 (15–20분)
1. Hierarchy 우클릭 > Create Empty, 이름 `UI_Debug`
2. Add Component > `DebugOverlay`
3. Inspector에서 `Suspicion Manager` 필드 비어있음 확인
4. Hierarchy의 `SuspicionManager_Obj`를 드래그 → Inspector `Suspicion Manager` 필드에 드롭
5. **Play**: 화면 좌상단에 `Global Awareness G: 0.00` 라벨 확인

### Unity 용어/개념 정리
- **Hierarchy**: 씬 내 게임 오브젝트 트리
- **Inspector**: 선택한 오브젝트의 속성(컴포넌트, 값)
- **Component**: 오브젝트에 부착된 기능 모듈(예: `DebugOverlay`)
- **Reference 연결**: 드래그&드롭으로 컴포넌트를 필드에 연결

### DoD
- [ ] Play 후 WASD로 이동 가능
- [ ] 좌상단에 `Global Awareness G: 0.00` 표시
- [ ] 콘솔에 에러 없음

## Day 2 — 지식 노트 UI 배선 (50–70분)

### 목표
화면에 지식 노트 UI를 배치하고, `HypothesisTracker`와 연결해 확정된 규칙이 표시되도록 한다.

### 단계별 작업

#### 2-1. HypothesisTracker 생성 (10분)
1. Hierarchy `GameManagers` 우클릭 > Create Empty, 이름 `HypothesisTracker_Obj`
2. Add Component > `HypothesisTracker`
3. Inspector에서 `Confirmations Required` 기본값 3 확인

#### 2-2. Canvas 생성 (10–15분)
1. Hierarchy 우클릭 > UI > Canvas (자동으로 `EventSystem`도 생성됨)
2. Canvas 선택 > Inspector > Canvas Scaler 컴포넌트 확인
   - UI Scale Mode: `Scale With Screen Size`
   - Reference Resolution: X=1920, Y=1080
   - Screen Match Mode: `Match Width Or Height`, Match=0.5

#### 2-3. 텍스트 UI 추가 (10분)
1. Canvas 우클릭 > UI > Text (Legacy UI 사용, 추후 TMP 전환 가능)
2. 이름 `NoteText`
3. Inspector > Rect Transform:
   - Anchor Presets(좌상단 박스 아이콘) 클릭 > **Top Left** 선택
   - Pos X: 20, Pos Y: -20, Width: 300, Height: 400
4. Text 컴포넌트:
   - 초기 텍스트: `[Knowledge Note]`
   - Font Size: 14, Alignment: Left-Top

#### 2-4. KnowledgeNoteView 연결 (15–20분)
1. Canvas 우클릭 > Create Empty, 이름 `NoteView_Logic`
2. Add Component > `KnowledgeNoteView`
3. Inspector에서 두 필드 연결:
   - `Hypothesis Tracker`: Hierarchy의 `HypothesisTracker_Obj` 드래그&드롭
   - `Note Text`: Hierarchy의 `NoteText` 드래그&드롭
4. **Play**: 화면 좌상단에 `[Knowledge Note]` 텍스트 확인

### Unity 용어/개념 정리
- **Canvas**: UI 요소를 담는 최상위 컨테이너
- **Rect Transform**: UI 오브젝트의 위치/크기(Transform 대신 사용)
- **Anchor**: 화면 크기 변화 시 UI가 고정될 기준점
- **Legacy UI Text**: Unity 기본 텍스트(TMP는 더 고급 버전)

### DoD
- [ ] Canvas와 EventSystem 존재
- [ ] 좌상단에 `[Knowledge Note]` 텍스트 표시
- [ ] `KnowledgeNoteView` 두 필드 모두 연결됨(None이 아님)

## Day 3 — 단서 트리거 배치 및 3회 확정 테스트 (50–70분)

### 목표
플레이어가 단서 오브젝트를 3번 접촉하면 규칙이 확정되어 콘솔 로그와 UI에 표시되게 한다.

### 단계별 작업

#### 3-1. Player 태그 설정 (5분)
1. Hierarchy에서 `Player` 오브젝트 선택
2. Inspector 최상단 `Tag` 드롭다운 > `Player` 선택
3. 없으면 `Add Tag...` > Tags > `+` > `Player` 입력 후 저장, 다시 Player 오브젝트에 적용

#### 3-2. 단서 트리거 A 생성 (15–20분)
1. Hierarchy 우클릭 > 3D Object > Cube, 이름 `Clue_A`
2. Transform 위치 조정(플레이어 근처, 예: X=2, Y=0, Z=0)
3. Inspector > Add Component > `Box Collider` (이미 있으면 스킵)
4. Box Collider > `Is Trigger` 체크박스 **활성화**
5. Add Component > `ClueTrigger`
6. Inspector `ClueTrigger`:
   - `Clue Tag`: `RUL-ETQ-LeftHandWave` 입력
   - `Hypothesis Tracker`: Hierarchy의 `HypothesisTracker_Obj` 드래그&드롭

#### 3-3. 단서 트리거 B 생성 (10분)
1. `Clue_A` 선택 > Ctrl+D(복제), 이름 `Clue_B`
2. Transform 위치 변경(예: X=5, Y=0, Z=0)
3. Inspector `ClueTrigger` 확인:
   - `Clue Tag`와 `Hypothesis Tracker`는 복제되어 동일(그대로 유지)

#### 3-4. 테스트 (15–20분)
1. **Play** 후 플레이어를 `Clue_A`로 이동(큐브에 겹치기)
2. 콘솔(Window > General > Console) 확인: 아직 로그 없음
3. 다시 `Clue_B`로 이동(2번째 접촉)
4. 다시 `Clue_A`로 이동(3번째 접촉)
5. 콘솔에 `Rule confirmed: RUL-ETQ-LeftHandWave` 로그 확인
6. 노트 UI에 `• RUL-ETQ-LeftHandWave (확정)` 표시 확인

### Unity 용어/개념 정리
- **Collider**: 충돌 감지 영역
- **Is Trigger**: 물리 충돌 대신 겹침 이벤트만 발생(`OnTriggerEnter`)
- **Tag**: 오브젝트 분류용 라벨(스크립트에서 `CompareTag("Player")` 사용)

### 문제 해결
- 로그가 안 뜨면:
  - Player 태그 확인
  - Box Collider `Is Trigger` 체크 확인
  - `Clue Tag` 철자 일치 확인
  - `Hypothesis Tracker` 연결 확인(None이 아님)
- Collider가 보이지 않으면: Scene 뷰 상단 Gizmos 버튼 활성화

### DoD
- [ ] `Clue_A`, `Clue_B` 두 오브젝트 배치
- [ ] 3회 접촉 시 콘솔에 `Rule confirmed:` 로그
- [ ] 노트 UI에 확정된 규칙 ID 표시

## Day 4 — ScriptableObject로 규칙 데이터 작성 (40–60분)

### 목표
`DreamRule` ScriptableObject 에셋을 생성해 규칙 데이터를 저장하고, 향후 확장 가능한 데이터 구조를 갖춘다.

### 단계별 작업

#### 4-1. 폴더 생성 (5분)
1. Project 패널에서 `Assets` 우클릭 > Create > Folder, 이름 `Data`
2. `Data` 우클릭 > Create > Folder, 이름 `Rules`
3. 최종 경로: `Assets/Data/Rules/`

#### 4-2. DreamRule 에셋 생성 (10–15분)
1. `Assets/Data/Rules/` 폴더 선택
2. 우클릭 > Create > DreamOfOne > Dream Rule
3. 생성된 에셋 이름: `RUL-ETQ-LeftHandWave`

#### 4-3. 규칙 데이터 입력 (20–30분)
1. 에셋 선택 > Inspector에서 필드 입력:
   - `Id`: `RUL-ETQ-LeftHandWave`
   - `Category`: `Etiquette`
   - `Statement`: `공공장소에서 인사는 왼손만 사용한다.`
   - `Conditions`: (빈 배열 유지, 향후 확장용)
   - `Violation`: (빈 배열 유지, 향후 확장용)
   - `Clues`: Size 3으로 설정 후
     - Element 0: `벽포스터_왼손그림`
     - Element 1: `NPC_발화_힌트`
     - Element 2: `입장시_왼손제스처_NPC`
   - `Suspicion Delta`: `8`
   - `Hint Density`: `high`

2. Ctrl+S(저장) 또는 Unity 자동 저장 대기

### Unity 용어/개념 정리
- **ScriptableObject(SO)**: 데이터 저장 전용 에셋(MonoBehaviour와 달리 씬에 붙지 않음)
- **Inspector 배열**: Size 값 변경 후 Element 0, 1, 2... 입력
- **Create 메뉴**: `[CreateAssetMenu]` 특성으로 등록된 SO는 Create 메뉴에 나타남

### DoD
- [ ] `Assets/Data/Rules/RUL-ETQ-LeftHandWave.asset` 파일 존재
- [ ] Inspector에서 `Id`, `Statement`, `Clues` 3개, `Suspicion Delta` 입력 완료
- [ ] 에셋 선택 시 데이터 정상 표시

## Day 5 — 위반 시뮬레이션 및 의심도 상승 확인 (60–90분)

### 목표
NPC가 플레이어의 규칙 위반을 목격하면 개인 의심도와 전역 G가 상승하도록 하고, 키 입력으로 테스트한다.

### 단계별 작업

#### 5-1. NPC 생성 및 NpcPerception 추가 (15분)
1. Hierarchy 우클릭 > 3D Object > Capsule, 이름 `NPC_Guard`
2. Transform 위치: X=0, Y=0, Z=3 (플레이어 근처)
3. Add Component > `NpcPerception`
4. Inspector 확인:
   - `Suspicion`: 0 (초기값)
   - `View Distance Meters`: 10
   - `View Angle Degrees`: 110

#### 5-2. SuspicionManager 등록 (10분)
1. Hierarchy `GameManagers` 아래 `SuspicionManager_Obj` 선택
2. Inspector > `SuspicionManager` 컴포넌트 확인
3. **중요**: `SuspicionManager`는 런타임에 `RegisterNpc`로 등록되어야 하지만, 현재는 수동 테스트용이므로 스크립트 작성으로 해결

#### 5-3. 간이 테스트 스크립트 작성 (C# 코드, 30–40분)
1. Project 패널 `Assets/Scripts/Gameplay/` 우클릭 > Create > C# Script, 이름 `ViolationTestTrigger`
2. 더블클릭해 에디터 열기(VS Code 또는 기본 에디터)
3. 아래 코드 복사/붙여넣기:

```csharp
using System.Collections.Generic;
using UnityEngine;
using DreamOfOne.Core;

namespace DreamOfOne.Gameplay
{
    public class ViolationTestTrigger : MonoBehaviour
    {
        [SerializeField]
        private DreamRule testRule = null;
        
        [SerializeField]
        private SuspicionManager suspicionManager = null;
        
        [SerializeField]
        private NpcPerception npcWitness = null;
        
        [SerializeField]
        private Transform playerTransform = null;

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.V))
            {
                if (testRule == null || suspicionManager == null || npcWitness == null || playerTransform == null)
                {
                    Debug.LogWarning("ViolationTestTrigger: 필드 연결 누락");
                    return;
                }
                
                List<NpcPerception> witnesses = new List<NpcPerception> { npcWitness };
                suspicionManager.ApplyViolation(testRule, witnesses, playerTransform.position);
                Debug.Log($"위반 테스트: NPC suspicion={npcWitness.suspicion}, G={suspicionManager.GlobalAwarenessG:0.00}");
            }
        }
    }
}
```

4. 저장 후 Unity로 돌아가 컴파일 대기(콘솔 에러 확인)

#### 5-4. 테스트 스크립트 연결 (15–20분)
1. Hierarchy `GameManagers` 우클릭 > Create Empty, 이름 `ViolationTest`
2. Add Component > `Violation Test Trigger`
3. Inspector 필드 연결:
   - `Test Rule`: Project의 `Assets/Data/Rules/RUL-ETQ-LeftHandWave` 드래그
   - `Suspicion Manager`: Hierarchy `SuspicionManager_Obj` 드래그
   - `Npc Witness`: Hierarchy `NPC_Guard` 드래그
   - `Player Transform`: Hierarchy `Player` 드래그

#### 5-5. 테스트 (10분)
1. **Play** 후 V 키 입력
2. 콘솔에 `위반 테스트: NPC suspicion=...` 로그 확인
3. 화면 좌상단 G 값 미세 상승 확인(0.00 → 0.01 등)
4. V 키 반복 입력 시 계속 상승 확인

### Unity 용어/개념 정리
- **Input.GetKeyDown**: 키가 눌리는 순간 한 번만 true
- **Debug.Log**: 콘솔에 메시지 출력(디버깅 필수)
- **SerializeField**: private 필드를 Inspector에 노출

### 문제 해결
- 컴파일 에러 시: namespace/using 문 확인, 중괄호 짝 확인
- 필드 연결 안 되면: `None` 상태 확인, 드래그한 오브젝트 타입 확인
- 로그 안 뜨면: V 키 확인, 필드 연결 확인

### DoD
- [ ] `NPC_Guard` 오브젝트 존재, `NpcPerception` 추가
- [ ] V 키 입력 시 콘솔에 suspicion/G 로그
- [ ] G 값이 Play 중 상승 확인

## Day 6 — 디렉터 페이싱 타이머 확인 (30–40분)

### 목표
3분(180초) 동안 단서 발견이 없으면 디렉터가 로그를 출력하도록 확인한다.

### 단계별 작업

#### 6-1. DirectorController 추가 (10분)
1. Hierarchy `GameManagers` 우클릭 > Create Empty, 이름 `Director`
2. Add Component > `Director Controller`
3. Inspector > `Min Clue Interval Seconds`: 60 (테스트용, 기본 180)

#### 6-2. 테스트 (15–20분)
1. **Play** 후 단서 트리거를 피해서 60초 대기
2. 콘솔에 `Director: Triggered a clue event for pacing` 로그 확인
3. 다시 60초 경과 시 반복 로그 확인

#### 6-3. 실전 값으로 변경 (5분)
1. Stop 후 `Min Clue Interval Seconds`를 180으로 변경
2. Ctrl+S 저장

### Unity 용어/개념 정리
- **Update()**: 매 프레임마다 호출(초당 ~60회)
- **Time.deltaTime**: 이전 프레임과의 시간 차(초), 타이머 누적에 사용

### DoD
- [ ] 60초 후 디렉터 로그 1회 발생
- [ ] 실전 값 180초로 변경 완료

---

## Day 7 — 규칙 3개로 확장 및 DreamRuleSet 생성 (60–80분)

### 목표
총 3개의 규칙 SO를 만들고 `DreamRuleSet`에 묶어 향후 선택 로직을 준비한다.

### 단계별 작업

#### 7-1. 규칙 2개 추가 생성 (30–40분)
1. `Assets/Data/Rules/` 우클릭 > Create > DreamOfOne > Dream Rule, 이름 `RUL-OBJ-DoorPushTwice`
   - `Id`: `RUL-OBJ-DoorPushTwice`
   - `Category`: `Object`
   - `Statement`: `문은 2회 밀어야 열린다.`
   - `Clues` Size 2:
     - Element 0: `포스터_2회그림`
     - Element 1: `NPC_제스처_밀기`
   - `Suspicion Delta`: 12
   - `Hint Density`: med

2. 다시 Create > Dream Rule, 이름 `RUL-LAN-NoDreamWord`
   - `Id`: `RUL-LAN-NoDreamWord`
   - `Category`: `Language`
   - `Statement`: `대화에서 '꿈' 단어를 사용하면 안 된다.`
   - `Clues` Size 2:
     - Element 0: `포스터_현실존중`
     - Element 1: `NPC_완곡화법`
   - `Suspicion Delta`: 15
   - `Hint Density`: med

#### 7-2. DreamRuleSet 생성 (15–20분)
1. `Assets/Data/Rules/` 우클릭 > Create > DreamOfOne > Dream Rule Set, 이름 `DefaultRuleSet`
2. Inspector:
   - `Rules` Size: 3
   - Element 0: `RUL-ETQ-LeftHandWave` 드래그
   - Element 1: `RUL-OBJ-DoorPushTwice` 드래그
   - Element 2: `RUL-LAN-NoDreamWord` 드래그
   - `Seed`: 0 유지

#### 7-3. 확인 (10분)
1. Project에서 `DefaultRuleSet` 선택, Inspector에서 3개 규칙 모두 연결됨 확인
2. 각 규칙 에셋 클릭해 데이터 정상 입력 확인

### Unity 용어/개념 정리
- **List<T>**: C# 동적 배열, Inspector에서는 Size로 조정
- **에셋 참조**: SO는 다른 SO를 필드로 참조 가능(드래그&드롭)

### DoD
- [ ] 3개 규칙 SO 파일 존재(`RUL-ETQ-...`, `RUL-OBJ-...`, `RUL-LAN-...`)
- [ ] `DefaultRuleSet.asset` 생성 및 3개 규칙 연결

---

## Day 8 — TextMeshPro 전환 및 UI 정리 (40–60분)

### 목표
노트 UI를 TMP로 전환해 가독성을 높이고, 앵커를 재조정한다.

### 단계별 작업

#### 8-1. TMP 임포트 (10–15분)
1. Window > TextMeshPro > Import TMP Essential Resources
2. 팝업에서 Import 클릭, Assets에 `TextMesh Pro` 폴더 생성 확인

#### 8-2. 텍스트를 TMP로 교체 (20–30분)
1. Hierarchy `NoteText` 선택 후 우클릭 > Delete
2. Canvas 우클릭 > UI > Text - TextMeshPro, 이름 `NoteText_TMP`
3. Inspector > Rect Transform:
   - Anchor Presets: Top Left
   - Pos X: 20, Pos Y: -20, Width: 400, Height: 500
4. TextMeshPro - Text (UI) 컴포넌트:
   - Text: `[Knowledge Note]`
   - Font Size: 18
   - Alignment: Top Left
   - Color: White

#### 8-3. KnowledgeNoteView 재연결 (10분)
1. Canvas > `NoteView_Logic` 선택
2. Inspector `Knowledge Note View` > `Note Text` 필드에 `NoteText_TMP` 드래그&드롭
3. **Play**: TMP로 노트 표시 확인, 폰트 깔끔함 확인

### Unity 용어/개념 정리
- **TMP(TextMeshPro)**: 고급 텍스트 렌더링(크리스프, 이펙트, 자간 제어)
- **Essential Resources**: TMP 기본 폰트/셰이더 패키지

### DoD
- [ ] `NoteText_TMP` TMP 컴포넌트로 교체
- [ ] Play 시 TMP 텍스트 정상 표시
- [ ] `KnowledgeNoteView` 연결 확인

---

## Day 9 — Cinemachine 카메라 및 NPC 튜닝 (50–70분)

### 목표
Cinemachine으로 부드러운 3인칭 카메라를 설정하고, NPC 목격 범위를 조정한다.

### 단계별 작업

#### 9-1. Cinemachine 설치 (10–15분)
1. Window > Package Manager
2. 좌상단 Packages: Unity Registry 선택
3. 검색창에 `Cinemachine` 입력 > Install
4. 설치 완료 대기

#### 9-2. Virtual Camera 추가 (15–20분)
1. Hierarchy 우클릭 > Cinemachine > Virtual Camera
2. 이름 `CM_vcam_Follow`
3. Inspector:
   - Follow: Hierarchy `Player` 드래그
   - Look At: Hierarchy `Player` 드래그 (선택 사항)
   - Body: `Framing Transposer` (기본값)
     - Camera Distance: 5
     - Shoulder Offset: X=1, Y=1.5
   - Aim: `Composer` (기본값)

#### 9-3. 메인 카메라 확인 (5분)
1. Hierarchy `Main Camera` 선택
2. Add Component > `Cinemachine Brain` (이미 자동 추가되었을 수 있음)
3. **Play**: 카메라가 플레이어를 부드럽게 따라가는지 확인

#### 9-4. NPC 목격 범위 튜닝 (15–20분)
1. Hierarchy `NPC_Guard` 선택
2. Inspector `Npc Perception`:
   - `View Distance Meters`: 15로 변경
   - `View Angle Degrees`: 90으로 변경
3. **Play** 후 V 키로 위반 테스트
4. NPC 뒤에서 V 키 → suspicion 변화 없음 확인(시야 밖)
5. NPC 앞에서 V 키 → suspicion 상승 확인

### Unity 용어/개념 정리
- **Cinemachine**: Unity 공식 카메라 시스템(부드러운 추적, 블렌딩)
- **Virtual Camera**: 실제 카메라가 아닌 설정 프로파일, Brain이 실시간 전환
- **Body/Aim**: 카메라 위치/회전 알고리즘

### DoD
- [ ] Cinemachine Virtual Camera 추가
- [ ] Play 시 플레이어 추적 카메라 작동
- [ ] NPC 시야 범위 튜닝 후 앞/뒤 차이 확인

---

## Day 10 — 플레이 영상 캡처 및 회고 (30–50분)

### 목표
지금까지 구현한 흐름을 영상으로 기록하고, 체감 난이도를 메모해 로드맵을 업데이트한다.

### 단계별 작업

#### 10-1. 플레이 영상 캡처 (15–20분)
1. Windows: Xbox Game Bar(Win+G), Mac: QuickTime Player 화면 녹화
2. Unity Play 후 아래 흐름 시연:
   - 플레이어 이동(WASD)
   - 단서 3회 접촉 → 노트 UI 확정 표시
   - V 키로 위반 → G 값 상승 확인
3. 30–60초 분량 저장

#### 10-2. 체감 메모 작성 (10–15분)
1. 프로젝트 루트에 `PLAYTEST_NOTES.md` 생성(선택) 또는 메모장 사용
2. 아래 항목 기록:
   - 단서 발견 난이도(쉬움/중간/어려움)
   - UI 가독성(TMP 전환 후 체감)
   - NPC 목격 범위 적절성
   - 개선 희망 사항 3가지

#### 10-3. 로드맵 체크박스 갱신 (5–10분)
1. `game/docs/Design/VerticalSliceRoadmap.md` 열기
2. 완료한 마일스톤(M0-1~M0-2, M1-1~M1-2) 체크 또는 메모 추가
3. Commit 준비

### DoD
- [ ] 플레이 영상 1개 저장
- [ ] 체감 메모 3줄 이상 작성
- [ ] VS 로드맵 문서에 진행 현황 기록

---

## 통합 문제 해결 가이드

### Inspector/참조 문제
- **NullReferenceException**: 대부분 Inspector 필드가 `None`인 경우
  - 해결: Hierarchy에서 오브젝트를 필드로 드래그&드롭
  - 타입 불일치 시: 오브젝트의 컴포넌트를 드래그(오브젝트 자체 X)
- **필드가 Inspector에 안 보임**: `[SerializeField]` 확인, private 필드는 이게 필요
- **드래그가 안 됨**: 타입 불일치(예: GameObject vs Transform vs Component)

### 씬/Play 문제
- **Play 시 변경사항 사라짐**: Play 중 수정은 Stop 후 초기화됨 → Stop 후 재설정
- **씬 저장 안 됨**: Ctrl+S 또는 File > Save, 별표(*) 표시 확인
- **Hierarchy 오브젝트 안 보임**: Scene 뷰에서 더블클릭해 프레임 맞추기

### 코드/컴파일 문제
- **CS0246 에러**: using 문 누락, namespace 확인
- **CS0029 타입 에러**: `null` vs `default`, List vs Array 차이
- **무한 로딩**: 스크립트 구문 에러(중괄호 짝), Unity 재시작

### 트리거/충돌 문제
- **OnTriggerEnter 안 불림**:
  1. `Is Trigger` 체크 확인
  2. 한쪽에 Rigidbody 필요(Player 또는 Clue)
  3. 태그 철자 확인(`CompareTag("Player")`)

### UI 문제
- **UI 안 보임**: Canvas Render Mode = Screen Space - Overlay, EventSystem 존재 확인
- **UI 위치 이상**: Anchor 설정, Rect Transform Pos 확인
- **TMP 텍스트 깨짐**: Essential Resources 임포트 확인

---

## Day 11 이후 확장 아이디어 (선택)

### 단기(1–2일)
- `GameSession` 추가 및 타이머/종료 조건 연결
- `DreamRuleSet`에서 시드 기반 랜덤 3개 선택 로직
- 단서 트리거를 시각화(Gizmos, 아이콘)

### 중기(3–5일)
- `violation[]` 키와 실제 인터랙션 매핑(문 2회 밀기 구현)
- LLM 폴백 대화 스크립트 확장(`FallbackDialogueProvider`)
- 디렉터가 단서 스포너를 실제로 활성화

### 장기(1–2주)
- ProBuilder로 간단 레벨(카페 내부) 블록아웃
- NavMesh로 NPC 순찰 경로 설정
- Addressables로 씬/에셋 번들 분리

---

## 학습 리소스 (추천)

### Unity 공식
- Unity Learn: [learn.unity.com](https://learn.unity.com) → Essentials 코스
- Manual: [docs.unity3d.com](https://docs.unity3d.com)
- Scripting Reference: API 검색 시 필수

### C# 기초
- Microsoft Learn C#: [learn.microsoft.com/dotnet/csharp](https://learn.microsoft.com/ko-kr/dotnet/csharp/)
- Unity C# 차이점: MonoBehaviour 라이프사이클(Awake/Start/Update)

### 커뮤니티
- Unity Forum: [forum.unity.com](https://forum.unity.com)
- Stack Overflow: `[unity3d]` 태그
- 프로젝트 내 문서: `docs/Contrib/UnityProjectConventions.md`

---

## 체크리스트 전체 (10일 완료 확인)

- [ ] Day 0-1: Unity 설치 및 프로젝트 열기
- [ ] Day 0-2: 씬 탐색 및 Play 테스트
- [ ] Day 0-3: 문서 숙지
- [ ] Day 1: 플레이어 이동 + 디버그 G 라벨
- [ ] Day 2: 지식 노트 UI 배선
- [ ] Day 3: 단서 3회 확정 루프
- [ ] Day 4: 규칙 SO 1개 작성
- [ ] Day 5: 위반 시뮬레이션 + 의심도 상승
- [ ] Day 6: 디렉터 타이머 로그 확인
- [ ] Day 7: 규칙 3개 + DreamRuleSet
- [ ] Day 8: TMP 전환 및 UI 정리
- [ ] Day 9: Cinemachine 카메라 + NPC 튜닝
- [ ] Day 10: 플레이 영상 + 회고 메모

---

> **본 문서는 가안입니다.** 진행 중 막히는 부분이 있으면 순서를 조정하거나, 문제 해결 가이드를 먼저 참조하세요. 매일 DoD 달성이 목표이며, 완벽한 코드보다 작동하는 루프가 우선입니다.
