# 로컬 엔진 증거를 디렉터 판단으로 바꾸는 패턴

조사 범위는 `/Users/user/git/harness` 아래의 `gstack-game`, `funplay-skill`, `Godot-MCP`, `better-godot-mcp`, `godot-mcp-runtime`, `godotiq`, `funplay-godot-mcp`, `unity-mcp`, `advanced-unity-mcp`이다. 세부 API 목록보다 중요한 공통점은 하나다. 에이전트가 엔진을 조작할 수 있어도 디렉터가 받아야 할 산출물은 “도구 호출 성공”이 아니라 “현재 방향을 계속 갈 수 있는 증거”여야 한다.

## 조사한 로컬 근거

- `/Users/user/git/harness/gstack-game/skills/prototype-slice-plan/SKILL.md`
- `/Users/user/git/harness/gstack-game/skills/prototype-slice-plan/references/slice-types.md`
- `/Users/user/git/harness/gstack-game/skills/prototype-slice-plan/references/examples.md`
- `/Users/user/git/harness/gstack-game/skills/build-playability-review/SKILL.md`
- `/Users/user/git/harness/gstack-game/skills/playtest/SKILL.md`
- `/Users/user/git/harness/gstack-game/skills/playtest/references/analysis-framework.md`
- `/Users/user/git/harness/gstack-game/skills/game-visual-qa/SKILL.md`
- `/Users/user/git/harness/gstack-game/skills/game-direction/SKILL.md`
- `/Users/user/git/harness/funplay-skill/skills/gameplay-prototyping/SKILL.md`
- `/Users/user/git/harness/funplay-skill/skills/godot-scene-assembly/SKILL.md`
- `/Users/user/git/harness/funplay-skill/skills/unity-prefab-workflow/SKILL.md`
- `/Users/user/git/harness/godot-mcp-runtime/README.md`
- `/Users/user/git/harness/funplay-godot-mcp/README.md`
- `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_prompt_provider.gd`
- `/Users/user/git/harness/Godot-MCP/README.md`
- `/Users/user/git/harness/Godot-MCP/docs/architecture.md`
- `/Users/user/git/harness/better-godot-mcp/README.md`
- `/Users/user/git/harness/godotiq/README.md`
- `/Users/user/git/harness/unity-mcp/unity-mcp-skill/SKILL.md`
- `/Users/user/git/harness/unity-mcp/unity-mcp-skill/references/tools-reference.md`
- `/Users/user/git/harness/advanced-unity-mcp/README.md`

## 1. 디렉터 판단은 “엔진 가능성”이 아니라 “가설 증명 순서”에서 시작한다

`gstack-game`의 핵심 패턴은 프로토타입을 기능 묶음으로 보지 않는 것이다. `/Users/user/git/harness/gstack-game/skills/prototype-slice-plan/references/slice-types.md`는 메커닉 프로토타입, 온보딩 슬라이스, 진행 슬라이스, 전투 슬라이스, 경제 슬라이스, 버티컬 슬라이스를 “무엇을 증명하는가”로 구분한다. 특히 버티컬 슬라이스는 모든 시스템의 결합을 증명하는 비싼 산출물이며, 핵심 루프가 먼저 검증되지 않았으면 바로 가지 말라고 경고한다.

디렉터용 하네스는 따라서 “Godot으로 멋진 장면을 만들 수 있나?”가 아니라 “이번 주에 무엇을 실패 가능하게 증명할 것인가?”를 먼저 물어야 한다. `/Users/user/git/harness/funplay-skill/skills/gameplay-prototyping/SKILL.md`도 같은 방향이다. 첫 플레이어블을 방해하지 않는 것만 남기고, 장식적이거나 비핵심인 것은 명시적으로 미룬다.

Dream of One에 적용하면 첫 엔진 증거는 완성된 챕터가 아니라, “텍스트가 위험 표면으로 작동하는가”, “Station 시스템이 플레이어를 조사하는 느낌이 60초 안에 드러나는가”, “Cover Test 실패가 플레이어에게 읽히는가” 같은 작은 가설이어야 한다.

## 2. 3D vs 2D는 취향이 아니라 증거 비용의 선택이다

