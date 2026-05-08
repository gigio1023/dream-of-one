# Local Ecosystem Skill / Command Patterns

검토 범위: `/Users/user/git/harness` 아래 Claude/Codex/OpenCode ecosystem collection. 단순 목록형 repo는 제외하고, game-development harness에 운영 가치가 있는 skill, command, hook, agent, review loop, context hygiene 패턴만 정리.

## 1. Mode Skill은 "작업 강도"가 아니라 "상태 전이"로 설계

유효 패턴:
- `/Users/user/git/harness/oh-my-codex-staticpayload/skills/ultrawork/SKILL.md`
- `/Users/user/git/harness/oh-my-claude-code-zephyr/skills/ultrawork/SKILL.md`

핵심:
- `intent -> plan -> execute -> verify`를 기본 flow로 두고, 모호하면 interview/research, 명확하면 executor, 병렬성이 필요할 때만 team으로 escalate.
- `.omx/` 또는 `.senate/` 같은 durable state를 먼저 읽고 chat memory를 보조 정보로만 사용.
- "끝까지 계속" 문구는 그대로 가져오면 위험함. 대신 stop 조건, max continuation, verification evidence를 명시한 bounded mode로 바꾸는 편이 적합.

Dream of One 적용:
- `$runtime-slice`: `world_layout.json`, Godot scene, backend schema 중 한 slice만 claim.
- `$dream-law-review`: Dream Law / Cover Test / Exposure / inquest / verdict 영향만 검토.
- `$evidence-run`: Godot smoke + backend check + evidence log를 하나의 terminal verdict로 묶음.

## 2. Slash Command는 script보다 "phase contract"에 가깝게 작성

유효 패턴:
- `/Users/user/git/harness/everything-claude-code-worldflow/commands/orchestrate.md`
- `/Users/user/git/harness/everything-claude-code-worldflow/commands/verify.md`
- `/Users/user/git/harness/omc-codex/commands/auto-plan.md`
- `/Users/user/git/harness/omc-codex/commands/pipeline.md`
- `/Users/user/git/harness/omc-codex/commands/race.md`

핵심:
- `planner -> tdd-guide -> code-reviewer -> security-reviewer`처럼 phase를 명시하고, 각 phase는 handoff 문서만 다음 phase로 전달.
- `/verify`는 build/type/lint/test/git status 순서와 출력 schema를 고정. "검증했다"가 아니라 check별 evidence를 남김.
- `/pipeline`은 primary/fallback model을 phase별로 분리. 한 모델이 실패해도 review phase를 생략하지 않는 구조.
- `/race`는 독립 구현을 비교하는 패턴. 모든 작업에 쓰기보다, 알고리즘/아키텍처 대안이 중요한 subsystem에만 적합.

Dream of One 적용:
- `/game-slice`: plan -> Godot/backend edit -> deterministic checks -> review.
- `/runtime-verify`: `godot --headless --import --path godot`, scene smoke, evidence run, runtime slice smoke, `npm run check --prefix backend/npc-runtime`를 고정 순서로 실행.
- `/design-race`: Station intake, verdict pacing, NPC suspicion scheduling처럼 design alternative가 실제 품질을 좌우하는 경우에만 사용.

## 3. Handoff 문서는 다음 agent가 바로 실행할 만큼만

유효 패턴:
- `/Users/user/git/harness/everything-claude-code-worldflow/commands/orchestrate.md`
- `/Users/user/git/harness/oh-my-codex-sigrid/agents.codex/critic.md`
- `/Users/user/git/harness/oh-my-codex-sigrid/agents.codex/verifier.md`

핵심:
- handoff format은 `Context`, `Findings`, `Files Modified`, `Open Questions`, `Recommendations` 정도면 충분.
- Critic agent는 plan을 승인하기 전에 실제 file reference를 열어 보고, 2-3개 task를 mental simulation.
- Verifier agent는 acceptance criterion별 `VERIFIED / PARTIAL / MISSING`을 fresh evidence와 연결.

Dream of One 적용:
- worker handoff에는 "수정 파일"보다 "권위 변경"을 우선 기록: Dream Law, runtime schema, world layout, scene tree, deterministic fallback 중 무엇을 건드렸는지.
- plan review는 `godot/data/world_layout.json`, `backend/npc-runtime/src/godot/runtime-schema.ts`, `godot/scenes/main.tscn` 같은 실제 경로 확인을 필수화.

## 4. Hook은 자동 수정보다 "중단/경고/증거 저장"에 집중

