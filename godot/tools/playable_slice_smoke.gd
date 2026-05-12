extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const ARTIFACT_PATH := "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const ROUTE_PROOF_IDS := ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"]

const ROUTE_DEFINITIONS := [
	{
		"id": "clean_cover",
		"inputPath": "focus StoreCounterZone -> E -> 1 safe routine -> 1 safe probe",
		"actions": ["dialogue_choice_1", "dialogue_choice_1"],
		"firstChoiceId": "store.same_order.safe",
		"expectedOutcome": "cover_held",
		"expectedRouteOutcome": "clean_cover",
		"expectedStage": "normal",
		"expectedSuspicion": 0,
		"expectedReportWeight": 0,
		"expectedStationIntake": false,
		"expectedStationInquest": false,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "conversation_outcome_reached"],
		"forbiddenEvents": ["conversation_anomaly_detected", "station_report_created", "station_inquest_opened"],
		"expectedSignals": []
	},
	{
		"id": "repair_recovered",
		"inputPath": "focus StoreCounterZone -> E -> 2 memory-gap repair -> 1 accept clerk premise",
		"actions": ["dialogue_choice_2", "dialogue_choice_1"],
		"firstChoiceId": "store.same_order.repair",
		"expectedOutcome": "cover_held",
		"expectedRouteOutcome": "repair_recovered",
		"expectedStage": "uneasy",
		"minSuspicion": 20,
		"maxReportWeight": 49,
		"expectedStationIntake": false,
		"expectedStationInquest": false,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "conversation_anomaly_detected", "npc_suspicion_changed", "conversation_outcome_reached"],
		"forbiddenEvents": ["station_report_created", "station_inquest_opened"],
		"expectedSignals": ["memory_gap_admission"]
	},
	{
		"id": "cover_held_under_suspicion",
		"inputPath": "focus StoreCounterZone -> E -> 3 routine mismatch -> 1 accept clerk premise",
		"actions": ["dialogue_choice_3", "dialogue_choice_1"],
		"firstChoiceId": "store.same_order.risky",
		"expectedOutcome": "cover_held",
		"expectedRouteOutcome": "cover_held_under_suspicion",
		"expectedStage": "uneasy",
		"minSuspicion": 35,
		"maxReportWeight": 49,
		"expectedStationIntake": false,
		"expectedStationInquest": false,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "conversation_anomaly_detected", "npc_suspicion_changed", "conversation_outcome_reached"],
		"forbiddenEvents": ["station_report_created", "station_inquest_opened"],
		"expectedSignals": ["local_routine_mismatch"],
		"routeProofSet": false
	},
	{
		"id": "soft_report",
		"inputPath": "focus StoreCounterZone -> E -> 3 routine mismatch -> 3 outsider insistence",
		"actions": ["dialogue_choice_3", "dialogue_choice_3"],
		"firstChoiceId": "store.same_order.risky",
		"expectedOutcome": "soft_report",
		"expectedRouteOutcome": "soft_report",
		"expectedStage": "reported",
		"minSuspicion": 70,
		"minReportWeight": 70,
		"maxReportWeight": 99,
		"expectedStationIntake": true,
		"expectedStationInquest": false,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "conversation_anomaly_detected", "npc_suspicion_changed", "suspicion_shared", "station_report_created", "conversation_outcome_reached"],
		"forbiddenEvents": ["station_inquest_opened", "free_input_submitted"],
		"expectedSignals": ["local_routine_mismatch", "prior_statement_contradiction"]
	},
	{
		"id": "inquest_opened",
		"inputPath": "focus StoreCounterZone -> E -> 3 routine mismatch -> 4 explicit recorded statement",
		"actions": ["dialogue_choice_3", "dialogue_recorded_statement"],
		"firstChoiceId": "store.same_order.risky",
		"expectedOutcome": "inquest_opened",
		"expectedRouteOutcome": "inquest_opened",
		"expectedStage": "inquest",
		"minSuspicion": 100,
		"minReportWeight": 100,
		"expectedStationIntake": true,
		"expectedStationInquest": true,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "free_input_submitted", "conversation_anomaly_detected", "npc_suspicion_changed", "suspicion_shared", "station_report_created", "station_inquest_opened"],
		"forbiddenEvents": ["conversation_outcome_reached"],
		"expectedSignals": ["local_routine_mismatch", "dream_language_leak"],
		"exportEvidencePack": true
	}
]

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var route_proofs: Array[Dictionary] = []
	var inquest_pack: Dictionary = {}
	var failures: Array[String] = []

	for route in ROUTE_DEFINITIONS:
		var result: Dictionary = await _run_route(route)
		if bool(route.get("routeProofSet", true)):
			route_proofs.append(result.get("routeProof", {}))
		if not bool(result.get("ok", false)):
			failures.append_array(result.get("failures", []))
		if bool(route.get("exportEvidencePack", false)):
			inquest_pack = result.get("evidencePack", {})

	if failures.size() > 0:
		_fail(failures)
		return
	if inquest_pack.is_empty():
		_fail(["Inquest route did not produce the playable slice Evidence Pack"])
		return

	var playability: Dictionary = inquest_pack.get("playability", {})
	playability["routeProofs"] = route_proofs
	playability["routeContrastSummary"] = "Same Order now proves clean cover, repair recovery, soft report, and inquest outcomes from the same prompt set, with a separate guard route ensuring suspicious cover is not mislabeled as repair."
	inquest_pack["playability"] = playability

	var pack_failures := _validate_pack_shape(inquest_pack)
	if pack_failures.size() > 0:
		_fail(pack_failures)
		return

	var output_path := ProjectSettings.globalize_path(OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write playable slice Evidence output: %s" % output_path])
		return
	file.store_string(JSON.stringify(inquest_pack, "\t"))
	file.close()

	var primary_summary: Dictionary = inquest_pack.get("playableSummary", {})
	print(JSON.stringify({
		"ok": true,
		"artifactPath": ARTIFACT_PATH,
		"runId": inquest_pack["runId"],
		"stage": primary_summary.get("stage", ""),
		"suspicion": primary_summary.get("suspicion", 0),
		"reportWeight": primary_summary.get("reportWeight", 0),
		"outcome": primary_summary.get("sessionOutcome", ""),
		"routeProofs": route_proofs,
		"events": inquest_pack["events"].size()
	}, "\t"))
	quit(0)

func _run_route(route: Dictionary) -> Dictionary:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		return {
			"ok": false,
			"failures": ["Unable to load %s" % MAIN_SCENE],
			"routeProof": _empty_route_proof(route)
		}

	var scene := packed.instantiate()
	root.add_child(scene)
	await _settle_frames(3)

	var session := scene.find_child("PlayableSession", true, false)
	var player := scene.find_child("Player", true, false)
	var hud := scene.find_child("SocialStealthHud", true, false)
	var failures: Array[String] = []
	if session == null or not session.has_method("build_summary"):
		failures.append("PlayableSession is missing or does not expose build_summary for route %s" % str(route.get("id", "")))
	if player == null:
		failures.append("Player node is missing for route %s" % str(route.get("id", "")))
	if hud == null:
		failures.append("SocialStealthHud node is missing for route %s" % str(route.get("id", "")))
	if failures.size() > 0:
		scene.queue_free()
		await _settle_frames(1)
		return {"ok": false, "failures": failures, "routeProof": _empty_route_proof(route)}

	failures.append_array(await _validate_pre_conversation_recorded_statement_noop(session))
	failures.append_array(await _drive_route_input_path(route, player, session, hud))
	var summary := _build_summary(session)
	failures.append_array(_validate_route_summary(route, summary))
	failures.append_array(_validate_post_lock_noop(session, summary, player))

	var evidence_pack := {}
	if bool(route.get("exportEvidencePack", false)):
		if not session.has_method("build_evidence_pack"):
			failures.append("PlayableSession is missing build_evidence_pack")
		else:
			evidence_pack = session.build_evidence_pack(ARTIFACT_PATH)

	var route_proof := _route_proof(route, summary)
	scene.queue_free()
	await _settle_frames(1)
	return {
		"ok": failures.is_empty(),
		"failures": failures,
		"routeProof": route_proof,
		"evidencePack": evidence_pack
	}

func _drive_route_input_path(route: Dictionary, player: Node, session: Node, hud: Node) -> Array[String]:
	var failures: Array[String] = []
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

	var action_index := 0
	for action in route.get("actions", []):
		await _press_action(session, StringName(str(action)))
		await _settle_frames(3)
		_call_session(session, "_refresh_hud")
		if action_index == 0 and int(route.get("minSuspicion", 0)) > 0:
			failures.append_array(_validate_mid_conversation_visibility(route, session, hud))
		action_index += 1
	return failures

func _validate_route_summary(route: Dictionary, summary: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(route.get("id", ""))
	if str(summary.get("sessionOutcome", "")) != str(route.get("expectedOutcome", "")):
		failures.append("%s expected sessionOutcome %s, got %s" % [route_id, str(route.get("expectedOutcome", "")), str(summary.get("sessionOutcome", ""))])
	if str(summary.get("routeOutcome", "")) != str(route.get("expectedRouteOutcome", "")):
		failures.append("%s expected routeOutcome %s, got %s" % [route_id, str(route.get("expectedRouteOutcome", "")), str(summary.get("routeOutcome", ""))])
	if str(summary.get("stage", "")) != str(route.get("expectedStage", "")):
		failures.append("%s expected stage %s, got %s" % [route_id, str(route.get("expectedStage", "")), str(summary.get("stage", ""))])
	if route.has("expectedSuspicion") and int(summary.get("suspicion", -1)) != int(route.get("expectedSuspicion", -1)):
		failures.append("%s expected suspicion %d, got %d" % [route_id, int(route.get("expectedSuspicion", -1)), int(summary.get("suspicion", -1))])
	if route.has("expectedReportWeight") and int(summary.get("reportWeight", -1)) != int(route.get("expectedReportWeight", -1)):
		failures.append("%s expected reportWeight %d, got %d" % [route_id, int(route.get("expectedReportWeight", -1)), int(summary.get("reportWeight", -1))])
	if route.has("minSuspicion") and int(summary.get("suspicion", 0)) < int(route.get("minSuspicion", 0)):
		failures.append("%s expected suspicion >= %d, got %d" % [route_id, int(route.get("minSuspicion", 0)), int(summary.get("suspicion", 0))])
	if route.has("minReportWeight") and int(summary.get("reportWeight", 0)) < int(route.get("minReportWeight", 0)):
		failures.append("%s expected reportWeight >= %d, got %d" % [route_id, int(route.get("minReportWeight", 0)), int(summary.get("reportWeight", 0))])
	if route.has("maxReportWeight") and int(summary.get("reportWeight", 0)) > int(route.get("maxReportWeight", 125)):
		failures.append("%s expected reportWeight <= %d, got %d" % [route_id, int(route.get("maxReportWeight", 125)), int(summary.get("reportWeight", 0))])

	var station: Dictionary = summary.get("station", {})
	if bool(station.get("intakeOpen", false)) != bool(route.get("expectedStationIntake", false)):
		failures.append("%s Station intake mismatch: %s" % [route_id, str(station.get("intakeOpen", false))])
	if bool(station.get("inquestOpen", false)) != bool(route.get("expectedStationInquest", false)):
		failures.append("%s Station inquest mismatch: %s" % [route_id, str(station.get("inquestOpen", false))])
	if not bool(station.get("sessionTerminationAllowed", false)):
		failures.append("%s expected deterministic session termination lock" % route_id)
	if not bool(summary.get("outcomeVisible", false)):
		failures.append("%s expected outcome panel to become visible" % route_id)
	if not bool(summary.get("inputLocked", false)):
		failures.append("%s expected inputLocked after terminal outcome" % route_id)
	if str(summary.get("authorityMode", "")) != "godot_local_conversation_runtime":
		failures.append("%s expected local Godot conversation runtime authority mode" % route_id)
	if str(summary.get("locale", "")) != "ko":
		failures.append("%s expected default locale ko" % route_id)

	for event_name in route.get("expectedEvents", []):
		if not _has_event(summary, str(event_name)):
			failures.append("%s expected Evidence event %s" % [route_id, str(event_name)])
	for event_name in route.get("forbiddenEvents", []):
		if _has_event(summary, str(event_name)):
			failures.append("%s must not emit Evidence event %s" % [route_id, str(event_name)])
	for signal_id in route.get("expectedSignals", []):
		if not _has_anomaly_signal(summary, str(signal_id)):
			failures.append("%s expected anomaly signal %s" % [route_id, str(signal_id)])

	var first_choice_id := str(route.get("firstChoiceId", ""))
	if not first_choice_id.is_empty() and not _has_choice_event(summary, first_choice_id):
		failures.append("%s expected first dialogue choice event %s" % [route_id, first_choice_id])
	if route_id == "inquest_opened":
		if not _has_free_input_event(summary):
			failures.append("inquest_opened expected explicit recorded-statement Evidence")
		if not str(summary.get("lastWhyLine", "")).contains("꿈"):
			failures.append("inquest_opened expected final why-line to explain dream language")
		var prologue_loop: Dictionary = summary.get("prologueLoop", {})
		var end_controls: Dictionary = prologue_loop.get("endControls", {})
		if str(end_controls.get("restart", "")) != "restart_session":
			failures.append("inquest_opened expected restart_session end control")
		if str(end_controls.get("quit", "")) != "quit_session":
			failures.append("inquest_opened expected quit_session end control")
	if route_id == "soft_report":
		if bool(station.get("sessionTerminationAllowed", false)) and bool(station.get("inquestOpen", false)):
			failures.append("soft_report must stop before inquest")
		if not str(summary.get("outcomeBody", "")).contains("심문 기준에는 닿지 않았습니다"):
			failures.append("soft_report outcome must explain report without inquest")
	if route_id == "repair_recovered" and not str(summary.get("outcomeBody", "")).contains("수습"):
		failures.append("repair_recovered outcome must explain recovery")
	if route_id == "cover_held_under_suspicion":
		if int(summary.get("repairAttemptCount", 0)) != 0:
			failures.append("cover_held_under_suspicion must not record a repair attempt")
		if str(summary.get("repairState", "")) != "unused":
			failures.append("cover_held_under_suspicion must leave repairState unused")
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
	var playability: Dictionary = pack.get("playability", {})
	var route_proofs: Array = playability.get("routeProofs", [])
	if route_proofs.size() != ROUTE_PROOF_IDS.size():
		failures.append("Evidence Pack playability must include routeProofs for all Same Order outcomes")
	for expected_route in ROUTE_PROOF_IDS:
		if not _route_proofs_have(route_proofs, expected_route):
			failures.append("Evidence Pack routeProofs missing %s" % expected_route)
	return failures

func _validate_pre_conversation_recorded_statement_noop(session: Node) -> Array[String]:
	var failures: Array[String] = []
	var before := _build_summary(session)
	await _press_action(session, &"dialogue_recorded_statement")
	await _settle_frames(2)
	_call_session(session, "_refresh_hud")
	var after := _build_summary(session)
	if int(after.get("suspicion", -1)) != int(before.get("suspicion", 0)):
		failures.append("key 4 before focus/E must not change suspicion")
	if int(after.get("reportWeight", -1)) != int(before.get("reportWeight", 0)):
		failures.append("key 4 before focus/E must not change reportWeight")
	if str(after.get("sessionOutcome", "")) != "running":
		failures.append("key 4 before focus/E must not create terminal outcome, got %s" % str(after.get("sessionOutcome", "")))
	if bool(after.get("outcomeVisible", false)):
		failures.append("key 4 before focus/E must not show an outcome")
	var station: Dictionary = after.get("station", {})
	if bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)) or bool(station.get("sessionTerminationAllowed", false)):
		failures.append("key 4 before focus/E must not open Station intake, inquest, or termination")
	var events_before: Array = before.get("events", [])
	var events_after: Array = after.get("events", [])
	if events_after.size() != events_before.size():
		failures.append("key 4 before focus/E must not add Evidence events")
	var conversation: Dictionary = after.get("conversation", {})
	if not _as_array(conversation.get("history", [])).is_empty():
		failures.append("key 4 before focus/E must not create conversation history")
	return failures

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

