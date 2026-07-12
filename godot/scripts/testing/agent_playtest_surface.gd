class_name AgentPlaytestSurface
extends Node
## Debug-only, read-only semantic view for Godot AI play inspection.
##
## The owning 3D main scene supplies presentation state. This adapter never
## contacts the runtime, handles input, polls, or mutates game state. It keeps
## the Godot client authority boundary intact by returning only state that is
## already exposed by scene presentation nodes.

const SCHEMA_VERSION := 1
const PRESENTATION_METHOD := &"presentation_snapshot"
const TARGET_GROUPS := [&"interactables", &"npc_actors", &"spatial_props", &"semantic_targets"]
const CAPABILITIES_PROPERTY := &"godot_ai_capabilities"
const SNAPSHOT_PROPERTY := &"godot_ai_snapshot"
const TARGETS_PROPERTY := &"godot_ai_semantic_targets"

@export var world_path: NodePath = ^"../Town"
@export var player_path: NodePath = ^"../Town/Actors/Player3D"
@export var hud_path: NodePath = ^"../HUD3D"


func _get_property_list() -> Array[Dictionary]:
	return [
		{
			"name": CAPABILITIES_PROPERTY,
			"type": TYPE_DICTIONARY,
			"usage": PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY,
		},
		{
			"name": SNAPSHOT_PROPERTY,
			"type": TYPE_DICTIONARY,
			"usage": PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY,
		},
		{
			"name": TARGETS_PROPERTY,
			"type": TYPE_ARRAY,
			"usage": PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY,
		},
	]


func _get(property: StringName) -> Variant:
	match property:
		CAPABILITIES_PROPERTY:
			return capabilities()
		SNAPSHOT_PROPERTY:
			return snapshot()
		TARGETS_PROPERTY:
			return semantic_targets()
	return null


func capabilities() -> Dictionary:
	var gate := _debug_gate()
	if not bool(gate["available"]):
		return {
			"available": false,
			"reason": gate["reason"],
			"schemaVersion": SCHEMA_VERSION,
			"debugOnly": true,
			"reads": {
				"snapshot": {"available": false, "reason": gate["reason"]},
				"semanticTargets": {"available": false, "reason": gate["reason"]},
			},
			"actions": [],
		}

	var world := get_node_or_null(world_path)
	var target_status := _node_status(world, world_path, "world_node_not_found")
	return {
		"available": true,
		"reason": "",
		"schemaVersion": SCHEMA_VERSION,
		"debugOnly": true,
		"reads": {
			"snapshot": {"available": true, "reason": ""},
			"semanticTargets": target_status,
		},
		"nativeProperties": {
			"capabilities": str(CAPABILITIES_PROPERTY),
			"snapshot": str(SNAPSHOT_PROPERTY),
			"semanticTargets": str(TARGETS_PROPERTY),
		},
		"actions": [],
	}


