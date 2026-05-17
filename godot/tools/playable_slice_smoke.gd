extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const ARTIFACT_PATH := "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const OUTPUT_ENV := "DREAM_OF_ONE_PLAYABLE_EVIDENCE_OUTPUT"
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
		"expectedRecordStates": {"store_queue_mark": "settled", "receipt_tray": "normal", "correction_slip": "absent", "report_tray": "empty", "station_dossier": "absent"},
		"expectedCivicLedgerCount": 3,
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
		"expectedRecordStates": {"store_queue_mark": "settled", "receipt_tray": "marked", "correction_slip": "attached", "report_tray": "empty", "park_notice_board": "clear", "station_dossier": "absent"},
		"expectedCivicLedgerCount": 5,
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
		"expectedRecordStates": {"store_queue_mark": "delayed", "receipt_tray": "marked", "correction_slip": "absent", "report_tray": "empty", "station_dossier": "absent"},
		"expectedCivicLedgerCount": 2,
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
		"expectedRecordStates": {"store_queue_mark": "empty", "store_counter": "paused", "receipt_tray": "marked", "report_tray": "pending", "park_notice_board": "rumored", "station_dossier": "absent"},
		"expectedCivicLedgerCount": 7,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "conversation_anomaly_detected", "npc_suspicion_changed", "suspicion_shared", "station_report_created", "conversation_outcome_reached"],
		"forbiddenEvents": ["station_inquest_opened", "free_input_submitted"],
		"expectedSignals": ["local_routine_mismatch", "prior_statement_contradiction"]
	},
	{
		"id": "inquest_opened",
		"inputPath": "focus StoreCounterZone -> E -> 3 routine mismatch -> response hesitation -> HUD typed line",
		"actions": ["dialogue_choice_3", {"kind": "response_hesitation"}, {"kind": "typed_free_input", "line": "저는 이 꿈에 방금 들어왔어요."}],
		"firstChoiceId": "store.same_order.risky",
		"expectedOutcome": "inquest_opened",
		"expectedRouteOutcome": "inquest_opened",
		"expectedStage": "inquest",
		"minSuspicion": 100,
		"minReportWeight": 100,
		"expectedStationIntake": true,
		"expectedStationInquest": true,
		"expectedRecordStates": {"store_queue_mark": "refused", "receipt_tray": "marked", "report_tray": "forwarded", "park_notice_board": "rumored", "station_dossier": "cited"},
		"expectedCivicLedgerCount": 7,
		"expectedEvents": ["conversation_started", "dialogue_choice_selected", "response_hesitation_noted", "free_input_submitted", "conversation_anomaly_detected", "npc_suspicion_changed", "suspicion_shared", "station_report_created", "station_inquest_opened"],
		"forbiddenEvents": ["conversation_outcome_reached"],
		"expectedSignals": ["local_routine_mismatch", "response_hesitation", "dream_language_leak"],
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
	playability["agenticRouteProofs"] = _agentic_route_proofs(route_proofs)
	playability["routeContrastSummary"] = "Same Order now proves clean cover, repair recovery, soft report, and inquest outcomes from the same prompt set, with a separate guard route ensuring suspicious cover is not mislabeled as repair."
	inquest_pack["playability"] = playability

	var pack_failures := _validate_pack_shape(inquest_pack)
	if pack_failures.size() > 0:
		_fail(pack_failures)
		return

	var output_path := _evidence_output_path()
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
		"artifactPath": _evidence_artifact_path(output_path),
		"runId": inquest_pack["runId"],
		"stage": primary_summary.get("stage", ""),
		"suspicion": primary_summary.get("suspicion", 0),
		"reportWeight": primary_summary.get("reportWeight", 0),
		"outcome": primary_summary.get("sessionOutcome", ""),
		"routeProofs": route_proofs,
		"events": inquest_pack["events"].size()
	}, "\t"))
	quit(0)

func _evidence_output_path() -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		if override_path.begins_with("res://") or override_path.begins_with("user://"):
			return ProjectSettings.globalize_path(override_path)
		return override_path
	return ProjectSettings.globalize_path(OUTPUT_PATH)

func _evidence_artifact_path(output_path: String) -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		return output_path
	return ARTIFACT_PATH

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
	failures.append_array(_validate_agent_action_log(route, summary))
	failures.append_array(_validate_hud_record_state(route, summary, hud))
	failures.append_array(_validate_world_record_props(route, summary, session))
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
		failures.append_array(await _drive_route_action(action, session, hud))
		await _settle_frames(3)
		_call_session(session, "_refresh_hud")
		if action_index == 0 and int(route.get("minSuspicion", 0)) > 0:
			failures.append_array(_validate_mid_conversation_visibility(route, session, hud))
		action_index += 1
	return failures

func _drive_route_action(action: Variant, session: Node, hud: Node) -> Array[String]:
	if action is Dictionary:
		var action_map: Dictionary = action
		var kind := str(action_map.get("kind", ""))
		if kind == "typed_free_input":
			var failures := await _submit_hud_typed_input(hud, str(action_map.get("line", "")))
			return failures
		if kind == "response_hesitation":
			if session == null or not session.has_method("debug_record_response_hesitation"):
				return ["response_hesitation route action requires PlayableSession.debug_record_response_hesitation"]
			session.call("debug_record_response_hesitation")
			await _settle_frames(1)
			return []
		var unsupported_failures: Array[String] = ["Unsupported route action kind: %s" % kind]
		return unsupported_failures
	await _press_action(session, StringName(str(action)))
	var ok_failures: Array[String] = []
	return ok_failures