func _validate_mid_conversation_visibility(route: Dictionary, session: Node, hud: Node) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(route.get("id", ""))
	var summary := _build_summary(session)
	if bool(summary.get("inputLocked", false)):
		return failures
	var snapshot := _hud_snapshot(hud)
	if not str(snapshot.get("consequenceLabel", "")).contains("최근 발화:"):
		failures.append("%s expected HUD consequence text to preserve recent dialogue history" % route_id)
	if not str(snapshot.get("consequenceLabel", "")).contains("turn-1:"):
		failures.append("%s expected HUD recent dialogue to include the prior turn id" % route_id)
	var reaction := _npc_reaction_snapshot(session, "NPC_Store_Clerk")
	if not bool(reaction.get("markerVisible", false)):
		failures.append("%s expected Store Clerk reaction marker to be visible after suspicion" % route_id)
	if float(reaction.get("materialAlpha", -1.0)) <= 0.16:
		failures.append("%s expected Store Clerk reaction marker material alpha to increase" % route_id)
	if float(reaction.get("emissionEnergy", -1.0)) <= 0.2:
		failures.append("%s expected Store Clerk reaction marker emission to increase" % route_id)
	return failures

func _validate_post_lock_noop(session: Node, summary: Dictionary, player: Node) -> Array[String]:
	var failures: Array[String] = []
	if session == null or not session.has_method("submit_recorded_statement"):
		return failures
	var events_before: Array = summary.get("events", [])
	var event_count_before := events_before.size()
	session.call("submit_recorded_statement")
	var post_lock_summary: Dictionary = _build_summary(session)
	if int(post_lock_summary.get("suspicion", 0)) != int(summary.get("suspicion", 0)):
		failures.append("%s post-lock input changed suspicion" % str(summary.get("routeOutcome", summary.get("sessionOutcome", ""))))
	if int(post_lock_summary.get("reportWeight", 0)) != int(summary.get("reportWeight", 0)):
		failures.append("%s post-lock input changed reportWeight" % str(summary.get("routeOutcome", summary.get("sessionOutcome", ""))))
	if post_lock_summary.get("events", []).size() != event_count_before:
		failures.append("%s post-lock input added Evidence events" % str(summary.get("routeOutcome", summary.get("sessionOutcome", ""))))
	if player != null and player.has_method("_controls_locked") and not bool(player.call("_controls_locked")):
		failures.append("%s expected player controller controls to lock after deterministic session end" % str(summary.get("routeOutcome", summary.get("sessionOutcome", ""))))
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

