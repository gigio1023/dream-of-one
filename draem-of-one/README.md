# Dream of One — Unity 프로젝트 안내

Unity 6000.2.10f1, URP 17.2. 게임 루프(규범 위반→의심→신고→심문→판정) 구현과 씬 배선에 필요한 최소 정보만 적는다.

## 빠른 실행
1. Unity Hub > Add > `draem-of-one/`.
2. `Assets/Scenes/Prototype.unity` 열기.
3. Play.

## 임시 조작
- 이동: WASD / 화살표
- 상호작용: 단서 트리거 근접

## 작업 포인트
- 씬: Prototype에서 PlayerController, Suspicion/Report, UI HUD 연결 상태 확인 후 수정.
- 패키지: Cinemachine, Input System, AI Navigation 사용(버전은 `Packages/manifest.json` 참조).
- 폴더: `Assets/Scripts/Core|NPC|UI|LLM`, `Assets/Prefabs/Environment|NPC`, `Assets/UI` 중심.

## 참고 문서
- 단일 소스(범위·데이터·주차 계획): [`../docs/slice-plan-single-source.md`](../docs/slice-plan-single-source.md)
- 착수 컨텍스트 요약: [`../docs/pre-timeline-architecture.md`](../docs/pre-timeline-architecture.md)
- 10일 가이드: [`../BEGINNER_DEV_PLAN.md`](../BEGINNER_DEV_PLAN.md)
