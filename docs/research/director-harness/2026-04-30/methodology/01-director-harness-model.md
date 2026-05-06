# Director Harness Model

## Purpose

Director Harness는 개별 개발 이슈를 처리하는 절차가 아니다. 게임 전체가 같은 방향으로 가고 있는지 판단하고, 다음 마일스톤으로 넘어가도 되는지 결정하는 상위 운영 모델이다.

## Layers

| Layer | Question | Artifact |
|---|---|---|
| Game Direction | 이 게임은 무엇이 되어야 하는가 | thesis, pillars, anti-pillars |
| Product Strategy | 어떤 증거를 만들면 팀/플레이어/펀딩이 믿는가 | milestone roadmap, pitch proof |
| Creative Governance | 어떤 아이디어를 통과/컷/보류할 것인가 | director decision records |
| Agent Council | 어떤 실패 모드를 독립적으로 검토할 것인가 | council reviews |
| Execution Harness | 승인된 작업을 어떻게 구현/검증할 것인가 | handoff, evidence, drift log |

## Director Is the Reducer

Subagents, council lanes, design races는 판단 재료를 만든다. 최종 방향 결정은 하나의 reducer가 해야 한다.

Reducer responsibilities:
- conflicting reviews를 합침.
- one-way decision을 구분함.
- rejected alternatives를 기록함.
- product law와 milestone evidence를 기준으로 판단함.
- Codex-generated taste를 제품 방향으로 착각하지 않음.

## Required Director Questions

Before a milestone:
- 지금 증명하려는 제품 가설은 무엇인가?
- 이 stage를 통과하면 무엇을 더 이상 논쟁하지 않아도 되는가?
- 실패하면 무엇을 잘라야 하는가?

Before a feature:
- 이 기능은 어떤 creative pillar를 강화하는가?
- 플레이어가 조사자가 되는 drift를 만들지 않는가?
- Godot visual polish가 core loop 약점을 숨기고 있지 않은가?
- backend/runtime authority가 Codex text generation으로 넘어가지 않는가?

Before public/pitch material:
- store copy, screenshots, trailer, demo build가 같은 약속을 말하는가?
- Codex CLI requirement가 숨겨져 있지 않은가?
- 지금 공개하면 이후 scope를 묶어도 괜찮은가?

## Director Artifacts

Active artifacts should live under `docs/direction/`:
- `00-game-thesis.md`
- `01-creative-pillars.md`
- `02-director-roadmap.md`
- `03-director-decision-ledger.md`
- `04-director-council.md`

Execution artifacts stay under `.game-harness/`:
- `game-seed.md`
- `current-stage.md`
- `tasks.md`
- `review-log.md`
- `verification-ledger.md`
- `drift-log.md`

## Stop Conditions

Stop director automation when:
- two council lanes disagree on player role.
- an AI/NPC feature moves verdict authority outside backend/runtime.
- vertical slice evidence lacks actual playable proof.
- public-facing promise exceeds current build truth.
- same creative drift repeats after one correction loop.

## Success Condition

The model works when a new Codex session can answer:
- what game this is,
- what game this must not become,
- what milestone is active,
- what evidence is required,
- what decisions are already closed,
- what next director decision is needed.
