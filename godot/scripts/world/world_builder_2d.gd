extends RefCounted
class_name WorldBuilder2D
## Builds one location (TileMapLayers ground/walls/furniture/overhead, collision,
## record props, actors, influence-link pool) from world_layout.json's `tile`
## block plus a Session worldSnapshot. Replaces v1's world_generator.gd; reads
## the same layout file, now the 2D grid. See docs/tech/godot-2d-client.md.

const PackAtlas := preload("res://scripts/data/pack_atlas.gd")
const NPC_SCENE := preload("res://scenes/actors/npc_2d.tscn")
const PROP_SCENE := preload("res://scenes/props/record_prop_2d.tscn")
const PLAYER_SCENE := preload("res://scenes/actors/player.tscn")

var tile_size := 16
var player: Node = null
var npcs: Dictionary = {}
var props: Dictionary = {}
var actors_node: Node2D = null
var influence_node: Node2D = null

func build(root: Node2D, location_id: String, snapshot: Dictionary, tile_block: Dictionary) -> void:
	tile_size = int(tile_block.get("tile_size", 16))
	var palette: Dictionary = tile_block.get("palette", {})
	var prop_textures: Dictionary = tile_block.get("prop_textures", {})
	var locations: Dictionary = tile_block.get("locations", {})
	var loc: Dictionary = locations.get(location_id, {})
	if loc.is_empty():
		return

	var tileset := PackAtlas.build_tileset(palette.values())

	var ground := _make_layer(root, "Ground", tileset)
	var walls := _make_layer(root, "Walls", tileset)
	var furniture := _make_layer(root, "Furniture", tileset)
	actors_node = Node2D.new()
	actors_node.name = "Actors"
	actors_node.y_sort_enabled = true
	root.add_child(actors_node)
	influence_node = Node2D.new()
	influence_node.name = "InfluenceLinks"
	root.add_child(influence_node)
	var overhead := _make_layer(root, "Overhead", tileset)

	var room: Array = loc.get("room", [0, 0, 12, 8])
	var solids: Dictionary = {}

	# Ground: room interior + optional street strip.
	_fill_rect(ground, room, int(palette.get(str(loc.get("floor_tile", "store_floor")), 90)))
	if loc.has("street"):
		_fill_rect(ground, loc["street"], int(palette.get("street_ground", 433)))

	# Walls: perimeter minus door gaps. Top row uses the wall cap tile.
	var door_gaps := _cell_set(loc.get("door_gaps", []))
	_build_walls(walls, room, int(palette.get("wall", 18)), int(palette.get("wall_cap", 17)), door_gaps, solids)
	var wm: Array = loc.get("wall_modulate", [1, 1, 1])
	walls.modulate = Color(wm[0], wm[1], wm[2])

	# Furniture (some solid via solid_cells).
	for group in loc.get("furniture", []):
		var idx := int(palette.get(str(group.get("tile", "")), 0))
		for cell in group.get("cells", []):
			_set_cell(furniture, cell, idx)
	for cell in loc.get("solid_cells", []):
		solids[_key(cell)] = cell

	# Overhead (drawn above actors).
	for group in loc.get("overhead", []):
		var idx := int(palette.get(str(group.get("tile", "")), 0))
		for cell in group.get("cells", []):
			_set_cell(overhead, cell, idx)

	_build_collision(root, solids, room, loc)

	# Record props.
	var prop_state := _prop_state_map(snapshot)
	var prop_meta := _prop_meta_map(snapshot)
	for prop_id in loc.get("props", {}).keys():
		var cell: Array = loc["props"][prop_id]
		var node := PROP_SCENE.instantiate()
		actors_node.add_child(node)
		node.position = _cell_center(cell)
		var meta: Dictionary = prop_meta.get(prop_id, {})
		node.configure({
			"propId": prop_id,
			"label": _t(str(meta.get("labelKey", ""))),
			"desc": _t(str(meta.get("descKey", ""))),
			"state": str(prop_state.get(prop_id, str(meta.get("state", "")))),
			"readers": meta.get("readers", []),
			"texture": str(prop_textures.get(prop_id, "")),
		})
		props[prop_id] = node

	# Actors.
	var actor_meta := _actor_meta_map(snapshot)
	for actor_id in loc.get("spawns", {}).keys():
		var spawn: Array = loc["spawns"][actor_id]
		var facing := str(spawn[2]) if spawn.size() > 2 else "down"
		var pos := _cell_center([int(spawn[0]), int(spawn[1])])
		if actor_id == "player":
			player = PLAYER_SCENE.instantiate()
			actors_node.add_child(player)
			player.position = pos
			player.set("_facing", facing)
		else:
			var npc := NPC_SCENE.instantiate()
			actors_node.add_child(npc)
			npc.position = pos
			var meta: Dictionary = actor_meta.get(actor_id, {})
			npc.configure({
				"actorId": actor_id,
				"label": _t(str(meta.get("labelKey", ""))),
				"role": _t(str(meta.get("roleKey", ""))),
				"sprite": int(meta.get("sprite", 1)),
				"accent": str(meta.get("accent", "#e6e6e6")),
				"facing": facing,
			})
			npcs[actor_id] = npc

