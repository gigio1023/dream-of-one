# Dream of One – 타임라인 착수 전 설계 요약

> 최신 수직 슬라이스 일정·데이터 계약은 `docs/slice-plan-single-source.md`에서 유지한다. 본 문서는 착수 전 맥락과 의도 요약을 제공하며, 실행 계획과 충돌 시 단일 소스를 우선한다.
> 문서 분류: Context Snapshot(의도·책임 정리 용도).

## 1. 목적
- 8주 수직 슬라이스를 시작하기 전에 확정된 구조와 의도를 문서화해 모든 작업자가 동일한 전제를 공유하도록 한다.
- 이 문서는 `docs/slice-plan-impl.md`의 주차별 계획을 실행하기 전에 반드시 읽어야 하는 “설계 컨텍스트 스냅샷”이다.

## 2. 설계 원칙
- 이벤트 우선: 모든 상호작용은 `WorldEventLog`를 거쳐 텍스트로 승격된다.
- 결정론적 코어: 의심, 신고, 판정은 규칙 기반으로만 동작하고 LLM은 문장 변주에만 관여한다.
- 느슨한 결합: UI, NPC, 판정 로직은 이벤트를 구독하거나 공유 시스템을 참조할 뿐 직접적인 상호 호출을 최소화한다.
- 반복 가능한 증분: 1–2주차에 이동/카메라/로그를 확보하고, 이후 각 주차마다 독립 모듈을 추가해도 기존 흐름을 깨지 않도록 한다.

## 3. 컴포넌트 책임
- Core
  - `PlayerController`: WASD 이동, 입력 이벤트를 WEL에 기록.
  - `FollowCamera`: 플레이어 추적, 카메라 셋업 시간을 줄이기 위한 기본 스크립트.
  - `Zone`: Queue/Seat/Photo 트리거, 진입·이탈을 이벤트로 기록.
  - `WorldEventLog`: 모든 EventRecord를 append-only 버퍼에 저장, 필요 시 콘솔 출력.
  - `SemanticShaper`: EventRecord를 1–2줄 한국어 텍스트로 변환.
  - `EventLogPresenter`: WEL을 모니터링하고 UI 로그 패널에 문장을 전달.
  - `GlobalSuspicionSystem`: 등록된 SuspicionComponent 평균으로 전역 G 계산 후 브로드캐스트.
  - `ReportManager`: 신고 큐 관리, 전역 G와 신고 횟수로 경찰 심문 조건 판단.
- NPC
  - `NPCBase`: NavMeshAgent 기반 공통 상태 머신.
  - `SuspicionComponent`: sᵢ 관리, 증가·감소·신고·이벤트 기록을 담당.
  - Elder/Tourist/Clerk/Police 컨트롤러: 각 캐릭터 동선과 특수 상호작용 정의, 경찰은 상태 머신으로 심문을 수행.
- UI
  - `UIManager`: 전역 G 바, 이벤트 로그 Text, 토스트, 심문 텍스트 표시만 담당.
- LLM
  - `LLMClient`: HTTP 스텁과 폴백 문장 제공, 7주차 연동 시 교체만 하면 되도록 인터페이스 고정.

## 4. 데이터 흐름
1. 플레이어 또는 NPC가 Zone/규칙 이벤트를 발생시킨다.
2. `WorldEventLog`에 EventRecord가 쌓인다.
3. `EventLogPresenter`가 신규 EventRecord를 탐지해 `SemanticShaper`로 텍스트를 만들고 UIManager에 전달한다.
4. 규칙 위반 시 주변 NPC의 `SuspicionComponent`가 `AddSuspicion`을 호출하고 `GlobalSuspicionSystem`이 전역 G를 갱신한다.
5. sᵢ ≥ 임계일 때 `ReportManager.FileReport`가 호출되고 신고 큐가 채워진다.
6. 신고 조건 + G 조건을 충족하면 `PoliceController`가 `ReportManager.ShouldTriggerInterrogation()`으로 MoveToPlayer 상태로 전환한다.
7. 심문 후 `VerdictGiven` 이벤트가 기록되고 UI는 한 줄 판정 텍스트를 보여준다.

