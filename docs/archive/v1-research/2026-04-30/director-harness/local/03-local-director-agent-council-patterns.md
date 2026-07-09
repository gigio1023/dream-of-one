# 로컬 Harness 조사: Game Director용 Agent Council 패턴

조사 범위는 `/Users/user/git/harness` 아래의 `everything-claude-code-*`, `oh-my-claude*`, `oh-my-codex*`, `omc-codex`, `oh-my-opencode*`, `opencode-senate`, `awesome-*` 계열이다. 목적은 목록 수집이 아니라 Dream of One의 Game Director가 재사용할 수 있는 orchestration 방법을 추출하는 것이다.

## 핵심 결론

Game Director에는 "더 많은 agent"보다 "역할이 겹치지 않는 판단 회의체 + 명확한 stop gate + bounded loop + 결정 기록"이 필요하다. 가장 재사용 가치가 큰 조합은 `opencode-senate`의 staged team runtime, `oh-my-claude-x0x888`의 council/lens 평가, `omc-codex`의 cross-model adversarial workflow, `oh-my-opencode-opensoft`의 bounded Ralph loop, `everything-claude-code-worldflow`의 handoff/verification/checkpoint 구조다.

## 1. Director Council: 역할이 겹치지 않는 평가 패널

`/Users/user/git/harness/oh-my-claude-x0x888/bundle/dot-claude/skills/council/SKILL.md`가 가장 직접적인 council 패턴이다. 이 skill은 프로젝트를 먼저 분류한 뒤 3-6개의 lens를 선택하고, 모든 lens를 한 번에 parallel dispatch한 뒤, 모든 결과가 돌아올 때까지 synthesis를 금지한다.

재사용할 규칙은 세 가지다.

- **Lens는 서로 다른 질문만 한다**: `product-lens`, `design-lens`, `visual-craft-lens`, `security-lens`, `data-lens`, `sre-lens`, `growth-lens`가 같은 산출물을 서로 다른 전문 관점으로 평가한다.
- **상위 finding은 재검증한다**: final report 전에 top 2-3 findings를 `oracle` 같은 별도 reviewer로 확인한다.
- **갈등은 숨기지 않는다**: "Cross-Perspective Tensions" 섹션으로 product/security/design 간 tension을 그대로 드러낸다.

Dream of One에서는 이를 `Director Council`로 바꿀 수 있다.

- `Drama Lens`: NPC가 플레이어를 조사하는 압력이 충분한가.
- `Dream Law Lens`: Dream Law, Cover Test, Exposure, inquest, verdict 권위가 흔들리지 않는가.
- `Text Danger Lens`: 텍스트가 단순 설명이 아니라 위험해지는 지점으로 작동하는가.
- `Pacing Lens`: 세션 진행이 조사/압박/판정으로 수렴하는가.
- `Taste Lens`: 세계가 generic mystery가 아니라 Dream of One 고유의 감각을 갖는가.

## 2. Stage Pipeline: 회의체를 실행으로 바꾸는 구조

`/Users/user/git/harness/opencode-senate/.opencode/skills/team/SKILL.md`는 `team-plan -> team-prd -> team-exec -> team-verify -> team-fix`를 canonical runtime으로 둔다. 각 stage마다 agent routing이 다르고, verify 실패 시 fix로 돌아가되 max attempts로 무한 루프를 막는다.

Director Harness에는 이 stage를 다음처럼 바꾸는 편이 맞다.

- `director-brief`: 현재 runtime slice, player exposure, station state를 요약한다.
- `council-read`: 독립 lens가 narrative/system risk를 읽는다.
- `director-decision`: Game Director가 이번 tick의 우선순위를 결정한다.
- `scenario-exec`: 선택된 beat, NPC pressure, station reaction을 생성한다.
- `authority-verify`: Dream Law와 deterministic backend contract를 검증한다.
- `fix-or-stop`: 작은 수정은 반복하고, 구조적 모순은 blocked decision으로 남긴다.

