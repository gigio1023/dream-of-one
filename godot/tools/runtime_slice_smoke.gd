extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json"
const GodotRuntimeSlice := preload("res://scripts/runtime/runtime_slice.gd")
const ShellSchema := preload("res://scripts/data/shell_schema.gd")

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame

	var context := GodotRuntimeSlice.build_context(scene)
	var events := []
	var observation := GodotRuntimeSlice.build_observation_frame(scene, context, "NPC_Station_Officer", "SA_BREAK")
	events.append(GodotRuntimeSlice.evidence_event(
		"observation",
		"observation_frame_emitted",
		context,
		"Godot runtime slice emitted Station intake ObservationFrame.",
		{"socialLoopStage": "intake", "actorId": "NPC_Station_Officer"}
	))

	var valid_command := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"commandId": "cmd-godot-move-1",
		"sessionId": context["sessionId"],
		"worldId": context["worldId"],
		"worldRevision": context["worldRevision"],
		"npcId": "NPC_Station_Officer",
		"issuedAtMs": _now_ms(),
		"timeoutMs": 1000,
		"actionType": "Move",
		"target": {"position": {"x": 8.4, "y": 0.0, "z": -13.0}},
		"reasonCodes": ["godot_runtime_slice_move"],
		"expectedStage": "intake",
		"source": "test-fixture"
	}
	var valid_result := GodotRuntimeSlice.execute_command(scene, valid_command, context)
	if not valid_result["ok"]:
		_fail(["Expected valid Move command to execute, got: %s" % JSON.stringify(valid_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"command",
		"command_executed",
		context,
		"Godot runtime slice executed a bounded Move command.",
		{
			"actorId": "NPC_Station_Officer",
			"commandId": "cmd-godot-move-1",
			"socialLoopStage": "intake",
			"observedResult": valid_result.get("observedResult", {})
		}
	))

	var invalid_command := valid_command.duplicate(true)
	invalid_command["commandId"] = "cmd-godot-invalid-1"
	invalid_command["npcId"] = "NPC_Missing"
	invalid_command["target"] = {}
	var invalid_result := GodotRuntimeSlice.execute_command(scene, invalid_command, context)
	if invalid_result["ok"]:
		_fail(["Expected invalid command to reject, got: %s" % JSON.stringify(invalid_result)])
		return
	if invalid_result.get("fallback", {}).is_empty():
		_fail(["Expected invalid command to select fallback, got: %s" % JSON.stringify(invalid_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"command",
		"command_rejected",
		context,
		"Godot runtime slice rejected an invalid command before world mutation.",
		{
			"actorId": "NPC_Missing",
			"commandId": "cmd-godot-invalid-1",
			"reasonCode": invalid_result["reasonCodes"][0],
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"socialLoopStage": "intake"
		}
	))
	events.append(GodotRuntimeSlice.evidence_event(
		"fallback",
		"fallback_selected",
		context,
		"Godot runtime slice selected deterministic Idle fallback for the rejected command.",
		{
			"actorId": "NPC_Missing",
			"commandId": invalid_result["fallback"]["commandId"],
			"reasonCode": invalid_result["reasonCodes"][0],
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"usedFallback": true,
			"socialLoopStage": "intake"
		}
	))

	var duplicate_context := context.duplicate(true)
	duplicate_context["completedCommandIds"] = ["cmd-godot-move-1"]
	var duplicate_result := GodotRuntimeSlice.execute_command(scene, valid_command, duplicate_context)
	if duplicate_result["ok"]:
		_fail(["Expected duplicate commandId to reject, got: %s" % JSON.stringify(duplicate_result)])
		return
	if not duplicate_result["reasonCodes"].has("schema_duplicate_command"):
		_fail(["Expected schema_duplicate_command, got: %s" % JSON.stringify(duplicate_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"command",
		"command_rejected",
		context,
		"Godot runtime slice rejected a replayed commandId before world mutation.",
		{
			"actorId": "NPC_Station_Officer",
			"commandId": "cmd-godot-move-1",
			"reasonCode": "schema_duplicate_command",
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"socialLoopStage": "intake"
		}
	))

	var busy_context := context.duplicate(true)
	busy_context["inFlightActorIds"] = ["NPC_Station_Officer"]
	var busy_command := valid_command.duplicate(true)
	busy_command["commandId"] = "cmd-godot-busy-actor-1"
	var busy_result := GodotRuntimeSlice.execute_command(scene, busy_command, busy_context)
	if busy_result["ok"]:
		_fail(["Expected in-flight actor command to reject, got: %s" % JSON.stringify(busy_result)])
		return
	if not busy_result["reasonCodes"].has("schema_actor_busy"):
		_fail(["Expected schema_actor_busy, got: %s" % JSON.stringify(busy_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"command",
		"command_rejected",
		context,
		"Godot runtime slice rejected an in-flight actor command before world mutation.",
		{
			"actorId": "NPC_Station_Officer",
			"commandId": "cmd-godot-busy-actor-1",
			"reasonCode": "schema_actor_busy",
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"socialLoopStage": "intake"
		}
	))

	var unknown_zone_command := valid_command.duplicate(true)
	unknown_zone_command["commandId"] = "cmd-godot-unknown-zone-1"
	unknown_zone_command["target"] = {"zoneId": "MissingZone"}
	var unknown_zone_result := GodotRuntimeSlice.execute_command(scene, unknown_zone_command, context)
	if unknown_zone_result["ok"]:
		_fail(["Expected unknown zone command to reject, got: %s" % JSON.stringify(unknown_zone_result)])
		return
	if not unknown_zone_result["reasonCodes"].has("schema_unknown_zone"):
		_fail(["Expected schema_unknown_zone, got: %s" % JSON.stringify(unknown_zone_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"command",
		"command_rejected",
		context,
		"Godot runtime slice rejected an unregistered zone target before world mutation.",
		{
			"actorId": "NPC_Station_Officer",
			"commandId": "cmd-godot-unknown-zone-1",
			"reasonCode": "schema_unknown_zone",
			"reasonCategory": "schema",
			"warningTier": "blocking",
			"socialLoopStage": "intake"
		}
	))

	var domain_result := GodotRuntimeSlice.evaluate_station_intake(observation)
	if domain_result["ok"]:
		_fail(["Expected Station intake to reject SA_BREAK, got: %s" % JSON.stringify(domain_result)])
		return
	events.append(GodotRuntimeSlice.evidence_event(
		"domain",
		"station_intake_sa_break_rejected",
		context,
		"Station intake rejected SA_BREAK with deterministic procedural speech policy.",
		{
			"actorId": "NPC_Station_Officer",
			"reasonCode": domain_result["reasonCode"],
			"reasonCategory": domain_result["reasonCategory"],
			"warningTier": domain_result["warningTier"],
			"usedFallback": domain_result["usedFallback"],
			"socialLoopStage": domain_result["socialLoopStage"]
		}
	))

	events.append(GodotRuntimeSlice.evidence_event(
		"evidence_export",
		"evidence_pack_created",
		context,
		"Godot runtime slice Evidence Pack exported.",
		{"artifactPath": "data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json"}
	))

	var pack := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"runId": "dre-171-runtime-slice-run",
		"adapter": "godot",
		"sessionId": context["sessionId"],
		"worldId": context["worldId"],
		"worldRevision": context["worldRevision"],
		"createdAtMs": _now_ms(),
		"events": events,
		"summaries": {
			"runSignature": "dre-171-runtime-slice:%s:%s" % [context["worldId"], context["worldRevision"]],
			"actorSignatures": {"NPC_Station_Officer": "%s:NPC_Station_Officer:intake" % context["worldId"]},
			"fallbackCounters": {"total": 1},
			"commandOutcomeCounts": {"validated": 1, "executed": 1, "rejected": 4},
			"domainTriggerCounts": {"station_intake_sa_break_rejected": 1},
			"verdictEndStateTrace": "Trigger -> Station Officer -> Intake Dossier -> intake rejection -> blocked before verdict",
			"blockedChecks": []
		},
		"observationFrame": observation,
		"validCommandResult": valid_result,
		"invalidCommandResult": invalid_result,
		"duplicateCommandResult": duplicate_result,
		"busyCommandResult": busy_result,
		"unknownZoneCommandResult": unknown_zone_result
	}

	var output_path := ProjectSettings.globalize_path(OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write runtime slice Evidence output: %s" % output_path])
		return
	file.store_string(JSON.stringify(pack, "\t"))
	file.close()

	print(JSON.stringify(pack, "\t"))
	quit(0)

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)

func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
