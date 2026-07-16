extends SceneTree

## Rebuilds the committed town NavigationMesh from authored static collision.

const TOWN_SCENE := "res://scenes/town/town_3d.tscn"
const OUTPUT_PATH := "res://assets/greybox/town_navigation.tres"


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed := load(TOWN_SCENE) as PackedScene
	if packed == null:
		push_error("Could not load town scene: %s" % TOWN_SCENE)
		quit(1)
		return

	var town := packed.instantiate()
	root.add_child(town)
	await process_frame

	var region := town.get_node_or_null("Navigation/TownNavigation") as NavigationRegion3D
	if region == null or region.navigation_mesh == null:
		push_error("Town navigation region or NavigationMesh is missing.")
		quit(1)
		return

	var navigation_mesh := region.navigation_mesh.duplicate(true) as NavigationMesh
	# Keep roof collision out of the source volume so ceilings cannot become
	# disconnected walkable islands above the single-story interiors.
	navigation_mesh.filter_baking_aabb = AABB(
		Vector3(-23.0, -0.5, -21.0),
		Vector3(46.0, 3.5, 42.0)
	)
	var source_geometry := NavigationMeshSourceGeometryData3D.new()
	NavigationServer3D.parse_source_geometry_data(navigation_mesh, source_geometry, town)
	NavigationServer3D.bake_from_source_geometry_data(navigation_mesh, source_geometry)
	if navigation_mesh.get_polygon_count() == 0:
		push_error("Town navigation bake produced no polygons.")
		quit(1)
		return

	var save_error := ResourceSaver.save(navigation_mesh, OUTPUT_PATH)
	if save_error != OK:
		push_error("Could not save town NavigationMesh: %s" % error_string(save_error))
		quit(1)
		return

	print(
		"PASS bake_town_navigation: %d vertices, %d polygons -> %s"
		% [
			navigation_mesh.get_vertices().size(),
			navigation_mesh.get_polygon_count(),
			OUTPUT_PATH,
		]
	)
	quit(0)
