# Dream of One – 수직 슬라이스 구현 계획서 v0.1

> 참고: 실행 가능한 최신 계획과 체크리스트는 `docs/slice-plan-single-source.md`에 통합되었다. 본 구현 계획서는 히스토리·추가 팁 용도로만 유지하며, 착수 시에는 단일 소스를 우선 확인한다.

## 0. 문서 역할
- 단일 소스 문서의 섹션 5~12를 실제 작업 단계로 옮길 때 참고하는 짧은 가이드다.
- Unity 초보 1인이 “어떤 순서로 무엇을 연결해야 하는가”를 복기하는 용도다.
- 상세 TODO, 일정, 데이터 계약은 모두 단일 소스 문서를 따른다.

## 1. 단일 소스 매핑
- 주차 계획: `slice-plan-single-source.md` 섹션 8의 주차별 목표를 그대로 따른다.
- 구현 순서: 섹션 9의 8단계를 따라야 하며, Player/Camera → Zone → WEL → Suspicion → Report → Police → UI 순서를 유지한다.
- 데이터 계약·테스트: 섹션 6·10·12를 그대로 참조한다. 본 파일에는 중복 수치를 남기지 않는다.
- 착수 전 준비: 섹션 7 체크리스트를 완료한 뒤에만 이 파일의 팁을 적용한다.

## 2. 실행 팁 요약
- 폴더 구조: `Assets/Scenes`, `Scripts/Core|NPC|UI|LLM`, `Prefabs/Environment|NPC`, `UI` 폴더만 유지한다. 세부 클래스 명은 단일 소스 섹션 5에 맞춘다.
- 씬 루트: `SystemsRoot`, `NPCRoot`, `ZonesRoot`, `UIRoot` 빈 오브젝트를 만들어 참조 정리를 쉽게 한다.
- NavMesh: Plane+Cube로 지형을 만든 뒤 1회 Bake, 런타임 재베이크는 금지한다.
- Zone 상호작용: Queue/Seat/Photo Zone은 Trigger Collider 하나와 `ZoneType` enum만으로 처리해 Rule 추가 시 복잡도를 줄인다.
- Suspicion 디버그: `SuspicionComponent`에 `si`, `cooldown`, `lastEventId`를 OnGUI 혹은 TMP Text로 표시해 튜닝 시간을 줄인다.
- LLMClient: HTTP 요청 실패 시 템플릿 문장을 반환하도록 기본 스텁을 유지하고, 7주차 이후에만 실제 서버를 연결한다.

## 3. 작업 주의사항
- Git: 주차별로 브랜치 혹은 태그를 남기고, EventRecord JSONL 샘플을 `docs/devlog` 아래에 저장한다.
- 테스트: 플레이 영상 1회, Suspicion/Report 로그 1회, UI 캡처 1회를 각 주차 종료 시 남긴다.
- 시간 배분: 학습 블록(입력, 카메라, NavMesh, UI)을 각 주차 초반 2~3시간 안에 끝내고 나머지를 구현에 쓴다.

## 4. 기록 보존
- 2024년 구현 체크리스트는 Git history에서 확인한다. 최신 단일 소스와 충돌하는 내용은 폐기한다.