## 5. 의도와 기대 효과
- FollowCamera와 PlayerController를 초기에 확정해 2주차 씬 셋업 시간을 절약한다.
- EventLogPresenter를 UIManager 밖으로 분리해 UI는 오직 표현만 담당하게 하고, 추후 로그 UI 추가 시 코드 혼잡을 방지한다.
- LLMClient 스텁을 미리 두어 7주차에 실제 서버만 연결하면 되도록 리스크를 낮춘다.
- SuspicionComponent와 ReportManager는 문제를 두 번 이상 일으키면 자동으로 신고 흐름을 타도록 설계되어 튜닝 전에도 루프 전체가 최소 1회는 돌 수 있다.
- 문서와 코드가 동일한 명칭과 책임을 공유하므로, 다른 AI나 개발자가 `Assets/Scripts`를 열었을 때 즉시 맥락을 이해할 수 있다.

## 6. 다음 액션
- Main 씬 구성, NavMesh Bake, Zone 오브젝트 배치, Canvas 연결.
- Player 상호작용(E/F)와 규칙 조건 체크를 Zone/Rule 시스템에 연결.
- SuspicionComponent에 거리·시야 기반 감지 로직을 추가하고 규칙별 가중치를 적용.
- Police 판정 문구를 LLMClient 또는 템플릿으로 다양화.

## 7. 핵심 데이터 계약
> `docs/slice-plan-single-source.md` 섹션 6과 동일 표를 유지한다.

### 7.1 EventRecord
| 필드 | 타입/범위 | 설명 |
| --- | --- | --- |
| `id` | ULID | Append 시 생성, JSONL 키 |
| `stamp` | float(초) | `Time.time` 기반 |
| `eventType` | enum | `EnteredZone`, `ExitedZone`, `ViolationDetected`, `SuspicionUpdated`, `ReportFiled`, `InterrogationStarted`, `VerdictGiven` |
| `category` | enum | `Movement`, `Zone`, `Rule`, `Suspicion`, `Report`, `Verdict` |
| `actorId` / `actorRole` | UUID / `Player\|NPC` | 이벤트 주체 |
| `targetId` | UUID? | 신고·판정 대상, 없으면 `None` |
| `zoneId` | string | Queue, Seat, Photo, `None` |
| `payload` | dict | 256바이트 이내, `ruleId`, `delta`, `note` 키 사용 |
| `severity` | int 0~3 | 2 이상 토스트 |

### 7.2 SuspicionComponent
| 항목 | 값 | 설명 |
| --- | --- | --- |
| `si` | 0~100 | weight 30/20/15 × proximityFactor |
| `decayPerSec` | 0.5 | 이벤트 부재 시 선형 감소 |
| `reportThreshold` | 50 | `si ≥ 50` 시 신고 검토 |
| `reportCooldownSec` | 20 | 신고 후 대기 |
| `lastEventId` | ULID | 중복 신고 방지 |
| `reported` | bool | 심문 후 리셋 |

### 7.3 ReportEnvelope
| 항목 | 타입/범위 | 설명 |
| --- | --- | --- |
| `reportId` | ULID | 신고 묶음 |
| `reporterIds` | List<UUID> | 신고자 목록 |
| `attachedEvents` | List<EventRecord.id> | 최대 3건 |
| `reason` | enum | `RepeatedRuleBreak`, `HighGlobalG`, `Scripted` |
| `resolved` | bool | 심문 종료 시 true |

### 7.4 스레드·전달 규칙
- EventRecord append는 메인 스레드에서만 수행하고 UI/LLM은 `EventLogPresenter` 큐를 구독한다.
- `GlobalSuspicionSystem`은 프레임당 평균을 재계산해 `ReportManager`, UI에 동일 데이터를 브로드캐스트한다.

