# Local Director Governance Patterns

작성일: 2026-04-30
작성자: Worker A
범위: `/Users/user/git/harness` 로컬 하네스 중 `gstack`, `gstack-game`, `github-copilot-fc`, `superpowers-obra`, `get-shit-done`, `open-ralph-wiggum`, `bmalph`, `ralph-super-simple`, `spec-skill`, `ouroboros`

이 조사는 개별 이슈 실행법이 아니라 상위 방향, 비전, 전략, 총괄 의사결정 구조를 보기 위해 수행했다. 핵심 질문은 하나다. Dream of One에서 game director 수준의 판단을 어떻게 기록하고, 검증하고, 다음 마일스톤으로 복원할 것인가.

## 1. 공통 패턴 요약

가장 강한 공통 패턴은 "자동 실행"이 아니라 "권한이 분리된 실행"이다. 여러 하네스가 에이전트에게 탐색, 초안, 구현, 검증은 맡기지만, 제품 방향과 범위 변경은 별도 게이트로 분리한다. `gstack`의 `User Sovereignty`, `gstack-game`의 `Confusion Protocol`, `spec-skill`의 승인 루프, Ralph 계열의 completion promise, `ouroboros`의 수치 게이트는 모두 같은 구조다. 에이전트는 추천하고, 기록하고, 반복한다. 방향 결정은 명시적 신호나 승인 없이는 확정되지 않는다.

