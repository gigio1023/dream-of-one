class_name GodotRuntimeSlice
extends RefCounted

const ShellSchema := preload("res://scripts/data/shell_schema.gd")

const ACTION_TYPES := ["Move", "Talk", "Ask", "Observe", "Work", "Report", "Escort", "Idle"]
const SOCIAL_LOOP_STAGES := ["ambient", "report", "intake", "verdict"]
const PLAYER_SPEECH_ACTS := ["SA_COMPLY", "SA_INQUIRE", "SA_FRAME", "SA_BREAK"]
const COMMAND_SOURCES := ["codex", "fallback", "test-fixture"]
const MAX_SINGLE_MOVE_METERS := 4.0

static func build_context(root: Node) -> Dictionary:
	var tree := root.get_tree()
	return {
		"sessionId": "dre-171-runtime-slice-session",
		"worldId": str(root.get_meta("world_id", ShellSchema.WORLD_ID)),
		"worldRevision": str(root.get_meta("world_revision", ShellSchema.WORLD_REVISION)),
		"actorIds": _metadata_values(tree.get_nodes_in_group("npc_placeholders"), "npc_id") + ["player"],
		"landmarkIds": _metadata_values(tree.get_nodes_in_group("landmarks"), "landmark_id"),
		"zoneIds": _metadata_values(tree.get_nodes_in_group("interaction_zones"), "zone_id"),
		"textSurfaceIds": _metadata_values(tree.get_nodes_in_group("text_surfaces"), "surface_id"),
		"completedCommandIds": [],
		"inFlightActorIds": []
	}

static func build_observation_frame(root: Node, context: Dictionary, npc_id: String, speech_act: String) -> Dictionary:
	var tree := root.get_tree()
	var actor := _find_actor(tree, npc_id)
	var position := Vector3.ZERO if actor == null else actor.global_position
	var surfaces := []
	for surface in tree.get_nodes_in_group("text_surfaces"):
		surfaces.append({
			"id": str(surface.get_meta("surface_id", "")),
			"landmarkId": str(surface.get_meta("landmark", "")),
			"text": str(surface.get_meta("body", "")),
			"dreamLawIds": [str(surface.get_meta("law_id", ""))],
			"coverTestIds": [str(surface.get_meta("cover_test_id", ""))]
		})

	return {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"sessionId": context["sessionId"],
		"worldId": context["worldId"],
		"worldRevision": context["worldRevision"],
		"frameId": "godot-runtime-slice-frame-1",
		"timestampMs": _now_ms(),
		"deltaMs": 16,
		"npcId": npc_id,
		"playerId": "player",
		"landmarkId": "Station",
		"zoneId": "StationIntakeZone",
		"position": _vector_dict(position),
		"velocity": _vector_dict(Vector3.ZERO),
		"nearbyActors": ["player", "NPC_Station_Officer"],
		"visibleLandmarks": context["landmarkIds"],
		"visibleTextSurfaces": surfaces,
		"recentEvents": ["intake_started", "dossier_open"],
		"organizationContext": {"org": "Station", "role": "Station Officer"},
		"playerSignals": {"speechAct": speech_act, "rawText": "This is a dream.", "exposureDelta": 25},
		"socialLoopStage": "intake",
		"exposure": {"score": 85, "thresholds": {"stationInterest": 60, "inquest": 80, "verdict": 100}},
		"station": {"intakeOpen": true, "inquestOpen": true, "verdictReady": false, "sessionTerminationAllowed": false},
		"evidence": [
			{
				"id": "godot-runtime-intake-dossier",
				"type": "intake_dossier",
				"stage": "intake",
				"summary": "Station intake dossier opened from runtime slice observation."
			}
		]
	}

