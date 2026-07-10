extends Node2D
## A location scene (store / station). Builds itself from world_layout.json's
## tile block and the current Session worldSnapshot, then frames a follow camera.
## Self-sufficient so scene_load_smoke can instance it standalone (it falls back
## to the committed fixture snapshot when no session is running).

const WorldBuilderScript := preload("res://scripts/world/world_builder_2d.gd")

@export var location_id := "store"

signal doorway_entered(target_location: String)

var builder: RefCounted = null
var _camera: Camera2D = null
var initial_snapshot: Dictionary = {}

func _ready() -> void:
	var snapshot := initial_snapshot if not initial_snapshot.is_empty() else _snapshot()
	var layout := WorldBuilderScript.load_layout()
	var tile_block: Dictionary = layout.get("tile", {})
	builder = WorldBuilderScript.new()
	builder.build(self, location_id, snapshot, tile_block)
	_setup_camera(tile_block)
	for doorway in builder.doorways:
		doorway.body_entered.connect(_on_doorway_body_entered.bind(doorway))

func configure_snapshot(snapshot: Dictionary) -> void:
	initial_snapshot = snapshot.duplicate(true)

func _snapshot() -> Dictionary:
	var session := get_node_or_null("/root/Session")
	if session != null and session.call("is_started"):
		return session.call("last_world_snapshot")
	return _fixture_snapshot()

func _fixture_snapshot() -> Dictionary:
	var text := FileAccess.get_file_as_string("res://data/fixtures/session-api-examples.json")
	var parsed = JSON.parse_string(text)
	if parsed is Dictionary:
		var endpoints: Dictionary = parsed.get("endpoints", {})
		if endpoints.has("start"):
			return ((endpoints.get("start", {}) as Dictionary).get("response", {}) as Dictionary).get("worldSnapshot", {})
		return ((parsed.get("start", {}) as Dictionary).get("response", {}) as Dictionary).get("worldSnapshot", {})
	return {}

func _on_doorway_body_entered(body: Node, doorway: Area2D) -> void:
	if not body.is_in_group("player"):
		return
	var target := str(doorway.get_meta("target_location", ""))
	if not target.is_empty():
		doorway_entered.emit(target)

func _setup_camera(tile_block: Dictionary) -> void:
	if builder == null or builder.player == null:
		return
	var t := int(tile_block.get("tile_size", 16))
	# Magnification lives entirely in the window's integer scale (main.gd);
	# the camera renders 1:1 world pixels and clamps to the dressed apron so
	# wide views never show void.
	var bounds: Rect2i = builder.dressed_bounds
	_camera = Camera2D.new()
	_camera.zoom = Vector2(1, 1)
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 8.0
	_camera.limit_left = bounds.position.x * t
	_camera.limit_top = bounds.position.y * t
	_camera.limit_right = bounds.end.x * t
	_camera.limit_bottom = bounds.end.y * t
	builder.player.add_child(_camera)
	_camera.make_current()

func get_player() -> Node:
	return builder.player if builder != null else null

func get_npc(actor_id: String) -> Node:
	return builder.npcs.get(actor_id, null) if builder != null else null

func get_prop(prop_id: String) -> Node:
	return builder.props.get(prop_id, null) if builder != null else null

func influence_layer() -> Node2D:
	return builder.influence_node if builder != null else null

func actor_overlay_payloads() -> Array[Dictionary]:
	var payloads: Array[Dictionary] = []
	if builder == null:
		return payloads
	for npc in builder.npcs.values():
		if npc != null and npc.has_method("overlay_payload"):
			payloads.append(npc.call("overlay_payload"))
	return payloads

func prop_overlay_payloads() -> Array[Dictionary]:
	var payloads: Array[Dictionary] = []
	if builder == null:
		return payloads
	for prop in builder.props.values():
		if prop != null and prop.has_method("overlay_payload"):
			payloads.append(prop.call("overlay_payload"))
	return payloads

## Screen-attached text may follow world objects, but it stays over the lit
## floor rather than covering the one-tile wall band or spilling into apron.
func overlay_safe_world_rect() -> Rect2:
	if builder == null:
		return Rect2()
	var room: Rect2i = builder.room_bounds
	if room.size.x <= 2 or room.size.y <= 2:
		return Rect2()
	var inner_position := room.position + Vector2i.ONE
	var inner_size := room.size - Vector2i(2, 2)
	return Rect2(
		Vector2(inner_position * builder.tile_size),
		Vector2(inner_size * builder.tile_size)
	)

func set_debug_visible(value: bool) -> void:
	if builder == null:
		return
	if builder.player != null and builder.player.has_method("set_debug_visible"):
		builder.player.call("set_debug_visible", value)
	for npc in builder.npcs.values():
		if npc != null and npc.has_method("set_debug_visible"):
			npc.call("set_debug_visible", value)
	for prop in builder.props.values():
		if prop != null and prop.has_method("set_debug_visible"):
			prop.call("set_debug_visible", value)
