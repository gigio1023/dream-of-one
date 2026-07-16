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
## Plaza apron drawn around the room so wide views (up to 426×240 world px)
## never expose void; it also bounds the follow camera. 7 tiles covers the
## widest ladder view around the smallest room (station, 224×160) while
## keeping edge shots from reading as empty plaza.
const APRON_TILES := 7

var tile_size := 16
## Lit room bounds in tiles. Native world-text overlays stay inside the inner
## floor so speech and status chips never cover the wall band or apron.
var room_bounds := Rect2i()
## Room + street + apron, in tiles. The location camera clamps to this rect.
var dressed_bounds := Rect2i()
var player: Node = null
var npcs: Dictionary = {}
var props: Dictionary = {}
var actors_node: Node2D = null
var influence_node: Node2D = null
var doorways: Array[Area2D] = []

func build(root: Node2D, location_id: String, snapshot: Dictionary, tile_block: Dictionary) -> void:
	tile_size = int(tile_block.get("tile_size", 16))
	var palette: Dictionary = tile_block.get("palette", {})
	var prop_textures: Dictionary = tile_block.get("prop_textures", {})
	var prop_content: Dictionary = tile_block.get("prop_content", {})
	var actor_visuals: Dictionary = tile_block.get("actor_visuals", {})
	var locations: Dictionary = tile_block.get("locations", {})
	var loc: Dictionary = locations.get(location_id, {})
	if loc.is_empty():
		return

	var tileset := PackAtlas.build_tileset(palette.values())

	# Apron first so every later layer draws above it. Modulated down so the
	# lit room, not the plaza, stays the visual anchor.
	var extent := _location_extent(loc)
	dressed_bounds = extent.grow(APRON_TILES)
	var apron := _make_layer(root, "Apron", tileset)
	apron.modulate = Color(0.72, 0.72, 0.78)
	_fill_rect(
		apron,
		[dressed_bounds.position.x, dressed_bounds.position.y, dressed_bounds.size.x, dressed_bounds.size.y],
		int(palette.get("station_floor", 9))
	)

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
	room_bounds = Rect2i(int(room[0]), int(room[1]), int(room[2]), int(room[3]))
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

	_build_collision(root, solids, loc)
	_build_doorways(root, loc)

	# Record props. Player-facing record surfaces stay in layout/runtime data
	# for inspect + NPC visibility, but spawnInWorld:false keeps them out of
	# the dressed room (M3: records live in inspect, not as floor props).
	var prop_state := _prop_state_map(snapshot)
	var prop_meta := _prop_meta_map(snapshot)
	for prop_id in loc.get("props", {}).keys():
		var content: Dictionary = prop_content.get(prop_id, {})
		if content.has("spawnInWorld") and not bool(content.get("spawnInWorld")):
			continue
		var cell: Array = loc["props"][prop_id]
		var node := PROP_SCENE.instantiate()
		actors_node.add_child(node)
		node.position = _cell_center(cell)
		var meta: Dictionary = prop_meta.get(prop_id, {})
		var label := str(meta.get("label", ""))
		if label.is_empty():
			label = _t(str(content.get("labelKey", "")))
		node.configure({
			"propId": prop_id,
			"label": label,
			"desc": _t(str(content.get("descKey", ""))),
			"state": str(prop_state.get(prop_id, str(content.get("defaultState", "")))),
			"readers": meta.get("visibleTo", content.get("readers", [])),
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
			var visual: Dictionary = actor_visuals.get(actor_id, {})
			var actor_label := str(meta.get("name", ""))
			if actor_label.is_empty():
				actor_label = _t(str(visual.get("labelKey", "")))
			npc.configure({
				"actorId": actor_id,
				"label": actor_label,
				"role": _t(str(visual.get("roleKey", ""))),
				"sprite": int(visual.get("sprite", 1)),
				"accent": str(visual.get("accent", "#e6e6e6")),
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

func _build_collision(root: Node2D, solids: Dictionary, loc: Dictionary) -> void:
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
		shape.position = _cell_center(cell)
		body.add_child(shape)
	# Outer boundary around the full extent (room + street) keeps the player in;
	# the apron beyond it is scenery only.
	var extent := _location_extent(loc)
	var min_x := extent.position.x
	var min_y := extent.position.y
	var max_x := extent.end.x
	var max_y := extent.end.y
	_boundary(body, Vector2(min_x, min_y) * tile_size, Vector2(max_x, min_y) * tile_size)
	_boundary(body, Vector2(min_x, max_y) * tile_size, Vector2(max_x, max_y) * tile_size)
	_boundary(body, Vector2(min_x, min_y) * tile_size, Vector2(min_x, max_y) * tile_size)
	_boundary(body, Vector2(max_x, min_y) * tile_size, Vector2(max_x, max_y) * tile_size)

## Playable extent (room + optional street) of a location, in tiles.
func _location_extent(loc: Dictionary) -> Rect2i:
	var room: Array = loc.get("room", [0, 0, 12, 8])
	var extent := Rect2i(int(room[0]), int(room[1]), int(room[2]), int(room[3]))
	if loc.has("street"):
		var s: Array = loc["street"]
		extent = extent.merge(Rect2i(int(s[0]), int(s[1]), int(s[2]), int(s[3])))
	return extent

func _build_doorways(root: Node2D, loc: Dictionary) -> void:
	var doorway_root := Node2D.new()
	doorway_root.name = "Doorways"
	root.add_child(doorway_root)
	doorways.clear()
	for spec in loc.get("doorways", []):
		var doorway_cell: Array = spec.get("cell", [0, 0])
		var area := Area2D.new()
		area.name = "DoorwayTo%s" % str(spec.get("to", "")).capitalize()
		area.collision_layer = 0
		area.collision_mask = 1
		area.monitoring = true
		area.monitorable = false
		area.position = _cell_center(doorway_cell)
		area.set_meta("target_location", str(spec.get("to", "")))
		area.add_to_group("doorways")
		var shape := CollisionShape2D.new()
		var rect := RectangleShape2D.new()
		rect.size = Vector2(tile_size * 0.8, tile_size * 0.8)
		shape.shape = rect
		area.add_child(shape)
		doorway_root.add_child(area)
		doorways.append(area)

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
		var object_id := str(prop.get("objectId", prop.get("propId", "")))
		out[object_id] = str(prop.get("state", ""))
	return out

func _prop_meta_map(snapshot: Dictionary) -> Dictionary:
	var out := {}
	for prop in snapshot.get("recordProps", []):
		var object_id := str(prop.get("objectId", prop.get("propId", "")))
		out[object_id] = prop
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