static func validate_command(command: Dictionary, context: Dictionary) -> Dictionary:
	var failures: Array[String] = []
	var reason_codes: Array[String] = []
	var action_type := str(command.get("actionType", ""))
	var npc_id := str(command.get("npcId", ""))
	var target: Dictionary = command.get("target", {})
	var command_id := str(command.get("commandId", ""))

	if command.get("schemaVersion", "") != ShellSchema.EVIDENCE_SCHEMA:
		_append_failure(failures, reason_codes, "schema_invalid_payload", "schemaVersion must match Godot runtime Schema")
	if command_id.is_empty():
		_append_failure(failures, reason_codes, "schema_invalid_payload", "commandId must be a non-empty string")
	if command.get("sessionId", "") != context["sessionId"]:
		_append_failure(failures, reason_codes, "schema_session_mismatch", "sessionId must match active session")
	if command.get("worldId", "") != context["worldId"]:
		_append_failure(failures, reason_codes, "schema_world_mismatch", "worldId must match active world")
	if command.get("worldRevision", "") != context["worldRevision"]:
		_append_failure(failures, reason_codes, "schema_world_revision_mismatch", "worldRevision must match active topology")
	if not ACTION_TYPES.has(action_type):
		_append_failure(failures, reason_codes, "schema_unknown_action_type", "actionType is outside bounded NPC Action Type")
	if not context["actorIds"].has(npc_id):
		_append_failure(failures, reason_codes, "schema_unknown_actor", "npcId is not present in the active world")
	if context.get("inFlightActorIds", []).has(npc_id):
		_append_failure(failures, reason_codes, "schema_actor_busy", "npcId already has an in-flight command")
	if context.get("completedCommandIds", []).has(command_id):
		_append_failure(failures, reason_codes, "schema_duplicate_command", "commandId must not be replayed")
	if int(command.get("timeoutMs", 0)) <= 0:
		_append_failure(failures, reason_codes, "schema_timeout_invalid", "timeoutMs must be positive")
	if int(command.get("issuedAtMs", -1)) < 0:
		_append_failure(failures, reason_codes, "schema_invalid_payload", "issuedAtMs must be a non-negative integer")
	if not SOCIAL_LOOP_STAGES.has(str(command.get("expectedStage", ""))):
		_append_failure(failures, reason_codes, "schema_invalid_social_loop_stage", "expectedStage must be a supported social loop stage")
	if not COMMAND_SOURCES.has(str(command.get("source", ""))):
		_append_failure(failures, reason_codes, "schema_invalid_payload", "source must be codex, fallback, or test-fixture")
	if not command.get("reasonCodes", []) is Array or command.get("reasonCodes", []).is_empty():
		_append_failure(failures, reason_codes, "schema_invalid_payload", "reasonCodes must include at least one deterministic Reason Code")
	if not command.get("target", {}) is Dictionary:
		_append_failure(failures, reason_codes, "schema_invalid_payload", "target must be an object")

	_validate_target_ids(target, context, failures, reason_codes)

	match action_type:
		"Move":
			if not target.has("position") and not target.has("landmarkId") and not target.has("zoneId"):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "Move requires position, landmarkId, or zoneId")
		"Talk", "Ask":
			if not target.has("actorId") and not target.has("textSurfaceId"):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "%s requires actorId or textSurfaceId" % action_type)
			if str(command.get("utterance", "")).is_empty():
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "%s requires utterance" % action_type)
		"Observe":
			if not target.has("actorId") and not target.has("landmarkId") and not target.has("zoneId") and not target.has("textSurfaceId") and not target.has("position"):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "Observe requires actorId, landmarkId, zoneId, textSurfaceId, or position")
		"Work":
			if not target.has("landmarkId") and not target.has("zoneId") and not target.has("textSurfaceId"):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "Work requires landmarkId, zoneId, or textSurfaceId")
		"Report":
			if not target.has("actorId") and not target.has("landmarkId") and not target.has("textSurfaceId"):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "Report requires actorId, landmarkId, or textSurfaceId")
		"Escort":
			if not target.has("actorId") or (not target.has("position") and not target.has("landmarkId") and not target.has("zoneId")):
				_append_failure(failures, reason_codes, "schema_invalid_action_target", "Escort requires actorId and destination")

	return {
		"ok": failures.is_empty(),
		"failures": failures,
		"reasonCodes": reason_codes
	}