`/Users/user/git/harness/everything-claude-code-worldflow/commands/orchestrate.md`도 같은 방향을 보강한다. 이 파일은 `planner -> tdd-guide -> code-reviewer -> security-reviewer`처럼 agent chain 사이에 handoff document를 만들도록 요구한다. Director 단계 전환에서도 "이전 lens가 무엇을 봤고, 무엇을 남겼는지"를 짧은 handoff로 남기는 것이 중요하다.

## 3. Decision Records: 결정과 기각 사유를 짧게 남긴다

`/Users/user/git/harness/opencode-senate/.opencode/skills/team/SKILL.md`의 handoff 형식은 `Decided`, `Rejected`, `Risks`, `Files`, `Remaining`을 10-20줄로 제한한다. `everything-claude-code-worldflow/agents/architect.md`는 ADR 형식으로 Context, Decision, Consequences, Alternatives Considered, Status, Date를 남긴다.

Game Director에는 긴 design doc보다 짧은 `Director Decision Record`가 맞다.

```markdown
## DDR: <turn|slice|beat id>
- **Decided**: 이번 director tick에서 선택한 pressure/beat/verdict 방향.
- **Rejected**: 버린 대안과 이유.
- **Authority**: Dream Law / Cover Test / Exposure 중 어떤 규칙이 결정권을 가졌는가.
- **Risks**: 플레이어가 investigator처럼 보이거나 텍스트 danger가 약해질 위험.
- **Next**: 다음 tick에서 반드시 확인할 조건.
```

이 기록은 "왜 이 NPC가 이 말을 했는가"를 사후 디버깅할 때 gameplay evidence가 된다.

## 4. Adversarial Review: 구현 결함보다 접근 자체를 공격한다

`/Users/user/git/harness/omc-codex/prompts/adversarial-review.md`는 "confidence를 깨는 것"을 명시한다. 공격 표면은 auth, data loss, rollback, race, empty-state, migration 같은 고비용 실패다. `commands/adversarial-review.md`도 ordinary review가 아니라 design choice와 assumption을 challenge하는 review로 정의한다.

Dream of One에 맞게 바꾸면 adversarial reviewer는 다음 질문을 해야 한다.

- 이 scene은 플레이어를 조사받는 대상으로 만들고 있는가, 아니면 플레이어를 탐정으로 만들고 있는가.
- NPC 말풍선이 place where danger starts인가, 아니면 lore 설명인가.
- Dream Law authority가 텍스트 생성에 밀려 약해졌는가.
- Exposure 변화가 deterministic evidence 없이 기분으로 움직였는가.
- verdict/session termination이 narrative flourish 때문에 불명확해졌는가.

`/Users/user/git/harness/omc-codex/prompts/stop-review-gate.md`의 stop gate도 중요하다. 이전 turn이 실제 edit-producing turn인지 확인하고, code changes가 있을 때만 stop-time review를 수행한다. Director loop도 "실제 gameplay state를 바꾼 tick"에만 stop gate를 걸어야 한다.

## 5. Design Race: 여러 해석을 격리해서 경쟁시킨다

`/Users/user/git/harness/omc-codex/commands/race.md`는 N개의 Claude racer와 M개의 Codex racer가 같은 task를 isolated environment에서 독립 해결하고, correctness/completeness/simplicity/edge cases/performance 기준으로 tournament comparison을 한다.

이 패턴은 game director의 `Design Race`에 바로 쓸 수 있다.

- Racer A: Dream Law를 가장 강하게 밀어붙이는 beat.
- Racer B: NPC social pressure를 가장 강하게 밀어붙이는 beat.
- Racer C: Station intake/inquest 절차를 가장 강하게 밀어붙이는 beat.
- Judge: text danger, deterministic authority, player-not-investigator rail, pacing을 기준으로 winner 또는 merge를 선택한다.

중요한 점은 racer들이 서로를 보지 않는다는 것이다. 같은 prompt에서 하나의 model이 "대안 A/B/C"를 쓰는 것보다, 별도 context에서 나온 해석을 비교하는 편이 실제 diversity가 높다.

