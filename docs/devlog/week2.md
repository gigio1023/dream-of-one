# Week 2 — 입력/카메라/코드 안정화 (추천 5~7시간)

목표: 이동/카메라를 끊김 없이 다듬고 입력 레퍼런스를 정리한다. Inspector에서 바로 튜닝할 수 있게 노출한다.

## 해야 할 일
- 이동 코드 리팩터
  - 중력 상수, 이동 속도, 회전 속도를 `SerializeField`로 노출.
  - 대각선 이동 시 속도가 빨라지지 않는지 확인(`Vector3.ClampMagnitude` 고려).
  - 지형 스케일에 맞춰 중력 보정(캐릭터가 뜨지 않는지 확인).
  - 예시: `Vector3 move = Vector3.ClampMagnitude(new Vector3(moveInput.x, 0f, moveInput.y), 1f);`
- 카메라 튠
  - VCam Body `Framing Transposer` → `Follow Offset`, `Soft Zone`, `Damping` 값을 바꿔보며 흔들림/튀는 느낌을 제거.
  - 필요 시 `Cinemachine Collider` 확장 추가해 지형 통과 방지.
- 입력/레퍼런스 정리
  - Player Prefab에서 `InputActionReference` 할당이 유지되는지 확인.
  - Scene에 배치된 Player와 Prefab 인스턴스의 차이를 `Overrides` 패널에서 최소화.
- HUD 유지
  - Week1에서 만든 HUD 틀을 Prefab 또는 씬 오브젝트로 정리해두고, Canvas 스케일 모드 확인.
  - TextMeshPro 글꼴 크기/정렬을 화면 비율에 맞게 조정.

## DoD
- 이동/카메라에 눈에 띄는 끊김 없이 작동하고, 주요 파라미터를 Inspector에서 조정 가능.
- `InputActions.inputactions` 참조가 Prefab/씬에서 깨지지 않음(Missing 없음).
- HUD 틀이 유지되고 플레이 모드 진입 시 에러 없음.
