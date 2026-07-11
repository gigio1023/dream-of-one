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

	if not is_instance_valid(instance) or not instance.is_inside_tree():
		_failures.append("%s did not survive one process frame" % label)
	else:
		_check_runtime_shape(label, instance)
		if label == "town_3d":
			await _check_npc_movement(label, instance)
		if not _has_failure_for(label):
			print("PASS scene_load_smoke: %s" % label)

	if is_instance_valid(instance):
		instance.queue_free()
		await process_frame

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
		"main_3d":
			_require_node(label, instance, "Town")
			_require_node(label, instance, "Town/Actors/Player3D")
			_require_node(label, instance, "HUD3D")
			_require_node(label, instance, "AgentPlaytestSurface")
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
	var npc := instance.get_node_or_null("Actors/NPC_Park_Caretaker") as CharacterBody3D
	if npc == null or not npc.has_method("move_to"):
		_failures.append("%s has no movable caretaker shell" % label)
		return
	var start := npc.global_position
	var target := start + Vector3(2.0, 0.0, 0.0)
	npc.call("move_to", target)
	for _frame in range(45):
		await physics_frame
	var progress := Vector2(npc.global_position.x - start.x, npc.global_position.z - start.z).length()
	if progress < 0.25:
		_failures.append("%s NPC move_to made no physical progress" % label)
	if npc.has_method("stop"):
		npc.call("stop")


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