`/Users/user/git/harness/omc-codex/commands/forge.md`도 보완 패턴이다. plan, blind test, build, stress, review를 cross-model로 나누며, blind test 단계에서는 builder의 architecture plan을 test writer에게 숨긴다. Director Harness에서는 writer가 먼저 "scene spec"을 만들고, 별도 tester가 spec만 보고 violation tests를 만들게 할 수 있다.

## 6. Persistent but Bounded Strategy Loop

`/Users/user/git/harness/oh-my-opencode-opensoft/src/hooks/ralph-loop/constants.ts`는 기본 max iteration을 100으로 둔다. `src/hooks/ralph-loop/index.ts`는 `<promise>DONE</promise>` 같은 completion promise가 transcript 또는 session message에 나타났는지 확인하고, 없으면 continuation prompt를 주입한다.

`/Users/user/git/harness/opencode-senate/.opencode/skills/ralph/SKILL.md`는 PRD story 단위로 acceptance criteria를 확인하고 reviewer approval, deslop pass, regression re-verification까지 거친 뒤에만 종료한다. 반면 `/Users/user/git/harness/oh-my-codex-junghwa/.codex/skills/ralph/SKILL.md`는 "no max attempts" 철학에 가깝다.

Dream of One에는 무한 persistence가 위험하다. Director loop는 bounded여야 한다.

- 한 gameplay tick 안에서는 최대 3회 repair.
- 같은 authority violation이 2회 반복되면 생성 반복을 멈추고 deterministic fallback.
- session-level 전략 loop는 max N ticks 또는 inquest/verdict 도달 시 종료.
- completion promise는 "interesting prose"가 아니라 authority state로 판단한다.

즉, Ralph의 "멈추지 않음"은 채택하되 `max_iterations`, repeated-error circuit breaker, deterministic fallback을 반드시 붙인다.

## 7. Stop Gates: 멈춤을 품질 판단으로 만든다

`/Users/user/git/harness/oh-my-claude-x0x888/AGENTS.md`는 reviewer-style agents가 마지막 줄에 `VERDICT: CLEAN`, `VERDICT: SHIP`, `VERDICT: FINDINGS (N)`, `VERDICT: BLOCK (N)`을 쓰도록 강제한다. `record-reviewer.sh` 계열 hook이 이 verdict line을 읽어 gate dimension을 tick한다.

`/Users/user/git/harness/oh-my-claude-techdufus/plugins/oh-my-claude/hooks/todo_enforcer.py`는 incomplete todo가 있으면 stop을 막는다. `verification_reminder.py`는 agent task 완료 후 claim을 직접 확인하라고 주입한다. `oh-my-opencode-opensoft/src/hooks/todo-continuation-enforcer.ts`도 incomplete todo가 있으면 continuation prompt를 넣는다.

Director Harness의 stop gate는 다음 dimension으로 충분하다.

- `authority_clean`: Dream Law / Cover Test / Exposure state가 schema와 일치한다.
- `player_role_clean`: 플레이어가 조사자가 아니라 조사 대상이다.
- `text_danger_clean`: 생성 텍스트가 위험/압박/증거로 작동한다.
- `determinism_clean`: backend-owned state가 prose에 의해 임의 변경되지 않았다.
- `session_exit_clean`: inquest/verdict/termination 조건이 명확하다.

각 reviewer는 final line contract를 써야 한다. 예: `VERDICT: PASS` 또는 `VERDICT: BLOCK (2)`.

## 8. Role Personas: agent 이름보다 권한 경계가 중요하다

`/Users/user/git/harness/oh-my-claude-code-zephyr/AGENTS.md`는 `orchestrator`, `explore`, `librarian`, `oracle`, `frontend-ui-ux-engineer`, `document-writer`, `multimodal-looker`를 용도와 비용으로 구분한다. 특히 `oracle`은 2회 이상 실패하거나 architecture decision이 필요할 때만 쓰도록 제한한다.

