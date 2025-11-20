# Dream of One

- AI가 지배하는 꿈 도시에서 규범을 학습하고 외부인 판정을 피하는 3인칭 사회 추리 게임.
- 초기 기획은 [`docs/whole-plan.md`](docs/whole-plan.md)에 정의된 대규모 지속 세션·12명 NPC·Artifact 시스템까지 포함했으나, 범위가 방대해 1인 개발이 어려웠다.
- 현재는 본래 기획을 축소해 8주 안에 수직 슬라이스를 완성하는 것이 목표이며, 모든 세부 기준은 [`docs/slice-plan-single-source.md`](docs/slice-plan-single-source.md)에 통합되어 있다.

## 배경
- 원안: 70m×70m 블록에서 스튜디오·지구대·상인회·공원관리 등 조직이 각자 목표(예: RC 승인, 경범 처리, 라벨 유지, 좌석 관리)를 추구하며 Artifact를 산출한다. 플레이어는 이 작은 사회의 규범을 읽고 외부인 티 없이 섞여야 한다.
- 축소판: 편의점 앞 거리 한 씬에서 규범 위반 → 의심 → 신고 → 경찰 판정을 1회 자연스럽게 재현한다.
- 축소 전환 이유: Unity 입문자 1인이 빠른 반복 사이클을 돌며 구현 감각을 얻기 위해서다. 이후 필요하면 단일 소스를 기준으로 범위를 확장한다.

## 게임 개요
- 무대: 편의점 앞 거리, 벤치, 골목 입구. 플레이어는 규범을 모른 채 시작한다.
- 주역 NPC: Clerk, Elder, Tourist, Police. Elder는 양보 이벤트, Police는 심문·판정 담당이며 Clerk·Elder·Tourist 모두 의심 임계 도달 시 신고를 개시할 수 있다.
- 규칙: R4 새치기, R5 벤치 양보, R10 촬영 제한. 위반 시 개인 의심도 `sᵢ`가 상승하고 신고가 촉발된다.
- 표현: 모든 결과는 World Event Log + Semantic Shaper를 통해 1–2줄 텍스트와 UI 토스트로 노출된다.

## 현재 목표
- 단일 씬 `Main`에서 PlayerController, Zone, WEL, Suspicion, Report, Police, UI 시스템을 연결해 루프 1회를 안정적으로 완주한다.
- GlobalSuspicionSystem이 전역 G를 계산하고 UI가 G 바, 이벤트 로그 5줄, 토스트, 심문 텍스트를 동시에 갱신한다.
- LLM 연동은 선택이며, HTTP 스텁 + 템플릿 폴백이 기본이다.

## 진행 전략
- 주0: Unity 3D Core 프로젝트 생성, PlayerController·Cinemachine·NavMesh 튜토리얼 학습, Input System 샘플 구성.
- 주1~2: 씬 그레이박스, 플레이어/카메라 고정, NPC 캡슐 + NavMesh 순찰.
- 주3~4: Zone 상호작용, WorldEventLog → SemanticShaper → UI 로그 파이프 완성.
- 주5~6: SuspicionComponent, ReportManager, PoliceController 연결 후 루프 1회 검증.
- 주7~8: UI 다듬기, 토스트/LLM 템플릿, 안정화 및 devlog·영상 기록.

## 문서 안내
- [`docs/slice-plan-single-source.md`](docs/slice-plan-single-source.md): 단일 소스. 범위, 데이터 계약, 주차 계획, 테스트 기준.
- [`docs/pre-timeline-architecture.md`](docs/pre-timeline-architecture.md): 착수 전 컴포넌트 책임과 선행 체크리스트.
- [`docs/slice-plan.md`](docs/slice-plan.md): 과거 설계 배경, 의사결정 흔적.
- [`docs/slice-plan-impl.md`](docs/slice-plan-impl.md): 구현 시 참고할 팁과 주의사항.
- [`docs/whole-plan.md`](docs/whole-plan.md): 축소 전 원본 비전 문서(조직별 목표·산출물·Artifact 체계 포함). 레거시 세부 자료는 Git history에서만 확인할 수 있다.

## 착수 절차
1. [`docs/slice-plan-single-source.md`](docs/slice-plan-single-source.md) 섹션 7의 준비 체크리스트로 Unity LTS 설치, Input System 세팅, 씬 구조를 맞춘다.
2. 주0 학습 루틴을 실행하면서 플레이어 이동 GIF와 학습 노트를 기록해 `docs/devlog/`에 보관한다.
3. 주차별 작업과 검증 루틴은 단일 소스 문서 섹션 8·12를 따른다. 미완료 항목은 devlog에서 체크리스트로 이월한다.
4. LLM 연동이 필요하면 HTTP 스텁과 템플릿 폴백을 먼저 구현하고, 로컬 모델 전환은 루프 완주 후 검토한다.

## 참고
- EventRecord, SuspicionComponent, ReportEnvelope 스펙은 단일 소스 섹션 6 표를 따른다. 다른 문서에서 값이 다르면 단일 소스 기준으로 수정한다.
- 캡처(씬 스크린샷, 플레이 GIF, EventLog JSONL 샘플)는 devlog에 누적해 진행 상황과 품질을 추적한다.