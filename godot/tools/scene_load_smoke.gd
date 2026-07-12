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
			if not instance.has_method("presentation_snapshot"):
				_failures.append("hud_3d exposes no presentation snapshot")
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
			var playtest_surface := instance.get_node_or_null("AgentPlaytestSurface")
			if playtest_surface == null or not playtest_surface.has_method("snapshot"):
				_failures.append("main_3d has no AgentPlaytestSurface snapshot")

func _check_town_navigation(label: String, instance: Node, region: NavigationRegion3D) -> void:
	var navigation_map := region.get_navigation_map()
	if not navigation_map.is_valid() or NavigationServer3D.map_get_iteration_id(navigation_map) == 0:
		_failures.append("%s navigation map did not synchronize" % label)
		return
	for vertex in region.navigation_mesh.get_vertices():
		if vertex.y > 1.0:
			_failures.append("%s navmesh contains a walkable ceiling island" % label)
			break
	var layout: Dictionary = instance.call("layout_snapshot")
	var player_start: Dictionary = layout.get("player_start", {})
	var start := _vector3_from_json(player_start.get("position", []))
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


func _check_npc_spatial_facts(label: String, instance: Node) -> void:
	if not instance.has_method("npc_spatial_facts"):
		_failures.append("%s exposes no engine-derived NPC spatial facts" % label)
		return
	var facts_value: Variant = instance.call("npc_spatial_facts")
	if not facts_value is Array or (facts_value as Array).size() != 6:
		_failures.append("%s spatial packet does not contain exactly six residents" % label)
		return
	var facts := facts_value as Array
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
		elif str((stance_entry as Dictionary).get("summary", "")).is_empty():
			_failures.append("%s did not persist the judgment why-line in normal UI" % label)
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
