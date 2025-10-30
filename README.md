# Dream of One

AI만 사는 도시(꿈)에서 세션별 사회 규칙을 발견하며 탐지를 피하는 3인칭 추리 게임 프로토타입

## 개요

플레이어는 AI들만 사는 꿈 속 도시에 침입한 인간입니다. 관찰 → 가설 → 테스트를 통해 세션마다 다른 3개의 사회 규칙을 발견하고, 전역 인지율(Global Awareness)이 30%에 도달하기 전에 생존해야 합니다.

- **장르**: 3인칭 추리/스텔스
- **세션**: 20-30분
- **핵심 루프**: 관찰 → 가설 → 저위험 테스트 → 확정(단서 3개) → 운영

## 빠른 시작

### 요구사항
- Unity 6000.2.10f1
- macOS/Windows/Linux

### 실행 방법
1. Unity Hub에서 `game/` 폴더를 프로젝트로 열기
2. `game/Assets/Scenes/Prototype.unity` 씬 열기
3. Play

### 컨트롤 (임시)
- **이동**: WASD / 화살표 키
- **상호작용**: 단서 트리거에 근접

## 프로젝트 구조

```
dream-of-one/
├── game/              # Unity 6 URP 프로젝트
│   ├── Assets/
│   ├── Packages/
│   └── ProjectSettings/
├── server/            # LLM 백엔드 (향후 예정)
├── docs/              # 리포지터리 전반 문서
│   ├── ADR/          # 아키텍처 결정 기록
│   └── Contrib/      # 기여 가이드
└── game/docs/         # 게임 전용 문서
    ├── Design/       # GDD, 규칙, 의심 모델
    ├── Tech/         # 아키텍처, 루프, LLM 인터페이스
    ├── UX/           # UI/UX 명세
    └── Content/      # 규칙 프리셋
```

## 핵심 시스템

- **규칙 시스템**: ScriptableObject 기반 3개 세션별 규칙 (예: 왼손 인사, 문 2회 밀기)
- **의심/인지율**: 개인 의심도(s_i) → 전역 인지율(G) 집계, G ≥ 0.30 시 패배
- **지식 노트**: Outer Wilds 스타일 단서 추적 UI (가설 → 3개 단서 수집 → 확정)
- **디렉터**: 페이싱 보장 (3분 이상 단서 발견 없으면 자동 트리거)

## 기술 스택

- **엔진**: Unity 6 (6000.2.10f1)
- **렌더 파이프라인**: URP 17.2
- **입력**: Input System 1.14
- **패키지**: Cinemachine 3.x, AI Navigation 2.x, Addressables 2.x
- **언어**: C# (코드), 한국어 (문서)

## 문서

- **빠른 참조**: [`game/docs/Design/OnePageGDD.md`](game/docs/Design/OnePageGDD.md)
- **전체 계획**: [`plan.md`](plan.md) (초기 설계 문서)
- **아키텍처**: [`docs/ArchitectureOverview.md`](docs/ArchitectureOverview.md)
- **개발 가이드**: [`docs/Contrib/DevelopersGuide.md`](docs/Contrib/DevelopersGuide.md)
- **컨벤션**: [`docs/Contrib/UnityProjectConventions.md`](docs/Contrib/UnityProjectConventions.md)
- **버티컬 슬라이스 로드맵(가안)**: [`game/docs/Design/VerticalSliceRoadmap.md`](game/docs/Design/VerticalSliceRoadmap.md)

## 개발 상태

**현재 단계**: 초기 프로토타입 (첫 커밋)

✅ 완료
- 프로젝트 구조 및 리포지터리 레이아웃
- 핵심 시스템 스켈레톤 (규칙, 의심, 세션, 디렉터)
- 3인칭 이동 컨트롤러
- 지식 노트 UI 기초
- 문서 체계

🚧 진행 중
- Unity Editor에서 씬/프리팹 배선
- 샘플 규칙 3개 ScriptableObject 생성
- NavMesh 베이크 및 NPC 순찰

📋 예정
- Cinemachine 카메라 연동
- LLM 백엔드 서버 (`server/`)
- ProBuilder 레벨 블록아웃
- 플레이테스트 및 밸런싱

## 초보자용 작은 스텝 진행 가이드 (가안)
- **오늘 20–40분**
  - `Prototype.unity`에서 플레이어 이동/`DebugOverlay` G 표시 확인
  - `ClueTrigger` 2개 배치 → `Player` 태그 접촉 시 `HypothesisTracker.LogClue` 호출되는지 확인
  - 규칙 SO 1개 작성(`RUL-ETQ-LeftHandWave`) → 단서 2개로 3회 확정 로그/노트 뷰 표시 확인
- **내일 30–60분**
  - 테스트 버튼/간단 행동으로 `SuspicionManager.ApplyViolation` 호출 → NPC 의심/전역 G 상승 확인
  - 180초 무단서 시 `Director` 로그 발생 확인

> 본 가이드는 가안이며, 진행 난이도에 따라 순서를 조정하세요. 상세 DoD는 VS 로드맵 참조.

## 기여

현재 개인 프로젝트로 진행 중입니다. 기여 가이드는 [`CONTRIBUTING.md`](CONTRIBUTING.md) 참고.

## 라이선스

TBD

## 참고

- **영감**: Outer Wilds (지식 노트), Papers Please (규칙 추론)
- **설계 문서**: 전체 설계는 [`plan.md`](plan.md) 참고


