---
doc: plan.md
project: Dream of One
revision: 2026-02-13
status: Active (마스터 실행 계획 v10.1, 용어 정비 + 정량 기준 강화)
source_of_truth: project.md
---

# Dream of One 마스터 실행 계획 (의도 우선 v10.1)

이 문서는 `project.md`의 Intent를 실제 실행 순서, Acceptance Criteria, 결과물로 고정한 계획서다.
이슈 진행 SoT는 Linear다.

## 0) 문서 목적
- Unity에서 "Codex CLI 기반 NPC 사회 시뮬레이션"이 의도대로 자율 동작함을 반복 가능하게 검증한다.
- 기능 확장보다 검증력, 안정성, 재현성을 우선한다.
- v0.1 범위(10-12분 세션, 고정 랜드마크, 고정 플레이어 발화 액트) 안에서 완료한다.

## 1) 용어 기준
- 본 계획의 표준 용어는 `terminology.md`를 따른다.
- 기술 문맥 금칙어와 대체어는 `terminology.md`의 치환 규칙을 그대로 적용한다.
- 코드 키(`threadId`, `fallback`, `transport`)는 원문을 유지하고 설명을 붙인다.

## 2) 의도 (Why)
- 플레이어는 조사자가 아니라 피조사자다.
- NPC와 기관이 플레이어를 관찰/보고/판정하는 압박 루프가 핵심 경험이다.
- NPC 사회 행동의 중심 동인은 Codex 실행 경로여야 한다.
- Unity는 세계 상태 반영, 행동 실행, 종결 판정을 결정론적으로 수행한다.

핵심 질문:
- Unity 플레이에서 Codex 기반 NPC 사회가 실제로 압박 루프를 구동하는가?

## 3) 배경 (Current State + Gap)
### 3.1 현재 확보된 기반
- 사회 루프(`observe -> plan -> validate -> execute -> WEL`)가 동작한다.
- 압박/노출/리포트/판정 흐름이 구현되어 있다.
- `npc-runtime`이 의사결정 API, 상태 연속성, 대체 경로를 제공한다.
- 개별 NPC 단일 처리(`single-flight`)와 동시 실행 상한(`global cap`)이 적용되어 있다.
- 핵심 의도 검증 이슈(`DRE-137`) 재검증이 완료되어 기본 동작은 확인됐다.

### 3.2 보강이 필요한 항목
- Unity에서 `transport/threadId/fallback` 가시성을 자동으로 점검하는 체계가 약하다.
- 실패 상황 인과(`발생 원인 -> 대응 -> 결과`)를 자동 회귀 검출로 닫지 못했다.
- 검증 중 경고 노이즈가 의도 판단 신호를 가린다.
- 릴리즈 후보 판정 기준과 증거 묶음 형식이 문서/운영에서 완전히 고정되지 않았다.

## 4) 목표 (What)
### 4.1 최상위 목표
1. 의도 검증 완결: Codex가 NPC 사회 행동의 실제 동인임을 반복 가능하게 입증.
2. 안정성 완결: 부하/장애 상황에서도 세션이 멈추지 않고 결정론적 대체 경로 유지.
3. 릴리즈 준비 완결: 담당자가 바뀌어도 같은 절차로 같은 결론에 도달.

### 4.2 정량 Acceptance Criteria
| 항목 | Acceptance Criteria | 측정 범위 | 실패 처리 |
|---|---|---|---|
| 세션 완료 | 10-12분 시나리오가 중단 없이 종결 | 정상 실행 3회 | 해당 이슈 보류, 원인 분류 후 재실행 |
| Codex 경로 비중 | 비-idle 사회 행동 중 `transport in {codex,codex-reply}` 비중 70% 이상 | 정상 실행 3회 | 원인 분석(백엔드/Unity 매핑/대체 경로 과다) |
| 상태 연속성 | `sessionId+npcId` 기준 `threadId` 누락/불연속 0건 | 정상 실행 3회 | 회귀로 분류, 우선 복구 |
| 대체 경로 결정성 | 동일 실패 주입 유형에서 동일 `reason` 코드 100% 일치 | 실패 주입 2회 이상/유형 | 분류표/매핑 규칙 수정 후 재검증 |
| 과부하 제어 | 동시 실행 수가 설정 상한 초과 0건, 큐 적체로 Unity 시간 예산 초과 0건 | 부하 시나리오 1세트 | 상한/시간 예산 재조정 및 회귀 테스트 |
| 진단 Conformance | Unity 진단 실패 0건, PlayMode 실패 0건 | 이슈 종료 직전 | 종료 불가 |

