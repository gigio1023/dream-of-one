# Harness Methodology Research

조사일: 2026-04-30

이 디렉터리는 `/Users/user/git/harness`에 모은 agent-harness 레포와 웹 기반 게임 제작 자료를 Dream of One용 개발 방법론으로 추출한 연구 기록이다. 원자료 요약과 실제 적용 문서를 분리한다.

## Directory Map

| Path | Purpose |
|---|---|
| `local/` | `/Users/user/git/harness` 로컬 레포에서 추출한 agent, skill, command, MCP, review loop 패턴 |
| `web/` | 게임 기획, 시나리오, production, QA, release, AI coding-agent 공식/서적/학술 자료 |
| `methodology/` | 위 조사 결과를 Dream of One 운영 방식으로 재구성한 방법론 |
| `templates/` | Codex에게 장기 게임 개발 작업을 맡길 때 재사용할 markdown template |

## Research Notes

Local harness research:
- [Agent harness patterns](local/01-agent-harness-patterns.md)
- [Game engine automation patterns](local/02-game-engine-automation-patterns.md)
- [Ecosystem skill and command patterns](local/03-ecosystem-skill-command-patterns.md)

Web research:
- [Game design and scenario sources](web/01-game-design-scenario-sources.md)
- [Production, QA, and release sources](web/02-production-qa-release-sources.md)
- [Discipline-specific game design sources](web/03-discipline-specific-design-sources.md)
- [AI agent harness sources](web/04-ai-agent-harness-sources.md)

Methodology:
- [Operating model](methodology/01-operating-model.md)
- [Game development lifecycle](methodology/02-game-development-lifecycle.md)
- [Agent role lanes](methodology/03-agent-role-lanes.md)
- [Dream of One application](methodology/04-dream-of-one-application.md)

Templates:
- [Game seed](templates/game-seed.md)
- [Stage plan](templates/stage-plan.md)
- [Role review](templates/role-review.md)
- [Implementation handoff](templates/implementation-handoff.md)
- [Verification ledger](templates/verification-ledger.md)
- [Drift log](templates/drift-log.md)

## Core Conclusion

Agent skill은 인터페이스일 뿐이다. Codex에게 게임 기획, 설계, 디자인, 구현, 검증까지 맡기려면 다음 운영 체계가 필요하다.

1. `AGENTS.md`는 짧은 지도 역할만 한다.
2. 게임 정체성과 금지사항은 `game-seed.md`에 고정한다.
3. 큰 작업은 stage 단위로 나누고 stage gate를 둔다.
4. 기획/시나리오/시스템/레벨/Godot/QA/릴리즈 관점의 role review를 분리한다.
5. 실행자는 approved handoff만 구현한다.
6. 완료는 fresh evidence로만 주장한다.
7. drift는 별도 log에 남기고 다음 stage 전에 해소한다.

Dream of One의 핵심은 `Codex가 게임을 알아서 잘 만들게 하는 것`이 아니라 `Codex가 반복 실행해도 플레이어 약속, deterministic authority, text danger surface를 잃지 않게 하는 것`이다.