엔진 MCP들은 2D와 3D 모두를 다룰 수 있다. `/Users/user/git/harness/funplay-godot-mcp/README.md`는 `set_transform_2d`, `set_transform_3d`, `set_camera_2d`, `set_camera_3d` 성격의 편집과 카메라 제어를 묶어 제공한다. `/Users/user/git/harness/better-godot-mcp/README.md`는 씬, 노드, 물리, 내비게이션, UI를 composite tool로 다루며, 내부 테스트와 문서에는 `NavigationRegion2D/3D`, `AudioStreamPlayer2D/3D`, `CharacterBody2D/3D` 선택이 반복된다. Unity 쪽 `/Users/user/git/harness/unity-mcp/unity-mcp-skill/references/tools-reference.md`도 물리 도구에서 `dimension="2d"`와 `dimension="3d"`를 구분하고, 카메라/ProBuilder/물리 검증을 별도 증거 표면으로 만든다.

디렉터 판단 기준은 “어느 쪽이 더 근사한가”가 아니다. 2D는 빠르게 텍스트, UI, 시선 흐름, 룰 피드백을 증명하기 좋다. 3D는 공간 감시, 거리감, 추적, 접촉 회피, 카메라 불안, 장소 권력 같은 증거가 필요할 때 비용을 정당화한다. Dream of One의 현재 제품 권위가 Dream Law, Cover Test, Exposure, Station intake, inquest, verdict에 있다면, 3D 전환은 “조사받는 공간성”을 스크린샷과 플레이어블 증거로 더 잘 증명할 때만 선택해야 한다.

## 3. 시각 목표는 아트 품질보다 “첫 스크린에서 무엇을 알 수 있는가”로 잡는다

`gstack-game`의 `/Users/user/git/harness/gstack-game/skills/game-visual-qa/SKILL.md`는 첫인상, 스타일 일관성, UI polish, 애니메이션, 화면 대응, 시각 성능을 분리한다. `/Users/user/git/harness/gstack-game/skills/game-visual-qa/references/visual-thresholds.md`는 글자 크기, 터치 타깃, 대비, 픽셀 정렬 같은 통과 기준을 숫자로 둔다. `/Users/user/git/harness/gstack-game/skills/game-ux-review/references/scoring.md`도 HUD의 시각 가중치가 게임의 핵심 우선순위와 맞아야 한다고 본다.

디렉터 하네스가 요구해야 할 시각 산출물은 “예쁘다”가 아니라 “위험이 어디에 있는지 보인다”이다. Dream of One에서는 첫 화면의 시각 목표가 명확해야 한다. 플레이어가 조사자가 아니라 조사 대상이라면, 화면 구성은 탐정 도구를 강조하면 안 된다. Station 권력, NPC 시선, 텍스트 선택의 위험, 노출 상태가 먼저 읽혀야 한다. 스크린샷 리뷰는 “장면이 멋진가”보다 “이 장면이 플레이어의 역할을 오해시키지 않는가”를 물어야 한다.

## 4. 에이전트 제어 Godot의 가치는 “실행 증거”에 있다

`/Users/user/git/harness/godot-mcp-runtime/README.md`는 파일 편집과 씬 조작을 넘어 실행 중인 Godot 게임에 입력을 넣고, 스크린샷을 찍고, UI를 발견하고, live GDScript를 실행하는 점을 강조한다. 같은 파일은 이 방식이 플레이테스트 대체가 아니라, 씬 로드, 버튼 반응, 값 갱신, 스크립트 오류 부재를 확인하는 자동 검증 루프라고 선을 긋는다. 생성된 런타임 산출물은 프로젝트 내부 `.mcp/`에 저장된다는 점도 중요하다.

`/Users/user/git/harness/funplay-godot-mcp/README.md`는 Editor-only Godot addon 관점에서 play mode, 입력 시뮬레이션, 로그, editor view capture, runtime assertion, performance snapshot, scene complexity를 같은 세션에서 묶는다. `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_prompt_provider.gd`의 `scene_review`, `feature_plan`, `runtime_debug`, `ui_layout_plan`도 단순 명령보다 현재 씬, 로그, 성능, 스크립트 오류, play state를 먼저 끌어오는 흐름이다.

따라서 Dream of One의 director harness는 “Godot 체크 통과”를 더 상위 산출물로 묶어야 한다. 예: `godot/scenes/main.tscn`을 실행하고, Cover Test UI가 보이는 스크린샷, NPC/Station 노드 존재 assertion, verdict 상태 전이 로그, Exposure 값 변화, 입력 시퀀스 후 session termination 조건을 한 증거 묶음으로 제출한다.

## 5. 플레이어블 증거는 빌드 접근 방식부터 등급을 매긴다