## 5) 구현 원칙 (How)
1. 의도 우선: 새 기능보다 의도 검증 약점을 먼저 보완한다.
2. 증거 우선: 코드 변경이 아니라 결과 증거로 완료를 판정한다.
3. 결정론적 안전: LLM 제안은 Unity 검증 후 실행하고, 실패는 이유 코드와 함께 대체 경로로 처리한다.
4. 부하 상한 준수: 개별 NPC 단일 처리 + 동시 실행 상한 + 취소/마감시간 정렬을 유지한다.
5. 단일 이슈 흐름: Linear 이슈 1개 완료 후 다음 이슈로 이동한다.

## 6) 상세 실행 계획 (Workstream)
### WP-1. Unity 증거 체인 자동 점검 (최우선)
목적:
- Unity 실행 결과에서 `transport/threadId/fallback`이 누락 없이 관측되고 자동 판정되게 한다.

실행 계획:
1. 관측 지점 표준화(수집 위치, 필드, 기록 시점 고정).
2. 최소 2개 채널(WEL + HUD 또는 WEL + 로그)에 같은 식별자 노출.
3. PlayMode/진단에서 필드 존재/일관성 자동 점검.
4. 누락/불일치/미정의 사유는 즉시 실패로 처리.
5. 실행 기록 양식(run id, seed, 시간, 결과 요약) 통일.

결과물:
- 증거 체인 점검 문서
- 자동 점검 결과 리포트
- 누락/불일치 원인 분류표
- PlayMode contract coverage (`draem-of-one/Assets/Tests/PlayMode/SocietyRuntimeContractPlayModeTests.cs`) 기반 브리지 검증 근거

이슈 완료 기준:
- 사람이 로그를 수동으로 훑지 않아도 Codex 경로 활성 여부를 자동 판정 가능.

### WP-2. 실패 경로 인과 가시성 강화
목적:
- 대체 경로가 발생했을 때 원인과 영향을 즉시 설명 가능하게 한다.

실행 계획:
1. 실패 사유 코드 분류표 확정(시간초과/파싱/도구/백엔드다운/정책 거부 등).
2. Unity-Backend 사유 코드 매핑 규칙 단일화.
3. report -> intake -> verdict 단계에서 영향 표시 규칙 확정.
4. 실패 주입 시나리오를 표준 검증 세트로 고정.
5. 비개발자도 해석 가능한 인과 체크리스트 운영.
6. hook policy + reason taxonomy 경로(`backend/npc-runtime/src/policy/hook-policy.ts`, `backend/npc-runtime/src/policy/reason-taxonomy.ts`)를 기준으로 fallback reason/category/tier 매핑을 유지 검증.

결과물:
- 실패 사유 코드 분류표
- 실패 주입 검증 결과 묶음
- 인과 가독성 리뷰 기록

이슈 완료 기준:
- 모든 실패 유형에서 "원인 -> 대응 -> 결과"가 한 번에 설명된다.

### WP-3. 경고 노이즈 감축과 안정화
목적:
- 의도와 무관한 경고가 핵심 신호를 가리지 않도록 한다.

실행 계획:
1. 경고 등급 3단계 정의(차단/주의/참고).
2. 반복 경고를 원인별로 분류하고 담당 영역 지정.
3. 차단/주의 경고를 우선 해소하고 참고 경고는 허용 목록으로 관리.
4. 검증 요약에서 핵심 신호와 노이즈를 분리 표시.
5. 경고 상한 기준을 확정해 종료 판정에 반영.

결과물:
- 경고 등급 기준표
- 안정화 전/후 비교 리포트
- 검증 요약 양식

이슈 완료 기준:
- 검증 라운드에서 차단 경고 0건, 주의 경고는 허용 상한 이내.

### WP-4. 릴리즈 후보 검증 묶음
목적:
- 누구나 같은 절차로 릴리즈 후보를 판정할 수 있게 한다.

실행 계획:
1. 필수 항목(테스트/증거/허용 실패 범위) 확정.
2. 실행 세트 고정(정상 3회 + 실패 주입 2회 이상).
3. 결과 기록 양식 표준화(판정 근거, 증거 링크, 보류 사유).
4. 합격/보류/반려 규칙 문서화.
5. 회귀 발생 시 재검증 순서 고정.

결과물:
- 릴리즈 후보 체크리스트
- 실행 결과 증거 묶음
- 판정 로그