func snapshot() -> Dictionary:
	var gate := _debug_gate()
	if not bool(gate["available"]):
		return {
			"available": false,
			"reason": gate["reason"],
			"schemaVersion": SCHEMA_VERSION,
		}

	var main := get_parent()
	var world := get_node_or_null(world_path)
	var player := get_node_or_null(player_path)
	var hud := get_node_or_null(hud_path)
	var main_source := _presentation_source(main, "main_node_not_found")
	var world_source := _presentation_source(world, "world_node_not_found")
	var hud_source := _presentation_source(hud, "hud_node_not_found")
	var sources: Array[Dictionary] = [main_source, world_source, hud_source]
	var turn := _first_dictionary(sources, [&"currentTurn", &"activeTurn", &"turn"])
	var hud_view := _source_data(hud_source)

	return {
		"available": true,
		"reason": "",
		"schemaVersion": SCHEMA_VERSION,
		"availability": {
			"main": _source_status(main_source),
			"world": _source_status(world_source, world_path),
			"player": _node_status(player, player_path, "player_node_not_found"),
			"hud": _source_status(hud_source, hud_path),
		},
		"locationId": _first_value(sources, [&"locationId", &"location_id"], ""),
		"runId": _first_value(sources, [&"runId", &"run_id"], ""),
		"sessionMode": _first_value(sources, [&"sessionMode", &"session_mode"], ""),
		"worldRevision": _first_value(sources, [&"worldRevision", &"world_revision"], null),
		"runWorldRevision": _first_value(
			sources,
			[&"runWorldRevision", &"run_world_revision"],
			null
		),
		"worldClock": _first_value(sources, [&"worldClock", &"world_clock"], {}),
		"advance": _first_value(sources, [&"advance"], {}),
		"scheduler": _first_value(sources, [&"scheduler"], {}),
		"scheduleWakes": _first_value(
			sources,
			[&"scheduleWakes", &"schedule_wakes"],
			[]
		),
		"arrivals": _first_value(sources, [&"arrivals"], {}),
		"activeMovements": _first_value(
			sources,
			[&"activeMovements", &"active_movements"],
			[]
		),
		"blockedMovements": _first_value(
			sources,
			[&"blockedMovements", &"blocked_movements"],
			[]
		),
		"actors": _first_value(sources, [&"actors"], []),
		"providerBudget": _first_value(
			sources,
			[&"providerBudget", &"provider_budget"],
			{}
		),
		"player": _player_snapshot(player),
		"transitioning": _first_value(sources, [&"transitioning"], null),
		"resolvingAnswer": _first_value(sources, [&"resolvingAnswer", &"resolving_answer"], null),
		"modal": _modal_snapshot(hud_view),
		"conversation": _conversation_snapshot(sources, turn),
		"hud": _hud_snapshot(hud_view),
		"encounteredStances": _stance_summaries(
			_first_value(sources, [&"encounteredStances", &"encountered_stances"], [])
		),
		"institutionalPressure": _pressure_summary(
			_first_value(sources, [&"institutionalPressure", &"institutional_pressure"], {})
		),
		"provider": _provider_summary(
			_first_value(sources, [&"provider", &"providerProvenance", &"provider_provenance"], {})
		),
		"hearing": _not_implemented_result("hearing"),
		"outcome": _not_implemented_result("outcome"),
	}


func semantic_targets() -> Array[Dictionary]:
	var targets: Array[Dictionary] = []
	var gate := _debug_gate()
	if not bool(gate["available"]):
		return targets

	var world := get_node_or_null(world_path)
	if world == null:
		return targets

	var candidates: Array[Node] = []
	_collect_target_nodes(world, candidates)
	for candidate in candidates:
		if not candidate is Node3D:
			continue
		var spatial := candidate as Node3D
		if not spatial.is_visible_in_tree():
			continue
		targets.append(_target_snapshot(spatial))
	targets.sort_custom(_target_less)
	return targets


func _debug_gate() -> Dictionary:
	if not OS.is_debug_build():
		return {"available": false, "reason": "debug_build_required"}
	if not EngineDebugger.is_active():
		return {"available": false, "reason": "engine_debugger_inactive"}
	return {"available": true, "reason": ""}


func _presentation_source(node: Node, missing_reason: String) -> Dictionary:
	if node == null:
		return {"available": false, "reason": missing_reason, "data": {}}
	if not node.has_method(PRESENTATION_METHOD):
		return {"available": false, "reason": "presentation_snapshot_method_missing", "data": {}}
	var value: Variant = node.call(PRESENTATION_METHOD)
	if not value is Dictionary:
		return {"available": false, "reason": "presentation_snapshot_invalid", "data": {}}
	return {"available": true, "reason": "", "data": value}


func _source_data(source: Dictionary) -> Dictionary:
	var value: Variant = source.get("data", {})
	return value if value is Dictionary else {}


func _source_status(source: Dictionary, path := NodePath()) -> Dictionary:
	var status := {
		"available": bool(source.get("available", false)),
		"reason": str(source.get("reason", "")),
	}
	if not path.is_empty():
		status["path"] = str(path)
	return status


func _node_status(node: Node, path: NodePath, missing_reason: String) -> Dictionary:
	return {
		"available": node != null,
		"reason": "" if node != null else missing_reason,
		"path": str(path),
	}


func _first_value(sources: Array[Dictionary], keys: Array[StringName], fallback: Variant) -> Variant:
	for source in sources:
		if not bool(source.get("available", false)):
			continue
		var data := _source_data(source)
		for key in keys:
			if data.has(key):
				return _json_safe(data[key])
	return _json_safe(fallback)


func _first_dictionary(sources: Array[Dictionary], keys: Array[StringName]) -> Dictionary:
	var value: Variant = _first_value(sources, keys, {})
	return value if value is Dictionary else {}