`/Users/user/git/harness/gstack-game/skills/build-playability-review/SKILL.md`는 코드나 문서만으로 플레이어블을 판단하지 말라고 한다. 필요한 것은 실행 가능한 빌드, 영상/스크린샷, 또는 상세한 플레이 세션 설명이다. 그리고 분 단위 타임라인으로 “플레이어가 무엇을 하는가, 무엇을 느끼는가, 루프가 닫히는가”를 기록한다. 산출물은 점수가 아니라 가설 결과다. VALIDATED, INVALIDATED, INCONCLUSIVE 중 하나로 끝나야 한다.

Dream of One에서 플레이어블 proof는 “WASD 이동 가능”이 아니다. 더 높은 기준은 “플레이어가 텍스트 선택을 통해 위험을 만들고, 시스템이 그 선택을 조사 증거로 회수하며, inquest/verdict 흐름까지 최소 1회 닫힌다”이다. 아직 human playtest 전이라도 에이전트가 입력 시퀀스를 실행하고, 로그와 스크린샷으로 그 루프가 닫혔음을 보여주면 prototype evidence가 된다. 하지만 재미, 불안, 수치심, 감시감은 자동 증거만으로 확정하면 안 된다.

## 6. 스크린샷과 contact sheet는 디렉터 리뷰의 기본 단위다

Unity 쪽 패턴이 특히 선명하다. `/Users/user/git/harness/unity-mcp/unity-mcp-skill/SKILL.md`는 resource-first workflow 뒤에 screenshot 검증을 둔다. 같은 파일과 `/Users/user/git/harness/unity-mcp/unity-mcp-skill/references/tools-reference.md`는 game view, scene view, 특정 카메라, 특정 대상 framing, 6방향 surround, orbit contact sheet, inline image를 구분한다. 이것은 3D 장면에서 단일 카메라 컷만 보고 승인하는 실수를 막는다.

Godot 쪽도 같은 원칙을 가져올 수 있다. `/Users/user/git/harness/godot-mcp-runtime/README.md`의 viewport screenshot과 `/Users/user/git/harness/funplay-godot-mcp/README.md`의 `capture_editor_view`는 최소 증거다. Dream of One의 장면 리뷰는 다음 contact sheet를 기본으로 요구하는 편이 낫다. 플레이어 시야, Station 관찰 시야, 텍스트 표면 close-up, UI/HUD 상태, failure/verdict 직전, session termination 직후. 디렉터는 이 묶음으로 “이 게임이 탐정물이 아니라 피조사자 경험으로 보이는가”를 빠르게 판단할 수 있다.

## 7. 씬 품질 게이트는 “열림, 보임, 반응함, 기록됨”으로 닫는다

`/Users/user/git/harness/Godot-MCP/docs/architecture.md`는 명령 검증, contextual error, timeout, 재연결을 기본 설계로 둔다. `/Users/user/git/harness/better-godot-mcp/README.md`는 project validation과 `.tscn` 직접 조작의 한계를 함께 적는다. `/Users/user/git/harness/godot-mcp-runtime/README.md`의 `validate`는 attach/run 전에 GDScript syntax와 scene integrity를 검사한다. `/Users/user/git/harness/funplay-godot-mcp/README.md`는 node/property/signal assertion, performance snapshot, console logs, scene complexity를 한 묶음으로 둔다. Unity 쪽 `/Users/user/git/harness/unity-mcp/unity-mcp-skill/SKILL.md`도 스크립트 작성 뒤 compile 완료를 기다리고 console error를 확인한 뒤 붙이는 순서를 강제한다.

Dream of One의 scene quality gate는 다음 네 단계면 충분하다.

1. 열림: `godot --headless --import --path godot`와 scene load smoke가 통과한다.
2. 보임: main scene screenshot이 비어 있지 않고, 텍스트 위험 표면과 Station/NPC 권력이 첫 화면에서 읽힌다.
3. 반응함: 입력 시퀀스가 player state, Exposure, Cover Test, verdict/session 상태를 바꾼다.
4. 기록됨: JSON evidence, console log, screenshot이 같은 실행 ID로 남아 디렉터가 다시 볼 수 있다.

## 8. 플레이테스트 산출물은 자동 증거 다음 단계다

