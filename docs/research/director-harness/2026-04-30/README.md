# Director Harness Research

조사일: 2026-04-30

이 디렉터리는 Dream of One을 개별 이슈 처리 수준이 아니라 game director / creative director / producer 관점에서 이끌기 위한 조사 기록이다.

## Directory Map

| Path | Purpose |
|---|---|
| `local/` | `/Users/user/git/harness` 로컬 레포에서 추출한 director governance, engine evidence, agent council 패턴 |
| `web/` | game director, creative direction, product strategy, design framework 관련 웹/공식/서적/산업 자료 |
| `methodology/` | Dream of One에 적용할 director-level 운영 모델 |
| `templates/` | director decision, milestone, council review에 재사용할 양식 |

## Research Notes

Local:
- [Local director governance patterns](local/01-local-director-governance-patterns.md)
- [Local engine evidence for direction](local/02-local-engine-evidence-for-direction.md)
- [Local director agent council patterns](local/03-local-director-agent-council-patterns.md)

Web:
- [Game director and creative direction sources](web/01-game-director-creative-direction-sources.md)
- [Indie product strategy sources](web/02-indie-product-strategy-sources.md)
- [Director-level design framework sources](web/03-director-level-design-framework-sources.md)

Methodology:
- [Director harness model](methodology/01-director-harness-model.md)
- [Cadence and gates](methodology/02-cadence-and-gates.md)
- [Dream of One application](methodology/03-dream-of-one-application.md)

Templates:
- [Director decision record](templates/director-decision-record.md)
- [Director council review](templates/director-council-review.md)
- [Milestone brief](templates/milestone-brief.md)
- [Creative pillars](templates/creative-pillars.md)

## Core Conclusion

개별 이슈 workflow는 필요한 하위 구조다. 하지만 이 게임을 이끌기 위해서는 그 위에 Director Layer가 필요하다.

Director Layer의 역할:
- 이 게임이 무엇이 아닌지 계속 잘라냄.
- creative pillars와 player experience target을 유지함.
- 2D/3D, AI 사용 방식, 출시 범위 같은 one-way decision을 관리함.
- Codex subagent 결과를 council input으로 쓰되 최종 결정을 단일 reducer로 내림.
- milestone을 날짜가 아니라 증거 묶음으로 승인함.
- store/pitch/public demo가 실제 빌드와 같은 약속을 말하는지 검증함.

Dream of One의 상위 판단 기준은 다음 한 문장으로 압축된다.

> 플레이어가 조사하는 게임이 아니라, 플레이어의 텍스트가 Station 시스템에 의해 조사되고 증거화되는 deterministic social-surveillance game.

이 문장을 강화하지 않는 작업은 구현 가능하더라도 director-level 우선순위가 아니다.
