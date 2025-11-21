# Dream of One – 수직 슬라이스 단일 소스 v1.0

## 0. 개요
- 목적: `whole-plan.md`의 대규모 비전을 유지하되, 1인·8주·Unity 입문 조건에서 실행 가능한 최소 루프를 정의한다.
- 적용 범위: `docs/slice-plan.md`, `docs/slice-plan-impl.md`, `docs/pre-timeline-architecture.md` 내용을 통합한 단일 레퍼런스.
- 출력 목표: 편의점 구역에서 **규범 위반 → 의심 → 신고 → 경찰 심문 → 판정 텍스트** 흐름이 1회 이상 자연스럽게 실행되는 v0.1 빌드.
- 기존 레거시 문서(`slice-plan.md`, `slice-plan-impl.md`, `pre-timeline-architecture.md`)는 삭제되었으며, 필요 시 Git history에서만 참고한다. 본 문서는 단일 소스 레퍼런스로 새로 작성되었다.
- 단일 소스 원칙: 실행 기준·수치·검증 루틴은 본 문서만 따른다. `pre-timeline-architecture.md`·`slice-plan.md`·`slice-plan-impl.md`는 컨텍스트, `whole-plan.md`는 레거시 비전으로 분류하며, 값이 다를 경우 반드시 이 문서 기준으로 덮어쓴다.
- 문서 색인은 `docs/README.md`에 정리하되, 신규 내용은 항상 이 파일을 먼저 업데이트한 뒤 다른 문서에 요약한다.

## 1. 전제와 제약
- 인원: 1명, Python 백엔드/DevOps 경력 3년, Unity·C# 초보.
- 일정: 8주(주 5일, 1일 4–5시간 가정). 주차마다 학습 시간을 명시해 과부하를 피한다.
- 플랫폼: Unity 2022/2023 LTS 3D Core, PC Standalone 빌드.
- 장비: 단일 개발 PC, 로컬 Git. CI·커스텀 툴은 선택 사항으로 후순위 배치.

## 2. 목표 루프와 성공 정의
- 플레이어가 Queue/Seat/Photo Zone에서 규범을 위반한다.
- 근처 NPC의 `sᵢ`가 증가하고 임계 도달 시 신고한다.
- ReportManager가 경찰 심문 조건을 충족시키면 경찰이 이동해 심문한다.
- 판정 로직이 EventRecord와 sᵢ, G를 사용해 외부인/의심/시민을 결정한다.
- UI(HUD+로그+토스트)가 전 과정을 1–2줄 텍스트로 보여준다.

## 3. 범위(필수 기능)
- 단일 씬 `Main`.
- NPC 4명: Clerk, Elder, Tourist, Police.
- 규칙 3개: R4(새치기), R5(벤치 양보), R10(촬영 제한).
- World Event Log(WEL) + Semantic Shaper + UI 로그 5줄.
- SuspicionComponent, GlobalSuspicionSystem(G 바), ReportManager, PoliceController.
- LLM 연동은 선택. 템플릿 폴백 필수.

## 4. 제외(8주 이후로 이관)
- `whole-plan.md`에 있는 12명 NPC, Spatial Blackboard, 지속 세션, Generator/Referee 이중화.
- Artifact 시스템, RC/승인 노트, 정책 팩, SignalBus DI, Addressables.
- 커스텀 인스펙터, 자동 CI, NavMesh 런타임 리빌드, Behavior Graph.

## 5. 시스템 책임 정리
- Core
  - PlayerController: WASD 이동, 상호작용 키(E), 촬영 키(F), 관련 이벤트 기록.
  - FollowCamera: Cinemachine 가이드 또는 간단한 추적 스크립트.
  - Zone: Queue/Seat/Photo 트리거 감지, 현재 Zone 상태 제공.
  - WorldEventLog: Append-only List, 최대 512건, 콘솔 로그 옵션.
  - SemanticShaper: EventRecord→한국어 1줄 텍스트.
  - EventLogPresenter: 신규 이벤트 감지 후 UIManager에 텍스트 큐 전달.
  - GlobalSuspicionSystem: 등록된 SuspicionComponent 평균으로 G 계산, UIManager에 브로드캐스트.
  - ReportManager: 신고 enqueue, `ShouldTriggerInterrogation()`에서 G·신고 횟수 검사.
- NPC
  - NPCBase: NavMeshAgent 제어, Idle/Walk/Queue/Seat 공통 상태.
  - SuspicionComponent: sᵢ 업데이트, decay, 신고 쿨다운, 이벤트 기록.
  - Elder/Tourist/Clerk/Police: 전용 상태·루틴, 경찰은 Patrol→Move→Interrogate→Cooldown.