# --- helpers -------------------------------------------------------------

func _make_layer(root: Node2D, layer_name: String, tileset: TileSet) -> TileMapLayer:
	var layer := TileMapLayer.new()
	layer.name = layer_name
	layer.tile_set = tileset
	root.add_child(layer)
	return layer

func _fill_rect(layer: TileMapLayer, rect: Array, tile_index: int) -> void:
	var x0 := int(rect[0])
	var y0 := int(rect[1])
	var w := int(rect[2])
	var h := int(rect[3])
	for y in range(y0, y0 + h):
		for x in range(x0, x0 + w):
			_set_cell(layer, [x, y], tile_index)

func _build_walls(layer: TileMapLayer, room: Array, wall_index: int, cap_index: int, door_gaps: Dictionary, solids: Dictionary) -> void:
	var x0 := int(room[0])
	var y0 := int(room[1])
	var w := int(room[2])
	var h := int(room[3])
	for x in range(x0, x0 + w):
		_wall_cell(layer, [x, y0], cap_index, door_gaps, solids)
		_wall_cell(layer, [x, y0 + h - 1], wall_index, door_gaps, solids)
	for y in range(y0, y0 + h):
		_wall_cell(layer, [x0, y], wall_index, door_gaps, solids)
		_wall_cell(layer, [x0 + w - 1, y], wall_index, door_gaps, solids)

func _wall_cell(layer: TileMapLayer, cell: Array, index: int, door_gaps: Dictionary, solids: Dictionary) -> void:
	if door_gaps.has(_key(cell)):
		return
	_set_cell(layer, cell, index)
	solids[_key(cell)] = cell

func _build_collision(root: Node2D, solids: Dictionary, room: Array, loc: Dictionary) -> void:
	var body := StaticBody2D.new()
	body.name = "Collision"
	body.collision_layer = 1
	body.collision_mask = 0
	root.add_child(body)
	for key in solids.keys():
		var cell: Array = solids[key]
		var shape := CollisionShape2D.new()
		var rect := RectangleShape2D.new()
		rect.size = Vector2(tile_size, tile_size)
		shape.shape = rect
		shape.position = _cell_center(cell) - Vector2(0, tile_size * 0.5)
		body.add_child(shape)
	# Outer boundary around the full extent (room + street) keeps the player in.
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
	_boundary(body, Vector2(min_x, min_y) * tile_size, Vector2(max_x, min_y) * tile_size)
	_boundary(body, Vector2(min_x, max_y) * tile_size, Vector2(max_x, max_y) * tile_size)
	_boundary(body, Vector2(min_x, min_y) * tile_size, Vector2(min_x, max_y) * tile_size)
	_boundary(body, Vector2(max_x, min_y) * tile_size, Vector2(max_x, max_y) * tile_size)

func _boundary(body: StaticBody2D, from: Vector2, to: Vector2) -> void:
	var seg := SegmentShape2D.new()
	seg.a = from
	seg.b = to
	var shape := CollisionShape2D.new()
	shape.shape = seg
	body.add_child(shape)

func _set_cell(layer: TileMapLayer, cell: Array, tile_index: int) -> void:
	layer.set_cell(Vector2i(int(cell[0]), int(cell[1])), 0, PackAtlas.coord_for_index(tile_index))

func _cell_center(cell: Array) -> Vector2:
	return Vector2(int(cell[0]) * tile_size + tile_size * 0.5, int(cell[1]) * tile_size + tile_size * 0.5)

func _cell_set(cells: Array) -> Dictionary:
	var out := {}
	for cell in cells:
		out[_key(cell)] = cell
	return out

func _key(cell: Array) -> String:
	return "%d,%d" % [int(cell[0]), int(cell[1])]

func _prop_state_map(snapshot: Dictionary) -> Dictionary:
	var out := {}
	for prop in snapshot.get("recordProps", []):
		out[str(prop.get("propId", ""))] = str(prop.get("state", ""))
	return out

func _prop_meta_map(snapshot: Dictionary) -> Dictionary:
	var out := {}
	for prop in snapshot.get("recordProps", []):
		out[str(prop.get("propId", ""))] = prop
	return out

func _actor_meta_map(snapshot: Dictionary) -> Dictionary:
	var out := {}
	for actor in snapshot.get("actors", []):
		out[str(actor.get("actorId", ""))] = actor
	return out

func _t(key: String) -> String:
	if key.is_empty():
		return ""
	var loop := Engine.get_main_loop()
	if loop is SceneTree:
		var loc: Object = (loop as SceneTree).root.get_node_or_null("Localization")
		if loc != null:
			return str(loc.call("t", key))
	return key

## Load the world layout (with tile block) once.
static func load_layout() -> Dictionary:
	var text := FileAccess.get_file_as_string("res://data/world_layout.json")
	var parsed = JSON.parse_string(text)
	return parsed if parsed is Dictionary else {}
