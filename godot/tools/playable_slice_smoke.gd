extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const ARTIFACT_PATH := "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"

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
	await process_frame

	var session := scene.find_child("PlayableSession", true, false)
	if session == null or not session.has_method("build_summary"):
		_fail(["PlayableSession is missing or does not expose build_summary"])
		return
	var player := scene.find_child("Player", true, false)
	var hud := scene.find_child("SocialStealthHud", true, false)

	var input_failures := await _drive_player_input_path(player, session, hud)
	if input_failures.size() > 0:
		_fail(input_failures)
		return
	var summary: Dictionary = session.build_summary()
	var failures: Array[String] = _validate_summary(summary)
	if failures.size() > 0:
		_fail(failures)
		return
	if session.has_method("submit_recorded_statement") and session.has_method("build_summary"):
		var events_before: Array = summary.get("events", [])
		var event_count_before := events_before.size()
		session.call("submit_recorded_statement")
		var post_lock_summary: Dictionary = session.build_summary()
		if int(post_lock_summary.get("suspicion", 0)) != int(summary.get("suspicion", 0)):
			failures.append("Expected post-inquest input to leave suspicion unchanged")
		if post_lock_summary.get("events", []).size() != event_count_before:
			failures.append("Expected post-inquest input to add no Evidence events")
	if player != null and player.has_method("_controls_locked") and not bool(player.call("_controls_locked")):
		failures.append("Expected player controller controls to lock after deterministic session end")
	if failures.size() > 0:
		_fail(failures)
		return
	if not session.has_method("build_evidence_pack"):
		_fail(["PlayableSession is missing build_evidence_pack"])
		return

	var evidence_pack: Dictionary = session.build_evidence_pack(ARTIFACT_PATH)
	var pack_failures := _validate_pack_shape(evidence_pack)
	if pack_failures.size() > 0:
		_fail(pack_failures)
		return
	var playability: Dictionary = evidence_pack.get("playability", {})
	if str(playability.get("deterministicOutcome", "")) != "inquest_opened":
		_fail(["Evidence Pack playability must include deterministic inquest_opened outcome"])
		return
	if not str(playability.get("visibleWhyLine", "")).contains("꿈"):
		_fail(["Evidence Pack playability must expose dream-language why-line text"])
		return
	if not bool(playability.get("inputLocked", false)):
		_fail(["Evidence Pack playability must expose locked post-inquest input state"])
		return
	if str(playability.get("authorityMode", "")) != "godot_local_conversation_runtime":
		_fail(["Evidence Pack playability must identify local Godot conversation runtime authority mode"])
		return

	var output_path := ProjectSettings.globalize_path(OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write playable slice Evidence output: %s" % output_path])
		return
	file.store_string(JSON.stringify(evidence_pack, "\t"))
	file.close()

	print(JSON.stringify({
		"ok": true,
		"artifactPath": ARTIFACT_PATH,
		"runId": evidence_pack["runId"],
		"stage": summary["stage"],
		"suspicion": summary["suspicion"],
		"reportWeight": summary["reportWeight"],
		"outcome": summary["sessionOutcome"],
		"events": evidence_pack["events"].size()
	}, "\t"))
	quit(0)

func _drive_player_input_path(player: Node, session: Node, hud: Node) -> Array[String]:
	var failures: Array[String] = []
	if player == null:
		return ["Player node is missing; playable smoke cannot exercise keyboard input path"]
	if hud == null:
		return ["SocialStealthHud node is missing; playable smoke cannot assert active dialogue labels"]
	_place_player(player, Vector3(-13.0, 0.05, -1.1), 0.0)
	await _settle_frames(4)
	_call_session(session, "_update_focus")
	await _press_action(session, &"interact")
	await _settle_frames(3)
	_call_session(session, "_refresh_hud")
	var active_summary := _build_summary(session)
	failures.append_array(_validate_active_conversation_state(active_summary, hud))
	if failures.size() > 0:
		return failures
	await _press_action(session, &"dialogue_choice_3")
	await _settle_frames(3)
	_call_session(session, "_refresh_hud")
	var post_choice_summary := _build_summary(session)
	if not _has_choice_event(post_choice_summary):
		failures.append("Expected key 3 to select the risky Same Order dialogue choice through input dispatch")
	await _press_action(session, &"dialogue_recorded_statement")
	await _settle_frames(4)
	_call_session(session, "_refresh_hud")
	return failures

func _validate_summary(summary: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	if str(summary.get("stage", "")) != "inquest":
		failures.append("Expected playable smoke to reach inquest stage")
	if int(summary.get("suspicion", 0)) < 90:
		failures.append("Expected suspicion >= 90 after risky choice and recorded statement")
	if int(summary.get("reportWeight", 0)) < 80:
		failures.append("Expected reportWeight >= 80 after risky choice and recorded statement")
	var conversation: Dictionary = summary.get("conversation", {})
	if str(conversation.get("recordedStatementAction", "")) != "dialogue_recorded_statement":
		failures.append("Expected conversation summary to expose key 4 recorded-statement action")
	if str(conversation.get("recordedStatementScope", "")) != "key_4_explicit_recorded_statement_no_typed_ui":
		failures.append("Expected conversation summary to scope key 4 as explicit recorded statement, not typed UI")
	var station: Dictionary = summary.get("station", {})
	if not bool(station.get("intakeOpen", false)):
		failures.append("Expected Station intake to open")
	if not bool(station.get("inquestOpen", false)):
		failures.append("Expected Inquest to open")
	if not bool(station.get("sessionTerminationAllowed", false)):
		failures.append("Expected sessionTerminationAllowed")
	if str(summary.get("sessionOutcome", "")) != "inquest_opened":
		failures.append("Expected deterministic session outcome to be inquest_opened")
	if summary.get("events", []).size() < 8:
		failures.append("Expected conversation Evidence events")
	if not _has_event(summary, "conversation_started"):
		failures.append("Expected conversation_started Evidence event")
	if not _has_choice_event(summary):
		failures.append("Expected dialogue_choice_selected event for risky Same Order choice")
	if not _has_free_input_event(summary):
		failures.append("Expected free_input_submitted Evidence event with freeInputHash and recorded-statement scope")
	if not _has_anomaly_signal(summary, "local_routine_mismatch"):
		failures.append("Expected local_routine_mismatch anomaly Evidence")
	if not _has_anomaly_signal(summary, "dream_language_leak"):
		failures.append("Expected dream_language_leak anomaly Evidence")
	if not _has_event(summary, "station_report_created"):
		failures.append("Expected station_report_created Evidence event")
	if not _has_event(summary, "station_inquest_opened"):
		failures.append("Expected station_inquest_opened Evidence event")
	if str(summary.get("locale", "")) != "ko":
		failures.append("Expected playable slice default locale to be ko")
	if not bool(summary.get("outcomeVisible", false)):
		failures.append("Expected inquest outcome panel to become visible")
	if not str(summary.get("lastWhyLine", "")).contains("꿈"):
		failures.append("Expected last why-line to explain dream language leak")
	if not bool(summary.get("inputLocked", false)):
		failures.append("Expected player input to lock after deterministic session end")
	if str(summary.get("authorityMode", "")) != "godot_local_conversation_runtime":
		failures.append("Expected playable smoke authorityMode to identify local conversation runtime")
	var prologue_loop: Dictionary = summary.get("prologueLoop", {})
	var end_controls: Dictionary = prologue_loop.get("endControls", {})
	if str(end_controls.get("restart", "")) != "restart_session":
		failures.append("Expected restart_session end control after deterministic session end")
	if str(end_controls.get("quit", "")) != "quit_session":
		failures.append("Expected quit_session end control after deterministic session end")
	return failures

func _validate_pack_shape(pack: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	for key in ["schemaVersion", "runId", "adapter", "sessionId", "worldId", "worldRevision", "createdAtMs", "events", "summaries"]:
		if not pack.has(key):
			failures.append("Evidence Pack is missing %s" % key)
	if pack.get("adapter", "") != "godot":
		failures.append("Evidence Pack adapter must be godot")
	if not pack.get("events", []) is Array:
		failures.append("Evidence Pack events must be an array")
	if not pack.get("summaries", {}) is Dictionary:
		failures.append("Evidence Pack summaries must be a dictionary")
	var has_export_event := false
	for event in pack.get("events", []):
		if not event is Dictionary:
			failures.append("Evidence event must be a dictionary")
			continue
		for key in ["schemaVersion", "eventId", "eventName", "eventFamily", "adapter", "sessionId", "worldId", "worldRevision", "timestampMs", "summary"]:
			if not event.has(key):
				failures.append("Evidence event %s is missing %s" % [str(event.get("eventName", "<unknown>")), key])
		if event.get("eventFamily", "") == "evidence_export":
			has_export_event = true
		if _is_conversation_event(event):
			for key in ["conversationId", "turnId", "promptId"]:
				if not event.has(key):
					failures.append("Conversation event %s is missing %s" % [str(event.get("eventName", "<unknown>")), key])
	if not has_export_event:
		failures.append("Evidence Pack must include an evidence_export event")
	if not _pack_has_event(pack, "dialogue_choice_selected"):
		failures.append("Evidence Pack must include dialogue_choice_selected")
	if not _pack_has_event(pack, "free_input_submitted"):
		failures.append("Evidence Pack must include free_input_submitted")
	if not _pack_has_event(pack, "station_inquest_opened"):
		failures.append("Evidence Pack must include station_inquest_opened")
	return failures

func _is_conversation_event(event: Dictionary) -> bool:
	return [
		"conversation_started",
		"dialogue_choice_selected",
		"free_input_submitted",
		"conversation_anomaly_detected",
		"npc_suspicion_changed",
		"suspicion_shared",
		"station_report_created",
		"station_inquest_opened"
	].has(str(event.get("eventName", "")))

func _validate_active_conversation_state(summary: Dictionary, hud: Node) -> Array[String]:
	var failures: Array[String] = []
	var conversation: Dictionary = summary.get("conversation", {})
	if str(conversation.get("currentPromptId", "")) != "store.same_order.routine":
		failures.append("Expected key E to start the Store Clerk Same Order prompt")
	var choices: Array = conversation.get("availableChoices", [])
	if choices.size() != 3:
		failures.append("Expected active conversation to expose exactly three dialogue choices")
	var snapshot := _hud_snapshot(hud)
	if not str(snapshot.get("focusLabel", "")).contains("오늘도 같은 걸로"):
		failures.append("Expected HUD focus label to show the Store Clerk prompt, got '%s'" % str(snapshot.get("focusLabel", "")))
	if not str(snapshot.get("choicesLabel", "")).begins_with("1  네, 같은 걸로"):
		failures.append("Expected HUD choice label 1 to preserve the active safe dialogue line, got '%s'" % str(snapshot.get("choicesLabel", "")))
	if not str(snapshot.get("safeLineLabel", "")).begins_with("2  제가 보통"):
		failures.append("Expected HUD choice label 2 to preserve the active repair dialogue line, got '%s'" % str(snapshot.get("safeLineLabel", "")))
	if not str(snapshot.get("riskyLineLabel", "")).begins_with("3  오늘 처음"):
		failures.append("Expected HUD choice label 3 to preserve the active risky dialogue line, got '%s'" % str(snapshot.get("riskyLineLabel", "")))
	if not str(snapshot.get("consequenceLabel", "")).contains("4  기록된 진술 제출"):
		failures.append("Expected HUD to scope key 4 as an explicit recorded statement, got '%s'" % str(snapshot.get("consequenceLabel", "")))
	return failures

func _hud_snapshot(hud: Node) -> Dictionary:
	if hud != null and hud.has_method("debug_snapshot"):
		var snapshot: Variant = hud.call("debug_snapshot")
		if snapshot is Dictionary:
			return snapshot
	return {}

func _build_summary(session: Node) -> Dictionary:
	if session != null and session.has_method("build_summary"):
		var summary: Variant = session.call("build_summary")
		if summary is Dictionary:
			return summary
	return {}

func _call_session(session: Node, method: String, args: Array = []) -> bool:
	if session == null:
		return false
	session.callv(method, args)
	return true

func _place_player(player: Node, position: Vector3, yaw_degrees: float) -> void:
	if player.has_method("place_at"):
		player.call("place_at", position, yaw_degrees)
	else:
		var player_3d := player as Node3D
		if player_3d != null:
			player_3d.global_position = position
			player_3d.rotation.y = deg_to_rad(yaw_degrees)

func _press_action(session: Node, action_name: StringName) -> void:
	var press := InputEventAction.new()
	press.pressed = true
	press.action = action_name
	if session != null:
		session.call("_unhandled_input", press)
	await process_frame
	var release := InputEventAction.new()
	release.pressed = false
	release.action = action_name
	if session != null:
		session.call("_unhandled_input", release)
	await process_frame

func _settle_frames(count: int) -> void:
	for _index in range(count):
		await process_frame

func _has_event(summary: Dictionary, event_name: String) -> bool:
	for event in summary.get("events", []):
		if event is Dictionary and str(event.get("eventName", "")) == event_name:
			return true
	return false

func _pack_has_event(pack: Dictionary, event_name: String) -> bool:
	for event in pack.get("events", []):
		if event is Dictionary and str(event.get("eventName", "")) == event_name:
			return true
	return false

func _has_choice_event(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "dialogue_choice_selected":
			continue
		if str(event.get("conversationId", "")) != "conv-same-order":
			continue
		if str(event.get("selectedChoiceId", "")) != "store.same_order.risky":
			continue
		if str(event.get("displayedPlayerLine", "")) != "오늘 처음 왔는데요.":
			continue
		return true
	return false

func _has_free_input_event(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "free_input_submitted":
			continue
		if str(event.get("conversationId", "")) != "conv-same-order":
			continue
		if str(event.get("freeInputHash", "")).is_empty():
			continue
		if str(event.get("inputMode", "")) != "explicit_recorded_statement":
			continue
		if str(event.get("recordedStatementScope", "")) != "key_4_explicit_recorded_statement_no_typed_ui":
			continue
		if not str(event.get("displayedPlayerLine", "")).contains("꿈"):
			continue
		return true
	return false

func _has_anomaly_signal(summary: Dictionary, signal_id: String) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "conversation_anomaly_detected":
			continue
		if not event.get("suspicionSignals", []).has(signal_id):
			continue
		if int(event.get("reportDelta", 0)) <= 0:
			continue
		if str(event.get("whyLine", "")).is_empty():
			continue
		return true
	return false

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