- UI
  - UIManager: G 바(Lerp 0.25s), 로그 5줄, 토스트(3s), 심문 텍스트.
- Support
  - LLMClient(선택): HTTP 요청/폴백. 실패 시 템플릿 1줄 반환.
  - Dev tooling은 텍스트 로그 덤프 버튼 정도로 제한.

## 6. 데이터 계약(통합 버전)
### 6.1 EventRecord
| 필드 | 타입/범위 | 설명 |
| --- | --- | --- |
| `id` | ULID | Append 시 생성, JSONL 덤프 키 |
| `stamp` | float(초) | `Time.time` 기반, UI 그대로 사용 |
| `eventType` | enum | `EnteredZone`, `ExitedZone`, `ViolationDetected`, `SuspicionUpdated`, `ReportFiled`, `InterrogationStarted`, `VerdictGiven` |
| `category` | enum | `Movement`, `Zone`, `Rule`, `Suspicion`, `Report`, `Verdict` |
| `actorId` / `actorRole` | UUID / `Player\|NPC` | 이벤트 주체, LLM 프롬프트에도 전달 |
| `targetId` | UUID? | 신고/판정 대상, 없으면 `None` |
| `zoneId` | string | Queue, Seat, Photo, 또는 `None` |
| `payload` | dict | 최대 256바이트, 표준 키 `ruleId`, `delta`, `note` |
| `severity` | int 0–3 | 2 이상이면 토스트 즉시 표시 |

### 6.2 SuspicionComponent
| 항목 | 값 | 설명 |
| --- | --- | --- |
| `si` | 0–100 | 규칙별 weight(새치기 30, 벤치 20, 촬영 15) × proximityFactor로 증가 |
| `decayPerSec` | 0.5 | 이벤트 없을 때 `si = max(0, si - decayPerSec * dt)` |
| `reportThreshold` | 50 | `si ≥ 50` && `canReport` 시 ReportManager 호출 |
| `reportCooldownSec` | 20 | 신고 후 재신고까지 대기 |
| `lastEventId` | ULID | 중복 신고 방지 |
| `reported` | bool | true이면 `ResetAfterInterrogation`까지 신고 금지 |

### 6.3 ReportEnvelope
| 항목 | 타입/범위 | 설명 |
| --- | --- | --- |
| `reportId` | ULID | 신고 묶음 식별자 |
| `reporterIds` | List<UUID> | 신고에 참여한 NPC id |
| `attachedEvents` | List<EventRecord.id> | 최대 3건, 심문 근거 |
| `reason` | enum | `RepeatedRuleBreak`, `HighGlobalG`, `Scripted` |
| `resolved` | bool | 심문 종료 시 true |

### 6.4 GlobalSuspicion·UI 규칙
| 항목 | 값 | 설명 |
| --- | --- | --- |
| `G` | `clamp(mean(si)/100, 0, 1)` | 프레임당 계산, UI는 `Mathf.Lerp`로 반영 |
| UI 토스트 | `severity ≥ 2` 또는 `VerdictGiven` | 1–2줄, 3초 유지, 심문 텍스트와 동기화 |

## 7. 개발 준비 체크리스트(시작 전)
- Unity
  - LTS 버전 설치, New Input System 활성화.
  - `Main` 씬 생성, `Scenes`, `Scripts/Core|NPC|UI|LLM`, `Prefabs/Environment|NPC`, `UI` 폴더 구조 준비.
- 버전 관리
  - Git 초기화, `.gitignore`에 `Library/`, `Logs/`, `Temp/` 추가.
- 학습 리소스(각 2–3시간)
  - CharacterController 혹은 Rigidbody 이동 튜토리얼.
  - Cinemachine 기본 Follow 설정.
  - NavMesh Bake와 NavMeshAgent 기초.
  - UI(Canvas + TextMeshPro) 기초.
- 아트/리소스
  - Probuilder 혹은 Primitive로 지형 그레이박스.
  - NPC 캡슐 Prefab 4종, Zone Trigger Prefab 3종.
- 검증
  - 기본 이동 + 카메라 + NavMesh 플레이 모드 테스트 녹화 1회.

