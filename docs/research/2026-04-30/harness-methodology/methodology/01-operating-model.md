# Game Development Harness Operating Model

## Problem

현재 게임 문서가 거짓은 아니어도 Codex/Claude Code에게 전체 게임 개발을 맡기기에는 약하다. 이유는 문서가 “게임 설명”에 가깝고, 장기 작업을 안전하게 분할·검증·복원하는 운영 체계를 충분히 제공하지 않기 때문이다.

필요한 것은 더 긴 agent skill이 아니다. 필요한 것은 agent가 매번 같은 제품 기준으로 판단하도록 만드는 저장소 내부 운영 구조다.

## Source Patterns

조사에서 반복된 패턴:
- OpenAI Harness Engineering: `AGENTS.md`는 1,000-page manual이 아니라 map. 실제 SoT는 구조화된 `docs/`.
- `gstack`, `get-shit-done`, `Ralph`, `Ouroboros`: seed/spec, stage gate, context restore, bounded loop, verification ledger.
- Claude Code official docs: subagent는 single responsibility, project memory는 concise, hooks는 advisory rule을 deterministic gate로 전환.
- Game design sources: scenario는 prose가 아니라 player experience goal, mechanics, dynamics, content table, testable evidence로 내려가야 함.

## Five-Layer Harness

### 1. Operating Map

Purpose:
- 모든 agent가 시작할 때 읽는 짧은 지도.
- 어디를 읽고, 무엇을 건드리지 말고, 어떤 command로 검증할지 안내.

Dream of One artifact:
- `AGENTS.md`

Rule:
- 길게 만들지 않는다.
- 상세 설계는 `docs/` 링크로 보낸다.
- 반복적으로 깨지는 규칙은 hook/test/check로 승격한다.

### 2. Product Seed

Purpose:
- 게임 정체성과 불변 규칙을 고정.
- 긴 작업에서 scope drift 방지.

Required fields:
- Player promise
- Design rails
- Authority boundaries
- Target slice
- Non-goals
- Release posture
- Required evidence

Dream of One invariant:
- Player is not investigator.
- NPCs and Station investigate the player.
- Text is where danger starts.
- Dream Law, Cover Test, Exposure, Station intake, Inquest, verdict, session termination are deterministic product authority.
- Codex CLI can propose NPC text, but cannot own rules or verdicts.

### 3. Stage Pipeline

Purpose:
- “게임 만들기”를 단일 거대 작업으로 두지 않음.
- 각 stage가 다른 deliverable과 evidence를 갖도록 함.

Default stages:
1. Seed Lock
2. Scenario Runtime Contract
3. Prototype Loop
4. Vertical Slice
5. Content Expansion
6. QA/Polish
7. Release Candidate
8. Launch/Post-launch

Rule:
- stage마다 `scope`, `non-goals`, `role reviews`, `acceptance criteria`, `evidence`를 명시.
- stage gate를 통과하지 못하면 다음 stage 구현 금지.

### 4. Role Review

Purpose:
- 같은 agent가 만든 계획을 같은 관점으로 합리화하는 문제 방지.
- 게임은 코드 correctness만으로 완성되지 않으므로 discipline별 결함을 분리.

Required lanes:
- Game Director
- Narrative Designer
- Systems Designer
- Level Designer
- Godot Runtime Engineer
- QA / Playtest
- Art / Audio / Game Feel
- Release Producer

Rule:
- review는 `APPROVE`, `CONDITIONAL`, `BLOCK` 중 하나.
- `BLOCK`은 file path, violated seed rule, required fix를 포함.
- subjective taste는 player promise와 evidence gate에 연결될 때만 blocker.

### 5. Evidence and Drift Control

Purpose:
- “했다”가 아니라 “증거가 있다”로 완료 판정.
- 구현이 seed에서 벗어난 지점을 누적 추적.

Evidence types:
- Godot import and smoke command output.
- Backend schema/type check output.
- Screenshot or captured playable artifact.
- Text surface ledger.
- Runtime evidence JSON.
- Playtest observation.
- Role review result.

Drift examples:
- Player is framed as investigator.
- Codex-generated NPC text changes verdict semantics.
- Korean default weakens or English becomes the real source.
- Godot scene looks valid but text-to-record danger chain is invisible.
- Release docs claim a feature that build does not contain.

## Recommended Repo Shape

Use research docs for source-backed reasoning:
- `docs/research/harness-methodology/YYYY-MM-DD/`

Use active harness docs for ongoing work:
- `docs/development/harness/README.md`
- `docs/development/harness/01-director-harness-engineering.md`
- `docs/development/harness/02-codex-work-contract.md`
- `docs/development/harness/03-readiness-gates.md`
- `docs/development/harness/player-comprehension-gate.md`

Use working state for current execution:
- `.game-harness/game-seed.md`
- `.game-harness/current-stage.md`
- `.game-harness/tasks.md`
- `.game-harness/review-log.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/drift-log.md`
- `.game-harness/continue-here.md`

## Stop Rules

Codex should stop and create a correction plan when:
- seed invariant is contradicted.
- deterministic backend authority is moved into Godot or Codex text generation.
- stage scope requires files outside declared ownership.
- no fresh evidence can be produced.
- two consecutive loops make no meaningful progress.
- latest user instruction conflicts with the active plan.

## Success Condition

The harness works when a new agent can read the operating map, seed, current stage, task ledger, and verification ledger, then continue work without asking the user to restate the game.
