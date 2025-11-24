# Week 1 — 메인 씬 이식 + PlayerInput 고정 (추천 6~8시간)

목표: 주0 샘플을 `Main` 씬으로 옮기고 PlayerInput UnityEvent 라우팅을 고정한다. 70m 이상 바닥을 커스텀 Mesh/Terrain으로 교체하고 HUD 자리만 잡는다. Prefab 적용/참조 끊김 방지까지 단계별로 진행한다.

## 해야 할 일
- 씬 이식
  - `Assets/Scenes/Main.unity`가 없다면 생성 후 저장.
  - 주0에서 만든 Player 오브젝트를 Prefab으로 저장(`Assets/Prefabs/Player/Player.prefab`) → `Main` 씬에 드래그 배치.
  - Cinemachine Virtual Camera를 Prefab 또는 씬 오브젝트로 배치하고 Follow/LookAt에 Player 지정.
- 입력 고정 (UnityEvent 경로)
  - Player에 `Player Input` 추가(또는 기존 컴포넌트 유지) → Actions에 `InputActions.inputactions`.
  - Behavior `Invoke Unity Events` → `Events > Player > OnMove`에 `PlayerController.OnMove(InputAction.CallbackContext)` 연결, 필요하면 `OnLook` 메서드도 추가.
  - 플레이 모드에서 인스펙터 경고나 Missing Reference가 없는지 확인.
- 바닥 교체
  - 70m×70m를 덮는 100×100 Mesh Plane(서브디바이드) 또는 Unity Terrain 생성.
  - Player와 카메라가 떠 있지 않도록 Y 좌표 정렬, 콜라이더 확인.
- HUD 자리잡기
  - Canvas 생성(Scale With Screen Size) → TextMeshPro Import → 빈 텍스트 박스 2개(G 바, 로그 리스트 자리)만 배치.
  - 정리용 빈 오브젝트 `UIRoot`에 묶어두기.
- Prefab 참조 체크
  - Player Prefab을 `Overrides > Apply All`로 저장 후, 씬 인스턴스에서 파란색(Prefab 연결) 상태인지 확인.
  - Scene/Game 뷰에서 이동/카메라가 정상인지 재확인.

## DoD
- `Main` 씬에서 UnityEvent 경로로 이동/카메라 동작.
- 70m 이상 커버하는 바닥 교체 완료(콜라이더 포함).
- HUD 틀(빈 Text 영역)이 보이고 플레이 모드에서 에러 없이 진입.
