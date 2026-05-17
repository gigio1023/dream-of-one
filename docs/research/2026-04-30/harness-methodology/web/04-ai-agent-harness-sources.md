# AI Agent Harness Sources

이 문서는 Codex/Claude Code에게 긴 게임 개발 작업을 맡기기 위한 운영 원칙을 정리한다. 핵심은 더 긴 지시문을 쓰는 것이 아니라, 에이전트가 읽고 검증하고 이어갈 수 있는 저장소 내부 구조를 만드는 것이다.

## Source Map

| Source | Type | URL | Use in harness |
|---|---|---|---|
| OpenAI, `Harness engineering: leveraging Codex in an agent-first world` | official engineering article | https://openai.com/index/harness-engineering/ | `AGENTS.md`는 지도, `docs/`는 SoT, 실행 계획과 품질 문서를 저장소에 둔다. |
| OpenAI Developers, `Custom instructions with AGENTS.md` | official Codex docs | https://developers.openai.com/codex/guides/agents-md | Codex instruction discovery, nested overrides, byte limits, verification commands. |
| OpenAI Developers, `Codex CLI` | official Codex docs | https://developers.openai.com/codex/cli | Codex CLI를 로컬 실행자와 자동화 surface로 다룬다. |
| OpenAI, `Unrolling the Codex agent loop` | official engineering article | https://openai.com/index/unrolling-the-codex-agent-loop/ | agent loop가 tool observation을 누적하므로 장기 작업에서는 context budget과 state artifacts가 중요하다. |
| Anthropic, `Create custom subagents` | official Claude Code docs | https://code.claude.com/docs/en/sub-agents | subagent는 단일 책임, 명확한 description, 제한된 tool access, version control이 원칙이다. |
| Anthropic, `How Claude remembers your project` | official Claude Code docs | https://code.claude.com/docs/en/memory | `CLAUDE.md`, rules, skills, auto memory의 역할 분리를 참고한다. |
| Anthropic, `Best Practices for Claude Code` | official Claude Code docs | https://code.claude.com/docs/en/best-practices | verify first, explore-plan-code separation, context management, parallel sessions. |
| Anthropic, `Hooks reference` | official Claude Code docs | https://code.claude.com/docs/en/hooks | advisory instruction을 deterministic gate로 바꾸는 hook/event 모델. |
| ArXiv, `Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?` | academic paper | https://arxiv.org/abs/2602.11988 | repository-level context file의 효과와 한계를 추적할 때 참고. |
| ArXiv, `Configuring Agentic AI Coding Tools: An Exploratory Study` | academic paper | https://arxiv.org/abs/2602.14690 | context files, skills, subagents를 비교하는 연구 흐름. |

## Extracted Principles

### 1. Map, Not Manual

OpenAI Harness Engineering의 가장 직접적인 교훈은 `AGENTS.md`를 거대한 매뉴얼로 만들지 않는 것이다. 짧은 지도 파일이 현재 작업의 진입점과 deeper SoT를 가리키고, 실제 설계/품질/실행 계획은 구조화된 `docs/` 아래에 둔다.

게임 개발에 적용:
- `AGENTS.md`: 실행자 규칙, 검증 명령, 핵심 design rails.
- `docs/scenario/`: 게임 정체성, 플레이어 경험, 캐릭터, 텍스트가 위험해지는 지점.
- `docs/design/`: 시스템 규칙, deterministic authority, runtime evidence.
- `docs/development/harness/` 또는 `docs/research/harness-methodology/`: Codex에게 작업을 맡기는 운영 방식.
- `.game-harness/`: 현재 stage, task ledger, drift log, verification ledger.

### 2. Repository Knowledge Is the Product Surface

에이전트는 저장소 안에 없거나 tool로 접근할 수 없는 내용을 안정적으로 사용할 수 없다. 게임 아이디어가 대화와 머릿속에 있으면 Codex는 매번 흔들린다. 따라서 기획 문서는 사람용 발표자료가 아니라 agent-readable product surface가 되어야 한다.

필수 artifact:
- `game-seed.md`: 변하지 않는 정체성, 플레이어 약속, 금지사항.
- `stage-plan.md`: 현재 단계에서 무엇을 만들고 무엇을 만들지 않는지.
- `role-review.md`: director/designer/developer/artist/QA 관점의 독립 리뷰.
- `implementation-handoff.md`: 실행자가 바로 구현 가능한 scope, file ownership, AC.
- `verification.md`: Godot run, screenshot, playtest notes, backend schema check, localization check.
- `drift-log.md`: seed와 구현이 어긋난 지점.

