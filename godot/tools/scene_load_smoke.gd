extends SceneTree

## Instances the retained M1 harness and active M3R client scenes in-tree.
## This is deliberately a scene/runtime smoke, not a structural unit test.

const SCENES := [
	{"label": "store", "path": "res://scenes/world/store.tscn", "frames": 1},
	{"label": "station", "path": "res://scenes/world/station.tscn", "frames": 1},
	{"label": "player", "path": "res://scenes/actors/player.tscn", "frames": 1},
	{"label": "npc", "path": "res://scenes/actors/npc_2d.tscn", "frames": 1},
	{"label": "prop", "path": "res://scenes/props/record_prop_2d.tscn", "frames": 1},
	{"label": "hud", "path": "res://scenes/ui/hud.tscn", "frames": 1},
	{"label": "main", "path": "res://scenes/main.tscn", "frames": 4},
	{"label": "player_3d", "path": "res://scenes/actors/player_3d.tscn", "frames": 2},
	{"label": "npc_3d", "path": "res://scenes/actors/npc_3d.tscn", "frames": 2},
	{"label": "hud_3d", "path": "res://scenes/ui/hud_3d.tscn", "frames": 2},
	{"label": "town_3d", "path": "res://scenes/town/town_3d.tscn", "frames": 6},
	{"label": "main_3d", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{"label": "main_3d_contact", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{"label": "main_3d_hearing", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{
		"label": "main_3d_schedule",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_inside",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_outside",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
	{
		"label": "main_3d_ambient_leave",
		"path": "res://scenes/main_3d.tscn",
		"frames": 6,
	},
]

var _failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	_check_engine_baseline()
	for spec in SCENES:
		await _instance_scene(spec)

	if _failures.is_empty():
		print("PASS scene_load_smoke: instanced %d scenes in-tree" % SCENES.size())
		quit(0)
		return
	for failure in _failures:
		print("FAIL scene_load_smoke: %s" % failure)
	quit(1)

func _check_engine_baseline() -> void:
	var renderer := str(ProjectSettings.get_setting("rendering/renderer/rendering_method", ""))
	var physics_engine := str(ProjectSettings.get_setting("physics/3d/physics_engine", ""))
	if renderer != "forward_plus":
		_failures.append("renderer is %s instead of forward_plus" % renderer)
	if physics_engine != "Jolt Physics":
		_failures.append("3D physics is %s instead of Jolt Physics" % physics_engine)
	_check_jump_input_contract()
	if renderer == "forward_plus" and physics_engine == "Jolt Physics":
		print("PASS scene_load_smoke: Forward+ renderer and Jolt Physics baseline")


func _check_jump_input_contract() -> void:
	if not InputMap.has_action(&"jump"):
		_failures.append("3D player jump action is missing")
		return
	if not _action_has_physical_key(&"jump", KEY_SPACE):
		_failures.append("3D player jump action is not bound to physical Space")
	if _action_has_physical_key(&"interact", KEY_SPACE):
		_failures.append("physical Space still triggers interact as well as jump")
	if not InputMap.has_action(&"open_log") or not _action_has_physical_key(&"open_log", KEY_TAB):
		_failures.append("M3R inspect log is not bound to physical Tab")


func _action_has_physical_key(action: StringName, keycode: int) -> bool:
	for event in InputMap.action_get_events(action):
		if event is InputEventKey and int((event as InputEventKey).physical_keycode) == keycode:
			return true
	return false

func _instance_scene(spec: Dictionary) -> void:
	var label := str(spec.get("label", "unknown"))
	var path := str(spec.get("path", ""))
	var resource := ResourceLoader.load(path)
	if not resource is PackedScene:
		_failures.append("%s did not load as PackedScene: %s" % [label, path])
		return

	var instance := (resource as PackedScene).instantiate()
	if instance == null:
		_failures.append("%s could not instantiate: %s" % [label, path])
		return
	root.add_child(instance)
	for _frame in range(maxi(1, int(spec.get("frames", 1)))):
		await process_frame
	if label in [
		"town_3d",
		"main_3d",
		"main_3d_contact",
		"main_3d_hearing",
		"main_3d_schedule",
		"main_3d_ambient_inside",
		"main_3d_ambient_outside",
		"main_3d_ambient_leave",
	]:
		var town := instance if label == "town_3d" else instance.get_node_or_null("Town")
		if town != null:
			await _wait_for_town_navigation(label, town)

	if not is_instance_valid(instance) or not instance.is_inside_tree():
		_failures.append("%s did not survive one process frame" % label)
	else:
		_check_runtime_shape(label, instance)
		if label == "town_3d":
			await _check_npc_movement(label, instance)
		if label == "main_3d":
			await _check_run_conversation(label, instance)
		if label == "main_3d_contact":
			await _check_player_contact(label, instance)
		if label == "main_3d_hearing":
			await _check_hearing_and_outcome(label, instance)
		if label == "main_3d_schedule":
			await _check_run_clock_and_schedule(label, instance)
		if label == "main_3d_ambient_inside":
			await _check_ambient_speech(label, instance, true)
		if label == "main_3d_ambient_outside":
			await _check_ambient_speech(label, instance, false)
		if label == "main_3d_ambient_leave":
			await _check_ambient_speech(label, instance, true, true)
		if not _has_failure_for(label):
			print("PASS scene_load_smoke: %s" % label)

	if is_instance_valid(instance):
		var stopped_speech_blip := _stop_scene_speech_blips(instance)
		if stopped_speech_blip:
			await create_timer(0.2).timeout
			_clear_scene_speech_blip_streams(instance)
			await process_frame
		instance.queue_free()
		await process_frame


func _stop_scene_speech_blips(node: Node) -> bool:
	var stopped := false
	if node is AudioStreamPlayer3D and node.name == &"SpeechBlip":
		var player := node as AudioStreamPlayer3D
		if player.playing:
			player.stop()
			stopped = true
	for child in node.get_children():
		if child is Node:
			stopped = _stop_scene_speech_blips(child as Node) or stopped
	return stopped


func _clear_scene_speech_blip_streams(node: Node) -> void:
	if node is AudioStreamPlayer3D and node.name == &"SpeechBlip":
		(node as AudioStreamPlayer3D).stream = null
	for child in node.get_children():
		if child is Node:
			_clear_scene_speech_blip_streams(child as Node)


func _wait_for_town_navigation(label: String, town: Node) -> void:
	var region := town.get_node_or_null(
		"Navigation/TownNavigation"
	) as NavigationRegion3D
	if region == null:
		return
	var layout: Dictionary = town.call("layout_snapshot")
	var player_start: Dictionary = layout.get("player_start", {})
	var start := _vector3_from_json(player_start.get("position", []))
	var target := _anchor_position(layout, "Park.meeting_north")
	for _frame in range(120):
		var navigation_map := region.get_navigation_map()
		if navigation_map.is_valid() and NavigationServer3D.map_get_iteration_id(
			navigation_map
		) > 0:
			var projected_start := NavigationServer3D.map_get_closest_point(
				navigation_map,
				start
			)
			var projected_target := NavigationServer3D.map_get_closest_point(
				navigation_map,
				target
			)
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				projected_start,
				projected_target,
				true
			)
			if (
				projected_start.distance_to(start) <= 0.65
				and projected_target.distance_to(target) <= 0.65
				and path.size() >= 2
				and path[path.size() - 1].distance_to(projected_target) <= 0.65
			):
				return
		await physics_frame
	_failures.append("%s navigation map did not become query-ready in 120 physics frames" % label)

func _check_runtime_shape(label: String, instance: Node) -> void:
	match label:
		"main":
			_require_node(label, instance, "WorldFrame/WorldContainer/WorldViewport")
			_require_node(label, instance, "WorldFrame/WorldContainer/WorldViewport/World")
			_require_node(label, instance, "HUD")
			# World scale contract (main.gd WORLD_VIEW_LADDER): the viewport is
			# one of the ladder views and the container applies an integer scale.
			var viewport := instance.get_node_or_null("WorldFrame/WorldContainer/WorldViewport") as SubViewport
			var container := instance.get_node_or_null("WorldFrame/WorldContainer") as SubViewportContainer
			if viewport != null:
				var ladder_views: Array[Vector2i] = []
				for step in instance.WORLD_VIEW_LADDER:
					ladder_views.append(step.get("view", Vector2i.ZERO))
				if not ladder_views.has(viewport.size):
					_failures.append("main world viewport %s is not a ladder view %s" % [viewport.size, ladder_views])
			if container != null:
				var scale_x := container.scale.x
				if scale_x < 1.0 or absf(scale_x - roundf(scale_x)) > 0.0001 or container.scale.y != scale_x:
					_failures.append("main world container scale is not a positive integer: %s" % container.scale)
			var world := instance.get_node_or_null("WorldFrame/WorldContainer/WorldViewport/World")
			if world != null and world.get_child_count() == 0:
				_failures.append("main World stayed empty after startup frames")
		"store", "station":
			if not instance.has_method("get_player") or instance.call("get_player") == null:
				_failures.append("%s did not build its player" % label)
			_require_node(label, instance, "Ground")
			_require_node(label, instance, "Walls")
			_require_node(label, instance, "Actors")
		"player":
			var sprite := instance.get_node_or_null("Sprite") as AnimatedSprite2D
			if sprite == null or sprite.sprite_frames == null:
				_failures.append("player has no runtime SpriteFrames")
		"npc":
			var sprite := instance.get_node_or_null("Sprite") as AnimatedSprite2D
			if sprite == null or sprite.sprite_frames == null:
				_failures.append("npc has no runtime SpriteFrames")
			if instance.get_node_or_null("SpeechBubble") != null or instance.get_node_or_null("ReactionMarker") != null:
				_failures.append("npc still renders normal-play text inside the pixel SubViewport")
			var debug_label := instance.get_node_or_null("DebugLabel") as Label
			if debug_label == null or debug_label.visible:
				_failures.append("npc raw debug label is missing or visible in normal play")
			var full_utterance := "가나다라마바사아자차카타파하".repeat(3)
			instance.call("show_speech", full_utterance)
			instance.call("set_reaction", "reported", "보고함")
			var overlay: Dictionary = instance.call("overlay_payload")
			if str(overlay.get("action", "")).is_empty():
				_failures.append("npc exposes no normal-view current action")
			var expected_summary := full_utterance.left(instance.BUBBLE_MAX_CHARS) + "…"
			if str(overlay.get("speech", "")) != expected_summary:
				_failures.append("npc native speech payload does not preserve 36-char gist + ellipsis")
			if not bool(overlay.get("reactionVisible", false)) or str(overlay.get("reaction", "")) != "보고함":
				_failures.append("npc native reaction payload is missing")
			var inspect: Dictionary = instance.call("inspect_payload")
			if str(inspect.get("utterance", "")) != full_utterance:
				_failures.append("npc inspect payload lost the full utterance")
			var bubble_timer := instance.get("_bubble_timer") as Timer
			if bubble_timer == null or not is_equal_approx(bubble_timer.wait_time, instance.BUBBLE_SECONDS):
				_failures.append("npc speech timer no longer preserves the 7-second contract")
		"prop":
			var sprite := instance.get_node_or_null("Sprite") as Sprite2D
			if sprite == null or sprite.texture == null:
				_failures.append("prop has no runtime texture")
			if instance.get_node_or_null("StateLabel") != null:
				_failures.append("prop still renders its state inside the pixel SubViewport")
			instance.call("configure", {"propId": "smoke_prop", "label": "정정표", "state": "offered"})
			instance.call("set_focused", true)
			var overlay: Dictionary = instance.call("overlay_payload")
			if not bool(overlay.get("stateVisible", false)) or str(overlay.get("state", "")).is_empty():
				_failures.append("focused prop exposes no native state payload")
		"hud":
			_require_node(label, instance, "Root/ConversationPanel")
			_require_node(label, instance, "Root/InspectPanel")
			_require_node(label, instance, "Root/OutcomePanel")
			_require_node(label, instance, "Root/WorldTextOverlays")
		"player_3d":
			_require_node(label, instance, "CollisionShape3D")
			_require_node(label, instance, "Head/Camera3D/InteractionRay")
			_require_node(label, instance, "NavigationObstacle3D")
			var camera := instance.get_node_or_null("Head/Camera3D") as Camera3D
			if camera == null or not camera.current or not is_equal_approx(camera.fov, 75.0):
				_failures.append("player_3d camera baseline drifted")
			var player_body := instance as CharacterBody3D
			var tuned_jump_velocity := float(instance.get("jump_velocity"))
			if tuned_jump_velocity < 4.0 or tuned_jump_velocity > 5.0:
				_failures.append(
					"player_3d jump velocity is outside its grounded baseline: %s"
					% tuned_jump_velocity
				)
			if not instance.has_method("can_jump"):
				_failures.append("player_3d exposes no grounded jump eligibility")
			elif bool(instance.call("can_jump")) != (
				bool(instance.get("_control_enabled")) and player_body.is_on_floor()
			):
				_failures.append("player_3d jump eligibility ignores control or floor state")
			else:
				instance.call("set_control_enabled", false)
				if bool(instance.call("can_jump")):
					_failures.append("player_3d can jump while player control is locked")
				instance.call("set_control_enabled", true)
		"npc_3d":
			_require_node(label, instance, "CollisionShape3D")
			_require_node(label, instance, "RoleAccent")
			_require_node(label, instance, "NavigationAgent3D")
			_require_node(label, instance, "SpeechBlip")
			var speech_blip := instance.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
			if speech_blip != null:
				var stream := speech_blip.stream as AudioStreamWAV
				if stream == null:
					_failures.append("npc_3d has no procedural speech blip stream")
				elif (
					stream.format != AudioStreamWAV.FORMAT_16_BITS
					or stream.mix_rate != 22050
					or stream.data.is_empty()
				):
					_failures.append("npc_3d speech blip PCM contract drifted")
		"hud_3d":
			_require_node(label, instance, "Overlay/Reticle")
			_require_node(label, instance, "Overlay/PromptPanel")
			_require_node(label, instance, "Overlay/AmbientSubtitlePanel")
			_require_node(label, instance, "Overlay/SettingsShade")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/UiScaleOption")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/MasterVolumeSlider")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SfxVolumeSlider")
			_require_node(label, instance, "Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/LanguageOption")
			_require_node(label, instance, "Overlay/LogShade/LogPanel")
			_require_node(label, instance, "Overlay/DebugPanel")
			if not instance.has_method("presentation_snapshot"):
				_failures.append("hud_3d exposes no presentation snapshot")
			else:
				_check_social_hud_contract(label, instance as HUD3D)
		"town_3d":
			_require_node(label, instance, "Environment/WorldEnvironment")
			_require_node(label, instance, "Geometry/Ground/TownGround/Collision")
			_require_node(label, instance, "Actors/Player3D")
			var physical_doors := instance.get_node_or_null("Doors")
			if physical_doors != null and physical_doors.get_child_count() > 0:
				_failures.append("town_3d still contains physical doors")
			var actors := instance.get_node_or_null("Actors")
			if actors == null or actors.get_child_count() != 7:
				_failures.append("town_3d does not contain player plus six residents")
			var region := instance.get_node_or_null("Navigation/TownNavigation") as NavigationRegion3D
			if region == null or region.navigation_mesh == null:
				_failures.append("town_3d has no NavigationMesh")
			elif region.navigation_mesh.get_polygon_count() == 0:
				_failures.append("town_3d NavigationMesh has no polygons")
			else:
				_check_town_navigation(label, instance, region)
				_check_npc_spatial_facts(label, instance)
			_check_town_location_coverage(label, instance)
			_check_respawn_anchor_contract(label, instance)
			for tree_blocker_name in [
				"TreeNorthWestBlocker",
				"TreeNorthEastBlocker",
				"TreeSouthWestBlocker",
				"TreeSouthEastBlocker",
			]:
				_require_node(label, instance, "Props/Blockers/%s/Collision" % tree_blocker_name)
			_check_town_dressing_density(label, instance)
			_check_record_surface_bindings(label, instance)
			if not instance.has_method("binding_errors"):
				_failures.append("town_3d exposes no layout binding check")
			else:
				var binding_errors: Variant = instance.call("binding_errors")
				if binding_errors is PackedStringArray and not (binding_errors as PackedStringArray).is_empty():
					_failures.append("town_3d layout bindings failed: %s" % binding_errors)
		"main_3d", "main_3d_schedule", "main_3d_ambient_inside", "main_3d_ambient_outside", "main_3d_ambient_leave":
			_require_node(label, instance, "Town")
			_require_node(label, instance, "Town/Actors/Player3D")
			_require_node(label, instance, "HUD3D")
			_require_node(label, instance, "RunSession")
			_require_node(label, instance, "AgentPlaytestSurface")
			if instance.process_mode != Node.PROCESS_MODE_ALWAYS:
				_failures.append("main_3d does not process during its modal pause")
			var town := instance.get_node_or_null("Town")
			var run_session := instance.get_node_or_null("RunSession")
			if town != null and town.process_mode != Node.PROCESS_MODE_PAUSABLE:
				_failures.append("main_3d Town keeps processing during conversation")
			if run_session != null and run_session.process_mode != Node.PROCESS_MODE_ALWAYS:
				_failures.append("main_3d RunSession stops during conversation")
			if run_session != null and not run_session.has_method("encounter"):
				_failures.append("main_3d RunSession exposes no encounter endpoint")
			for surface_value in instance.get_tree().get_nodes_in_group(&"record_surfaces"):
				if not surface_value is Node:
					continue
				var surface := surface_value as Node
				if not surface.is_connected(
					&"record_surface_requested",
					Callable(instance, "_on_record_surface_requested")
				):
					_failures.append(
						"%s leaves record surface %s unwired"
						% [label, str(surface.get("surface_id"))]
					)
			var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
			if playtest_surface == null or not playtest_surface.has_method("snapshot"):
				_failures.append("main_3d has no AgentPlaytestSurface snapshot")

func _check_social_hud_contract(label: String, hud: HUD3D) -> void:
	if hud == null:
		return
	var sample_view := {
		"revision": 2,
		"hearing": {"atSeconds": 1800, "due": false},
		"pressure": {
			"band": "raised",
			"latestEncounteredWhyLine": "접수 기록이 검토 대기 상태입니다.",
		},
		"encounteredResidents": [{
			"actorId": "NPC_Studio_Receptionist",
			"stance": "uncertain",
			"stanceRevision": 1,
			"whyLine": "답변의 확인 순서가 남아 있습니다.",
			"provenance": {
				"originKind": "speech",
				"originActorId": "NPC_Studio_Receptionist",
				"recipientKind": "listener",
				"recipientActorId": "player",
				"sourceMemoryId": "hidden-memory-id",
				"recordId": null,
				"recordRevision": null,
				"ledgerEventId": null,
				"whyLine": "직접 들은 답변입니다.",
			},
		}],
		"openQuestions": [{
			"questionId": "hidden-question-id",
			"subjectActorId": "NPC_Studio_Receptionist",
			"status": "open",
			"text": "접수 순서를 누가 확인했는가?",
			"whyLine": "확인 주체가 아직 드러나지 않았습니다.",
			"provenance": null,
		}],
		"encounteredRecords": [{
			"recordId": "hidden-record-id",
			"kind": "note",
			"authorActorId": "NPC_Studio_Receptionist",
			"targetId": "player",
			"stateBody": "접수 순서 확인이 보류되었습니다.",
			"recordRevision": 1,
			"lastLedgerEventId": "hidden-ledger-id",
			"provenance": null,
		}],
		"hiddenSuspicion": 99,
	}
	if not hud.set_social_view(sample_view):
		_failures.append("%s rejected a newer authoritative social view" % label)
		return
	var frame_label := hud.get_node_or_null(
		"Overlay/EncounteredStancePanel/EncounteredStanceMargin/EncounteredStanceLabel"
	) as Label
	var first_hearing_text := frame_label.text if frame_label != null else ""
	if not first_hearing_text.contains("30"):
		_failures.append("%s hearing frame does not show one fixed scheduled time" % label)
	if first_hearing_text.contains("접수 기록이 검토 대기 상태입니다."):
		_failures.append("%s permanent pressure frame leaked its encountered reason" % label)
	var stale_view := sample_view.duplicate(true)
	stale_view["revision"] = 1
	stale_view["hearing"] = {"atSeconds": 60, "due": false}
	if hud.set_social_view(stale_view):
		_failures.append("%s accepted a stale social view replacement" % label)
	var social_snapshot := hud.social_view_snapshot()
	if int(social_snapshot.get("revision", -1)) != 2:
		_failures.append("%s lost the newest social view revision" % label)
	if frame_label != null and frame_label.text != first_hearing_text:
		_failures.append("%s hearing display changed into a countdown" % label)
	var was_paused := paused
	hud.open_log()
	var opened := hud.presentation_snapshot()
	if str(opened.get("modalSurface", "")) != "inspect" or paused != was_paused:
		_failures.append("%s inspect log pauses the world or lacks inspect modal state" % label)
	var normal_text := "%s\n%s" % [
		frame_label.text if frame_label != null else "",
		str((opened.get("log", {}) as Dictionary).get("body", "")),
	]
	for hidden_value in [
		"NPC_Studio_Receptionist",
		"hidden-memory-id",
		"hidden-question-id",
		"hidden-record-id",
		"hidden-ledger-id",
		"99",
	]:
		if normal_text.contains(hidden_value):
			_failures.append("%s normal social UI leaked raw hidden data: %s" % [label, hidden_value])
	if not normal_text.contains("접수 순서 확인이 보류되었습니다."):
		_failures.append("%s inspect log omitted disclosed run-locale record prose" % label)
	if not str((opened.get("log", {}) as Dictionary).get("body", "")).contains(
		"접수 기록이 검토 대기 상태입니다."
	):
		_failures.append("%s inspect log omitted the encountered pressure reason" % label)
	hud.close_log()
	if bool(hud.presentation_snapshot().get("debugVisible", true)):
		_failures.append("%s F3 diagnostics are visible by default" % label)


func _check_record_surface_bindings(label: String, town: Node) -> void:
	var layout: Dictionary = town.call("layout_snapshot")
	var expected_record_ids: Dictionary = {}
	for surface_value in layout.get("text_surfaces", []):
		if not surface_value is Dictionary:
			continue
		var surface := surface_value as Dictionary
		if str(surface.get("kind", "")) == "record_surface":
			expected_record_ids[str(surface.get("id", ""))] = true
	if expected_record_ids.size() != 4:
		_failures.append("%s layout does not expose four administrative record surfaces" % label)
	for surface_id_value in expected_record_ids:
		var surface_id := str(surface_id_value)
		var node := town.get_node_or_null("Props/TextSurfaces/%s" % surface_id)
		if node == null or not node.has_method("is_interaction_enabled"):
			_failures.append("%s record surface is not bound: %s" % [label, surface_id])
			continue
		var record_surface := node as StaticBody3D
		if (
			not bool(record_surface.call("is_interaction_enabled"))
			or str(record_surface.call("interaction_kind")) != "record_surface"
			or record_surface.get_collision_layer_value(4) != true
		):
			_failures.append("%s record surface interaction contract drifted: %s" % [label, surface_id])
		if (
			surface_id == "TS_Park_NoticeBoard"
			and (
				not record_surface.is_in_group(&"town_navigation_source")
				or not record_surface.get_collision_layer_value(1)
			)
		):
			_failures.append("%s freestanding park record surface is absent from nav bake" % label)
	var hearing_notice := town.get_node_or_null("Props/TextSurfaces/TS_Station_HearingNotice")
	if (
		hearing_notice == null
		or not hearing_notice.has_method("is_interaction_enabled")
		or bool(hearing_notice.call("is_interaction_enabled"))
	):
		_failures.append("%s hearing notice became a record-surface encounter" % label)


func _check_town_navigation(label: String, instance: Node, region: NavigationRegion3D) -> void:
	var navigation_map := region.get_navigation_map()
	if not navigation_map.is_valid() or NavigationServer3D.map_get_iteration_id(navigation_map) == 0:
		_failures.append("%s navigation map did not synchronize" % label)
		return
	var project_cell_size := float(
		ProjectSettings.get_setting("navigation/3d/default_cell_size", 0.25)
	)
	var project_cell_height := float(
		ProjectSettings.get_setting("navigation/3d/default_cell_height", 0.25)
	)
	if not is_equal_approx(project_cell_size, region.navigation_mesh.cell_size):
		_failures.append(
			"%s navigation map cell size does not match its baked mesh" % label
		)
	if not is_equal_approx(project_cell_height, region.navigation_mesh.cell_height):
		_failures.append(
			"%s navigation map cell height does not match its baked mesh" % label
		)
	var layout: Dictionary = instance.call("layout_snapshot")
	var player_start: Dictionary = layout.get("player_start", {})
	var start := _vector3_from_json(player_start.get("position", []))
	var projected_start := NavigationServer3D.map_get_closest_point(
		navigation_map,
		start
	)
	for vertex in region.navigation_mesh.get_vertices():
		if vertex.y <= 1.0:
			continue
		var elevated_path := NavigationServer3D.map_get_path(
			navigation_map,
			projected_start,
			vertex,
			true
		)
		if (
			elevated_path.size() >= 2
			and elevated_path[elevated_path.size() - 1].distance_to(vertex) <= 0.65
		):
			_failures.append("%s navmesh contains a reachable elevated island" % label)
			break
	var targets := {
		"studio": _anchor_position(layout, "Studio.door_inside"),
		"office": _anchor_position(layout, "Office.door_inside"),
		"station": _anchor_position(layout, "Station.door_inside"),
	}
	for target_name in targets:
		var path := NavigationServer3D.map_get_path(
			navigation_map,
			start,
			targets[target_name],
			true
		)
		if path.size() < 2:
			_failures.append("%s navmesh cannot reach %s interior" % [label, target_name])
		elif path[path.size() - 1].distance_to(targets[target_name]) > 0.65:
			var endpoint := path[path.size() - 1]
			_failures.append(
				"%s navmesh projects %s %.2fm from its interior target (end=%s target=%s)"
				% [
					label,
					target_name,
					endpoint.distance_to(targets[target_name]),
					endpoint,
					targets[target_name],
				]
			)
	_check_semantic_meeting_slots(label, instance, region, layout, start)
	_check_authored_route_paths(label, region, layout)
	_check_actor_spawn_clearance(label, instance, region, layout)


func _check_authored_route_paths(
	label: String,
	region: NavigationRegion3D,
	layout: Dictionary
) -> void:
	var routes_value: Variant = layout.get("routes", [])
	if not routes_value is Array or (routes_value as Array).is_empty():
		_failures.append("%s layout has no authored NPC routes" % label)
		return
	var navigation_map := region.get_navigation_map()
	for route_value in routes_value as Array:
		if not route_value is Dictionary:
			continue
		var route := route_value as Dictionary
		var route_id := str(route.get("id", "unknown"))
		var points_value: Variant = route.get("points", [])
		if not points_value is Array or (points_value as Array).size() < 2:
			_failures.append("%s route %s has fewer than two points" % [label, route_id])
			continue
		var points := points_value as Array
		for point_index in points.size():
			var from_ref := str(points[point_index])
			var to_ref := str(points[(point_index + 1) % points.size()])
			var authored_from := _anchor_position(layout, from_ref)
			var authored_to := _anchor_position(layout, to_ref)
			var projected_from := NavigationServer3D.map_get_closest_point(
				navigation_map,
				authored_from
			)
			var projected_to := NavigationServer3D.map_get_closest_point(
				navigation_map,
				authored_to
			)
			if _planar_distance(projected_from, authored_from) > 0.65:
				_failures.append(
					"%s route %s projects too far from %s"
					% [label, route_id, from_ref]
				)
				continue
			if _planar_distance(projected_to, authored_to) > 0.65:
				_failures.append(
					"%s route %s projects too far from %s"
					% [label, route_id, to_ref]
				)
				continue
			if _planar_distance(projected_from, projected_to) <= 0.05:
				continue
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				projected_from,
				projected_to,
				true
			)
			if (
				path.size() < 2
				or _planar_distance(path[path.size() - 1], projected_to) > 0.65
			):
				_failures.append(
					"%s route %s cannot traverse %s -> %s"
					% [label, route_id, from_ref, to_ref]
				)


func _planar_distance(left: Vector3, right: Vector3) -> float:
	return Vector2(left.x - right.x, left.z - right.z).length()


func _check_actor_spawn_clearance(
	label: String,
	instance: Node,
	region: NavigationRegion3D,
	layout: Dictionary
) -> void:
	var actors_value: Variant = layout.get("actors", [])
	if not actors_value is Array:
		_failures.append("%s layout has no resident spawn definitions" % label)
		return
	var navigation_map := region.get_navigation_map()
	for actor_value in actors_value as Array:
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		var actor_id := str(actor.get("id", "unknown"))
		var spawn_anchor := str(actor.get("spawn_anchor", ""))
		var authored_spawn := _anchor_position(layout, spawn_anchor)
		var projected_spawn := NavigationServer3D.map_get_closest_point(
			navigation_map,
			authored_spawn
		)
		if _planar_distance(projected_spawn, authored_spawn) > 0.35:
			_failures.append(
				"%s %s spawn is obstructed by baked collision"
				% [label, actor_id]
			)
		var actor_node := instance.get_node_or_null("Actors/%s" % actor_id) as Node3D
		if (
			actor_node == null
			or _planar_distance(actor_node.global_position, authored_spawn) > 0.05
		):
			_failures.append(
				"%s %s did not instantiate at its authored spawn"
				% [label, actor_id]
			)


func _check_npc_spatial_facts(label: String, instance: Node) -> void:
	if not instance.has_method("npc_spatial_facts"):
		_failures.append("%s exposes no engine-derived NPC spatial facts" % label)
		return
	var facts_value: Variant = instance.call("npc_spatial_facts")
	if not facts_value is Array or (facts_value as Array).size() != 6:
		_failures.append("%s spatial packet does not contain exactly six residents" % label)
		return
	var facts := facts_value as Array
	if not instance.has_method("spatial_facts"):
		_failures.append("%s exposes no player-aware spatial packet" % label)
		return
	var spatial_packet: Dictionary = instance.call("spatial_facts")
	var player_fact: Dictionary = spatial_packet.get("player", {})
	if (
		not player_fact.get("position", null) is Array
		or (player_fact.get("position", []) as Array).size() != 3
		or typeof(player_fact.get("locationId", "")) != TYPE_STRING
	):
		_failures.append("%s player spatial fact is incomplete" % label)
	var by_actor: Dictionary = {}
	var ordered_actor_ids: Array[String] = []
	for fact_value in facts:
		if not fact_value is Dictionary:
			_failures.append("%s spatial packet contains a non-dictionary fact" % label)
			continue
		var fact := fact_value as Dictionary
		var actor_id := str(fact.get("actorId", ""))
		ordered_actor_ids.append(actor_id)
		by_actor[actor_id] = fact
		var position_value: Variant = fact.get("position", [])
		if not position_value is Array or (position_value as Array).size() != 3:
			_failures.append("%s %s spatial position is not a 3D tuple" % [label, actor_id])
		for key in [
			"reachableAnchorRefs",
			"visibleActorIds",
			"audibleActorIds",
			"visibleObjectIds",
		]:
			var ids_value: Variant = fact.get(key, null)
			if not ids_value is Array:
				_failures.append("%s %s spatial %s is not an array" % [label, actor_id, key])
				continue
			var ids := ids_value as Array
			var normalized: Array[String] = []
			for id_value in ids:
				normalized.append(str(id_value))
			var sorted_unique := normalized.duplicate()
			sorted_unique.sort()
			sorted_unique = _dedupe_strings(sorted_unique)
			if normalized != sorted_unique:
				_failures.append("%s %s spatial %s is not sorted/deduped" % [label, actor_id, key])
		if not (fact.get("reachableAnchorRefs", []) as Array).has("Park.center"):
			_failures.append("%s %s cannot reach the connected town NavMesh" % [label, actor_id])
		if not (fact.get("visibleObjectIds", []) as Array).is_empty():
			_failures.append("%s invented visible 3D object ids before canonical props exist" % label)
		for boolean_key in ["playerVisible", "playerAudible", "playerReachable"]:
			if typeof(fact.get(boolean_key, null)) != TYPE_BOOL:
				_failures.append(
					"%s %s spatial %s is not boolean" % [label, actor_id, boolean_key]
				)
		var zone_value: Variant = fact.get("playerInteractionZoneId", null)
		if zone_value != null and typeof(zone_value) != TYPE_STRING:
			_failures.append("%s %s player conversation zone is invalid" % [label, actor_id])
	var sorted_actor_ids := ordered_actor_ids.duplicate()
	sorted_actor_ids.sort()
	if ordered_actor_ids != sorted_actor_ids or by_actor.size() != 6:
		_failures.append("%s spatial residents are not unique and deterministically ordered" % label)
	var caretaker := by_actor.get("NPC_Park_Caretaker", {}) as Dictionary
	var liaison := by_actor.get("NPC_Roaming_Liaison", {}) as Dictionary
	if (
		not (caretaker.get("visibleActorIds", []) as Array).has("NPC_Roaming_Liaison")
		or not (liaison.get("visibleActorIds", []) as Array).has("NPC_Park_Caretaker")
	):
		_failures.append("%s engine LOS did not connect the unobstructed park residents" % label)
	if (
		not (caretaker.get("audibleActorIds", []) as Array).has("NPC_Roaming_Liaison")
		or not (liaison.get("audibleActorIds", []) as Array).has("NPC_Park_Caretaker")
	):
		_failures.append("%s authored park audibility did not connect nearby residents" % label)
	if (
		not bool(caretaker.get("playerReachable", false))
		or str(caretaker.get("playerInteractionZoneId", "")) != "ParkConversation"
	):
		_failures.append("%s player contact facts ignored Park nav/radius/role bindings" % label)
	for remote_actor_id in [
		"NPC_Studio_Receptionist",
		"NPC_Studio_Manager",
		"NPC_Office_Worker",
		"NPC_Station_Officer",
	]:
		var remote_fact := by_actor.get(remote_actor_id, {}) as Dictionary
		if remote_fact.get("playerInteractionZoneId", null) != null:
			_failures.append(
				"%s remote %s inherited the player's Park interaction zone"
				% [label, remote_actor_id]
			)


func _dedupe_strings(values: Array[String]) -> Array[String]:
	var deduped: Array[String] = []
	for value in values:
		if deduped.is_empty() or deduped[deduped.size() - 1] != value:
			deduped.append(value)
	return deduped


func _check_semantic_meeting_slots(
	label: String,
	instance: Node,
	region: NavigationRegion3D,
	layout: Dictionary,
	start: Vector3
) -> void:
	var schedule_value: Variant = layout.get("schedule", {})
	if not schedule_value is Dictionary:
		_failures.append("%s layout has no semantic schedule" % label)
		return
	var meeting_windows_value: Variant = (schedule_value as Dictionary).get(
		"meeting_windows",
		[]
	)
	if not meeting_windows_value is Array or (meeting_windows_value as Array).is_empty():
		_failures.append("%s layout has no semantic meeting windows" % label)
		return
	var navigation_map := region.get_navigation_map()
	for meeting_value in meeting_windows_value as Array:
		if not meeting_value is Dictionary:
			continue
		var meeting := meeting_value as Dictionary
		var meeting_id := str(meeting.get("id", "unknown"))
		var participant_refs_value: Variant = meeting.get("participant_anchor_refs", {})
		if not participant_refs_value is Dictionary:
			_failures.append("%s meeting %s has no participant slots" % [label, meeting_id])
			continue
		var projected_slots: Array[Vector3] = []
		for anchor_ref_value in (participant_refs_value as Dictionary).values():
			var anchor_ref := str(anchor_ref_value)
			var authored_position := _anchor_position(layout, anchor_ref)
			var projected_value: Variant = instance.call("navigation_position", anchor_ref)
			if not projected_value is Vector3:
				_failures.append(
					"%s meeting %s slot is not navmesh-bound: %s"
					% [label, meeting_id, anchor_ref]
				)
				continue
			var projected := projected_value as Vector3
			projected_slots.append(projected)
			if projected.distance_to(authored_position) > 0.65:
				_failures.append(
					"%s meeting %s slot projects too far from its authored anchor: %s"
					% [label, meeting_id, anchor_ref]
				)
			var path := NavigationServer3D.map_get_path(
				navigation_map,
				start,
				projected,
				true
			)
			if path.size() < 2 or path[path.size() - 1].distance_to(projected) > 0.65:
				_failures.append(
					"%s meeting %s slot is unreachable: %s"
					% [label, meeting_id, anchor_ref]
				)
		for left_index in projected_slots.size():
			for right_index in range(left_index + 1, projected_slots.size()):
				var planar_separation := Vector2(
					projected_slots[left_index].x - projected_slots[right_index].x,
					projected_slots[left_index].z - projected_slots[right_index].z
				).length()
				if planar_separation < 0.75:
					_failures.append(
						"%s meeting %s participant slots collapse together"
						% [label, meeting_id]
					)


func _check_town_location_coverage(label: String, instance: Node) -> void:
	var player := instance.get_node_or_null("Actors/Player3D") as Node3D
	if player == null or not instance.has_method("current_location_id"):
		return
	var original_transform := player.global_transform
	var samples := {
		"park": {"position": Vector3(0, 0.05, -6.9), "location": "Park"},
		"studio_path": {"position": Vector3(0, 0.05, -8), "location": "Park"},
		"studio_threshold": {"position": Vector3(0, 0.05, -12.1), "location": "Park"},
		"studio_inside": {"position": Vector3(0, 0.05, -12.3), "location": "Studio"},
		"office_threshold": {"position": Vector3(-12.1, 0.05, 0), "location": "Park"},
		"office_inside": {"position": Vector3(-12.3, 0.05, 0), "location": "Office"},
		"station_threshold": {"position": Vector3(12.1, 0.05, 0), "location": "Park"},
		"station_inside": {"position": Vector3(12.3, 0.05, 0), "location": "Station"},
	}
	for sample_name in samples:
		var sample: Dictionary = samples[sample_name]
		player.global_position = sample.get("position", Vector3.ZERO)
		var location_id := str(instance.call("current_location_id"))
		if location_id != str(sample.get("location", "")):
			_failures.append(
				"%s location coverage failed at %s: %s"
				% [label, sample_name, location_id]
			)
	player.global_transform = original_transform


func _check_respawn_anchor_contract(label: String, instance: Node) -> void:
	if not instance.has_method("nearest_anchor_position"):
		_failures.append("%s exposes no nearest safe respawn anchor" % label)
		return
	var layout: Dictionary = instance.call("layout_snapshot")
	var safe_positions: Array[Vector3] = []
	for anchor_ref_value in layout.get("player_respawn_anchor_refs", []):
		safe_positions.append(_anchor_position(layout, str(anchor_ref_value)))
	if safe_positions.is_empty():
		_failures.append("%s has no player-safe respawn anchors" % label)
		return
	var probes := [
		Vector3(-2, -20, -15),
		Vector3(-4, -20, 2),
		Vector3(4.5, -20, -18.5),
	]
	for probe in probes:
		var candidate: Vector3 = instance.call("nearest_anchor_position", probe)
		var candidate_is_safe := false
		for safe_position in safe_positions:
			if candidate.distance_to(safe_position) <= 0.01:
				candidate_is_safe = true
				break
		if not candidate_is_safe:
			_failures.append("%s selected an unsafe player respawn anchor: %s" % [label, candidate])


func _check_npc_movement(label: String, instance: Node) -> void:
	var manager := instance.get_node_or_null("Actors/NPC_Studio_Manager") as NPC3D
	var caretaker := instance.get_node_or_null("Actors/NPC_Park_Caretaker") as NPC3D
	if manager == null or caretaker == null:
		_failures.append("%s has no manager/caretaker movement proof" % label)
		return
	var manager_anchor := "Park.meeting_north_west"
	var caretaker_anchor := "Park.meeting_north_east"
	var manager_target_value: Variant = instance.call("navigation_position", manager_anchor)
	var caretaker_target_value: Variant = instance.call("navigation_position", caretaker_anchor)
	if not manager_target_value is Vector3 or not caretaker_target_value is Vector3:
		_failures.append("%s cannot project the first meeting's participant slots" % label)
		return
	var manager_target := manager_target_value as Vector3
	var caretaker_target := caretaker_target_value as Vector3
	var manager_start := manager.global_position
	var caretaker_start := caretaker.global_position
	var arrivals: Dictionary = {}
	var blocks: Array[Dictionary] = []
	var record_arrival := func(
		movement_id: String,
		actor_id: StringName,
		anchor_ref: String
	) -> void:
		arrivals[str(actor_id)] = {
			"movementId": movement_id,
			"anchorRef": anchor_ref,
		}
	var record_block := func(
		movement_id: String,
		actor_id: StringName,
		anchor_ref: String,
		reason: String
	) -> void:
		blocks.append({
			"movementId": movement_id,
			"actorId": str(actor_id),
			"anchorRef": anchor_ref,
			"reason": reason,
		})
	manager.movement_arrived.connect(record_arrival)
	caretaker.movement_arrived.connect(record_arrival)
	manager.movement_blocked.connect(record_block)
	caretaker.movement_blocked.connect(record_block)
	manager.apply_movement_command("smoke-manager-meeting", manager_anchor, manager_target)
	caretaker.apply_movement_command(
		"smoke-caretaker-meeting",
		caretaker_anchor,
		caretaker_target
	)
	var convergence_frames := 540
	for _frame in range(convergence_frames):
		await physics_frame
		if arrivals.size() == 2 or not blocks.is_empty():
			break
	var manager_position_before_stop := manager.global_position
	var caretaker_position_before_stop := caretaker.global_position
	var manager_status_before_stop := manager.movement_status()
	var caretaker_status_before_stop := caretaker.movement_status()
	if manager.movement_arrived.is_connected(record_arrival):
		manager.movement_arrived.disconnect(record_arrival)
	if caretaker.movement_arrived.is_connected(record_arrival):
		caretaker.movement_arrived.disconnect(record_arrival)
	if manager.movement_blocked.is_connected(record_block):
		manager.movement_blocked.disconnect(record_block)
	if caretaker.movement_blocked.is_connected(record_block):
		caretaker.movement_blocked.disconnect(record_block)
	manager.stop()
	caretaker.stop()
	if not blocks.is_empty():
		_failures.append("%s meeting movement was blocked: %s" % [label, blocks])
		return
	if not arrivals.has("NPC_Studio_Manager") or not arrivals.has("NPC_Park_Caretaker"):
		_failures.append(
			(
				"%s manager/caretaker did not converge in %d physics frames "
				+ "(arrivals=%s manager=%s caretaker=%s)"
			)
			% [
				label,
				convergence_frames,
				arrivals,
				{
					"position": manager_position_before_stop,
					"status": manager_status_before_stop,
				},
				{
					"position": caretaker_position_before_stop,
					"status": caretaker_status_before_stop,
				},
			]
		)
		return
	if str((arrivals["NPC_Studio_Manager"] as Dictionary).get("anchorRef", "")) != manager_anchor:
		_failures.append("%s manager arrived at the wrong semantic meeting slot" % label)
	if str((arrivals["NPC_Park_Caretaker"] as Dictionary).get("anchorRef", "")) != caretaker_anchor:
		_failures.append("%s caretaker arrived at the wrong semantic meeting slot" % label)
	var manager_progress := Vector2(
		manager.global_position.x - manager_start.x,
		manager.global_position.z - manager_start.z
	).length()
	var caretaker_progress := Vector2(
		caretaker.global_position.x - caretaker_start.x,
		caretaker.global_position.z - caretaker_start.z
	).length()
	if manager_progress < 0.25 or caretaker_progress < 0.25:
		_failures.append("%s meeting convergence made no readable physical progress" % label)
	var slot_separation := Vector2(
		manager.global_position.x - caretaker.global_position.x,
		manager.global_position.z - caretaker.global_position.z
	).length()
	if slot_separation < 0.75:
		_failures.append("%s physical meeting participants collapsed into one slot" % label)


func _check_player_contact(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s contact smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var receptionist := instance.get_node_or_null(
		"Town/Actors/NPC_Studio_Receptionist"
	) as NPC3D
	var caretaker := instance.get_node_or_null("Town/Actors/NPC_Park_Caretaker") as NPC3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	if player == null or receptionist == null or caretaker == null or hud == null:
		_failures.append("%s contact smoke is missing player/resident/HUD" % label)
		return
	var ready := false
	for _frame in range(300):
		await process_frame
		ready = receptionist.is_interaction_enabled()
		if ready:
			break
	if not ready:
		_failures.append("%s contact actor never obtained a preloaded opening" % label)
		return
	# Isolate the contact race from unrelated fixture advance/ambient packets;
	# otherwise a late backend-authored activeContact:null can correctly clear
	# the manually injected contact while this focused proof is running.
	instance.set("_fixture_replay_complete", true)
	instance.set("_ambient_decision_halted_reason", "contact_smoke_isolation")
	instance.set("_ambient_pending_request", {})
	for _frame in range(300):
		if (
			not bool(instance.get("_advance_in_flight"))
			and not bool(instance.get("_advance_rebase_in_flight"))
			and not bool(instance.get("_ambient_decision_in_flight"))
		):
			break
		await process_frame
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	var run_snapshot: Dictionary = instance.call("presentation_snapshot")
	var elapsed := float((run_snapshot.get("worldClock", {}) as Dictionary).get(
		"elapsedSeconds",
		0.0
	))
	var first_contact := {
		"contactId": "contact-smoke-cancel",
		"actorId": str(receptionist.actor_id),
		"interactionZoneId": "StudioReceptionConversation",
		"originAnchorRef": "Studio.receptionist_spawn",
		"safeDistanceM": 1.6,
		"issuedAtSeconds": elapsed,
		"expiresAtSeconds": elapsed + 60.0,
		"reason": "smoke_internal_reason",
		"procedure": "ordinary",
	}
	player.global_position = receptionist.global_position + Vector3(0.0, 0.0, 3.6)
	player.velocity = Vector3.ZERO
	instance.call("_sync_active_contact_from_response", {"activeContact": first_contact})
	var conflict_arrival_count: Array[int] = [0]
	var record_conflict_arrival := func(
		_movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		conflict_arrival_count[0] += 1
	var stale_movement := {
		"movementId": "movement-smoke-contact-stale",
		"actorId": str(receptionist.actor_id),
		"fromAnchorRef": "Studio.receptionist_spawn",
		"targetAnchorRef": "Studio.waiting_seats",
		"scheduleBlockId": "schedule-smoke-stale",
		"activity": "wait",
	}
	var current_movement := {
		"movementId": "movement-smoke-contact-current",
		"actorId": str(receptionist.actor_id),
		"fromAnchorRef": "Studio.receptionist_spawn",
		"targetAnchorRef": "Studio.reception_desk",
		"scheduleBlockId": "schedule-smoke-current",
		"activity": "work",
	}
	var authoritative_scheduler := {
		"actors": [{
			"actorId": str(receptionist.actor_id),
			"confirmedAnchorRef": "Studio.receptionist_spawn",
			"currentBlock": {"activity": "work"},
			"pendingMovement": current_movement,
		}],
	}
	receptionist.movement_arrived.connect(record_conflict_arrival)
	instance.call("_queue_or_apply_movement", stale_movement)
	instance.call("_reconcile_scheduler_movements", authoritative_scheduler)
	# Closing an unrelated modal flushes delayed movement through the same
	# contact guard; it must simply requeue while the order is still active.
	instance.set("_conversation_target", receptionist)
	paused = true
	instance.call("_finish_conversation_modal")
	for _frame in range(4):
		await physics_frame
	var protected_contact: Dictionary = instance.call("presentation_snapshot").get(
		"contact",
		{}
	)
	if (
		not bool(protected_contact.get("active", false))
		or not receptionist.has_player_contact("contact-smoke-cancel")
		or not str(receptionist.movement_status().get("movementId", "")).is_empty()
		or conflict_arrival_count[0] != 0
	):
		_failures.append(
			"%s conflicting movement locally cancelled contact or forged arrival: %s"
			% [
				label,
				{
					"contact": protected_contact,
					"actorContact": receptionist.contact_status(),
					"movement": receptionist.movement_status(),
					"arrivalCount": conflict_arrival_count[0],
					"runStatus": instance.get("_run_status"),
					"queued": instance.get("_queued_movement_deltas"),
				},
			]
		)
	if receptionist.movement_arrived.is_connected(record_conflict_arrival):
		receptionist.movement_arrived.disconnect(record_conflict_arrival)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	instance.call("_reconcile_scheduler_movements", authoritative_scheduler)
	await physics_frame
	var resumed_movement := receptionist.movement_status()
	if (
		receptionist.has_player_contact()
		or str(resumed_movement.get("movementId", ""))
		!= "movement-smoke-contact-current"
	):
		_failures.append(
			"%s authoritative scheduler movement did not resume after contact cleared"
			% label
		)
	instance.call("_drop_client_movement_for_actor", str(receptionist.actor_id))
	receptionist.stop()
	instance.call("_sync_active_contact_from_response", {"activeContact": first_contact})
	hud.open_settings()
	for _frame in range(8):
		await physics_frame
	var first_follow := receptionist.contact_status()
	var first_retarget_count := int(first_follow.get("retargetCount", 0))
	player.global_position += Vector3(0.75, 0.0, 0.0)
	for _frame in range(24):
		await physics_frame
	var moved_follow := receptionist.contact_status()
	var moved_retarget_count := int(moved_follow.get("retargetCount", 0))
	if (
		first_retarget_count < 1
		or moved_retarget_count <= first_retarget_count
		or moved_retarget_count > first_retarget_count + 3
	):
		_failures.append(
			"%s contact target refresh was missing or unbounded: %s -> %s"
			% [label, first_retarget_count, moved_retarget_count]
		)
	for contact_offset in [
		Vector3(0.0, 0.0, 1.5),
		Vector3(1.5, 0.0, 0.0),
		Vector3(-1.5, 0.0, 0.0),
		Vector3(0.0, 0.0, -1.5),
	]:
		player.global_position = receptionist.global_position + contact_offset
		player.velocity = Vector3.ZERO
		await physics_frame
		if bool(receptionist.call("_contact_has_line_of_sight")):
			break
	for _frame in range(30):
		await physics_frame
		if str(instance.get("_pending_contact_ready_id")) == "contact-smoke-cancel":
			break
	var deferred_settings := hud.presentation_snapshot()
	if (
		paused
		or str(deferred_settings.get("modalSurface", "")) != "settings"
		or str(instance.get("_pending_contact_ready_id")) != "contact-smoke-cancel"
	):
		_failures.append(
			"%s settings did not defer a ready contact while world time ran: %s"
			% [
				label,
				{
					"paused": paused,
					"modal": deferred_settings.get("modalSurface", ""),
					"pending": instance.get("_pending_contact_ready_id"),
					"follow": receptionist.contact_status(),
					"los": receptionist.call("_contact_has_line_of_sight"),
					"distance": receptionist.global_position.distance_to(
						player.global_position
					),
				},
			]
		)
	var fake_arrival_count: Array[int] = [0]
	var record_fake_arrival := func(
		_movement_id: String,
		_actor_id: StringName,
		_anchor_ref: String
	) -> void:
		fake_arrival_count[0] += 1
	receptionist.movement_arrived.connect(record_fake_arrival)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})
	hud.close_settings()
	for _frame in range(180):
		await physics_frame
		if not receptionist.is_moving():
			break
	if receptionist.movement_arrived.is_connected(record_fake_arrival):
		receptionist.movement_arrived.disconnect(record_fake_arrival)
	if (
		str(hud.presentation_snapshot().get("modalSurface", "")) == "conversation"
		or not str(instance.get("_pending_contact_ready_id")).is_empty()
		or fake_arrival_count[0] != 0
		or not str(receptionist.movement_status().get("movementId", "")).is_empty()
	):
		_failures.append("%s stale contact opened or cancel-return forged runtime arrival" % label)

	var consumed_contact_id := (
		"contact:run-fixture-1:wake:run-fixture-1:goal:NPC_Park_Caretaker:11"
	)
	var second_contact := {
		"contactId": consumed_contact_id,
		"actorId": str(caretaker.actor_id),
		"interactionZoneId": "ParkConversation",
		"originAnchorRef": "Park.meeting_north_east",
		"safeDistanceM": 2.2,
		"issuedAtSeconds": 90.0,
		"expiresAtSeconds": 120.0,
		"reason": "smoke_internal_reason",
		"procedure": "ordinary",
	}
	player.global_position = caretaker.global_position + Vector3(0.0, 0.0, 3.4)
	player.velocity = Vector3.ZERO
	instance.call("_sync_active_contact_from_response", {"activeContact": second_contact})
	var cue := hud.contact_cue_snapshot()
	if (
		not bool(cue.get("visible", false))
		or str(cue.get("text", "")).is_empty()
		or str(cue.get("text", "")).contains("contact-smoke")
		or str(cue.get("text", "")).contains("smoke_internal_reason")
	):
		_failures.append("%s contact cue is absent or leaks internal contact data" % label)
	hud.open_log()
	for _frame in range(8):
		await physics_frame
	for contact_offset in [
		Vector3(0.0, 0.0, 1.5),
		Vector3(1.5, 0.0, 0.0),
		Vector3(-1.5, 0.0, 0.0),
		Vector3(0.0, 0.0, -1.5),
	]:
		player.global_position = caretaker.global_position + contact_offset
		player.velocity = Vector3.ZERO
		await physics_frame
		if bool(caretaker.call("_contact_has_line_of_sight")):
			break
	for _frame in range(45):
		await physics_frame
		if str(instance.get("_pending_contact_ready_id")) == consumed_contact_id:
			break
	var ready_position := caretaker.global_position
	if paused or str(hud.presentation_snapshot().get("modalSurface", "")) != "inspect":
		_failures.append("%s inspect log did not defer contact without pausing" % label)
	hud.close_log()
	var opened := false
	for _frame in range(180):
		await process_frame
		var contact_hud := hud.presentation_snapshot()
		if (
			str(contact_hud.get("modalSurface", "")) == "conversation"
			and not (contact_hud.get("currentTurn", {}) as Dictionary).is_empty()
		):
			opened = true
			break
	if not opened:
		_failures.append("%s ready contact did not reuse the conversation modal" % label)
		paused = false
		return
	var opened_main: Dictionary = instance.call("presentation_snapshot")
	var adapter: Dictionary = (opened_main.get("advance", {}) as Dictionary).get(
		"adapter",
		{}
	)
	if (
		not paused
		or str(adapter.get("fixtureLastStartContactId", ""))
		!= consumed_contact_id
		or caretaker.has_player_contact(consumed_contact_id)
		or caretaker.global_position.distance_to(ready_position) > 0.05
	):
		_failures.append(
			"%s contact start lost its id, pause, or consumed-position invariant" % label
		)
	var current_turn: Dictionary = hud.presentation_snapshot().get("currentTurn", {})
	var choices: Array = current_turn.get("choices", [])
	if choices.size() != 3 or not choices[0] is Dictionary:
		_failures.append("%s contacted conversation has no normal runtime choices" % label)
		paused = false
		return
	# This fixture proves the contact opening only; normal answer/end replay is
	# already covered by main_3d and is intentionally not a second dialogue path.
	instance.call("_finish_conversation_modal")
	await process_frame
	if paused or str(hud.presentation_snapshot().get("modalSurface", "")) != "none":
		_failures.append("%s contacted modal could not release its local presentation" % label)
		paused = false
		return

	# Exercise the same cleanup used by a failed start: the authoritative order
	# remains active, so presentation follow resumes instead of becoming stuck.
	var resume_contact := {
		"contactId": "contact-smoke-resume",
		"actorId": str(receptionist.actor_id),
		"interactionZoneId": "StudioReceptionConversation",
		"originAnchorRef": "Studio.receptionist_spawn",
		"safeDistanceM": 1.6,
		"issuedAtSeconds": elapsed + 2.0,
		"expiresAtSeconds": elapsed + 120.0,
		"reason": "smoke_resume",
		"procedure": "ordinary",
	}
	instance.call("_sync_active_contact_from_response", {"activeContact": resume_contact})
	receptionist.cancel_player_contact()
	instance.set("_conversation_target", receptionist)
	instance.set("_conversation_contact_id", "contact-smoke-resume")
	paused = true
	instance.call("_finish_conversation_modal")
	await process_frame
	if paused or not receptionist.has_player_contact("contact-smoke-resume"):
		_failures.append("%s failed-start cleanup did not resume authoritative contact" % label)
	instance.call("_sync_active_contact_from_response", {"activeContact": null})


func _check_hearing_and_outcome(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s hearing smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var town := instance.get_node_or_null("Town") as Town3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	if player == null or town == null or hud == null or run_session == null:
		_failures.append("%s hearing smoke is missing Main dependencies" % label)
		return
	var fixture := _load_run_fixture()
	var endpoints: Dictionary = fixture.get("endpoints", {})
	for endpoint_name in ["runHearingOpen", "runHearingAnswer", "runEnd"]:
		if not endpoints.get(endpoint_name, null) is Dictionary:
			_failures.append("%s fixture is missing %s" % [label, endpoint_name])
			return
	var ready := false
	for _frame in range(360):
		await process_frame
		ready = not str(instance.call("presentation_snapshot").get("runId", "")).is_empty()
		if ready:
			break
	if not ready:
		_failures.append("%s run did not initialize before hearing smoke" % label)
		return

	# The same conversation surface owns all three procedures. Only an explicit
	# interrogation turn with a runtime duration may start the timer.
	var timer_signal_count: Array[int] = [0]
	var record_hesitation := func() -> void: timer_signal_count[0] += 1
	hud.hesitation_expired.connect(record_hesitation)
	var base_turn := {
		"turnId": "turn-smoke-procedure",
		"beatId": "beat-smoke-procedure",
		"speakerId": "NPC_Station_Officer",
		"prompt": "Procedure smoke prompt.",
		"acceptsFreeInput": true,
		"continueConversation": true,
		"procedure": "ordinary",
		"hesitationMs": 0,
		"choices": [
			{"choiceId": "smoke-1", "line": "One"},
			{"choiceId": "smoke-2", "line": "Two"},
			{"choiceId": "smoke-3", "line": "Three"},
		],
		"proposalMeta": {"transport": "scripted"},
	}
	hud.begin_conversation({"actorId": "NPC_Station_Officer"})
	hud.show_turn(base_turn)
	if bool(hud.hesitation_timer_snapshot().get("visible", false)):
		_failures.append("%s ordinary conversation exposed the hesitation timer" % label)
	var interrogation_turn := base_turn.duplicate(true)
	interrogation_turn["procedure"] = "interrogation"
	interrogation_turn["hesitationMs"] = 45000
	hud.show_turn(interrogation_turn)
	var timer_started := hud.hesitation_timer_snapshot()
	if (
		not bool(timer_started.get("visible", false))
		or not is_equal_approx(float(timer_started.get("durationSeconds", 0.0)), 45.0)
	):
		_failures.append("%s interrogation did not use runtime hesitationMs" % label)
	hud.call("_process_hesitation_timer", 46.0)
	hud.call("_process_hesitation_timer", 46.0)
	if timer_signal_count[0] != 1:
		_failures.append("%s interrogation hesitation emitted %d times" % [label, timer_signal_count[0]])
	hud.show_turn(interrogation_turn)
	hud.set_conversation_busy(true)
	hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
	hud.call("_process_hesitation_timer", 46.0)
	var timer_after_retry := hud.hesitation_timer_snapshot()
	if (
		timer_signal_count[0] != 1
		or bool(timer_after_retry.get("visible", false))
		or bool(timer_after_retry.get("active", false))
	):
		_failures.append("%s answer retry restarted the interrogation timer" % label)
	if hud.hesitation_expired.is_connected(record_hesitation):
		hud.hesitation_expired.disconnect(record_hesitation)
	hud.close_conversation()

	instance.call("_enter_hearing_due")
	var due_snapshot: Dictionary = instance.call("presentation_snapshot")
	if (
		str(due_snapshot.get("runStatus", "")) != "hearing_due"
		or not bool(player.get("_control_enabled"))
		or bool((due_snapshot.get("contact", {}) as Dictionary).get("active", false))
		or player.focused_interactable() != null
	):
		_failures.append("%s hearing due did not freeze world work while preserving control" % label)
	for actor_value in instance.get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D and (actor_value as NPC3D).is_interaction_enabled():
			_failures.append("%s hearing due left a resident interaction prompt enabled" % label)
			break
	for surface_value in instance.get_tree().get_nodes_in_group(&"record_surfaces"):
		if (
			surface_value is Node
			and (surface_value as Node).has_method("is_interaction_enabled")
			and bool((surface_value as Node).call("is_interaction_enabled"))
		):
			_failures.append("%s hearing due left a record interaction prompt enabled" % label)
			break
	instance.call("_dispatch_hearing_open")
	instance.call("_dispatch_hearing_open")
	var staged := false
	for _frame in range(360):
		await process_frame
		var snapshot: Dictionary = instance.call("presentation_snapshot")
		var hud_snapshot := hud.presentation_snapshot()
		if (
			str(snapshot.get("runStatus", "")) == "hearing_active"
			and str(hud_snapshot.get("modalSurface", "")) == "conversation"
			and not (hud_snapshot.get("currentTurn", {}) as Dictionary).is_empty()
		):
			staged = true
			break
	if not staged:
		_failures.append("%s hearing did not open and stage in the shared modal" % label)
		paused = false
		return
	var staged_snapshot: Dictionary = instance.call("presentation_snapshot")
	var staged_hud := hud.presentation_snapshot()
	var staged_turn := staged_hud.get("currentTurn", {}) as Dictionary
	var expected_player_value: Variant = town.navigation_position("Station.hearing_player")
	var expected_focus_value: Variant = town.anchor_position("Station.hearing_table")
	var facing_ok := false
	if expected_focus_value is Vector3:
		var planar_target := expected_focus_value as Vector3 - player.global_position
		planar_target.y = 0.0
		if not planar_target.is_zero_approx():
			facing_ok = (-player.global_transform.basis.z).dot(planar_target.normalized()) > 0.95
	if (
		int((staged_snapshot.get("hearingFlow", {}) as Dictionary).get("openAttempts", 0)) != 1
		or not paused
		or bool(player.get("_control_enabled"))
		or str(staged_turn.get("procedure", "")) != "hearing"
		or bool(staged_hud.get("hesitationTimerVisible", true))
		or not expected_player_value is Vector3
		or player.global_position.distance_to(expected_player_value as Vector3) > 0.05
		or not facing_ok
	):
		_failures.append("%s hearing staging lost one-shot, anchor, focus, or modal invariants" % label)

	var answer_packet := endpoints.get("runHearingAnswer", {}) as Dictionary
	var answer_request := answer_packet.get("request", {}) as Dictionary
	var final_answer := answer_request.get("answer", {}) as Dictionary
	instance.call("_submit_hearing_answer", final_answer)
	var terminal := false
	for _frame in range(360):
		await process_frame
		var snapshot: Dictionary = instance.call("presentation_snapshot")
		if (
			str(snapshot.get("runStatus", "")) == "terminal"
			and bool((snapshot.get("outcome", {}) as Dictionary).get("visible", false))
		):
			terminal = true
			break
	if not terminal:
		_failures.append("%s hearing answer did not reach the terminal outcome" % label)
		paused = false
		return
	var terminal_snapshot: Dictionary = instance.call("presentation_snapshot")
	var terminal_result := terminal_snapshot.get("terminalResult", {}) as Dictionary
	var outcome := terminal_snapshot.get("outcome", {}) as Dictionary
	var presented_testimonies := outcome.get("testimonies", []) as Array
	if (
		str(outcome.get("route", "")) != str(terminal_result.get("verdict", ""))
		or int(outcome.get("vouchCount", -1)) != int(terminal_result.get("evidencedVouchCount", -2))
		or int(outcome.get("requiredVouches", 0)) != 4
		or presented_testimonies.size() != 6
		or (outcome.get("recapLines", []) as Array).size()
		!= (terminal_result.get("recap", []) as Array).size()
		or (outcome.get("recapEntries", []) as Array).size()
		!= (terminal_result.get("recap", []) as Array).size()
		or str(outcome.get("officerLine", ""))
		!= str(terminal_result.get("officerLine", ""))
		or (outcome.get("citedRecordIds", []) as Array).size()
		!= (terminal_result.get("citedRecordIds", []) as Array).size()
		or (outcome.get("citedLedgerEventIds", []) as Array).size()
		!= (terminal_result.get("citedLedgerEventIds", []) as Array).size()
		or str(outcome.get("body", "")).contains("NPC_")
	):
		_failures.append("%s outcome omitted verdict, quorum, testimony, recap, or leaked ids" % label)
	for testimony_value in presented_testimonies:
		if (
			not testimony_value is Dictionary
			or str((testimony_value as Dictionary).get("actor", "")).is_empty()
			or str((testimony_value as Dictionary).get("testimony", "")).is_empty()
		):
			_failures.append("%s outcome has an incomplete resident testimony" % label)
			break
	var fallback_result := terminal_result.duplicate(true)
	var fallback_meta := (fallback_result.get("proposalMeta", {}) as Dictionary).duplicate(true)
	fallback_meta["transport"] = "fallback"
	fallback_meta["usedFallback"] = true
	fallback_meta["fallbackReason"] = "timeout"
	fallback_result["proposalMeta"] = fallback_meta
	hud.show_outcome(fallback_result)
	var fallback_outcome := hud.outcome_snapshot()
	if (
		not bool(fallback_outcome.get("fallbackVisible", false))
		or str(fallback_outcome.get("fallbackReason", "")) != "timeout"
		or str(fallback_outcome.get("fallbackReasonText", "")).is_empty()
	):
		_failures.append("%s fallback hearing verdict was not visibly marked" % label)
	if not hud.restart_requested.is_connected(Callable(instance, "_on_restart_requested")):
		_failures.append("%s restart button signal is not connected to Main" % label)
	var end_packet := endpoints.get("runEnd", {}) as Dictionary
	var end_request := end_packet.get("request", {}) as Dictionary
	var first_end: Dictionary = await run_session.end_run(
		str(end_request.get("runId", "")),
		str(end_request.get("endId", ""))
	)
	var repeated_end: Dictionary = await run_session.end_run(
		str(end_request.get("runId", "")),
		str(end_request.get("endId", ""))
	)
	if (
		str(first_end.get("runStatus", "")) != "closed"
		or first_end != repeated_end
		or not bool(run_session.diagnostics_snapshot().get("fixtureRunClosed", false))
	):
		_failures.append("%s run end was not strict and idempotent" % label)
	paused = false


func _check_run_conversation(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s conversation smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var receptionist := instance.get_node_or_null("Town/Actors/NPC_Studio_Receptionist") as NPC3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	if player == null or receptionist == null or hud == null:
		return
	var actors: Array[NPC3D] = []
	for actor_value in instance.get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D:
			actors.append(actor_value as NPC3D)
	var all_residents_ready := false
	for _frame in range(240):
		await process_frame
		all_residents_ready = actors.size() == 6 and actors.all(
			func(actor: NPC3D) -> bool: return actor.is_interaction_enabled()
		)
		if all_residents_ready:
			break
	if not all_residents_ready:
		_failures.append("%s did not preload conversations for all six residents" % label)
		return
	var locale_snapshot: Dictionary = instance.call("presentation_snapshot")
	var locked_run_locale := str(locale_snapshot.get("runLocale", ""))
	if locked_run_locale.is_empty() or locked_run_locale != str(instance.call("_api_locale")):
		_failures.append("%s did not lock one API locale for the run" % label)
	if not bool(locale_snapshot.get("languageAppliesNextRun", false)):
		_failures.append("%s does not mark later language changes as next-run settings" % label)
	var localization := root.get_node_or_null("Localization")
	if (
		localization == null
		or str(
			localization.call(
				"api_locale",
				str(locale_snapshot.get("presentationLocale", ""))
			)
		) != locked_run_locale
	):
		_failures.append("%s presentation and run locales start mixed" % label)
	var town := instance.get_node_or_null("Town") as Town3D
	for actor in actors:
		var expected_connection := Callable(
			instance,
			"_on_conversation_requested"
		).bind(actor)
		if not actor.conversation_requested.is_connected(expected_connection):
			_failures.append("%s leaves %s conversation signal unwired" % [label, actor.actor_id])
		if town != null:
			var actor_snapshot: Dictionary = instance.call("_actor_view", str(actor.actor_id))
			var zone_id := town.conversation_zone_id(
				str(actor.actor_id),
				str(actor_snapshot.get("locationId", ""))
			)
			if zone_id.is_empty():
				_failures.append(
					"%s cannot derive %s conversation zone from current location"
					% [label, actor.actor_id]
				)

	player.global_position = receptionist.global_position + Vector3(0.0, 0.0, 1.5)
	receptionist.interact(player)
	var opened := false
	for _frame in range(120):
		await process_frame
		var hud_snapshot := hud.presentation_snapshot()
		var current_turn: Dictionary = hud_snapshot.get("currentTurn", {})
		if str(hud_snapshot.get("modalSurface", "")) == "conversation" and not current_turn.is_empty():
			opened = true
			break
	if not opened:
		_failures.append("%s fixture conversation did not open" % label)
		paused = false
		return
	if not paused:
		_failures.append("%s world is not paused during conversation" % label)
	if bool(player.get("_control_enabled")):
		_failures.append("%s player control stayed enabled during conversation" % label)
	if player.has_method("can_jump") and bool(player.call("can_jump")):
		_failures.append("%s player can jump during modal conversation" % label)
	var opened_snapshot := hud.presentation_snapshot()
	var opened_provider: Dictionary = opened_snapshot.get("provider", {})
	if str(opened_provider.get("transport", "")) != "scripted":
		_failures.append("%s conversation does not visibly identify fixture provenance" % label)
	var opened_turn: Dictionary = opened_snapshot.get("currentTurn", {})
	var choices_value: Variant = opened_turn.get("choices", [])
	if not choices_value is Array or (choices_value as Array).size() != 3:
		_failures.append("%s conversation does not expose exactly three runtime choices" % label)
		paused = false
		return
	var first_choice: Variant = (choices_value as Array)[0]
	if not first_choice is Dictionary:
		_failures.append("%s conversation first choice is invalid" % label)
		paused = false
		return
	hud.choice_submitted.emit(str((first_choice as Dictionary).get("choiceId", "")))

	var ended := false
	for _frame in range(180):
		await process_frame
		var hud_snapshot := hud.presentation_snapshot()
		if str(hud_snapshot.get("modalSurface", "")) == "none" and not paused:
			ended = true
			break
	if not ended:
		_failures.append("%s fixture conversation did not end and resume the world" % label)
		paused = false
		return
	if not bool(player.get("_control_enabled")):
		_failures.append("%s player control did not resume after conversation" % label)
	if receptionist.is_interaction_enabled():
		_failures.append("%s leaves a false receptionist re-conversation prompt" % label)
	var main_snapshot: Dictionary = instance.call("presentation_snapshot")
	var advance_diagnostics: Dictionary = main_snapshot.get("advance", {})
	var adapter_diagnostics: Dictionary = advance_diagnostics.get("adapter", {})
	var expected_end_revision := int(adapter_diagnostics.get("fixtureSessionEndRevision", -1))
	if (
		expected_end_revision < 0
		or int(main_snapshot.get("runWorldRevision", -1)) != expected_end_revision
	):
		_failures.append("%s run revision did not reach idempotent child-session end" % label)
	var provider: Dictionary = main_snapshot.get("provider", {})
	if str(provider.get("transport", "")) != "scripted":
		_failures.append("%s fixture provider provenance is not scripted" % label)
	var stance_summaries: Variant = main_snapshot.get("encounteredStances", [])
	if not stance_summaries is Array or (stance_summaries as Array).size() != 1:
		_failures.append("%s did not retain the encountered receptionist stance" % label)
	else:
		var stance_entry: Variant = (stance_summaries as Array)[0]
		if not stance_entry is Dictionary or str((stance_entry as Dictionary).get("stance", "")) != "vouch":
			_failures.append("%s did not present the runtime-judged vouch stance" % label)
		elif not str((stance_entry as Dictionary).get("summary", "")).is_empty():
			_failures.append("%s leaked a stance why-line outside the inspect log" % label)
		else:
			var social_view: Dictionary = main_snapshot.get("socialView", {})
			var disclosed_residents: Array = social_view.get("encounteredResidents", [])
			var why_line := ""
			if not disclosed_residents.is_empty() and disclosed_residents[0] is Dictionary:
				why_line = str((disclosed_residents[0] as Dictionary).get("whyLine", ""))
			var log_snapshot: Dictionary = hud.presentation_snapshot().get("log", {})
			if why_line.is_empty() or not str(log_snapshot.get("body", "")).contains(why_line):
				_failures.append("%s inspect log omitted the disclosed stance why-line" % label)
	var record_surface := instance.get_node_or_null(
		"Town/Props/TextSurfaces/TS_Studio_ReviewRecords"
	)
	if record_surface == null or not record_surface.has_method("interact"):
		_failures.append("%s has no interactable Studio record surface" % label)
	else:
		player.global_position = Vector3(3.5, 0.05, -17.0)
		player.velocity = Vector3.ZERO
		await physics_frame
		var close_events: Array[int] = [0]
		hud.log_visibility_changed.connect(func(visible: bool) -> void:
			if not visible:
				close_events[0] += 1
		)
		record_surface.call("interact", player)
		var pending_snapshot := hud.presentation_snapshot()
		var pending_log: Dictionary = pending_snapshot.get("log", {})
		hud.toggle_log()
		hud.close_log()
		var close_button := hud.get_node_or_null(
			"Overlay/LogShade/LogPanel/LogMargin/LogColumns/CloseLogButton"
		) as Button
		if close_button != null:
			close_button.pressed.emit()
		var resisted_close := hud.presentation_snapshot()
		if (
			str(pending_snapshot.get("modalSurface", "")) != "inspect"
			or not bool(pending_log.get("busy", false))
			or str(resisted_close.get("modalSurface", "")) != "inspect"
			or not bool((resisted_close.get("log", {}) as Dictionary).get("busy", false))
			or bool(player.get("_control_enabled"))
			or paused
			or close_events[0] != 0
		):
			_failures.append(
				"%s pending record inspect could close or release its player lock" % label
			)
		var record_log_opened := false
		for _frame in range(120):
			await process_frame
			var inspect_snapshot := hud.presentation_snapshot()
			var inspect_log: Dictionary = inspect_snapshot.get("log", {})
			var inspect_social: Dictionary = inspect_snapshot.get("socialView", {})
			if (
				str(inspect_snapshot.get("modalSurface", "")) == "inspect"
				and not bool(inspect_log.get("busy", true))
				and (inspect_social.get("encounteredRecords", []) as Array).size() == 1
			):
				record_log_opened = true
				break
		if not record_log_opened:
			_failures.append("%s record encounter did not open the inspect log" % label)
		else:
			var record_snapshot: Dictionary = instance.call("presentation_snapshot")
			var record_social: Dictionary = record_snapshot.get("socialView", {})
			var record_pressure: Dictionary = record_snapshot.get("institutionalPressure", {})
			var encountered_records: Array = record_social.get("encounteredRecords", [])
			if (
				paused
				or bool(player.get("_control_enabled"))
				or str(record_pressure.get("band", "")) != "raised"
				or encountered_records.size() != 1
			):
				_failures.append(
					"%s record inspect failed its non-pausing disclosed-view contract" % label
				)
			hud.close_log()
			await process_frame
			hud.close_log()
			await process_frame
			if (
				not bool(player.get("_control_enabled"))
				or paused
				or close_events[0] != 1
			):
				_failures.append(
					"%s record inspect did not restore player control exactly once" % label
				)
	var manager := instance.get_node_or_null("Town/Actors/NPC_Studio_Manager") as NPC3D
	var caretaker := instance.get_node_or_null("Town/Actors/NPC_Park_Caretaker") as NPC3D
	if manager != null and caretaker != null:
		var look_revision := int(main_snapshot.get("runWorldRevision", -1))
		instance.call(
			"_apply_conversation_end_deltas_once",
			"smoke-queued-look",
			look_revision,
			[{
				"kind": "look",
				"actorId": str(manager.actor_id),
				"targetKind": "actor",
				"targetId": str(receptionist.actor_id),
				"worldRevision": look_revision,
			}]
		)
		var first_forward := -manager.global_transform.basis.z.normalized()
		# A duplicate successful session-end response must not apply a second batch.
		instance.call(
			"_apply_conversation_end_deltas_once",
			"smoke-queued-look",
			look_revision,
			[{
				"kind": "look",
				"actorId": str(manager.actor_id),
				"targetKind": "actor",
				"targetId": str(caretaker.actor_id),
				"worldRevision": look_revision,
			}]
		)
		var second_forward := -manager.global_transform.basis.z.normalized()
		var to_receptionist := receptionist.global_position - manager.global_position
		to_receptionist.y = 0.0
		if (
			first_forward.distance_to(second_forward) > 0.001
			or (
				not to_receptionist.is_zero_approx()
				and second_forward.dot(to_receptionist.normalized()) < 0.99
			)
		):
			_failures.append("%s queued look delta was not applied exactly once" % label)


func _check_run_clock_and_schedule(label: String, instance: Node) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s schedule smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var office_worker := instance.get_node_or_null(
		"Town/Actors/NPC_Office_Worker"
	) as NPC3D
	if office_worker == null:
		_failures.append("%s has no office worker for schedule movement" % label)
		return
	var fixture := _load_run_fixture()
	var fixture_endpoints: Dictionary = fixture.get("endpoints", {})
	var preload_packets: Array = fixture_endpoints.get("sessionPreloads", [])
	var preload_baseline_revision := 0
	for preload_value in preload_packets:
		if preload_value is Dictionary:
			var preload_response: Dictionary = (preload_value as Dictionary).get("response", {})
			preload_baseline_revision = maxi(
				preload_baseline_revision,
				int(preload_response.get("worldRevision", 0))
			)

	var snapshot: Dictionary = {}
	var run_ready := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var scheduler_value: Variant = snapshot.get("scheduler", {})
		var adapter: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
			"adapter",
			{}
		)
		if (
			not str(snapshot.get("runId", "")).is_empty()
			and scheduler_value is Dictionary
			and not (scheduler_value as Dictionary).is_empty()
			and int(adapter.get("fixturePreloadCount", -1)) == preload_packets.size()
			and int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision
		):
			run_ready = true
			break
	if not run_ready:
		_failures.append("%s fixture run did not auto-start with scheduler state" % label)
		return
	if int(snapshot.get("runWorldRevision", -1)) != preload_baseline_revision:
		_failures.append("%s schedule run did not reach its preloaded baseline" % label)
	var initial_clock: Dictionary = snapshot.get("worldClock", {})
	if float(initial_clock.get("elapsedSeconds", -1.0)) != 0.0:
		_failures.append("%s fresh schedule clock did not start at zero" % label)
	var initial_budget: Dictionary = snapshot.get("providerBudget", {})
	if int(initial_budget.get("callsUsed", -1)) != 0:
		_failures.append("%s schedule run started with provider calls" % label)
	var initial_office_scheduler := _scheduler_actor(snapshot, "NPC_Office_Worker")
	var initial_office_anchor := str(initial_office_scheduler.get("confirmedAnchorRef", ""))
	if initial_office_anchor.is_empty():
		_failures.append("%s scheduler exposes no confirmed office-worker anchor" % label)

	var office_start := office_worker.global_position
	instance.set("_advance_elapsed_buffer", 10.0)
	var first_advance_applied := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var movement_actor_ids := _active_movement_actor_ids(snapshot)
		if (
			int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision + 1
			and movement_actor_ids.is_empty()
		):
			first_advance_applied = true
			break
	if not first_advance_applied:
		_failures.append(
			(
				"%s first ten-second advance did not settle before patrol departures "
				+ "(advance=%s pending=%s)"
			)
			% [
				label,
				snapshot.get("advance", {}),
				instance.get("_pending_advance_request"),
			]
		)
		return
	var first_movement_actor_ids := _active_movement_actor_ids(snapshot)
	if not first_movement_actor_ids.is_empty():
		_failures.append(
			"%s patrol moved before its first deterministic due time: %s"
			% [label, first_movement_actor_ids.keys()]
		)
	var first_clock: Dictionary = snapshot.get("worldClock", {})
	if float(first_clock.get("elapsedSeconds", -1.0)) != 10.0:
		_failures.append("%s first advance did not reach ten world seconds" % label)
	var first_spatial: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
		"lastSpatialFacts",
		{}
	)
	if (
		int(first_spatial.get("observedWorldRevision", -1)) != preload_baseline_revision
		or int(first_spatial.get("actorCount", -1)) != 6
	):
		_failures.append("%s initial material advance omitted six revisioned spatial facts" % label)

	instance.set("_advance_elapsed_buffer", 10.0)
	var early_patrol_applied := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var patrol_actor_ids := _active_movement_actor_ids(snapshot)
		if (
			int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision + 2
			and patrol_actor_ids.has("NPC_Studio_Receptionist")
			and patrol_actor_ids.has("NPC_Studio_Manager")
			and patrol_actor_ids.has("NPC_Office_Worker")
			and patrol_actor_ids.has("NPC_Roaming_Liaison")
		):
			early_patrol_applied = true
			break
	if not early_patrol_applied:
		_failures.append(
			"%s second ten-second advance did not issue the staggered early patrols" % label
		)
		return
	var early_patrol_actor_ids := _active_movement_actor_ids(snapshot)
	if early_patrol_actor_ids.size() != 4:
		_failures.append(
			"%s early patrol batch contains unexpected actors: %s"
			% [label, early_patrol_actor_ids.keys()]
		)
	first_clock = snapshot.get("worldClock", {})
	if float(first_clock.get("elapsedSeconds", -1.0)) != 20.0:
		_failures.append("%s early patrol advance did not reach twenty world seconds" % label)

	# Main processes while paused so conversation HTTP can finish, but its clock
	# lane explicitly returns and Town/NPC physics are pausable.
	var pause_position := office_worker.global_position
	var pause_clock := float(first_clock.get("elapsedSeconds", -1.0))
	var pause_buffer := float(instance.get("_advance_elapsed_buffer"))
	paused = true
	for _frame in range(16):
		await process_frame
	var paused_snapshot: Dictionary = instance.call("presentation_snapshot")
	if office_worker.global_position.distance_to(pause_position) > 0.001:
		_failures.append("%s NPC physics advanced while SceneTree was paused" % label)
	var paused_clock: Dictionary = paused_snapshot.get("worldClock", {})
	if float(paused_clock.get("elapsedSeconds", -1.0)) != pause_clock:
		_failures.append("%s world clock advanced while SceneTree was paused" % label)
	if absf(float(instance.get("_advance_elapsed_buffer")) - pause_buffer) > 0.001:
		_failures.append("%s clock buffer accumulated while SceneTree was paused" % label)
	paused = false

	var physical_progress := false
	var arrivals_applied := false
	# The liaison's first patrol leg crosses the park while the other three
	# residents move within their buildings; allow the longest authored leg to
	# finish before the fixture's exact four-arrival batch is dispatched.
	for _frame in range(480):
		await physics_frame
		var planar_progress := Vector2(
			office_worker.global_position.x - pause_position.x,
			office_worker.global_position.z - pause_position.z
		).length()
		physical_progress = physical_progress or planar_progress > 0.15
		snapshot = instance.call("presentation_snapshot")
		var arrivals_value: Variant = (snapshot.get("arrivals", {}) as Dictionary).get(
			"applied",
			[]
		)
		if (
			int(snapshot.get("runWorldRevision", -1)) >= preload_baseline_revision + 3
			and arrivals_value is Array
			and (arrivals_value as Array).size() == 4
		):
			arrivals_applied = true
			break
	if not physical_progress:
		_failures.append("%s office worker made no physical progress after resume" % label)
	else:
		var total_progress := Vector2(
			office_worker.global_position.x - office_start.x,
			office_worker.global_position.z - office_start.z
		).length()
		if total_progress < 0.25:
			_failures.append("%s runtime movement made no readable physical progress" % label)
	if not arrivals_applied:
		_failures.append(
			(
				"%s initial movement arrivals were not acknowledged together "
				+ "(advance=%s pending=%s active=%s queued=%s)"
			)
			% [
				label,
				snapshot.get("advance", {}),
				instance.get("_pending_advance_request"),
				snapshot.get("activeMovements", []),
				instance.get("_queued_arrivals"),
			]
		)
		return
	var arrival_spatial: Dictionary = (snapshot.get("advance", {}) as Dictionary).get(
		"lastSpatialFacts",
		{}
	)
	if (
		int(arrival_spatial.get("observedWorldRevision", -1))
		!= preload_baseline_revision + 2
		or int(arrival_spatial.get("actorCount", -1)) != 6
	):
		_failures.append("%s exact-arrival advance omitted refreshed spatial facts" % label)
	var arrived_office_scheduler := _scheduler_actor(snapshot, "NPC_Office_Worker")
	var arrived_office_anchor := str(
		arrived_office_scheduler.get("confirmedAnchorRef", "")
	)
	if arrived_office_anchor != "Office.work_desk":
		_failures.append("%s office-worker arrival did not confirm its runtime anchor" % label)
	elif arrived_office_anchor == initial_office_anchor:
		_failures.append("%s arrival acknowledgement did not change confirmed anchor" % label)

	instance.set("_advance_elapsed_buffer", 10.0)
	var route_advance_applied := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var route_actor_ids := _active_movement_actor_ids(snapshot)
		if (
			int(snapshot.get("runWorldRevision", -1)) == preload_baseline_revision + 4
			and route_actor_ids.has("NPC_Park_Caretaker")
			and route_actor_ids.has("NPC_Station_Officer")
		):
			route_advance_applied = true
			break
	if not route_advance_applied:
		_failures.append("%s third ten-second advance did not issue late patrol movements" % label)
		return
	var route_clock: Dictionary = snapshot.get("worldClock", {})
	if float(route_clock.get("elapsedSeconds", -1.0)) != 30.0:
		_failures.append("%s late patrol advance did not reach thirty world seconds" % label)
	var final_budget: Dictionary = snapshot.get("providerBudget", {})
	if int(final_budget.get("callsUsed", -1)) != 0:
		_failures.append("%s deterministic scheduling consumed provider calls" % label)

	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	var fixture_backend: Object = run_session.get("_backend") if run_session != null else null
	if fixture_backend == null:
		_failures.append("%s fixture run session backend is unavailable" % label)
		return
	var fixture_sequence: Array = fixture_backend.call("_advance_sequence")
	fixture_backend.set("_advance_index", fixture_sequence.size())
	instance.set("_pending_advance_request", {
		"runId": snapshot.get("runId", ""),
		"advanceId": "%s:fixture-complete-smoke" % snapshot.get("runId", ""),
		"observedWorldRevision": snapshot.get("runWorldRevision", 0),
		"afterSpeechSeq": 0,
		"elapsedSeconds": 1,
		"arrivals": [],
	})
	await instance.call("_dispatch_advance")
	var completed_snapshot: Dictionary = instance.call("presentation_snapshot")
	var completed_advance: Dictionary = completed_snapshot.get("advance", {})
	if not bool(completed_advance.get("fixtureReplayComplete", false)):
		_failures.append("%s fixture replay end was not exposed as completion" % label)
	if bool(completed_advance.get("pending", true)):
		_failures.append("%s fixture replay end retained a pending advance" % label)
	if not str(completed_advance.get("haltedReason", "missing")).is_empty():
		_failures.append("%s fixture replay end was exposed as a halted lane" % label)
	var completed_revision := int(completed_snapshot.get("runWorldRevision", -1))
	instance.set("_advance_elapsed_buffer", 10.0)
	for _frame in range(4):
		await process_frame
	var settled_snapshot: Dictionary = instance.call("presentation_snapshot")
	var settled_advance: Dictionary = settled_snapshot.get("advance", {})
	if (
		bool(settled_advance.get("pending", false))
		or bool(settled_advance.get("inFlight", false))
		or int(settled_snapshot.get("runWorldRevision", -1)) != completed_revision
	):
		_failures.append("%s fixture replay completion issued another advance" % label)


func _check_ambient_speech(
	label: String,
	instance: Node,
	player_inside: bool,
	leave_before_second := false
) -> void:
	if OS.get_environment("DREAM_SESSION_MODE") != "fixture":
		_failures.append("%s ambient speech smoke requires DREAM_SESSION_MODE=fixture" % label)
		return
	var player := instance.get_node_or_null("Town/Actors/Player3D") as CharacterBody3D
	var hud := instance.get_node_or_null("HUD3D") as HUD3D
	var run_session := instance.get_node_or_null("RunSession") as RunSession3D
	var manager := instance.get_node_or_null(
		"Town/Actors/NPC_Studio_Manager"
	) as NPC3D
	var caretaker := instance.get_node_or_null(
		"Town/Actors/NPC_Park_Caretaker"
	) as NPC3D
	if (
		player == null
		or hud == null
		or run_session == null
		or manager == null
		or caretaker == null
	):
		return

	var fixture := _load_run_fixture()
	var fixture_endpoints: Dictionary = fixture.get("endpoints", {})
	var preload_packets: Array = fixture_endpoints.get("sessionPreloads", [])
	var run_ready := false
	for _frame in range(120):
		await process_frame
		var startup_snapshot: Dictionary = instance.call("presentation_snapshot")
		var startup_adapter: Dictionary = (
			startup_snapshot.get("advance", {}) as Dictionary
		).get("adapter", {})
		if (
			not str(startup_snapshot.get("runId", "")).is_empty()
			and int(startup_adapter.get("fixturePreloadCount", -1)) == preload_packets.size()
		):
			run_ready = true
			break
	if not run_ready:
		_failures.append("%s fixture run did not start for ambient speech" % label)
		return

	var endpoints: Dictionary = fixture.get("endpoints", {})
	var decision_packet: Dictionary = endpoints.get("npcDecision", {})
	var delivery_packet: Dictionary = endpoints.get("runAdvanceAmbientSpeech", {})
	var snapshot_packet: Dictionary = endpoints.get("runSnapshotAfterMeeting", {})
	if decision_packet.is_empty() or delivery_packet.is_empty() or snapshot_packet.is_empty():
		_failures.append("%s generated ambient fixture endpoints are missing" % label)
		return

	player.global_position = (
		Vector3(0.0, 0.05, 0.0)
		if player_inside
		else Vector3(0.0, 0.05, -16.0)
	)
	player.velocity = Vector3.ZERO
	await physics_frame

	var decision_response: Dictionary = decision_packet.get("response", {})
	var decision_events: Array = decision_response.get("speechEvents", [])
	if decision_events.size() != 2:
		_failures.append("%s fixture NPC decision did not return exactly two utterances" % label)
		return
	var meeting_wake := _fixture_meeting_ready_wake(fixture)
	if meeting_wake.is_empty():
		_failures.append("%s fixture has no meeting-ready wake" % label)
		return
	instance.call("_queue_ambient_decision_wakes", [meeting_wake])
	var decision_completed := false
	for _frame in range(120):
		await process_frame
		var decision_snapshot: Dictionary = instance.call("presentation_snapshot")
		var decision_ambient: Dictionary = decision_snapshot.get("ambientSpeech", {})
		var decision_lane: Dictionary = decision_ambient.get("decisionLane", {})
		var events_value: Variant = decision_ambient.get("events", [])
		if (
			str(decision_lane.get("lastStatus", "")) == "completed"
			and events_value is Array
			and (events_value as Array).size() == 2
		):
			decision_completed = true
			break
	if not decision_completed:
		_failures.append("%s main ambient decision lane did not complete" % label)
		return
	# The meeting changes participant memories and invalidates their initial
	# openings. Fixture mode has no second authored opening, so those stale
	# cache hits must fail once and drain rather than entering a rebase loop.
	var ambient_preloads_settled := false
	for _frame in range(32):
		await process_frame
		var queued_preloads: Array = instance.get("_conversation_preload_queue")
		var in_flight_preloads: Dictionary = instance.get("_conversation_preload_in_flight")
		if (
			queued_preloads.is_empty()
			and in_flight_preloads.is_empty()
			and not bool(instance.get("_advance_needs_rebase"))
		):
			ambient_preloads_settled = true
			break
	if not ambient_preloads_settled:
		_failures.append("%s stale fixture opening entered a preload/rebase loop" % label)
		return

	var delivery_response: Dictionary = delivery_packet.get("response", {})
	instance.call(
		"apply_ambient_speech_events",
		delivery_response.get("ambientSpeechEvents", [])
	)
	var meeting_snapshot: Dictionary = snapshot_packet.get("response", {})
	var snapshot_ambient: Dictionary = meeting_snapshot.get("ambientSpeech", {})
	instance.call("apply_ambient_speech_events", snapshot_ambient.get("events", []))
	await process_frame

	var main_snapshot: Dictionary = instance.call("presentation_snapshot")
	var ambient: Dictionary = main_snapshot.get("ambientSpeech", {})
	var ingested_events: Array = ambient.get("events", [])
	if int(ambient.get("cursor", -1)) != 2 or ingested_events.size() != 2:
		_failures.append(
			"%s did not dedupe decision/advance/snapshot speech by seq" % label
		)
		return
	var adapter_diagnostics: Dictionary = (main_snapshot.get("advance", {}) as Dictionary).get(
		"adapter",
		{}
	)
	if int(adapter_diagnostics.get("fixtureDecisionCallCount", -1)) != 1:
		_failures.append("%s ambient wake did not use exactly one fixture decision call" % label)
	if (
		int((ingested_events[0] as Dictionary).get("seq", -1)) != 1
		or int((ingested_events[1] as Dictionary).get("seq", -1)) != 2
	):
		_failures.append("%s ambient speech history lost sequence order" % label)
	var expected_listeners: Variant = (decision_events[0] as Dictionary).get(
		"listenerActorIds",
		[]
	)
	if (ingested_events[0] as Dictionary).get("listenerActorIds", []) != expected_listeners:
		_failures.append("%s client lost backend listener provenance" % label)

	var hud_snapshot: Dictionary = hud.presentation_snapshot()
	var subtitle: Dictionary = hud_snapshot.get("ambientSubtitle", {})
	var manager_blip := manager.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
	var caretaker_blip := caretaker.get_node_or_null("SpeechBlip") as AudioStreamPlayer3D
	if player_inside:
		var current: Dictionary = subtitle.get("current", {})
		if (
			not bool(subtitle.get("visible", false))
			or int(current.get("seq", -1)) != 1
			or int(subtitle.get("queuedCount", -1)) != 1
		):
			_failures.append("%s did not queue the two audible subtitles sequentially" % label)
			return
		if (
			str(current.get("direction", ""))
			not in ["left", "center", "right", "behind"]
			or not str(current.get("formattedText", "")).contains(
				str(current.get("line", ""))
			)
		):
			_failures.append("%s audible subtitle lacks direction or generated line" % label)
		if manager_blip == null or not manager_blip.playing:
			_failures.append("%s first audible utterance did not play its spatial blip" % label)
		elif not is_equal_approx(manager_blip.max_distance, 12.0):
			_failures.append("%s spatial blip did not use semantic speech distance" % label)
		var manager_forward := -manager.global_transform.basis.z.normalized()
		var manager_to_caretaker := caretaker.global_position - manager.global_position
		manager_to_caretaker.y = 0.0
		if (
			not manager_to_caretaker.is_zero_approx()
			and manager_forward.dot(manager_to_caretaker.normalized()) < 0.95
		):
			_failures.append("%s meeting participants did not face one another" % label)
		if leave_before_second:
			player.global_position = Vector3(0.0, 0.05, -16.0)
			player.velocity = Vector3.ZERO
			await physics_frame
			hud.set("_ambient_subtitle_remaining", 0.0)
			var dropped_subtitle: Dictionary = {}
			for _frame in range(4):
				await process_frame
				dropped_subtitle = hud.presentation_snapshot().get(
					"ambientSubtitle",
					{}
				)
				if (dropped_subtitle.get("current", {}) as Dictionary).is_empty():
					break
			if (
				bool(dropped_subtitle.get("visible", false))
				or not (dropped_subtitle.get("current", {}) as Dictionary).is_empty()
				or int(dropped_subtitle.get("queuedCount", -1)) != 0
			):
				_failures.append(
					"%s did not drop the queued subtitle after leaving audibility: %s"
					% [label, dropped_subtitle]
				)
			if caretaker_blip != null and caretaker_blip.playing:
				_failures.append(
					"%s played the queued blip after leaving audibility" % label
				)
		else:
			hud.set("_ambient_subtitle_remaining", 0.0)
			await process_frame
			var second_subtitle: Dictionary = hud.presentation_snapshot().get(
				"ambientSubtitle",
				{}
			)
			if (
				int((second_subtitle.get("current", {}) as Dictionary).get("seq", -1)) != 2
				or int(second_subtitle.get("queuedCount", -1)) != 0
			):
				_failures.append("%s second ambient subtitle did not follow the first" % label)
			if caretaker_blip == null or not caretaker_blip.playing:
				_failures.append("%s second audible utterance did not play its spatial blip" % label)
	else:
		if (
			bool(subtitle.get("visible", false))
			or int(subtitle.get("queuedCount", -1)) != 0
		):
			_failures.append("%s showed speech outside the semantic audibility volume" % label)
		if (
			(manager_blip != null and manager_blip.playing)
			or (caretaker_blip != null and caretaker_blip.playing)
		):
			_failures.append("%s played a blip when the subtitle predicate was false" % label)


func _load_run_fixture() -> Dictionary:
	var path := "res://data/fixtures/run-api-examples.json"
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	return (parsed as Dictionary).duplicate(true) if parsed is Dictionary else {}


func _fixture_meeting_ready_wake(fixture: Dictionary) -> Dictionary:
	var sequence_value: Variant = fixture.get("runAdvanceSequence", [])
	if not sequence_value is Array:
		return {}
	for packet_value in sequence_value as Array:
		if not packet_value is Dictionary:
			continue
		var response: Dictionary = (packet_value as Dictionary).get("response", {})
		var wakes_value: Variant = response.get("scheduleWakes", [])
		if not wakes_value is Array:
			continue
		for wake_value in wakes_value as Array:
			if (
				wake_value is Dictionary
				and str((wake_value as Dictionary).get("kind", "")) == "meeting_ready"
			):
				return (wake_value as Dictionary).duplicate(true)
	return {}


func _scheduler_actor(snapshot: Dictionary, actor_id: String) -> Dictionary:
	var scheduler_value: Variant = snapshot.get("scheduler", {})
	if not scheduler_value is Dictionary:
		return {}
	var actors_value: Variant = (scheduler_value as Dictionary).get("actors", [])
	if not actors_value is Array:
		return {}
	for actor_value in actors_value as Array:
		if (
			actor_value is Dictionary
			and str((actor_value as Dictionary).get("actorId", "")) == actor_id
		):
			return (actor_value as Dictionary).duplicate(true)
	return {}


func _active_movement_actor_ids(snapshot: Dictionary) -> Dictionary:
	var actor_ids: Dictionary = {}
	var movements_value: Variant = snapshot.get("activeMovements", [])
	if not movements_value is Array:
		return actor_ids
	for movement_value in movements_value as Array:
		if movement_value is Dictionary:
			actor_ids[str((movement_value as Dictionary).get("actorId", ""))] = true
	return actor_ids


func _check_town_dressing_density(label: String, town: Node) -> void:
	var zone_minimums := {
		"Props/ParkDressing": 20,
		"Props/ExteriorDressing": 25,
		"Props/StudioDressing": 18,
		"Props/OfficeDressing": 16,
		"Props/StationDressing": 18,
	}
	var total_owned_nodes := 0
	for path: String in zone_minimums:
		var zone := town.get_node_or_null(path)
		if zone == null:
			_failures.append("%s dense town is missing %s" % [label, path])
			continue
		var owned_count := _count_scene_owned_descendants(zone, town)
		total_owned_nodes += owned_count
		if owned_count < int(zone_minimums[path]):
			_failures.append(
				"%s %s has only %d authored dressing nodes; expected at least %d"
				% [label, path, owned_count, int(zone_minimums[path])]
			)
	if total_owned_nodes < 97:
		_failures.append(
			"%s dense town has only %d authored dressing nodes across all zones"
			% [label, total_owned_nodes]
		)
	for kaykit_path in [
		"Props/StudioDressing/StudioWaitingArea/PillowArmchair",
		"Props/OfficeDressing/OfficeWallDetails/FilingCabinet",
		"Props/StationDressing/StationWaitingArea/WaitingCouch",
	]:
		_require_node(label, town, kaykit_path)
	var dressing_blockers := town.get_node_or_null("Props/Blockers/DressingBlockers")
	if dressing_blockers == null:
		_failures.append("%s dense town has no large-furniture blocker group" % label)
	elif _count_static_bodies(dressing_blockers) < 16:
		_failures.append("%s dense town has fewer than 16 large-furniture blockers" % label)
	var exterior_blockers := town.get_node_or_null(
		"Props/Blockers/ExteriorDressingBlockers"
	)
	if exterior_blockers == null:
		_failures.append("%s dense town has no large-exterior-prop blocker group" % label)
	elif _count_static_bodies(exterior_blockers) < 10:
		_failures.append("%s dense town has fewer than 10 exterior prop blockers" % label)


func _count_scene_owned_descendants(node: Node, scene_owner: Node) -> int:
	var count := 0
	for child_value in node.get_children():
		var child := child_value as Node
		if child.owner == scene_owner:
			count += 1
		count += _count_scene_owned_descendants(child, scene_owner)
	return count


func _count_static_bodies(node: Node) -> int:
	var count := 1 if node is StaticBody3D else 0
	for child_value in node.get_children():
		count += _count_static_bodies(child_value as Node)
	return count


func _anchor_position(layout: Dictionary, anchor_ref: String) -> Vector3:
	var parts := anchor_ref.split(".", false, 1)
	if parts.size() != 2:
		return Vector3.ZERO
	for landmark_value in layout.get("landmarks", []):
		if not landmark_value is Dictionary:
			continue
		var landmark := landmark_value as Dictionary
		if str(landmark.get("id", "")) != parts[0]:
			continue
		var anchors: Dictionary = landmark.get("anchors", {})
		return _vector3_from_json(anchors.get(parts[1], []))
	return Vector3.ZERO


func _vector3_from_json(value: Variant) -> Vector3:
	if not value is Array or (value as Array).size() != 3:
		return Vector3.ZERO
	var numbers := value as Array
	return Vector3(float(numbers[0]), float(numbers[1]), float(numbers[2]))

func _require_node(label: String, instance: Node, path: String) -> void:
	if instance.get_node_or_null(path) == null:
		_failures.append("%s is missing runtime node %s" % [label, path])

func _has_failure_for(label: String) -> bool:
	for failure in _failures:
		if failure.begins_with(label) or failure.begins_with("%s " % label):
			return true
	return false