static func execute_command(root: Node, command: Dictionary, context: Dictionary) -> Dictionary:
	var validation := validate_command(command, context)
	if not validation["ok"]:
		return {
			"ok": false,
			"status": "rejected",
			"reasonCodes": validation["reasonCodes"],
			"fallback": _fallback_command(command, validation["reasonCodes"])
		}

	var actor := _find_actor(root.get_tree(), str(command.get("npcId", "")))
	if actor == null:
		return {
			"ok": false,
			"status": "rejected",
			"reasonCodes": ["schema_unknown_actor"],
			"fallback": _fallback_command(command, ["schema_unknown_actor"])
		}

	if command.get("actionType") == "Move":
		var target: Dictionary = command.get("target", {})
		var move_result := _execute_bounded_move(root, actor, target)
		if not move_result["ok"]:
			return {
				"ok": false,
				"status": "rejected",
				"reasonCodes": move_result["reasonCodes"],
				"fallback": _fallback_command(command, move_result["reasonCodes"])
			}
		return {
			"ok": true,
			"status": "executed",
			"reasonCodes": command.get("reasonCodes", []),
			"observedResult": move_result
		}

	return {
		"ok": true,
		"status": "executed",
		"reasonCodes": command.get("reasonCodes", []),
		"observedResult": {}
	}

static func evaluate_station_intake(observation: Dictionary) -> Dictionary:
	var stage := str(observation.get("socialLoopStage", "ambient"))
	var player_signals: Dictionary = observation.get("playerSignals", {})
	var speech_act := str(player_signals.get("speechAct", ""))
	if not PLAYER_SPEECH_ACTS.has(speech_act):
		return {
			"ok": false,
			"reasonCode": "schema_invalid_player_speech_act",
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"socialLoopStage": stage,
			"usedFallback": true
		}
	if stage == "intake" and speech_act == "SA_BREAK":
		return {
			"ok": false,
			"reasonCode": "policy_station_intake_requires_procedural_speech",
			"reasonCategory": "policy",
			"warningTier": "blocking",
			"socialLoopStage": stage,
			"usedFallback": true
		}
	return {
		"ok": true,
		"reasonCode": "",
		"reasonCategory": "none",
		"warningTier": "reference",
		"socialLoopStage": stage,
		"usedFallback": false
	}

static func evidence_event(
	event_family: String,
	event_name: String,
	context: Dictionary,
	summary: String,
	extra: Dictionary = {}
) -> Dictionary:
	var event := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"eventId": "%s-%s" % [event_name, _now_ms()],
		"eventName": event_name,
		"eventFamily": event_family,
		"adapter": "godot",
		"sessionId": context["sessionId"],
		"worldId": context["worldId"],
		"worldRevision": context["worldRevision"],
		"timestampMs": _now_ms(),
		"summary": summary
	}
	for key in extra.keys():
		event[key] = extra[key]
	return event

static func _fallback_command(command: Dictionary, reason_codes: Array) -> Dictionary:
	return {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"commandId": "%s-fallback" % command.get("commandId", "unknown-command"),
		"sessionId": command.get("sessionId", ""),
		"worldId": command.get("worldId", ""),
		"worldRevision": command.get("worldRevision", ""),
		"npcId": command.get("npcId", ""),
		"issuedAtMs": _now_ms(),
		"timeoutMs": 1000,
		"actionType": "Idle",
		"target": {},
		"reasonCodes": reason_codes,
		"expectedStage": command.get("expectedStage", "ambient"),
		"source": "fallback"
	}

static func _metadata_values(nodes: Array[Node], key: StringName) -> Array[String]:
	var values: Array[String] = []
	for node in nodes:
		values.append(str(node.get_meta(key, "")))
	values.sort()
	return values

static func _find_actor(tree: SceneTree, npc_id: String) -> CharacterBody3D:
	for node in tree.get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == npc_id:
			return node as CharacterBody3D
	return null