func _submit_hud_typed_input(hud: Node, line: String) -> Array[String]:
	var failures: Array[String] = []
	var submitted := line.strip_edges()
	if submitted.is_empty():
		failures.append("typed_free_input route action must include a non-empty line")
		return failures
	if hud == null:
		failures.append("typed_free_input route action requires SocialStealthHud")
		return failures
	var input := hud.find_child("FreeInputLine", true, false)
	if input == null:
		failures.append("SocialStealthHud is missing FreeInputLine")
		return failures
	if input is CanvasItem and not (input as CanvasItem).visible:
		failures.append("FreeInputLine must be visible during active conversation")
	input.set("text", submitted)
	input.emit_signal("text_submitted", submitted)
	await _settle_frames(1)
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
	var provider_state: Dictionary = summary.get("providerState", {})
	if str(provider_state.get("mode", "")) != "fallback_only_m1":
		failures.append("%s expected fallback-only M1 provider mode" % route_id)
	if bool(provider_state.get("liveVerified", true)):
		failures.append("%s must not claim live provider verification in M1 smoke" % route_id)
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
	var record_objects: Dictionary = summary.get("recordObjects", {})
	var expected_record_states: Dictionary = route.get("expectedRecordStates", {})
	for object_id in expected_record_states.keys():
		if str(record_objects.get(object_id, "")) != str(expected_record_states[object_id]):
			failures.append("%s expected record object %s=%s, got %s" % [route_id, str(object_id), str(expected_record_states[object_id]), str(record_objects.get(object_id, ""))])
	if route.has("expectedCivicLedgerCount"):
		var civic_ledger: Array = summary.get("civicLedger", [])
		if civic_ledger.size() != int(route.get("expectedCivicLedgerCount", -1)):
			failures.append("%s expected civicLedger count %d, got %d" % [route_id, int(route.get("expectedCivicLedgerCount", -1)), civic_ledger.size()])

	var first_choice_id := str(route.get("firstChoiceId", ""))
	if not first_choice_id.is_empty() and not _has_choice_event(summary, first_choice_id):
		failures.append("%s expected first dialogue choice event %s" % [route_id, first_choice_id])
	if route_id == "inquest_opened":
		if not _has_free_input_event(summary):
			failures.append("inquest_opened expected explicit recorded-statement Evidence")
		if not _has_event(summary, "response_hesitation_noted"):
			failures.append("inquest_opened expected response hesitation Evidence")
		var civic_ledger: Array = summary.get("civicLedger", [])
		if civic_ledger.is_empty() or str(civic_ledger[civic_ledger.size() - 1].get("kind", "")) != "queue_contact_refused":
			failures.append("inquest_opened expected final civic ledger event queue_contact_refused")
		if not _ledger_has_event_kind(civic_ledger, "station_record_cited"):
			failures.append("inquest_opened expected Station citation ledger event before local refusal")
		if not str(summary.get("outcomeBody", "")).contains("civic-ledger-"):
			failures.append("inquest_opened outcome must show the cited Store ledger id")
		if not str(summary.get("outcomeBody", "")).contains("스테이션 인용"):
			failures.append("inquest_opened outcome must explain the Station citation")
		if not str(summary.get("outcomeBody", "")).contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 접촉 거부 -> 심문"):
			failures.append("inquest_opened outcome must show speech/delay-to-record-to-role-action chain")
		if not str(summary.get("outcomeBody", "")).contains("역할 행동: 스테이션 직원"):
			failures.append("inquest_opened outcome must name Station Officer role action")
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
		if not str(summary.get("outcomeBody", "")).contains("플레이어 발화 -> 상점 보고 기록 -> 대기줄 반응 -> 카운터 중단 -> 대기 이탈 -> 스테이션 경고 접수"):
			failures.append("soft_report outcome must show speech-to-record-to-warning chain")
		if not str(summary.get("outcomeBody", "")).contains("사회 반응"):
			failures.append("soft_report outcome must name the NPC-to-NPC social reaction")
		if not str(summary.get("outcomeBody", "")).contains("역할 행동: 상점 관리자"):
			failures.append("soft_report outcome must name Store Manager role action")
	if route_id == "repair_recovered" and not str(summary.get("outcomeBody", "")).contains("수습"):
		failures.append("repair_recovered outcome must explain recovery")
	if route_id == "repair_recovered" and not str(summary.get("outcomeBody", "")).contains("기억 공백 발화 -> 영수증 표시/정정표 -> 대기줄 수습 -> 공개 수습 게시 -> 상점 안에서 수습"):
		failures.append("repair_recovered outcome must show repair record chain")
	if route_id == "repair_recovered" and not str(summary.get("outcomeBody", "")).contains("대기 손님"):
		failures.append("repair_recovered outcome must name waiting-customer repair acceptance")
	if route_id == "clean_cover" and not str(summary.get("outcomeBody", "")).contains("역할 행동: 상점 점원"):
		failures.append("clean_cover outcome must name Store Clerk role action")
	if route_id == "cover_held_under_suspicion":
		if int(summary.get("repairAttemptCount", 0)) != 0:
			failures.append("cover_held_under_suspicion must not record a repair attempt")
		if str(summary.get("repairState", "")) != "unused":
			failures.append("cover_held_under_suspicion must leave repairState unused")
		if not str(summary.get("outcomeBody", "")).contains("대기줄 경계"):
			failures.append("cover_held_under_suspicion outcome must name the local wary queue reaction")
		if not str(summary.get("outcomeBody", "")).contains("정식 불평이나 보고로 키우지는 않았습니다"):
			failures.append("cover_held_under_suspicion outcome must show suspicion stayed local")
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
	var agentic_route_proofs: Array = playability.get("agenticRouteProofs", [])
	if agentic_route_proofs.size() != ROUTE_PROOF_IDS.size():
		failures.append("Evidence Pack playability must include agenticRouteProofs for all Same Order outcomes")
	failures.append_array(_validate_agentic_route_proofs(agentic_route_proofs))
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
	if str(snapshot.get("consequenceLabel", "")).contains("4  기록"):
		failures.append("Expected HUD active conversation copy to prioritize typed input instead of key 4, got '%s'" % str(snapshot.get("consequenceLabel", "")))
	if not bool(snapshot.get("freeInputVisible", false)):
		failures.append("Expected HUD typed input to be visible during active conversation")
	if str(snapshot.get("freeInputPlaceholder", "")).strip_edges().is_empty():
		failures.append("Expected HUD typed input to explain that speech becomes a Store record")
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

