extends SceneTree

const TEST_CORNER := "res://scenes/testing/asset_test_corner.tscn"
const CHARACTER_MIN_HEIGHT_METERS := 1.70
const CHARACTER_MAX_HEIGHT_METERS := 1.95
const REQUIRED_CHARACTER_ANIMATIONS: Array[StringName] = [&"Idle", &"Walk"]
const FORBIDDEN_VISIBLE_EQUIPMENT: Array[StringName] = [&"Pistol", &"Sword", &"Rifle", &"Gun"]
const REQUIRED_STATIC_ASSETS: PackedStringArray = [
	"res://assets/kenney3d/furniture/bench.glb",
	"res://assets/kenney3d/furniture/bookcase_open_low.glb",
	"res://assets/kenney3d/furniture/chair_desk.glb",
	"res://assets/kenney3d/furniture/computer_keyboard.glb",
	"res://assets/kenney3d/furniture/computer_screen.glb",
	"res://assets/kenney3d/furniture/desk.glb",
	"res://assets/kenney3d/furniture/lounge_sofa.glb",
	"res://assets/kenney3d/furniture/potted_plant.glb",
	"res://assets/kenney3d/nature/fence_simple.glb",
	"res://assets/kenney3d/nature/ground_grass.glb",
	"res://assets/kenney3d/nature/ground_path_straight.glb",
	"res://assets/kenney3d/nature/plant_bush.glb",
	"res://assets/kenney3d/nature/rock_large_a.glb",
	"res://assets/kenney3d/nature/tree_default.glb",
	"res://assets/kenney3d/nature/tree_oak.glb",
	"res://assets/kenney3d/city_roads/light_curved.glb",
	"res://assets/kenney3d/city_roads/road_bend.glb",
	"res://assets/kenney3d/city_roads/road_end.glb",
	"res://assets/kenney3d/city_roads/road_intersection.glb",
	"res://assets/kenney3d/city_roads/road_straight.glb",
	"res://assets/kenney3d/city_commercial/detail_awning.glb",
	"res://assets/kenney3d/city_commercial/detail_overhang.glb",
	"res://assets/kenney3d/city_commercial/detail_parasol_a.glb",
	"res://assets/kaykit/furniture_bits/armchair_pillows.gltf",
	"res://assets/kaykit/furniture_bits/book_set.gltf",
	"res://assets/kaykit/furniture_bits/cabinet_medium_decorated.gltf",
	"res://assets/kaykit/furniture_bits/couch_pillows.gltf",
	"res://assets/kaykit/furniture_bits/lamp_standing.gltf",
	"res://assets/kaykit/furniture_bits/lamp_table.gltf",
	"res://assets/kaykit/furniture_bits/table_low.gltf",
	"res://assets/kaykit/furniture_bits/table_medium_long.gltf",
]
const TEXTURED_ASSETS: PackedStringArray = [
	"res://assets/kenney3d/city_roads/road_straight.glb",
	"res://assets/kenney3d/city_commercial/detail_awning.glb",
	"res://assets/kaykit/furniture_bits/cabinet_medium_decorated.gltf",
]
const CHARACTER_ASSETS := {
	"studio_manager": "res://assets/quaternius/men/casual_hoodie.gltf",
	"roaming_liaison": "res://assets/quaternius/men/casual_2.gltf",
	"park_caretaker": "res://assets/quaternius/men/worker.gltf",
	"station_officer": "res://assets/quaternius/women/worker.gltf",
	"studio_receptionist": "res://assets/quaternius/women/formal.gltf",
	"office_worker": "res://assets/quaternius/women/casual.gltf",
}
const SCALE_REFERENCE_ASSETS := {
	"desk": {
		"path": "res://assets/kenney3d/furniture/desk.glb",
		"min_size": Vector3(1.3, 0.7, 0.7),
		"max_size": Vector3(1.6, 0.9, 0.9),
	},
	"tree": {
		"path": "res://assets/kenney3d/nature/tree_default.glb",
		"min_size": Vector3(1.5, 3.5, 1.3),
		"max_size": Vector3(2.2, 5.0, 2.1),
	},
	"road": {
		"path": "res://assets/kenney3d/city_roads/road_straight.glb",
		"min_size": Vector3(4.9, 0.05, 4.9),
		"max_size": Vector3(5.1, 0.15, 5.1),
	},
	"parasol": {
		"path": "res://assets/kenney3d/city_commercial/detail_parasol_a.glb",
		"min_size": Vector3(1.5, 2.0, 1.8),
		"max_size": Vector3(2.1, 2.5, 2.2),
	},
	"kaykit_armchair": {
		"path": "res://assets/kaykit/furniture_bits/armchair_pillows.gltf",
		"min_size": Vector3(1.7, 1.1, 1.5),
		"max_size": Vector3(1.9, 1.35, 1.75),
	},
}