func _player_snapshot(player: Node) -> Dictionary:
	if player == null:
		return {
			"available": false,
			"reason": "player_node_not_found",
			"exists": false,
		}
	if not player is Node3D:
		return {
			"available": false,
			"reason": "player_node_not_spatial",
			"exists": true,
		}

	var spatial := player as Node3D
	var facing_node := _find_facing_node(spatial)
	var facing := -facing_node.global_transform.basis.z.normalized()
	var input_state := _read_property(player, [&"input_enabled", &"control_enabled", &"_control_enabled"])
	var focus := _focus_snapshot(player)
	var input_enabled: Variant = null
	if bool(input_state["available"]):
		input_enabled = bool(input_state.get("value", false))
	return {
		"available": true,
		"reason": "",
		"exists": true,
		"worldPosition": _vector3_json(spatial.global_position),
		"facing": _vector3_json(facing),
		"inputEnabled": input_enabled,
		"inputAvailability": {
			"available": bool(input_state["available"]),
			"reason": str(input_state["reason"]),
		},
		"focus": focus,
	}


func _find_facing_node(player: Node3D) -> Node3D:
	var camera := player.find_child("Camera3D", true, false)
	return camera as Node3D if camera is Node3D else player


func _focus_snapshot(player: Node) -> Dictionary:
	if not player.has_method(&"focused_interactable"):
		return {
			"available": false,
			"reason": "focused_interactable_method_missing",
			"hasTarget": false,
		}
	var value: Variant = player.call(&"focused_interactable")
	if value == null:
		return {
			"available": true,
			"reason": "no_focused_interactable",
			"hasTarget": false,
		}
	if not value is Node:
		return {
			"available": false,
			"reason": "focused_interactable_invalid",
			"hasTarget": false,
		}
	var target := _target_snapshot(value as Node)
	return {
		"available": bool(target.get("available", false)),
		"reason": str(target.get("reason", "")),
		"hasTarget": true,
		"id": str(target.get("id", "")),
		"title": str(target.get("title", "")),
		"kind": str(target.get("kind", "unknown")),
	}


func _modal_snapshot(hud_view: Dictionary) -> Dictionary:
	var surface := str(_dictionary_value(hud_view, [&"modalSurface", &"modal_surface"], "unknown"))
	var available := surface in ["none", "conversation", "inspect", "settings", "outcome"]
	return {
		"available": available,
		"reason": "" if available else "modal_surface_unavailable",
		"surface": surface if available else "unknown",
	}


func _conversation_snapshot(sources: Array[Dictionary], turn: Dictionary) -> Dictionary:
	var choices_value: Variant = turn.get("choices", _first_value(sources, [&"visibleChoices", &"visible_choices"], []))
	return {
		"activeTurnId": _dictionary_value(turn, [&"turnId", &"turn_id"], ""),
		"beatId": _dictionary_value(turn, [&"beatId", &"beat_id", &"beat"], ""),
		"speakerId": _dictionary_value(turn, [&"speakerId", &"speaker_id", &"actorId", &"actor_id"], ""),
		"visibleChoices": _visible_choices(choices_value),
		"freeInputSupported": _dictionary_value(
			turn,
			[&"acceptsFreeInput", &"allowFreeInput", &"freeInputSupported", &"free_input_supported"],
			null
		),
	}


func _visible_choices(value: Variant) -> Array:
	var choices: Array = []
	if not value is Array:
		return choices
	for entry_value in value:
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		choices.append({
			"choiceId": _dictionary_value(entry, [&"choiceId", &"choice_id", &"id"], ""),
			"text": _dictionary_value(entry, [&"line", &"text", &"title"], ""),
		})
	return choices


func _hud_snapshot(hud_view: Dictionary) -> Dictionary:
	return {
		"available": not hud_view.is_empty(),
		"reason": "" if not hud_view.is_empty() else "hud_presentation_snapshot_unavailable",
		"busy": _dictionary_value(hud_view, [&"busy"], null),
		"thinking": _dictionary_value(hud_view, [&"thinking"], null),
		"hesitationTimerVisible": _dictionary_value(
			hud_view,
			[&"hesitationTimerVisible", &"hesitation_timer_visible"],
			null
		),
	}


func _stance_summaries(value: Variant) -> Array:
	var summaries: Array = []
	if not value is Array:
		return summaries
	for entry_value in value:
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		summaries.append({
			"actorId": _dictionary_value(entry, [&"actorId", &"actor_id"], ""),
			"title": _dictionary_value(entry, [&"title"], ""),
			"stance": _dictionary_value(entry, [&"stance"], ""),
			"summary": _dictionary_value(entry, [&"summary"], ""),
		})
	return summaries