## 8. 선행 체크리스트 (필수/선택/추후)
- 필수
  - `Main` 씬을 만들고 `SystemsRoot/NPCRoot/ZonesRoot/UIRoot` 빈 오브젝트로 구조를 고정한다.
  - Plane+Cube 그레이박스와 1회 NavMesh Bake로 이동 반경(0.35m)을 검증한다.
  - Queue/Seat/Photo Zone Prefab 3종을 준비하고 Gizmo 색상으로 범위를 표시한다.
  - 새 Input System Action Asset을 만들어 WASD, Sprint, Interact(E/F), Camera Orbit를 바인딩한다.
  - FollowCamera(Cinemachine 프로필 또는 간단 스크립트)를 Prefab으로 저장한다.
  - Canvas Prefab에 G 바, 이벤트 로그(5줄), 토스트, 심문 텍스트 영역을 배치하고 `UIManager` 레퍼런스를 연결한다.
  - `WorldEventLog`, `ReportManager`, `GlobalSuspicionSystem`, `EventLogPresenter`를 `SystemsRoot` 하위에 배치해 상호 참조를 미리 연결한다.
- 선택
  - `docs/devlog/` 디렉터리를 만들고 주차별 템플릿을 복사해 문서화를 쉽게 한다.
  - Suspicion 디버그 텍스트 혹은 OnGUI 패널을 만들어 튜닝 상황을 바로 확인한다.
- 추후
  - WEL JSONL 덤프 버튼, Zone 커스텀 인스펙터, CI 연동 등 툴링 항목은 루프 1회 완성 후 착수한다.

## 9. 주차별 마일스톤 메모
- 상세 목표는 `docs/slice-plan-single-source.md` 섹션 8을 따른다. 본 섹션은 의존 관계만 요약한다.
- 주1~2: Player/Camera/씬 그레이박스가 끝나야 NavMesh와 NPC 이동 작업이 꼬이지 않는다. 입력/카메라 학습 블록을 가장 먼저 수행한다.
- 주3~4: Zone 상호작용 → WEL/로그 흐름을 먼저 완성하고, NPC 행동 표준화(NPCBase) 이후 Suspicion을 붙인다.
- 주5~6: SuspicionComponent→ReportManager→PoliceController 순으로 연결하며, 각 단계마다 EventRecord를 남겨 추적한다.
- 주7~8: UI 다듬기와 선택적 LLMClient 연동을 진행하되, 템플릿 폴백과 devlog/영상 기록을 동시에 마무리한다.

## 10. LLM·UI·성능·테스트 방안
- LLM 스텁 계약
  - 입력: `{ role, situation_summary, tone, constraints }`.
  - 출력: `{ utterance, fallbackUsed }`, 실패 시 `fallbackUsed=true`와 템플릿 문장을 반환한다.
  - HTTP 모듈은 `ILLMClient` 인터페이스만 유지하고 구현체 교체로 서버를 바꾼다. 타임아웃 1.5초.
- UI 업데이트 주기
  - `EventLogPresenter`는 프레임당 최대 2건만 UI에 전달하고 초과분은 0.5초 간격으로 큐에서 방출한다.
  - 전역 G 바는 `Mathf.Lerp`(0.25초)로 값 변화를 완화한다. 토스트는 3초 유지 후 자동 삭제한다.
- 성능·모니터링
  - `WorldEventLog` 버퍼 512건 순환, JSONL 덤프는 개발용으로만 사용한다.
  - NavMesh 런타임 재베이크 금지, Profiler로 10분 플레이 시 GC.Alloc ≈ 0B/프레임을 목표로 한다.
- 테스트 전략
  - PlayMode: EventRecord append/consume, Suspicion 임계 로직, ReportManager 조건, Police 상태 전환을 커버한다.
  - 수동 점검: 10분 플레이 영상, UI 캡처, Suspicion/G 그래프를 매주 devlog에 첨부한다.
  - 오류 발생 시 EventRecord JSONL과 devlog를 통해 재현 절차를 기록한다.

