# Codex Runbook (Linear SoT + Beads Execution + Codex Cloud)

Revision date: 2026-01-24

이 문서는 **Codex CLI가 수행할 운영 루프(runbook)** 입니다.\
목표는 “사용자는 자연어 지시만”, “Codex CLI는 Linear 이슈를 정리/진행 관리”, “구현은 로컬에서 필요 시 Beads 그래프로 분해해 수행”, “cloud-safe 작업은 Linear에서 Codex Cloud로 위임”을 만드는 것입니다.

---

## 0) 목표 / 비목표

### 목표

1. 자연어 지시 → Linear 이슈로 정리 (AC/범위/금지사항/검증 포함)
2. 로컬 구현이 필요하면 Beads로 내부 실행 그래프(epic/task/dep)를 만든다(선택)
3. Linear 상태/코멘트로 진행을 관리하고, PR 링크를 남긴다
4. Unity MCP 불가능한 cloud 작업은 Linear에서 Codex Cloud로 위임한다(선택)

### 비목표

- Beads ↔ Linear “미러링”으로 1:1 대응을 유지하려고 하지 않음
- 외부 서버/스케줄러를 “주요 제어 plane”으로 두지 않음 (단, repo 내 스크립트/훅은 Codex 내부 도구로 허용)

---

## 1) 불변 조건(Invariants)

- **Single Source of Truth(SoT)**: Linear 이슈 (사람/에이전트 간 합의 단위)
- **Beads 역할**: 로컬 구현을 위한 내부 실행 그래프(DAG). Linear에 미러링하지 않는다.
- **Writer(쓰기 주체)**: Codex CLI만 (사용자는 자연어 지시 + PR 리뷰/머지)
- **Codex Cloud**: cloud-safe 작업만 위임 (Unity MCP/serialized assets 금지)

---

## 2) 한 번만 하는 준비(사람이 세팅)

### 2.1 Beads 초기화

`.beads/`가 이미 있으면(보통 git으로 내려옴) 건드리지 않습니다.\
없으면 repo root에서 1회:

```bash
bd init
```

### 2.2 Codex CLI ↔ Linear MCP

환경별로 다를 수 있으니, 가장 안전한 루틴만 적습니다.

1. `~/.codex/config.toml`에서 `rmcp_client = true` 활성화
2. MCP 서버 추가:

```bash
codex mcp add linear --url https://mcp.linear.app/mcp
```

3. 필요 시 로그인:

```bash
codex mcp login linear
```

---

## 3) 세션 시작(bootstrap)

1. Linear에서 오늘 처리할 이슈를 선택한다(또는 생성한다).
   - 추천 라벨:
     - `agent:codex` (로컬 Codex CLI가 처리)
     - `agent:codex-cloud` (Codex Cloud에 위임)
     - `needs:unity-mcp` (Unity 작업 필요)

2. (선택) 로컬 작업이면 Beads 컨텍스트를 로드한다:

```bash
bd prime
```

---

## 4) 이슈 정의(Linear에서 합의하기)

Linear 이슈에는 최소한 아래가 있어야 합니다(특히 Codex Cloud 위임 시 필수):
- Goal (what/why)
- Acceptance Criteria (done 정의)
- Scope / Paths
- Do-Not (Unity serialized assets, 씬 구조 등)
- Verification (어떤 커맨드/체크를 통과해야 하는지)

---

## 5) Codex Cloud 위임(Linear에서 @Codex, 선택)

Unity MCP를 쓸 수 없는 cloud 환경에 맡길 수 있는 작업만 위임합니다.

권장 기준(“cloud-safe”):
- Unity Editor/MCP 필요 없음 (`needs:unity-mcp` 금지)
- `.unity/.prefab/.asset/.meta` 같은 serialized Unity asset 수정 금지
- 빌드/검증이 Unity Editor에 의존하지 않는 범위(문서/스크립트/순수 코드 정리 등)

권장 라벨(Linear):
- `agent:codex-cloud`
- (필요 시) `agent:human`

운영:
1. Linear 이슈 설명을 확정한다(AC/범위/금지사항/검증).
2. Linear에서 이슈를 Codex에 할당하거나, 코멘트로 `@Codex`를 멘션해 작업을 위임한다(필요 시 repo/브랜치 규칙 명시).
4. Codex가 PR을 만들면, 로컬에서 리뷰/검증 후 merge한다.
5. Linear 이슈를 close한다(PR 링크 유지).

---

## 6) 로컬 실행(Beads로 내부 그래프를 만들 때)

### 6.1 언제 Beads를 쓰나?

- 구현이 2분 이상 걸리고, 의존성/순서/WIP를 관리해야 할 때
- Unity MCP mutex 때문에 “지금 이 작업만 잡아야” 할 때
- 리팩터링/분할/테스트 작성처럼 단계가 명확할 때

### 6.2 최소 커맨드 패턴(예시)

```bash
# epic 생성 (내부 컨테이너)
bd create "EPIC: <feature>" --type epic --labels "agent:codex"

# task 생성 (epic 아래 child)
bd create "Implement X" --type task --parent <epic-id> --labels "agent:codex"
bd create "Write tests for X" --type task --parent <epic-id> --labels "agent:codex"

# 의존성 연결 (A depends on B)
bd dep add <impl-task-id> --blocked-by <setup-task-id>
```

> 정확한 플래그는 `bd <cmd> --help`를 우선 확인합니다.

---

## 7) 실행 루프(코딩/테스트/PR/완료)

### 7.1 “한 번에 하나” 기본 모드(WIP=1 권장)

특히 Unity MCP가 필요한 작업은 사실상 단일 자원이라 **WIP=1**이 운영 비용이 가장 낮습니다.

1. Linear 이슈를 `In Progress`로 옮기고 착수 코멘트를 남긴다(무엇을 할지/리스크/검증).
2. (선택) Beads 내부 작업을 `in_progress`로 업데이트한다.
3. 구현 → 로컬 테스트/실행
4. PR 생성/업데이트 → Linear에 PR 링크 코멘트 + `In Review`
5. 머지 + 검증 완료 → Linear `Done`

### 7.2 Unity MCP mutex(단일 Unity Editor 세션)

Unity 씬/프리팹/에셋 작업이 포함되면 Beads 라벨로 가드합니다:

- `needs:unity-mcp` : Unity Editor + MCP 필요
- `lock:unity-mcp` : 현재 Unity MCP를 점유한 이슈(정확히 1개만)

운영(로컬):
1. Unity 작업 시작 전, 다른 작업에 `lock:unity-mcp`가 붙어 있으면 먼저 정리/해제
2. 시작하는 작업에 `lock:unity-mcp`를 붙임
3. Unity 작업 후 `Tools > DreamOfOne > Run Diagnostics` 반복 실행(콘솔 클린)
4. 끝나면 `lock:unity-mcp` 제거

---

## 8) 장애/드리프트 대응

- Beads가 커지면, 오래된 내부 이슈를 close/compact해서 유지 비용을 낮춘다.
- Codex Cloud PR이 로컬에서 깨지면, Linear에 원인/재현/다음 액션을 남기고 로컬에서 처리한다.