static func _validate_target_ids(target: Dictionary, context: Dictionary, failures: Array[String], reason_codes: Array[String]) -> void:
	if target.has("actorId") and not context["actorIds"].has(str(target["actorId"])):
		_append_failure(failures, reason_codes, "schema_unknown_actor", "target.actorId must reference a known actor")
	if target.has("landmarkId") and not context["landmarkIds"].has(str(target["landmarkId"])):
		_append_failure(failures, reason_codes, "schema_unknown_landmark", "target.landmarkId must reference a known landmark")
	if target.has("zoneId") and not context["zoneIds"].has(str(target["zoneId"])):
		_append_failure(failures, reason_codes, "schema_unknown_zone", "target.zoneId must reference a known zone")
	if target.has("textSurfaceId") and not context["textSurfaceIds"].has(str(target["textSurfaceId"])):
		_append_failure(failures, reason_codes, "schema_unknown_text_surface", "target.textSurfaceId must reference a known text surface")
	if target.has("position") and not target["position"] is Dictionary:
		_append_failure(failures, reason_codes, "schema_invalid_action_target", "target.position must be a Godot Vector3 object")

static func _execute_bounded_move(root: Node, actor: CharacterBody3D, target: Dictionary) -> Dictionary:
	var destination_result := _resolve_target_position(root, target)
	if not destination_result["ok"]:
		return destination_result

	var destination: Vector3 = destination_result["position"]
	var start_position := actor.global_position
	var motion := destination - actor.global_position
	var horizontal_distance := Vector2(motion.x, motion.z).length()
	if horizontal_distance > MAX_SINGLE_MOVE_METERS:
		return {
			"ok": false,
			"reasonCodes": ["schema_invalid_action_target"],
			"message": "Move exceeds bounded single-command distance"
		}
	if motion.length() <= 0.01:
		return {
			"ok": true,
			"reasonCodes": [],
			"requestedPosition": _vector_dict(destination),
			"observedStartPosition": _vector_dict(start_position),
			"observedEndPosition": _vector_dict(actor.global_position),
			"movedMeters": 0.0,
			"collisionObserved": false
		}

	var collision := actor.move_and_collide(motion, true)
	if collision != null:
		return {
			"ok": false,
			"reasonCodes": ["schema_invalid_action_target"],
			"message": "Move path is blocked by collision"
		}
	actor.move_and_collide(motion)
	return {
		"ok": true,
		"reasonCodes": [],
		"requestedPosition": _vector_dict(destination),
		"observedStartPosition": _vector_dict(start_position),
		"observedEndPosition": _vector_dict(actor.global_position),
		"movedMeters": actor.global_position.distance_to(start_position),
		"collisionObserved": false
	}

static func _resolve_target_position(root: Node, target: Dictionary) -> Dictionary:
	if target.has("position"):
		return {"ok": true, "position": _dict_vector(target["position"])}
	if target.has("zoneId"):
		var zone := _find_node_by_meta(root.get_tree().get_nodes_in_group("interaction_zones"), "zone_id", str(target["zoneId"]))
		if zone != null:
			return {"ok": true, "position": (zone as Node3D).global_position}
		return {"ok": false, "reasonCodes": ["schema_unknown_zone"]}
	if target.has("landmarkId"):
		var landmark := _find_node_by_meta(root.get_tree().get_nodes_in_group("landmarks"), "landmark_id", str(target["landmarkId"]))
		if landmark != null:
			return {"ok": true, "position": (landmark as Node3D).global_position}
		return {"ok": false, "reasonCodes": ["schema_unknown_landmark"]}
	return {"ok": false, "reasonCodes": ["schema_invalid_action_target"]}

static func _find_node_by_meta(nodes: Array[Node], key: StringName, value: String) -> Node3D:
	for node in nodes:
		if str(node.get_meta(key, "")) == value and node is Node3D:
			return node as Node3D
	return null

static func _append_failure(failures: Array[String], reason_codes: Array[String], reason_code: String, message: String) -> void:
	failures.append("%s: %s" % [reason_code, message])
	reason_codes.append(reason_code)

static func _vector_dict(vector: Vector3) -> Dictionary:
	return {"x": vector.x, "y": vector.y, "z": vector.z}

static func _dict_vector(value: Dictionary) -> Vector3:
	return Vector3(float(value.get("x", 0.0)), float(value.get("y", 0.0)), float(value.get("z", 0.0)))

static func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
