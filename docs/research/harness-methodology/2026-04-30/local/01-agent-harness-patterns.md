# Local Agent Harness Patterns

조사 범위: `/Users/user/git/harness` 아래 `gstack`, `gstack-game`, `github-copilot-fc`, `superpowers-obra`, `get-shit-done`, `open-ralph-wiggum`, `bmalph`, `ralph-super-simple`, `spec-skill`, `ouroboros`.

목적: Codex/Claude Code에 길고 넓은 game-development 작업을 맡길 때 drift를 줄이는 재사용 패턴을 추출한다.

## 핵심 패턴 요약

- **Seed/Spec를 먼저 고정한다.** `spec-skill/SKILL.md`, `ouroboros/docs/guides/seed-authoring.md`, `get-shit-done/commands/gsd/plant-seed.md`는 구현 전에 goal, scope, constraints, acceptance criteria, deferred ideas를 별도 파일로 만든다.
- **계획과 실행을 분리한다.** `gstack-game/.claude/skills/issue-plan/SKILL.md`는 Research → Innovate → Plan만 수행하고, `issue-action/SKILL.md`가 plan을 읽어 구현한다.
- **Stage gate를 명시한다.** `get-shit-done/references/gates.md`는 Pre-flight, Revision, Escalation, Abort gate를 구분한다. `superpowers-obra/skills/brainstorming/SKILL.md`는 design approval 전 구현 금지를 hard gate로 둔다.
- **Context는 파일로 저장하고 복원한다.** `gstack/context-save/SKILL.md`, `get-shit-done/workflows/pause-work.md`, `github-copilot-fc/.docs/reference/ralph/active-session-lifecycle-contract.md`는 세션 상태를 작업 tree 밖 또는 전용 디렉터리에 저장한다.
- **역할별 review가 drift를 잡는다.** `gstack/plan-ceo-review/SKILL.md`, `gstack/plan-eng-review/SKILL.md`, `github-copilot-fc/agents/ralph-v2/README.md`, `ouroboros/src/ouroboros/agents/consensus-reviewer.md`는 Planner, Executor, Reviewer, Librarian, CEO, Eng, QA 같은 역할을 분리한다.
- **반복 loop는 종료 조건과 회로 차단이 필요하다.** `open-ralph-wiggum/README.md`, `bmalph/ralph/RALPH-REFERENCE.md`, `ralph-super-simple/README.md`는 max iterations, completion promise, abort promise, circuit breaker, `EXIT_SIGNAL`을 둔다.
- **Verification은 summary를 믿지 않는다.** `superpowers-obra/skills/verification-before-completion/SKILL.md`, `get-shit-done/agents/gsd-verifier.md`, `ouroboros/skills/evaluate/SKILL.md`는 fresh command output, goal-backward verification, mechanical/semantic review를 요구한다.

## Seed / Spec 파일

좋은 harness는 작업 시작 prompt보다 오래 남는 seed/spec 파일을 만든다.

- `spec-skill/SKILL.md`: `.claude/specs/<feature-name>.md`에 Status, Overview, Motivation, Scope In/Out, Technical Design, Definition of Done, Risks, Tasks를 저장한다. 승인 전 source file 수정은 금지한다.
- `ouroboros/docs/guides/seed-authoring.md`: seed YAML에 `goal`, `acceptance_criteria`, `ontology_schema`, `metadata.ambiguity_score`를 요구한다. ambiguity score가 높으면 실행보다 interview를 먼저 한다.
- `get-shit-done/commands/gsd/plant-seed.md`: `.planning/seeds/SEED-NNN-slug.md`에 아직 당장 구현하지 않을 아이디어의 why, when, breadcrumbs를 저장한다.
- `github-copilot-fc/.docs/reference/ralph/specs-frontmatter-convention.md`: spec frontmatter를 `title`, `status`, `version`, `created_at`, `updated_at` 5개 필드로 제한해 추적 가능한 artifact로 만든다.
- `gstack-game/skills/prototype-slice-plan/SKILL.md`: GDD와 upstream artifact를 읽고 한 번에 하나의 prototype slice만 추천한다. 각 slice는 hypothesis, build, fake, failure condition, cost를 가진다.

