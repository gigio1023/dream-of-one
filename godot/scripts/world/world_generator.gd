class_name WorldGenerator
extends RefCounted

const NPC_SCENE := preload("res://scenes/actors/npc_placeholder.tscn")
const TEXT_SURFACE_SCENE := preload("res://scenes/world/text_surface.tscn")

const KENNEY_ROADS := "res://assets/kenney/city-kit-roads/"
const KENNEY_COMMERCIAL := "res://assets/kenney/city-kit-commercial/"
const KENNEY_SUBURBAN := "res://assets/kenney/city-kit-suburban/"

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
	var assets_root := _node3d("Generated_FreeAssets", world_root)

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

	_create_free_asset_pass(assets_root, anchors, generation_failures)
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

static func _create_free_asset_pass(parent: Node3D, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var street_root := _node3d("Kenney_StreetSet", parent)
	_spawn_asset(street_root, KENNEY_ROADS + "road-crossroad.glb", "Road_Civic_Center", Vector3(0, 0.02, -2), Vector3.ONE * 2.0, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "road-straight.glb", "Road_North_Segment", Vector3(0, 0.025, 5), Vector3.ONE * 2.0, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "road-straight.glb", "Road_South_Segment", Vector3(0, 0.025, -9), Vector3.ONE * 2.0, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "road-crossing.glb", "Road_Station_Crossing", Vector3(8, 0.03, -8), Vector3.ONE * 1.4, deg_to_rad(90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "road-side.glb", "Road_Store_SideLane", Vector3(-7.0, 0.024, 0.7), Vector3.ONE * 1.45, deg_to_rad(90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "road-side.glb", "Road_Studio_SideLane", Vector3(7.0, 0.024, 0.7), Vector3.ONE * 1.45, deg_to_rad(-90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "road-straight-barrier.glb", "Road_Station_BarrierRun", Vector3(4.7, 0.028, -8.8), Vector3.ONE * 1.45, deg_to_rad(90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "road-straight-barrier.glb", "Road_Park_BarrierRun", Vector3(-4.7, 0.028, -8.8), Vector3.ONE * 1.45, deg_to_rad(90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "light-square.glb", "StreetLight_Store", Vector3(-6.2, 0.05, 3.0), Vector3.ONE * 1.1, deg_to_rad(180.0))
	_spawn_asset(street_root, KENNEY_ROADS + "light-square.glb", "StreetLight_Station", Vector3(6.5, 0.05, -7.5), Vector3.ONE * 1.1, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "construction-light.glb", "WorkLight_Station_01", Vector3(8.2, 0.05, -7.2), Vector3.ONE * 1.0, deg_to_rad(180.0))
	_spawn_asset(street_root, KENNEY_ROADS + "construction-light.glb", "WorkLight_Station_02", Vector3(12.3, 0.05, -7.2), Vector3.ONE * 1.0, deg_to_rad(180.0))
	_spawn_asset(street_root, KENNEY_ROADS + "construction-cone.glb", "Cone_Station_01", Vector3(9.2, 0.05, -8.2), Vector3.ONE * 1.0, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "construction-cone.glb", "Cone_Station_02", Vector3(9.9, 0.05, -8.25), Vector3.ONE * 1.0, 0.0)
	_spawn_asset(street_root, KENNEY_ROADS + "construction-barrier.glb", "Barrier_Station_Intake", Vector3(10.6, 0.05, -8.15), Vector3.ONE * 1.0, deg_to_rad(90.0))
	_spawn_asset(street_root, KENNEY_ROADS + "sign-highway.glb", "DreamLaw_StreetSign", Vector3(-2.8, 0.05, 2.8), Vector3.ONE * 0.95, deg_to_rad(180.0))
	_spawn_asset(street_root, KENNEY_ROADS + "sign-highway-wide.glb", "Station_StreetSign", Vector3(2.8, 0.05, -5.8), Vector3.ONE * 0.95, 0.0)

	var building_root := _node3d("Kenney_CommercialSet", parent)
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "building-a.glb", "North_Block_Building_A", Vector3(-15.5, 0.05, -5.5), Vector3.ONE * 1.6, deg_to_rad(8.0))
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "building-d.glb", "North_Block_Building_D", Vector3(15.5, 0.05, -5.4), Vector3.ONE * 1.55, deg_to_rad(-8.0))
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "building-skyscraper-a.glb", "Backlot_Skyscraper_A", Vector3(-15.5, 0.05, -15.7), Vector3.ONE * 1.35, deg_to_rad(12.0))
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "building-skyscraper-b.glb", "Backlot_Skyscraper_B", Vector3(15.5, 0.05, -15.8), Vector3.ONE * 1.35, deg_to_rad(-12.0))
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "low-detail-building-a.glb", "Store_FreeAsset", Vector3(-11.0, 0.05, 3.0), Vector3.ONE * 2.4, 0.0)
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "low-detail-building-b.glb", "Studio_FreeAsset", Vector3(11.0, 0.05, 3.0), Vector3.ONE * 2.2, 0.0)
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "low-detail-building-wide-a.glb", "Station_FreeAsset", Vector3(11.0, 0.05, -8.2), Vector3.ONE * 2.2, 0.0)
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "low-detail-building-wide-b.glb", "Park_FreeAsset", Vector3(-11.0, 0.05, -8.2), Vector3.ONE * 2.1, 0.0)
	_spawn_asset_at_anchor(building_root, KENNEY_COMMERCIAL + "detail-awning-wide.glb", "Store_Awning", anchors, "Store.front_door", generation_failures, Vector3(0, 1.4, 0.2), Vector3.ONE * 1.5, 0.0)
	_spawn_asset_at_anchor(building_root, KENNEY_COMMERCIAL + "detail-awning.glb", "Station_Awning", anchors, "Station.front_door", generation_failures, Vector3(0, 1.4, 0.2), Vector3.ONE * 1.5, 0.0)
	_spawn_asset_at_anchor(building_root, KENNEY_COMMERCIAL + "detail-overhang-wide.glb", "Studio_Overhang", anchors, "Studio.front_door", generation_failures, Vector3(0, 1.35, 0.2), Vector3.ONE * 1.5, 0.0)
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "detail-parasol-a.glb", "Park_Parasol", Vector3(-9.2, 0.05, -12.4), Vector3.ONE * 1.2, deg_to_rad(25.0))
	_spawn_asset(building_root, KENNEY_COMMERCIAL + "detail-parasol-b.glb", "Park_Parasol_B", Vector3(-12.7, 0.05, -13.1), Vector3.ONE * 1.15, deg_to_rad(-18.0))

	var suburban_root := _node3d("Kenney_SuburbanSet", parent)
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "tree-large.glb", "Park_Tree_Large_A", Vector3(-15.0, 0.05, -10.2), Vector3.ONE * 1.25, deg_to_rad(12.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "tree-large.glb", "Park_Tree_Large_B", Vector3(-7.5, 0.05, -14.7), Vector3.ONE * 1.12, deg_to_rad(-18.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "tree-small.glb", "Park_Tree_Small_A", Vector3(-13.4, 0.05, -15.0), Vector3.ONE * 1.1, deg_to_rad(32.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "tree-small.glb", "Park_Tree_Small_B", Vector3(-8.1, 0.05, -9.1), Vector3.ONE * 1.05, deg_to_rad(-24.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "fence-1x4.glb", "Park_Fence_Back_A", Vector3(-13.8, 0.05, -15.65), Vector3.ONE * 1.0, deg_to_rad(90.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "fence-1x4.glb", "Park_Fence_Back_B", Vector3(-8.4, 0.05, -15.65), Vector3.ONE * 1.0, deg_to_rad(90.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "fence-low.glb", "Park_Fence_Gate_Left", Vector3(-13.6, 0.05, -8.0), Vector3.ONE * 1.0, deg_to_rad(90.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "fence-low.glb", "Park_Fence_Gate_Right", Vector3(-8.4, 0.05, -8.0), Vector3.ONE * 1.0, deg_to_rad(90.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "path-stones-long.glb", "Park_Stones_Approach", Vector3(-11.0, 0.055, -9.7), Vector3.ONE * 1.2, 0.0)
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "path-stones-messy.glb", "Park_Stones_PhotoSpot", Vector3(-9.1, 0.055, -12.2), Vector3.ONE * 1.0, deg_to_rad(18.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "driveway-short.glb", "Store_Service_Slab", Vector3(-11.0, 0.055, 4.9), Vector3.ONE * 1.3, 0.0)
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "driveway-short.glb", "Studio_Service_Slab", Vector3(11.0, 0.055, 4.9), Vector3.ONE * 1.3, 0.0)
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Store_Planter_Left", Vector3(-12.4, 0.05, 3.55), Vector3.ONE * 0.9, deg_to_rad(12.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Store_Planter_Right", Vector3(-9.6, 0.05, 3.55), Vector3.ONE * 0.9, deg_to_rad(-12.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Studio_Planter_Left", Vector3(9.6, 0.05, 3.55), Vector3.ONE * 0.9, deg_to_rad(12.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Studio_Planter_Right", Vector3(12.4, 0.05, 3.55), Vector3.ONE * 0.9, deg_to_rad(-12.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Station_Planter_Left", Vector3(9.4, 0.05, -8.0), Vector3.ONE * 0.9, deg_to_rad(90.0))
	_spawn_asset(suburban_root, KENNEY_SUBURBAN + "planter.glb", "Station_Planter_Right", Vector3(12.6, 0.05, -8.0), Vector3.ONE * 0.9, deg_to_rad(-90.0))

	_create_anchor_set_dressing(parent, anchors, generation_failures)
	_create_route_visual_cues(parent, anchors, generation_failures)
	_create_zone_visual_cues(parent, anchors, generation_failures)

static func _create_anchor_set_dressing(parent: Node3D, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var root := _node3d("Procedural_AnchorSetDressing", parent)
	var anchor_specs := [
		{
			"landmark": "Store",
			"door": "Store.front_door",
			"work": "Store.counter",
			"board": "Store.label_board",
			"color": Color(0.26, 0.58, 0.92, 1.0)
		},
		{
			"landmark": "Studio",
			"door": "Studio.front_door",
			"work": "Studio.approval_desk",
			"board": "Studio.criteria_wall",
			"color": Color(0.72, 0.50, 0.86, 1.0)
		},
		{
			"landmark": "Park",
			"door": "Park.gate",
			"work": "Park.photo_spot",
			"board": "Park.notice_board",
			"color": Color(0.34, 0.78, 0.48, 1.0)
		},
		{
			"landmark": "Station",
			"door": "Station.front_door",
			"work": "Station.report_desk",
			"board": "Station.intake_board",
			"color": Color(0.92, 0.78, 0.35, 1.0)
		}
	]
	for spec in anchor_specs:
		var landmark_id := str(spec["landmark"])
		var color := spec["color"] as Color
		var door_result := _resolve_anchor(anchors, str(spec["door"]), generation_failures)
		var work_result := _resolve_anchor(anchors, str(spec["work"]), generation_failures)
		var board_result := _resolve_anchor(anchors, str(spec["board"]), generation_failures)
		if not door_result["ok"] or not work_result["ok"] or not board_result["ok"]:
			continue
		var door: Vector3 = door_result["position"]
		var work: Vector3 = work_result["position"]
		var board: Vector3 = board_result["position"]
		_spawn_procedural_box(root, "%s_ThresholdCue" % landmark_id, door + Vector3(0, 0.035, 0.48), Vector3(1.8, 0.07, 0.16), color, 0.0)
		_spawn_procedural_cylinder(root, "%s_WorkAnchorDisc" % landmark_id, work + Vector3(0, 0.035, 0), 0.72, 0.05, Color(color.r, color.g, color.b, 0.42))
		_spawn_procedural_box(root, "%s_BoardSightline" % landmark_id, board + Vector3(0, -1.05, 0.0), Vector3(1.15, 0.08, 0.12), Color(0.98, 0.96, 0.68, 1.0), 0.0)
		_spawn_light_pool(root, "%s_PublicLightPool" % landmark_id, door + Vector3(0, 0.025, -0.75), 1.85, Color(1.0, 0.78, 0.42, 0.34))
		_spawn_asset(root, KENNEY_ROADS + "sign-highway.glb", "%s_ProcedureSign" % landmark_id, door + Vector3(-1.25, 0.05, -0.3), Vector3.ONE * 0.62, deg_to_rad(180.0))
		_spawn_asset(root, KENNEY_ROADS + "construction-cone.glb", "%s_WitnessMarker_A" % landmark_id, work + Vector3(-0.8, 0.05, 0.55), Vector3.ONE * 0.72, 0.0)
		_spawn_asset(root, KENNEY_ROADS + "construction-cone.glb", "%s_WitnessMarker_B" % landmark_id, work + Vector3(0.8, 0.05, 0.55), Vector3.ONE * 0.72, 0.0)

static func _create_route_visual_cues(parent: Node3D, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var root := _node3d("Procedural_RouteCues", parent)
	var routes := [
		{
			"id": "CivicLoop",
			"anchors": ["Station.front_door", "Store.front_door", "Park.gate", "Studio.front_door", "Station.front_door"],
			"color": Color(0.98, 0.95, 0.58, 1.0)
		},
		{
			"id": "StoreQueue",
			"anchors": ["Store.queue_start", "Store.counter", "Store.label_board"],
			"color": Color(0.42, 0.76, 1.0, 1.0)
		},
		{
			"id": "StationIntake",
			"anchors": ["Station.waiting_line", "Station.report_desk", "Station.intake_board"],
			"color": Color(1.0, 0.72, 0.34, 1.0)
		}
	]
	for route in routes:
		var route_id := str(route["id"])
		var route_anchors := route["anchors"] as Array
		var color := route["color"] as Color
		for index in range(route_anchors.size()):
			var cue_result := _resolve_anchor(anchors, str(route_anchors[index]), generation_failures)
			if not cue_result["ok"]:
				continue
			var cue_position: Vector3 = cue_result["position"]
			_spawn_route_step(root, "%s_RouteCue_%02d" % [route_id, index], cue_position + Vector3(0, 0.055, 0), color)
		for index in range(route_anchors.size() - 1):
			var from_result := _resolve_anchor(anchors, str(route_anchors[index]), generation_failures)
			var to_result := _resolve_anchor(anchors, str(route_anchors[index + 1]), generation_failures)
			if not from_result["ok"] or not to_result["ok"]:
				continue
			var from_position: Vector3 = from_result["position"]
			var to_position: Vector3 = to_result["position"]
			var segment := to_position - from_position
			var middle := from_position + segment * 0.5 + Vector3(0, 0.045, 0)
			var length: float = minf(segment.length() * 0.55, 3.2)
			_spawn_procedural_box(root, "%s_PathStripe_%02d" % [route_id, index], middle, Vector3(0.16, 0.055, length), Color(color.r, color.g, color.b, 0.58), atan2(segment.x, segment.z))

static func _create_zone_visual_cues(parent: Node3D, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var root := _node3d("Procedural_ZoneCues", parent)
	var zones := [
		{"id": "StoreCounterZone", "anchor": "Store.counter", "radius": 2.1, "color": Color(0.22, 0.78, 1.0, 0.32)},
		{"id": "StudioApprovalZone", "anchor": "Studio.approval_desk", "radius": 2.2, "color": Color(0.82, 0.52, 1.0, 0.32)},
		{"id": "ParkObservationZone", "anchor": "Park.photo_spot", "radius": 2.4, "color": Color(0.38, 0.92, 0.54, 0.30)},
		{"id": "StationIntakeZone", "anchor": "Station.report_desk", "radius": 2.0, "color": Color(1.0, 0.78, 0.32, 0.34)}
	]
	for zone in zones:
		var zone_id := str(zone["id"])
		var color := zone["color"] as Color
		var radius := float(zone["radius"])
		var center_result := _resolve_anchor(anchors, str(zone["anchor"]), generation_failures)
		if not center_result["ok"]:
			continue
		var center: Vector3 = center_result["position"]
		_spawn_procedural_cylinder(root, "%s_OuterLightPool" % zone_id, center + Vector3(0, 0.025, 0), radius + 0.55, 0.035, color)
		_spawn_procedural_box(root, "%s_NorthTick" % zone_id, center + Vector3(0, 0.075, -radius), Vector3(0.22, 0.08, 0.72), Color(color.r, color.g, color.b, 0.95), 0.0)
		_spawn_procedural_box(root, "%s_EastTick" % zone_id, center + Vector3(radius, 0.075, 0), Vector3(0.22, 0.08, 0.72), Color(color.r, color.g, color.b, 0.95), deg_to_rad(90.0))
		_spawn_procedural_box(root, "%s_SouthTick" % zone_id, center + Vector3(0, 0.075, radius), Vector3(0.22, 0.08, 0.72), Color(color.r, color.g, color.b, 0.95), 0.0)
		_spawn_procedural_box(root, "%s_WestTick" % zone_id, center + Vector3(-radius, 0.075, 0), Vector3(0.22, 0.08, 0.72), Color(color.r, color.g, color.b, 0.95), deg_to_rad(90.0))

static func _spawn_procedural_box(
	parent: Node3D,
	node_name: String,
	position: Vector3,
	size: Vector3,
	color: Color,
	yaw_radians: float
) -> MeshInstance3D:
	var marker := MeshInstance3D.new()
	marker.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = size
	marker.mesh = mesh
	marker.position = position
	marker.rotation.y = yaw_radians
	marker.material_override = _material("%sMaterial" % node_name, color)
	marker.add_to_group("free_visual_assets")
	parent.add_child(marker)
	return marker

static func _spawn_procedural_cylinder(
	parent: Node3D,
	node_name: String,
	position: Vector3,
	radius: float,
	height: float,
	color: Color
) -> MeshInstance3D:
	var marker := MeshInstance3D.new()
	marker.name = node_name
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	marker.mesh = mesh
	marker.position = position
	marker.material_override = _material("%sMaterial" % node_name, color)
	marker.add_to_group("free_visual_assets")
	parent.add_child(marker)
	return marker

static func _spawn_light_pool(parent: Node3D, node_name: String, position: Vector3, radius: float, color: Color) -> Node3D:
	var pool := _spawn_procedural_cylinder(parent, node_name, position, radius, 0.035, color)
	var light := OmniLight3D.new()
	light.name = "%s_Light" % node_name
	light.light_color = Color(1.0, 0.78, 0.42, 1.0)
	light.light_energy = 0.82
	light.omni_range = radius * 2.2
	light.position = Vector3(0, 1.45, 0)
	pool.add_child(light)
	return pool

static func _spawn_route_step(parent: Node3D, node_name: String, position: Vector3, color: Color) -> void:
	_spawn_procedural_box(parent, "%s_Base" % node_name, position, Vector3(0.72, 0.07, 0.72), Color(color.r, color.g, color.b, 0.36), deg_to_rad(45.0))
	_spawn_procedural_box(parent, "%s_Line" % node_name, position + Vector3(0, 0.055, 0), Vector3(0.12, 0.055, 0.62), color, 0.0)

static func _spawn_asset(
	parent: Node3D,
	scene_path: String,
	node_name: String,
	position: Vector3,
	scale_value: Vector3,
	yaw_radians: float
) -> Node3D:
	var packed := load(scene_path) as PackedScene
	if packed == null:
		push_warning("Optional free asset failed to load: %s" % scene_path)
		return null

	var instance := packed.instantiate() as Node3D
	if instance == null:
		push_warning("Optional free asset is not Node3D: %s" % scene_path)
		return null
	instance.name = node_name
	instance.position = position
	instance.scale = scale_value
	instance.rotation.y = yaw_radians
	instance.add_to_group("free_visual_assets")
	parent.add_child(instance)
	if node_name.begins_with("StreetLight"):
		_add_warm_point_light(instance)
	return instance

static func _spawn_asset_at_anchor(
	parent: Node3D,
	scene_path: String,
	node_name: String,
	anchors: Dictionary,
	anchor_key: String,
	generation_failures: Array[String],
	offset: Vector3,
	scale_value: Vector3,
	yaw_radians: float
) -> Node3D:
	var anchor_result := _resolve_anchor(anchors, anchor_key, generation_failures)
	if not anchor_result["ok"]:
		return null
	return _spawn_asset(parent, scene_path, node_name, anchor_result["position"] + offset, scale_value, yaw_radians)

static func _add_warm_point_light(parent: Node3D) -> void:
	var light := OmniLight3D.new()
	light.name = "WarmPoolLight"
	light.light_color = Color(1.0, 0.82, 0.42, 1.0)
	light.light_energy = 1.45
	light.omni_range = 5.5
	light.position = Vector3(0, 3.6, 0)
	parent.add_child(light)

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
	mesh.material_override = _material("%sFootprintMaterial" % landmark_id, Color(color.r, color.g, color.b, 0.24))
	body.add_child(mesh)

	var door := MeshInstance3D.new()
	door.name = "DoorCue_%s" % _safe_name(landmark_id)
	var door_mesh := BoxMesh.new()
	door_mesh.size = Vector3(min(size.x * 0.34, 2.2), min(size.y * 0.7, 2.2), 0.12)
	door.mesh = door_mesh
	door.position = Vector3(0, -size.y * 0.18, size.z * 0.51)
	door.material_override = _material("%sDoorMaterial" % landmark_id, Color(0.03, 0.035, 0.04, 1.0))
	body.add_child(door)

	var roof_strip := MeshInstance3D.new()
	roof_strip.name = "HeaderCue_%s" % _safe_name(landmark_id)
	var strip_mesh := BoxMesh.new()
	strip_mesh.size = Vector3(size.x * 1.04, 0.18, 0.18)
	roof_strip.mesh = strip_mesh
	roof_strip.position = Vector3(0, size.y * 0.47, size.z * 0.52)
	roof_strip.material_override = _material("%sHeaderMaterial" % landmark_id, Color(0.98, 0.92, 0.42, 1.0))
	body.add_child(roof_strip)

	var label := Label3D.new()
	label.name = "Label_%s" % _safe_name(landmark_id)
	var label_args := {
		"line1Key": "landmark.%s.label" % landmark_id,
		"line2Key": "landmark.%s.hint" % landmark_id
	}
	label.text = _localized(
		"label.two_lines",
		"%s\n%s" % [str(landmark.get("label", landmark_id)), str(landmark.get("hint", "procedure zone"))],
		label_args
	)
	label.add_to_group("localized_meta_text")
	label.set_meta("translation_key", "label.two_lines")
	label.set_meta("translation_args", label_args)
	label.set_meta("translation_fallback", label.text)
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
	var route_points: Array[Vector3] = []
	for point_key in points:
		var point_result := _resolve_anchor(anchors, str(point_key), generation_failures)
		if not point_result["ok"]:
			return
		route_points.append(point_result["position"] + Vector3(0, 0.08, 0))

	var path := Path3D.new()
	path.name = "Route_%s" % _safe_name(route_id)
	path.add_to_group("routes")
	path.set_meta("route_id", route_id)
	path.set_meta("label", str(route.get("label", route_id)))
	parent.add_child(path)

	var curve := Curve3D.new()
	for point in route_points:
		curve.add_point(point)
	path.curve = curve

	for index in range(route_points.size()):
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
	var anchor_result := _resolve_anchor(anchors, str(zone.get("anchor", "")), generation_failures)
	if not anchor_result["ok"]:
		return
	var area := Area3D.new()
	area.name = "Zone_%s" % _safe_name(zone_id)
	area.position = anchor_result["position"] + Vector3(0, 0.04, 0)
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

	var label := Label3D.new()
	label.name = "ZoneLabel_%s" % _safe_name(zone_id)
	var label_args := {"coverTest": str(zone.get("cover_test_id", ""))}
	label.text = _localized("zone.cover_test", "COVER TEST\n%s" % str(zone.get("cover_test_id", "")), label_args)
	label.add_to_group("localized_meta_text")
	label.set_meta("translation_key", "zone.cover_test")
	label.set_meta("translation_args", label_args)
	label.set_meta("translation_fallback", label.text)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 24
	label.outline_size = 6
	label.position = Vector3(0, 1.25, 0)
	area.add_child(label)

static func _create_text_surface(parent: Node3D, surface: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var anchor_result := _resolve_anchor(anchors, str(surface.get("anchor", "")), generation_failures)
	if not anchor_result["ok"]:
		return
	var text_surface := TEXT_SURFACE_SCENE.instantiate()
	text_surface.position = anchor_result["position"]
	text_surface.add_to_group("generated_text_surfaces")
	if text_surface.has_method("configure"):
		text_surface.configure(surface)
	parent.add_child(text_surface)

static func _create_actor(actors_root: Node3D, actor: Dictionary, anchors: Dictionary, generation_failures: Array[String]) -> void:
	var anchor_result := _resolve_anchor(anchors, str(actor.get("spawn_anchor", "")), generation_failures)
	if not anchor_result["ok"]:
		return
	var npc := NPC_SCENE.instantiate()
	npc.position = anchor_result["position"]
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

static func _resolve_anchor(anchors: Dictionary, anchor_key: String, generation_failures: Array[String]) -> Dictionary:
	if anchors.has(anchor_key):
		return {"ok": true, "position": anchors[anchor_key]}
	var failure := "Missing anchor in generated world: %s" % anchor_key
	push_error(failure)
	if not generation_failures.has(failure):
		generation_failures.append(failure)
	return {"ok": false, "position": Vector3.ZERO}

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

static func _localized(key: String, fallback: String, args: Dictionary = {}) -> String:
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key:
		translated = fallback
	return translated.format(_resolve_translation_args(args))

static func _resolve_translation_args(args: Dictionary) -> Dictionary:
	var resolved := {}
	for key in args.keys():
		var key_name := str(key)
		if key_name.ends_with("Key"):
			var resolved_name := key_name.substr(0, key_name.length() - 3)
			resolved[resolved_name] = str(TranslationServer.translate(StringName(str(args[key]))))
		else:
			resolved[key_name] = args[key]
	return resolved

static func _safe_name(value: Variant) -> String:
	return str(value) \
		.replace(" ", "_") \
		.replace(".", "_") \
		.replace("-", "_") \
		.replace("/", "_") \
		.replace(":", "_")
