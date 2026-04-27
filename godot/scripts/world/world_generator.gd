class_name WorldGenerator
extends RefCounted

const NPC_SCENE := preload("res://scenes/actors/npc_placeholder.tscn")
const TEXT_SURFACE_SCENE := preload("res://scenes/world/text_surface.tscn")

static func build_world(
	layout: Dictionary,
	world_root: Node3D,
	actors_root: Node3D,
	player: CharacterBody3D
) -> Dictionary:
	_clear_children(world_root)
	_clear_generated_actors(actors_root)

	var anchors := {}
	var landmark_ids: Array[String] = []
	var surface_ids: Array[String] = []
	var generation_failures: Array[String] = []

	var ground_root := _node3d("Generated_Ground", world_root)
	_create_ground(ground_root)

	var landmarks_root := _node3d("Generated_Landmarks", world_root)
	var anchors_root := _node3d("Generated_Anchors", world_root)
	var routes_root := _node3d("Generated_Routes", world_root)
	var zones_root := _node3d("Generated_Zones", world_root)
	var text_root := _node3d("Generated_TextSurfaces", world_root)

	for landmark in layout.get("landmarks", []):
		_create_landmark(landmarks_root, anchors_root, landmark, anchors)
		landmark_ids.append(str(landmark.get("id", "")))

	for route in layout.get("routes", []):
		_create_route(routes_root, route, anchors, generation_failures)

	for zone in layout.get("interaction_zones", []):
		_create_zone(zones_root, zone, anchors, generation_failures)

	for surface in layout.get("text_surfaces", []):
		_create_text_surface(text_root, surface, anchors, generation_failures)
		surface_ids.append(str(surface.get("id", "")))

	for actor in layout.get("actors", []):
		_create_actor(actors_root, actor, anchors, generation_failures)

	_place_player(player, layout.get("player_start", {}))
	world_root.set_meta("generation_failures", generation_failures)

	return {
		"world_id": layout.get("world_id", ""),
		"world_revision": layout.get("world_revision", ""),
		"landmark_ids": landmark_ids,
		"text_surface_ids": surface_ids,
		"anchor_count": anchors.size(),
		"route_count": layout.get("routes", []).size(),
		"zone_count": layout.get("interaction_zones", []).size(),
		"npc_count": layout.get("actors", []).size(),
		"generation_failures": generation_failures
	}

static func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()

static func _clear_generated_actors(actors_root: Node) -> void:
	for child in actors_root.get_children():
		if child.is_in_group("npc_placeholders") or String(child.name).begins_with("Actor_"):
			child.queue_free()

static func _node3d(node_name: String, parent: Node) -> Node3D:
	var node := Node3D.new()
	node.name = node_name
	parent.add_child(node)
	return node

static func _create_ground(parent: Node3D) -> void:
	var body := StaticBody3D.new()
	body.name = "Ground_RuntimePath"
	body.add_to_group("generated_geometry")
	parent.add_child(body)

	var mesh := MeshInstance3D.new()
	mesh.name = "GroundMesh"
	var plane := PlaneMesh.new()
	plane.size = Vector2(36, 30)
	mesh.mesh = plane
	mesh.material_override = _material("GroundMaterial", Color(0.16, 0.18, 0.18, 1.0))
	body.add_child(mesh)

	var collision := CollisionShape3D.new()
	collision.name = "GroundCollision"
	var shape := BoxShape3D.new()
	shape.size = Vector3(36, 0.2, 30)
	collision.position.y = -0.1
	collision.shape = shape
	body.add_child(collision)

static func _create_landmark(
	landmarks_root: Node3D,
	anchors_root: Node3D,
	landmark: Dictionary,
	anchors: Dictionary
) -> void:
	var landmark_id := str(landmark.get("id", "Landmark"))
	var size := _vec3(landmark.get("size", [4, 3, 4]))
	var position := _vec3(landmark.get("position", [0, 0, 0]))
	var color := _color(landmark.get("color", [0.45, 0.45, 0.45, 1.0]))

	var body := StaticBody3D.new()
	body.name = "Landmark_%s" % _safe_name(landmark_id)
	body.position = position + Vector3(0, size.y * 0.5, 0)
	body.add_to_group("landmarks")
	body.add_to_group("generated_geometry")
	body.set_meta("landmark_id", landmark_id)
	body.set_meta("label", str(landmark.get("label", landmark_id)))
	landmarks_root.add_child(body)

	var mesh := MeshInstance3D.new()
	mesh.name = "ProxyVolume"
	var box := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.material_override = _material("%sMaterial" % landmark_id, color)
	body.add_child(mesh)

	var label := Label3D.new()
	label.name = "Label_%s" % _safe_name(landmark_id)
	label.text = landmark_id
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 40
	label.outline_size = 8
	label.position = Vector3(0, size.y * 0.58, 0)
	body.add_child(label)

	for anchor_name in landmark.get("anchors", {}).keys():
		var anchor_key := "%s.%s" % [landmark_id, anchor_name]
		var marker := Marker3D.new()
		marker.name = "Anchor_%s_%s" % [_safe_name(landmark_id), _safe_name(anchor_name)]
		marker.position = _vec3(landmark["anchors"][anchor_name])
		marker.add_to_group("anchors")
		marker.set_meta("anchor_key", anchor_key)
		marker.set_meta("landmark_id", landmark_id)
		anchors_root.add_child(marker)
		anchors[anchor_key] = marker.position

