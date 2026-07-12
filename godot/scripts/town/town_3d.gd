class_name Town3D
extends Node3D

## Scene-owned binding between the authored town and world_layout.json.
##
## The scene owns presentation and collision. The JSON remains the semantic
## source consumed by the runtime, so this node only validates correspondence
## and exposes presentation snapshots; it never invents social state.

@export_file("*.json") var layout_path := "res://data/world_layout.json"
@export var player_path: NodePath = ^"Actors/Player3D"

var _layout: Dictionary = {}
var _binding_errors: PackedStringArray = []


func _ready() -> void:
	add_to_group(&"town_3d")
	_layout = _load_layout()
	_binding_errors = _validate_bindings()
	for message in _binding_errors:
		push_error(message)


func presentation_snapshot() -> Dictionary:
	return {
		"locationId": current_location_id(),
		"worldRevision": _layout.get("world_revision", ""),
		"layoutId": _layout.get("world_id", ""),
		"bindingErrors": Array(_binding_errors),
	}


func current_location_id() -> String:
	var player := get_node_or_null(player_path) as Node3D
	if player == null:
		return ""
	for zone_value in _layout.get("zones", []):
		if not zone_value is Dictionary:
			continue
		var zone := zone_value as Dictionary
		if _point_in_zone(player.global_position, zone):
			return str(zone.get("landmark", zone.get("id", "")))
	return ""


func binding_errors() -> PackedStringArray:
	return _binding_errors.duplicate()


func layout_snapshot() -> Dictionary:
	return _layout.duplicate(true)


func anchor_position(anchor_ref: String) -> Variant:
	var marker_name := anchor_ref.replace(".", "__")
	var marker := get_node_or_null("Markers/Anchors/%s" % marker_name) as Node3D
	if marker == null:
		return null
	return marker.global_position


func navigation_position(anchor_ref: String) -> Variant:
	var anchor_value: Variant = anchor_position(anchor_ref)
	if not anchor_value is Vector3:
		return null
	var region := get_node_or_null("Navigation/TownNavigation") as NavigationRegion3D
	if region == null:
		return null
	var navigation_map := region.get_navigation_map()
	if (
		not navigation_map.is_valid()
		or NavigationServer3D.map_get_iteration_id(navigation_map) <= 0
	):
		return null
	return NavigationServer3D.map_get_closest_point(navigation_map, anchor_value as Vector3)


func player_speech_audibility(audibility: Dictionary) -> Dictionary:
	var player := get_node_or_null(player_path) as Node3D
	if player == null:
		return _speech_audibility_result(false, "player_missing")
	var volume_id := str(audibility.get("volumeId", ""))
	var volume := _layout_entry_by_id("audibility_volumes", volume_id)
	if volume.is_empty():
		return _speech_audibility_result(false, "volume_unknown", volume_id)
	var speaker_value: Variant = audibility.get("speakerPosition", [])
	if not speaker_value is Array or (speaker_value as Array).size() != 3:
		return _speech_audibility_result(false, "speaker_position_invalid", volume_id)
	var speaker_position := _vector3_from_array(speaker_value)
	var layout_max_distance := maxf(0.0, float(volume.get("max_speech_distance_m", 0.0)))
	var packet_max_distance := maxf(0.0, float(audibility.get(
		"maxSpeechDistanceM",
		layout_max_distance
	)))
	var max_distance := minf(layout_max_distance, packet_max_distance)
	var distance := player.global_position.distance_to(speaker_position)
	var player_in_volume := _point_in_zone(player.global_position, volume)
	var speaker_in_volume := _point_in_zone(speaker_position, volume)
	var audible := (
		max_distance > 0.0
		and player_in_volume
		and speaker_in_volume
		and distance <= max_distance
	)
	var reason := ""
	if not speaker_in_volume:
		reason = "speaker_outside_volume"
	elif not player_in_volume:
		reason = "player_outside_volume"
	elif max_distance <= 0.0:
		reason = "distance_unconfigured"
	elif distance > max_distance:
		reason = "player_outside_distance"
	return {
		"audible": audible,
		"reason": reason,
		"volumeId": volume_id,
		"distanceM": distance,
		"maxDistanceM": max_distance,
		"playerInVolume": player_in_volume,
		"speakerInVolume": speaker_in_volume,
		"speakerPosition": speaker_position,
	}