func _pressure_summary(value: Variant) -> Dictionary:
	if not value is Dictionary or (value as Dictionary).is_empty():
		return {"available": false, "reason": "institutional_pressure_unavailable"}
	var source := value as Dictionary
	return {
		"available": true,
		"reason": "",
		"summary": _dictionary_value(source, [&"summary", &"label"], ""),
		"level": _dictionary_value(source, [&"level", &"value"], null),
	}


func _provider_summary(value: Variant) -> Dictionary:
	if not value is Dictionary or (value as Dictionary).is_empty():
		return {"available": false, "reason": "provider_provenance_unavailable"}
	var source := value as Dictionary
	return {
		"available": true,
		"reason": "",
		"profileId": _dictionary_value(source, [&"profileId", &"profile_id"], ""),
		"transport": _dictionary_value(source, [&"transport"], ""),
		"usedFallback": _dictionary_value(source, [&"usedFallback", &"used_fallback"], null),
		"fallbackReason": _dictionary_value(source, [&"fallbackReason", &"fallback_reason"], ""),
		"modelCallCount": _dictionary_value(source, [&"modelCallCount", &"model_call_count"], null),
	}


func _displayed_result(hud_view: Dictionary, keys: Array[StringName]) -> Dictionary:
	var value: Variant = _dictionary_value(hud_view, keys, null)
	if not value is Dictionary:
		return {
			"available": false,
			"reason": "%s_surface_unavailable" % str(keys[0]),
			"visible": null,
			"result": null,
		}
	var source := value as Dictionary
	return {
		"available": true,
		"reason": "",
		"visible": _dictionary_value(source, [&"visible"], false),
		"result": _displayed_result_payload(source),
	}


func _not_implemented_result(surface: String) -> Dictionary:
	return {
		"available": false,
		"reason": "not_implemented",
		"surface": surface,
		"visible": false,
		"result": null,
	}


func _displayed_result_payload(source: Dictionary) -> Dictionary:
	return {
		"route": _dictionary_value(source, [&"route"], ""),
		"title": _dictionary_value(source, [&"title"], ""),
		"body": _dictionary_value(source, [&"body", &"result", &"summary"], ""),
		"citedLedgerIds": _dictionary_value(source, [&"citedLedgerIds", &"cited_ledger_ids"], []),
	}


func _collect_target_nodes(root: Node, output: Array[Node]) -> void:
	for child in root.get_children():
		if child is Node:
			var candidate := child as Node
			if _is_semantic_target(candidate):
				output.append(candidate)
			_collect_target_nodes(candidate, output)


func _is_semantic_target(node: Node) -> bool:
	for group in TARGET_GROUPS:
		if node.is_in_group(group):
			return true
	return false


func _target_snapshot(node: Node) -> Dictionary:
	var id_state := _target_id(node)
	var title_state := _target_title(node)
	var kind := _target_kind(node)
	var result := {
		"available": bool(id_state["available"]),
		"reason": str(id_state["reason"]),
		"id": str(id_state["value"]),
		"title": str(title_state["title"]),
		"titleKey": str(title_state["titleKey"]),
		"titleAvailable": bool(title_state["available"]),
		"kind": kind,
		"visible": node is Node3D and (node as Node3D).is_visible_in_tree(),
		"interactable": node.is_in_group(&"interactables") and node.has_method(&"interact"),
	}
	if node is Node3D:
		result["worldPosition"] = _vector3_json((node as Node3D).global_position)
	return result


func _target_id(node: Node) -> Dictionary:
	for meta_name in [&"semantic_id", &"target_id"]:
		if node.has_meta(meta_name):
			var meta_id := str(node.get_meta(meta_name, ""))
			if not meta_id.is_empty():
				return {"available": true, "reason": "", "value": meta_id}
	for method in [&"get_semantic_id", &"get_interaction_id"]:
		if node.has_method(method):
			var method_id := str(node.call(method))
			if not method_id.is_empty():
				return {"available": true, "reason": "", "value": method_id}
	var property_state := _read_property(
		node,
		[&"actor_id", &"door_id", &"prop_id", &"record_id", &"landmark_id", &"zone_id"]
	)
	if bool(property_state["available"]):
		var property_id := str(property_state["value"])
		if not property_id.is_empty():
			return {"available": true, "reason": "", "value": property_id}
	return {"available": false, "reason": "semantic_id_unavailable", "value": ""}


