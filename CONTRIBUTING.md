# Contributing

## Branches
- Name feature branches `feat/<scope>`

## Commits
- Follow Conventional Commits
- Keep summaries under 72 chars, prefer 50 chars
- Description must be written in English
- Body can be written in English or Korean
- Body lines wrap at 72 chars
- AI 작업 시에도 사람이 로그만 읽어도 구현 내용을 복원할 수 있도록
  자세히 쓴다. 몸통에는 아래를 포함한다:
  - 무엇을 바꿨는지(파일/영역 단위), 왜 필요한지(문제/목표)
  - 부수 효과나 깨진 것, 후속 TODO
  - 실행한 테스트/플레이/빌드 결과와 스코프
  - 경로가 바뀌었거나 생성/삭제된 자산을 명시

```
<type>(<scope>): <description>
|<---- prefer <=50 chars --->|<--------- up to 72 chars -------->|

<body>

<footer>

--- COMMIT END ---
```

## Allowed values
- type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- scope: optional namespace such as api, parser, auth, db, ui
- description: imperative, lowercase, no period, English only
- body: explain what and why, English or Korean
- footer: references such as `Fixes #123` or `BREAKING CHANGE`

## Pull requests
- Attach screenshots or short video
- List every affected document