## 8. 주차별 계획(학습 포함)
- 주0 (사전 학습 2~3일)
  - Unity 3D Core 프로젝트 생성, Git 초기화, `.gitignore` 정리.
  - PlayerController 튜토리얼, Cinemachine Follow/FreeLook, NavMesh Bake 기초 강좌를 순서대로 학습한다.
  - Input System Action Asset 샘플을 만들어 WASD, 마우스 감도, 상호작용 키를 바인딩해둔다.
  - 산출물: 플레이어 캡슐 이동 GIF 1개, 학습 노트 5줄.
- 주1
  - 주0에서 만든 샘플을 `Main` 씬으로 옮기고 PlayerController, FollowCamera, 기본 HUD placeholder를 고정한다.
  - 학습 블록(입력, Cinemachine)은 하루 1~2시간 복습으로 끝낸 뒤 남은 시간에 코드 품질을 다듬는다.
- 주2
  - 편의점 지형, NavMesh Bake, NPC 프리팹 배치, 단순 순찰.
  - 학습: NavMeshAgent 튜토리얼, Gizmo 디버깅.
- 주3
  - Zone 트리거, Queue/Seat/Photo 상호작용, ViolationDetected 이벤트 파이프.
  - 학습: Collider Trigger, ScriptableObject 기초.
- 주4
  - WEL + SemanticShaper + EventLogPresenter, UI 로그 5줄.
  - 테스트: 위반 이벤트 → 로그 문장 표시.
- 주5
  - SuspicionComponent, Global G 바, ReportManager 신고 큐, sᵢ UI 디버그 텍스트.
- 주6
  - PoliceController 상태 머신, InterrogationStarted/VerdictGiven 이벤트, 판정 UI.
  - 루프 1회 완료 여부 확인, 플레이 영상 기록.
- 주7
  - UI 정리, 토스트, 심문 문구 템플릿, 선택적으로 LLMClient HTTP 스텁.
  - 안정화: 파라미터 튜닝, 신고 쿨다운 조정.
- 주8
  - 버그 수정, 성능 체크(Profiler 10분), README/빌드 가이드 작성, `v0.1-slice` 태그 후보.

## 9. 구현 순서(실행 지침)
1. PlayerController, FollowCamera, Input 바인딩 고정.
2. 지형+NavMesh Bake → NPC에 NavMeshAgent 부착.
3. Zone 스크립트와 상호작용(E/F) 연결.
4. WorldEventLog → SemanticShaper → UI 로그 연동.
5. SuspicionComponent + GlobalSuspicionSystem + HUD.
6. ReportManager 조건 및 토스트 표시.
7. PoliceController 상태 머신 + 판정 로직.
8. 선택: LLMClient 연동 및 템플릿 폴백.

## 10. LLM·UI·성능·테스트
- LLM
  - HTTP POST `{role, situation_summary, tone, constraints}` → `{utterance, fallbackUsed}`.
  - 타임아웃 1.5s, 실패 시 템플릿.
- UI
  - 이벤트 로그는 프레임당 최대 2건만 방출, 0.5초 큐 딜레이 사용.
  - G 바는 `Mathf.Lerp`로 완화, 토스트는 80자 제한.
- 성능
  - Agent 4명, 60FPS 목표. `WorldEventLog` 512건 순환, GC.Alloc 0B/프레임 지향.
  - Profiler 캡처 10분, NavMesh 런타임 재베이크 금지.
- 테스트
  - PlayMode 테스트: EventRecord append/consume, Suspicion 임계, ReportManager 조건.
  - 수동 체크: 10분 플레이 영상 기록, 로그 텍스트와 이벤트 순서 일치 여부 확인.

## 11. 완료 기준(v0.1)
- 단일 세션(5–10분)에서 위반→의심→신고→심문→판정 루프 1회 이상 성공.
- UI: G 바, 로그 5줄, 심문 텍스트, 토스트 정상 표시.
- 로그: EventRecord에 Violation/Suspicion/Report/Verdict가 순서대로 남는다.
- LLM 사용 시 최소 1회 호출, 실패 시 템플릿 폴백 확인.
- 안정성: 10분 플레이 동안 예외·크래시 없음.

## 12. 검증 루틴과 후속 기록
- 주차 종료 시
  - Git 태그 또는 브랜치 스냅샷, 간단한 플레이 GIF/영상 첨부.
  - `docs/devlog/YYYY-MM-DD.md`(신규) 혹은 README에 진행 상황 5줄 요약.
- 루프 완성 후
  - EventRecord JSONL 1분 샘플, Suspicion 그래프 스크린샷, UI 캡처를 문서에 첨부.
- 차주 계획 수립 전
  - 미완료 항목을 체크리스트로 이월하고, 학습 시간이 필요하면 별도 블록으로 예약.