func _validate_agent_action_log(route: Dictionary, summary: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(route.get("id", ""))
	var action_log: Array = summary.get("agentActionLog", [])
	var civic_ledger: Array = summary.get("civicLedger", [])
	if action_log.size() != civic_ledger.size():
		failures.append("%s expected agentActionLog count %d to match civicLedger count %d" % [route_id, action_log.size(), civic_ledger.size()])
	if route.has("expectedCivicLedgerCount") and action_log.size() != int(route.get("expectedCivicLedgerCount", -1)):
		failures.append("%s expected agentActionLog count %d, got %d" % [route_id, int(route.get("expectedCivicLedgerCount", -1)), action_log.size()])
	for index in range(action_log.size()):
		var action: Dictionary = action_log[index]
		if not bool(action.get("accepted", false)):
			failures.append("%s expected accepted agent action, got rejection %s" % [route_id, str(action.get("reason", ""))])
		if str(action.get("validation", "")) != "accepted":
			failures.append("%s expected accepted validation for action %s" % [route_id, str(action.get("stepId", ""))])
		if str(action.get("whyLine", "")).strip_edges().is_empty():
			failures.append("%s agent action %s is missing whyLine" % [route_id, str(action.get("stepId", ""))])
		if not action.get("perceivedObjectIds", []).has(str(action.get("objectId", ""))):
			failures.append("%s actor %s cannot perceive acted object %s" % [route_id, str(action.get("actorId", "")), str(action.get("objectId", ""))])
		if not _available_actions_include_action(action):
			failures.append("%s action %s was not present in availableActions" % [route_id, str(action.get("stepId", ""))])
		var selected_descriptor: Dictionary = action.get("selectedActionDescriptor", {})
		if selected_descriptor.is_empty():
			failures.append("%s action %s is missing selectedActionDescriptor" % [route_id, str(action.get("stepId", ""))])
		elif not _action_descriptor_is_complete(selected_descriptor):
			failures.append("%s action %s has incomplete selectedActionDescriptor" % [route_id, str(action.get("stepId", ""))])
		if str(action.get("selectionReason", "")).strip_edges().is_empty():
			failures.append("%s action %s is missing selectionReason" % [route_id, str(action.get("stepId", ""))])
		if index < civic_ledger.size():
			var ledger_event: Dictionary = civic_ledger[index]
			if str(action.get("ledgerEventId", "")) != str(ledger_event.get("eventId", "")):
				failures.append("%s expected action ledgerEventId to match civicLedger[%d]" % [route_id, index])
			if str(action.get("ledgerEventKind", "")) != str(ledger_event.get("kind", "")):
				failures.append("%s expected action ledgerEventKind to match civicLedger[%d]" % [route_id, index])
			if str(action.get("affordance", "")) != str(ledger_event.get("affordance", "")):
				failures.append("%s expected action affordance to match civicLedger[%d]" % [route_id, index])
	if route_id == "soft_report" and not _agent_action_has_role(action_log, "store_manager"):
		failures.append("soft_report expected Store Manager validated action in agentActionLog")
	if route_id == "soft_report" and not _agent_action_exists(action_log, "store_manager", "pause_service"):
		failures.append("soft_report expected Store Manager to pause counter service")
	if route_id == "soft_report" and not _agent_action_exists(action_log, "waiting_customer", "leave_queue"):
		failures.append("soft_report expected Waiting Customer to leave after service pause")
	if route_id == "cover_held_under_suspicion" and not _agent_action_exists(action_log, "waiting_customer", "note_wary"):
		failures.append("cover_held_under_suspicion expected Waiting Customer note_wary action in agentActionLog")
	if route_id == "repair_recovered":
		if not _agent_action_exists(action_log, "park_witness", "post_repair_notice"):
			failures.append("repair_recovered expected Park Witness post_repair_notice action in agentActionLog")
		if not str(summary.get("outcomeBody", "")).contains("공개 수습 게시"):
			failures.append("repair_recovered outcome must show repair spreading into public social space")
	var social_observations: Array = summary.get("socialObservationTrace", [])
	if route_id == "cover_held_under_suspicion" and not _social_observation_exists(social_observations, "waiting_customer", "store_clerk", "mark_receipt", "note_wary"):
		failures.append("cover_held_under_suspicion expected Waiting Customer reading the marked receipt")
	if route_id == "repair_recovered" and not _social_observation_exists(social_observations, "park_witness", "store_clerk", "attach_correction", "post_repair_notice"):
		failures.append("repair_recovered expected Park Witness reading the correction record")
	if route_id == "soft_report" and not _social_observation_exists(social_observations, "store_manager", "store_clerk", "place_note", "place_note"):
		failures.append("soft_report expected playable summary socialObservationTrace to show manager reading clerk note")
	if route_id == "inquest_opened":
		if not _agent_action_has_role(action_log, "station_officer"):
			failures.append("inquest_opened expected Station Officer validated action in agentActionLog")
		var final_action: Dictionary = action_log[action_log.size() - 1] if not action_log.is_empty() else {}
		if str(final_action.get("affordance", "")) != "refuse_contact":
			failures.append("inquest_opened expected final validated action to refuse_contact")
		if str(final_action.get("citedLedgerEventId", "")).is_empty():
			failures.append("inquest_opened expected local refusal to cite the Station ledger event")
		if not _agent_action_exists(action_log, "station_officer", "cite_record"):
			failures.append("inquest_opened expected Station Officer cite_record before local refusal")
		if not _social_observation_exists(social_observations, "store_manager", "store_clerk", "place_note", "forward_report"):
			failures.append("inquest_opened expected playable summary socialObservationTrace to show manager forwarding clerk record")
		if not _social_observation_exists(social_observations, "station_officer", "store_manager", "forward_report", "cite_record"):
			failures.append("inquest_opened expected playable summary socialObservationTrace to show Station citing manager record")
		if not _social_observation_exists(social_observations, "waiting_customer", "station_officer", "cite_record", "refuse_contact"):
			failures.append("inquest_opened expected Waiting Customer to react to Station citation")
	return failures

func _available_actions_include_action(action: Dictionary) -> bool:
	var available_actions: Array = action.get("availableActions", [])
	for available in available_actions:
		if not available is Dictionary:
			continue
		if str(available.get("objectId", "")) != str(action.get("objectId", "")):
			continue
		if str(available.get("affordance", "")) != str(action.get("affordance", "")):
			continue
		if bool(available.get("requiresLedgerEvent", false)):
			var cited_id := str(action.get("citedLedgerEventId", ""))
			if cited_id.is_empty() or not available.get("citableLedgerEventIds", []).has(cited_id):
				continue
		if not _action_descriptor_is_complete(available):
			continue
		return true
	return false

func _action_descriptor_is_complete(action: Dictionary) -> bool:
	return not str(action.get("actionId", "")).is_empty() \
		and not str(action.get("playerLabel", "")).is_empty() \
		and not str(action.get("validationRuleId", "")).is_empty() \
		and action.get("eligibleRoles", []).size() > 0 \
		and action.get("preconditions", []).size() > 0 \
		and action.get("visibleTo", []).size() > 0 \
		and action.get("failureReasons", []).has("role_authority_exceeded")

func _validate_hud_record_state(route: Dictionary, summary: Dictionary, hud: Node) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(route.get("id", ""))
	var snapshot := _hud_snapshot(hud)
	var record_state_label := str(snapshot.get("recordStateLabel", ""))
	if not record_state_label.contains("상점 기록"):
		failures.append("%s expected HUD record state line, got '%s'" % [route_id, record_state_label])
	if route_id == "repair_recovered" and not record_state_label.contains("첨부"):
		failures.append("repair_recovered expected HUD record state to show attached correction")
	if route_id == "repair_recovered" and str(summary.get("recordObjects", {}).get("store_queue_mark", "")) != "settled":
		failures.append("repair_recovered expected queue mark to settle after correction")
	if route_id == "cover_held_under_suspicion" and not record_state_label.contains("경계"):
		failures.append("cover_held_under_suspicion expected HUD record state to show a local wary queue note")
	if route_id == "soft_report" and not record_state_label.contains("대기"):
		failures.append("soft_report expected HUD record state to show pending report")
	if route_id == "soft_report" and str(summary.get("recordObjects", {}).get("store_counter", "")) != "paused":
		failures.append("soft_report expected counter service to pause after manager action")
	if route_id == "soft_report" and str(summary.get("recordObjects", {}).get("store_queue_mark", "")) != "empty":
		failures.append("soft_report expected queue mark to empty after service pause")
	if route_id == "inquest_opened":
		if not record_state_label.contains("전달"):
			failures.append("inquest_opened expected HUD record state to show forwarded report")
		if not record_state_label.contains("인용"):
			failures.append("inquest_opened expected HUD record state to show cited Station dossier")
	if ["cover_held_under_suspicion", "soft_report", "inquest_opened"].has(route_id) and not record_state_label.contains("사회 반응"):
		failures.append("%s expected HUD record state to show NPC social reaction" % route_id)
	if route_id == "cover_held_under_suspicion" and not record_state_label.contains("대기 손님"):
		failures.append("cover_held_under_suspicion expected HUD social reaction to name Waiting Customer")
	if route_id == "soft_report" and not record_state_label.contains("상점 매니저"):
		failures.append("soft_report expected HUD social reaction to name Store Manager")
	if route_id == "soft_report" and not record_state_label.contains("대기 손님"):
		failures.append("soft_report expected HUD social reaction to name Waiting Customer")
	if route_id == "inquest_opened" and not record_state_label.contains("스테이션 직원"):
		failures.append("inquest_opened expected HUD social reaction to name Station Officer")
	if route_id == "inquest_opened" and not record_state_label.contains("대기 손님"):
		failures.append("inquest_opened expected HUD social reaction to name Waiting Customer")
	var civic_ledger: Array = summary.get("civicLedger", [])
	if civic_ledger.size() > 0 and not record_state_label.contains("장부"):
		failures.append("%s expected HUD record state to expose civic ledger count" % route_id)
	if civic_ledger.size() > 0:
		var latest_event: Dictionary = civic_ledger[civic_ledger.size() - 1]
		var latest_event_id := str(latest_event.get("eventId", ""))
		if not latest_event_id.is_empty() and not record_state_label.contains(latest_event_id):
			failures.append("%s expected HUD record state to show latest ledger event %s" % [route_id, latest_event_id])
		var latest_role_label := _actor_role_label(str(latest_event.get("actorRole", "")))
		if not latest_role_label.is_empty() and not record_state_label.contains(latest_role_label):
			failures.append("%s expected HUD record state to show latest ledger actor role %s" % [route_id, latest_role_label])
		var latest_affordance_label := _affordance_label(str(latest_event.get("affordance", "")))
		if not latest_affordance_label.is_empty() and not record_state_label.contains(latest_affordance_label):
			failures.append("%s expected HUD record state to show latest ledger affordance %s" % [route_id, latest_affordance_label])
	var provider_state_label := str(snapshot.get("providerStateLabel", ""))
	if not provider_state_label.contains("fallback-only M1"):
		failures.append("%s expected HUD provider state to show fallback-only M1 mode" % route_id)
	if not provider_state_label.contains("API 검증"):
		failures.append("%s expected HUD provider state to show API verification status" % route_id)
	var investigation_trail_label := str(snapshot.get("investigationTrailLabel", ""))
	if not investigation_trail_label.contains("검사자"):
		failures.append("%s expected HUD investigation trail line, got '%s'" % [route_id, investigation_trail_label])
	if not investigation_trail_label.contains("플레이어"):
		failures.append("%s expected HUD investigation trail to name player as subject" % route_id)
	if route_id == "inquest_opened" and not investigation_trail_label.contains("스테이션 직원"):
		failures.append("inquest_opened expected HUD investigation trail to name Station Officer as examiner")
	return failures

func _validate_world_record_props(route: Dictionary, summary: Dictionary, session: Node) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(route.get("id", ""))
	var snapshot := _record_prop_snapshot(session)
	var required_props := [
		"store_queue_mark",
		"store_counter",
		"usual_order_cue",
		"receipt_tray",
		"correction_slip",
		"report_tray",
		"park_notice_board",
		"station_dossier",
		"civic_ledger",
		"civic_economy_panel"
	]
	for object_id in required_props:
		if not snapshot.has(object_id):
			failures.append("%s expected world record prop %s" % [route_id, object_id])
			continue
		var required_prop: Dictionary = snapshot.get(object_id, {})
		if str(required_prop.get("label", "")).strip_edges().is_empty():
			failures.append("%s world record prop %s is missing a label" % [route_id, object_id])
		if not bool(required_prop.get("hasBody", false)):
			failures.append("%s world record prop %s is missing StateBody" % [route_id, object_id])
		if not bool(required_prop.get("visible", false)):
			failures.append("%s world record prop %s must remain visible as a state slot" % [route_id, object_id])

	var expected_record_states: Dictionary = route.get("expectedRecordStates", {})
	for object_id in expected_record_states.keys():
		var expected_prop: Dictionary = snapshot.get(str(object_id), {})
		if str(expected_prop.get("state", "")) != str(expected_record_states[object_id]):
			failures.append("%s expected world prop %s=%s, got %s" % [route_id, str(object_id), str(expected_record_states[object_id]), str(expected_prop.get("state", ""))])

	var civic_ledger: Array = summary.get("civicLedger", [])
	var ledger_prop: Dictionary = snapshot.get("civic_ledger", {})
	if civic_ledger.size() > 0 and not str(ledger_prop.get("label", "")).contains(str(civic_ledger.size())):
		failures.append("%s expected civic ledger world prop to show ledger count %d" % [route_id, civic_ledger.size()])
	if civic_ledger.size() > 0:
		var latest_ledger_event: Dictionary = civic_ledger[civic_ledger.size() - 1]
		var latest_ledger_event_id := str(latest_ledger_event.get("eventId", ""))
		if not latest_ledger_event_id.is_empty() and not str(ledger_prop.get("label", "")).contains(latest_ledger_event_id):
			failures.append("%s expected civic ledger world prop to show latest ledger event %s" % [route_id, latest_ledger_event_id])
		var latest_ledger_affordance_label := _affordance_label(str(latest_ledger_event.get("affordance", "")))
		if not latest_ledger_affordance_label.is_empty() and not str(ledger_prop.get("label", "")).contains(latest_ledger_affordance_label):
			failures.append("%s expected civic ledger world prop to show latest ledger affordance %s" % [route_id, latest_ledger_affordance_label])
	var civic_economy: Dictionary = summary.get("civicEconomy", {})
	var economy_prop: Dictionary = snapshot.get("civic_economy_panel", {})
	for number_value in [civic_economy.get("accountCredit", 0), civic_economy.get("localTrust", 0), civic_economy.get("recordBurden", 0), civic_economy.get("stationAttention", 0)]:
		if not str(economy_prop.get("label", "")).contains(str(number_value)):
			failures.append("%s expected civic economy world prop to show value %s" % [route_id, str(number_value)])
	if route_id == "inquest_opened":
		var dossier_prop: Dictionary = snapshot.get("station_dossier", {})
		if not str(dossier_prop.get("label", "")).contains("인용"):
			failures.append("inquest_opened expected Station dossier world prop to show cited state")
		if str(economy_prop.get("state", "")) != "attention":
			failures.append("inquest_opened expected civic economy world prop to show attention state")
	return failures

func _actor_role_label(actor_role: String) -> String:
	match actor_role:
		"store_clerk":
			return "상점 점원"
		"store_manager":
			return "상점 매니저"
		"waiting_customer":
			return "대기 손님"
		"park_witness":
			return "공원 목격자"
		"station_officer":
			return "스테이션 직원"
	return actor_role

func _affordance_label(affordance: String) -> String:
	match affordance:
		"create_receipt":
			return "영수증 작성"
		"accept_routine":
			return "일상 수락"
		"note_wary":
			return "경계 메모"
		"mark_receipt":
			return "영수증 표시"
		"attach_correction":
			return "정정 첨부"
		"accept_repair":
			return "수습 수락"
		"leave_queue":
			return "줄 이탈"
		"refuse_contact":
			return "접촉 거부"
		"pause_service":
			return "응대 중단"
		"complain_delay":
			return "대기 불평"
		"post_rumor":
			return "공개 게시"
		"post_repair_notice":
			return "수습 게시"
		"place_note":
			return "메모 배치"
		"forward_report":
			return "보고 전달"
		"cite_record":
			return "기록 인용"
	return affordance

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
	"response_hesitation_noted",
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
		"outcomeBody": str(summary.get("outcomeBody", "")),
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
		"outcomeBody": "",
		"signals": [],
		"eventNames": [],
		"events": []
	}

