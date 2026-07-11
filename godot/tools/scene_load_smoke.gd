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
	{"label": "door_3d", "path": "res://scenes/town/door_3d.tscn", "frames": 2},
	{"label": "hud_3d", "path": "res://scenes/ui/hud_3d.tscn", "frames": 2},
	{"label": "town_3d", "path": "res://scenes/town/town_3d.tscn", "frames": 6},
	{"label": "main_3d", "path": "res://scenes/main_3d.tscn", "frames": 6},
	{
		"label": "main_3d_schedule",
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
	if renderer == "forward_plus" and physics_engine == "Jolt Physics":
		print("PASS scene_load_smoke: Forward+ renderer and Jolt Physics baseline")

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
	if label in ["town_3d", "main_3d", "main_3d_schedule"]:
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
		if not _has_failure_for(label):
			print("PASS scene_load_smoke: %s" % label)

	if is_instance_valid(instance):
		instance.queue_free()
		await process_frame


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
		"npc_3d":
			_require_node(label, instance, "CollisionShape3D")
			_require_node(label, instance, "RoleAccent")
			_require_node(label, instance, "NavigationAgent3D")
			_require_node(label, instance, "DoorRay")
		"door_3d":
			_require_node(label, instance, "PanelMesh")
			_require_node(label, instance, "PanelCollision")
			if not instance.has_method("interact") or not instance.has_method("open_for_npc"):
				_failures.append("door_3d does not expose player and NPC interaction")
		"hud_3d":
			_require_node(label, instance, "Overlay/Reticle")
			_require_node(label, instance, "Overlay/PromptPanel")
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
			_require_node(label, instance, "Doors/DOOR_STUDIO_FRONT")
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
		"main_3d", "main_3d_schedule":
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
	var studio_door := instance.get_node_or_null("Doors/DOOR_STUDIO_FRONT") as Door3D
	if manager == null or caretaker == null or studio_door == null:
		_failures.append("%s has no manager/caretaker/Studio-door movement proof" % label)
		return
	if studio_door.is_open():
		_failures.append("%s Studio door did not start closed" % label)
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
	var studio_door_opened := false
	var convergence_frames := 540
	for _frame in range(convergence_frames):
		await physics_frame
		studio_door_opened = studio_door_opened or studio_door.is_open()
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
				+ "(arrivals=%s manager=%s caretaker=%s doorOpen=%s)"
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
				studio_door_opened,
			]
		)
		return
	if str((arrivals["NPC_Studio_Manager"] as Dictionary).get("anchorRef", "")) != manager_anchor:
		_failures.append("%s manager arrived at the wrong semantic meeting slot" % label)
	if str((arrivals["NPC_Park_Caretaker"] as Dictionary).get("anchorRef", "")) != caretaker_anchor:
		_failures.append("%s caretaker arrived at the wrong semantic meeting slot" % label)
	if not studio_door_opened:
		_failures.append("%s manager did not open the closed Studio door en route" % label)
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
	if not receptionist.is_interaction_enabled():
		_failures.append("%s Studio receptionist is not interactable" % label)
		return
	for actor_value in instance.get_tree().get_nodes_in_group(&"npc_actors"):
		if not actor_value is NPC3D or actor_value == receptionist:
			continue
		if (actor_value as NPC3D).is_interaction_enabled():
			_failures.append("%s exposes an unsupported NPC conversation" % label)

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
	if int(main_snapshot.get("runWorldRevision", -1)) != 3:
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

	var snapshot: Dictionary = {}
	var run_ready := false
	for _frame in range(120):
		await process_frame
		snapshot = instance.call("presentation_snapshot")
		var scheduler_value: Variant = snapshot.get("scheduler", {})
		if (
			not str(snapshot.get("runId", "")).is_empty()
			and scheduler_value is Dictionary
			and not (scheduler_value as Dictionary).is_empty()
		):
			run_ready = true
			break
	if not run_ready:
		_failures.append("%s fixture run did not auto-start with scheduler state" % label)
		return
	if int(snapshot.get("runWorldRevision", -1)) != 0:
		_failures.append("%s fresh schedule run did not start at revision zero" % label)
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
			int(snapshot.get("runWorldRevision", -1)) == 1
			and movement_actor_ids.has("NPC_Studio_Receptionist")
			and movement_actor_ids.has("NPC_Office_Worker")
			and movement_actor_ids.has("NPC_Station_Officer")
		):
			first_advance_applied = true
			break
	if not first_advance_applied:
		_failures.append(
			(
				"%s first ten-second advance did not issue initial movements "
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
	if first_movement_actor_ids.size() != 3:
		_failures.append(
			"%s initial movement batch contains unexpected actors: %s"
			% [label, first_movement_actor_ids.keys()]
		)
	var first_clock: Dictionary = snapshot.get("worldClock", {})
	if float(first_clock.get("elapsedSeconds", -1.0)) != 10.0:
		_failures.append("%s first advance did not reach ten world seconds" % label)

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
	for _frame in range(240):
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
			int(snapshot.get("runWorldRevision", -1)) >= 2
			and arrivals_value is Array
			and (arrivals_value as Array).size() == 3
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
			int(snapshot.get("runWorldRevision", -1)) == 3
			and route_actor_ids.has("NPC_Park_Caretaker")
			and route_actor_ids.has("NPC_Roaming_Liaison")
		):
			route_advance_applied = true
			break
	if not route_advance_applied:
		_failures.append("%s second ten-second advance did not issue route movements" % label)
		return
	var route_clock: Dictionary = snapshot.get("worldClock", {})
	if float(route_clock.get("elapsedSeconds", -1.0)) != 20.0:
		_failures.append("%s route advance did not reach twenty world seconds" % label)
	var final_budget: Dictionary = snapshot.get("providerBudget", {})
	if int(final_budget.get("callsUsed", -1)) != 0:
		_failures.append("%s deterministic scheduling consumed provider calls" % label)


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