func _route_proof(route: Dictionary, summary: Dictionary) -> Dictionary:
	return {
		"routeId": str(route.get("id", "")),
		"inputPath": str(route.get("inputPath", "")),
		"sessionOutcome": str(summary.get("sessionOutcome", "")),
		"routeOutcome": str(summary.get("routeOutcome", "")),
		"stage": str(summary.get("stage", "")),
		"suspicion": int(summary.get("suspicion", 0)),
		"reportWeight": int(summary.get("reportWeight", 0)),
		"station": summary.get("station", {}),
		"lastWhyLine": str(summary.get("lastWhyLine", "")),
		"signals": _all_anomaly_signals(summary),
		"eventNames": _event_names(summary),
		"events": _route_events(summary)
	}

func _empty_route_proof(route: Dictionary) -> Dictionary:
	return {
		"routeId": str(route.get("id", "")),
		"inputPath": str(route.get("inputPath", "")),
		"sessionOutcome": "missing",
		"routeOutcome": "missing",
		"stage": "missing",
		"suspicion": 0,
		"reportWeight": 0,
		"station": {},
		"lastWhyLine": "",
		"signals": [],
		"eventNames": [],
		"events": []
	}

func _all_anomaly_signals(summary: Dictionary) -> Array[String]:
	var result: Array[String] = []
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "conversation_anomaly_detected":
			continue
		for signal_value in event.get("suspicionSignals", []):
			var signal_id := str(signal_value)
			if not result.has(signal_id):
				result.append(signal_id)
	return result

