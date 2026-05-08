# Local Game Engine Automation Patterns

조사 범위:
- `/Users/user/git/harness/Godot-MCP`
- `/Users/user/git/harness/better-godot-mcp`
- `/Users/user/git/harness/godot-mcp-tomyud1`
- `/Users/user/git/harness/godotiq`
- `/Users/user/git/harness/godot-mcp-coding-solo`
- `/Users/user/git/harness/godot-mcp-runtime`
- `/Users/user/git/harness/funplay-godot-mcp`
- `/Users/user/git/harness/funplay-skill`
- `/Users/user/git/harness/funplay-unity-mcp`
- `/Users/user/git/harness/unity-mcp`
- `/Users/user/git/harness/advanced-unity-mcp`

## 핵심 분류

| 패턴 | 대표 repo | 강점 | 한계 |
|---|---|---|---|
| Editor addon bridge | `Godot-MCP`, `godot-mcp-tomyud1`, `godotiq`, `funplay-godot-mcp` | Godot `EditorInterface`, 선택 노드, 열린 씬, Output/Debugger 접근 | 에디터 실행 필요, 포트/단일 연결/상태 꼬임 |
| Headless Godot script | `godot-mcp-coding-solo`, `godot-mcp-runtime` | 에디터 없이 `.tscn` 생성/수정/검증 가능 | 모든 autoload 초기화, 깨진 autoload가 전체 작업 차단 |
| Text `.tscn` parser | `better-godot-mcp` | Godot 프로세스 없이 빠른 파일 조작 | Godot 직렬화/리소스 타입 검증 한계 |
| Runtime helper/autoload | `godot-mcp-tomyud1`, `godotiq`, `godot-mcp-runtime` | screenshot, input, live node query, runtime script evidence | 실행 후 bridge 준비 대기 필요, node path 규칙 엄격 |
| Execute-code first | `funplay-godot-mcp`, `funplay-unity-mcp` | 작은 tool 폭발을 줄이고 복합 편집을 한 번에 수행 | 안전 경계가 약하면 임의 코드 실행 표면 확대 |

## Scene Inspection

- `Godot-MCP`는 에디터 플러그인에서 열린 씬을 기준으로 `get_current_scene`, `get_scene_structure`, `list_nodes`, `get_node_properties`를 처리한다. `scene_commands.gd`는 `PackedScene.instantiate()`로 파일 씬 구조를 읽고, `node_commands.gd`는 편집 중인 scene root에서 node path를 해석한다. 근거: `/Users/user/git/harness/Godot-MCP/addons/godot_mcp/commands/scene_commands.gd`, `/Users/user/git/harness/Godot-MCP/addons/godot_mcp/commands/node_commands.gd`.
- `godot-mcp-tomyud1`는 `read_scene`에서 `PackedScene`을 edit-state로 instantiate하고, path를 `"."` root-relative로 반환한다. `scene_tree_dump`는 현재 에디터 씬의 이름, 클래스, script를 텍스트 트리로 덤프한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/scene_tools.gd`, `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- `better-godot-mcp`는 `.tscn` 파일을 직접 파싱한다. `parseSceneContent()`가 `[node]`, `[ext_resource]`, `[sub_resource]`, `[connection]`을 문자열 스캔으로 추출한다. 빠르지만 Godot 로더가 아니므로 실제 Resource/Variant 호환성은 별도 검증 필요. 근거: `/Users/user/git/harness/better-godot-mcp/src/tools/helpers/scene-parser.ts`.
- `godotiq`는 `scene_tree`에서 depth, filter_type, transform/script/groups/visibility 포함 옵션을 제공한다. Node3D/Node2D/Control transform을 축약 배열로 반환해 공간 맵에 유리하다. 근거: `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_server.gd`.
- `funplay-godot-mcp`는 `get_scene_info`, `get_scene_tree`, `get_node_info`, `find_nodes`, selection resource를 에디터 상태에서 읽는다. `execute_code`도 `ctx.scene_root`, `ctx.selection`, `ctx.open_scenes`, `ctx.is_playing_scene`를 주입한다. 근거: `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_core_tools.gd`.

## Node Paths