`/Users/user/git/harness/opencode-senate/.opencode/agent/critic.md`는 read-only final quality gate이며, plan/code를 multi-perspective로 공격하고 missing gap을 찾는다. `architect.md`도 read-only로 root cause와 tradeoff를 담당한다. 이 둘은 구현자가 아니라 판단자다.

`/Users/user/git/harness/oh-my-claude-x0x888/bundle/dot-claude/agents/metis.md`와 `abstraction-critic.md`도 재사용 가치가 높다. Metis는 plan의 hidden assumption과 validation gap을 잡고, abstraction-critic은 "해결책의 모양이 문제의 모양과 맞는가"를 본다.

Dream of One용 persona는 권한을 분리해야 한다.

- `Director`: 최종 선택권. 직접 prose를 길게 쓰지 않고 lens 결과를 통합한다.
- `Rules Counsel`: deterministic authority만 본다. write 권한 없음.
- `NPC Pressure Designer`: NPC가 플레이어를 어떻게 의심/압박하는지 설계한다.
- `Station Prosecutor`: intake, inquest, verdict 흐름을 담당한다.
- `Text Hazard Reviewer`: 대사/기록/통지가 위험해지는 지점인지 검토한다.
- `Taste Reviewer`: generic mystery, generic surrealism, generic noir를 걸러낸다.
- `Verifier`: runtime schema, smoke checks, evidence를 확인한다.

## 9. Portfolio / Taste Review

`/Users/user/git/harness/oh-my-claude-x0x888/bundle/dot-claude/skills/council/SKILL.md`의 `--polish` 모드는 engineering audit이 아니라 taste/excellence 평가를 위해 `visual-craft-lens`, `product-lens`, `design-lens` 중심으로 roster를 좁힌다. soul, signature, voice, negative space, first-five-minutes, no-cloning discipline 같은 기준을 추가한다.

`/Users/user/git/harness/oh-my-claude-x0x888/bundle/dot-claude/agents/visual-craft-lens.md`는 palette, typography, layout rhythm, depth, visual signature, anti-AI-generic pattern, archetype anti-cloning을 평가한다. `frontend-design/SKILL.md`는 9-section Design Contract를 먼저 세우고, brand archetype을 anchor가 아니라 anti-anchor로 사용한다.

Dream of One에서 taste review는 UI보다 world tone과 systemic dread에 맞춰야 한다.

- **Soul**: 세션이 "AI가 만든 미스터리"가 아니라 "Station이 플레이어를 읽고 있다"는 느낌을 주는가.
- **Signature**: Dream Law, Cover Test, Exposure, inquest/verdict 중 하나가 매 slice에서 감각적으로 남는가.
- **Voice**: NPC/Station/system text가 같은 세계의 법과 절차를 공유하는가.
- **No-cloning**: Disco Elysium식 조사극, SCP 문서체, generic liminal horror로 기울지 않는가.
- **First five minutes**: 플레이어가 초반부터 "내가 조사하는 것이 아니라 내가 조사당한다"를 이해하는가.

이 review는 production polish gate가 아니라 director taste gate다. Pass/fail 기준은 "좋은 문장"이 아니라 "Dream of One의 제품 권위가 느껴지는가"여야 한다.

## 10. Context와 Memory: 길게 기억하지 말고 압축 형식을 강제한다

`/Users/user/git/harness/oh-my-opencode-opensoft/src/hooks/compaction-context-injector/index.ts`는 compaction summary에 User Requests, Final Goal, Work Completed, Remaining Tasks, MUST NOT Do를 반드시 포함시킨다. `everything-claude-code-worldflow/skills/strategic-compact/SKILL.md`는 arbitrary compaction 대신 exploration 후, milestone 후, context shift 전에 manual compact를 권장한다.

Game Director도 모든 과거를 들고 있으면 drift가 생긴다. 필요한 것은 bounded strategy memory다.

- 현재 session objective.
- 최근 3개 director decisions.
- 현재 authority state.
- 반복 금지된 failure pattern.
- 다음 tick의 pending condition.