func nearest_anchor_position(point: Vector3) -> Vector3:
	var nearest := _vector3_from_array(
		(_layout.get("player_start", {}) as Dictionary).get("position", [])
	)
	var nearest_distance_squared := INF
	for anchor_ref_value in _layout.get("player_respawn_anchor_refs", []):
		var marker_name := str(anchor_ref_value).replace(".", "__")
		var marker := get_node_or_null("Markers/Anchors/%s" % marker_name) as Node3D
		if marker == null:
			continue
		var candidate := marker.global_position
		var delta := Vector2(candidate.x - point.x, candidate.z - point.z)
		var distance_squared := delta.length_squared()
		if distance_squared < nearest_distance_squared:
			nearest_distance_squared = distance_squared
			nearest = candidate
	return nearest


func _load_layout() -> Dictionary:
	var text := FileAccess.get_file_as_string(layout_path)
	if text.is_empty():
		push_error("Town3D could not read layout: %s" % layout_path)
		return {}
	var parsed: Variant = JSON.parse_string(text)
	if not parsed is Dictionary:
		push_error("Town3D layout root must be a Dictionary: %s" % layout_path)
		return {}
	return parsed as Dictionary


func _layout_entry_by_id(collection_key: String, entry_id: String) -> Dictionary:
	for entry_value in _layout.get(collection_key, []):
		if (
			entry_value is Dictionary
			and str((entry_value as Dictionary).get("id", "")) == entry_id
		):
			return (entry_value as Dictionary).duplicate(true)
	return {}


func _speech_audibility_result(
	audible: bool,
	reason: String,
	volume_id := ""
) -> Dictionary:
	return {
		"audible": audible,
		"reason": reason,
		"volumeId": volume_id,
		"distanceM": INF,
		"maxDistanceM": 0.0,
		"playerInVolume": false,
		"speakerInVolume": false,
	}


