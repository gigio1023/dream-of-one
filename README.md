# Dream of One

이 프로젝트는 편의점 거리에서 **위반 → 의심 → 신고 → 심문 → 판정** 루프를 실행하는 시뮬레이션이다.

## Quick Start
1. Unity Hub에서 `draem-of-one/` 열기
2. 씬 열기: `Assets/Scenes/Prototype.unity`
3. Play

조작
- 이동: WASD
- 상호작용: E
- 촬영: F

## LLM 설정(OpenAI Chat Completions)
- 기본 모드는 Mock 또는 LocalEndpoint
- OpenAI 사용 시
  - 환경 변수 `OPENAI_API_KEY` 설정
  - 씬의 `LLMClient`에서 Provider를 `OpenAIChatCompletions`로 변경
  - 모델명은 인스펙터에서 수정 가능

## 계획 문서
- 단일 계획 문서: `plan.md`