이슈 완료 기준:
- 담당자 변경과 무관하게 판정 결과가 재현된다.

### WP-5. 회귀 감시와 문서 동기화
목적:
- 의도-구현-증거의 드리프트를 상시 제어한다.

실행 계획:
1. `project.md` 변경 시 `plan.md` 동시 갱신 규칙 유지.
2. 이슈 종료 시 증거 링크/검증 결과를 계획 현황에 반영.
3. 상시 감시 지표(경로 비중, 대체 경로 비율, 연속성 손실)를 주기 점검.
4. 성능/지연/로그 누락 경계 기준을 고정.
5. 주기 리베이스(완료/중단/신규 위험) 수행.

결과물:
- 문서 동기화 로그
- 회귀 감시 지표표
- 리베이스 기록

이슈 완료 기준:
- 문서/실행/증거 불일치가 누적되지 않는다.

## 7) Phase별 실행 순서
### Phase 1: 증거 체인 확정
- 대상: WP-1, WP-2
- 종료 조건: Codex 경로/연속성/대체 경로 인과를 자동 판정 가능

### Phase 2: 안정화
- 대상: WP-3
- 종료 조건: 핵심 신호가 경고 노이즈에 가려지지 않음

### Phase 3: 릴리즈 후보 판정
- 대상: WP-4
- 종료 조건: 체크리스트와 증거 묶음으로 판정 재현 가능

### Phase 4: 지속 운영
- 대상: WP-5
- 종료 조건: 문서/실행/증거 동기화 상시 유지

의존 관계:
- Phase 1 완료 전 Phase 3 최종 판정 불가
- Phase 2는 Phase 1과 일부 병행 가능하나 최종 판정 제출은 Phase 2 완료 후 수행

## 8) Linear 실행 우선순위 (항상 1개만 진행)
1. `unity-codex-transport-thread-fallback-evidence-automation` (WP-1)
2. `fallback-causality-visibility-standardization` (WP-2)
3. `runtime-warning-noise-reduction-and-stability-polish` (WP-3)
4. `release-candidate-validation-packaging` (WP-4)
5. `backend-readiness-thread-workspace-regression-monitoring` (WP-5)

이슈 공통 종료 조건:
- 목표/범위/비범위/Acceptance Criteria가 이슈 본문에 명시됨
- 실행 결과와 증거 링크가 코멘트에 남음
- 보류/실패 시 원인 분류와 다음 조치가 기록됨

## 9) 검증 운영 기준
Unity 변경 이슈:
- Diagnostics 통과
- PlayMode smoke 통과
- `transport/threadId/fallback` 메타 점검 통과
- report -> intake -> verdict 인과 가독성 확인

Backend 변경 이슈:
- 통합/Specification 테스트 통과
- `schema/thread/workspace/readiness` Conformance 유지
- 큐/상한/취소/마감시간 동작 검증 통과

릴리즈 후보 이슈:
- 체크리스트 전 항목 통과
- 필수 증거 누락 0건
- 정량 Acceptance Criteria(4.2) 전 항목 통과

## 10) 최종 결과물 정의
- D1. Codex 경로 자동 점검 체계
- D2. 실패 경로 인과 가시성 표준
- D3. 경고 노이즈 감축 리포트
- D4. 릴리즈 후보 판정 묶음(체크리스트 + 증거 + 판정 로그)
- D5. 회귀 감시/문서 동기화 체계

최종 상태:
- "Unity에서 Codex CLI 기반 NPC 사회 시뮬레이션이 의도대로 자율 동작한다"를 재현 가능한 방식으로 입증.

## 11) 위험과 완화
- R1. 자동 점검 미흡으로 회귀 늦게 발견
  - 완화: WP-1 선행, 누락/불일치 즉시 실패 처리
- R2. 실패 인과 해석 불가
  - 완화: WP-2 분류표와 표시 규칙 고정
- R3. 경고 노이즈로 판정 오류
  - 완화: WP-3 등급/상한/허용 목록 운영
- R4. 릴리즈 판정 편차
  - 완화: WP-4 고정 절차와 판정 로그 운영
- R5. 문서-실행 불일치 재발
  - 완화: WP-5 동기화 규칙과 정기 리베이스 유지

## 12) 실행 현황 (2026-02-13)
- 완료: 의도 핵심 검증(`DRE-137`) 재검증 포함, actor-runtime 기반 기본 증거선 확보.
- 완료: WP-1~WP-5 운영 스크립트/지표/산출물 경로 구현
  - `scripts/unity/analyze_runtime_evidence.mjs`
  - `scripts/unity/collect_regression_metrics.mjs`
  - `scripts/unity/package_release_candidate.mjs`
  - `scripts/unity/run_*` 스크립트 연동 완료