func _validate_bindings() -> PackedStringArray:
	var errors := PackedStringArray()
	if _layout.is_empty():
		errors.append("Town3D layout is unavailable.")
		return errors

	var expected_landmarks: Dictionary = {}
	var expected_anchors: Dictionary = {}
	var anchor_positions: Dictionary = {}
	for landmark_value in _layout.get("landmarks", []):
		if not landmark_value is Dictionary:
			continue
		var landmark := landmark_value as Dictionary
		var landmark_id := str(landmark.get("id", ""))
		expected_landmarks[landmark_id] = true
		var landmark_marker := get_node_or_null("Markers/Landmarks/%s" % landmark_id) as Node3D
		if landmark_marker == null:
			errors.append("Town3D missing landmark marker: %s" % landmark_id)
		elif not landmark_marker.position.is_equal_approx(_vector3_from_array(landmark.get("position", []))):
			errors.append("Town3D landmark marker position drifted: %s" % landmark_id)
		var anchors: Variant = landmark.get("anchors", {})
		if not anchors is Dictionary:
			continue
		for anchor_name in (anchors as Dictionary).keys():
			var anchor_ref := "%s.%s" % [landmark_id, str(anchor_name)]
			var marker_name := anchor_ref.replace(".", "__")
			expected_anchors[marker_name] = true
			anchor_positions[anchor_ref] = _vector3_from_array((anchors as Dictionary)[anchor_name])
			var anchor_marker := get_node_or_null("Markers/Anchors/%s" % marker_name) as Node3D
			if anchor_marker == null:
				errors.append("Town3D missing anchor marker: %s" % anchor_ref)
			elif not anchor_marker.position.is_equal_approx(
				_vector3_from_array((anchors as Dictionary)[anchor_name])
			):
				errors.append("Town3D anchor marker position drifted: %s" % anchor_ref)

	_validate_no_extra_markers("Markers/Landmarks", expected_landmarks, errors)
	_validate_no_extra_markers("Markers/Anchors", expected_anchors, errors)
	var respawn_anchor_refs: Variant = _layout.get("player_respawn_anchor_refs", [])
	if not respawn_anchor_refs is Array or (respawn_anchor_refs as Array).is_empty():
		errors.append("Town3D player respawn anchor list is missing.")
	else:
		for anchor_ref_value in respawn_anchor_refs as Array:
			var anchor_ref := str(anchor_ref_value)
			if not anchor_positions.has(anchor_ref):
				errors.append("Town3D player respawn anchor is unknown: %s" % anchor_ref)
			elif (anchor_positions[anchor_ref] as Vector3).y > 0.2:
				errors.append("Town3D player respawn anchor is not floor-level: %s" % anchor_ref)
	_validate_spatial_markers("zones", "Markers/Zones", errors)
	_validate_spatial_markers("sight_volumes", "Markers/SightVolumes", errors)
	_validate_spatial_markers("audibility_volumes", "Markers/AudibilityVolumes", errors)

	var player := get_node_or_null(player_path) as Node3D
	var player_start: Variant = _layout.get("player_start", {})
	if player == null:
		errors.append("Town3D player node is missing: %s" % player_path)
	elif player_start is Dictionary:
		var expected_player_position := _vector3_from_array(
			(player_start as Dictionary).get("position", [])
		)
		if not _positions_match(player.position, expected_player_position):
			errors.append("Town3D player start position drifted.")
		var expected_yaw := deg_to_rad(float((player_start as Dictionary).get("yaw_degrees", 0.0)))
		if not is_equal_approx(player.rotation.y, expected_yaw):
			errors.append("Town3D player start yaw drifted.")

	var physical_doors := get_node_or_null("Doors")
	if physical_doors != null and physical_doors.get_child_count() > 0:
		errors.append("Town3D must keep building portals permanently open and door-free.")
	for portal_value in _layout.get("open_portals", []):
		if not portal_value is Dictionary:
			continue
		var portal := portal_value as Dictionary
		var portal_id := str(portal.get("id", ""))
		var anchor_ref := str(portal.get("anchor", ""))
		if str(portal.get("kind", "")) != "permanently_open":
			errors.append("Town3D portal is not permanently open: %s" % portal_id)
		elif not anchor_positions.has(anchor_ref):
			errors.append("Town3D portal anchor is unknown: %s" % portal_id)
		elif not _positions_match(
			anchor_positions[anchor_ref] as Vector3,
			_vector3_from_array(portal.get("position", []))
		):
			errors.append("Town3D portal position drifted: %s" % portal_id)
		if float(portal.get("width", 0.0)) < 1.1:
			errors.append("Town3D portal is too narrow: %s" % portal_id)

	var expected_actors: Dictionary = {"Player3D": true}
	for actor_value in _layout.get("actors", []):
		if not actor_value is Dictionary:
			continue
		var actor_id := str((actor_value as Dictionary).get("id", ""))
		expected_actors[actor_id] = true
		var actor := get_node_or_null("Actors/%s" % actor_id)
		if actor == null:
			errors.append("Town3D missing actor instance: %s" % actor_id)
		elif str(actor.get("actor_id")) != actor_id:
			errors.append("Town3D actor semantic id drifted: %s" % actor_id)
		elif (
			str(actor.get("label_key")) != str((actor_value as Dictionary).get("label_key", ""))
			or str(actor.get("role_key")) != str((actor_value as Dictionary).get("role_key", ""))
		):
			errors.append("Town3D actor content keys drifted: %s" % actor_id)
		if actor != null:
			var spawn_anchor := str((actor_value as Dictionary).get("spawn_anchor", ""))
			if not anchor_positions.has(spawn_anchor):
				errors.append("Town3D actor spawn anchor is unknown: %s" % actor_id)
			elif not _positions_match(
				(actor as Node3D).position,
				anchor_positions[spawn_anchor] as Vector3,
				0.06
			):
				errors.append("Town3D actor spawn position drifted: %s" % actor_id)
	_validate_no_extra_markers("Actors", expected_actors, errors)

	return errors