var _failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	for path in REQUIRED_STATIC_ASSETS:
		_check_scene_import(path, "curated 3D asset")
	for path in TEXTURED_ASSETS:
		_check_albedo_texture(path)
	for label: String in SCALE_REFERENCE_ASSETS:
		_check_scale_reference(label, SCALE_REFERENCE_ASSETS[label])
	for role: String in CHARACTER_ASSETS:
		_check_character(role, CHARACTER_ASSETS[role])
	await _check_test_corner()

	if _failures.is_empty():
		print(
			"PASS asset_validation_smoke: %d static assets, six animated characters, materials, scale, and test corner are valid"
			% REQUIRED_STATIC_ASSETS.size()
		)
		quit(0)
		return
	for failure in _failures:
		print("FAIL asset_validation_smoke: %s" % failure)
	quit(1)


func _check_scene_import(path: String, label: String) -> void:
	var scene := load(path)
	if not scene is PackedScene:
		_failures.append("%s did not load as PackedScene: %s" % [label, path])
		return
	var instance := (scene as PackedScene).instantiate()
	if instance == null:
		_failures.append("%s could not instantiate: %s" % [label, path])
		return
	root.add_child(instance)
	if not _contains_mesh(instance):
		_failures.append("%s contains no MeshInstance3D: %s" % [label, path])
	instance.free()


func _check_albedo_texture(path: String) -> void:
	var scene := load(path)
	if not scene is PackedScene:
		return
	var instance := (scene as PackedScene).instantiate()
	root.add_child(instance)
	var found_texture := false
	for mesh_instance in _mesh_instances(instance):
		var mesh := mesh_instance.mesh
		if mesh == null:
			continue
		for surface_index in mesh.get_surface_count():
			var material := mesh_instance.get_active_material(surface_index)
			if material is BaseMaterial3D and (material as BaseMaterial3D).albedo_texture != null:
				found_texture = true
	if not found_texture:
		_failures.append("expected an imported albedo texture: %s" % path)
	instance.free()


func _check_scale_reference(label: String, spec: Dictionary) -> void:
	var path := str(spec.get("path", ""))
	var scene := load(path)
	if not scene is PackedScene:
		return
	var instance := (scene as PackedScene).instantiate()
	if not instance is Node3D:
		if instance != null:
			instance.free()
		return
	root.add_child(instance)
	var bounds := _node_bounds(instance as Node3D)
	var scale_multiplier := AssetScales.for_path(path)
	var scaled_size := bounds.size * scale_multiplier
	var min_size: Vector3 = spec.get("min_size", Vector3.ZERO)
	var max_size: Vector3 = spec.get("max_size", Vector3.INF)
	if not _vector_in_range(scaled_size, min_size, max_size):
		_failures.append(
			"%s scaled size %s is outside %s–%s using %.2fx"
			% [label, scaled_size, min_size, max_size, scale_multiplier]
		)
	print("PASS asset_validation_smoke: %s scaled_size=%s multiplier=%.2f" % [label, scaled_size, scale_multiplier])
	instance.free()


func _check_character(role: String, path: String) -> void:
	var scene := load(path)
	if not scene is PackedScene:
		_failures.append("character did not load as PackedScene for %s: %s" % [role, path])
		return
	var instance := (scene as PackedScene).instantiate()
	if not instance is Node3D:
		_failures.append("character root is not Node3D for %s: %s" % [role, path])
		if instance != null:
			instance.free()
		return
	root.add_child(instance)
	var bounds := _node_bounds(instance as Node3D)
	if bounds.size.y < CHARACTER_MIN_HEIGHT_METERS or bounds.size.y > CHARACTER_MAX_HEIGHT_METERS:
		_failures.append(
			"character %s height %.3f m is outside %.2f–%.2f m: %s"
			% [role, bounds.size.y, CHARACTER_MIN_HEIGHT_METERS, CHARACTER_MAX_HEIGHT_METERS, path]
		)
	var animation_player := _find_animation_player(instance)
	if animation_player == null:
		_failures.append("character has no AnimationPlayer for %s: %s" % [role, path])
	else:
		for animation_name in REQUIRED_CHARACTER_ANIMATIONS:
			if not animation_player.has_animation(animation_name):
				_failures.append("character %s is missing animation %s" % [role, animation_name])
		if animation_player.has_animation(&"Walk"):
			animation_player.play(&"Walk")
			animation_player.advance(0.1)
	for equipment_name in FORBIDDEN_VISIBLE_EQUIPMENT:
		if instance.find_child(equipment_name, true, false) != null:
			_failures.append("character %s includes visible combat equipment %s" % [role, equipment_name])
	print("PASS asset_validation_smoke: %s height=%.3f m path=%s" % [role, bounds.size.y, path])
	instance.free()