재사용 원칙: game 작업은 "큰 요구사항"을 바로 코드로 보내지 말고, 변경 불가능한 intent seed와 변경 가능한 execution plan을 분리해야 한다.

## Stage Gate와 상태 머신

넓은 작업은 "다음에 뭘 할지"를 agent 판단에 계속 맡기면 drift가 생긴다. 좋은 harness는 상태 전이를 파일과 gate로 제한한다.

- `github-copilot-fc/agents/ralph-v2/README.md`: INITIALIZING → PLANNING → BATCHING → EXECUTING_BATCH → REVIEWING_BATCH → KNOWLEDGE_EXTRACTION → ITERATION_REVIEW → COMPLETE 상태 머신을 둔다.
- `github-copilot-fc/.docs/reference/ralph/ralph-finalized-workflow-contract.md`: Orchestrator를 single source of truth로 두고 Planner, Questioner, Executor, Reviewer, Librarian의 병렬 가능 구간과 순차 구간을 고정한다.
- `get-shit-done/docs/COMMANDS.md`: discuss → plan → execute → verify 흐름을 별도 command와 artifact로 나눈다.
- `get-shit-done/references/gates.md`: revision loop는 bounded loop이며 stall detection과 abort path가 있어야 한다.
- `gstack/autoplan/SKILL.md`: CEO/design/eng/DX review gauntlet을 자동으로 통과시키되 마지막 approval gate를 둔다.

재사용 원칙: 상태는 prompt 문맥이 아니라 artifact와 label로 표현해야 한다. "계획됨", "실행 중", "검토 중", "검증 완료"가 파일 또는 issue state에 남아야 한다.

## Context 저장/복원

긴 작업의 실패 지점은 model context 손실이다. 조사한 harness들은 context를 별도 저장소에 둔다.

- `gstack/SKILL.md`: `~/.gstack/projects/$SLUG` 아래 `learnings.jsonl`, `timeline.jsonl`, `checkpoints/`, review logs를 저장한다.
- `gstack/context-restore/SKILL.md`: 최신 checkpoint, timeline tail, review count, learnings를 복원해 다음 agent가 이어받게 한다.
- `get-shit-done/workflows/pause-work.md`: `.planning/HANDOFF.json`과 `.continue-here.md`에 current position, completed/remaining work, decisions, blockers, modified files, required reading을 쓴다.
- `get-shit-done/workflows/resume-project.md`: `.planning/HANDOFF.json`, incomplete PLAN, interrupted agents를 읽고 context-aware next action을 제안한다.
- `open-ralph-wiggum/README.md`: `.ralph/ralph-loop.state.json`, `.ralph/ralph-history.json`, `.ralph/ralph-context.md`, `.ralph/ralph-tasks.md`로 loop state를 보존한다.
- `bmalph/ralph/RALPH-REFERENCE.md`: `.ralph_session`, `.loop_start_sha`, `status.json`, `live.log`로 session continuity를 유지한다.

재사용 원칙: context restore는 "대화 이어가기"가 아니라 작업 재구성이다. 목표, 결정, blockers, 검증 결과, 다음 action이 machine-readable하게 남아야 한다.

## Role Review와 다중 검토

역할 분리는 같은 agent가 만든 계획을 같은 관점으로 계속 합리화하는 문제를 줄인다.