`/Users/user/git/harness/everything-claude-code-worldflow/skills/continuous-learning/SKILL.md`는 session end에서 reusable pattern을 추출한다. Dream of One에서는 "좋았던 scene"을 저장하기보다 "반복적으로 실패한 authority/tone pattern"을 저장하는 쪽이 더 안전하다.

## 11. Background Agent 운영: 병렬성에는 depth와 concurrency 제한이 필요하다

`/Users/user/git/harness/oh-my-opencode-code-yeongyu/src/features/background-agent/manager.ts`는 background task를 queue에 넣고 concurrency key로 처리한다. `subagent-spawn-limits.ts`는 maxDepth를 넘으면 spawn을 막고, 같은 root session의 descendant count를 관리한다. `task-poller.ts`는 stale timeout을 final cancellation으로 처리한다.

Director Harness에서 council/lens를 병렬화할 때도 같은 guard가 필요하다.

- 한 director tick의 council dispatch 수를 제한한다.
- lens가 다른 lens를 spawn하지 못하게 한다.
- stale lens는 결과 없이 pending으로 남기지 않고 terminal `inconclusive`로 닫는다.
- long-running strategy agent는 parent director tick을 block하지 않게 background로 격리한다.

병렬성은 wall-clock을 줄이지만, world authority를 흔들 수 있다. Game Director의 최종 결정은 항상 단일 reducer가 해야 한다.

## 12. Catalogs에서 얻을 신호

`awesome-*` 계열은 개별 항목보다 생태계의 반복 패턴만 볼 가치가 있다. `/Users/user/git/harness/awesome-claude-code-and-skills/readme.md`와 `/Users/user/git/harness/awesome-claude-code-jqueryscript/README.md`는 orchestration, TDD, code review, security review, design skills, persistent planning, memory/context management가 반복적으로 등장함을 보여준다. `/Users/user/git/harness/awesome-claude-code-hesreallyhim/.claude/commands/evaluate-repository.md`는 Claude Code ecosystem repo를 평가할 때 hooks, commands, persistent state, implicit execution, side effects를 별도 risk surface로 본다.

Dream of One 관점에서 catalog의 결론은 단순하다.

- Agent marketplace는 role library로만 사용한다.
- Director architecture는 local product rules에서 시작한다.
- 외부 skill 이름을 늘리는 것보다 local verdict contract와 deterministic fallback이 더 중요하다.

## 적용 우선순위

1. `Director Decision Record`를 먼저 만든다. 결정/기각/authority/risk/next만 기록한다.
2. `Director Council`을 4-6개 lens로 제한한다. Lens는 read-only여야 한다.
3. `Design Race`를 scene/beat 후보 생성에만 사용한다. Winner 선택은 deterministic reducer가 한다.
4. `Adversarial Review`를 stop gate에 붙인다. 공격 질문은 Dream of One rails에 맞춘다.
5. `Persistent Loop`는 max repair count와 repeated-error breaker를 둔다.
6. `Taste Review`는 prose quality가 아니라 "player is investigated" 감각과 Dream Law authority를 본다.

## Director Harness Takeaways for Dream of One

- Council은 다양한 의견을 내는 회의가 아니라, 서로 다른 실패 모드를 찾는 독립 lens 묶음이어야 한다.
- Game Director는 agent 중 하나가 아니라 단일 reducer다. 모든 lens, race, review 결과는 Director가 deterministic authority와 맞춰 최종 선택한다.
- Adversarial reviewer는 "버그 있나"보다 "이 접근이 Dream of One을 배반하나"를 묻는다.
- Design race는 creativity를 위해 쓰고, state mutation은 winner 선정 뒤 한 번만 한다.
- Stop gate는 prose 품질보다 product authority를 막아야 한다: Dream Law, Cover Test, Exposure, inquest, verdict, termination.
- Persistent loop는 bounded여야 한다. 같은 실패가 반복되면 더 쓰게 하지 말고 deterministic fallback으로 닫는다.
- Taste review는 no-cloning discipline을 포함해야 한다. generic investigator game, generic surreal mystery, generic lore dump를 모두 실패로 본다.

Director Harness Takeaways for Dream of One