func _validate_spatial_markers(
	layout_key: String,
	parent_path_value: NodePath,
	errors: PackedStringArray
) -> void:
	var expected: Dictionary = {}
	for entry_value in _layout.get(layout_key, []):
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		var entry_id := str(entry.get("id", ""))
		expected[entry_id] = true
		var marker := get_node_or_null("%s/%s" % [parent_path_value, entry_id]) as Node3D
		if marker == null:
			errors.append("Town3D missing %s marker: %s" % [layout_key, entry_id])
			continue
		var expected_position := _entry_marker_position(entry)
		if not _positions_match(marker.position, expected_position):
			errors.append("Town3D %s marker position drifted: %s" % [layout_key, entry_id])
	_validate_no_extra_markers(parent_path_value, expected, errors)


func _entry_marker_position(entry: Dictionary) -> Vector3:
	if entry.has("center"):
		return _vector3_from_array(entry.get("center", []))
	var volumes: Variant = entry.get("volumes", [])
	if volumes is Array and not (volumes as Array).is_empty():
		var first_volume: Variant = (volumes as Array)[0]
		if first_volume is Dictionary:
			return _vector3_from_array((first_volume as Dictionary).get("center", []))
	return Vector3.ZERO


func _validate_no_extra_markers(
	parent_path_value: NodePath,
	expected: Dictionary,
	errors: PackedStringArray
) -> void:
	var parent := get_node_or_null(parent_path_value)
	if parent == null:
		errors.append("Town3D binding parent is missing: %s" % parent_path_value)
		return
	for child in parent.get_children():
		if child is Node and not expected.has(str((child as Node).name)):
			errors.append(
				"Town3D scene node has no layout entry: %s/%s"
				% [parent_path_value, (child as Node).name]
			)


func _point_in_zone(point: Vector3, zone: Dictionary) -> bool:
	match str(zone.get("shape", "")):
		"box":
			return _point_in_box(point, zone.get("center", []), zone.get("size", []))
		"boxes":
			for volume_value in zone.get("volumes", []):
				if not volume_value is Dictionary:
					continue
				var volume := volume_value as Dictionary
				if _point_in_box(point, volume.get("center", []), volume.get("size", [])):
					return true
	return false


func _point_in_box(point: Vector3, center_value: Variant, size_value: Variant) -> bool:
	if not center_value is Array or not size_value is Array:
		return false
	var center_array := center_value as Array
	var size_array := size_value as Array
	if center_array.size() != 3 or size_array.size() != 3:
		return false
	var center := _vector3_from_array(center_array)
	var half_size := Vector3(
		float(size_array[0]),
		float(size_array[1]),
		float(size_array[2])
	) * 0.5
	var local := point - center
	return (
		absf(local.x) <= half_size.x
		and absf(local.y) <= half_size.y
		and absf(local.z) <= half_size.z
	)


func _vector3_from_array(value: Variant) -> Vector3:
	if not value is Array or (value as Array).size() != 3:
		return Vector3.ZERO
	var array := value as Array
	return Vector3(float(array[0]), float(array[1]), float(array[2]))


func _positions_match(actual: Vector3, expected: Vector3, tolerance := 0.01) -> bool:
	return actual.distance_to(expected) <= tolerance