- `gstack/plan-ceo-review/SKILL.md`: scope, product risk, user value를 CEO 관점에서 본다.
- `gstack/plan-eng-review/SKILL.md`: architecture, tests, performance, implementation risk를 Eng 관점에서 본다.
- `gstack/review/checklist.md`: SQL/data safety, race condition, LLM trust boundary, shell injection, enum completeness를 critical pass에서 먼저 본다.
- `superpowers-obra/skills/subagent-driven-development/SKILL.md`: task마다 fresh subagent가 구현하고, spec compliance review 다음 code quality review를 실행한다.
- `github-copilot-fc/agents/ralph-v2/README.md`: Orchestrator, Planner, Questioner, Executor, Reviewer, Librarian의 artifact ownership을 나눈다.
- `ouroboros/README.md`: Socratic Interviewer, Ontologist, Seed Architect, Evaluator, Contrarian, Hacker, Simplifier, Researcher, Architect 같은 Nine Minds 역할을 둔다.

재사용 원칙: game-development에서는 Eng review만으로 부족하다. feel, fiction, deterministic product law, player-facing text를 별도 review role로 봐야 한다.

## Planning / Execution 분리

계획 agent가 실행까지 하면 scope를 스스로 바꾸기 쉽다. 좋은 harness는 "계획 파일을 쓰는 agent"와 "계획 파일만 실행하는 agent"를 분리한다.

- `gstack-game/.claude/skills/issue-plan/SKILL.md`: Research 단계에서는 제안 금지, Innovate 단계에서 2-3개 접근 비교, Plan 단계에서 구현 계획을 쓴다.
- `gstack-game/.claude/skills/issue-action/SKILL.md`: `.tmp/deep-dive/issue-{id}/plan.md`가 없으면 실행하지 않는다. 새 comment가 계획을 바꾸면 중단한다.
- `get-shit-done/workflows/plan-phase.md`: Research → Plan → Verify를 orchestrator가 돌리지만 branch mutation은 하지 않는다.
- `get-shit-done/workflows/execute-phase.md`: orchestrator는 직접 구현하지 않고 plan별 subagent/worktree를 조정한다.
- `superpowers-obra/skills/writing-plans/SKILL.md`: 계획은 exact files, exact commands, expected output, commit step을 가져야 하며 placeholder를 금지한다.
- `ralph-super-simple/skills/ralphss-loop/SKILL.md`: skill은 loop 파일만 만들고 실제 code/testing/git 작업은 하지 않는다.

재사용 원칙: Dream of One 작업도 Linear issue → research/design artifact → implementation plan → execution으로 나누고, 실행 agent는 plan 외 scope를 추가하지 못하게 해야 한다.

## Persistent Task Loop

loop형 harness는 "계속 해"를 자동화하지만, 종료 조건이 약하면 drift를 증폭한다.

- `open-ralph-wiggum/README.md`: 같은 prompt를 반복 실행하되 `--max-iterations`, `--completion-promise`, `--abort-promise`, `--tasks`, `--last-activity-timeout`을 둔다.
- `open-ralph-wiggum/ralph.ts`: final non-empty line의 completion promise를 검사하고, 파일 변경 없음과 history를 추적한다.
- `bmalph/ralph/RALPH-REFERENCE.md`: stagnation, same error, output decline, permission denial을 circuit breaker로 감지한다.
- `ralph-super-simple/README.md`: phase별 prompt를 `EXIT_SIGNAL: true`가 나올 때까지 실행하고, phase 뒤에 `verify.sh`를 실행한다.
- `ralph-super-simple/skills/ralphss-loop/SKILL.md`: `fix_plan.md`는 1 task = 1 commit, task당 3-5 file changes를 권장한다.
- `gstack-game/.claude/skills/pr-review-loop/SKILL.md`: REVIEW → COMMENT → FIX loop를 최대 3회로 제한하고 P0/P1을 먼저 고친다.

재사용 원칙: loop는 task queue, max loop, abort signal, no-progress detector, verification script 없이는 쓰지 않는 편이 낫다.

## Acceptance Criteria와 Verification

검증은 "테스트 돌림"보다 넓다. 특히 game 작업은 engineering done과 design done이 다르다.

