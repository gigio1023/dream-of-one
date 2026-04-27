class_name ShellInspector
extends RefCounted

const ShellSchema := preload("res://scripts/data/shell_schema.gd")

static func inspect(root: Node) -> Dictionary:
	var tree := root.get_tree()
	var landmark_ids := _metadata_values(tree.get_nodes_in_group("landmarks"), "landmark_id")
	var text_surface_ids := _metadata_values(tree.get_nodes_in_group("text_surfaces"), "surface_id")
	var npc_ids := _metadata_values(tree.get_nodes_in_group("npc_placeholders"), "npc_id")
	var route_ids := _metadata_values(tree.get_nodes_in_group("routes"), "route_id")
	var zone_ids := _metadata_values(tree.get_nodes_in_group("interaction_zones"), "zone_id")
	var player_nodes := tree.get_nodes_in_group("player")
	var camera := root.find_child("Camera3D", true, false)

	var failures: Array[String] = []
	var generation_failures: Array = root.get_meta("generation_failures", [])
	for missing_landmark in ShellSchema.missing_values(ShellSchema.REQUIRED_LANDMARKS, landmark_ids):
		failures.append("Missing landmark: %s" % missing_landmark)
	for missing_surface in ShellSchema.missing_values(ShellSchema.REQUIRED_TEXT_SURFACES, text_surface_ids):
		failures.append("Missing TextSurface equivalent: %s" % missing_surface)
	for generation_failure in generation_failures:
		failures.append(str(generation_failure))

	var group_counts := {
		"landmarks": landmark_ids.size(),
		"text_surfaces": text_surface_ids.size(),
		"npc_placeholders": npc_ids.size(),
		"routes": route_ids.size(),
		"interaction_zones": zone_ids.size()
	}
	for group_name in ShellSchema.REQUIRED_GROUP_COUNTS.keys():
		var actual_count := int(group_counts.get(group_name, 0))
		var required_count := int(ShellSchema.REQUIRED_GROUP_COUNTS[group_name])
		if actual_count < required_count:
			failures.append(
				"Group %s count %d is below required %d" % [group_name, actual_count, required_count]
			)

	if player_nodes.is_empty():
		failures.append("Missing player node")
	if camera == null:
		failures.append("Missing Camera3D")
	if str(root.get_meta("world_revision", "")).is_empty():
		failures.append("Missing world_revision metadata")

	return {
		"ok": failures.is_empty(),
		"failures": failures,
		"world_id": root.get_meta("world_id", ""),
		"world_revision": root.get_meta("world_revision", ""),
		"runtime_path": root.get_meta("runtime_path", ""),
		"landmark_ids": landmark_ids,
		"text_surface_ids": text_surface_ids,
		"npc_ids": npc_ids,
		"route_ids": route_ids,
		"zone_ids": zone_ids,
		"group_counts": group_counts,
		"generation_failures": generation_failures,
		"has_player": not player_nodes.is_empty(),
		"has_camera": camera != null
	}

static func _metadata_values(nodes: Array[Node], key: StringName) -> Array[String]:
	var values: Array[String] = []
	for node in nodes:
		values.append(str(node.get_meta(key, "")))
	values.sort()
	return values