- Godot editor 작업은 대체로 현재 scene root 기준 path와 절대 `/root/...` path가 섞인다. `better-godot-mcp`는 LLM이 만든 `/root/SceneName/...` prefix를 자동 제거한다. 근거: `/Users/user/git/harness/better-godot-mcp/src/tools/composite/nodes.ts`.
- `godot-mcp-tomyud1`의 `run_scene` 응답은 실제 `.tscn` root node 이름에서 `runtime_root`를 계산한다. 파일명과 root node 이름이 다를 수 있으므로 runtime query는 응답의 `/root/<RootName>`를 SoT로 써야 한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- `godot-mcp-runtime`의 `click_element`는 visible text가 아니라 node path 또는 node name BFS로 클릭 대상을 찾는다. 먼저 `get_ui_elements`로 path/name/rect/text를 수집해야 한다. 근거: `/Users/user/git/harness/godot-mcp-runtime/src/index.ts`, `/Users/user/git/harness/godot-mcp-runtime/src/scripts/mcp_bridge.gd`.
- `godotiq`는 node name 또는 path를 함께 받지만, 열린 씬이 요청 target과 다르면 preflight에서 실패시킨다. 씬 전환과 저장이 먼저다. 근거: `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_server.gd`.

## Editor Automation

- `Godot-MCP`는 `execute_editor_script`로 임의 GDScript를 editor context에서 실행한다. 강력하지만 가장 위험한 표면이다. 근거: `/Users/user/git/harness/Godot-MCP/server/src/tools/editor_tools.ts`.
- `godot-mcp-tomyud1`는 `open_in_godot`, `list_settings`, `update_project_settings`, `configure_input_map`, `classdb_query`, `rescan_filesystem`를 에디터 플러그인에서 제공한다. ClassDB 조회를 코드 작성 전 API 검증 단계로 둔 점이 중요하다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- `funplay-godot-mcp`는 HTTP MCP 서버를 Godot addon 내부에 포함하고, 기본 `core` profile과 `full` profile을 나눈다. `execute_code` 중심 설계로 복합 편집을 줄인다. 근거: `/Users/user/git/harness/funplay-godot-mcp/README.md`, `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_mcp_server.gd`.
- Unity 계열도 같은 방향이다. `funplay-unity-mcp`는 `execute_code`, play mode, screenshots, logs, compile errors를 core profile로 묶고, `unity-mcp`는 broad `manage_*` 도구와 `batch_execute`, `set_active_instance`를 둔다. Godot 하네스에도 compact core와 batch/poll 계층이 필요하다. 근거: `/Users/user/git/harness/funplay-unity-mcp/README.md`, `/Users/user/git/harness/unity-mcp/unity-mcp-skill/references/tools-reference.md`.

## Runtime Evidence

- `godot-mcp-tomyud1`는 editor 연결과 runtime 연결을 분리한다. WebSocket `6505`에서 `role="editor"`와 `role="runtime"`을 각각 한 개씩만 허용하고, `take_screenshot`, `send_input`, `query_runtime_node`, `get_runtime_log`는 runtime으로 라우팅한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/mcp-server/src/godot-bridge.ts`.
- `godot-mcp-tomyud1` runtime autoload는 viewport PNG 저장, `Input.parse_input_event`, live node property query, ring-buffer log를 제공한다. screenshot 기본 저장 위치는 `res://addons/godot_mcp/cache/screenshots/`다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/runtime/mcp_runtime.gd`.
- `godot-mcp-runtime`는 addon 설치 없이 `run_project`/`attach_project` 때 `mcp_bridge.gd`를 임시 autoload로 주입하고, UDP `127.0.0.1:9900`으로 runtime tool을 호출한다. stop/detach 때 script와 autoload를 제거한다. 근거: `/Users/user/git/harness/godot-mcp-runtime/src/utils/godot-runner.ts`, `/Users/user/git/harness/godot-mcp-runtime/src/scripts/mcp_bridge.gd`.
- `godotiq`는 `EngineDebugger` message capture를 사용한다. editor plugin이 runtime autoload `GodotIQRuntime`을 등록하고, screenshot/perf/input/exec/state/nav/watch/ui_map/explore_camera 요청을 debugger 세션으로 전달한다. 근거: `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_plugin.gd`, `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_debugger.gd`, `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_runtime.gd`.
- Runtime evidence의 최소 루프: `run_scene(wait_for_runtime=true)` 또는 `run_project` -> 짧은 wait -> `query_runtime_node`/`get_ui_elements` -> `send_input`/`simulate_input` -> screenshot -> errors/logs -> stop.

## Screenshots