- `gstack-game/skills/implementation-handoff/references/acceptance-patterns.md`: Engineering Done과 Design Done의 two-layer acceptance를 둔다. Layer 1이 통과해도 Layer 2가 실패하면 NOT DONE이다.
- `ouroboros/docs/guides/seed-authoring.md`: acceptance criteria는 one concern, testable, dependency-ordered, specific deliverables여야 한다.
- `get-shit-done/agents/gsd-planner.md`: 모든 verify는 automated command를 포함해야 하며, 없으면 Wave 0에서 test scaffold를 만든다.
- `get-shit-done/agents/gsd-verifier.md`: SUMMARY claim을 믿지 않고 ROADMAP success criteria와 PLAN frontmatter에서 must-have를 역산한다.
- `get-shit-done/workflows/verify-work.md`: UAT는 expected observable behavior를 한 번에 하나씩 보여주고 gap을 fix plan으로 되돌린다.
- `ouroboros/skills/evaluate/SKILL.md`: Mechanical, Semantic, Multi-Model Consensus 3단계로 평가한다.
- `superpowers-obra/skills/verification-before-completion/SKILL.md`: fresh verification output 없이 완료 선언을 금지한다.

재사용 원칙: game harness의 AC는 build/test뿐 아니라 "플레이어가 어떤 텍스트 위험을 관찰해야 하는가", "시스템이 어떤 deterministic verdict를 내야 하는가"를 포함해야 한다.

## Drift 방지 원칙

- **Intent와 execution을 분리한다.** Seed/spec는 why와 invariant를 보존하고, plan은 how와 task order를 보존한다.
- **Deferred scope를 명시한다.** `get-shit-done`의 seed/deferred model처럼 "나중에 할 것"을 현재 plan에서 제거해야 한다.
- **Artifact owner를 둔다.** `github-copilot-fc` Ralph v2처럼 누가 plan, task, report, review, knowledge를 쓰는지 고정한다.
- **Review freshness를 확인한다.** `gstack/plan-eng-review/SKILL.md`는 review commit과 HEAD 차이를 보고 stale review를 감지한다.
- **Bounded loop만 허용한다.** max iteration, stall detection, abort gate가 없으면 persistent loop가 scope creep을 만든다.
- **검증 결과를 저장한다.** command, output 요약, 실패 원인, gap plan이 다음 context restore의 입력이어야 한다.
- **Human gate는 판단에만 쓴다.** `get-shit-done/references/checkpoints.md`처럼 Claude가 실행 가능한 check는 Claude가 실행하고, 사람은 subjective/visual/auth 판단에만 들어간다.

## Game Harness Takeaways for Dream of One

- Linear issue 하나마다 짧은 seed/spec를 먼저 둔다. goal, non-goal, deterministic product law, acceptance criteria, verification commands를 포함한다.
- plan과 execution을 분리한다. research/design 단계는 `godot/`, `backend/npc-runtime/`, `godot/data/world_layout.json`의 근거를 수집하고, execution 단계는 승인된 plan만 구현한다.
- Dream Law, Cover Test, Exposure, Station intake, inquest, verdict, session termination은 AC의 최상위 invariant로 둔다.
- text danger surface를 검증 항목으로 만든다. "어떤 NPC/system text가 플레이어를 조사하는가"와 "그 텍스트가 어떤 deterministic evidence를 남기는가"를 AC에 적는다.
- game 작업 완료는 two-layer로 판정한다. Engineering Done은 `godot --headless --import --path godot`, scene smoke, evidence run, runtime slice smoke, `npm run check --prefix backend/npc-runtime` 통과다. Design Done은 플레이어가 investigator가 아니고 Station/NPC가 player를 조사한다는 경험이 유지되는지 확인하는 별도 review다.
- context save는 필수다. issue별로 decisions, modified files, verification output, blockers, next action을 남겨 다른 Worker가 같은 방향으로 이어받게 한다.
- persistent loop를 쓸 때는 task queue, max iteration, abort signal, no-progress detector, verification script를 함께 둔다.
- old engine/runtime path를 active tree로 되살리지 않는다. historical behavior가 필요하면 git history에서 근거만 회수하고 현재 runtime path에 맞게 재설계한다.