유효 패턴:
- `/Users/user/git/harness/everything-claude-code-worldflow/hooks/hooks.json`
- `/Users/user/git/harness/omc-codex/hooks/hooks.json`
- `/Users/user/git/harness/omc-codex/prompts/stop-review-gate.md`
- `/Users/user/git/harness/oh-my-claude-code-zephyr/hooks/todo-continuation-enforcer.js`
- `/Users/user/git/harness/oh-my-claude-code-zephyr/hooks/auto-diagnostics.js`
- `/Users/user/git/harness/oh-my-codex-yeachan/docs/codex-native-hooks.md`

핵심:
- `PreToolUse`: long-running dev server는 tmux로 유도, risky command는 경고, random docs 생성을 차단.
- `PostToolUse`: edit 이후 format/type/log audit 같은 가벼운 reminder.
- `Stop`: 이전 turn이 실제 edit-producing turn인지 먼저 확인하고, blocking issue가 있을 때만 `BLOCK`, 아니면 `ALLOW`.
- native hook 검증은 proof boundary를 분리: native hook 호출, plugin dispatch log, tmux/runtime fallback을 섞어 주장하지 않음.

Dream of One 적용:
- Stop gate는 "이전 turn에서 code/data edit가 있었는가"를 확인한 뒤 Godot/backend 필수 check 누락만 block.
- Mermaid hook은 docs diagram 변경 시 `npx -y @mermaid-js/mermaid-cli` 실행 evidence를 요구.
- random docs block은 repo 정책과 충돌 가능. 이 task처럼 지정 research path가 있을 때는 allowlist 기반이어야 함.

## 5. Agent Persona는 역할 경계와 tool 권한이 핵심

유효 패턴:
- `/Users/user/git/harness/everything-claude-code-affaan/.codex/agents/explorer.toml`
- `/Users/user/git/harness/everything-claude-code-affaan/.codex/agents/reviewer.toml`
- `/Users/user/git/harness/oh-my-codex-sigrid/agents.codex/explore.md`
- `/Users/user/git/harness/oh-my-codex-sigrid/agents.codex/critic.md`
- `/Users/user/git/harness/oh-my-codex-sigrid/agents.codex/verifier.md`
- `/Users/user/git/harness/opencode-senate/.opencode/agent/*.md`

핵심:
- Explorer는 read-only, targeted search, absolute path, 관계 설명까지가 output.
- Reviewer는 correctness/security/regression/missing tests 중심. style-only feedback은 제외.
- Critic은 plan 품질, Verifier는 completion evidence를 담당. 구현자와 승인자를 분리.

Dream of One 적용:
- `runtime-explorer`: Godot signal path, backend scheduling path, schema consumer를 read-only로 추적.
- `dream-law-critic`: design plan이 player-investigator framing을 되살리지 않는지 검토.
- `evidence-verifier`: 필수 Godot/backend commands를 직접 실행하고 output 기반 verdict만 허용.

## 6. Team DAG는 "symbolic plan"과 "runtime task id"를 분리

유효 패턴:
- `/Users/user/git/harness/oh-my-codex-yeachan/docs/contracts/repo-aware-team-dag-decomposition.md`
- `/Users/user/git/harness/oh-my-codex-yeachan/docs/contracts/team-runtime-state-contract.md`
- `/Users/user/git/harness/oh-my-codex-yeachan/docs/contracts/runtime-command-event-snapshot-schema.md`

핵심:
- plan 단계의 symbolic node id를 runtime task dependency로 직접 저장하지 않음.
- validate -> topological sort -> task 생성 -> `node_id -> task_id` remap -> dependency patch 순서.
- dispatch/integration/stale 같은 상태는 owner를 명확히 분리. mailbox/tmux evidence를 authority로 오해하지 않음.

Dream of One 적용:
- multi-worker game harness는 `godot-scene`, `runtime-schema`, `world-layout`, `docs-evidence` lane을 분리하되, 같은 파일을 만지는 task는 같은 owner에 배정.
- Beads id와 Linear issue id를 plan symbol로 쓰더라도 runtime claim 상태는 concrete task id로 유지.
- worker inbox에는 owned path, dependency, acceptance check, verification command를 함께 넣어야 함.

## 7. Context Hygiene는 "작고 검증 가능한 기억"만 남김

유효 패턴:
- `/Users/user/git/harness/oh-my-opencode-slim/docs/session-management.md`
- `/Users/user/git/harness/oh-my-opencode-slim/docs/todo-continuation.md`
- `/Users/user/git/harness/oh-my-codex-junghwa/orchestrator/context.py`
- `/Users/user/git/harness/everything-claude-code-worldflow/scripts/hooks/pre-compact.js`
- `/Users/user/git/harness/opencode-senate/.opencode/plugins/senate-plugin.ts`