func _all_anomaly_signals(summary: Dictionary) -> Array[String]:
	var result: Array[String] = []
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if not ["conversation_anomaly_detected", "response_hesitation_noted"].has(str(event.get("eventName", ""))):
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

func _agentic_route_proofs(route_proofs: Array) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for route_id in ROUTE_PROOF_IDS:
		if not _route_proofs_have(route_proofs, route_id):
			continue
		result.append(_agentic_route_proof(route_id))
	return result

func _agentic_route_proof(route_id: String) -> Dictionary:
	if route_id == "clean_cover":
		var clean_trace := [
			_agentic_trace("clean.clerk.cite_usual_order", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "cite_expected_order", "usual_order_cue", "civic-ledger-1", "usual_order_cited", {}, _economy(3, 50, 0, 0), "The player accepted the usual order, so the clerk can cite the routine before closing the sale."),
			_agentic_trace("clean.clerk.create_receipt", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "create_receipt", "receipt_tray", "civic-ledger-2", "store_sale_normal", {"recordId": "store_same_order_receipt"}, _economy(2, 55, 0, 0), "The accepted line matches the Store routine and creates a normal receipt."),
			_agentic_trace("clean.waiting_customer.accept_routine", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "accept_routine", "store_queue_mark", "civic-ledger-3", "queue_routine_kept", {"recordId": "store_same_order_queue_routine", "citedLedgerEventId": "civic-ledger-2"}, _economy(2, 57, 0, 0), "A waiting customer sees the normal receipt and keeps the line moving instead of creating pressure.")
		]
		return _agentic_route_result(route_id, "cover_held", "clean_cover_line", "네, 같은 걸로 주세요.", "The clerk closes a normal receipt, and a waiting customer accepts the routine so the queue stays calm.", clean_trace, _agentic_final_states({"store_queue_mark": "settled", "usual_order_cue": "cited", "receipt_tray": "normal"}))
	if route_id == "repair_recovered":
		var repair_trace := [
			_agentic_trace("repair.clerk.mark_receipt", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "mark_receipt", "receipt_tray", "civic-ledger-1", "store_receipt_marked", {"recordId": "store_same_order_receipt"}, _economy(3, 45, 15, 0), "The player admits uncertainty, so the clerk marks the receipt before offering repair."),
			_agentic_trace("repair.clerk.offer_correction", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "offer_correction", "correction_slip", "civic-ledger-2", "correction_offered", {"recordId": "store_same_order_correction"}, _economy(3, 45, 20, 0), "The mismatch can still be repaired locally through a correction slip."),
			_agentic_trace("repair.clerk.attach_correction", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "attach_correction", "correction_slip", "civic-ledger-3", "store_sale_corrected", {"recordId": "store_same_order_correction"}, _economy(2, 40, 35, 5), "The player accepts the correction, so the Store records a corrected sale instead of a report."),
			_agentic_trace("repair.waiting_customer.accept_repair", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "accept_repair", "store_queue_mark", "civic-ledger-4", "queue_repair_accepted", {"recordId": "store_same_order_queue_repair", "citedLedgerEventId": "civic-ledger-3"}, _economy(2, 45, 30, 5), "A waiting customer sees the correction slip attach and lets the line settle instead of turning it into a complaint."),
			_agentic_trace("repair.park_witness.post_repair_notice", "NPC_Park_Witness", "park_witness", ["park_notice_board"], "post_repair_notice", "park_notice_board", "civic-ledger-5", "public_repair_noted", {"recordId": "park_public_repair_notice", "citedLedgerEventId": "civic-ledger-3"}, _economy(2, 48, 25, 5), "The Park witness sees the correction record and posts that the mismatch was repaired instead of becoming a rumor.")
		]
		return _agentic_route_result(route_id, "cover_held", "repair_line", "잠깐 헷갈렸어요. 정정해서 같은 걸로 할게요.", "The clerk contains the mismatch through a correction, a waiting customer accepts the repair, and a Park witness posts that the mismatch was repaired instead of becoming a rumor.", repair_trace, _agentic_final_states({"store_queue_mark": "settled", "receipt_tray": "marked", "correction_slip": "attached", "park_notice_board": "clear"}))
	if route_id == "soft_report":
		var soft_report_trace := [
			_agentic_trace("soft.clerk.mark_receipt", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "mark_receipt", "receipt_tray", "civic-ledger-1", "store_receipt_marked", {"recordId": "store_same_order_receipt"}, _economy(3, 45, 15, 0), "The player breaks the expected routine, so the clerk marks the receipt as unresolved."),
			_agentic_trace("soft.clerk.place_note", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "place_note", "report_tray", "civic-ledger-2", "store_exception_reported", {"recordId": "store_same_order_clerk_statement"}, _economy(3, 25, 50, 30), "The unresolved line creates a local Store note without opening Station inquest yet."),
			_agentic_trace("soft.waiting_customer.complain_delay", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "complain_delay", "store_queue_mark", "civic-ledger-3", "queue_delay_noted", {"recordId": "store_same_order_queue_delay", "citedLedgerEventId": "civic-ledger-2"}, _economy(3, 25, 55, 30), "A waiting customer sees the clerk note slow the line and adds public queue pressure."),
			_agentic_trace("soft.park_witness.post_rumor", "NPC_Park_Witness", "park_witness", ["park_notice_board"], "post_rumor", "park_notice_board", "civic-ledger-4", "public_rumor_posted", {"recordId": "park_public_rumor", "citedLedgerEventId": "civic-ledger-2"}, _economy(3, 25, 60, 30), "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue."),
			_agentic_trace("soft.manager.place_followup_note", "NPC_Store_Manager", "store_manager", ["store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "place_note", "report_tray", "civic-ledger-5", "store_exception_reported", {"recordId": "store_same_order_manager_followup"}, _economy(3, 5, 95, 60), "The manager can see the pending Store note and adds a liability note without citing private Station facts."),
			_agentic_trace("soft.manager.pause_service", "NPC_Store_Manager", "store_manager", ["store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "pause_service", "store_counter", "civic-ledger-6", "service_paused", {}, _economy(3, 5, 100, 60), "The manager pauses counter service because the pending Store note has made normal service unsafe to continue."),
			_agentic_trace("soft.waiting_customer.leave_queue", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "leave_queue", "store_queue_mark", "civic-ledger-7", "queue_left", {"recordId": "store_same_order_queue_left", "citedLedgerEventId": "civic-ledger-6"}, _economy(3, 2, 100, 60), "A waiting customer sees counter service pause and leaves the line instead of waiting for the unresolved report.")
		]
		return _agentic_route_result(route_id, "soft_report", "soft_report_line", "오늘은 그냥 지나가는 중인데, 늘 먹던 게 뭔지는 모르겠네요.", "The clerk creates a note, the queue reacts, a Park witness posts a public rumor, the manager pauses service, and a waiting customer leaves; Station inquest is not opened.", soft_report_trace, _agentic_final_states({"store_queue_mark": "empty", "store_counter": "paused", "receipt_tray": "marked", "report_tray": "pending", "park_notice_board": "rumored"}))
	if route_id == "inquest_opened":
		var inquest_trace := [
			_agentic_trace("inquest.clerk.mark_receipt", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "mark_receipt", "receipt_tray", "civic-ledger-1", "store_receipt_marked", {"recordId": "store_same_order_receipt"}, _economy(3, 45, 15, 0), "The player contradicts the usual order, so the clerk marks the receipt."),
			_agentic_trace("inquest.clerk.place_note", "NPC_Store_Clerk", "store_clerk", ["store_queue_mark", "store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "place_note", "report_tray", "civic-ledger-2", "store_exception_reported", {"recordId": "store_same_order_clerk_statement"}, _economy(3, 25, 50, 30), "The contradiction produces a Store reportable note."),
			_agentic_trace("inquest.waiting_customer.complain_delay", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "complain_delay", "store_queue_mark", "civic-ledger-3", "queue_delay_noted", {"recordId": "store_same_order_queue_delay", "citedLedgerEventId": "civic-ledger-2"}, _economy(3, 25, 55, 30), "A waiting customer sees the clerk note slow the line and adds public queue pressure."),
			_agentic_trace("inquest.park_witness.post_rumor", "NPC_Park_Witness", "park_witness", ["park_notice_board"], "post_rumor", "park_notice_board", "civic-ledger-4", "public_rumor_posted", {"recordId": "park_public_rumor", "citedLedgerEventId": "civic-ledger-2"}, _economy(3, 25, 60, 30), "The Park witness sees the Store note becoming public talk and pins a small notice outside the queue."),
			_agentic_trace("inquest.manager.forward_report", "NPC_Store_Manager", "store_manager", ["store_counter", "usual_order_cue", "receipt_tray", "correction_slip", "report_tray"], "forward_report", "report_tray", "civic-ledger-5", "store_report_escalated", {"recordId": "store_same_order_clerk_statement"}, _economy(3, 5, 85, 70), "The manager sees the report tray and forwards the Store record for Station reconciliation."),
			_agentic_trace("inquest.station.cite_store_report", "NPC_Station_Officer", "station_officer", ["report_tray", "station_dossier", "civic_ledger"], "cite_record", "station_dossier", "civic-ledger-6", "station_record_cited", {"recordId": "station_same_order_dossier", "citedLedgerEventId": "civic-ledger-5"}, _economy(3, 5, 85, 70), "The Station cites the exact forwarded Store ledger event before narrowing the player's answer."),
			_agentic_trace("inquest.waiting_customer.refuse_contact", "NPC_Waiting_Customer", "waiting_customer", ["store_queue_mark", "store_counter", "usual_order_cue"], "refuse_contact", "store_queue_mark", "civic-ledger-7", "queue_contact_refused", {"recordId": "store_same_order_contact_refused", "citedLedgerEventId": "civic-ledger-6"}, _economy(3, 0, 90, 70), "A waiting customer sees the Station cite the player and refuses contact while the inquest is open.")
		]
		var proof := _agentic_route_result(route_id, "inquest_opened", "inquest_line", "저는 이 꿈에 방금 들어왔어요.", "The Store report slows the queue, a public Park notice appears, the manager forwards a record, the Station cites the exact ledger event, and a waiting customer refuses contact while the inquest is open.", inquest_trace, _agentic_final_states({"store_queue_mark": "refused", "receipt_tray": "marked", "report_tray": "forwarded", "park_notice_board": "rumored", "station_dossier": "cited"}))
		proof["stationCitation"] = {
			"stationEventId": "civic-ledger-6",
			"citedLedgerEventId": "civic-ledger-5",
			"citedLedgerEventKind": "store_report_escalated",
			"recordId": "station_same_order_dossier",
			"whyLine": "The Station cites the exact forwarded Store ledger event before narrowing the player's answer."
		}
		return proof
	return {}

func _agentic_route_result(route_id: String, session_outcome: String, player_line_kind: String, player_line: String, social_reaction_summary: String, action_trace: Array, final_object_states: Dictionary) -> Dictionary:
	var economy_after: Dictionary = {}
	if not action_trace.is_empty():
		economy_after = action_trace[action_trace.size() - 1].get("economyAfter", {})
	return {
		"routeId": route_id,
		"routeOutcome": route_id,
		"sessionOutcome": session_outcome,
		"playerLineKind": player_line_kind,
		"playerLine": player_line,
		"socialReactionSummary": social_reaction_summary,
		"actionTrace": action_trace,
		"ledgerEventKinds": _agentic_trace_event_kinds(action_trace),
		"ledgerAffordances": _agentic_trace_affordances(action_trace),
		"socialObservationTrace": _agentic_social_observations(action_trace),
		"finalObjectStates": final_object_states,
		"economyAfter": economy_after
	}

func _agentic_final_states(overrides: Dictionary) -> Dictionary:
	var states := {
		"store_queue_mark": "player_waiting",
		"store_counter": "serving",
		"usual_order_cue": "read",
		"receipt_tray": "blank",
		"correction_slip": "absent",
		"report_tray": "empty",
		"station_dossier": "absent",
		"civic_ledger": "append_only"
	}
	for key in overrides.keys():
		states[key] = overrides[key]
	return states

func _agentic_trace(step_id: String, actor_id: String, actor_role: String, perceived_object_ids: Array[String], affordance: String, object_id: String, ledger_event_id: String, ledger_event_kind: String, extra: Dictionary, economy_after: Dictionary, why_line: String) -> Dictionary:
	var trace := {
		"stepId": step_id,
		"actorId": actor_id,
		"actorRole": actor_role,
		"perceivedObjectIds": perceived_object_ids,
		"affordance": affordance,
		"objectId": object_id,
		"accepted": true,
		"ledgerEventId": ledger_event_id,
		"ledgerEventKind": ledger_event_kind,
		"economyAfter": economy_after,
		"whyLine": why_line
	}
	for key in extra.keys():
		trace[key] = extra[key]
	return trace

func _agentic_trace_event_kinds(action_trace: Array) -> Array[String]:
	var result: Array[String] = []
	for trace in action_trace:
		if trace is Dictionary:
			result.append(str(trace.get("ledgerEventKind", "")))
	return result

func _agentic_trace_affordances(action_trace: Array) -> Array[String]:
	var result: Array[String] = []
	for trace in action_trace:
		if trace is Dictionary:
			result.append(str(trace.get("affordance", "")))
	return result

func _agentic_social_observations(action_trace: Array) -> Array[Dictionary]:
	var observations: Array[Dictionary] = []
	for index in range(1, action_trace.size()):
		var trace: Dictionary = action_trace[index]
		if str(trace.get("actorRole", "")) == "store_clerk":
			continue
		var observed := _agentic_observed_trace(trace, action_trace.slice(0, index))
		if observed.is_empty():
			continue
		var economy: Dictionary = observed.get("economyAfter", {})
		observations.append({
			"observerActorId": str(trace.get("actorId", "")),
			"observerRole": str(trace.get("actorRole", "")),
			"observedLedgerEventId": str(observed.get("ledgerEventId", "")),
			"observedActorRole": str(observed.get("actorRole", "")),
			"observedAffordance": str(observed.get("affordance", "")),
			"observedObjectId": str(observed.get("objectId", "")),
			"economyPressure": {
				"localTrust": int(economy.get("localTrust", 0)),
				"recordBurden": int(economy.get("recordBurden", 0)),
				"stationAttention": int(economy.get("stationAttention", 0))
			},
			"resultingStepId": str(trace.get("stepId", "")),
			"resultingAffordance": str(trace.get("affordance", "")),
			"whyLine": "%s uses %s's %s record before choosing %s." % [
				str(trace.get("actorRole", "")),
				str(observed.get("actorRole", "")),
				str(observed.get("affordance", "")),
				str(trace.get("affordance", ""))
			]
		})
	return observations

func _agentic_observed_trace(trace: Dictionary, previous_traces: Array) -> Dictionary:
	var cited_ledger_event_id := str(trace.get("citedLedgerEventId", ""))
	if not cited_ledger_event_id.is_empty():
		for previous in previous_traces:
			if previous is Dictionary and str(previous.get("ledgerEventId", "")) == cited_ledger_event_id:
				return previous
	for offset in range(previous_traces.size()):
		var previous_index := previous_traces.size() - 1 - offset
		var previous: Variant = previous_traces[previous_index]
		if not previous is Dictionary:
			continue
		var previous_trace: Dictionary = previous
		if str(previous_trace.get("objectId", "")) == str(trace.get("objectId", "")):
			return previous_trace
		var previous_record_id := str(previous_trace.get("recordId", ""))
		if not previous_record_id.is_empty() and previous_record_id == str(trace.get("recordId", "")):
			return previous_trace
	return {}

func _economy(account_credit: int, local_trust: int, record_burden: int, station_attention: int) -> Dictionary:
	return {
		"accountCredit": account_credit,
		"localTrust": local_trust,
		"recordBurden": record_burden,
		"stationAttention": station_attention
	}

func _validate_agentic_route_proofs(agentic_route_proofs: Array) -> Array[String]:
	var failures: Array[String] = []
	for expected_route in ROUTE_PROOF_IDS:
		var proof := _agentic_route_proof_by_id(agentic_route_proofs, expected_route)
		if proof.is_empty():
			failures.append("Evidence Pack agenticRouteProofs missing %s" % expected_route)
			continue
		var action_trace: Array = proof.get("actionTrace", [])
		if action_trace.is_empty():
			failures.append("%s agenticRouteProof must include actionTrace" % expected_route)
		if not _same_string_array(proof.get("ledgerEventKinds", []), _agentic_trace_event_kinds(action_trace)):
			failures.append("%s agenticRouteProof ledgerEventKinds must match actionTrace" % expected_route)
		if not _same_string_array(proof.get("ledgerAffordances", []), _agentic_trace_affordances(action_trace)):
			failures.append("%s agenticRouteProof ledgerAffordances must match actionTrace" % expected_route)
		var social_observations: Array = proof.get("socialObservationTrace", [])
		var final_states: Dictionary = proof.get("finalObjectStates", {})
		var economy_after: Dictionary = proof.get("economyAfter", {})
		if final_states.is_empty() or economy_after.is_empty():
			failures.append("%s agenticRouteProof must include finalObjectStates and economyAfter" % expected_route)
		for trace in action_trace:
			if not trace is Dictionary:
				failures.append("%s agenticRouteProof actionTrace contains non-dictionary item" % expected_route)
				continue
			if not bool(trace.get("accepted", false)):
				failures.append("%s agenticRouteProof contains unaccepted action" % expected_route)
			if not trace.get("perceivedObjectIds", []).has(str(trace.get("objectId", ""))):
				failures.append("%s agenticRouteProof actor cannot perceive acted object %s" % [expected_route, str(trace.get("objectId", ""))])
			if str(trace.get("whyLine", "")).is_empty():
				failures.append("%s agenticRouteProof action is missing whyLine" % expected_route)
		if expected_route == "soft_report" and not _agentic_trace_has_role(action_trace, "store_manager"):
			failures.append("soft_report agenticRouteProof must include Store Manager reaction")
		if expected_route == "soft_report" and not _social_observation_exists(social_observations, "store_manager", "store_clerk", "place_note", "place_note"):
			failures.append("soft_report agenticRouteProof must prove manager acted from clerk record")
		if expected_route == "inquest_opened":
			var station_citation: Dictionary = proof.get("stationCitation", {})
			if station_citation.is_empty():
				failures.append("inquest_opened agenticRouteProof must include exact Station citation")
			elif str(station_citation.get("citedLedgerEventKind", "")) != "store_report_escalated":
				failures.append("inquest_opened Station citation must cite store_report_escalated")
			if not _social_observation_exists(social_observations, "store_manager", "store_clerk", "place_note", "forward_report"):
				failures.append("inquest_opened agenticRouteProof must prove manager forwarded clerk record")
			if not _social_observation_exists(social_observations, "station_officer", "store_manager", "forward_report", "cite_record"):
				failures.append("inquest_opened agenticRouteProof must prove Station cited forwarded social record")
			if not _social_observation_exists(social_observations, "waiting_customer", "station_officer", "cite_record", "refuse_contact"):
				failures.append("inquest_opened agenticRouteProof must prove local NPC reacted to Station citation")
	return failures

func _agentic_route_proof_by_id(agentic_route_proofs: Array, route_id: String) -> Dictionary:
	for proof in agentic_route_proofs:
		if proof is Dictionary and str(proof.get("routeId", "")) == route_id:
			return proof
	return {}

func _same_string_array(left_value: Variant, right_value: Variant) -> bool:
	if not left_value is Array or not right_value is Array:
		return false
	var left: Array = left_value
	var right: Array = right_value
	if left.size() != right.size():
		return false
	for index in range(left.size()):
		if str(left[index]) != str(right[index]):
			return false
	return true

func _agentic_trace_has_role(action_trace: Array, role: String) -> bool:
	for trace in action_trace:
		if trace is Dictionary and str(trace.get("actorRole", "")) == role:
			return true
	return false

func _social_observation_exists(social_observations: Array, observer_role: String, observed_role: String, observed_affordance: String, resulting_affordance: String) -> bool:
	for observation in social_observations:
		if not observation is Dictionary:
			continue
		if str(observation.get("observerRole", "")) == observer_role \
			and str(observation.get("observedActorRole", "")) == observed_role \
			and str(observation.get("observedAffordance", "")) == observed_affordance \
			and str(observation.get("resultingAffordance", "")) == resulting_affordance:
			return true
	return false

func _agent_action_has_role(action_log: Array, role: String) -> bool:
	for action in action_log:
		if action is Dictionary and str(action.get("actorRole", "")) == role:
			return true
	return false

func _agent_action_exists(action_log: Array, role: String, affordance: String) -> bool:
	for action in action_log:
		if action is Dictionary \
			and str(action.get("actorRole", "")) == role \
			and str(action.get("affordance", "")) == affordance:
			return true
	return false

func _ledger_has_event_kind(civic_ledger: Array, kind: String) -> bool:
	for event in civic_ledger:
		if event is Dictionary and str(event.get("kind", "")) == kind:
			return true
	return false

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

func _record_prop_snapshot(session: Node) -> Dictionary:
	if session != null and session.has_method("debug_record_prop_snapshot"):
		var snapshot: Variant = session.call("debug_record_prop_snapshot")
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
		if str(event.get("inputMode", "")) != "typed_free_input":
			continue
		if not str(event.get("recordedStatementScope", "")).is_empty():
			continue
		if not str(event.get("displayedPlayerLine", "")).contains("꿈"):
			continue
		return true
	return false

func _has_anomaly_signal(summary: Dictionary, signal_id: String) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if not ["conversation_anomaly_detected", "response_hesitation_noted"].has(str(event.get("eventName", ""))):
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