- Runtime screenshot은 게임 viewport를 캡처하므로 최종 플레이 화면 증거에 적합하다. `godot-mcp-tomyud1`는 PNG 파일과 선택적 base64를 반환하고, `godot-mcp-runtime`는 `.mcp/screenshots/`에 저장한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/runtime/mcp_runtime.gd`, `/Users/user/git/harness/godot-mcp-runtime/src/scripts/mcp_bridge.gd`.
- Editor screenshot은 배치/구도 검토에 유용하지만 현재 editor tab, 활성 viewport, 카메라 상태에 영향을 받는다. `godotiq`는 3D viewport 활성화, camera 존재, camera restore를 명시한다. 근거: `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_server.gd`.
- `funplay-godot-mcp`의 `capture_editor_view`는 2D/3D editor viewport texture를 PNG data URI나 파일로 반환한다. 런타임이 아니라 editor view라서 플레이 검증과 구분해야 한다. 근거: `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_core_tools.gd`.
- Unity 레포의 성숙한 패턴: `unity-mcp`는 game_view/scene_view, inline base64, surround/orbit contact sheet, target framing을 분리한다. Godot 3D 하네스도 단일 screenshot보다 target orbit/contact sheet를 별도 도구로 두면 공간 오류를 더 빨리 찾는다. 근거: `/Users/user/git/harness/unity-mcp/unity-mcp-skill/references/tools-reference.md`, `/Users/user/git/harness/unity-mcp/Server/src/services/tools/manage_camera.py`.

## Import, Export, Resource Handling

- `better-godot-mcp`는 `project export`에서 `godot --headless --path <project> --export-release <preset> <output>`를 호출한다. 근거: `/Users/user/git/harness/better-godot-mcp/src/tools/composite/project.ts`.
- `godot-mcp-coding-solo`와 `godot-mcp-runtime`는 `export_mesh_library`, `load_sprite`, `save_scene`, UID 관리로 GridMap/MeshLibrary와 Godot 4.4 UID 갱신을 다룬다. 근거: `/Users/user/git/harness/godot-mcp-coding-solo/src/scripts/godot_operations.gd`, `/Users/user/git/harness/godot-mcp-runtime/README.md`.
- 에디터 addon 계열은 외부 파일 생성 뒤 `rescan_filesystem` 또는 `EditorFileSystem.scan()`이 필요하다. 단, `godot-mcp-tomyud1`는 `ProjectSettings`의 in-memory 상태와 disk `project.godot`가 restart 전까지 다를 수 있다고 명시한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- Resource-typed property는 일반 `set_property`로 JSON 값을 넣지 말고 전용 tool을 써야 한다. `godot-mcp-tomyud1`는 `set_collision_shape`, `set_sprite_texture`, `set_mesh`, `set_material`로 분리하고, `modify_node_property(property="script")`를 거부한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/mcp-server/src/tools/scene-tools.ts`, `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/scene_tools.gd`.

## Playtesting

- `godot-mcp-tomyud1`의 `run_scene`은 에디터 playing 상태와 runtime helper 연결을 별도로 대기한다. `wait_for_runtime=true`가 screenshot/input의 선행 조건이다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- `godot-mcp-runtime`는 `background: true`로 창을 off-screen, no-focus, mouse-passthrough, borderless로 옮기면서 programmatic input과 screenshot은 유지한다. 자동화 CI/장시간 작업에 유용하다. 근거: `/Users/user/git/harness/godot-mcp-runtime/README.md`, `/Users/user/git/harness/godot-mcp-runtime/src/scripts/mcp_bridge.gd`.
- `funplay-godot-mcp`는 `enter_play_mode`, `simulate_action`, `simulate_key_event`, `simulate_mouse_button`, `simulate_mouse_drag`, `simulate_input_sequence`, `assert_node_exists`, `assert_node_property`, `assert_signal_connected`, `get_performance_snapshot`를 제공한다. 다만 `wait_msec`는 `OS.delay_msec`라 긴 대기는 editor/MCP 응답을 막을 수 있다. 근거: `/Users/user/git/harness/funplay-godot-mcp/addons/funplay_mcp/core/funplay_core_tools.gd`.
- `godotiq`는 input 시퀀스 전후 scene state snapshot과 signal wait를 지원한다. Dream of One의 deterministic verdict/evidence 검증에는 input 후 상태 diff가 유용하다. 근거: `/Users/user/git/harness/godotiq/addons/godotiq/godotiq_runtime.gd`.

## MCP Pitfalls