핵심:
- child session은 alias와 최근 read context만 기억. file read는 최소 line threshold와 max files cap을 둠.
- memory entry는 session/global scope, priority, TTL을 가진 구조화 데이터로 저장.
- compaction에는 active mode, pending tasks, project memory만 compact하게 주입.
- continuation은 opt-in, max count, cooldown, "마지막 assistant message가 질문이면 중단" 같은 gate가 있어야 함.

Dream of One 적용:
- `Dream Harness Memory`는 narrative fact 전체가 아니라 "검증된 authority decision"만 저장.
- context injection은 최근 읽은 파일 8개 이하, active Linear/Beads task, 마지막 verification result로 제한.
- stale memory가 Dream Law나 runtime schema보다 우선하지 않도록 "repo/file authority wins" 규칙 필요.

## 8. Review Loop는 structured review + adversarial review를 분리

유효 패턴:
- `/Users/user/git/harness/omc-codex/commands/adversarial-review.md`
- `/Users/user/git/harness/omc-codex/schemas/review-output.schema.json`
- `/Users/user/git/harness/oh-my-codex-staticpayload/skills/review/SKILL.md`
- `/Users/user/git/harness/oh-my-codex-junghwa/CODE_REVIEW.md`

핵심:
- structured review는 bug/regression/test gap을 찾고 schema로 결과를 제한.
- adversarial review는 "선택한 approach 자체가 맞는가"를 공격. 구현 결함 review와 역할이 다름.
- review output은 severity, file, line, confidence, recommendation을 포함해야 후속 fix routing이 가능.

Dream of One 적용:
- structured review: changed paths, deterministic checks, schema compatibility, missing tests.
- adversarial review: "이 변경이 Dream of One의 핵심 design rails를 약화하는가", "player를 investigator로 되돌리는가", "text danger surface가 흐려지는가".
- stop gate는 critical/high만 block하고 low-level style은 final notes로 남김.

## 9. Registry / Catalog는 taxonomy와 metadata schema만 차용

유효 패턴:
- `/Users/user/git/harness/awesome-claude-skills/config.yaml`
- `/Users/user/git/harness/awesome-claude-skills/scripts/models.py`
- `/Users/user/git/harness/awesome-claude-agents/config.yaml`
- `/Users/user/git/harness/awesome-claude-agents/scripts/models.py`

핵심:
- awesome 계열 README는 catalog value가 크지만 harness 운영에는 noise가 많음.
- 재사용할 부분은 `id`, `name`, `description`, `category`, `tags`, `version`, `repo/path` 같은 metadata shape.
- source priority와 timeout을 둔 수집 모델은 내부 skill registry에도 유용.

Dream of One 적용:
- game harness skill registry는 catalog가 아니라 "언제 발동하는가 / 어떤 authority를 건드리는가 / 어떤 verification을 요구하는가" 중심.
- category 예시: `godot-runtime`, `npc-runtime`, `dream-law`, `evidence`, `docs-mermaid`, `review`.

## 10. 비채택 또는 주의할 패턴

- 무제한 persistence 문구: `/Users/user/git/harness/oh-my-claude-code-zephyr/skills/ultrawork/SKILL.md`의 강한 "do not stop" 류는 bounded stop policy 없이 쓰면 사용자 최신 요청보다 오래된 mode가 우선될 수 있음.
- 자동 docs 차단: `/Users/user/git/harness/everything-claude-code-worldflow/hooks/hooks.json`의 random markdown block은 docs-heavy repo에서는 allowlist가 필요.
- race workflow 남용: `/Users/user/git/harness/omc-codex/commands/race.md`는 cost가 크고 merge burden이 큼. Dream of One에서는 deterministic runtime이나 schema edit보다 design alternative 탐색에만 적합.
- magic keyword routing: `/Users/user/git/harness/opencode-senate/.opencode/plugins/senate-plugin.ts`의 keyword activation은 편하지만 오탐이 생김. repo-local command나 explicit skill call 우선.

## 적용 우선순위

1. `runtime-verify` command: Godot/backend 필수 check를 고정 출력 schema로 묶기.
2. read-only `runtime-explorer`, `dream-law-critic`, `evidence-verifier` agent persona 정의.
3. Stop gate: edit-producing turn + missing verification만 block.
4. compact context: active task, touched authority, latest evidence만 남기는 state summary.
5. DAG handoff: Beads/Linear planning id와 runtime task id remap 기록.

Game Harness Takeaways for Dream of One
