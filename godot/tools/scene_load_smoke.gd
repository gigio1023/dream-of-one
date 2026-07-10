extends SceneTree

## Instances every M1 client scene in the running tree for at least one frame.
## This is deliberately a scene/runtime smoke, not a structural unit test.

const SCENES := [
	{"label": "store", "path": "res://scenes/world/store.tscn", "frames": 1},
	{"label": "station", "path": "res://scenes/world/station.tscn", "frames": 1},
	{"label": "player", "path": "res://scenes/actors/player.tscn", "frames": 1},
	{"label": "npc", "path": "res://scenes/actors/npc_2d.tscn", "frames": 1},
	{"label": "prop", "path": "res://scenes/props/record_prop_2d.tscn", "frames": 1},
	{"label": "hud", "path": "res://scenes/ui/hud.tscn", "frames": 1},
	{"label": "main", "path": "res://scenes/main.tscn", "frames": 4},
]

var _failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	for spec in SCENES:
		await _instance_scene(spec)

	if _failures.is_empty():
		print("PASS scene_load_smoke: instanced %d scenes in-tree" % SCENES.size())
		quit(0)
		return
	for failure in _failures:
		print("FAIL scene_load_smoke: %s" % failure)
	quit(1)

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

func _require_node(label: String, instance: Node, path: String) -> void:
	if instance.get_node_or_null(path) == null:
		_failures.append("%s is missing runtime node %s" % [label, path])

func _has_failure_for(label: String) -> bool:
	for failure in _failures:
		if failure.begins_with(label) or failure.begins_with("%s " % label):
			return true
	return false