- 포트와 연결 모델:
  - `godot-mcp-tomyud1`: WebSocket `127.0.0.1:6505`, visualizer HTTP `6510`, editor/runtime 각 1개.
  - `godotiq`: WebSocket `127.0.0.1:6007`, `.godotiq/bridge_token` 인증.
  - `funplay-godot-mcp`: HTTP `127.0.0.1:8765`, 포트 충돌 시 fallback 저장.
  - `godot-mcp-runtime`: UDP `127.0.0.1:9900`, active project/session 1개.
- 임의 코드 실행은 생산성을 높이지만 보안/결정성 리스크가 크다. `Godot-MCP execute_editor_script`, `funplay-godot-mcp execute_code`, `godotiq exec_editor/exec`, `godot-mcp-runtime run_script`는 모두 allowlist, timeout, read-only mode, 로그 캡처가 필요하다.
- Headless 수정은 autoload 실패에 취약하다. `godot-mcp-runtime`는 "headless Godot initializes ALL registered autoloads"를 명시하고, autoload list/remove를 Godot 프로세스 없이 수행한다. 근거: `/Users/user/git/harness/godot-mcp-runtime/src/index.ts`, `/Users/user/git/harness/godot-mcp-runtime/src/tools/project-tools.ts`.
- `.tscn` 직접 편집은 빠르지만 Godot가 저장하는 canonical format, ext_resource id, sub_resource, UID, Variant literal을 깨뜨릴 수 있다. 안전한 경로는 Godot loader로 instantiate -> set -> pack -> save다.
- Blocking wait는 연결을 죽인다. `godot-mcp-tomyud1`는 `wait`에서 `OS.delay_msec` 대신 `SceneTree.create_timer().timeout`를 사용해 WebSocket pump timeout을 피한다. 근거: `/Users/user/git/harness/godot-mcp-tomyud1/addons/godot_mcp/tools/project_tools.gd`.
- "save 직접 수행" 정책은 undo와 충돌한다. `godot-mcp-tomyud1` README는 no undo, changes save directly를 한계로 둔다. 반대로 `Godot-MCP`와 `godotiq` 일부 node op는 EditorUndoRedoManager를 사용한다. Dream of One 하네스는 자동 수정과 검증을 분리하고, 수정 전후 git diff를 evidence에 포함해야 한다.

## Dream of One 적용

- 우선순위는 `file-first deterministic validation` + `runtime evidence bridge` 조합이다. Dream Law, Cover Test, Exposure, Station intake, inquest, verdict는 backend/fixture 검증이 SoT이고, Godot runtime은 그 결과를 화면/노드/로그 evidence로 확인해야 한다.
- scene inspection tool은 최소한 `scene path`, `node path`, `class`, `script`, `groups`, `visible`, `3D transform`, `selected/open scene`, `runtime_root`를 반환해야 한다.
- screenshot tool은 세 종류로 분리:
  - runtime viewport PNG: 플레이 결과 증거
  - editor 3D viewport PNG: 공간 배치 검사
  - orbit/contact sheet: 3D occlusion, camera framing, node placement 검사
- input tool은 visible text 클릭이 아니라 path/name 기반 클릭과 action 기반 입력을 모두 제공해야 한다. 먼저 UI/control discovery를 요구한다.
- long-running playtest는 `run -> wait/poll -> observe -> input -> observe -> screenshot -> stop`로 고정하고, 각 step에 timestamp, scene, node path, error log tail을 남긴다.
- addon 설치형 도구는 repo 오염 위험이 있다. Dream of One에서는 `godot/tools/evidence_run.gd`, `runtime_slice_smoke.gd`처럼 프로젝트가 소유한 headless script를 SoT로 두고, 외부 MCP는 임시 보조 계층으로만 취급한다.
- bridge/autoload를 임시 주입하는 방식은 유용하지만 `project.godot`, `.gitignore`, `.mcp/`, generated bridge file 변경을 남길 수 있다. 실행 후 cleanup 검사가 필수다.
- ClassDB/API reflection을 하네스에 포함한다. Godot 3 API 환각, 잘못된 property, resource property JSON 주입을 사전에 막는다.
- runtime evidence는 "재미"가 아니라 "결정적 상태가 실제 화면/노드에 반영됐는가"를 증명해야 한다. Dream of One의 텍스트 위험 표면은 screenshot보다 log, label text, verdict node state, session termination path가 더 중요하다.

Game Harness Takeaways for Dream of One