func _check_test_corner() -> void:
	var scene := load(TEST_CORNER)
	if not scene is PackedScene:
		_failures.append("test corner did not load as PackedScene: %s" % TEST_CORNER)
		return
	var instance := (scene as PackedScene).instantiate()
	root.add_child(instance)
	await process_frame
	for required_node in ["DoorOpening", "ScaleCapsule", "ReferenceDesk", "ReferenceChair", "ReferenceBench", "ReferenceTree", "ReferenceRoad"]:
		if instance.find_child(required_node, true, false) == null:
			_failures.append("test corner is missing %s" % required_node)
	_check_node_scale(instance, "ReferenceDesk", AssetScales.FURNITURE)
	_check_node_scale(instance, "ReferenceChair", AssetScales.FURNITURE)
	_check_node_scale(instance, "ReferenceBench", AssetScales.FURNITURE)
	_check_node_scale(instance, "ReferenceTree", AssetScales.NATURE)
	_check_node_scale(instance, "ReferenceRoad", AssetScales.CITY_KITS)
	var character_count := 0
	for child in instance.get_children():
		if child.name.to_lower().begins_with("character"):
			character_count += 1
			_check_node_scale(instance, str(child.name), AssetScales.CHARACTERS)
	if character_count != 6:
		_failures.append("test corner has %d character roots instead of 6" % character_count)
	var walker := instance.find_child("CharacterWalker", true, false)
	if walker == null or not walker.get_meta(&"idle_animation_ready", false):
		_failures.append("test corner walker did not start the Idle animation")
	elif instance.has_method("begin_walk_immediately"):
		instance.call("begin_walk_immediately")
		await process_frame
		if not walker.get_meta(&"walk_animation_ready", false):
			_failures.append("test corner walker did not transition from Idle to Walk")
	instance.free()


func _check_node_scale(root_node: Node, node_name: String, expected: float) -> void:
	var node := root_node.find_child(node_name, true, false) as Node3D
	if node == null:
		return
	var expected_scale := Vector3.ONE * expected
	if not node.scale.is_equal_approx(expected_scale):
		_failures.append("test corner %s scale %s is not the pack scale %s" % [node_name, node.scale, expected_scale])


func _vector_in_range(value: Vector3, minimum: Vector3, maximum: Vector3) -> bool:
	return (
		value.x >= minimum.x and value.x <= maximum.x
		and value.y >= minimum.y and value.y <= maximum.y
		and value.z >= minimum.z and value.z <= maximum.z
	)


func _contains_mesh(node: Node) -> bool:
	if node is MeshInstance3D and (node as MeshInstance3D).mesh != null:
		return true
	for child in node.get_children():
		if _contains_mesh(child):
			return true
	return false


func _mesh_instances(node: Node) -> Array[MeshInstance3D]:
	var result: Array[MeshInstance3D] = []
	if node is MeshInstance3D:
		result.append(node as MeshInstance3D)
	for child in node.get_children():
		result.append_array(_mesh_instances(child))
	return result


func _node_bounds(node: Node3D) -> AABB:
	var bounds := AABB()
	var has_bounds := false
	for mesh_instance in _mesh_instances(node):
		if mesh_instance.mesh == null:
			continue
		var to_root := node.global_transform.affine_inverse() * mesh_instance.global_transform
		var transformed_bounds: AABB = to_root * mesh_instance.get_aabb()
		if not has_bounds:
			bounds = transformed_bounds
			has_bounds = true
		else:
			bounds = bounds.merge(transformed_bounds)
	return bounds


func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var found := _find_animation_player(child)
		if found != null:
			return found
	return null