### 3. Separate Explore, Plan, Execute, Review

Claude Code best practices의 `Explore -> Plan -> Implement -> Commit` 흐름은 게임 개발에서 더 엄격해야 한다. 게임은 코드가 통과해도 재미/가독성/연출이 실패할 수 있기 때문이다.

게임용 단계:
1. Discover: 기존 scenario/design/runtime docs와 Godot 씬, evidence를 읽는다.
2. Diagnose: 현재 플레이어 경험의 가장 큰 결함을 찾는다.
3. Spec: player-facing outcome, scope, non-goals, AC를 작성한다.
4. Implement: disjoint file ownership으로 작업한다.
5. Evidence: Godot 실행, screenshot, input path, text surface, schema fixture를 남긴다.
6. Review: role-based review와 drift check를 통과해야 close한다.

### 4. Focused Subagents, Not Generic Experts

Claude Code subagent docs는 단일 책임 subagent를 권장한다. 게임 개발도 `game expert` 하나보다 다음 lane이 낫다.

권장 lane:
- `game-director-review`: player promise, fantasy, coherence, novelty.
- `systems-design-review`: rules, loops, economy/resource pressure, exploit.
- `narrative-design-review`: scenario beat, NPC motive, text surface, localization.
- `level-design-review`: route, landmark, encounter pacing, camera, occlusion.
- `godot-runtime-review`: scenes, signals, resources, navigation, evidence.
- `qa-playtest-review`: reproducible path, bug severity, release gate.
- `art-audio-polish-review`: style target, asset consistency, readability, sound cue.

### 5. Verification Must Be Executable

문서상 “게임답다”는 검증이 아니다. 에이전트가 스스로 판정할 수 있는 evidence가 필요하다.

Dream of One의 최소 evidence:
- Godot import: `godot --headless --import --path godot`
- Godot smoke scripts: scene load, runtime slice, playable slice, localization.
- screenshot: title/state, Station, inquest/verdict, Korean/English language toggle.
- text surface ledger: generated text, deterministic risk tags, Exposure deltas.
- backend check: `npm run check --prefix backend/npc-runtime`
- playtest note: 10-minute path, confusion point, dead time, failed affordance.

### 6. Hooks and CI Convert Advice Into Gates

CLAUDE.md/AGENTS.md 같은 instruction은 advisory다. 반복적으로 깨지는 규칙은 hook, CI, smoke test, schema fixture로 바꿔야 한다. 게임 프로젝트에서는 다음이 gate 후보가 된다.

- GDScript syntax check.
- Godot scene load smoke.
- screenshot capture existence and minimum dimensions.
- localization key coverage.
- schema fixture parity.
- no legacy engine/runtime paths.
- no unchecked Codex NPC authority leakage.

### 7. Context Budget Is a Design Constraint

긴 게임 문서를 한 번에 모두 읽히면 context가 오염된다. 문서는 stage와 role 단위로 작아야 한다.

권장 크기:
- entry map: 100 lines 안팎.
- per-role review doc: 하나의 관점만.
- per-stage plan: current stage only.
- source map: 링크와 요약만, 원문 복붙 금지.
- templates: 빈 양식으로 유지, completed artifacts와 분리.

## Game Harness Takeaways for Dream of One

Dream of One은 `Codex가 게임을 알아서 잘 만들게 하는 프로젝트`가 아니라 `Codex가 반복 실행해도 게임 정체성과 판정 권한을 잃지 않도록 저장소를 설계하는 프로젝트`여야 한다.

우선순위:
1. `AGENTS.md`는 지금처럼 짧은 operating map으로 유지한다.
2. 현재 scenario 문서 위에 `.game-harness/game-seed.md`를 추가해 변하지 않는 약속을 고정한다.
3. 모든 큰 요청은 `stage-plan -> role review -> implementation handoff -> evidence -> drift log` 순서로 처리한다.
4. Godot 작업은 “실행했다”가 아니라 screenshot, playable path, text surface evidence까지 남긴다.
5. AI NPC는 Codex CLI를 호출하더라도 판정 권한을 갖지 않는다. Codex는 말 후보를 만들고, backend/runtime이 규칙과 결과를 소유한다.