func _event_names(summary: Dictionary) -> Array[String]:
	var result: Array[String] = []
	for event in summary.get("events", []):
		if event is Dictionary:
			result.append(str(event.get("eventName", "")))
	return result

func _route_events(summary: Dictionary) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		var event_summary := {
			"eventId": str(event.get("eventId", "")),
			"eventName": str(event.get("eventName", ""))
		}
		if event.has("conversationStage"):
			event_summary["conversationStage"] = str(event.get("conversationStage", ""))
		if event.has("socialLoopStage"):
			event_summary["socialLoopStage"] = str(event.get("socialLoopStage", ""))
		if event.has("outcome"):
			event_summary["outcome"] = str(event.get("outcome", ""))
		if event.has("routeOutcome"):
			event_summary["routeOutcome"] = str(event.get("routeOutcome", ""))
		if event.has("suspicionAfter"):
			event_summary["suspicionAfter"] = int(event.get("suspicionAfter", 0))
		if event.has("reportWeightAfter"):
			event_summary["reportWeightAfter"] = int(event.get("reportWeightAfter", 0))
		if event.has("suspicionSignals"):
			event_summary["suspicionSignals"] = event.get("suspicionSignals", [])
		result.append(event_summary)
	return result

func _route_proofs_have(route_proofs: Array, route_id: String) -> bool:
	for item in route_proofs:
		if item is Dictionary and str(item.get("routeId", "")) == route_id:
			return true
	return false

func _hud_snapshot(hud: Node) -> Dictionary:
	if hud != null and hud.has_method("debug_snapshot"):
		var snapshot: Variant = hud.call("debug_snapshot")
		if snapshot is Dictionary:
			return snapshot
	return {}

func _npc_reaction_snapshot(context_node: Node, npc_id: String) -> Dictionary:
	if context_node == null:
		return {}
	for node in context_node.get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) != npc_id:
			continue
		if node.has_method("debug_reaction_snapshot"):
			var snapshot: Variant = node.call("debug_reaction_snapshot")
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

func _has_choice_event(summary: Dictionary, selected_choice_id: String) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "dialogue_choice_selected":
			continue
		if str(event.get("conversationId", "")) != "conv-same-order":
			continue
		if str(event.get("selectedChoiceId", "")) != selected_choice_id:
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

func _as_array(value: Variant) -> Array:
	if value is Array:
		return value
	return []

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