static func _create_route(parent: Node3D, route: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var route_id := str(route.get("id", "Route"))
	var points: Array = route.get("points", [])
	var path := Path3D.new()
	path.name = "Route_%s" % _safe_name(route_id)
	path.add_to_group("routes")
	path.set_meta("route_id", route_id)
	path.set_meta("label", str(route.get("label", route_id)))
	parent.add_child(path)

	var curve := Curve3D.new()
	for point_key in points:
		curve.add_point(_anchor_or_zero(anchors, str(point_key), generation_failures) + Vector3(0, 0.08, 0))
	path.curve = curve

	for index in range(points.size()):
		var marker := MeshInstance3D.new()
		marker.name = "RouteMarker_%s_%02d" % [_safe_name(route_id), index]
		var mesh := SphereMesh.new()
		mesh.radius = 0.12
		mesh.height = 0.24
		marker.mesh = mesh
		marker.material_override = _material("RouteMarkerMaterial", Color(0.96, 0.96, 0.74, 1.0))
		marker.position = curve.get_point_position(index)
		path.add_child(marker)

static func _create_zone(parent: Node3D, zone: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var zone_id := str(zone.get("id", "Zone"))
	var radius := float(zone.get("radius", 1.5))
	var area := Area3D.new()
	area.name = "Zone_%s" % _safe_name(zone_id)
	area.position = _anchor_or_zero(anchors, str(zone.get("anchor", "")), generation_failures) + Vector3(0, 0.04, 0)
	area.add_to_group("interaction_zones")
	area.set_meta("zone_id", zone_id)
	area.set_meta("kind", str(zone.get("kind", "")))
	area.set_meta("landmark", str(zone.get("landmark", "")))
	area.set_meta("cover_test_id", str(zone.get("cover_test_id", "")))
	parent.add_child(area)

	var collision := CollisionShape3D.new()
	collision.name = "ZoneCollision"
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = 0.2
	collision.shape = shape
	area.add_child(collision)

	var mesh := MeshInstance3D.new()
	mesh.name = "ZoneDisc"
	var cylinder := CylinderMesh.new()
	cylinder.top_radius = radius
	cylinder.bottom_radius = radius
	cylinder.height = 0.04
	mesh.mesh = cylinder
	mesh.material_override = _material("ZoneMaterial", Color(0.2, 0.8, 0.95, 0.28))
	area.add_child(mesh)

static func _create_text_surface(parent: Node3D, surface: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var text_surface := TEXT_SURFACE_SCENE.instantiate()
	var anchor_position := _anchor_or_zero(anchors, str(surface.get("anchor", "")), generation_failures)
	text_surface.position = anchor_position
	text_surface.add_to_group("generated_text_surfaces")
	if text_surface.has_method("configure"):
		text_surface.configure(surface)
	parent.add_child(text_surface)

static func _create_actor(actors_root: Node3D, actor: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var npc := NPC_SCENE.instantiate()
	npc.position = _anchor_or_zero(anchors, str(actor.get("spawn_anchor", "")), generation_failures)
	if npc.has_method("configure"):
		npc.configure(actor)
	actors_root.add_child(npc)

static func _place_player(player: CharacterBody3D, player_start: Dictionary) -> void:
	var start_position := _vec3(player_start.get("position", [0, 0.05, 12]))
	var yaw_degrees := float(player_start.get("yaw_degrees", 180.0))
	if player.has_method("place_at"):
		player.place_at(start_position, yaw_degrees)
	else:
		player.global_position = start_position
		player.rotation.y = deg_to_rad(yaw_degrees)

static func _anchor_or_zero(anchors: Dictionary, anchor_key: String, generation_failures: Array[String]) -> Vector3:
	if anchors.has(anchor_key):
		return anchors[anchor_key]
	var failure := "Missing anchor in generated world: %s" % anchor_key
	push_error(failure)
	generation_failures.append(failure)
	return Vector3.ZERO

static func _vec3(values: Variant) -> Vector3:
	if values is Array and values.size() >= 3:
		return Vector3(float(values[0]), float(values[1]), float(values[2]))
	return Vector3.ZERO

static func _color(values: Variant) -> Color:
	if values is Array and values.size() >= 4:
		return Color(float(values[0]), float(values[1]), float(values[2]), float(values[3]))
	return Color(0.45, 0.45, 0.45, 1.0)

static func _material(material_name: String, color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.resource_name = material_name
	material.albedo_color = color
	material.roughness = 0.86
	if color.a < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material

static func _safe_name(value: Variant) -> String:
	return str(value) \
		.replace(" ", "_") \
		.replace(".", "_") \
		.replace("-", "_") \
		.replace("/", "_") \
		.replace(":", "_")