두 번째 패턴은 "단계가 곧 기억 장치"라는 점이다. `gstack-game`은 `~/.gstack/projects/{slug}/`에 디자인 리뷰, 방향 리뷰, slice plan, retro를 누적한다. `get-shit-done`은 `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, phase별 `SUMMARY.md`와 `VERIFICATION.md`를 남긴다. `github-copilot-fc` Ralph-v2는 `.ralph-sessions/<SESSION_ID>/metadata.yaml`, `iterations/<N>/plan.md`, `tasks/*.md`, `progress.md`, `review.md`를 상태 머신의 SSOT로 둔다. `ouroboros`는 SQLite EventStore와 immutable Seed로 lineage를 재구성한다. 즉, 리더십 판단은 채팅에 머물지 않고 다음 세션이 읽을 수 있는 산출물로 내려와야 한다.

세 번째 패턴은 "마일스톤 단위의 bounded autonomy"다. `open-ralph-wiggum`과 `ralph-super-simple`은 `--max-iterations`, `EXIT_SIGNAL`, `verify.sh`, `status` 모니터링으로 루프를 제한한다. `get-shit-done`은 `/gsd-autonomous`가 phase를 순회하되 ROADMAP 재읽기, blocker, validation request, audit-milestone으로 멈춘다. `ouroboros`는 ambiguity <= 0.2, semantic score >= 0.8, ontology similarity >= 0.95 같은 수치로 시작과 종료를 제한한다. Dream of One도 "계속 알아서 해"가 아니라 "마일스톤 가설, 종료 조건, 실패 조건, 검증 증거"가 있는 루프만 허용해야 한다.

## 2. Product Thesis와 Creative Pillars

`gstack`의 상위 논리는 `/Users/user/git/harness/gstack/ETHOS.md`에 가장 잘 드러난다. 이 파일은 "AI로 완전성의 한계비용이 낮아졌다", "검색 후 빌드하라", "AI는 추천하고 사용자가 결정한다"를 제품 철학으로 둔다. 이는 기능 목록보다 우선하는 판단 기준이다. 특히 `Boil the Lake`와 `User Sovereignty`는 개별 작업을 평가하는 기준이 아니라 제품 운영 원칙이다.

`gstack-game`은 이를 게임 개발용으로 변환한다. `/Users/user/git/harness/gstack-game/ETHOS.md`는 `Boil the Lake`, `Search Before Building`, `Player Time is Sacred`, `Fun First`를 게임 전용 rails로 둔다. 여기서 중요한 점은 "게임 느낌과 창작 비전은 압축되지 않는다"는 명시다. 자동화가 강해질수록 Dream of One은 반대로 비압축 영역을 분명히 해야 한다. 예를 들어 Dream Law, Cover Test, Exposure, Station intake, inquest, verdict, session termination은 자동화 산출물이 아니라 director authority로 관리해야 한다.

`gstack-game`의 README(`/Users/user/git/harness/gstack-game/README.md`)도 thesis를 분명히 한다. 이 도구는 "game builder"가 아니라 "structured review and quality assurance system"이다. Dream of One에 적용하면 director harness는 NPC 대사나 시스템을 무작정 생성하는 장치가 아니라, 이미 정한 제품 명제를 위반하지 않는지 판단하는 governance 장치여야 한다.

권장 패턴:
- `docs/design/game-design.md`와 `project.md`의 상위 문장을 "제품 명제"와 "creative pillars"로 분리한다.
- 각 pillar마다 침해 시나리오를 붙인다. 예: "Text is where the danger starts"가 깨지는 경우는 위험이 UI 숫자나 combat meter로 이전되는 경우다.
- 모든 slice와 Linear issue는 적어도 하나의 pillar에 연결되어야 한다. 연결이 없으면 product debt로 본다.

## 3. Stage Roadmap과 마일스톤 운영

`gstack-game`은 sprint 흐름을 `Think → Plan → Review → Slice → Handoff → Build → Feel → Playability → Test → Ship → Reflect`로 둔다. 관련 경로는 `/Users/user/git/harness/gstack-game/README.md`와 `/Users/user/git/harness/gstack-game/skills/game-direction/SKILL.md`, `/Users/user/git/harness/gstack-game/skills/prototype-slice-plan/SKILL.md`, `/Users/user/git/harness/gstack-game/skills/game-retro/SKILL.md`다. 이 순서는 구현 편의 순서가 아니라 director 질문의 순서다. 먼저 왜 이 게임이어야 하는지 묻고, 그 다음 가장 싼 slice로 가장 큰 위험을 검증하고, 마지막에 빌드가 경험을 실제로 개선했는지 회고한다.

`get-shit-done`은 마일스톤 문서 운영을 훨씬 더 명시한다. `/Users/user/git/harness/get-shit-done/get-shit-done/workflows/new-milestone.md`는 기존 프로젝트의 `PROJECT.md`, `MILESTONES.md`, `STATE.md`를 읽고 새 milestone goal, target features, key context를 확인한 뒤 `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`를 갱신한다. `/Users/user/git/harness/get-shit-done/get-shit-done/workflows/autonomous.md`는 ROADMAP의 incomplete phases를 찾아 discuss, plan, execute를 순회하고, 각 phase 뒤 다시 ROADMAP을 읽는다. `/Users/user/git/harness/get-shit-done/get-shit-done/workflows/audit-milestone.md`는 phase verification과 requirements coverage를 3개 출처에서 교차검증한다.

Dream of One에 맞춘 stage roadmap은 다음 구조가 적합하다.

| Stage | Director 질문 | 산출물 | 게이트 |
| --- | --- | --- | --- |
| Thesis Lock | 이 게임은 무엇을 감시하고 무엇을 절대 하지 않는가 | product thesis, creative pillars | pillar 위반 없음 |
| Protocol Slice | Dream Law, Cover Test, Exposure가 한 세션에서 닫히는가 | deterministic protocol slice | evidence_run + runtime slice smoke |
| Social Pressure Slice | NPC와 Station systems가 player를 조사하는가 | intake/inquest/verdict loop | player가 investigator가 아님 |
| Text Danger Slice | 텍스트가 실제 위험을 만드는가 | visible text + evidence semantics | backend check + Godot smoke |
| Playable Verdict | session termination이 제품 권위로 작동하는가 | playable verdict evidence | inquest/verdict deterministic |
| Retro / Re-scope | 무엇을 배웠고 무엇을 잘라야 하는가 | director retro + decision ledger | 다음 milestone의 thesis drift 확인 |

## 4. Decision Ledger

`gstack`의 `/Users/user/git/harness/gstack/DESIGN.md`는 디자인 결정 로그를 명시적으로 둔다. 날짜, 결정, 이유를 표로 남긴다. 작은 웹 디자인 문서지만 director governance 관점에서는 중요한 형태다. "왜 이 색을 택했는가"처럼 작아 보이는 판단도 나중에 drift를 막는 기준이 된다.

`spec-skill`은 더 강한 decision log 성격을 가진다. `/Users/user/git/harness/spec-skill/SKILL.md`와 `/Users/user/git/harness/spec-skill/CLAUDE.md`는 spec file을 삭제하지 않는 영구 decision log로 취급한다. 각 phase는 user checkpoint로 끝나고, session이 끊기면 spec에서 첫 미완료 task를 찾아 재개한다. 이 방식은 director 결정에도 그대로 유효하다. Dream of One의 큰 판단은 PR 설명이나 채팅 요약보다 spec 또는 ledger 파일에 남아야 한다.

`github-copilot-fc` Ralph-v2는 `.ralph-sessions` 아래 `metadata.yaml`, `progress.md`, `scores.jsonl`, `iterations/<N>/plan.md`, `review.md`를 나눠 ownership을 지정한다. 참고 경로는 `/Users/user/git/harness/github-copilot-fc/agents/ralph-v2/README.md`와 `/Users/user/git/harness/github-copilot-fc/agents/ralph-v2-cli/ralph-v2-orchestrator-cli.agent.md`다. 중요한 점은 "누가 무엇을 쓸 수 있는가"다. Orchestrator는 routing state만 갱신하고, task files는 Planner가 만들고, review는 Reviewer가 쓴다. Dream of One에서도 director ledger는 아무 작업자가 임의 수정하는 파일이 아니라 특정 역할이 특정 섹션만 쓰는 방식이어야 한다.

권장 decision ledger 필드:
- `date`
- `decision`
- `director rationale`
- `affected pillars`
- `one-way / two-way door`
- `accepted alternatives`
- `rejected alternatives`
- `evidence required`
- `review date`
- `supersedes`

## 5. Role Councils

`gstack-game`은 역할 기반 council 구조가 가장 선명하다. `/Users/user/git/harness/gstack-game/README.md`의 skill table은 `Producer / Creative Director`, `Senior Game Designer`, `Technical Director`, `Economy Designer`, `UX Researcher`, `Release Engineer`, `Chaos Engineer` 등을 분리한다. 이는 사람 흉내가 아니라 질문의 소유권을 나누는 방식이다. `game-direction`은 "why this, why now", scope, market, 12-month dream state를 묻고, `prototype-slice-plan`은 "무엇을 먼저 만들고 무엇을 실패 조건으로 볼 것인가"를 묻는다. `game-retro`는 feature completion보다 playability score, feel pass score, design intent survival을 본다.

`bmalph`는 BMAD planning과 Ralph implementation을 나눠 Phase 1 Analysis, Phase 2 Planning, Phase 3 Solutioning, Phase 4 autonomous implementation으로 연결한다. 관련 경로는 `/Users/user/git/harness/bmalph/README.md`와 `/Users/user/git/harness/bmalph/ralph/RALPH-REFERENCE.md`다. 핵심은 director council이 implementation loop와 같은 위치에 있지 않다는 점이다. 분석, PRD, UX, architecture, epics/stories가 먼저 있고, Ralph는 그 이후 task list와 specs를 받아 구현한다.

`ouroboros`는 Nine Minds를 둔다. `/Users/user/git/harness/ouroboros/README.md`에는 Socratic Interviewer, Ontologist, Seed Architect, Evaluator, Contrarian, Hacker, Simplifier, Researcher, Architect가 정리되어 있다. director governance에 중요한 역할은 Contrarian, Simplifier, Ontologist다. Dream of One처럼 개념적 drift가 위험한 게임은 "기능을 더하자"보다 "이 기능은 Dream Law의 본질을 흐리는가"를 묻는 역할이 필요하다.

Dream of One council 제안:
- Director: product thesis, pillars, one-way decisions 소유.
- Lore / Law: Dream Law, Station authority, verdict semantics 소유.
- Systems: deterministic backend validation, scheduling, evidence semantics 소유.
- Player Pressure: NPC/Station이 player를 조사하는지 검증.
- Text Danger: text surface가 위험을 담는지 검증.
- Contrarian: player가 investigator가 되는 drift, old runtime path 부활, cosmetic-only implementation을 공격.
- Producer: stage roadmap, cut/defer/keep, milestone gate 소유.

## 6. Critique Loops

`gstack-game`의 critique loop는 section별 STOP과 second opinion으로 작동한다. `/Users/user/git/harness/gstack-game/skills/game-review/SKILL.md`는 GDD anchors를 확인하고, section마다 점수와 biggest finding을 제시한 뒤 계속할지 묻는다. Core Loop 이후 독립 Codex 또는 subagent cold-read를 선택할 수 있고, cross-model synthesis를 통해 premise revision 여부를 묻는다. 이는 "검토를 많이 한다"가 아니라 "가정이 흔들릴 때 premise를 다시 점수화한다"는 구조다.

`github-copilot-fc` Ralph-v2는 critique를 상태 머신 안에 넣는다. `/Users/user/git/harness/github-copilot-fc/agents/ralph-v2-cli/ralph-v2-orchestrator-cli.agent.md`는 `ITERATION_REVIEW` 후 eval score가 threshold를 못 넘으면 `CRITIQUE`로 들어가고, `planner`의 `CRITIQUE_TRIAGE`, `questioner`의 research/brainstorm, `planner`의 `CRITIQUE_BREAKDOWN`을 거쳐 다시 execution으로 간다. 단, max critique cycles와 max iterations가 있다. 이 bounded critique가 핵심이다.

`ouroboros`도 `/Users/user/git/harness/ouroboros/docs/guides/evaluation-pipeline.md`에서 Stage 1 Mechanical, Stage 2 Semantic, Stage 3 Consensus를 나누고, consensus trigger를 seed modification, ontology evolution, goal reinterpretation, drift, uncertainty, lateral thinking adoption으로 제한한다. 비싼 consensus는 언제나 켜지지 않는다. 트리거가 있을 때만 켜진다.

Dream of One critique loop는 다음 순서가 적합하다.
1. Deterministic gate: `npm run check --prefix backend/npc-runtime`, Godot smoke 4종.
2. Director gate: product thesis와 pillars 위반 여부.
3. Contrarian gate: "이 변경이 player를 investigator로 만들었는가", "텍스트 위험이 숫자 UI로 도망갔는가", "old runtime path를 active tree로 되살렸는가".
4. Evidence gate: `data/evidence`에 검증 가능한 결과가 남았는가.
5. Retro gate: 다음 slice에서 유지, 자르기, defer할 결정을 ledger에 남겼는가.

## 7. Context Restoration for Leadership Decisions

`gstack`의 `/Users/user/git/harness/gstack/context-save/SKILL.md`와 `/Users/user/git/harness/gstack/context-restore/SKILL.md`는 leadership context 복원 패턴에 직접 쓸 수 있다. `context-save`는 git state, decisions made, remaining work를 저장하고, append-only saved context를 만든다. `context-restore`는 current branch로 필터링하지 않고 가장 최근 saved context를 모든 branch에서 찾는다. 이것은 Conductor workspace handoff를 위한 의도적 설계다.

`ouroboros`는 더 시스템적인 복원 모델이다. `/Users/user/git/harness/ouroboros/docs/architecture.md`와 `/Users/user/git/harness/ouroboros/docs/events.md`는 append-only SQLite EventStore, event_version, replay capability를 설명한다. `/Users/user/git/harness/ouroboros/docs/guides/evolution-loop.md`는 `ooo ralph`가 EventStore에서 lineage를 재구성하기 때문에 세션 경계를 넘어 계속된다고 설명한다.

`ralph-super-simple`은 파일 구조 자체가 복원 지점이다. `/Users/user/git/harness/ralph-super-simple/README.ko.md`와 `/Users/user/git/harness/ralph-super-simple/skills/ralphss-loop/SKILL.md`는 `.ralphss/loop/{task_name}/MASTER_PLAN.md`, `AGENT.md`, `specs/requirements.md`, `phases/phase-N/PROMPT.md`, `fix_plan.md`, `verify.sh`, `.current_phase`, `logs/`를 둔다. `ralphss-loop`는 phase별 독립 세션 반복과 verify script를 통해 context pollution을 줄인다.

Dream of One의 director context restoration은 단순 요약이 아니라 다음 묶음이어야 한다.
- 최신 product thesis와 pillars.
- 최근 director decisions와 superseded decisions.
- 현재 milestone stage와 gate status.
- unresolved one-way doors.
- evidence paths.
- 다음 decision needed.
- scope cuts and deferred ideas.

이 구조는 `docs/research`가 아니라 active director 문서에 있어야 한다. research 결과는 참고 자료이고, 실제 복원 파일은 `project.md`, `plan.md`, `docs/design/*`, Linear state와 맞물려야 한다.

## 8. Bounded Autonomous Loops at Milestone Scale

`open-ralph-wiggum`은 `/Users/user/git/harness/open-ralph-wiggum/skills/open-ralph-wiggum/SKILL.md`에서 같은 prompt를 반복 주입하고, repo state 관찰을 통해 self-correct하며, completion promise가 나오면 끝난다고 설명한다. `--max-iterations`, `--status`, `--add-context`, `--tasks`, `--rotation`, `--last-activity-timeout`, `--no-questions`가 안전장치다. 중요한 것은 "루프가 끝나는 약속"과 "중간에 human hint를 넣는 통로"가 있다는 점이다.

`bmalph`의 Ralph reference(`/Users/user/git/harness/bmalph/ralph/RALPH-REFERENCE.md`)는 circuit breaker와 session continuity를 더 강하게 둔다. `.ralph/.ralph_session`, `.ralph/.circuit_breaker_state`, `.ralph/status.json`, `.ralph/logs/`, `.ralph/@fix_plan.md`, `.ralph/specs/`가 루프를 지탱한다. no progress, same error, output decline, permission denial이 반복되면 circuit breaker가 열린다. completion도 자연어 "done"이 아니라 `EXIT_SIGNAL`과 completion indicators의 dual verification을 요구한다.

`get-shit-done`의 `/Users/user/git/harness/get-shit-done/get-shit-done/workflows/autonomous.md`는 milestone phase를 자율 순회하지만, phase discovery, progress banner, context existence, discuss skip 여부, phase verification, blocker handling을 게이트로 둔다. `/Users/user/git/harness/get-shit-done/get-shit-done/workflows/audit-milestone.md`는 모든 phase verification을 모아 milestone definition of done을 확인한다. 이 구조는 Dream of One에서 Worker별 issue 실행이 아니라 milestone-scale director loop를 만들 때 참고할 만하다.

Dream of One의 bounded autonomous loop 원칙:
- 루프 입력은 Linear issue 하나가 아니라 milestone goal과 stage gate여야 한다.
- 각 worker는 owned file 또는 owned subsystem이 있어야 한다.
- 모든 루프는 `max iterations`, `exit signal`, `verification command`, `evidence artifact`, `human intervention channel`을 가져야 한다.
- 실패는 "더 시도"가 아니라 circuit breaker reason으로 남겨야 한다.
- milestone 종료는 개별 task completion이 아니라 requirements coverage, design intent survival, evidence coverage로 결정해야 한다.

## 9. Dream of One 적용 결론

Dream of One은 일반 앱보다 director governance가 더 중요하다. 이유는 제품 권위가 코드 품질만으로 유지되지 않기 때문이다. `Player is not an investigator`, `NPCs and Station systems investigate the player`, `Text is where the danger starts`, deterministic Dream Law와 verdict는 설계 rails다. 구현이 성공해도 rails를 침식하면 실패다.

따라서 local harness에서 가져올 상위 패턴은 다음 7개다.

1. `gstack`의 user sovereignty와 decision brief: AI 추천과 director 결정을 분리한다.
2. `gstack-game`의 game-direction, prototype-slice, retro pipeline: "왜 지금 이 게임인가"에서 "무엇을 먼저 실패시킬 것인가"로 내려간다.
3. `get-shit-done`의 milestone state files: ROADMAP, STATE, REQUIREMENTS, AUDIT를 통해 장기 흐름을 복원한다.
4. `Ralph` 계열의 completion promise와 circuit breaker: 자율 반복을 종료 조건과 stagnation detection으로 제한한다.
5. `spec-skill`의 permanent spec: 승인된 의사결정 파일을 삭제하지 않고 재개 지점으로 삼는다.
6. `github-copilot-fc` Ralph-v2의 state machine ownership: Orchestrator, Planner, Executor, Reviewer, Librarian의 쓰기 권한을 분리한다.
7. `ouroboros`의 immutable Seed, EventStore, numerical gates: 모호하면 실행하지 않고, 수렴하지 않으면 종료하지 않는다.

즉시 도입 가능한 director 문서 구조:
- `docs/design/director-thesis.md`: 제품 명제, creative pillars, anti-pillars.
- `docs/design/director-decision-ledger.md`: one-way/two-way 결정과 근거.
- `docs/design/director-stage-roadmap.md`: stage별 목표, gate, evidence.
- `docs/design/director-critique-loop.md`: Director, Contrarian, Systems, Text Danger, Producer 리뷰 절차.
- `docs/design/director-context-restore.md`: 다음 리더십 세션이 읽을 최소 상태.

단, 이 조사는 문서 제안까지다. 현재 작업 범위에서는 위 파일들을 만들지 않았다. 요청된 owned file만 작성했다.

Director Harness Takeaways for Dream of One
