# Week 3 — NavMesh 첫 성공 (추천 4~6시간)

목표: NavMesh를 베이크하고 단일 NPC가 목표 지점까지 이동하도록 만든다. 에디터 UI 차이로 막히기 쉬운 지점을 명시했다.

## 해야 할 일
- Navigation 창 열기: Unity 6 기준 `Window > AI > Navigation` (또는 `AI Navigation` 패키지 설치가 필요할 수 있음).
- 지형 지정: 바닥 Mesh/Terrain 선택 → Inspector 상단 `Static` 체크 → `Navigation Static`이 켜졌는지 확인.
- 베이크: Navigation 창의 `Bake` 탭에서 `Bake` 버튼 클릭 → 씬에 파란 NavMesh가 보이는지 확인. 보이지 않으면 지형이 너무 얇거나 Scale이 잘못된 것일 수 있다. Agent Radius/Height 값이 Player나 NPC 캡슐보다 큰지 확인.
- 에이전트 테스트:
  - Capsule 생성 → `NavMeshAgent` 추가.
  - 간단 스크립트로 `SetDestination(new Vector3(5f, 0f, 5f));` 호출.
  - Play → 이동 여부 확인. 움직이지 않으면 “Agent Radius/Height vs NavMesh” 경고나 `isOnNavMesh` 로그를 찍어본다.
- 파라미터 조정: `Speed`, `Angular Speed`, `Acceleration`, `Stopping Distance`를 현재 지형 스케일(70m)과 어울리게 조정.
- 체크리스트(안 움직일 때)
  - Agent가 NavMesh 위에 배치됐는지(`isOnNavMesh`) Debug.Log로 확인.
  - Destination이 NavMesh 위인지 `NavMesh.SamplePosition`으로 검증.
  - Bake 시 지형이 Static인지, NavMesh 영역이 Player 발밑까지 연결되는지 확인.

## DoD
- NavMesh가 씬을 덮고, NPC 1명이 목표 지점까지 이동한다.
- 이동 중 멈춤 없이 도달(경미한 미끄러짐은 허용).
