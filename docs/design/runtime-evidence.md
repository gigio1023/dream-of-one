---
doc: docs/design/runtime-evidence.md
project: Dream of One
revision: 2026-02-13
status: Active
---

# Runtime Evidence 운영 기준

이 문서는 `plan.md`의 WP-1~WP-5를 실제 운영 절차로 고정한다.

## 1) 목표
- Unity/Backend 실행 결과에서 `transport`, `threadId`, `usedFallback`을 자동 점검한다.
- 대체 경로(`fallback`) 발생 시 실패 사유 코드와 분류(`reasonCategory`, `warningTier`)를 함께 남긴다.
- 회귀 지표와 Release Candidate (RC, 릴리즈 후보) 판정 결과를 재현 가능한 산출물로 보관한다.

## 2) 증거 필드 기준
- 필수 필드:
  - `transport`: `codex | codex-reply | fallback`
  - `usedFallback`: `true | false`
  - `threadId`: `transport`가 `codex|codex-reply`일 때 필수
- 인과/안정화 필드:
  - `reason`: 실패 사유 코드
  - `reasonCategory`: `none|policy|schema|timeout|cancelled|parse|tool|runtime|unknown`
  - `warningTier`: `blocking|attention|reference`
- Backend 로그 이벤트 구분:
  - 증거 집계 대상: `npc_decision_response`
  - 클라이언트 중단 노이즈: `npc_decision_response_dropped` (응답 증거 집계에서 제외)

## 3) 실행 명령
기본 점검:
```bash
scripts/unity/run_editor_diagnostics.sh
scripts/unity/run_playmode_smoke.sh
```

전체 점검 + 릴리즈 후보 묶음:
```bash
scripts/unity/run_all_checks.sh
```

릴리즈 프로파일(권장 반복):
```bash
RC_PROFILE=release RC_NORMAL_RUNS=3 RC_FAILURE_RUNS=2 scripts/unity/run_all_checks.sh
```

장시간 부하 추세 프로파일(3-run 비교):
```bash
scripts/unity/run_stability_trend.sh
```

라이브 플레이 누적 프로파일(비테스트 루프):
```bash
rg --no-line-number "transport=" "$HOME/Library/Logs/Unity/Editor.log" | tail -n 300 > logs/unity-live-play.log
node scripts/unity/analyze_runtime_evidence.mjs \
  --unity-log logs/unity-live-play.log \
  --backend-log logs/npc-runtime-live-evidence.log \
  --out logs/runtime-evidence-summary.json \
  --require-unity-entries \
  --require-backend-entries
node scripts/unity/collect_regression_metrics.mjs \
  --evidence logs/runtime-evidence-summary.json \
  --backend-log logs/npc-runtime-live-evidence.log \
  --out logs/regression-metrics.json
node scripts/unity/package_release_candidate.mjs \
  --run-id rc-dre-149 \
  --out-dir logs/rc \
  --evidence logs/runtime-evidence-summary.json \
  --metrics logs/regression-metrics.json \
  --editor-log logs/editor-diagnostics.log \
  --playmode-smoke-log logs/playmode-smoke.log \
  --playmode-tests-log logs/playmode-tests.log
```

## 4) 자동 생성 산출물
- `logs/runtime-evidence-summary.json`
  - 필드 누락/불일치(위반)과 분포 통계
- `logs/regression-metrics.json`
  - 경로 비중, 대체 경로 비율, 연속성 손실 지표
- `logs/rc/<run-id>/manifest.json`
  - Release Candidate 체크리스트와 참조 로그 파일 경로

## 5) 판정 기준
- 위반(`violations`) 0건
- `codexPathRatio`가 목표 이상(기본 0.7 이상)
- `codexReplyMissingThreadId` 0건
- `fallbackWithoutReason` 0건

## 6) 운영 메모
- Unity/Backend 로그가 비어 있으면 지표는 실패로 기록될 수 있다.
- 엄격 모드는 `DREAM_EVIDENCE_STRICT=1`로 활성화한다.
- Unity/Backend 증거 엔트리 필수화는 아래 변수로 제어한다.
  - `DREAM_REQUIRE_UNITY_EVIDENCE=1`
  - `DREAM_REQUIRE_BACKEND_EVIDENCE=1`
- 부하 안정화 점검 시 `mailbox.skippedBeforeBroker`를 함께 기록하면 취소/마감 요청의 불필요 브로커 실행 감소 여부를 추적할 수 있다.

## 7) 추세 임계치와 실패 대응
- 기본 임계치(`scripts/unity/run_stability_trend.sh`):
  - `runCount >= 3`
  - `codexPathRatio >= 0.7`
  - `cancelledRate <= 0.35`
  - `deadlineExceededRate <= 0.25`
- 결과 파일:
  - `logs/stability-trend.json`
- 실패 시 대응 순서:
  1. `summary.pass.runCount=false`이면 run 입력 세트를 3회 이상으로 확장한다.
  2. `codexPathRatio` 실패면 backend 로그에서 `transport=fallback` 급증 사유(`fallbackReasonDistribution`)를 우선 분류한다.
  3. `cancelledRate`/`deadlineExceededRate` 실패면 run별 `mailboxMax`와 `globalQueued` 피크를 확인하고 deadline/Global Cap 조합을 재조정한다.
  4. `droppedResponses` 증가 시 클라이언트 측 timeout/취소 정책과 backend deadline 정렬 여부를 점검한다.