`/Users/user/git/harness/gstack-game/skills/playtest/SKILL.md`는 playtest를 실행하지 않는다. 대신 가설, 세션 구조, 관찰 지표, 인터뷰 질문, 분석 프레임을 만든다. `/Users/user/git/harness/gstack-game/skills/playtest/references/analysis-framework.md`는 관찰, 지표, 인터뷰 중 2개 이상이 맞아야 actionable pattern으로 본다. 단일 출처는 가설일 뿐이다.

이 패턴은 Dream of One에 중요하다. 엔진 증거가 “루프가 닫힌다”를 보여준 다음, playtest artifact는 “플레이어가 자신이 조사받고 있음을 언제 이해했는가”, “텍스트 선택을 위험으로 받아들였는가”, “verdict를 임의 실패가 아니라 자기 발화의 결과로 이해했는가”를 관찰해야 한다. 이때 에이전트 스크린샷과 로그는 인터뷰를 대체하지 않고, 관찰자가 다시 볼 수 있는 타임코드 근거가 된다.

## 9. 레포별 패턴 요약

- `gstack-game`: 방향, 프로토타입, 플레이어블, 시각 QA, 플레이테스트를 분리하고, 모든 고수준 판단을 실패 가능한 가설과 증거 기준으로 바꾼다.
- `funplay-skill`: 첫 플레이어블을 위해 루프, 최소 씬, 최소 UI, asset checklist, acceptance criteria만 남긴다. Godot/Unity 엔진 파일은 구조와 검증 체크리스트를 먼저 세운다.
- `Godot-MCP`: Godot Editor와 MCP 사이의 양방향 command/response 구조를 제공한다. 디렉터 관점에서는 “에이전트가 현재 씬을 읽고 바꿀 수 있음”의 기초 레이어다.
- `better-godot-mcp`: headless `.tscn` 조작과 composite tool로 씬 구조를 빠르게 만들 수 있지만, 직접 텍스트 조작 한계가 있어 실행/스크린샷 검증과 함께 써야 한다.
- `godot-mcp-runtime`: 실행 중 Godot를 입력, screenshot, UI discovery, live script로 검증한다. 디렉터 증거 루프에 가장 직접적이다.
- `godotiq`: README 수준에서는 spatial intelligence, dependency graph, impact check, scene/spatial mapping, signal/flow tracing을 제시한다. 현재 공개 로컬 문서는 짧지만, 디렉터에게는 “어떤 변경이 어느 씬/흐름에 영향을 주는가”를 묻는 분석 축으로 쓸 수 있다.
- `funplay-godot-mcp`: Godot Editor 안에서 scene review, feature plan, runtime debug, UI layout plan을 현재 project context와 묶는다. high-level prompt와 엔진 증거 사이의 접착층이다.
- `unity-mcp`: screenshot/contact sheet, profiler, tests, console, editor resources를 강하게 엮는다. Godot 하네스에도 “다각도 visual review”와 “작업 뒤 즉시 증거” 패턴을 가져올 만하다.
- `advanced-unity-mcp`: Core editor control, asset/scene management, build/platform tools, profiler control을 한 대시보드 연결 모델로 묶는다. 디렉터 관점에서는 빌드 가능성, 플랫폼 전환, 성능 병목을 고수준 게이트에 포함시키는 참고 사례다.

## Dream of One 적용 결론

Dream of One의 director harness는 “엔진을 조작하는 에이전트”가 아니라 “결정 가능한 증거를 제출하는 에이전트”여야 한다. 각 작업은 다음 산출물 중 하나로 끝나야 한다.

- Prototype evidence: 가장 위험한 가설 하나, 최소 Godot scene, 성공/실패 조건, 실행 로그.
- Playable proof: 1회 루프가 닫히는 입력 시퀀스, screenshot, state JSON, verdict/session 결과.
- Visual target proof: player view와 Station/system view를 포함한 screenshot/contact-sheet.
- Scene quality gate: scene load, runtime input, assertion, log, screenshot이 같은 실행에서 통과.
- Playtest artifact: 자동 증거 위에 관찰/지표/인터뷰를 얹은 hypothesis verdict.

디렉터의 고수준 호출도 이 순서여야 한다. 먼저 2D로 텍스트 위험과 deterministic authority가 읽히는지 증명한다. 3D는 감시 공간, NPC 시선, 접촉 회피, Station 권력이 실제로 더 강해지는 contact sheet와 플레이어블 proof가 있을 때만 채택한다. 버티컬 슬라이스는 핵심 루프, 온보딩 이해, verdict 루프가 각각 작은 증거로 통과한 뒤에만 승인한다.

Director Harness Takeaways for Dream of One
