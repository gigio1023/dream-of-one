# Dream of One — Vertical Slice Build Guide

게임 구현에 바로 필요한 정보만 정리했다. 기획·배경 설명은 단일 소스 문서에서 확인한다.

## 현재 목표
- 8주 안에 편의점 거리 씬에서 “규범 위반 → 의심 → 신고 → 심문 → 판정” 루프 1회 완주.
- 새 Input System, Cinemachine, NavMesh, Suspicion/Report/Police 루프를 단계적으로 연결.
- 주차별 할 일과 난이도는 [`docs/devlog/README.md`](docs/devlog/README.md)을 따른다.

## 빠른 실행
1. Unity Hub에서 [`draem-of-one`](draem-of-one/) 추가 후 열기.
2. 씬: `Assets/Scenes/Prototype.unity` 혹은 `Main.unity`(주차 진행도에 따라 선택).
3. Play → WASD 이동(새 Input System), 마우스 카메라(필요 시 PlayerInput 연결).

## 작업 포커스(초반)
- Week 0~1: 새 Input System 이동, Cinemachine Follow, `InputActions.inputactions` 작성 및 PlayerInput 이벤트 고정. 세부 순서는 [`docs/devlog/week0.md`](docs/devlog/week0.md)와 [`docs/devlog/week1.md`](docs/devlog/week1.md) 참고.
- Week 2 이후: NavMesh Bake + NPC 순찰 → Zone/Violation 이벤트 → WEL/로그 → Suspicion/Report/Police 순서로 적층(주차별 문서: [`docs/devlog/README.md`](docs/devlog/README.md) 인덱스 참고).
- 바닥 크기 70m×70m 이상은 Plane 하나보다 100×100 Mesh Plane 또는 Terrain을 권장.

## 문서 바로가기
- 단일 소스(범위/데이터/주차 계획): [`docs/slice-plan-single-source.md`](docs/slice-plan-single-source.md)
- 착수 컨텍스트 요약: [`docs/pre-timeline-architecture.md`](docs/pre-timeline-architecture.md)
- 난이도 보정 주차 계획: [`docs/devlog/README.md`](docs/devlog/README.md)

## 폴더/패키지
- Unity 프로젝트: [`draem-of-one/`](draem-of-one/)
  - 주요 씬: `Assets/Scenes/Prototype.unity`, `Assets/Scenes/Main.unity`
  - 입력 에셋: `Assets/Settings/InputActions.inputactions`
- 필수 패키지: Input System 1.14, Cinemachine 3.x, AI Navigation 2.x (버전은 `Packages/manifest.json` 확인)

## 기록
- 진행 로그·캡처는 `docs/devlog/`에 추가하고, 주차 종료 시 GIF/학습 메모를 남긴다.
