extends Node2D
## A location scene (store / station). Builds itself from world_layout.json's
## tile block and the current Session worldSnapshot, then frames a follow camera.
## Self-sufficient so scene_load_smoke can instance it standalone (it falls back
## to the committed fixture snapshot when no session is running).

const WorldBuilderScript := preload("res://scripts/world/world_builder_2d.gd")

@export var location_id := "store"

var builder: RefCounted = null
var _camera: Camera2D = null

func _ready() -> void:
	var snapshot := _snapshot()
	var layout := WorldBuilderScript.load_layout()
	var tile_block: Dictionary = layout.get("tile", {})
	builder = WorldBuilderScript.new()
	builder.build(self, location_id, snapshot, tile_block)
	_setup_camera(tile_block)

func _snapshot() -> Dictionary:
	var session := get_node_or_null("/root/Session")
	if session != null and session.call("is_started"):
		return session.call("snapshot")
	return _fixture_snapshot()

func _fixture_snapshot() -> Dictionary:
	var text := FileAccess.get_file_as_string("res://data/fixtures/session-api-examples.json")
	var parsed = JSON.parse_string(text)
	if parsed is Dictionary:
		return ((parsed.get("start", {}) as Dictionary).get("response", {}) as Dictionary).get("worldSnapshot", {})
	return {}

func _setup_camera(tile_block: Dictionary) -> void:
	if builder == null or builder.player == null:
		return
	var loc: Dictionary = (tile_block.get("locations", {}) as Dictionary).get(location_id, {})
	var t := int(tile_block.get("tile_size", 16))
	var room: Array = loc.get("room", [0, 0, 12, 8])
	var min_x := int(room[0])
	var min_y := int(room[1])
	var max_x := int(room[0]) + int(room[2])
	var max_y := int(room[1]) + int(room[3])
	if loc.has("street"):
		var s: Array = loc["street"]
		min_x = min(min_x, int(s[0]))
		min_y = min(min_y, int(s[1]))
		max_x = max(max_x, int(s[0]) + int(s[2]))
		max_y = max(max_y, int(s[1]) + int(s[3]))
	_camera = Camera2D.new()
	_camera.zoom = Vector2(2, 2)
	_camera.position_smoothing_enabled = true
	_camera.position_smoothing_speed = 8.0
	_camera.limit_left = min_x * t
	_camera.limit_top = min_y * t
	_camera.limit_right = max_x * t
	_camera.limit_bottom = max_y * t
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
