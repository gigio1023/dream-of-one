# Dream of One – 수직 슬라이스 설계서 v0.1

> 참고: 2025-11-20 이후의 최신 계획은 `docs/slice-plan-single-source.md`를 기준으로 유지한다. 본 문서는 배경 정보와 의사결정 흔적을 보존하고, 실 구현·일정·데이터 계약은 단일 소스 문서를 따른다.
> 문서 분류: Context(설계 배경 기록).

## 0. 문서 역할
- 1인 Unity 입문자가 프로젝트 전반의 맥락과 의도를 빠르게 회상하기 위한 요약이다.
- 세부 시스템 사양, 주차별 계획, 수치 파라미터는 모두 `docs/slice-plan-single-source.md`에서 유지한다.
- 본문은 “왜 편의점 구역 + 의심→신고→판정 루프인지”만 설명하며, 실행 순서는 단일 소스를 따른다.

## 1. 단일 소스 대비 델타 정리
- 데이터 계약: EventRecord, SuspicionComponent, ReportEnvelope, GlobalSuspicion, UI 토스트 규칙은 단일 소스 섹션 6을 그대로 따른다. 기존 `timestamp`, `note` 중심 설명과 `sᵢ ≥ 40` 임계값 서술을 제거했다.
- 의심/신고 파라미터: R4/R5/R10 가중치(30/20/15), `reportThreshold=50`, `reportCooldown=20s`, `severity ≥ 2` 토스트 규칙만 유지한다. 이전 문서에서 언급한 감쇠·스레딩 표기는 단일 소스 값으로 대체했다.
- UI·LLM: 로그 5줄, G 바 Lerp, 토스트 3초, 심문 텍스트, LLMClient HTTP 계약은 단일 소스 섹션 5·10을 우선한다. 여기서는 “텍스트 기반 표현 우선”이라는 의도만 남겼다.
- 범위·제외: 단일 씬, NPC 4명, 규칙 3개, Artifact·CI 배제 원칙만 남겼다. 나머지 상세 항목(예: Behavior Tree, Addressables)은 제외 목록에 중복 기록하지 않는다.
- 일정/검증: 8주 타임라인, 플레이 영상·JSONL 기록, devlog 작성 등 실행 항목은 단일 소스 섹션 8·12를 따른다. 본 파일에서는 “2개월 안에 루프 1회”라는 목표만 유지한다.

## 2. 유지할 배경 정보
- 무대: 편의점 앞 거리, 벤치, 골목 입구. 플레이어는 규범을 모르는 상태로 시작한다.
- NPC: Clerk(C1_Yuri), Elder(CZ1), Tourist(CZ2), Police(P1). Clerk·Elder·Tourist는 각자의 루틴과 규범 감시 역할을 갖고, 의심 임계에 도달하면 누구든 신고를 개시할 수 있다. Police는 신고가 접수되면 심문/판정을 담당한다.
- 규칙: R4 새치기, R5 벤치 양보, R10 촬영 제한. 플레이어가 위반하면 의심이 오르고 신고 루프가 촉발된다.

## 3. 참고 링크
- 최신 사양: `docs/slice-plan-single-source.md`
- 구현 체크리스트: `docs/slice-plan-impl.md` 요약 섹션
- 착수 전 의도: `docs/pre-timeline-architecture.md`

## 4. 기록 보존
- 2024년 버전 전문은 Git history에서 확인할 수 있으며, 최신 계획과 충돌하지 않도록 다시 검증해야 한다.