- 완료: Backend/Unity 메타 필드 표준화(`reasonCategory`, `warningTier`) 및 통합 테스트 반영.
- 완료: 용어 정비 문서(`terminology.md`) 기준으로 핵심 문서 용어 치환 완료.
- 완료: Release Candidate (RC, 릴리즈 후보) 검증 실행(`DRE-148`)
  - 정상 5회 / 실패 주입 2회 실행
  - `logs/runtime-evidence-summary.json`, `logs/regression-metrics.json`, `logs/rc/rc-dre-148/manifest.json` 생성
  - 회귀 지표 통과(`codexPathRatio=0.7143`, continuity loss 0)
- 완료: Unity PlayMode 계측 보강으로 `unityEntries`가 1 이상으로 관측됨.
- 완료: 라이브 플레이 메타 누적 검증(`DRE-149`)
  - Unity/Backend 라이브 수집 로그 분리: `logs/unity-live-play.log`, `logs/npc-runtime-live-evidence.log`
  - 증거 요약 통과: `unityEntries=300`, `backendEntries=74`, `violations=0`
  - 회귀 지표 통과: `codexPathRatio=0.7297`, `continuityLoss=0`, `fallbackWithoutReason=0`
  - Release Candidate 패키지 생성: `logs/rc/rc-dre-149/manifest.json` (`ready=true`)
- 완료: 구현-문서 정합 감사(`DRE-146`)
  - backend/unity Codex 자율 루프의 코드 증거와 테스트/진단 지점을 file:line 기준으로 검증
  - 불일치/미완 항목을 심각도 기준으로 분류(실 runner 최종 수용, Unity HTTP E2E 테스트, readiness 범위)
- 후속 이슈 생성:
  - `DRE-150` Real Codex runner 최종 수용 증거 프로파일
  - `DRE-151` Unity backend bridge E2E PlayMode 테스트 보강
  - `DRE-152` readiness workspace root 접근성 점검 확장
- 완료: real Codex runner 최종 수용 증거(`DRE-150`)
  - 실 runner 로그: `logs/npc-runtime-real-evidence.log` (mock-thread 0건)
  - 실 runner 증거/지표: `logs/runtime-evidence-summary-real.json`, `logs/regression-metrics-real.json`
  - Release Candidate 패키지: `logs/rc/rc-dre-150/manifest.json` (`ready=true`)
- 완료: Unity backend bridge E2E PlayMode 보강(`DRE-151`)
  - `SocietyRuntimeClient` 경유 성공/실패(parse/http) 경로를 PlayMode 테스트로 자동 검증
  - PlayMode 22/22 통과, Diagnostics clean 확인
- 완료: readiness workspace root 점검 확장(`DRE-152`)
  - `/health/ready`에 `workspaceRootPath` 체크/사유 코드 추가
  - backend `npm run check` 27/27 통과
- 완료: 운영 노이즈 감축/부하 안정화(`DRE-153`)
  - 글로벌 리미터 대기 중 취소/마감된 job은 브로커 실행 전에 건너뛰도록 보강(`skippedBeforeBroker` 지표 추가)
  - 클라이언트 중단 요청은 `npc_decision_response_dropped`로 분리 기록하여 response 증거 노이즈 제거
  - Unity `SocietyBrain`에 반복 fallback 메타 억제 창(`fallbackMetaSuppressWindowSeconds`) 추가
  - 재현 비교 산출물: `logs/dre-153/baseline-queued-cancel.json`, `logs/dre-153/after-queued-cancel.json`, `logs/dre-153/queued-cancel-comparison.json`
  - 검증: backend `npm run check` 30/30 통과, Unity PlayMode 22/22 통과, Diagnostics clean
- 완료: 장시간 부하 추세 자동 관측(`DRE-154`)
  - 신규 집계기: `scripts/unity/collect_stability_trend.mjs`
  - 신규 프로파일 명령: `scripts/unity/run_stability_trend.sh`
  - 3-run 샘플 산출물: `logs/stability-trend.json` (codex ratio / fallback reason / mailbox 카운터 포함)
  - 문서 임계치/실패 대응 반영: `docs/design/runtime-evidence.md`
- 현재 초점: `project.md` 기준 완성도 갭 리뷰 후, 의도 검증 비핵심 미세 리스크(운영 자동화 유지보수)만 주기 점검.