func _target_title(node: Node) -> Dictionary:
	var title := ""
	var title_key := ""
	if node.has_method(&"get_interaction_title"):
		title = str(node.call(&"get_interaction_title"))
	if node.has_method(&"get_interaction_target_key"):
		title_key = str(node.call(&"get_interaction_target_key"))
	if title_key.is_empty():
		var key_state := _read_property(node, [&"title_key", &"label_key"])
		if bool(key_state["available"]):
			title_key = str(key_state["value"])
	if title.is_empty():
		var title_state := _read_property(node, [&"title", &"display_name"])
		if bool(title_state["available"]):
			title = str(title_state["value"])
	if title.is_empty() and not title_key.is_empty():
		title = tr(title_key)
	return {
		"available": not title.is_empty(),
		"title": title,
		"titleKey": title_key,
	}


func _target_kind(node: Node) -> String:
	if node.has_method(&"interaction_kind"):
		var value := str(node.call(&"interaction_kind"))
		if not value.is_empty():
			return value
	var state := _read_property(node, [&"semantic_kind", &"kind"])
	if bool(state["available"]) and not str(state["value"]).is_empty():
		return str(state["value"])
	if node.is_in_group(&"npc_actors"):
		return "npc"
	if node.is_in_group(&"spatial_props"):
		return "prop"
	return "unknown"


func _read_property(target: Object, names: Array[StringName]) -> Dictionary:
	var available_names: Dictionary = {}
	for property in target.get_property_list():
		if property is Dictionary:
			available_names[str((property as Dictionary).get("name", ""))] = true
	for property_name in names:
		if available_names.has(str(property_name)):
			return {
				"available": true,
				"reason": "",
				"value": _json_safe(target.get(property_name)),
			}
	return {"available": false, "reason": "property_unavailable", "value": null}


func _dictionary_value(source: Dictionary, keys: Array[StringName], fallback: Variant) -> Variant:
	for key in keys:
		if source.has(key):
			return _json_safe(source[key])
	return _json_safe(fallback)


func _target_less(left: Dictionary, right: Dictionary) -> bool:
	var left_key := "%s:%s:%s" % [left.get("kind", ""), left.get("id", ""), left.get("title", "")]
	var right_key := "%s:%s:%s" % [right.get("kind", ""), right.get("id", ""), right.get("title", "")]
	return left_key < right_key


func _vector3_json(value: Vector3) -> Dictionary:
	return {"x": value.x, "y": value.y, "z": value.z}


func _json_safe(value: Variant) -> Variant:
	match typeof(value):
		TYPE_NIL, TYPE_BOOL, TYPE_INT, TYPE_STRING:
			return value
		TYPE_FLOAT:
			return null if is_nan(value) or is_inf(value) else value
		TYPE_STRING_NAME, TYPE_NODE_PATH:
			return str(value)
		TYPE_VECTOR2:
			return {"x": value.x, "y": value.y}
		TYPE_VECTOR2I:
			return {"x": value.x, "y": value.y}
		TYPE_VECTOR3:
			return _vector3_json(value)
		TYPE_VECTOR3I:
			return {"x": value.x, "y": value.y, "z": value.z}
		TYPE_VECTOR4:
			return {"x": value.x, "y": value.y, "z": value.z, "w": value.w}
		TYPE_VECTOR4I:
			return {"x": value.x, "y": value.y, "z": value.z, "w": value.w}
		TYPE_COLOR:
			return {"r": value.r, "g": value.g, "b": value.b, "a": value.a}
		TYPE_ARRAY:
			var safe_array: Array = []
			for entry in value:
				safe_array.append(_json_safe(entry))
			return safe_array
		TYPE_DICTIONARY:
			var safe_dictionary: Dictionary = {}
			for key in value:
				safe_dictionary[str(key)] = _json_safe(value[key])
			return safe_dictionary
		TYPE_PACKED_BYTE_ARRAY, TYPE_PACKED_INT32_ARRAY, TYPE_PACKED_INT64_ARRAY, \
		TYPE_PACKED_FLOAT32_ARRAY, TYPE_PACKED_FLOAT64_ARRAY, TYPE_PACKED_STRING_ARRAY, \
		TYPE_PACKED_VECTOR2_ARRAY, TYPE_PACKED_VECTOR3_ARRAY, TYPE_PACKED_COLOR_ARRAY, \
		TYPE_PACKED_VECTOR4_ARRAY:
			var safe_packed_array: Array = []
			for entry in value:
				safe_packed_array.append(_json_safe(entry))
			return safe_packed_array
		_:
			return null
